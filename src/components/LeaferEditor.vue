<template>
  <div ref="containerRef" class="leafer-editor-container">
    <!-- 右键菜单 -->
    <div
      v-if="ctxMenu.visible"
      class="ctx-menu"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
      @click.stop
      @pointerdown.stop
    >
      <div
        v-for="item in ctxMenu.items"
        :key="item.label"
        class="ctx-menu-item"
        :class="{ 'ctx-menu-item--danger': item.danger }"
        @click="item.action()"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
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
import { ShapeVertexManager } from '../editor/ShapeVertexManager'
import { DrawingManager } from '../editor/DrawingManager'

import { darkenColor, getCategoryColor } from '../utils/color'

interface CtxMenuItem {
  label: string
  action: () => void
  danger?: boolean
}

const ctxMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  items: [] as CtxMenuItem[],
})

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
let shapeVertexManager: ShapeVertexManager | null = null
let drawingManager: DrawingManager | null = null
let sectionGroups: any[] = []
/** 分区 ID → 其 Path 边框元素（用于路径顶点编辑） */
const sectionPathMap = new Map<string, any>()
/** shape/area ID → 其 Leafer 元素（用于顶点编辑） */
const shapeElMap = new Map<string, any>()
const areaElMap = new Map<string, any>()
/** 分区 ID → 其 Polygon 边框元素（用于多边形分区顶点编辑） */
const sectionPolygonElMap = new Map<string, any>()
let currentScale = 1
let isSyncing = false
let pendingAutoSelect: { kind: string; id: string } | null = null
let dblClickCleanup: (() => void) | null = null
let ctxMenuCleanup: (() => void) | null = null
const EDITOR_BASE_POINT_SIZE = 6

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
    // sectionGroup（Editor 选中整个分区时会选中 Group 包装器）
    nodeMetaMap.set(`section-group-${section.id}`, { kind: 'section', id: section.id })

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
  shapeElMap.clear()
  areaElMap.clear()
  sectionPolygonElMap.clear()

  const isFocusMode = !!store.focusedSectionId

  props.venue.sections.forEach(section => {
    const sectionGroup = SectionRenderer.render(section, { interactive: true })
    sectionGroups.push(sectionGroup)

    // 分区聚焦模式：非聚焦分区降低透明度
    if (isFocusMode && section.id !== store.focusedSectionId) {
      sectionGroup.opacity = 0.25
    }

    leafer.add(sectionGroup)

    // 缓存 Path/Polygon 边框元素，供顶点编辑使用
    if ((section.borderType === 'path' && section.borderPathPoints?.length) ||
        (section.borderType === 'polygon' && section.borderPoints?.length)) {
      const borderEl = sectionGroup.children[0]
      if (borderEl) {
        const tag = (borderEl as any).tag
        if (tag === 'Path') {
          sectionPathMap.set(section.id, borderEl)
        } else if (tag === 'Polygon') {
          sectionPolygonElMap.set(section.id, borderEl)
        }
      }
    }

    // 缓存 polygon/polyline shape 和 area 元素，供顶点编辑使用
    sectionGroup.children?.forEach((child: any) => {
      const cid = child.id || child.getAttr?.('id') || ''
      if (cid.startsWith('shape-')) {
        shapeElMap.set(cid.slice(6), child)
      } else if (cid.startsWith('area-')) {
        areaElMap.set(cid.slice(5), child)
      }
    })
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
      // selectseat 模式才切换座位状态，select 模式由 Editor 插件处理
      if (currentTool === 'selectseat') {
        selectionManager?.handleSeatClick(seat, row, section, (s, r, sec) => {
          emit('seat-click', s, r, sec)
        })
      }
    },
    true,  // editMode
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

  // 确保 Editor（EditBox）始终在最顶层，不被座位/分区遮挡
  engine.leafer.add(engine.editor as any)

  // 绘制完成后自动选中新元素
  if (pendingAutoSelect && !isSyncing) {
    const info = pendingAutoSelect
    pendingAutoSelect = null
    // 延迟一帧等待 Leafer 树更新完成
    requestAnimationFrame(() => {
      if (!engine || engine.destroyed) return
      setDrawingTool('select')
      const fullId = `${info.kind}-${info.id}`
      const el = (engine.leafer as any)?.findId?.(fullId)
      if (el) {
        engine.editor.select(el)
      }
    })
  }
}

