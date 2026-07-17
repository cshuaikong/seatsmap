<template>
  <div class="pe" :class="{ 'pe--embedded': hideToolbar }">
    <div v-if="!hideToolbar" class="pe-bar">
      <span class="pe-title">{{ title }}</span>
      <button @click="fitContent">适应画布</button>
      <button @click="resetView">重置视图 (1:1)</button>
      <span class="pe-info">缩放: {{ scale.toFixed(2) }}x | 选中: {{ selectedCount }}</span>
      <button @click="onExportJSON">JSON</button>
      <button @click="onExportPNG">PNG</button>
      <button @click="onExportSVG">SVG</button>
      <button v-if="vertexEdit.isEditing.value" @click="vertexEdit.exitVertexEdit()" class="pe-btn-exit">退出编辑 (Esc)</button>
      <button v-if="focusedSectionId" @click="exitSectionFocus()" class="pe-btn-exit">退出分区编辑</button>
      <button v-if="!focusedSectionId && selectedCount === 1 && !vertexEdit.isEditing.value && !seatVertexEdit.isEditing.value"
        @click="enterSectionFocus((canvasCtx?.editor as any)?.list?.[0]?.__sectionId || (canvasCtx?.editor as any)?.list?.[0]?.id)">
        分区编辑
      </button>
    </div>
    <div ref="containerRef" class="pe-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

import { ZoomEvent } from 'leafer-ui'
import '@leafer-in/view'
import '@leafer-in/viewport'
import '@leafer-in/editor'
import { compensateZoom } from '../utils/zoomCompensation'
import type { VenueData } from '../types'

import { useCanvasContext, type CanvasContext } from '../composables/useCanvasContext'
import { useSectionDraw } from '../composables/useSectionDraw'
import { useVertexEdit } from '../composables/useVertexEdit'
import { useSeatVertexEdit } from '../composables/useSeatVertexEdit'
import { exportPNG, exportSVG } from '../composables/usePathExport'
import { useEditorMode } from '../composables/useEditorMode'
import { useSelectionManager } from '../composables/useSelectionManager'
import { useSectionRenderer } from '../composables/useSectionRenderer'
import { useSeatModule } from '../composables/useSeatModule'
import { usePathEditorSync } from '../composables/usePathEditorSync'
import { useEditorStore } from '../stores/editorStore'
import { useHistoryStore } from '../stores/historyStore'
import { useVenueDataStore } from '../stores/venueDataStore'
import { useViewControl } from '../composables/useViewControl'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { getSvgPathCenter } from '../viewer/geometry'
import {
  createAddSectionCommand,
  createBatchCommand,
  createUpdateSectionBorderCommand,
  createUpdateRowCommand,
} from '../domain/venueCommands'
import type { ToolId } from '../domain/toolRegistry'

const props = withDefaults(defineProps<{
  venueData?: VenueData
  seatList?: any[]
  hideToolbar?: boolean
}>(), {
  hideToolbar: false,
  venueData: () => ({}) as VenueData,
  seatList: () => [],
})

const currentTool = defineModel<ToolId>('currentTool', { default: 'select' })
const title = ref('座位图设计器')
const focusedSectionId = ref<string | null>(null)
const focusedSectionName = ref('')
const emit = defineEmits<{
  (e: 'body-double-tap', body: any): void
  (e: 'ready', leafer: any, editor: any): void
  (e: 'vertex-edit-change', active: boolean): void
  (e: 'section-focus-change', focused: boolean, sectionName?: string): void
}>()

const containerRef = ref<HTMLDivElement>()
const selectedCount = ref(0)

let canvasCtx: CanvasContext | null = null
let boundWheel: ((e: WheelEvent) => void) | null = null

let edgeCache = new WeakMap<object, number[][]>()

// ==================== 工具调度中心（最早初始化，供事件回调使用）====================

const mode = useEditorMode((tool) => { currentTool.value = tool as ToolId })

const { bind: bindKeyboard, unbind: unbindKeyboard } = useKeyboardShortcuts({
  getFocusedSectionId: () => focusedSectionId.value,
  isVertexEditActive: () => vertexEdit.isEditing.value,
  isSeatVertexEditActive: () => seatVertexEdit.isEditing.value,
  exitSectionFocus,
  exitVertexEdit: () => vertexEdit.exitVertexEdit(),
  exitSeatVertexEdit: () => seatVertexEdit.exit(),
  deleteSelected,
  cancelCurrentTool: () => mode.cancelCurrent(),
})

