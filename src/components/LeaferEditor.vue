<template>
  <div ref="containerRef" class="leafer-editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { VenueData, Seat, SeatRow, Section } from '../types'
import { useVenueStore } from '../stores/venueStore'
import { EditorEngine } from '../editor/EditorEngine'
import type { EditorBridgeOptions, ElementMeta } from '../editor/EditorBridge'
import { EditorBridge } from '../editor/EditorBridge'
import { KeyboardManager } from '../editor/KeyboardManager'
import { SectionRenderer } from '../viewer/SectionRenderer'
import { SeatRenderer } from '../viewer/SeatRenderer'
import { LabelRenderer } from '../viewer/LabelRenderer'
import { SelectionManager } from '../viewer/SelectionManager'
import { PathVertexManager } from '../editor/PathVertexManager'
import { DrawingManager } from '../editor/DrawingManager'

import { darkenColor, getCategoryColor } from '../utils/color'

const props = defineProps<{
  venue: VenueData
  width?: number
  height?: number
}>()

const emit = defineEmits<{
  'seat-click': [seat: Seat, row: SeatRow, section: Section]
  'update:selectedSeatIds': [seatIds: string[]]
}>()

const containerRef = ref<HTMLDivElement>()
let engine: EditorEngine | null = null
let seatRenderer: SeatRenderer | null = null
let labelRenderer: LabelRenderer | null = null
let selectionManager: SelectionManager | null = null
let editorBridge: EditorBridge | null = null
let keyboard: KeyboardManager | null = null
let pathVertexManager: PathVertexManager | null = null
let drawingManager: DrawingManager | null = null
let sectionGroups: any[] = []
/** 分区 ID → 其 Path 边框元素（用于路径顶点编辑） */
const sectionPathMap = new Map<string, any>()
let currentScale = 1
let isSyncing = false

// 绘制工具的 DOM 事件处理器（捕获阶段，用于在 onUnmounted 中清理）
let boundDrawPointerDown: ((e: PointerEvent) => void) | null = null
let boundDrawPointerMove: ((e: PointerEvent) => void) | null = null
let boundDrawPointerUp: ((e: PointerEvent) => void) | null = null

// ==================== 节点元数据映射 (ID → Kind+Data) ====================

const nodeMetaMap = new Map<string, ElementMeta>()

const buildNodeMeta = () => {
  nodeMetaMap.clear()

  props.venue.sections.forEach(section => {
    nodeMetaMap.set(`section-${section.id}`, { kind: 'section', id: section.id })

    section.rows.forEach(row => {
      nodeMetaMap.set(`row-${row.id}`, { kind: 'row', id: row.id, sectionId: section.id, rowData: row })
      row.seats.forEach(seat => {
        nodeMetaMap.set(`seat-${seat.id}`, { kind: 'seat', id: seat.id, sectionId: section.id, rowData: row })
      })
    })

    section.shapes?.forEach(shape => {
      nodeMetaMap.set(`shape-${shape.id}`, { kind: 'shape', id: shape.id, sectionId: section.id, shapeData: shape })
    })

    section.texts?.forEach(text => {
      nodeMetaMap.set(`text-${text.id}`, { kind: 'text', id: text.id, sectionId: section.id, textData: text })
    })

    section.areas?.forEach(area => {
      nodeMetaMap.set(`area-${area.id}`, { kind: 'area', id: area.id, sectionId: section.id, areaData: area })
    })
  })
}

// ==================== 当前工具状态 ====================

let currentTool = 'select'

// ==================== 配置 ====================

const getRenderConfig = () => {
  const store = useVenueStore()
  const baseScale = (props.venue as any).baseScale || store.getBaseScale?.() || 1
  const visualConfig = (props.venue as any).visualConfig || store.visualConfig

  return {
    baseScale,
    radius: visualConfig?.radius ?? 6,
    gap: visualConfig?.gap ?? 18,
    rowGap: visualConfig?.rowGap ?? 24,
    borderWidth: visualConfig?.borderWidth ?? 2,
  }
}

const resolveCategoryColor = (key: string | number): string => {
  return getCategoryColor(key, props.venue.categories)
}

// ==================== 渲染 ====================

