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
import { PointerEvent as LeaferPointer } from 'leafer-ui'
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
import { InteractionDispatcher } from '../editor/InteractionDispatcher'
import { VertexEditManager } from '../editor/VertexEditManager'
import { DrawingManager } from '../editor/DrawingManager'
import { getSectionAABB, isInsideSection, isNearSectionBorder } from '../viewer/geometry'

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
let dispatcher: InteractionDispatcher | null = null
let vertexEditManager: VertexEditManager | null = null
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
let ctxMenuCleanup: (() => void) | null = null
/** 分区 ID → 其边框元素（用于悬停高亮，覆盖所有 borderType） */
const sectionBorderElMap = new Map<string, any>()
let hoveredSectionId: string | null = null
const _hoverOriginals = new Map<string, { strokeWidth: number; stroke: string }>()
const _selectionHighlighted = new Set<string>()
let boundHoverMove: ((e: PointerEvent) => void) | null = null
// 手动双击检测（绕开 Leafer Editor 对 editable 元素的 DOUBLE_CLICK 拦截）
let _lastClickTime = 0
let _lastClickPos = { x: 0, y: 0 }
let _dblClickDetector: ((e: PointerEvent) => void) | null = null
// 顶点编辑模式下的点击切换/退出（pointerup 捕获阶段）
let _vertexEditClickHandler: ((e: PointerEvent) => void) | null = null
const DBL_CLICK_WINDOW = 350   // ms
const DBL_CLICK_DIST = 8       // px
const HOVER_HIGHLIGHT_COLOR = '#3B82F6'
const HOVER_HIGHLIGHT_WIDTH_DELTA = 1
const EDITOR_BASE_POINT_SIZE = 6
const EDITOR_BASE_STROKE_WIDTH = 2.5

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
  sectionBorderElMap.clear()
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

    // 缓存边框元素（供悬停高亮用，覆盖所有 borderType）
    if (section.borderType && section.borderType !== 'none') {
      const borderEl = sectionGroup.children[0]
      if (borderEl) {
        sectionBorderElMap.set(section.id, borderEl)
        // 单击边框 → 顶点编辑 / 普通选择
        borderEl.on(LeaferPointer.CLICK, (e: any) => {
          if (!engine || !vertexEditManager) return
          if (dispatcher?.mode !== 'IDLE' && dispatcher?.mode !== 'VERTEX_EDIT') return
          const worldPos = (borderEl as any).localToWorld?.({ x: e.x ?? 0, y: e.y ?? 0 }) ?? { x: (section.borderX ?? 0) + (e.x ?? 0), y: (section.borderY ?? 0) + (e.y ?? 0) }

          if (isNearSectionBorder(section, worldPos, currentScale)) {
            if (section.borderType === 'polygon' && section.borderPoints?.length) {
              dispatcher.enterVertexEdit(section, 'polygon')
            } else if (section.borderType === 'path' && section.borderPathPoints?.length) {
              dispatcher.enterVertexEdit(section, 'path')
            }
          }
        })
      }
    }

    // 缓存 Path/Polygon 边框元素，供顶点编辑使用
    if (section.borderType === 'path' && section.borderPathPoints?.length) {
      const borderEl = sectionGroup.children[0]
      if (borderEl && (borderEl as any).tag === 'Path') {
        sectionPathMap.set(section.id, borderEl)
      }
    } else if (section.borderType === 'polygon' && section.borderPoints?.length) {
      const borderEl = sectionGroup.children[0]
      if (borderEl) {
        const tag = (borderEl as any).tag
        if (tag === 'Path' || tag === 'Polygon') {
          sectionPolygonElMap.set(section.id, borderEl)
        }
      }
    }

    // 缓存 shape 和 area 元素（shape/area 仍用逐元素双击进入顶点编辑）
    sectionGroup.children?.forEach((child: any) => {
      const cid = child.id || child.getAttr?.('id') || ''
      if (cid.startsWith('shape-')) {
        const sid = cid.slice(6)
        shapeElMap.set(sid, child)
        const shape = section.shapes?.find(s => s.id === sid)
        if (shape && (shape.type === 'polygon' || shape.type === 'polyline')) {
          child.on(LeaferPointer.DOUBLE_CLICK, () => {
            if (!engine || !vertexEditManager) return
            engine.editor.cancel()
            vertexEditManager.enterForShape(shape, child)
          })
        }
      } else if (cid.startsWith('area-')) {
        const aid = cid.slice(5)
        areaElMap.set(aid, child)
        child.on(LeaferPointer.DOUBLE_CLICK, () => {
          if (!engine || !vertexEditManager) return
          engine.editor.cancel()
          const area = section.areas?.find(a => a.id === aid)
          if (area) vertexEditManager.enterForArea(area, child)
        })
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
      if (dispatcher?.mode === 'SEAT_SELECT') {
        selectionManager?.handleSeatClick(seat, row, section, (s, r, sec) => {
          emit('seat-click', s, r, sec)
        })
      }
    },
    true,  // editMode
  )
  seatRenderer.render()
  seatRenderer.setFocusedSectionId(store.focusedSectionId)
  seatRenderer.updateLOD(currentScale)
  selectionManager?.setRenderer(seatRenderer)
}