// ==================== 视图控制 ====================

const { scale, fitContent, resetView, onZoomEnd } = useViewControl({
  getLeafer: () => canvasCtx?.tree ?? null,
  getS: () => canvasCtx?.getScale() ?? 1,
})

// ==================== 画布上下文与通用 helper ====================

function setPanEnabled(enabled: boolean): void {
  const tree = canvasCtx?.tree as any
  if (tree?.config?.move) tree.config.move.disabled = !enabled
}

// ==================== 分区渲染 ====================

const sectionRenderer = useSectionRenderer({
  getCanvasContext: () => canvasCtx!,
  getEditor: () => canvasCtx?.editor ?? null,
  getS: () => canvasCtx?.getScale() ?? 1,
  getFocusedSectionId: () => focusedSectionId.value,
})

let allPaths = sectionRenderer.allPaths

function clearAllPaths() {
  sectionRenderer.clearAllSectionGroups()
  allPaths = sectionRenderer.allPaths
  edgeCache = new WeakMap<object, number[][]>()
  seatModule.clearSeatElements()
}

function deleteSelected() {
  const editor = canvasCtx?.editor
  const list: any[] = (editor as any)?.list ?? []
  if (list.length === 0) return

  // 只维护 allPaths 引用（多边形绘制碰撞检测需要），画布元素由 store 变更后的 watcher 统一移除
  const sectionPaths = sectionRenderer.allPaths
  list.forEach((el: any) => {
    if (el.tag === 'Path') {
      const idx = sectionPaths.indexOf(el)
      if (idx !== -1) sectionPaths.splice(idx, 1)
    } else if (el.__sectionGroup) {
      const path = el.children?.find((c: any) => c.tag === 'Path')
      if (path) {
        const idx = sectionPaths.indexOf(path)
        if (idx !== -1) sectionPaths.splice(idx, 1)
      }
    }
  })

  edgeCache = new WeakMap<object, number[][]>()

  // store 删除 → watcher 同步画布
  editorStore.deleteSelected()

  canvasCtx?.editor?.cancel()
  seatModule.updateSeatLOD()
}

function renderAll(data: VenueData): void {
  if (!canvasCtx) return
  try {
    clearAllPaths()

    const sections = data?.sections ?? []
    let polygonCount = 0
    sections.forEach((s: any) => {
      if (s.type === 'path' && s.path) {
        sectionRenderer.createPolygonItem(s)
        polygonCount++
      }
    })

    // 从 venue data 渲染座位（sections[].rows[].seats[]）
    const {baseScale, categories}: any = data
    seatModule.createSeatsFromVenueData(sections, baseScale, categories)

    // SIMPLE 模式：自动进入默认分区聚焦，座位工具直接可用
    const venueType: string = (data as any)?.type ?? 'SIMPLE'
    if (venueType === 'SIMPLE') {
      const defaultSection = sections.find((s: any) => s.type === 'none' || !s.type || !s.path) || sections[0]
      if (defaultSection) {
        nextTick(() => enterSectionFocus(defaultSection.id))
      }
    }

    const editor = canvasCtx?.editor
    if (editor) {
      // editor.cancel()
      ;(editor as any).zIndex = 999
    }

    pathEditorSync.resetKnownIds()
  } catch (e) {
    console.error('[renderAll] error:', e)
  }
}

function onExportJSON() {
  const venue = venueDataStore.exportVenueData()
  downloadFile('venue-data.json', JSON.stringify({ venue }, null, 2))
}

function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a)
}

// ==================== 多边形绘制 ====================