const rebuildSectionLayers = () => {
  if (!engine) return
  const leafer = engine.leafer

  sectionGroups.forEach(g => leafer.remove(g))
  sectionGroups = []
  sectionPathMap.clear()

  const isFocusMode = !!store.focusedSectionId

  props.venue.sections.forEach(section => {
    const sectionGroup = SectionRenderer.render(section, { interactive: true })
    sectionGroups.push(sectionGroup)

    // 分区聚焦模式：非聚焦分区降低透明度
    if (isFocusMode && section.id !== store.focusedSectionId) {
      sectionGroup.opacity = 0.25
    }

    leafer.add(sectionGroup)

    // 缓存 Path 边框元素，供路径顶点编辑使用
    if (section.borderType === 'path' && section.borderPathPoints?.length) {
      const borderEl = sectionGroup.children[0]
      if (borderEl && (borderEl as any).tag === 'Path') {
        sectionPathMap.set(section.id, borderEl)
      }
    }
  })

  // 为分区边框绑定双击聚焦
  if (!isFocusMode) {
    attachSectionDoubleClick()
  }
}

let lastClickTime = 0
let lastClickSectionId = ''

const attachSectionDoubleClick = () => {
  sectionGroups.forEach(group => {
    const sectionId = (group as any).id?.replace('section-', '') || ''
    if (!sectionId || !group.children.length) return

    const borderEl = group.children[0]
    if (!borderEl) return

    borderEl.off('tap' as any)
    borderEl.on('tap', () => {
      const now = Date.now()
      if (sectionId === lastClickSectionId && now - lastClickTime < 350) {
        enterSectionFocus(sectionId)
        lastClickSectionId = ''
      } else {
        lastClickSectionId = sectionId
        lastClickTime = now
      }
    })
    ;(borderEl as any).cursor = 'pointer'
  })
}

const createSeatRenderer = () => {
  if (seatRenderer && engine) {
    engine.leafer.remove(seatRenderer.rootGroup)
  }

  const config = getRenderConfig()
  seatRenderer = new SeatRenderer(
    props.venue, config, resolveCategoryColor, darkenColor,
    (seat, row, section) => {
      selectionManager?.handleSeatClick(seat, row, section, (s, r, sec) => {
        emit('seat-click', s, r, sec)
      })
    }
  )
  seatRenderer.render()
  seatRenderer.updateLOD(currentScale)
  engine?.leafer.add(seatRenderer.rootGroup)
  selectionManager?.setRenderer(seatRenderer)
}

const renderAll = () => {
  if (!engine || engine.destroyed) return

  labelRenderer?.clear()
  buildNodeMeta()
  rebuildSectionLayers()
  createSeatRenderer()
}

const updateViewState = (scale?: number) => {
  if (scale !== undefined) currentScale = scale
  seatRenderer?.updateLOD(currentScale)
  labelRenderer?.update(currentScale)
}

// ==================== Editor Bridge ====================

const store = useVenueStore()

const createEditorBridge = (): EditorBridge => {
  const bridgeOpts: EditorBridgeOptions = {
    editor: engine!.editor,
    getVenue: () => props.venue,
    getNodeMeta: (id: string) => nodeMetaMap.get(id),
    selectSection: (id) => store.selectSection(id),
    selectRow: (id) => store.selectRow(id),
    selectSeat: (id) => store.selectSeat(id),
    selectShape: (id) => store.selectShape(id),
    selectText: (id) => store.selectText(id),
    selectArea: (id) => store.selectArea(id),
    clearSelection: () => store.clearSelection(),
    updateRowPosition: (id, x, y, rotation) => {
      store.updateRow(id, { x, y, rotation })
    },
    updateShapeData: (id, x, y, width?, height?, rotation?) => {
      store.updateShape(id, { x, y, width, height, rotation })
    },
    updateTextData: (id, x, y, fontSize?, rotation?) => {
      store.updateText(id, { x, y, fontSize, rotation })
    },
    updateAreaData: (id, points) => {
      store.updateArea(id, { points })
    },
    updateSectionBorder: (id, x, y, width?, height?) => {
      store.updateSectionBorder(id, { borderX: x, borderY: y, borderWidth: width, borderHeight: height })
    },
    saveHistory: () => store.saveHistory(),
    getSyncing: () => isSyncing,
    setSyncing: (v: boolean) => { isSyncing = v },
  }

  return new EditorBridge(bridgeOpts)
}