const updateViewState = (scale?: number) => {
  if (scale !== undefined) currentScale = scale
  seatRenderer?.updateLOD(currentScale)
  labelRenderer?.update(currentScale)
}

// ==================== Editor Bridge ====================

const store = useVenueStore()

// 防抖存档：变换过程中不存档，结束后 200ms 存档一次
let _transformSaveDebounce: ReturnType<typeof setTimeout> | null = null
const debouncedSaveHistory = () => {
  if (_transformSaveDebounce) clearTimeout(_transformSaveDebounce)
  _transformSaveDebounce = setTimeout(() => {
    store.saveHistory()
    _transformSaveDebounce = null
  }, 200)
}

// 在 venue 数据中查找 shape/area
const findShape = (id: string) => {
  for (const s of props.venue.sections) {
    const shape = s.shapes?.find(sh => sh.id === id)
    if (shape) return { shape, sectionId: s.id }
  }
  return undefined
}
const findArea = (id: string) => {
  for (const s of props.venue.sections) {
    const area = s.areas?.find(a => a.id === id)
    if (area) return { area, sectionId: s.id }
  }
  return undefined
}

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
    requestSaveHistory: () => { debouncedSaveHistory() },
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

// ==================== 右键菜单 ====================

const buildCtxMenuItems = (): CtxMenuItem[] => {
  const items: CtxMenuItem[] = []
  const hasSelection = store.selectedSectionIds.length > 0
    || store.selectedShapeIds.length > 0
    || store.selectedTextIds.length > 0
    || store.selectedAreaIds.length > 0

  if (hasSelection) {
    // 多选 → 编组选项
    const totalSelected = store.selectedSectionIds.length
      + store.selectedShapeIds.length
      + store.selectedTextIds.length
      + store.selectedAreaIds.length
    if (totalSelected >= 2) {
      items.push({ label: '编组 Ctrl+G', action: () => groupSelected() })
    }
    items.push({ label: '复制 Ctrl+D', action: () => duplicateSelected() })
    items.push({ label: '删除 Delete', action: () => deleteSelected(), danger: true })
  }

  if (store.selectedSectionIds.length === 1) {
    items.unshift({ label: '聚焦此分区', action: () => enterSectionFocus(store.selectedSectionIds[0]) })
  }

  if (store.focusedSectionId) {
    items.push({ label: '退出聚焦', action: () => exitSectionFocus() })
  }

  // 画布操作（始终可用）
  items.push({ label: '适应画布', action: () => engine?.fitContent(50) })
  items.push({ label: '重置缩放', action: () => {
    const l: any = engine?.leafer
    if (l?.zoom) l.zoom('set', 1, undefined, true)
    if (engine) { engine.leafer.x = 0; engine.leafer.y = 0 }
    ;(engine?.leafer as any)?.__updateViewPort?.()
  }})

  return items
}

// ==================== 编组操作 ====================

const groupSelected = () => {
  const ed = engine?.editor as any
  if (!ed || ed.list?.length < 2) return
  ed.group()
}

const ungroupSelected = () => {
  const ed = engine?.editor as any
  if (!ed) return
  ed.ungroup()
}

// ==================== 复制操作 ====================