const sectionDraw = useSectionDraw({
  getCanvasContext: () => canvasCtx!,
  getEditor: () => canvasCtx?.editor ?? null,
  getCanvas: () => canvasCtx?.canvas ?? null,
  getAllPaths: () => {
    const result: any[] = [...allPaths]
    sectionRenderer.sectionGroupMap.forEach(g => result.push(g))
    return result
  },
  getS: () => canvasCtx?.getScale() ?? 1,
  setPanEnabled,
  onFinish: (data) => {
    historyStore.execute(
      createAddSectionCommand(venueDataStore, {
        id: data.id,
        name: `分区 ${allPaths.length + 1}`,
        type: 'path',
        path: data.path,
        pathPoints: data.points.map(p => ({ x: p.x, y: p.y })),
        x: 0,
        y: 0,
        fill: '#d1d5db',
        stroke: '#9ca3af',
        rows: [],
        shapes: [],
        texts: [],
        areas: [],
      } as any),
    )
    // canvas 由 watcher 从 store 增量渲染
  },
  onToolChange: (tool) => { currentTool.value = tool as ToolId },
})

// ==================== 座位模块 ====================

const seatModule = useSeatModule({
  getCanvasContext: () => canvasCtx!,
  getEditor: () => canvasCtx?.editor ?? null,
  getCanvas: () => canvasCtx?.canvas ?? null,
  getS: () => canvasCtx?.getScale() ?? 1,
  setPanEnabled,
  getAllNonSeatPaths: () => {
    const result: any[] = []
    sectionRenderer.sectionGroupMap.forEach(g => result.push(g))
    return result
  },
  getSectionGroupMap: () => sectionRenderer.sectionGroupMap,
  getFocusedSectionId: () => focusedSectionId.value,
  getCurrentTool: () => currentTool.value,
  onToolChange: (tool) => { currentTool.value = tool as ToolId },
})

// ==================== 画布↔表单同步桥 ====================

const pathEditorSync = usePathEditorSync({
  getLeafer: () => canvasCtx?.tree ?? null,
  getEditor: () => canvasCtx?.editor ?? null,
  getSectionGroupMap: () => sectionRenderer.sectionGroupMap,
  getSeatRowGroups: () => seatModule.seatRowGroups,
  getFocusedSectionId: () => focusedSectionId.value,
  rebuildSeatRow: (group, newData, endCenter, anchorFromEnd) =>
    seatModule.rebuildSeatRow(group, newData, endCenter, anchorFromEnd),
  refreshSeatLOD: () => seatModule.updateSeatLOD(),
  createSection: (section) => {
    if (section.type === 'path' && section.path) {
      sectionRenderer.createPolygonItem(section as { id: string; path: string; x: number; y: number; fill: string; stroke?: string; strokeWidth?: number; name?: string; rotation?: number })
    }
    seatModule.createSeatsFromVenueData([section])
  },
  createRows: (sectionId, rows) => {
    const section = venueDataStore.venue.sections.find(s => s.id === sectionId)
    if (section) seatModule.createSeatsFromVenueData([{ ...section, rows }])
  },
})

// Store 中的单座选中变化 → 刷新 LOD 高亮
const editorStore = useEditorStore()
const historyStore = useHistoryStore()
const venueDataStore = useVenueDataStore()
watch(() => editorStore.selectedSeatIds, () => {
  seatModule.updateSeatLOD()
}, { deep: true })

// ==================== 顶点编辑 ====================

const vertexEdit = useVertexEdit({
  getCanvasContext: () => canvasCtx!,
  getEditor: () => canvasCtx?.editor ?? null,
  getAllPaths: () => {
    const result: any[] = []
    sectionRenderer.sectionGroupMap.forEach(g => result.push(g))
    return result
  },
  getS: () => canvasCtx?.getScale() ?? 1,
  setPanEnabled,
  getEdgeCache: () => edgeCache,
  getCurrentBorder: () => {
    const target = vertexEdit.getTarget()
    if (target) {
      const pg = (target as any).__sectionGroup
      if (pg && pg !== true) {
        const border = pg.__selectionBorder
        if (border) return border
      }
    }
    const firstGroup = sectionRenderer.sectionGroupMap.values().next().value
    return firstGroup?.__selectionBorder ?? null
  },
  getParentGroup: () => {
    const tgt = vertexEdit.getTarget()
    return tgt ? (tgt as any).__sectionGroup ?? null : null
  },
  onToolChange: (tool) => { currentTool.value = tool as ToolId },
  onPathChange: (sectionId, path) => {
    historyStore.execute(createUpdateSectionBorderCommand(venueDataStore, sectionId, { path }))
  },
})

// ==================== 座位排顶点编辑 ====================