// ==================== 删除操作 ====================

const deleteSelected = () => {
  const hasSelection =
    store.selectedSeatIds.length > 0 ||
    store.selectedRowIds.length > 0 ||
    store.selectedSectionIds.length > 0 ||
    store.selectedShapeIds.length > 0 ||
    store.selectedTextIds.length > 0 ||
    store.selectedAreaIds.length > 0

  if (!hasSelection) return

  if (store.selectedSeatIds.length > 0) {
    store.removeSelectedSeats()
  }
  if (store.selectedRowIds.length > 0) {
    store.selectedRowIds.forEach(id => store.deleteRow(id))
  }
  if (store.selectedSectionIds.length > 0) {
    store.selectedSectionIds.forEach(id => store.deleteSection(id))
  }
  if (store.selectedShapeIds.length > 0) {
    store.selectedShapeIds.forEach(id => store.deleteShape(id))
  }
  if (store.selectedTextIds.length > 0) {
    store.selectedTextIds.forEach(id => store.deleteText(id))
  }
  if (store.selectedAreaIds.length > 0) {
    store.selectedAreaIds.forEach(id => store.deleteArea(id))
  }

  store.clearSelection()
  store.saveHistory()
  engine?.editor.cancel()
  renderAll()
}

// ==================== 生命周期 ====================

onMounted(() => {
  if (!containerRef.value) {
    console.error('[LeaferEditor] containerRef is null!')
    return
  }

  store.initHistory()

  const width = props.width || containerRef.value.clientWidth || 800
  const height = props.height || containerRef.value.clientHeight || 600

  try {
    engine = new EditorEngine({
    container: containerRef.value,
    width,
    height,
    shouldPan: () => !drawingManager?.isDrawing,
    editorConfig: {
      stroke: '#836DFF',
      pointSize: 10,
      moveable: true,
      resizeable: true,
      rotateable: true,
      selector: true,
      editBox: true,
      hover: true,
      select: 'press',
      multipleSelect: true,
      boxSelect: true,
      keyEvent: true,
    },
  })

  labelRenderer = new LabelRenderer()

  const config = getRenderConfig()
  seatRenderer = new SeatRenderer(props.venue, config, resolveCategoryColor, darkenColor)

  selectionManager = new SelectionManager(
    seatRenderer,
    props.venue.sections,
    (ids) => emit('update:selectedSeatIds', ids)
  )

  editorBridge = createEditorBridge()
  editorBridge.listen()

  pathVertexManager = new PathVertexManager({
    leafer: engine.leafer,
    getSection: (id) => props.venue.sections.find(s => s.id === id),
    updateSectionBorder: (sectionId, border) => store.updateSectionBorder(sectionId, border),
    saveHistory: () => store.saveHistory(),
    getScale: () => engine?.scale ?? 1,
    getSyncing: () => isSyncing,
    setSyncing: (v: boolean) => { isSyncing = v },
  })

  drawingManager = new DrawingManager({
    previewGroup: engine.previewGroup,
    onRenderAll: renderAll,
  })

  // 为绘制工具注册 DOM 捕获阶段事件（早于 EditorEngine 的冒泡阶段 pan 处理）
  engine.leafer.waitViewReady(() => {
    const canvas = engine!.canvasElement
    if (!canvas) return

    /** 屏幕坐标 → 世界坐标：逆变换 = (client - rect - pan) / scale */
    const screenToWorld = (clientX: number, clientY: number) => {
      const l = engine!.leafer as any
      const rect = canvas.getBoundingClientRect()
      const sx = clientX - rect.left
      const sy = clientY - rect.top
      const zl = l.__zoomLayer
      const scaleX = l.scaleX ?? zl?.scaleX ?? 1
      const scaleY = l.scaleY ?? zl?.scaleY ?? 1
      const panX = l.x ?? zl?.x ?? 0
      const panY = l.y ?? zl?.y ?? 0
      return { x: (sx - panX) / scaleX, y: (sy - panY) / scaleY }
    }

    boundDrawPointerDown = (e: PointerEvent) => {
      if (!drawingManager?.isDrawing) return
      e.stopPropagation()
      e.preventDefault()
      drawingManager.handlePointerDown(screenToWorld(e.clientX, e.clientY))
    }
    boundDrawPointerMove = (e: PointerEvent) => {
      if (!drawingManager?.isDrawing) return
      e.stopPropagation()
      drawingManager.handlePointerMove(screenToWorld(e.clientX, e.clientY))
    }
    boundDrawPointerUp = (e: PointerEvent) => {
      if (!drawingManager?.isDrawing) return
      e.stopPropagation()
      drawingManager.handlePointerUp(screenToWorld(e.clientX, e.clientY))
    }
    canvas.addEventListener('pointerdown', boundDrawPointerDown, true)
    canvas.addEventListener('pointermove', boundDrawPointerMove, true)
    canvas.addEventListener('pointerup', boundDrawPointerUp, true)
  })

  keyboard = new KeyboardManager({
    onUndo: () => { store.undo(); renderAll() },
    onRedo: () => { store.redo(); renderAll() },
    onDelete: () => deleteSelected(),
    onEscape: () => {
      if (currentTool !== 'select') {
        currentTool = 'select'
        drawingManager?.setTool('select')
        return
      }
      store.clearSelection()
      engine?.editor.cancel()
    },
  })
  keyboard.listen()

  engine.onZoomChange((scale) => {
    updateViewState(scale)
  })

  console.log('[onMounted] initial renderAll, venue sections:', props.venue.sections.length)
  renderAll()
  } catch (err) {
    console.error('[LeaferEditor] onMounted error:', err)
  }
})

