<template>
  <div ref="containerRef" class="seat-map-viewer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { VenueData, Seat, SeatRow, Section } from '../types'
import { useVenueStore } from '../stores/venueStore'
import { PointerEvent as LP, ZoomEvent } from 'leafer-ui'
import { LeaferEngine } from '../viewer/LeaferEngine'
import { SectionRenderer } from '../viewer/SectionRenderer'
import { SeatRenderer } from '../viewer/SeatRenderer'
import { LabelRenderer } from '../viewer/LabelRenderer'
import { SelectionManager } from '../viewer/SelectionManager'
import { darkenColor, getCategoryColor } from '../utils/color'

const props = defineProps<{
  venue: VenueData
  width?: number
  height?: number
  selectable?: boolean
  selectedSeatIds?: string[]
}>()

const emit = defineEmits<{
  'seat-click': [seat: Seat, row: SeatRow, section: Section]
  'update:selectedSeatIds': [seatIds: string[]]
}>()

const containerRef = ref<HTMLDivElement>()
let engine: LeaferEngine | null = null
let seatRenderer: SeatRenderer | null = null
let labelRenderer: LabelRenderer | null = null
let selectionManager: SelectionManager | null = null
let sectionLayers: any[] = []
let currentScale = 1
let isInitialFit = true

const getRenderConfig = () => {
  const store = useVenueStore()
  let baseScale = (props.venue as any).baseScale ?? store.getBaseScale?.() ?? 1
  if (!baseScale || baseScale <= 0) baseScale = 1
  const visualConfig = (props.venue as any).visualConfig || store.visualConfig

  return {
    baseScale,
    radius: visualConfig?.radius ?? 6,
    gap: visualConfig?.gap ?? 18,
    rowGap: visualConfig?.rowGap ?? 24,
    width: visualConfig?.width ?? 2,
  }
}

const resolveCategoryColor = (key: string | number): string => {
  return getCategoryColor(key, props.venue.categories)
}

/** 重建分区图层 */
const rebuildSectionLayers = () => {
  if (!engine) return
  const leafer = engine.leafer
  sectionLayers.forEach(layer => leafer.remove(layer))
  sectionLayers = []
// console.log(props.venue)
  props.venue.sections.forEach(section => {
    const sectionGroup = SectionRenderer.render(section)
    sectionLayers.push(sectionGroup)
    leafer.add(sectionGroup)
  })
}

/** 点击画布放大到基准缩放，以点击点为中心 */
const handleCanvasTap = (e: any) => {
  if (!engine) return
  // 点击到座位时只执行选座，不放大
  if (e.target?.__meta?.kind === 'seat') return
  const l: any = engine.leafer
  const zoomLayer = l.zoomLayer
  if (!zoomLayer) return

  const targetScale = getRenderConfig().baseScale
  // 直接读取 zoomLayer 的实际 scale，避免 getter 在 viewport 模式下取值偏差
  const currentS = zoomLayer.__?.scaleX ?? zoomLayer.scaleX ?? engine.scale ?? 1
  const changeScale = targetScale / currentS
  if (Math.abs(changeScale - 1) < 0.001) return

  // TAP 事件的 x/y 为世界坐标，直接作为 scaleOfWorld 的缩放中心
  const point = { x: e.x, y: e.y }
  zoomLayer.scaleOfWorld(point, changeScale)

  // 手动触发 ZoomEvent.END 以便 seat LOD / label 更新
  l.emit?.(ZoomEvent.END, { scale: targetScale, totalScale: targetScale })
}

/** 创建/重建座位渲染器 */
const createSeatRenderer = () => {
  if (seatRenderer) {
    engine?.leafer.remove(seatRenderer.rootGroup)
  }

  const config = getRenderConfig()
  seatRenderer = new SeatRenderer(
    props.venue,
    config,
    resolveCategoryColor,
    darkenColor,
    props.selectable !== false
      ? (seat, row, section) => {
          selectionManager?.handleSeatClick(seat, row, section, (s, r, sec) => {
            emit('seat-click', s, r, sec)
          })
        }
      : undefined
  )
  seatRenderer.render()
  seatRenderer.updateLOD(currentScale)
  engine?.leafer.add(seatRenderer.rootGroup)
  selectionManager?.setRenderer(seatRenderer)
}

/** 全量渲染/刷新 */
const renderAll = () => {
  if (!engine || engine.destroyed) return

  labelRenderer?.clear()
  rebuildSectionLayers()
  createSeatRenderer()

  if (isInitialFit) {
    isInitialFit = false
    nextTick(async () => {
      await engine?.fitContent(50)
      // 不放大超过 scale=1，座位初始应保持较小（L1 线条），让用户手动放大
      const s = engine?.scale ?? 1
      if (s > 1) {
        const l: any = (engine as any).leafer
        const cx = l.width / 2
        const cy = l.height / 2
        l.scaleOfWorld?.({ x: cx, y: cy }, 1 / s)
      }
      updateViewState(engine?.scale ?? 1)
    })
  }
}