const seatVertexEdit = useSeatVertexEdit({
  getCanvasContext: () => canvasCtx!,
  getEditor: () => canvasCtx?.editor ?? null,
  getAllPaths: () => {
    const result: any[] = []
    sectionRenderer.sectionGroupMap.forEach(g => result.push(g))
    return result
  },
  getS: () => canvasCtx?.getScale() ?? 1,
  setPanEnabled,
  getParentGroup: () => {
    const tgt = seatVertexEdit.getTarget()
    if (!tgt) return null
    // 查找座位排 Group 的父级 SectionGroup
    const sectionId = (tgt as any).__sectionId
    return sectionId ? sectionRenderer.sectionGroupMap.get(sectionId) ?? null : null
  },
  onRebuild: (group, newData, endCenter, anchorFromEnd) => seatModule.rebuildSeatRow(group, newData, endCenter, anchorFromEnd),
  onToolChange: (tool) => { currentTool.value = tool as ToolId },
})

watch(() => vertexEdit.isEditing.value || seatVertexEdit.isEditing.value, (v) => emit('vertex-edit-change', v))

// ==================== 工具注册 ====================

mode.register('drawSection', {
  enter: () => sectionDraw.enter(),
  exit: () => sectionDraw.cancel(),
  onClick: (x, y) => { sectionDraw.handleClick(x, y); return true },
  onMove: (x, y) => sectionDraw.handleMove(x, y),
  isActive: () => sectionDraw.isActive(),
})

mode.register('node', {
  exit: () => { if (vertexEdit.isEditing.value) vertexEdit.exitVertexEdit() },
})

Object.entries(seatModule.modeHandlers).forEach(([name, handler]) => mode.register(name, handler))

// ==================== 画布上下文初始化 ====================

const { init: initCanvasContext } = useCanvasContext({
  containerRef,
  onEditorSelect: () => {
    const editor = canvasCtx?.editor
    const list: any[] = (editor as any)?.list ?? []
    selectedCount.value = list.length

    // 同步分区高亮边框（边框作为 SectionGroup 子元素，自动跟随移动/旋转）
    const selectedGroups = new Set<any>()
    for (const el of list) {
      if (el.__sectionGroup === true) {
        selectedGroups.add(el)
      } else if (el.__sectionGroup && el.__sectionGroup !== true) {
        selectedGroups.add(el.__sectionGroup)
      }
    }
    sectionRenderer.updateSelectionBorders(selectedGroups)

    // 选中变化时刷新座位条高亮
    seatModule.updateSeatLOD()

    if (currentTool.value === 'node' && list.length === 1 && !vertexEdit.isEditing.value) {
      if (list[0]?.__seatRow && seatVertexEdit.getTarget() !== list[0]) {
        seatVertexEdit.enter(list[0])
        return
      }
      // 可能选中了 Path 或 SectionGroup（Group 内嵌 Path）
      const pathTarget = list[0]?.tag === 'Path'
        ? list[0]
        : (list[0]?.__sectionGroup ? list[0].children?.find((c: any) => c.tag === 'Path') : null)
      if (pathTarget && vertexEdit.getTarget() !== pathTarget) {
        vertexEdit.enterVertexEdit(pathTarget)
        return
      }
    }

    // 画布选中 → 右侧表单同步
    pathEditorSync.syncSelectionToStore()
  },
  onEditorMove: () => {
    isDraggingForHistory = true
    ;(canvasCtx?.editor as any)?.editBox?.update()
    // 拖拽中不写 store，pointerup 时通过 command 提交
  },
  onEditorRotate: () => {
    isDraggingForHistory = true
    ;(canvasCtx?.editor as any)?.editBox?.update()
    // 旋转中不写 store，pointerup 时通过 command 提交
  },
  onPointerMove: (e: any) => {
    const w = canvasCtx!.clientToWorld(e.x, e.y)
    mode.handleMove(w.x, w.y)
  },
  onPointerUp: () => {
    const editor = canvasCtx?.editor
    const sel2 = (editor as any)?.selector
    const list: any[] = (editor as any)?.list ?? []
    const hasSeats = list.some((el: any) => el.__seatId)
    if (sel2?.__boxHidden) {
      if (!hasSeats) {
        ;(editor as any).editBox.visible = true
        ;(editor as any).editBox.update()
      }
      sel2.__boxHidden = false
    }
    // 分区选中时主动刷新包围盒（旋转手柄需要），座位排已由 onTarget→updateEditTool 更新
    if (list.length > 0 && list.some((el: any) => el.__sectionGroup === true)) {
      ;(editor as any).editBox?.update()
    }
    // 框选后 editBox 仍被隐藏的兜底恢复（仅恢复 visible，不调 update 防止已选中排重绘抖动）
    const eb = (editor as any)?.editBox
    if (eb && !eb.visible && list.length > 0 && !hasSeats) {
      eb.visible = true
    }
  },
  onPointerDown: () => {
    try { ;(canvasCtx?.tree as any).canvas?.getClientBounds?.(true) } catch (_) {}
  },
  onPointerClick: (e: any) => {
    const w = canvasCtx!.clientToWorld(e.x, e.y)
    mode.handleClick(w.x, w.y)
  },
  onDoubleTap: () => {
    const editor = canvasCtx?.editor
    const list: any[] = (editor as any)?.list ?? []
    if (list.length === 1 && list[0]?.__sectionGroup === true) {
      editor?.openGroup(list[0])
    }
  },
  onZoomEnd: () => {
    onZoomEnd()
    // 缩放动画结束后再创建座位圆点，避免与大量元素创建同时进行导致主线程阻塞
    applyPendingSeatEllipses()
    const s = canvasCtx?.getScale() ?? 1
    const handles = vertexEdit.getTarget() ? [...vertexEdit.getHandles(), ...vertexEdit.getEdgeHandles()] : undefined
    compensateZoom(canvasCtx?.editor ?? null, s, handles)
    if (seatVertexEdit.isEditing.value) seatVertexEdit.updateHandleSize()
    sectionRenderer.updateBorderStrokeWidth(s)
    seatModule.updateSeatLOD()
    sectionRenderer.updateNameTextsLOD()
  },
})

