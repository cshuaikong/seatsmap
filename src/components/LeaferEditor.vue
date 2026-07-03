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
import type { VenueData, Seat, SeatRow, Section, ShapeObject, AreaObject } from '../types'
import { useVenueStore } from '../stores/venueStore'
import { EditorEngine } from '../editor/EditorEngine'
import type { EditorBridgeOptions } from '../editor/EditorBridge'
import { EditorBridge } from '../editor/EditorBridge'
import { KeyboardManager } from '../editor/KeyboardManager'
import { SectionRenderer } from '../viewer/SectionRenderer'
import { SeatRenderer } from '../viewer/SeatRenderer'
import { LabelRenderer } from '../viewer/LabelRenderer'
import { SelectionManager } from '../viewer/SelectionManager'
import { InteractionDispatcher } from '../editor/InteractionDispatcher'
import { VertexEditManager } from '../editor/VertexEditManager'
import { DrawingManager } from '../editor/DrawingManager'
import { DirtyTracker, RenderScheduler } from '../editor/DirtyTracker'
import { getSectionAABB, isInsideSection } from '../viewer/geometry'

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
const dirtyTracker = new DirtyTracker()
const renderScheduler = new RenderScheduler()
let sectionGroups: any[] = []
let currentScale = 1
let isSyncing = false
let pendingAutoSelect: { kind: string; id: string } | null = null
/** 节点编辑工具模式：等待点击分区进入顶点编辑 */
let nodeToolActive = false
let ctxMenuCleanup: (() => void) | null = null
/** 分区 ID → 其边框元素（用于悬停高亮，覆盖所有 borderType） */
const sectionBorderElMap = new Map<string, any>()
/** 分区 ID → 双图层 fill 元素（仅选中分区存在） */
const sectionFillElMap = new Map<string, any>()
let hoveredSectionId: string | null = null
const _hoverOriginals = new Map<string, { strokeWidth: number; stroke: string }>()
const _selectionHighlighted = new Set<string>()
const HOVER_HIGHLIGHT_COLOR = '#3B82F6'
const EDITOR_BASE_POINT_SIZE = 6
const EDITOR_BASE_STROKE_WIDTH = 1

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
    width: visualConfig?.width ?? 2,
  }
}

const resolveCategoryColor = (key: string | number): string => {
  return getCategoryColor(key, props.venue.categories)
}

// ==================== 渲染 ====================

/**
 * 重建分区图层。dirtySectionIds 为 null 时全量重建，否则仅重建指定分区。
 */