const duplicateSelected = () => {
  const offsetX = 20
  const offsetY = 20

  // 复制分区
  store.selectedSectionIds.forEach(sectionId => {
    const section = props.venue.sections.find(s => s.id === sectionId)
    if (!section) return
    const newId = store.addSection({
      ...JSON.parse(JSON.stringify(section)),
      name: `${section.name} 副本`,
    })
    store.updateSectionBorder(newId, {
      borderX: (section.borderX ?? 0) + offsetX,
      borderY: (section.borderY ?? 0) + offsetY,
    })
    store.clearSelection()
    store.selectSection(newId)
  })

  // 复制形状
  store.selectedShapeIds.forEach(shapeId => {
    for (const section of props.venue.sections) {
      const shape = section.shapes?.find(s => s.id === shapeId)
      if (!shape) continue
      const clone = { ...JSON.parse(JSON.stringify(shape)), id: undefined! }
      clone.x = (clone.x ?? 0) + offsetX
      clone.y = (clone.y ?? 0) + offsetY
      const newId = store.addShape(section.id, clone)
      if (!newId) continue
      store.clearSelection()
      store.selectShape(newId)
      break
    }
  })

  // 复制文本
  store.selectedTextIds.forEach(textId => {
    for (const section of props.venue.sections) {
      const text = section.texts?.find(t => t.id === textId)
      if (!text) continue
      const clone = { ...JSON.parse(JSON.stringify(text)), id: undefined! }
      clone.x = (clone.x ?? 0) + offsetX
      clone.y = (clone.y ?? 0) + offsetY
      const newId = store.addText(section.id, clone)
      if (!newId) continue
      store.clearSelection()
      store.selectText(newId)
      break
    }
  })

  // 复制区域
  store.selectedAreaIds.forEach(areaId => {
    for (const section of props.venue.sections) {
      const area = section.areas?.find(a => a.id === areaId)
      if (!area) continue
      const clone = { ...JSON.parse(JSON.stringify(area)), id: undefined! }
      if (clone.points) {
        clone.points = clone.points.map((p: number, i: number) => i % 2 === 0 ? p + offsetX : p + offsetY)
      }
      const newId = store.addArea(section.id, clone)
      if (!newId) continue
      store.clearSelection()
      store.selectArea(newId)
      break
    }
  })

  store.saveHistory()
  renderAll()
  // 延迟选中新元素
  setTimeout(() => {
    if (!engine || engine.destroyed) return
    const selected = new Set([
      ...store.selectedSectionIds,
      ...store.selectedShapeIds,
      ...store.selectedTextIds,
      ...store.selectedAreaIds,
    ])
    const els: any[] = []
    selected.forEach(id => {
      const el = (engine!.leafer as any)?.findId?.(id)
      if (el) els.push(el)
    })
    if (els.length > 0) engine.editor.select(els)
  }, 50)
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
      strokeWidth: 1,
      pointSize: EDITOR_BASE_POINT_SIZE,
      resizeLine: { strokeWidth: 1 },
      moveable: true,
      resizeable: true,
      rotateable: true,
      selector: true,
      editBox: true,
      hover: false,
      select: 'press',
      multipleSelect: true,
      boxSelect: true,
      keyEvent: true,
    },
  })

  labelRenderer = new LabelRenderer()

  const config = getRenderConfig()
  seatRenderer = new SeatRenderer(props.venue, config, resolveCategoryColor, darkenColor, undefined, true)

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

  shapeVertexManager = new ShapeVertexManager({
    leafer: engine.leafer,
    getScale: () => engine?.scale ?? 1,
    getSyncing: () => isSyncing,
    setSyncing: (v: boolean) => { isSyncing = v },
    saveHistory: () => store.saveHistory(),
    updateShapePoints: (id, points) => store.updateShape(id, { points }),
    updateAreaPoints: (id, points) => store.updateArea(id, { points }),
    updateSectionPoints: (sectionId, points) => store.updateSectionBorder(sectionId, { borderPoints: points }),
  })

  drawingManager = new DrawingManager({
    previewGroup: engine.previewGroup,
    onRenderAll: renderAll,
    onSubmitComplete: (info) => {
      if (info) pendingAutoSelect = info
    },
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
    onDuplicate: () => duplicateSelected(),
    onGroup: () => groupSelected(),
    onUngroup: () => ungroupSelected(),
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

  // 右键菜单
  ctxMenuCleanup = () => { ctxMenu.visible = false }
  window.addEventListener('click', ctxMenuCleanup)
  window.addEventListener('pointerdown', ctxMenuCleanup, true)

  // 双击分区 → 聚焦（DOM 级 dblclick，避免与 Editor 事件冲突）
  engine.leafer.waitViewReady(() => {
    const canvas = engine!.canvasElement
    if (canvas) {
      // dblclick → 聚焦分区
      const dblHandler = () => {
        if (store.selectedSectionIds.length === 1) {
          enterSectionFocus(store.selectedSectionIds[0])
        }
      }
      canvas.addEventListener('dblclick', dblHandler)
      dblClickCleanup = () => canvas.removeEventListener('dblclick', dblHandler)

      // contextmenu → 右键菜单
      canvas.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault()
        const rect = canvas.getBoundingClientRect()
        ctxMenu.x = e.clientX - rect.left
        ctxMenu.y = e.clientY - rect.top
        ctxMenu.items = buildCtxMenuItems()
        ctxMenu.visible = ctxMenu.items.length > 0
      })
    }
  })

  engine.onZoomChange((scale) => {
    updateViewState(scale)
    // EditBox 控制点/描边反向缩放补偿：保持屏幕像素大小一致
    const safeScale = Math.max(scale, 0.02)
    const scaledPointSize = EDITOR_BASE_POINT_SIZE / safeScale
    const scaledStrokeWidth = 1 / safeScale
    const ed = engine?.editor as any
    if (ed?.config) {
      ed.config.pointSize = scaledPointSize
      ed.config.strokeWidth = scaledStrokeWidth
      if (!ed.config.resizeLine) ed.config.resizeLine = {}
      ed.config.resizeLine.strokeWidth = scaledStrokeWidth
      if (!ed.config.middlePoint) ed.config.middlePoint = {}
      ed.config.middlePoint.strokeWidth = scaledStrokeWidth
    }
    if (ed?.list?.length > 0) {
      ed.editBox?.load?.()
      // 直接修改控件点元素尺寸（load() 走 mergeConfig 链路，某些属性可能被缓存覆盖）
      const eb = ed.editBox as any
      if (eb) {
        ;[...(eb.resizePoints || []), ...(eb.rotatePoints || []), eb.circle].forEach((p: any) => {
          if (p) { p.width = scaledPointSize; p.height = scaledPointSize }
        })
      }
    }
  })

  renderAll()
  setDrawingTool('select') // 初始化选择工具状态
  } catch (err) {
    console.error('[LeaferEditor] onMounted error:', err)
  }
})