// ==================== 分区编辑（Section Focus） ====================

let _origOpenGroupFn: ((group: any) => void) | null = null
let _origCloseGroupFn: ((group?: any) => void) | null = null

// 分区聚焦后需要延迟创建的 sectionId（等缩放动画结束后再创建座位圆点，避免动画与大量元素创建同时发生导致卡死）
let pendingEnsureSectionId: string | null = null

function applyPendingSeatEllipses(): void {
  if (!pendingEnsureSectionId) return
  seatModule.ensureSeatEllipses(pendingEnsureSectionId, props.venueData?.categories)
  pendingEnsureSectionId = null
}

function enterSectionFocus(sectionId: string): void {
  // 避免连续进入不同分区时残留上一次未执行的延迟创建
  if (pendingEnsureSectionId && pendingEnsureSectionId !== sectionId) {
    applyPendingSeatEllipses()
  }
  pendingEnsureSectionId = sectionId

  const tree = canvasCtx?.tree
  const editor = canvasCtx?.editor
  const group = sectionRenderer.sectionGroupMap.get(sectionId)
  if (!group) {
    // 无 SectionGroup 的分区（如 type=none）：手动执行 setup
    const section = props.venueData?.sections?.find((s: any) => s.id === sectionId)
    if (!section || !tree) return
    focusedSectionId.value = sectionId
    focusedSectionName.value = section.name || ''
    title.value = focusedSectionName.value ? `分区编辑 — ${focusedSectionName.value}` : '分区编辑'
    emit('section-focus-change', true, focusedSectionName.value)
    editor?.cancel()
    if (vertexEdit.isEditing.value) vertexEdit.exitVertexEdit()
    if (seatVertexEdit.isEditing.value) seatVertexEdit.exit()
    const secPath = (section as any).path as string | undefined
    const pathCenter = secPath ? getSvgPathCenter(secPath) : null
    const cx = pathCenter ? (section.x ?? 0) + pathCenter.cx : (section.x ?? 0)
    const cy = pathCenter ? (section.y ?? 0) + pathCenter.cy : (section.y ?? 0)
    const raw: any = props.venueData || {}
    const baseScale = raw.baseScale ?? seatModule.getBaseScale()
    const currentS = canvasCtx?.getScale() ?? 1
    const targetScale = baseScale
    if (Math.abs(targetScale - currentS) > 0.001) {
      tree.scaleOfWorld({ x: cx, y: cy }, targetScale / currentS)
      setTimeout(() => { scale.value = canvasCtx?.getScale() ?? 1; tree.emit(ZoomEvent.END, { scale: canvasCtx?.getScale() ?? 1, totalScale: canvasCtx?.getScale() ?? 1 } as any) }, 350)
    } else {
      // 无需缩放时同步创建座位圆点
      applyPendingSeatEllipses()
      seatModule.updateSeatLOD()
    }
    sectionRenderer.sectionGroupMap.forEach((g, id) => {
      if (id !== sectionId) { g.opacity = 0.25; g.hittable = false; g.editable = false; g.draggable = false }
    })
    return
  }

  // 有 SectionGroup：手动设置状态 + 调用原版 openGroup + 覆盖属性 + 隐藏 editBox
  focusedSectionId.value = sectionId
  focusedSectionName.value = group.__sectionName || ''
  title.value = `分区编辑 — ${focusedSectionName.value}`
  emit('section-focus-change', true, focusedSectionName.value)
  const pathBody = group.children?.find((c: any) => c.tag === 'Path')
  if (pathBody) emit('body-double-tap', pathBody)
  editor?.cancel()
  if (vertexEdit.isEditing.value) vertexEdit.exitVertexEdit()
  if (seatVertexEdit.isEditing.value) seatVertexEdit.exit()

  const section = props.venueData?.sections?.find((s: any) => s.id === sectionId)
  let cx = section?.x ?? group.x ?? 0
  let cy = section?.y ?? group.y ?? 0
  // 用 Leafer group 的真实包围盒中心作为缩放锚点
  try {
    const box = (group as any).getBounds?.('world')
    if (box && box.width > 0 && box.height > 0) {
      cx = box.x + box.width / 2
      cy = box.y + box.height / 2
    }
  } catch (_) {}
  const raw: any = props.venueData || {}
  const baseScale = raw.baseScale ?? seatModule.getBaseScale()
  const currentS = canvasCtx?.getScale() ?? 1
  const targetScale = baseScale
  if (Math.abs(targetScale - currentS) > 0.001) {
    tree?.scaleOfWorld({ x: cx, y: cy }, targetScale / currentS)
    setTimeout(() => { scale.value = canvasCtx?.getScale() ?? 1; tree?.emit(ZoomEvent.END, { scale: canvasCtx?.getScale() ?? 1, totalScale: canvasCtx?.getScale() ?? 1 } as any) }, 350)
  } else {
    applyPendingSeatEllipses()
    seatModule.updateSeatLOD()
  }

  // 调用原版 openGroup（调用期间临时恢复原始方法，防止 Leafer 内部再次命中拦截器导致递归/重入）
  if (_origOpenGroupFn && _origCloseGroupFn && editor) {
    const patchedOpenGroup = editor.openGroup
    const patchedCloseGroup = editor.closeGroup
    editor.openGroup = _origOpenGroupFn
    editor.closeGroup = _origCloseGroupFn
    try {
      _origOpenGroupFn(group)
    } finally {
      editor.openGroup = patchedOpenGroup
      editor.closeGroup = patchedCloseGroup
    }
  } else {
    _origOpenGroupFn?.(group)
  }

  // openGroup 之后覆盖 hittable/editable（防止被原版重置）+ 隐藏 editBox 防止拦截点击
  sectionRenderer.sectionGroupMap.forEach((g, id) => {
    if (id !== sectionId) {
      g.opacity = 0.25; g.hittable = false; g.editable = false; g.draggable = false
    } else {
      g.hittable = true; g.editable = false; g.draggable = false; g.hitChildren = true
    }
  })
  // 聚焦模式下隐藏分区填充的命中，避免点空白处选中 body Path
  const focusedBody = sectionRenderer.getBody(sectionId)
  if (focusedBody) focusedBody.hittable = false
  seatModule.seatRowGroups.forEach((g: any) => {
    if (g.__sectionId === sectionId) {
      g.hittable = true
      g.editable = true
      g.draggable = true
      g.children?.forEach((c: any) => { c.hittable = true; c.editable = true })
    }
  })
  const eb = (editor as any)?.editBox
  if (eb) eb.visible = false
}