const rebuildSectionLayers = (dirtySectionIds?: Set<string> | null) => {
  if (!engine) return
  const leafer = engine.leafer
  const incremental = dirtySectionIds != null
  const isFocusMode = !!store.focusedSectionId

  // 全量模式：清空所有 section
  if (!incremental) {
    sectionGroups.forEach(g => leafer.remove(g))
    sectionGroups = []
    sectionBorderElMap.clear()
    sectionFillElMap.clear()
  }

  const targetSections = incremental
    ? props.venue.sections.filter(s => dirtySectionIds.has(s.id))
    : props.venue.sections

  targetSections.forEach(section => {
    if (incremental) {
      // 增量：先移除该 section 的旧 group
      const oldIdx = sectionGroups.findIndex((g: any) => g.__meta?.id === section.id)
      if (oldIdx >= 0) {
        leafer.remove(sectionGroups[oldIdx])
        sectionGroups.splice(oldIdx, 1)
      }
      sectionBorderElMap.delete(section.id)
      sectionFillElMap.delete(section.id)
    }

    const isSelected = store.selectedSectionIds.includes(section.id)
    const sectionGroup = SectionRenderer.render(section, { interactive: true, dualLayer: isSelected })
    sectionGroups.push(sectionGroup)

    // 分区聚焦模式：非聚焦分区降透明度 + 不可交互；聚焦分区不可选中但保持穿透
    if (isFocusMode) {
      if (section.id !== store.focusedSectionId) {
        sectionGroup.opacity = 0.25
        sectionGroup.hittable = false
        sectionGroup.editable = false
      } else {
        sectionGroup.editable = false  // 分区本身不可选中/移动，但 hittable 保持 true 让座位排可命中
      }
    }

    leafer.add(sectionGroup)

    // 缓存边框元素（供悬停高亮用，覆盖所有 borderType）
    if (section.borderType && section.borderType !== 'none') {
      if (isSelected) {
        // 双图层: children[0]=fill, children[1]=stroke
        const fillEl = sectionGroup.children[0]
        const strokeEl = sectionGroup.children[1]
        if (fillEl) {
          sectionFillElMap.set(section.id, fillEl)
          bindBodyDoubleClick(section.id, fillEl)
        }
        if (strokeEl) {
          sectionBorderElMap.set(section.id, strokeEl)
          bindStrokeDoubleClick(section.id, strokeEl)
        }
      } else {
        const borderEl = sectionGroup.children[0]
        if (borderEl) {
          sectionBorderElMap.set(section.id, borderEl)
          bindBodyDoubleClick(section.id, borderEl)
        }
      }
    }

    const shapeMap = new Map<string, ShapeObject>()
    section.shapes?.forEach(s => { if (s.type === 'polygon' || s.type === 'polyline') shapeMap.set(s.id, s) })
    const areaMap = new Map<string, AreaObject>()
    section.areas?.forEach(a => areaMap.set(a.id, a))

    sectionGroup.children?.forEach((child: any) => {
      const cid = child.id || child.getAttr?.('id') || ''
      if (cid.startsWith('shape-')) {
        const shape = shapeMap.get(cid.slice(6))
        if (shape) {
          child.on(LeaferPointer.DOUBLE_CLICK, () => {
            if (!engine || !vertexEditManager) return
            engine.editor.cancel()
            vertexEditManager.enterForShape(shape, child)
          })
        }
      } else if (cid.startsWith('area-')) {
        const area = areaMap.get(cid.slice(5))
        if (area) {
          child.on(LeaferPointer.DOUBLE_CLICK, () => {
            if (!engine || !vertexEditManager) return
            engine.editor.cancel()
            vertexEditManager.enterForArea(area, child)
          })
        }
      }
    })
  })

  ;(engine.editor as any).toTop?.()
}

// ==================== 双图层事件绑定 ====================

/** 给边框元素（stroke）绑定双击 → 顶点编辑 */
const bindStrokeDoubleClick = (sectionId: string, el: any) => {
  el.off(LeaferPointer.DOUBLE_CLICK)
  el.on(LeaferPointer.DOUBLE_CLICK, (e: any) => {
    e.stopDefault?.()
    if (dispatcher?.mode === 'VERTEX_EDIT') return
    const section = props.venue.sections.find(s => s.id === sectionId)
    if (!section || !dispatcher) return
    if (section.borderType === 'path' && section.pathPoints?.length) {
      dispatcher.enterVertexEdit(section, 'path')
    }
  })
}

/** 给主体元素（fill / 单层合并）绑定双击 → 分区聚焦 */
const bindBodyDoubleClick = (sectionId: string, el: any) => {
  el.off(LeaferPointer.DOUBLE_CLICK)
  el.on(LeaferPointer.DOUBLE_CLICK, (e: any) => {
    e.stopDefault?.()
    enterSectionFocus(sectionId)
  })
}

// ==================== 双图层原地切换 ====================

