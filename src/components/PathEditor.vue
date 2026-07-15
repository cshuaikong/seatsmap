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
        @click="enterSectionFocus((editor as any)?.list?.[0]?.__sectionId || (editor as any)?.list?.[0]?.id)">
        分区编辑
      </button>
    </div>
    <div ref="containerRef" class="pe-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Leafer, Path, Group, Text, ZoomEvent, PointerEvent as LP } from 'leafer-ui'
import '@leafer-in/view'
import '@leafer-in/viewport'
import '@leafer-in/editor'
import { Editor, EditorEvent, EditorMoveEvent, EditorRotateEvent } from '@leafer-in/editor'
import { compensateZoom } from '../utils/zoomCompensation'
import type { VenueData } from '../types'
import { darkenColor } from '../utils/pathUtils'
import { usePolygonDraw } from '../composables/usePolygonDraw'
import { useVertexEdit } from '../composables/useVertexEdit'
import { useSeatVertexEdit } from '../composables/useSeatVertexEdit'
import { exportPNG, exportSVG } from '../composables/usePathExport'
import { useEditorMode } from '../composables/useEditorMode'
import { useSelectorPatch } from '../composables/useSelectorPatch'
import { useSeatModule } from '../composables/useSeatModule'
import { usePathEditorSync } from '../composables/usePathEditorSync'
import { useEditorStore } from '../stores/editorStore'
import { useHistoryStore } from '../stores/historyStore'
import { useVenueDataStore } from '../stores/venueDataStore'
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
const scale = ref(1)
const selectedCount = ref(0)

let leafer: Leafer | null = null
let editor: Editor | null = null
let canvas: HTMLCanvasElement | null = null
let boundWheel: ((e: WheelEvent) => void) | null = null

let allPaths: any[] = []
let sectionGroupMap = new Map<string, any>()
let edgeCache = new WeakMap<object, number[][]>()
// let sectionBorders: Array<{ border: any; group: any }> = []

// ==================== 工具函数 ====================

function getS(): number {
  return (leafer as any)?.scaleX ?? (leafer as any)?.__zoomLayer?.scaleX ?? 1
}

function canvasToWorld(x: number, y: number): { x: number; y: number } {
  const l = leafer as any
  const zl = l?.__zoomLayer
  const sx = l?.scaleX ?? zl?.scaleX ?? 1
  const sy = l?.scaleY ?? zl?.scaleY ?? 1
  const px = l?.x ?? zl?.x ?? 0
  const py = l?.y ?? zl?.y ?? 0
  return { x: (x - px) / sx, y: (y - py) / sy }
}

function setPanEnabled(enabled: boolean): void {
  const app = (leafer as any)?.app
  if (app?.config?.move) app.config.move.disabled = !enabled
}

/** 从 SVG path 字符串中解析坐标范围，返回中心点 */
function getPathCenterFromString(pathStr: string): { x: number; y: number } | null {
  if (!pathStr) return null
  const nums = pathStr.match(/[-+]?\d*\.?\d+/g)
  if (!nums || nums.length < 2) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = parseFloat(nums[i])
    const y = parseFloat(nums[i + 1])
    if (isNaN(x) || isNaN(y)) continue
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  if (!isFinite(minX)) return null
  return { x: minX + (maxX - minX) / 2, y: minY + (maxY - minY) / 2 }
}

function updateNameTextsLOD(): void {
  const s = getS()
  sectionGroupMap.forEach((group: any) => {
    const nameText = group.__nameText
    if (!nameText) return
    if (s < 0.8) {
      nameText.opacity = 0
      return
    }
    // 优先用 LeaferJS boxBounds，不可用时从 path 字符串直接计算
    const body = group.children?.find((c: any) => c.tag === 'Path' && (c as any).__sectionGroup === group)
    let center: { x: number; y: number } | null = null
    if (body?.boxBounds && (body.boxBounds.width > 0 || body.boxBounds.height > 0)) {
      const bb = body.boxBounds
      center = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }
    } else {
      const rawPath = (body as any)?.__rawPath as string | undefined
      if (rawPath) {
        center = getPathCenterFromString(rawPath)
      }
    }
    if (center) {
      nameText.x = center.x
      nameText.y = center.y
      nameText.fontSize = Math.max(8, Math.min(28, 14 / s))
      nameText.opacity = 1
    }
  })
}