function exitSectionFocus(): void {
  if (!focusedSectionId.value) return
  const exitingSectionId = focusedSectionId.value
  const tree = canvasCtx?.tree
  const editor = canvasCtx?.editor
  focusedSectionId.value = null
  focusedSectionName.value = ''
  title.value = '座位图设计器'
  emit('section-focus-change', false)
  if (vertexEdit.isEditing.value) vertexEdit.exitVertexEdit()
  if (seatVertexEdit.isEditing.value) seatVertexEdit.exit()
  ;(editor as any)?.closeGroup?.()
  // 恢复分区填充的命中，让非聚焦模式下点击可选中分区
  const exitingBody = sectionRenderer.getBody(exitingSectionId)
  if (exitingBody) exitingBody.hittable = true
  // 退出分区编辑后销毁座位圆点，恢复排线模式以提升性能
  seatModule.clearSeatEllipses()
  seatModule.updateSeatLOD()
  ;(tree as any)?.__updateViewPort?.()
}

// ==================== 导出 ====================

function onExportPNG() { if (canvasCtx) exportPNG(canvasCtx) }
function onExportSVG() { if (canvasCtx) exportSVG(canvasCtx, sectionRenderer.sectionGroupMap) }

// ==================== 生命周期 ====================

let isDraggingForHistory = false