/** 将已渲染的分区从单层边框切换到双图层（fill + stroke 分离） */
const transitionToDualLayer = (sectionId: string) => {
  const group = sectionGroups.find((g: any) => g.__meta?.id === sectionId) as any
  if (!group) return
  const oldBorder = group.children?.find((c: any) =>
    c.id === `section-border-${sectionId}`
  )
  if (!oldBorder) return // 已经是双图层或没有边框

  const section = props.venue.sections.find(s => s.id === sectionId)
  if (!section) return

  const dual = SectionRenderer.createDualBorder(section)
  if (!dual) return

  const [fillEl, strokeEl] = dual
  const oldIndex = group.children.indexOf(oldBorder)
  group.remove(oldBorder)
  group.addAt(fillEl, oldIndex)
  group.addAt(strokeEl, oldIndex + 1)

  sectionFillElMap.set(sectionId, fillEl)
  sectionBorderElMap.set(sectionId, strokeEl)
  bindBodyDoubleClick(sectionId, fillEl)
  bindStrokeDoubleClick(sectionId, strokeEl)
}

/** 将已渲染的分区从双图层恢复到单层边框 */
const transitionToSingleLayer = (sectionId: string) => {
  const group = sectionGroups.find((g: any) => g.__meta?.id === sectionId) as any
  if (!group) return
  const fillEl = group.children?.find((c: any) =>
    c.id === `section-border-fill-${sectionId}`
  )
  const strokeEl = group.children?.find((c: any) =>
    c.id === `section-border-stroke-${sectionId}`
  )
  if (!fillEl || !strokeEl) return // 已经是单层

  const section = props.venue.sections.find(s => s.id === sectionId)
  if (!section) return

  const combined = SectionRenderer.createBorder(section, true) as any
  if (!combined) return

  const fillIndex = Math.min(
    group.children.indexOf(fillEl),
    group.children.indexOf(strokeEl),
  )
  group.remove(fillEl)
  group.remove(strokeEl)
  group.addAt(combined, fillIndex)

  sectionBorderElMap.set(sectionId, combined)
  sectionFillElMap.delete(sectionId)
  bindBodyDoubleClick(sectionId, combined)
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

// ==================== 选中高亮辅助函数 ====================

function applySelectionHighlight(el: any, scale: number) {
  const isDual = el.id?.startsWith?.('section-border-stroke-')
  el.strokeWidth = isDual ? 2 / scale : 1 / scale
  el.stroke = '#3b82f6'
}

function clearSelectionHighlight(el: any, scale: number) {
  if (el.id?.startsWith?.('section-border-stroke-')) {
    el.stroke = 'transparent'
  } else {
    el.strokeWidth = 0
    el.stroke = el.stroke ?? '#808080'
  }
}

const renderAll = () => {
  if (!engine || engine.destroyed) return

  const plan = dirtyTracker.consume()
  const needsFullRebuild = plan.dirtySectionIds === null || (plan.dirtySectionIds.size === 0 && !plan.dirtyAllSeats && !plan.dirtyLabels)
  const hasDirtySections = plan.dirtySectionIds !== null && plan.dirtySectionIds.size > 0

  // ── 1. 标签 ──
  labelRenderer?.clear()

  // ── 2. 分区边框 ──
  rebuildSectionLayers(needsFullRebuild ? null : plan.dirtySectionIds)

  // ── 3. 恢复选中高亮 ──
  restoreSelectionHighlight()

  // ── 4. 座位 ──
  if (plan.dirtyAllSeats || needsFullRebuild || hasDirtySections) {
    createSeatRenderer()
    // 座位 Group 挂到对应分区 Group 下，移动分区时座位跟随移动
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
  }

  // ── 5. 编辑器层前置 ──
  ;(engine.editor as any).toTop?.()

  // ── 6. 自动选中新建元素 ──
  if (pendingAutoSelect && !isSyncing) {
    const info = pendingAutoSelect
    pendingAutoSelect = null
    requestAnimationFrame(() => {
      if (!engine || engine.destroyed) return
      setDrawingTool('select')
      const fullId = `${info.kind}-${info.id}`
      const el = (engine.leafer as any)?.findId?.(fullId)
      if (el) engine.editor.select(el)
    })
  }
}

/** 重建后恢复选中分区边框高亮 */
const restoreSelectionHighlight = () => {
  const selScale = Math.max(currentScale, 0.02)
  _selectionHighlighted.forEach(sid => {
    const el = sectionBorderElMap.get(sid)
    if (el) applySelectionHighlight(el, selScale)
  })
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
    selectSection: (id, additive) => store.selectSection(id, additive),
    selectRow: (id, additive) => store.selectRow(id, additive),
    selectSeat: (id, additive) => store.selectSeat(id, additive),
    selectShape: (id, additive) => store.selectShape(id, additive),
    selectText: (id, additive) => store.selectText(id, additive),
    selectArea: (id, additive) => store.selectArea(id, additive),
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
      const dx = x - (section?.x ?? 0)
      const dy = y - (section?.y ?? 0)

      store.updateSectionBorder(id, { x: x, y: y, width: width, height: height })

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
      x: (section.x ?? 0) + offsetX,
      y: (section.y ?? 0) + offsetY,
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
    editorConfig: {
      stroke: '#836DFF',
      strokeWidth: EDITOR_BASE_STROKE_WIDTH,
      area: { fill: 'rgba(59,130,246,0.1)', strokeWidthFixed: true },
      pointSize: EDITOR_BASE_POINT_SIZE,
      circle: {},
      circleMargin: 2,
      circleDirection: 'top',
      hideResizeLines: true,
      moveable: true,
      resizeable: false,
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
  ;(engine.editor as any).zIndex = 999  // 一次设定，保证编辑器始终在最顶层

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
      store.updateSectionBorder(sectionId, { pathPoints: pathPoints }),
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
    isVertexEditActive: () => vertexEditManager?.isActive ?? false,
    isDrawing: () => drawingManager?.isDrawing ?? false,
    onEnterDrawing: (tool) => {
      drawingManager?.setTool(tool)
      engine?.editor.cancel()
      // 绘制模式下分区不响应事件，让指针穿透到 leafer 根
      sectionGroups.forEach(g => { g.hittable = false; g.editable = false })
      ;(engine?.editor as any).hittable = false
    },
    onExitDrawing: () => {
      drawingManager?.setTool('select')
      drawingManager?.resetState()
      sectionGroups.forEach(g => { g.hittable = true; g.editable = true })
      ;(engine?.editor as any).hittable = true
    },
    onEnterVertexEdit: (section, kind) => {
      if (!engine || !vertexEditManager) return
      engine.editor.cancel()
      // 编辑器不可交互但分区边框保持可点，以便切换顶点编辑目标
      sectionGroups.forEach(g => { g.hittable = true })
      // 同步右边面板选中
      store.selectSection(section.id)
      const el = sectionBorderElMap.get(section.id)
      if (!el) return
      if (kind === 'path') {
        vertexEditManager.enterForPathSection(section, el)
      }
    },
    onExitVertexEdit: () => {
      vertexEditManager?.hideVertices()
    },
    cancelEditorSelection: () => engine?.editor.cancel(),
    setEditorHittable: (v) => setEditorHittable(v),
    setPanEnabled: (v) => engine?.setPanEnabled(v),
  })

  // 注册 Leafer 事件（绘制、悬停、顶点编辑切换）
  engine.leafer.waitViewReady(() => {
    const leafer = engine!.leafer

    const canvasToWorld = (x: number, y: number) => {
      const l = engine!.leafer as any
      const zl = l.__zoomLayer
      const scaleX = l.scaleX ?? zl?.scaleX ?? 1
      const scaleY = l.scaleY ?? zl?.scaleY ?? 1
      const panX = l.x ?? zl?.x ?? 0
      const panY = l.y ?? zl?.y ?? 0
      return { x: (x - panX) / scaleX, y: (y - panY) / scaleY }
    }

    // 绘制工具 → Leafer 事件（绘制模式下分区 hittable=false，事件穿透到 leafer 根）
    leafer.on(LeaferPointer.DOWN, (e: any) => {
      if (dispatcher?.mode !== 'DRAWING') return
      drawingManager?.handlePointerDown(canvasToWorld(e.x ?? 0, e.y ?? 0))
    })
    leafer.on(LeaferPointer.MOVE, (e: any) => {
      if (dispatcher?.mode === 'DRAWING') {
        drawingManager?.handlePointerMove(canvasToWorld(e.x ?? 0, e.y ?? 0))
      } else if (dispatcher?.mode === 'IDLE') {
        _updateHoverHighlight(e)
      } else {
        _clearHoverHighlight()
      }
    })
    leafer.on(LeaferPointer.UP, (e: any) => {
      if (dispatcher?.mode !== 'DRAWING') return
      drawingManager?.handlePointerUp(canvasToWorld(e.x ?? 0, e.y ?? 0))
    })

    // 顶点编辑 / 节点工具模式：点击其他分区 → 切换；点击空白 → 退出
    leafer.on(LeaferPointer.CLICK, (e: any) => {
      if (dispatcher?.mode !== 'VERTEX_EDIT' && !nodeToolActive) return
      if (vertexEditManager?.isDragging) return
      const worldPos = canvasToWorld(e.x ?? 0, e.y ?? 0)
      const sections = props.venue.sections
      for (let i = sections.length - 1; i >= 0; i--) {
        const s = sections[i]
        if (!s.borderType || s.borderType === 'none') continue
        if (s.readonly) continue
        const aabb = getSectionAABB(s)
        if (!aabb) continue
        if (
          worldPos.x < aabb.x - 1 || worldPos.x > aabb.x + aabb.width + 1 ||
          worldPos.y < aabb.y - 1 || worldPos.y > aabb.y + aabb.height + 1
        ) continue
        if (isInsideSection(s, worldPos)) {
          if (s.borderType === 'path' && s.pathPoints?.length) {
            dispatcher.enterVertexEdit(s, 'path')
            return
          }
          dispatcher.exitToIdle()
          return
        }
      }
      dispatcher.exitToIdle()
    })

    // 右键菜单
    leafer.on(LeaferPointer.MENU, (e: any) => {
      e.preventDefault?.()
      ctxMenu.x = e.x ?? 0
      ctxMenu.y = e.y ?? 0
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
    // 选中分区边框缩放补偿：双图层 stroke 元素用 6 屏幕像素
    _selectionHighlighted.forEach(sid => {
      const el = sectionBorderElMap.get(sid)
      if (el) {
        el.strokeWidth = el.id?.startsWith?.('section-border-stroke-') ? 2 / safeScale : 1 / safeScale
      }
    })
    // 反向缩放补偿但设上限，避免缩小画布时控制点过大挡住邻近元素
    const scaledPointSize = Math.min(EDITOR_BASE_POINT_SIZE / safeScale, 8)
    const scaledStrokeWidth = EDITOR_BASE_STROKE_WIDTH / safeScale
    const ed = engine?.editor as any
    if (ed?.config) {
      ed.config.pointSize = scaledPointSize
      ed.config.strokeWidth = scaledStrokeWidth
      if (!ed.config.resizeLine) ed.config.resizeLine = {}
      ed.config.resizeLine.strokeWidth = scaledStrokeWidth
    }
    if (ed?.list?.length > 0) {
      ed.editBox?.load?.()
      ed.editBox?.update?.()
      // 调整旋转手柄和圆形控制点尺寸（缩放已通过 resizeable: false 禁用）
      const eb = ed.editBox as any
      if (eb) {
        ;[...(eb.rotatePoints || []), eb.circle].forEach((p: any) => {
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
  vertexEditManager?.destroy()
  drawingManager?.resetState()
  if (ctxMenuCleanup) {
    window.removeEventListener('click', ctxMenuCleanup)
    window.removeEventListener('pointerdown', ctxMenuCleanup, true)
    ctxMenuCleanup = null
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
  sectionFillElMap.clear()
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

// 选中分区变更：隐藏顶点手柄 + 切换图层 + 选中边框高亮
watch(
  () => store.selectedSectionIds,
  (ids, oldIds) => {
    if (dispatcher?.mode === 'VERTEX_EDIT') return
    if (vertexEditManager?.activeKind === 'path') {
      vertexEditManager?.hideVertices()
    }

    const newSet = new Set(ids)
    const oldSet = new Set(oldIds ?? [])

    // 新增的 → 切双图层；移除的 → 恢复单层
    newSet.forEach(sid => { if (!oldSet.has(sid)) transitionToDualLayer(sid) })
    oldSet.forEach(sid => { if (!newSet.has(sid)) transitionToSingleLayer(sid) })

    // 选中边框高亮 / 取消高亮
    const scale = Math.max(currentScale, 0.02)
    // 取消已移除分区的高亮
    oldSet.forEach(sid => {
      if (!newSet.has(sid)) {
        const el = sectionBorderElMap.get(sid)
        if (el) clearSelectionHighlight(el, scale)
      }
    })
    // 统一给所有当前选中分区应用高亮（保证多选时每个分区都有描边）
    newSet.forEach(sid => {
      const el = sectionBorderElMap.get(sid)
      if (el) applySelectionHighlight(el, scale)
    })

    // 更新快照，供 renderAll / zoom / hover 使用
    _selectionHighlighted.clear()
    newSet.forEach(sid => _selectionHighlighted.add(sid))
  }
)

// 选中 shape/area 变更 → 隐藏形状/区域顶点手柄
watch(
  [() => store.selectedShapeIds, () => store.selectedAreaIds],
  () => {
    if (!vertexEditManager || vertexEditManager.isDragging || isSyncing || dispatcher?.mode === 'VERTEX_EDIT') return
    if (vertexEditManager.activeKind === 'shape' || vertexEditManager.activeKind === 'area') {
      vertexEditManager.hideVertices()
    }
  }
)


// ==================== Expose (KonvaRenderer 兼容) ====================

const getStageScale = () => engine?.scale ?? currentScale

const getBaseScale = () => store.getBaseScale?.() ?? 1

const setDrawingTool = (tool: string) => {
  if (!dispatcher) return
  nodeToolActive = false
  if (tool === 'select') {
    dispatcher.enterIdle()
  } else if (tool === 'selectseat') {
    dispatcher.enterSeatSelect()
  } else if (tool === 'node') {
    // 节点编辑工具：有选中分区 → 立即进入顶点编辑；否则等待点击
    const sid = store.selectedSectionIds[0]
    const section = sid ? props.venue.sections.find(s => s.id === sid) : null
    if (section?.borderType === 'path' && section.pathPoints?.length) {
      if (vertexEditManager?.activeKind !== 'path') {
        engine?.editor.cancel()
        vertexEditManager?.enterForPathSection(section, sectionBorderElMap.get(section.id))
        dispatcher.enterVertexEdit(section, 'path')
      }
    } else {
      nodeToolActive = true
      dispatcher.enterIdle()
    }
  } else {
    dispatcher.enterDrawing(tool)
  }
}

const setEditorHittable = (v: boolean) => {
  const ed = engine?.editor as any
  if (ed) ed.hittable = v
}

// ==================== 悬停边框高亮 ====================

const _clearHoverHighlight = () => {
  if (hoveredSectionId) {
    const el = sectionBorderElMap.get(hoveredSectionId)
    const isDualStroke = el?.id?.startsWith?.('section-border-stroke-')
    const s = Math.max(currentScale, 0.02)
    if (el) {
      const isSelected = _selectionHighlighted.has(hoveredSectionId)
      if (isSelected) {
        if (isDualStroke) el.strokeWidth = 2 / s
        else el.strokeWidth = 1 / s
        el.stroke = '#3b82f6'
      } else {
        if (isDualStroke) {
          el.strokeWidth = 2 / s
          el.stroke = 'transparent'
        } else {
          const orig = _hoverOriginals.get(hoveredSectionId)
          if (orig) {
            el.strokeWidth = orig.strokeWidth
            el.stroke = orig.stroke
          }
        }
      }
    }
    _hoverOriginals.delete(hoveredSectionId)
    hoveredSectionId = null
  }
}

const _updateHoverHighlight = (e: any) => {
  const targetId: string = e?.target?.id ?? ''
  const scale = Math.max(currentScale, 0.02)

  // stroke 元素 → 分区已选中，高亮其边框
  if (targetId.startsWith('section-border-stroke-')) {
    const sid = targetId.replace('section-border-stroke-', '')
    if (hoveredSectionId === sid) return
    _clearHoverHighlight()
    const el = sectionBorderElMap.get(sid)
    if (el) {
      _hoverOriginals.set(sid, { strokeWidth: el.strokeWidth ?? 0, stroke: el.stroke ?? 'transparent' })
      el.strokeWidth = 2 / scale
      el.stroke = HOVER_HIGHLIGHT_COLOR
      hoveredSectionId = sid
    }
    return
  }

  _clearHoverHighlight()
}

const enterSectionFocus = (sectionId: string, worldPos?: { x: number; y: number }) => {
  const section = props.venue.sections.find(s => s.id === sectionId)
  if (!section || !engine) return

  store.focusedSectionId = sectionId
  store.clearSelection()
  engine.editor.cancel()
  vertexEditManager?.hideVertices()

  // 以点击点为中心，无点击点则算分区近似中心
  let cx: number, cy: number
  if (worldPos) {
    cx = worldPos.x
    cy = worldPos.y
  } else {
    cx = section.x ?? 0
    cy = section.y ?? 0
    if (section.borderType === 'rect') {
      cx += (section.width ?? 100) / 2
      cy += (section.height ?? 100) / 2
    }
  }

  const baseScale = (props.venue as any).baseScale ?? store.getBaseScale?.()
  const currentS = engine.scale ?? currentScale
  const targetScale = baseScale ?? currentS

  // 仅在有 baseScale 且与当前缩放不同时才缩放
  const scaleChanged = Math.abs(targetScale - currentS) > 0.001
  if (scaleChanged) {
    engine.leafer.scaleOfWorld({ x: cx, y: cy }, targetScale / currentS)

    setTimeout(() => {
      engine?.leafer.emit?.('zoom.end' as any, { scale: engine?.scale ?? 1 })
    }, 350)
  }

  // 直接改 opacity，不全量重建
  sectionGroups.forEach(sg => {
    const sgid = (sg as any).__meta?.id
    if (sgid === sectionId) {
      sg.editable = false // 分区本身不可选中/移动，但 hittable 保持 true 让座位排可命中
    } else {
      sg.opacity = 0.25
      sg.hittable = false
      sg.editable = false
    }
  })
}

const exitSectionFocus = () => {
  if (!engine) return

  store.focusedSectionId = null
  vertexEditManager?.hideVertices()

  // 还原所有分区的 opacity 和交互属性
  sectionGroups.forEach(sg => {
    sg.opacity = 1
    sg.hittable = true
    sg.editable = true
  })

  ;(engine.leafer as any).__updateViewPort?.()
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
  if (section.borderType === 'path' && section.pathPoints?.length) {
    dispatcher.enterVertexEdit(section, 'path')
  }
}

const isVertexEditActive = () => dispatcher?.mode === 'VERTEX_EDIT'

defineExpose({
  renderAll,
  getStageScale,
  getBaseScale,
  setDrawingTool,
  enterSectionFocus,
  exitSectionFocus,
  deleteSelected,
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