const renderAll = () => {
  if (!engine || engine.destroyed) return

  labelRenderer?.clear()
  buildNodeMeta()
  rebuildSectionLayers()
  // 重建后恢复选中分区边框高亮
  const selScale = Math.max(currentScale, 0.02)
  _selectionHighlighted.forEach(sid => {
    const el = sectionBorderElMap.get(sid)
    if (el) { el.strokeWidth = 1 / selScale; el.stroke = '#3b82f6' }
  })
  createSeatRenderer()

  // 将座位分区分组挂到对应的分区 Group 下，移动分区时座位跟随移动
  sectionGroups.forEach(sg => {
    const sid = (sg as any).id?.replace('section-', '')
    if (!sid) return
    const seatGroup = seatRenderer?.rootGroup.children?.find(
      (c: any) => c.id === `seats-${sid}`
    ) as any
    if (seatGroup) {
      seatRenderer!.rootGroup.remove(seatGroup)
      sg.add(seatGroup)
    }
  })
  // seat-root 现在已空，不再添加到 leafer（seat 已在 sectionGroup 内）
  // 但 updateLOD 等仍依赖 seatRenderer.rootGroup 存在，保留引用即可

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
      const section = props.venue.sections.find(s => s.id === id)
      const dx = x - (section?.borderX ?? 0)
      const dy = y - (section?.borderY ?? 0)

      store.updateSectionBorder(id, { borderX: x, borderY: y, borderWidth: width, borderHeight: height })

      // 更新 Store 内部元素的世界坐标（leafer 子元素通过父级 transform 自动跟随，不手动偏移）
      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        section?.rows.forEach(row => {
          store.updateRow(row.id, { x: (row.x ?? 0) + dx, y: (row.y ?? 0) + dy })
        })
        section?.shapes?.forEach(shape => {
          store.updateShape(shape.id, { x: (shape.x ?? 0) + dx, y: (shape.y ?? 0) + dy })
        })
        section?.texts?.forEach(text => {
          store.updateText(text.id, { x: (text.x ?? 0) + dx, y: (text.y ?? 0) + dy })
        })
        section?.areas?.forEach(area => {
          store.updateArea(area.id, {
            points: area.points.map((p, i) => p + (i % 2 === 0 ? dx : dy)),
          })
        })
      }

      // 同步 leafer group 位置
      const sg = sectionGroups.find(g => (g as any).id === `section-${id}`) as any
      if (sg) { sg.x = x; sg.y = y }
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
    shouldPan: () => true, // 初始值，等 dispatcher 创建后更新
    editorConfig: {
      stroke: '#836DFF',
      strokeWidth: EDITOR_BASE_STROKE_WIDTH,
      pointSize: EDITOR_BASE_POINT_SIZE,
      resizeLine: { strokeWidth: 1, height: 2 },
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

  vertexEditManager = new VertexEditManager({
    leafer: engine.leafer,
    getScale: () => engine?.scale ?? 1,
    getSyncing: () => isSyncing,
    setSyncing: (v: boolean) => { isSyncing = v },
    saveHistory: () => store.saveHistory(),
    updateSectionBorderPathPoints: (sectionId, pathPoints) =>
      store.updateSectionBorder(sectionId, { borderPathPoints: pathPoints }),
    updateSectionBorderPoints: (sectionId, points, arcDepths) =>
      store.updateSectionBorder(sectionId, { borderPoints: points, borderArcDepths: arcDepths }),
    updateShapePoints: (id, points, arcDepths) =>
      store.updateShape(id, { points, arcDepths }),
    updateAreaPoints: (id, points, arcDepths) =>
      store.updateArea(id, { points, arcDepths }),
  })

  drawingManager = new DrawingManager({
    previewGroup: engine.previewGroup,
    onRenderAll: renderAll,
    onSubmitComplete: (info) => {
      if (info) pendingAutoSelect = info
    },
  })

  dispatcher = new InteractionDispatcher({
    getSections: () => props.venue.sections,
    getScale: () => engine?.scale ?? 1,
    isVertexEditActive: () => vertexEditManager?.isActive ?? false,
    isDrawing: () => drawingManager?.isDrawing ?? false,
    onEnterDrawing: (tool) => {
      drawingManager?.setTool(tool)
      engine?.editor.cancel()
      setEditorHittable(false)
    },
    onExitDrawing: () => {
      drawingManager?.setTool('select')
      drawingManager?.resetState()
      setEditorHittable(true)
    },
    onEnterVertexEdit: (section, kind) => {
      if (!engine || !vertexEditManager) return
      engine.editor.cancel()
      // 编辑器不可交互但分区边框保持可点，以便切换顶点编辑目标
      sectionGroups.forEach(g => { g.hittable = true })
      // 同步右边面板选中
      store.selectSection(section.id)
      if (kind === 'path') {
        const el = sectionPathMap.get(section.id)
        if (el) vertexEditManager.enterForPathSection(section, el)
      } else {
        const el = sectionPolygonElMap.get(section.id)
        if (el) vertexEditManager.enterForPolygonSection(section, el)
      }
    },
    onExitVertexEdit: () => {
      vertexEditManager?.hideVertices()
    },
    onEnterSectionFocus: (sectionId) => {
      enterSectionFocus(sectionId)
    },
    onExitSectionFocus: () => {},
    cancelEditorSelection: () => engine?.editor.cancel(),
    setEditorHittable: (v) => setEditorHittable(v),
  })

  engine.updateShouldPan(() => dispatcher?.canPan ?? true)

  // 为绘制工具注册 DOM 捕获阶段事件
  engine.leafer.waitViewReady(() => {
    const canvas = engine!.canvasElement
    if (!canvas) return

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
      if (dispatcher?.mode !== 'DRAWING') return
      e.stopPropagation()
      e.preventDefault()
      drawingManager?.handlePointerDown(screenToWorld(e.clientX, e.clientY))
    }
    boundDrawPointerMove = (e: PointerEvent) => {
      if (dispatcher?.mode !== 'DRAWING') return
      e.stopPropagation()
      drawingManager?.handlePointerMove(screenToWorld(e.clientX, e.clientY))
    }
    boundDrawPointerUp = (e: PointerEvent) => {
      if (dispatcher?.mode !== 'DRAWING') return
      e.stopPropagation()
      drawingManager?.handlePointerUp(screenToWorld(e.clientX, e.clientY))
    }
    canvas.addEventListener('pointerdown', boundDrawPointerDown, true)
    canvas.addEventListener('pointermove', boundDrawPointerMove, true)
    canvas.addEventListener('pointerup', boundDrawPointerUp, true)

    // 手动双击检测（DOM pointerdown，绕开 Leafer Editor 对 editable 元素的 DOUBLE_CLICK 拦截）
    _dblClickDetector = (e: PointerEvent) => {
      if (dispatcher?.mode !== 'IDLE') return
      const now = Date.now()
      const dx = e.clientX - _lastClickPos.x
      const dy = e.clientY - _lastClickPos.y
      if (now - _lastClickTime < DBL_CLICK_WINDOW && Math.hypot(dx, dy) < DBL_CLICK_DIST) {
        dispatcher.handleDoubleClick(screenToWorld(e.clientX, e.clientY))
        _lastClickTime = 0
        return
      }
      _lastClickTime = now
      _lastClickPos = { x: e.clientX, y: e.clientY }
    }
    canvas.addEventListener('pointerdown', _dblClickDetector, true)

    // 顶点编辑模式下：点击其他分区主体 → 切换；点击空白 → 退出
    _vertexEditClickHandler = (e: PointerEvent) => {
      if (dispatcher?.mode !== 'VERTEX_EDIT') return
      if (vertexEditManager?.isDragging) return // 顶点拖拽中，跳过
      const worldPos = screenToWorld(e.clientX, e.clientY)
      const sections = props.venue.sections
      // 从后往前遍历（上层优先）
      for (let i = sections.length - 1; i >= 0; i--) {
        const s = sections[i]
        if (!s.borderType || s.borderType === 'none') continue
        if (s.readonly) continue
        const aabb = getSectionAABB(s)
        if (!aabb) continue
        // AABB 粗筛
        if (
          worldPos.x < aabb.x - 1 || worldPos.x > aabb.x + aabb.width + 1 ||
          worldPos.y < aabb.y - 1 || worldPos.y > aabb.y + aabb.height + 1
        ) continue
        if (isInsideSection(s, worldPos)) {
          // 点击了另一个分区 → 切换顶点编辑
          if (s.borderType === 'polygon' && s.borderPoints?.length) {
            dispatcher.enterVertexEdit(s, 'polygon')
            return
          }
          if (s.borderType === 'path' && s.borderPathPoints?.length) {
            dispatcher.enterVertexEdit(s, 'path')
            return
          }
          // rect/ellipse 暂不支持顶点编辑，退出
          dispatcher.exitToIdle()
          return
        }
      }
      // 点击空白 → 退出顶点编辑
      dispatcher.exitToIdle()
    }
    canvas.addEventListener('pointerup', _vertexEditClickHandler, true)

    // 悬停边框高亮 — 仅在 IDLE 模式下生效
    boundHoverMove = (e: PointerEvent) => {
      if (dispatcher?.mode !== 'IDLE') {
        _clearHoverHighlight()
        return
      }
      _updateHoverHighlight(screenToWorld(e.clientX, e.clientY))
    }
    canvas.addEventListener('pointermove', boundHoverMove, true)

    // contextmenu → 右键菜单
    canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      ctxMenu.x = e.clientX - rect.left
      ctxMenu.y = e.clientY - rect.top
      ctxMenu.items = buildCtxMenuItems()
      ctxMenu.visible = ctxMenu.items.length > 0
    })
  })

  keyboard = new KeyboardManager({
    onUndo: () => { store.undo(); renderAll() },
    onRedo: () => { store.redo(); renderAll() },
    onDelete: () => deleteSelected(),
    onDuplicate: () => duplicateSelected(),
    onGroup: () => groupSelected(),
    onUngroup: () => ungroupSelected(),
    onEscape: () => {
      if (dispatcher?.mode !== 'IDLE') {
        dispatcher?.exitToIdle()
        return
      }
      store.clearSelection()
      engine?.editor.cancel()
    },
  })
  keyboard.listen()

  // 右键菜单清理
  ctxMenuCleanup = () => { ctxMenu.visible = false }
  window.addEventListener('click', ctxMenuCleanup)
  window.addEventListener('pointerdown', ctxMenuCleanup, true)

  engine.onZoomChange((scale) => {
    updateViewState(scale)
    // EditBox 控制点/描边反向缩放补偿：保持屏幕像素大小一致
    const safeScale = Math.max(scale, 0.02)
    // 选中分区边框缩放补偿：保持屏幕 1px
    _selectionHighlighted.forEach(sid => {
      const el = sectionBorderElMap.get(sid)
      if (el) el.strokeWidth = 1 / safeScale
    })
    // 反向缩放补偿但设上限，避免缩小画布时控制点过大挡住邻近元素
    const scaledPointSize = Math.min(EDITOR_BASE_POINT_SIZE / safeScale, 8)
    const scaledStrokeWidth = Math.min(EDITOR_BASE_STROKE_WIDTH / safeScale, 3)
    const ed = engine?.editor as any
    if (ed?.config) {
      ed.config.pointSize = scaledPointSize
      ed.config.strokeWidth = scaledStrokeWidth
      if (!ed.config.resizeLine) ed.config.resizeLine = {}
      ed.config.resizeLine.strokeWidth = scaledStrokeWidth
    }
    if (ed?.list?.length > 0) {
      ed.editBox?.load?.()
      // 直接修改控件点元素尺寸（load() 走 mergeConfig 链路，某些属性可能被缓存覆盖）
      const eb = ed.editBox as any
      if (eb) {
        ;[...(eb.resizePoints || []), ...(eb.rotatePoints || []), eb.circle].forEach((p: any) => {
          if (p) { p.width = scaledPointSize; p.height = scaledPointSize }
        })
        // 隐藏中间手柄
        ;(eb.middlePoints || []).forEach((p: any) => {
          if (p) p.visible = false
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
  vertexEditManager?.destroy()
  drawingManager?.resetState()
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
    if (boundHoverMove) {
      canvas.removeEventListener('pointermove', boundHoverMove, true)
      boundHoverMove = null
    }
    if (_dblClickDetector) {
      canvas.removeEventListener('pointerdown', _dblClickDetector, true)
      _dblClickDetector = null
    }
    if (_vertexEditClickHandler) {
      canvas.removeEventListener('pointerup', _vertexEditClickHandler, true)
      _vertexEditClickHandler = null
    }
  }

  engine?.destroy()
  engine = null
  seatRenderer = null
  labelRenderer = null
  selectionManager = null
  editorBridge = null
  keyboard = null
  dispatcher = null
  vertexEditManager = null
  drawingManager = null
  sectionGroups = []
  sectionBorderElMap.clear()
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

// 选中分区变更 → 隐藏顶点手柄 + 切换选中边框高亮
// 注意：dispatcher 进入 VERTEX_EDIT 时会 cancelEditorSelection 清空选中，
// 此时不应销毁刚创建的手柄，因此跳过 VERTEX_EDIT 模式下的选中变更。
watch(
  () => store.selectedSectionIds,
  (ids) => {
    if (dispatcher?.mode === 'VERTEX_EDIT') return
    if (vertexEditManager?.activeKind === 'path' || vertexEditManager?.activeKind === 'polygon') {
      vertexEditManager?.hideVertices()
    }

    // 选中边框高亮（蓝色，屏幕固定 1px）
    const newSet = new Set(ids)
    const scale = Math.max(currentScale, 0.02)
    _selectionHighlighted.forEach(sid => {
      if (!newSet.has(sid)) {
        const el = sectionBorderElMap.get(sid)
        if (el) { el.strokeWidth = 0; el.stroke = el.stroke ?? '#808080' }
      }
    })
    newSet.forEach(sid => {
      if (!_selectionHighlighted.has(sid)) {
        const el = sectionBorderElMap.get(sid)
        if (el) { el.strokeWidth = 1 / scale; el.stroke = '#3b82f6' }
      }
    })
    _selectionHighlighted.clear()
    newSet.forEach(sid => _selectionHighlighted.add(sid))
  }
)

// 选中 shape 变更 → 隐藏形状顶点手柄
watch(
  () => store.selectedShapeIds,
  (_ids) => {
    if (!vertexEditManager || vertexEditManager.isDragging || isSyncing || dispatcher?.mode === 'VERTEX_EDIT') return
    if (vertexEditManager.activeKind === 'shape') {
      vertexEditManager.hideVertices()
    }
  }
)

// 选中 area 变更 → 隐藏区域顶点手柄
watch(
  () => store.selectedAreaIds,
  (_ids) => {
    if (!vertexEditManager || vertexEditManager.isDragging || isSyncing || dispatcher?.mode === 'VERTEX_EDIT') return
    if (vertexEditManager.activeKind === 'area') {
      vertexEditManager.hideVertices()
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
  if (!dispatcher) return
  if (tool === 'select') {
    dispatcher.enterIdle()
  } else if (tool === 'selectseat') {
    dispatcher.enterSeatSelect()
  } else {
    dispatcher.enterDrawing(tool)
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

// ==================== 悬停边框高亮 ====================

const _clearHoverHighlight = () => {
  if (hoveredSectionId) {
    const el = sectionBorderElMap.get(hoveredSectionId)
    if (el) {
      const isSelected = _selectionHighlighted.has(hoveredSectionId)
      if (isSelected) {
        el.strokeWidth = 1 / Math.max(currentScale, 0.02)
        el.stroke = '#3b82f6'
      } else {
        const orig = _hoverOriginals.get(hoveredSectionId)
        if (orig) {
          el.strokeWidth = orig.strokeWidth
          el.stroke = orig.stroke
        }
      }
    }
    _hoverOriginals.delete(hoveredSectionId)
    hoveredSectionId = null
  }
}

const _updateHoverHighlight = (worldPos: { x: number; y: number }) => {
  const sections = props.venue.sections
  const scale = currentScale

  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i]
    if (!section.borderType || section.borderType === 'none') continue
    if (section.readonly) continue

    const aabb = getSectionAABB(section)
    if (!aabb) continue

    if (isNearSectionBorder(section, worldPos, scale)) {
      if (hoveredSectionId === section.id) return

      _clearHoverHighlight()

      const el = sectionBorderElMap.get(section.id)
      if (el) {
        _hoverOriginals.set(section.id, {
          strokeWidth: el.strokeWidth ?? 0,
          stroke: el.stroke ?? '#808080',
        })
        el.strokeWidth = (el.strokeWidth ?? 0) + HOVER_HIGHLIGHT_WIDTH_DELTA
        el.stroke = HOVER_HIGHLIGHT_COLOR
        hoveredSectionId = section.id
      }
      return
    }
  }

  _clearHoverHighlight()
}

const enterSectionFocus = (sectionId: string) => {
  const section = props.venue.sections.find(s => s.id === sectionId)
  if (!section || !engine) return

  store.focusedSectionId = sectionId
  store.clearSelection()
  vertexEditManager?.hideVertices()

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
  vertexEditManager?.hideVertices()

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

// 切换当前选中分区的顶点编辑模式
const toggleVertexEdit = () => {
  if (!dispatcher || !vertexEditManager || !engine) return
  if (dispatcher.mode === 'VERTEX_EDIT') {
    dispatcher.exitToIdle()
    return
  }
  const sectionId = store.selectedSectionIds[0]
  if (!sectionId) return
  const section = props.venue.sections.find(s => s.id === sectionId)
  if (!section) return
  if (section.borderType === 'polygon' && section.borderPoints?.length) {
    dispatcher.enterVertexEdit(section, 'polygon')
  } else if (section.borderType === 'path' && section.borderPathPoints?.length) {
    dispatcher.enterVertexEdit(section, 'path')
  }
}

const isVertexEditActive = () => dispatcher?.mode === 'VERTEX_EDIT'

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
  currentDrawingTool: () => dispatcher?.mode ?? 'IDLE',
  enterSectionFocus,
  exitSectionFocus,
  deleteSelected,
  clearDrawing,
  getVenueBounds,
  getSelectedSeats,
  toggleVertexEdit,
  isVertexEditActive,
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
