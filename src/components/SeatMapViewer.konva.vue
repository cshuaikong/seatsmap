<template>
  <div ref="containerRef" class="seat-map-viewer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { VenueData, Seat, SeatRow, Section } from '../types'
import { SEAT_STATUS } from '../types'
import { useVenueStore } from '../stores/venueStore'
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
let currentScale = 1

/** 获取渲染配置 */
const getRenderConfig = () => {
  const store = useVenueStore()
  const baseScale = (props.venue as any).baseScale || store.getBaseScale?.() || 1
  const visualConfig = (props.venue as any).visualConfig || store.visualConfig

  return {
    baseScale,
    radius: visualConfig?.radius ?? 6,
    gap: visualConfig?.gap ?? 18,
    rowGap: visualConfig?.rowGap ?? 24,
    width: visualConfig?.width ?? 2,
  }
}

/** 获取分类颜色（封装 venue 引用） */
const resolveCategoryColor = (key: string | number): string => {
  return getCategoryColor(key, props.venue.categories)
}

/** 全量渲染/刷新 */
const renderAll = () => {
  if (!engine || engine.destroyed) return

  const config = getRenderConfig()
  labelRenderer?.clear()

  // 重新创建 seatRenderer
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

  // 渲染分区内容（边框/形状/文本/区域）
  props.venue.sections.forEach(section => {
    const sectionGroup = SectionRenderer.render(section)
    engine!.leafer.add(sectionGroup)
  })

  // 添加座位层
  engine.leafer.add(seatRenderer.rootGroup)

  // 初始 fit
  nextTick(() => {
    engine?.fitContent(50)
  })
}

/** 更新 LOD + 标签 */
const updateViewState = (scale?: number) => {
  if (scale !== undefined) currentScale = scale
  seatRenderer?.updateLOD(currentScale)
  labelRenderer?.update(currentScale)
}

onMounted(() => {
  if (!containerRef.value) return

  // 初始化 Leafer 引擎
  const width = props.width || containerRef.value.clientWidth || 800
  const height = props.height || containerRef.value.clientHeight || 600
  engine = new LeaferEngine(containerRef.value, { width, height })

  // 初始化标签渲染器
  labelRenderer = new LabelRenderer()

  // 先创建空的 seatRenderer（selectionManager 需要引用它）
  // 实际在 renderAll 中重建
  const config = getRenderConfig()
  seatRenderer = new SeatRenderer(
    props.venue, config, resolveCategoryColor, darkenColor
  )

  // 初始化选中管理器
  selectionManager = new SelectionManager(
    seatRenderer,
    props.venue.sections,
    (ids) => emit('update:selectedSeatIds', ids)
  )

  // 缩放变化 → 更新 LOD + 标签
  engine.onZoomChange((scale) => {
    updateViewState(scale)
  })

  // 首次渲染
  renderAll()
})

// 外部选中列表变化
watch(() => props.selectedSeatIds, (newIds) => {
  if (!selectionManager || selectionManager.internalUpdate) return
  selectionManager.syncExternalSelection(newIds || [])
}, { deep: true })

// venue sections 变化 → 重绘
watch(() => props.venue.sections, (newSections, oldSections) => {
  if (newSections !== oldSections || newSections?.length !== oldSections?.length) {
    engine?.leafer.clear()
    renderAll()
  }
})

onUnmounted(() => {
  engine?.destroy()
  engine = null
  seatRenderer = null
  labelRenderer = null
  selectionManager = null
})

// ========== Expose API ==========

const getStageState = () => {
  const leafer = engine?.leafer
  return {
    scale: currentScale,
    position: { x: (leafer as any)?.x ?? 0, y: (leafer as any)?.y ?? 0 },
    width: (leafer as any)?.width ?? 0,
    height: (leafer as any)?.height ?? 0,
  }
}

const getVenueBounds = () => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  props.venue.sections.forEach(section => {
    section.rows.forEach(row => {
      row.seats.forEach(seat => {
        const r = getRenderConfig().radius / getRenderConfig().baseScale
        minX = Math.min(minX, seat.x - r)
        minY = Math.min(minY, seat.y - r)
        maxX = Math.max(maxX, seat.x + r)
        maxY = Math.max(maxY, seat.y + r)
      })
    })
  })

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
}
</style>