const updateViewState = (scale?: number) => {
  if (scale !== undefined) currentScale = scale
  seatRenderer?.updateLOD(currentScale)
  labelRenderer?.update(currentScale)
}

onMounted(() => {
  if (!containerRef.value) return

  const width = props.width || containerRef.value.clientWidth || 800
  const height = props.height || containerRef.value.clientHeight || 600
  engine = new LeaferEngine(containerRef.value, { width, height })

  labelRenderer = new LabelRenderer()

  // 先创建临时 seatRenderer（仅供 selectionManager 构造依赖）
  const config = getRenderConfig()
  seatRenderer = new SeatRenderer(
    props.venue, config, resolveCategoryColor, darkenColor
  )

  selectionManager = new SelectionManager(
    seatRenderer,
    props.venue.sections,
    (ids) => emit('update:selectedSeatIds', ids)
  )

  engine.onZoomChange((scale) => {
    updateViewState(scale)
  })

  // 画布点击：以点击位置为中心放大到 baseScale
  engine.leafer.on(LP.TAP, handleCanvasTap)

  // 自定义单指平移：点击任何地方拖动都能跟随移动
  // 注意：viewport 的平移由 zoomLayer.move() 驱动，直接改 leafer.x/y 不会生效
  let panState: {
    dragging: boolean
    startPoint: { x: number; y: number }
    lastPoint: { x: number; y: number }
  } | null = null
  const PAN_THRESHOLD = 24

  engine.leafer.on(LP.DOWN, (e: any) => {
    const point = e.getPagePoint()
    panState = {
      dragging: false,
      startPoint: point,
      lastPoint: point,
    }
  })

  engine.leafer.on(LP.MOVE, (e: any) => {
    if (!panState) return
    const point = e.getPagePoint()
    const totalDx = point.x - panState.startPoint.x
    const totalDy = point.y - panState.startPoint.y
    if (!panState.dragging && Math.hypot(totalDx, totalDy) > PAN_THRESHOLD) {
      panState.dragging = true
    }
    if (panState.dragging) {
      const moveX = point.x - panState.lastPoint.x
      const moveY = point.y - panState.lastPoint.y
      panState.lastPoint = point
      const l: any = engine.leafer
      const zoomLayer = l.zoomLayer
      if (zoomLayer) {
        zoomLayer.move({ x: moveX, y: moveY })
      }
    }
  })

  engine.leafer.on(LP.UP, () => {
    panState = null
  })

  renderAll()
})

watch(() => props.selectedSeatIds, (newIds) => {
  if (!selectionManager || selectionManager.internalUpdate) return
  selectionManager.syncExternalSelection(newIds || [])
}, { deep: true })

watch(() => props.venue.sections, (newSections, oldSections) => {
  if (newSections !== oldSections || newSections?.length !== oldSections?.length) {
    renderAll()
  }
})

onUnmounted(() => {
  engine?.destroy()
  engine = null
  seatRenderer = null
  labelRenderer = null
  selectionManager = null
  sectionLayers = []
})

const getStageState = () => {
  const leafer = engine?.leafer
  return {
    scale: engine?.scale ?? currentScale,
    position: { x: (leafer as any)?.x ?? 0, y: (leafer as any)?.y ?? 0 },
    width: (leafer as any)?.width ?? 0,
    height: (leafer as any)?.height ?? 0,
  }
}

const getVenueBounds = () => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  // 从渲染后的 seatMap 读取世界坐标（Ellipse 的 x/y 是渲染时的世界坐标），
  // 与旧 Konva 版从 child.x()/child.y() 读取的逻辑一致，保证与分区边框坐标系对齐。
  if (seatRenderer) {
    const r = getRenderConfig().radius / getRenderConfig().baseScale
    seatRenderer.seatMap.forEach(el => {
      minX = Math.min(minX, (el.x ?? 0) - r)
      minY = Math.min(minY, (el.y ?? 0) - r)
      maxX = Math.max(maxX, (el.x ?? 0) + r)
      maxY = Math.max(maxY, (el.y ?? 0) + r)
    })
  }

  if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

const getSelectedSeats = () => {
  const selected: Array<{ x: number; y: number }> = []
  seatRenderer?.seatMap.forEach((_, id) => {
    if (props.selectedSeatIds?.includes(id)) {
      const seat = seatRenderer!.seatMap.get(id)
      if (seat) selected.push({ x: seat.x ?? 0, y: seat.y ?? 0 })
    }
  })
  return selected
}

defineExpose({
  refresh: renderAll,
  updateSelection: () => selectionManager?.syncExternalSelection(props.selectedSeatIds || []),
  clearAllSelection: () => selectionManager?.clearAll(),
  getStageState,
  getVenueBounds,
  getSelectedSeats,
})
</script>

<style scoped>
.seat-map-viewer {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
</style>