onMounted(() => {
  canvasCtx = initCanvasContext()
  if (!canvasCtx) return

  const editor = canvasCtx.editor
  const tree = canvasCtx.tree

  useSelectionManager({
    getEditor: () => editor,
    getFocusedSectionId: () => focusedSectionId.value,
    getSectionGroupMap: () => sectionRenderer.sectionGroupMap,
    getVertexTarget: () => vertexEdit.getTarget(),
  })

  // 钩子：拦截 editor.openGroup / closeGroup
  const _origOpenGroup = editor.openGroup.bind(editor)
  _origOpenGroupFn = _origOpenGroup
  const _origCloseGroup = editor.closeGroup.bind(editor)
  _origCloseGroupFn = _origCloseGroup
  editor.openGroup = function (group: any) {
    // 仅分区 Group 触发 enterSectionFocus，座位排不受影响
    if (group?.__sectionGroup === true && group?.__sectionId) {
      enterSectionFocus(group.__sectionId)
      return
    }
    // 座位排不打开内部编辑（否则 children 变为独立可选，破坏整排选中模型）
    if (group?.__seatRow) return
    _origOpenGroup(group)
  }

  editor.closeGroup = function () {
    // 分区聚焦期间阻止自动 close（exitSectionFocus 会先清 focusedSectionId 再调用）
    if (focusedSectionId.value) return
    try { _origCloseGroupFn?.(undefined as any) } catch (_) {}
    sectionRenderer.sectionGroupMap.forEach((group) => {
      group.opacity = 1; group.hittable = true; group.editable = true; group.draggable = true
    })
    seatModule.seatRowGroups.forEach((g: any) => {
      if (g.__isVenueDataSeat) {
        g.hittable = false
        g.editable = false
        g.children?.forEach((c: any) => { c.hittable = true; c.editable = false })
      }
    })
    seatModule.updateSeatLOD()
    ;(tree as any)?.__updateViewPort?.()
  }

  const commitTransformCommand = () => {
    const updates = pathEditorSync.collectTransformUpdates()
    if (updates.length === 0) return
    const commands: ReturnType<typeof createUpdateSectionBorderCommand | typeof createUpdateRowCommand>[] = []
    for (const u of updates) {
      if (Object.keys(u.sectionUpdates).length > 0) {
        commands.push(createUpdateSectionBorderCommand(venueDataStore, u.sectionId, u.sectionUpdates))
      }
      for (const rw of u.rowUpdates) {
        commands.push(createUpdateRowCommand(venueDataStore, rw.rowId, rw.updates))
      }
    }
    if (commands.length) historyStore.execute(createBatchCommand(commands))
  }
  const onPointerUp = () => {
    if (isDraggingForHistory) {
      isDraggingForHistory = false
      commitTransformCommand()
    }
  }
  document.addEventListener('pointerup', onPointerUp)
  ;(tree as any).__onPointerUp = onPointerUp

  renderAll(props.venueData)
  // 所有 section/row 数据均来自 store，无需再将 canvas 反向同步

  // 启动 venueStore → 画布同步监听
  pathEditorSync.watchStoreAndApply()

  ;(window as any).__leafer = tree
  emit('ready', tree, editor)

  // Ctrl+滚轮缩放
  tree.waitViewReady(() => {
    const canvas = canvasCtx!.canvas
    boundWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const local = tree.interaction?.getLocal({ clientX: e.clientX, clientY: e.clientY })
      if (!local) return
      const delta = e.deltaY > 0 ? -0.5 : 0.5
      tree.scaleOfWorld(local, 1 + delta * 0.5)
      tree.emit(ZoomEvent.END, { scale: canvasCtx?.getScale() ?? 1, totalScale: canvasCtx?.getScale() ?? 1 } as any)
    }
    canvas.addEventListener('wheel', boundWheel, { passive: false })

    bindKeyboard()
  })
})