onUnmounted(() => {
  editorBridge?.unlisten()
  keyboard?.unlisten()
  pathVertexManager?.destroy()
  shapeVertexManager?.destroy()
  drawingManager?.resetState()
  dblClickCleanup?.()
  if (ctxMenuCleanup) {
    window.removeEventListener('click', ctxMenuCleanup)
    window.removeEventListener('pointerdown', ctxMenuCleanup, true)
    ctxMenuCleanup = null
  }
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
  shapeVertexManager = null
  drawingManager = null
  sectionGroups = []
})

// ==================== Watch ====================

watch(
  () => props.venue.sections,
  () => {
    // 编辑器同步期间跳过重渲染，避免销毁正在拖拽的元素
    if (isSyncing) return
    renderAll()
    // 恢复编辑器选中状态
    if (editorBridge) {
      const allSelected = [
        ...store.selectedSectionIds,
        ...store.selectedRowIds,
        ...store.selectedShapeIds,
        ...store.selectedTextIds,
        ...store.selectedAreaIds,
      ]
      if (allSelected.length > 0) {
        editorBridge.syncStoreToEditor(allSelected)
      }
    }
  }
)

// 选中分区变更 → 显示/隐藏路径顶点编辑手柄
watch(
  () => store.selectedSectionIds,
  (ids) => {
    if (isSyncing) return

    if (ids.length === 1) {
      const section = props.venue.sections.find(s => s.id === ids[0])
      if (!section) {
        pathVertexManager?.hideVertices()
        shapeVertexManager?.hideVertices()
        return
      }

      // path 类型 → PathVertexManager
      if (section.borderType === 'path' && section.borderPathPoints?.length &&
          pathVertexManager && !pathVertexManager.isDragging && !shapeVertexManager?.isDragging) {
        const pathEl = sectionPathMap.get(section.id)
        if (pathEl) {
          shapeVertexManager?.hideVertices()
          pathVertexManager.showVertices(section, pathEl)
          return
        }
      }

      // polygon 类型 → ShapeVertexManager
      if (section.borderType === 'polygon' && section.borderPoints?.length &&
          shapeVertexManager && !shapeVertexManager.isDragging && !pathVertexManager?.isDragging) {
        const polyEl = sectionPolygonElMap.get(section.id)
        if (polyEl) {
          pathVertexManager?.hideVertices()
          shapeVertexManager.showSectionPolygonVertices(
            section.id,
            section.borderPoints,
            section.borderX ?? 0,
            section.borderY ?? 0,
            polyEl,
          )
          return
        }
      }
    }

    pathVertexManager?.hideVertices()
    if (shapeVertexManager?.handleKind === 'sectionPolygon') {
      shapeVertexManager?.hideVertices()
    }
  }
)