// ==================== 渲染 ====================

function createPolygonItem(p: { id: string; path: string; x: number; y: number; fill: string; stroke?: string; strokeWidth?: number; name?: string; rotation?: number }) {
  // 查找或创建 SectionGroup
  let sectionGroup = sectionGroupMap.get(p.id)
  if (!sectionGroup) {
    sectionGroup = new Group({
      id: `section-group-${p.id}`,
      x: p.x ?? 0,
      y: p.y ?? 0,
      rotation: p.rotation ?? 0,
      editable: true,
      draggable: true,
      hittable: true,
      hitChildren: false,
      zIndex: 0,
    })
    ;(sectionGroup as any).__sectionGroup = true
    ;(sectionGroup as any).__sectionId = p.id
    ;(sectionGroup as any).__sectionName = p.name
    sectionGroupMap.set(p.id, sectionGroup)
    leafer!.add(sectionGroup)

    // 非 focus 模式下直接点选 SectionGroup；focus 模式下交给子元素处理
    sectionGroup.on(LP.BEFORE_DOWN, (e: any) => {
      if (focusedSectionId.value) return
      const ed = editor
      if (!ed) return
      if (e.shiftKey) {
        ed.hasItem(sectionGroup) ? ed.removeItem(sectionGroup) : ed.addItem(sectionGroup)
      } else {
        ed.target = sectionGroup
      }
      e.stop()
    })
  } else {
    // 增量更新：同步位置和名称
    sectionGroup.x = p.x ?? 0
    sectionGroup.y = p.y ?? 0
    sectionGroup.rotation = p.rotation ?? 0
    ;(sectionGroup as any).__sectionName = p.name
  }

  // 分区填充形状（body）作为子元素，坐标相对 Group
  const existingBody = sectionGroup.children?.find((c: any) => c.tag === 'Path' && !c.__sectionBorder)
  if (existingBody) {
    existingBody.path = p.path
    existingBody.fill = p.fill
    existingBody.stroke = p.stroke || darkenColor(p.fill, 20)
    ;(existingBody as any).__rawPath = p.path
  } else {
    const body = new Path({
      id: p.id,
      path: p.path,
      x: 0, y: 0,
      fill: p.fill,
      stroke: p.stroke || darkenColor(p.fill, 20),
      strokeWidth: p.strokeWidth ?? 1,
      strokeAlign: 'inside',
      zIndex: 0,
      editable: false,
      draggable: false,
      hittable: false,
    })
    ;(body as any).__sectionGroup = sectionGroup
    ;(body as any).__rawPath = p.path
    sectionGroup.add(body)
    allPaths.push(body)
  }

  // 选中高亮边框（作为 Group 子元素，随 Group 自动移动/旋转）
  const existingBorder = sectionGroup.children?.find((c: any) => c.tag === 'Path' && c.__sectionBorder)
  if (existingBorder) {
    existingBorder.path = p.path
    ;(existingBorder as any).__rawPath = p.path
  } else {
    const border = new Path({
      path: p.path,
      x: 0, y: 0,
      fill: 'transparent',
      stroke: '#3b82f6',
      strokeWidth: 2 / getS(),
      strokeAlign: 'center',
      zIndex: 1,
      editable: false,
      draggable: false,
      hittable: false,
      visible: false,
    })
    ;(border as any).__sectionBorder = true
    ;(border as any).__rawPath = p.path
    sectionGroup.add(border)
    ;(sectionGroup as any).__selectionBorder = border
  }

  // 分区名称文本（不可选中，显示于分区中心，响应缩放，初始隐藏防闪烁）
  const existingNameText = (sectionGroup as any).__nameText
  if (existingNameText) {
    existingNameText.text = p.name || ''
  } else {
    const nameText = new Text({
      text: p.name || '',
      x: 0, y: 0,
      fontSize: 14,
      fill: '#374151',
      fontWeight: '500',
      textAlign: 'center',
      verticalAlign: 'middle',
      editable: false,
      hittable: false,
      around: 'center',
      opacity: 0,
    })
    ;(nameText as any).__sectionNameText = true
    sectionGroup.add(nameText)
    ;(sectionGroup as any).__nameText = nameText
  }
}