onUnmounted(() => {
  if (boundWheel) {
    canvasCtx?.canvas?.removeEventListener('wheel', boundWheel)
    boundWheel = null
  }
  unbindKeyboard()
  const onPointerUp2 = (canvasCtx?.tree as any)?.__onPointerUp
  if (onPointerUp2) document.removeEventListener('pointerup', onPointerUp2)
  canvasCtx?.destroy()
  canvasCtx = null
})

// ==================== Watch ====================

watch(() => props.venueData, (newVal, oldVal) => {
  if (!newVal || newVal === oldVal) return
  renderAll(newVal)
})

watch(currentTool, (tool) => {
  const editor = canvasCtx?.editor
  // node 模式特殊处理：如果已有选中元素，直接进入对应顶点编辑
  if (tool === 'node') {
    const list: any[] = (editor as any)?.list ?? []
    if (!vertexEdit.isEditing.value && !seatVertexEdit.isEditing.value) {
      if (list.length === 1) {
        if (list[0]?.__seatRow) {
          seatVertexEdit.enter(list[0])
          return
        }
        const pathTarget = list[0]?.tag === 'Path'
          ? list[0]
          : (list[0]?.__sectionGroup ? list[0].children?.find((c: any) => c.tag === 'Path') : null)
        if (pathTarget) {
          vertexEdit.enterVertexEdit(pathTarget)
          return
        }
      }
    }
  } else {
    if (vertexEdit.isEditing.value) vertexEdit.exitVertexEdit()
    if (seatVertexEdit.isEditing.value) seatVertexEdit.exit()
  }

  mode.switchTo(tool)
})

// ==================== Expose ====================

defineExpose({
  fitContent, resetView,
  getScale: () => canvasCtx?.getScale() ?? 1,
  exportJSON: onExportJSON, exportPNG: onExportPNG, exportSVG: onExportSVG,
  getLeafer: () => canvasCtx?.tree ?? null, getEditor: () => canvasCtx?.editor ?? null,
  isVertexEditActive: () => vertexEdit.isEditing.value,
  isSeatVertexEditActive: () => seatVertexEdit.isEditing.value,
  isSectionFocusActive: () => !!focusedSectionId.value,
  focusedSectionName: () => focusedSectionName.value,
  toggleVertexEdit: () => {
    const editor = canvasCtx?.editor
    vertexEdit.isEditing.value ? vertexEdit.exitVertexEdit() : vertexEdit.enterVertexEdit((editor as any)?.list?.[0])
  },
  enterSectionFocus,
  exitSectionFocus,
  deleteSelected,
  renderAll,
  drawnSeatCount: seatModule.drawnSeatCount,
})
</script>

<style scoped>
.pe { display: flex; flex-direction: column; height: 100vh; background: #f8fafc; }
.pe--embedded { height: 100%; background: transparent; }
.pe-bar {
  display: flex; align-items: center; gap: 10px; padding: 6px 16px;
  background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
}
.pe-title { font-weight: 600; font-size: 13px; color: #1e293b; }
.pe-bar button {
  padding: 4px 10px; font-size: 11px; border: 1px solid #d1d5db;
  border-radius: 4px; background: #fff; cursor: pointer;
}
.pe-bar button:hover { background: #f1f5f9; }
.pe-btn-exit { background: #fef2f2 !important; color: #dc2626 !important; border-color: #fecaca !important; }
.pe-info { font-size: 11px; color: #64748b; margin-left: auto; }
.pe-canvas { flex: 1; overflow: hidden; background: #fff; }
</style>