// 选中 shape 变更 → 显示/隐藏形状顶点编辑手柄
watch(
  () => store.selectedShapeIds,
  (ids) => {
    if (!shapeVertexManager || shapeVertexManager.isDragging || isSyncing) return

    if (ids.length === 1) {
      const found = findShape(ids[0])
      const shape = found?.shape
      if (shape && (shape.type === 'polygon' || shape.type === 'polyline') && shape.points?.length) {
        const el = shapeElMap.get(ids[0])
        if (el) {
          shapeVertexManager.showShapeVertices(shape, el)
          return
        }
      }
    }
    if (shapeVertexManager.handleKind === 'shape') {
      shapeVertexManager.hideVertices()
    }
  }
)

// 选中 area 变更 → 显示/隐藏区域顶点编辑手柄
watch(
  () => store.selectedAreaIds,
  (ids) => {
    if (!shapeVertexManager || shapeVertexManager.isDragging || isSyncing) return

    if (ids.length === 1) {
      const found = findArea(ids[0])
      const area = found?.area
      if (area && area.points?.length) {
        const el = areaElMap.get(ids[0])
        if (el) {
          shapeVertexManager.showAreaVertices(area, el)
          return
        }
      }
    }
    if (shapeVertexManager.handleKind === 'area') {
      shapeVertexManager.hideVertices()
    }
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

  // select 模式启用 Editor 编辑框；selectseat 禁用避免与 SelectionManager 冲突
  if (drawingManager?.isDrawing) {
    engine?.editor.cancel()
    setEditorHittable(false)
  } else if (tool === 'select') {
    setEditorHittable(true)
    engine?.editor.cancel() // 清除之前选中状态
  } else {
    // selectseat 或其他非绘图工具：禁用编辑器
    setEditorHittable(false)
    engine?.editor.cancel()
  }
}

const setEditorHittable = (v: boolean) => {
  const ed = engine?.editor as any
  if (ed) {
    ed.hittable = v
  }
  // 同步更新所有顶层元素的可交互性
  sectionGroups.forEach(g => {
    g.hittable = v
  })
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

.ctx-menu {
  position: absolute;
  z-index: 1000;
  min-width: 160px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  padding: 4px 0;
}

.ctx-menu-item {
  padding: 7px 16px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  white-space: nowrap;
}

.ctx-menu-item:hover {
  background: #f1f5f9;
}

.ctx-menu-item--danger {
  color: #ef4444;
}

.ctx-menu-item--danger:hover {
  background: #fef2f2;
}
</style>