onUnmounted(() => {
  editorBridge?.unlisten()
  keyboard?.unlisten()
  pathVertexManager?.destroy()
  drawingManager?.resetState()

  // 移除绘制工具 DOM 捕获阶段事件
  const canvas = engine?.canvasElement
  if (canvas) {
    if (boundDrawPointerDown) {
      canvas.removeEventListener('pointerdown', boundDrawPointerDown, true)
      boundDrawPointerDown = null
    }
    if (boundDrawPointerMove) {
      canvas.removeEventListener('pointermove', boundDrawPointerMove, true)
      boundDrawPointerMove = null
    }
    if (boundDrawPointerUp) {
      canvas.removeEventListener('pointerup', boundDrawPointerUp, true)
      boundDrawPointerUp = null
    }
  }

  engine?.destroy()
  engine = null
  seatRenderer = null
  labelRenderer = null
  selectionManager = null
  editorBridge = null
  keyboard = null
  pathVertexManager = null
  drawingManager = null
  sectionGroups = []
})

// ==================== Watch ====================

watch(
  () => props.venue.sections,
  () => {
    renderAll()
  }
)

// 选中分区变更 → 显示/隐藏路径顶点编辑手柄
watch(
  () => store.selectedSectionIds,
  (ids) => {
    if (!pathVertexManager || pathVertexManager.isDragging || isSyncing) return

    if (ids.length === 1) {
      const section = props.venue.sections.find(s => s.id === ids[0])
      if (section?.borderType === 'path' && section.borderPathPoints?.length) {
        const pathEl = sectionPathMap.get(section.id)
        if (pathEl) {
          pathVertexManager.showVertices(section, pathEl)
          return
        }
      }
    }
    pathVertexManager.hideVertices()
  }
)


// ==================== Expose (KonvaRenderer 兼容) ====================

const getStageScale = () => engine?.scale ?? currentScale

const getBaseScale = () => store.getBaseScale?.() ?? 1

const zoomTo = (scale: number, x?: number, y?: number) => {
  if (!engine) return
  const l: any = engine.leafer
  if (l.zoom && typeof l.zoom === 'function') {
    l.zoom('set', scale, undefined, true)
  }
  if (x !== undefined && y !== undefined) {
    engine.leafer.x = x
    engine.leafer.y = y
  }
  updateViewState(scale)
}

const getViewport = () => {
  const leafer = engine?.leafer
  return {
    x: (leafer as any)?.x ?? 0,
    y: (leafer as any)?.y ?? 0,
    width: (leafer as any)?.width ?? 0,
    height: (leafer as any)?.height ?? 0,
    scale: engine?.scale ?? currentScale,
  }
}

const updateViewportCulling = () => {
  updateViewState()
}