function clearAllPaths() {
  allPaths.forEach(p => {
    try { leafer!.remove(p) } catch (_) {}
  })
  allPaths = []
  sectionGroupMap.forEach(g => {
    try { leafer!.remove(g) } catch (_) {}
  })
  sectionGroupMap.clear()
  edgeCache = new WeakMap<object, number[][]>()
  seatModule.clearSeatElements()
}

function deleteSelected() {
  const list: any[] = (editor as any)?.list ?? []
  if (list.length === 0) return

  // 只维护 allPaths 引用（多边形绘制碰撞检测需要），画布元素由 store 变更后的 watcher 统一移除
  list.forEach((el: any) => {
    if (el.tag === 'Path') {
      const idx = allPaths.indexOf(el)
      if (idx !== -1) allPaths.splice(idx, 1)
    } else if (el.__sectionGroup) {
      const path = el.children?.find((c: any) => c.tag === 'Path')
      if (path) {
        const idx = allPaths.indexOf(path)
        if (idx !== -1) allPaths.splice(idx, 1)
      }
    }
  })

  edgeCache = new WeakMap<object, number[][]>()

  // store 删除 → watcher 同步画布
  editorStore.deleteSelected()

  editor?.cancel()
  seatModule.updateSeatLOD()
}

function renderAll(data: VenueData): void {
  if (!leafer) return
  try {
    clearAllPaths()

    const sections = data?.sections ?? []
    let polygonCount = 0
    sections.forEach((s: any) => {
      if (s.type === 'path' && s.path) {
        createPolygonItem(s)
        polygonCount++
      }
    })

    // 从 venue data 渲染座位（sections[].rows[].seats[]）
    const raw: any = data
    const bs = raw?.baseScale
    seatModule.createSeatsFromVenueData(sections, bs != null ? parseFloat(bs) : bs, data?.categories)

    // 分区名称文本初始定位（rAF 确保 LeaferJS 布局就绪）
    requestAnimationFrame(() => updateNameTextsLOD())

    // SIMPLE 模式：自动进入默认分区聚焦，座位工具直接可用
    const venueType: string = (data as any)?.type ?? 'SIMPLE'
    if (venueType === 'SIMPLE') {
      const defaultSection = sections.find((s: any) => s.type === 'none' || !s.type || !s.path) || sections[0]
      if (defaultSection) {
        nextTick(() => enterSectionFocus(defaultSection.id))
      }
    }

    if (editor) {
      editor.cancel()
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

const polygonDraw = usePolygonDraw({
  getLeafer: () => leafer,
  getEditor: () => editor,
  getCanvas: () => canvas,
  getAllPaths: () => {
    const result: any[] = [...allPaths]
    sectionGroupMap.forEach(g => result.push(g))
    return result
  },
  getS,
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
  getLeafer: () => leafer,
  getEditor: () => editor,
  getCanvas: () => canvas,
  getS,
  setPanEnabled,
  getAllNonSeatPaths: () => {
    const result: any[] = []
    sectionGroupMap.forEach(g => result.push(g))
    return result
  },
  getSectionGroupMap: () => sectionGroupMap,
  getFocusedSectionId: () => focusedSectionId.value,
  getCurrentTool: () => currentTool.value,
  onToolChange: (tool) => { currentTool.value = tool as ToolId },
})

// ==================== 画布↔表单同步桥 ====================

const pathEditorSync = usePathEditorSync({
  getLeafer: () => leafer,
  getEditor: () => editor,
  getSectionGroupMap: () => sectionGroupMap,
  getSeatRowGroups: () => seatModule.seatRowGroups,
  getFocusedSectionId: () => focusedSectionId.value,
  rebuildSeatRow: (group, newData, endCenter, anchorFromEnd) =>
    seatModule.rebuildSeatRow(group, newData, endCenter, anchorFromEnd),
  refreshSeatLOD: () => seatModule.updateSeatLOD(),
  createSection: (section) => {
    if (section.type === 'path' && section.path) {
      createPolygonItem(section as { id: string; path: string; x: number; y: number; fill: string; stroke?: string; strokeWidth?: number; name?: string; rotation?: number })
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
  getLeafer: () => leafer,
  getEditor: () => editor,
  getAllPaths: () => {
    const result: any[] = []
    sectionGroupMap.forEach(g => result.push(g))
    return result
  },
  getS,
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
    const firstGroup = sectionGroupMap.values().next().value
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
  getLeafer: () => leafer,
  getEditor: () => editor,
  getAllPaths: () => {
    const result: any[] = []
    sectionGroupMap.forEach(g => result.push(g))
    return result
  },
  getS,
  setPanEnabled,
  getParentGroup: () => {
    const tgt = seatVertexEdit.getTarget()
    if (!tgt) return null
    // 查找座位排 Group 的父级 SectionGroup
    const sectionId = (tgt as any).__sectionId
    return sectionId ? sectionGroupMap.get(sectionId) ?? null : null
  },
  onRebuild: (group, newData, endCenter, anchorFromEnd) => seatModule.rebuildSeatRow(group, newData, endCenter, anchorFromEnd),
  onToolChange: (tool) => { currentTool.value = tool as ToolId },
})

watch(() => vertexEdit.isEditing.value || seatVertexEdit.isEditing.value, (v) => emit('vertex-edit-change', v))

// ==================== 工具调度中心 ====================

const mode = useEditorMode((tool) => { currentTool.value = tool as ToolId })

mode.register('drawPolygon', {
  enter: () => polygonDraw.enter(),
  exit: () => polygonDraw.cancel(),
  onClick: (x, y) => { polygonDraw.handleClick(x, y); return true },
  onMove: (x, y) => polygonDraw.handleMove(x, y),
  isActive: () => polygonDraw.isActive(),
})

mode.register('node', {
  exit: () => { if (vertexEdit.isEditing.value) vertexEdit.exitVertexEdit() },
})

Object.entries(seatModule.modeHandlers).forEach(([name, handler]) => mode.register(name, handler))

// ==================== 分区编辑（Section Focus） ====================

let _origOpenGroupFn: ((group: any) => void) | null = null

function enterSectionFocus(sectionId: string): void {
  const group = sectionGroupMap.get(sectionId)
  if (!group) {
    // 无 SectionGroup 的分区（如 type=none）：手动执行 setup
    const section = props.venueData?.sections?.find((s: any) => s.id === sectionId)
    if (!section || !leafer) return
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
    const currentS = getS()
    const targetScale = baseScale
    if (Math.abs(targetScale - currentS) > 0.001) {
      leafer?.scaleOfWorld({ x: cx, y: cy }, targetScale / currentS)
      setTimeout(() => { scale.value = getS(); leafer?.emit(ZoomEvent.END, { scale: getS(), totalScale: getS() } as any) }, 350)
    }
    sectionGroupMap.forEach((g, id) => {
      if (id !== sectionId) { g.opacity = 0.25; g.hittable = false; g.editable = false; g.draggable = false }
    })
    seatModule.updateSeatLOD()
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
    const box = group.getBounds?.('world')
    if (box && box.width > 0 && box.height > 0) {
      cx = box.x + box.width / 2
      cy = box.y + box.height / 2
    }
  } catch (_) {}
  const raw: any = props.venueData || {}
  const baseScale = raw.baseScale ?? seatModule.getBaseScale()
  const currentS = getS()
  const targetScale = baseScale
  if (Math.abs(targetScale - currentS) > 0.001) {
    leafer?.scaleOfWorld({ x: cx, y: cy }, targetScale / currentS)
    setTimeout(() => { scale.value = getS(); leafer?.emit(ZoomEvent.END, { scale: getS(), totalScale: getS() } as any) }, 350)
  }

  // 调用原版 openGroup（直接调用保存的引用，绕过 intercept 防止递归）
  _origOpenGroupFn?.(group)

  // openGroup 之后覆盖 hittable/editable（防止被原版重置）+ 隐藏 editBox 防止拦截点击
  sectionGroupMap.forEach((g, id) => {
    if (id !== sectionId) {
      g.opacity = 0.25; g.hittable = false; g.editable = false; g.draggable = false
    } else {
      g.hittable = true; g.editable = false; g.draggable = false; g.hitChildren = true
    }
  })
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
  seatModule.updateSeatLOD()
}

function exitSectionFocus(): void {
  if (!focusedSectionId.value) return
  focusedSectionId.value = null
  focusedSectionName.value = ''
  title.value = '座位图设计器'
  emit('section-focus-change', false)
  if (vertexEdit.isEditing.value) vertexEdit.exitVertexEdit()
  if (seatVertexEdit.isEditing.value) seatVertexEdit.exit()
  ;(editor as any)?.closeGroup?.()
}

// ==================== 视图控制 ====================

function fitContent(): void {
  const l = leafer as any
  if (l?.zoom) { l.zoom('fit', 50, undefined, true) }
  setTimeout(() => { scale.value = getS() }, 350)
}

function resetView(): void {
  const l = leafer as any
  if (l?.zoom) { l.zoom('set', 1, undefined, true) }
  if (leafer) { leafer.x = 0; leafer.y = 0 }
  ;(leafer as any)?.__updateViewPort?.()
  scale.value = 1
}

// ==================== 导出 ====================

function onExportPNG() { exportPNG(leafer) }
function onExportSVG() { exportSVG(leafer, sectionGroupMap) }

// ==================== 生命周期 ====================

onMounted(() => {
  if (!containerRef.value) return
  const w = containerRef.value.clientWidth || 800
  const h = containerRef.value.clientHeight || 800

  leafer = new Leafer({
    view: containerRef.value,
    width: w, height: h,
    pixelRatio: window.devicePixelRatio || 2,
    move: { scroll: true, disabled: false, holdSpaceKey: true, holdMiddleKey: true },
    wheel: { preventDefault: true },
    zoom: { min: 0.05, max: 20 },
  })

  editor = new Editor({
    selector: true,
    moveable: true,
    rotateable: true,
    resizeable: false,
    skewable: false, // 是否允许倾斜（skew）
    keyEvent: true,
    hover: false,
    pointSize: 6,
    strokeWidth: 1,
    stroke: '#3b82f6',
    multiSelect: true,
    area: { fill: 'rgba(59,130,246,0.1)' }
  })

  useSelectorPatch({
    getEditor: () => editor,
    getEdgeCache: () => edgeCache,
    getVertexTarget: () => vertexEdit.getTarget(),
    onSeatRowsSelected: (_groups: any[]) => {
      seatModule.updateSeatLOD()
    },
    getSectionGroupMap: () => sectionGroupMap,
    getFocusedSectionId: () => focusedSectionId.value,
  })
  leafer.add(editor as any)

  // 钩子：拦截 editor.openGroup / closeGroup
  const _origOpenGroup = editor.openGroup.bind(editor)
  _origOpenGroupFn = _origOpenGroup
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

  const _origCloseGroup = editor.closeGroup.bind(editor)
  editor.closeGroup = function () {
    // 分区聚焦期间阻止自动 close（exitSectionFocus 会先清 focusedSectionId 再调用）
    if (focusedSectionId.value) return
    try { _origCloseGroup(undefined as any) } catch (_) {}
    sectionGroupMap.forEach((group) => {
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
    ;(leafer as any)?.__updateViewPort?.()
  }

  // 拖拽/旋转时选择框跟手（Group 嵌套自动处理子元素跟随）
  let isDraggingForHistory = false
  editor.on(EditorMoveEvent.MOVE, () => {
    isDraggingForHistory = true
    ;(editor as any).editBox?.update()
    // 拖拽中不写 store，pointerup 时通过 command 提交
  })
  editor.on(EditorRotateEvent.ROTATE, () => {
    isDraggingForHistory = true
    ;(editor as any).editBox?.update()
    // 旋转中不写 store，pointerup 时通过 command 提交
  })
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
  ;(leafer as any).__onPointerUp = onPointerUp
  leafer.on(LP.MOVE, (e: any) => {
    const w = canvasToWorld(e.x, e.y)
    mode.handleMove(w.x, w.y)
  })
  leafer.on(LP.UP, () => {
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
  })

  // 框选时刷新 clientBounds
  leafer.on(LP.DOWN, () => {
    try { ;(leafer as any).canvas?.getClientBounds?.(true) } catch (_) {}
  })
  leafer.on(LP.CLICK, (e: any) => {
    const w = canvasToWorld(e.x, e.y)
    mode.handleClick(w.x, w.y)
  })

  // 双击分区 Group → 手动调用 openGroup（绕过 EditBox / border 层级拦截）
  leafer.on(LP.DOUBLE_TAP, () => {
    const list: any[] = (editor as any)?.list ?? []
    if (list.length === 1 && list[0]?.__sectionGroup === true) {
      editor?.openGroup(list[0])
    }
  })

  renderAll(props.venueData)
  // 所有 section/row 数据均来自 store，无需再将 canvas 反向同步

  // 选中变化 → 边框层管理
  editor.on(EditorEvent.SELECT, () => {
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
    sectionGroupMap.forEach((group) => {
      const border = (group as any).__selectionBorder
      if (border) border.visible = selectedGroups.has(group)
    })

    // 选中变化时刷新座位条高亮
    seatModule.updateSeatLOD()

    // 座位圆选中时隐藏 editBox，避免遮挡相邻座位
    if (list.length > 0 && list.some((el: any) => el.__seatId)) {
      ;(editor as any).editBox.visible = false
    }

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
  })

  // Ctrl+滚轮缩放
  leafer.waitViewReady(() => {
    canvas = leafer!.canvas.view as HTMLCanvasElement
    boundWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const local = leafer!.interaction?.getLocal({ clientX: e.clientX, clientY: e.clientY })
      if (!local) return
      const delta = e.deltaY > 0 ? -0.5 : 0.5
      leafer!.scaleOfWorld(local, 1 + delta * 0.5)
      leafer!.emit(ZoomEvent.END, { scale: getS(), totalScale: getS() } as any)
    }
    canvas.addEventListener('wheel', boundWheel, { passive: false })

    const onKey = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey
      const tag = (e.target as HTMLElement)?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable

      if (e.key === 'Escape') {
        if (focusedSectionId.value) {
          exitSectionFocus()
          return
        }
        if (seatVertexEdit.isEditing.value) {
          seatVertexEdit.exit()
          return
        }
        mode.cancelCurrent()
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (isTyping) return
        if (seatVertexEdit.isEditing.value) return
        deleteSelected()
      }

      if (isMod && !isTyping) {
        const key = e.key.toLowerCase()
        if (key === 'c') {
          e.preventDefault()
          editorStore.copySelected()
          return
        }
        if (key === 'v') {
          e.preventDefault()
          editorStore.paste()
          return
        }
        if (key === 'z') {
          e.preventDefault()
          if (e.shiftKey) historyStore.redo()
          else historyStore.undo()
          return
        }
        if (key === 'y') {
          e.preventDefault()
          historyStore.redo()
          return
        }
      }
    }
    document.addEventListener('keydown', onKey)
    ;(leafer as any).__onKey = onKey
  })

  leafer.on(ZoomEvent.END, () => {
    scale.value = getS()
    const s = getS()
    const handles = vertexEdit.getTarget() ? [...vertexEdit.getHandles(), ...vertexEdit.getEdgeHandles()] : undefined
    compensateZoom(editor, s, handles)
    if (seatVertexEdit.isEditing.value) seatVertexEdit.updateHandleSize()
    sectionGroupMap.forEach((group) => {
      const border = (group as any).__selectionBorder
      if (border) border.strokeWidth = 2 / s
    })
    seatModule.updateSeatLOD()
    updateNameTextsLOD()
  })

  // 启动 venueStore → 画布同步监听
  pathEditorSync.watchStoreAndApply()

  emit('ready', leafer, editor)
})

onUnmounted(() => {
  if (canvas && boundWheel) { canvas.removeEventListener('wheel', boundWheel); boundWheel = null }
  const onKey2 = (leafer as any)?.__onKey
  if (onKey2) document.removeEventListener('keydown', onKey2)
  const onPointerUp2 = (leafer as any)?.__onPointerUp
  if (onPointerUp2) document.removeEventListener('pointerup', onPointerUp2)
  leafer?.destroy()
  leafer = null
})

// ==================== Watch ====================

watch(() => props.venueData, (newVal, oldVal) => {
  if (!newVal || newVal === oldVal) return
  renderAll(newVal)
})

watch(currentTool, (tool) => {
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
  getScale: getS,
  exportJSON: onExportJSON, exportPNG: onExportPNG, exportSVG: onExportSVG,
  getLeafer: () => leafer, getEditor: () => editor,
  isVertexEditActive: () => vertexEdit.isEditing.value,
  isSeatVertexEditActive: () => seatVertexEdit.isEditing.value,
  isSectionFocusActive: () => !!focusedSectionId.value,
  focusedSectionName: () => focusedSectionName.value,
  toggleVertexEdit: () => {
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