const setDrawingTool = (tool: string) => {
  currentTool = tool
  drawingManager?.setTool(tool)

  if (drawingManager?.isDrawing) {
    engine?.editor.cancel()
    ;(engine?.editor as any)?.setAttr?.('hittable', false)
  } else {
    ;(engine?.editor as any)?.setAttr?.('hittable', true)
  }
}

const enterSectionFocus = (sectionId: string) => {
  const section = props.venue.sections.find(s => s.id === sectionId)
  if (!section || !engine) return

  store.focusedSectionId = sectionId
  store.clearSelection()
  pathVertexManager?.hideVertices()

  // 计算分区中心
  let cx = section.borderX ?? 0
  let cy = section.borderY ?? 0
  if (section.borderType === 'rect') {
    cx += (section.borderWidth ?? 100) / 2
    cy += (section.borderHeight ?? 100) / 2
  } else if (section.borderType === 'polygon' && section.borderPoints) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < section.borderPoints.length; i += 2) {
      minX = Math.min(minX, section.borderPoints[i])
      minY = Math.min(minY, section.borderPoints[i + 1])
      maxX = Math.max(maxX, section.borderPoints[i])
      maxY = Math.max(maxY, section.borderPoints[i + 1])
    }
    cx += (minX + maxX) / 2
    cy += (minY + maxY) / 2
  } else if (section.borderType === 'path' && section.borderPathPoints) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    section.borderPathPoints.forEach(p => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    })
    cx += (minX + maxX) / 2
    cy += (minY + maxY) / 2
  }

  const viewW = engine.leafer.width ?? 800
  const viewH = engine.leafer.height ?? 600
  const padding = 80

  // 计算目标缩放
  let sectionW = section.borderWidth ?? 200
  let sectionH = section.borderHeight ?? 200
  if (section.borderType === 'ellipse') {
    sectionW = (section.borderRadiusX ?? 50) * 2
    sectionH = (section.borderRadiusY ?? 50) * 2
  }

  const availW = viewW - padding * 2
  const availH = viewH - padding * 2
  const scaleW = availW / Math.max(sectionW, 1)
  const scaleH = availH / Math.max(sectionH, 1)
  const targetScale = Math.max(0.5, Math.min(4, Math.min(scaleW, scaleH)))

  // 动画缩放至分区中心
  const l: any = engine.leafer
  if (l.zoom) {
    l.zoom('set', targetScale, undefined, true)
  } else {
    engine.leafer.scaleOfWorld({ x: cx, y: cy }, targetScale / (engine.scale || 1))
  }
  engine.leafer.x = viewW / 2 - cx * targetScale
  engine.leafer.y = viewH / 2 - cy * targetScale
  ;(engine.leafer as any).__updateViewPort?.()

  setTimeout(() => {
    engine?.leafer.emit?.('zoom.end' as any, { scale: engine?.scale ?? 1 })
  }, 350)

  renderAll()
}

const exitSectionFocus = () => {
  if (!engine) return

  store.focusedSectionId = null
  pathVertexManager?.hideVertices()

  const l: any = engine.leafer
  if (l.zoom) {
    l.zoom('set', 1, undefined, true)
  }
  engine.leafer.x = 0
  engine.leafer.y = 0
  ;(engine.leafer as any).__updateViewPort?.()

  setTimeout(() => {
    engine?.leafer.emit?.('zoom.end' as any, { scale: engine?.scale ?? 1 })
  }, 350)

  renderAll()
}

const clearDrawing = () => {
  // 取消正在进行的绘制操作
  engine?.editor.cancel()
}

const getVenueBounds = () => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
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
    if (store.selectedSeatIds.includes(id)) {
      const seat = seatRenderer!.seatMap.get(id)
      if (seat) selected.push({ x: seat.x ?? 0, y: seat.y ?? 0 })
    }
  })
  return selected
}

defineExpose({
  renderAll,
  stage: () => engine?.leafer ?? null,
  layer: () => engine?.leafer ?? null,
  getStageScale,
  getBaseScale,
  zoomTo,
  getViewport,
  updateViewportCulling,
  setDrawingTool,
  currentDrawingTool: () => currentTool,
  enterSectionFocus,
  exitSectionFocus,
  deleteSelected,
  clearDrawing,
  getVenueBounds,
  getSelectedSeats,
})
</script>

<style scoped>
.leafer-editor-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  user-select: none;
}
</style>
