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
import { Leafer, Path, Group, ZoomEvent, PointerEvent as LP } from 'leafer-ui'
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
const props = withDefaults(defineProps<{
  venueData?: VenueData
  seatList?: any[]
  hideToolbar?: boolean
  currentTool?: string
}>(), {
  hideToolbar: false,
  venueData: () => ({}) as VenueData,
  seatList: () => [],
  currentTool: 'select',
})
const title = ref('座位图设计器')
const focusedSectionId = ref<string | null>(null)
const focusedSectionName = ref('')
const emit = defineEmits<{
  (e: 'body-double-tap', body: any): void
  (e: 'ready', leafer: any, editor: any): void
  (e: 'update:currentTool', tool: string): void
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
let currentBorder: any = null
let currentBorderBody: any = null

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
      zIndex: 0,
    })
    ;(sectionGroup as any).__sectionGroup = true
    ;(sectionGroup as any).__sectionId = p.id
    ;(sectionGroup as any).__sectionName = p.name || p.id
    sectionGroupMap.set(p.id, sectionGroup)
    leafer!.add(sectionGroup)
  }

  // 边框 Path 作为子元素，坐标相对 Group
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
    hittable: true,
  })
  ;(body as any).__sectionGroup = sectionGroup
  sectionGroup.add(body)
  allPaths.push(body)
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

  list.forEach((el: any) => {
    // 分区 Group（SectionGroup）
    if (el.__sectionGroup) {
      const sid = el.__sectionId
      // 清理子元素引用
      el.children?.slice().forEach((child: any) => {
        try { el.remove(child) } catch (_) {}
        if (child.__seatRow) {
          const idx = seatModule.seatRowGroups.indexOf(child)
          if (idx !== -1) seatModule.seatRowGroups.splice(idx, 1)
        }
        if (child.tag === 'Path') {
          const idx = allPaths.indexOf(child)
          if (idx !== -1) allPaths.splice(idx, 1)
        }
      })
      sectionGroupMap.delete(sid)
      try { leafer!.remove(el) } catch (_) {}
    } else if (el.__seatRow) {
      const idx = seatModule.seatRowGroups.indexOf(el)
      if (idx !== -1) seatModule.seatRowGroups.splice(idx, 1)
      try { el.parent?.remove(el) } catch (_) {}
    } else if (el.tag === 'Path') {
      const idx = allPaths.indexOf(el)
      if (idx !== -1) allPaths.splice(idx, 1)
      const parentGroup = (el as any).__sectionGroup
      if (parentGroup) {
        try { parentGroup.remove(el) } catch (_) {}
      } else {
        try { leafer!.remove(el) } catch (_) {}
      }
    }
  })

  edgeCache = new WeakMap<object, number[][]>()
  editor?.cancel()
  seatModule.updateSeatLOD()
}

function renderAll(data: VenueData): void {
  console.log('[renderAll] called, sections count:', (data as any)?.sections?.length ?? 0, 'keys:', Object.keys(data || {}))
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
    console.log('[renderAll] polygons created:', polygonCount)

    // 从 venue data 渲染座位（sections[].rows[].seats[]），兼容 API 的 scale 字段
    const raw: any = data
    const bs = raw?.baseScale ?? raw?.scale
    seatModule.createSeatsFromVenueData(sections, bs != null ? parseFloat(bs) : bs, data?.categories)
    console.log('[renderAll] seats rendered, count:', seatModule.drawnSeatCount.value)

    // SIMPLE 模式：自动进入默认分区聚焦，座位工具直接可用
    const venueType: string = (data as any)?.type ?? 'SIMPLE'
    if (venueType === 'SIMPLE') {
      const defaultSection = sections.find((s: any) => s.borderType === 'none' || !s.path) || sections[0]
      if (defaultSection) {
        nextTick(() => enterSectionFocus(defaultSection.id))
      }
    }

    if (editor) {
      editor.cancel()
      ;(editor as any).zIndex = 999
    }
  } catch (e) {
    console.error('[renderAll] error:', e)
  }
}

function buildVenueData(): any {
  const raw: any = props.venueData || {}

  // 从 sectionGroupMap 构建 section 数据（x/y/rotation 从 Group 读，path 从子 Path 读）
  const pathSectionMap = new Map<string, any>()
  sectionGroupMap.forEach((group, sectionId) => {
    const pathChild = group.children?.find((c: any) => c.tag === 'Path')
    if (!pathChild) return
    const sec: any = {
      name: (group as any).__sectionName || pathChild.id,
      rows: [] as any[],
      type: 'path',
      x: +(group.x ?? 0).toFixed(2),
      y: +(group.y ?? 0).toFixed(2),
      fill: pathChild.fill,
      stroke: pathChild.stroke,
      id: sectionId,
      path: pathChild.path,
    }
    if (group.rotation) sec.rotation = +(group.rotation ?? 0).toFixed(2)
    if (group.zIndex != null) sec.zIndex = group.zIndex
    pathSectionMap.set(sectionId, sec)
  })

  // 从 seatRowGroups 构建 row→section 关系（坐标已为局部，直接使用）
  const sectionRowsMap = new Map<string, any[]>()
  const sectionRowLookup = new Map<string, Map<string, any>>()

  seatModule.seatRowGroups.forEach((g: any) => {
    const sectionId = g.__sectionId
    if (!sectionId) return

    if (!sectionRowsMap.has(sectionId)) sectionRowsMap.set(sectionId, [])
    if (!sectionRowLookup.has(sectionId)) sectionRowLookup.set(sectionId, new Map())

    const rowLookup = sectionRowLookup.get(sectionId)!
    const rowId = g.__rowId || `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const ellipses = (g.__seatEllipses || []) as any[]
    const rowData = g.__seatRowData
    const rowLabel = g.__rowLabel || ''

    const isVenueSeat = g.__isVenueDataSeat
    if (!rowLookup.has(rowId)) {
      const row: any = {
        id: rowId,
        label: rowLabel,
        x: +(isVenueSeat ? (g.__rowOriginX ?? rowData?.x ?? 0) : (rowData?.x ?? 0)).toFixed(2),
        y: +(isVenueSeat ? (g.__rowOriginY ?? rowData?.y ?? 0) : (rowData?.y ?? 0)).toFixed(2),
        rotation: +(g.__rotation ?? 0).toFixed(2),
        curve: +(g.__curve ?? 0).toFixed(2),
        seats: [],
      }
      if (g.__seatSpacing != null) row.seatSpacing = +g.__seatSpacing.toFixed(2)
      if (g.__rowSpacing != null) row.rowSpacing = +g.__rowSpacing.toFixed(2)
      if (g.__categoryId != null) row.categoryId = g.__categoryId
      rowLookup.set(rowId, row)
      sectionRowsMap.get(sectionId)!.push(row)
    }

    const row = rowLookup.get(rowId)!
    const statusMap: Record<string, number> = { available: 0, sold: 1, reserved: 2 }
    const toStatus = (s: string) => statusMap[s] ?? 0
    const typeMap: Record<string, number> = { seat: 1 }
    const toType = (s: string) => typeMap[s] ?? 1

    const pushSeat = (seat: any) => {
      seat.ven_id = raw.id || ''
      row.seats.push(seat)
    }

    if (isVenueSeat && g.__rawSeats) {
      g.__rawSeats.forEach((src: any) => {
        pushSeat({
          id: src.id,
          label: src.label || '',
          x: +(typeof src.x === 'string' ? parseFloat(src.x) : (src.x || 0)).toFixed(2),
          y: +(typeof src.y === 'string' ? parseFloat(src.y) : (src.y || 0)).toFixed(2),
          cat_id: src.cat_id ?? src.categoryKey ?? 1,
          status: toStatus(src.status || 'available'),
          type: toType(src.objectType || 'seat'),
        })
      })
    } else {
      ellipses.forEach((ell: any) => {
        const src = ell.__sourceSeat
        if (src) {
          pushSeat({
            id: ell.__seatId || src.id,
            label: src.label || '',
            x: +(src.x ?? 0).toFixed(2),
            y: +(src.y ?? 0).toFixed(2),
            cat_id: ell.__categoryKey ?? src.categoryKey,
            status: toStatus(src.status || 'available'),
            type: toType(src.objectType || 'seat'),
          })
        } else {
          pushSeat({
            id: ell.__seatId || `seat_${Date.now()}`,
            label: '',
            x: +(ell.x ?? 0).toFixed(2) - +(rowData?.x ?? 0).toFixed(2),
            y: +(ell.y ?? 0).toFixed(2) - +(rowData?.y ?? 0).toFixed(2),
            cat_id: ell.__categoryKey ?? 1,
            status: 0,
            type: 1,
          })
        }
      })
    }
  })

  // 合并：有 Group 的 section 直接输出，仅有 seats 的 section 从原始数据补齐
  const sections: any[] = []
  const seenSectionIds = new Set<string>()

  sectionGroupMap.forEach((_group, sectionId) => {
    const sec = pathSectionMap.get(sectionId)
    if (!sec) return
    if (sectionRowsMap.has(sectionId)) {
      sec.rows = sectionRowsMap.get(sectionId)!
    }
    sections.push(sec)
    seenSectionIds.add(sectionId)
  })

  // 补充只有座位没有边框的 section（从原始 venueData）
  const origSections = props.venueData?.sections ?? []
  for (const orig of origSections) {
    if (seenSectionIds.has(orig.id)) continue
    if (!sectionRowsMap.has(orig.id)) continue
    sections.push({
      name: orig.name,
      rows: sectionRowsMap.get(orig.id)!,
      type: orig.borderType || 'path',
      x: +(orig.x ?? 0).toFixed(2),
      y: +(orig.y ?? 0).toFixed(2),
      fill: orig.fill || '#dbdbdb',
      stroke: orig.stroke || '#81C784',
      id: orig.id,
    })
    seenSectionIds.add(orig.id)
  }
  return {
    venue:{
      id: raw.id,
      name: raw.name,
      type: raw.type,
      categories: raw.categories ?? [],
      scale: +(raw.scale ?? 1),
      sections
    }
  }
}

function onExportJSON() {
  const data = buildVenueData()
  downloadFile('venue-data.json', JSON.stringify(data, null, 2))
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
    createPolygonItem({
      id: data.id,
      path: data.path,
      x: 0, y: 0,
      fill: '#d1d5db',
      name: `分区 ${allPaths.length + 1}`,
    })
  },
  onToolChange: (tool) => emit('update:currentTool', tool),
})

// ==================== 座位模块 ====================

const seatModule = useSeatModule({
  getLeafer: () => leafer,
  getEditor: () => editor,
  getCanvas: () => canvas,
  getS,
  setPanEnabled,
  getAllNonSeatPaths: () => {
    const result: any[] = [...allPaths]
    sectionGroupMap.forEach(g => result.push(g))
    return result
  },
  getSectionGroupMap: () => sectionGroupMap,
  getFocusedSectionId: () => focusedSectionId.value,
  onToolChange: (tool) => emit('update:currentTool', tool),
})

// ==================== 顶点编辑 ====================

const vertexEdit = useVertexEdit({
  getLeafer: () => leafer,
  getEditor: () => editor,
  getAllPaths: () => {
    const result: any[] = [...allPaths]
    sectionGroupMap.forEach(g => result.push(g))
    return result
  },
  getS,
  setPanEnabled,
  getEdgeCache: () => edgeCache,
  getCurrentBorder: () => currentBorder,
  getParentGroup: () => {
    const tgt = vertexEdit.getTarget()
    return tgt ? (tgt as any).__sectionGroup ?? null : null
  },
  onToolChange: (tool) => emit('update:currentTool', tool),
})

// ==================== 座位排顶点编辑 ====================

const seatVertexEdit = useSeatVertexEdit({
  getLeafer: () => leafer,
  getEditor: () => editor,
  getAllPaths: () => {
    const result: any[] = [...allPaths]
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
  onToolChange: (tool) => emit('update:currentTool', tool),
})

watch(() => vertexEdit.isEditing.value || seatVertexEdit.isEditing.value, (v) => emit('vertex-edit-change', v))

// ==================== 工具调度中心 ====================

const mode = useEditorMode((tool) => emit('update:currentTool', tool))

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

function enterSectionFocus(sectionId: string): void {
  const group = sectionGroupMap.get(sectionId)
  if (group) {
    editor?.openGroup(group)
    return
  }
  // 无 SectionGroup 的分区（如 borderType=none）：手动执行 setup
  const section = props.venueData?.sections?.find((s: any) => s.id === sectionId)
  if (!section || !leafer) return
  focusedSectionId.value = sectionId
  focusedSectionName.value = section.name || sectionId
  title.value = `分区编辑 — ${focusedSectionName.value}`
  emit('section-focus-change', true, focusedSectionName.value)
  editor?.cancel()
  if (vertexEdit.isEditing.value) vertexEdit.exitVertexEdit()
  if (seatVertexEdit.isEditing.value) seatVertexEdit.exit()
  const cx = section.x ?? 0; const cy = section.y ?? 0
  const raw: any = props.venueData || {}
  const baseScale = raw.baseScale ?? (raw.scale != null ? parseFloat(raw.scale) : null)
  const currentS = getS()
  const targetScale = baseScale ?? currentS
  if (Math.abs(targetScale - currentS) > 0.001) {
    leafer.scaleOfWorld({ x: cx, y: cy }, targetScale / currentS)
    setTimeout(() => { scale.value = getS(); leafer?.emit(ZoomEvent.END, { scale: getS(), totalScale: getS() } as any) }, 350)
  }
  sectionGroupMap.forEach((g, id) => {
    if (id !== sectionId) { g.opacity = 0.25; g.hittable = false; g.editable = false; g.draggable = false }
  })
  seatModule.updateSeatLOD()
}

function exitSectionFocus(): void {
  editor?.closeGroup()
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

  editor = new Editor({ selector: true, moveable: true, rotateable: true, resizeable: false, flipable: false, skewable: false, keyEvent: true, hover: false, pointSize: 6, strokeWidth: 1, stroke: '#3b82f6', multiSelect: true })

  useSelectorPatch({
    getEditor: () => editor,
    getEdgeCache: () => edgeCache,
    getVertexTarget: () => vertexEdit.getTarget(),
    getCurrentBorder: () => currentBorder,
    getCurrentBorderBody: () => currentBorderBody,
    onSeatRowsSelected: (_groups: any[]) => {
      seatModule.updateSeatLOD()
    },
    getSectionGroupMap: () => sectionGroupMap,
  })
  leafer.add(editor as any)

  // 钩子：拦截 editor.openGroup / closeGroup，注入分区聚焦自定义行为（变淡 + 缩放 + 标题）
  const _origOpenGroup = editor.openGroup.bind(editor)
  editor.openGroup = function (group: any) {
    const sectionId = group?.__sectionId
    if (sectionId) {
      focusedSectionId.value = sectionId
      focusedSectionName.value = group.__sectionName || sectionId
      title.value = `分区编辑 — ${focusedSectionName.value}`
      emit('section-focus-change', true, focusedSectionName.value)
      const pathBody = group.children?.find((c: any) => c.tag === 'Path')
      if (pathBody) emit('body-double-tap', pathBody)
      editor?.cancel()
      if (vertexEdit.isEditing.value) vertexEdit.exitVertexEdit()
      if (seatVertexEdit.isEditing.value) seatVertexEdit.exit()

      const section = props.venueData?.sections?.find((s: any) => s.id === sectionId)
      const cx = section?.x ?? group.x ?? 0
      const cy = section?.y ?? group.y ?? 0
      const raw: any = props.venueData || {}
      const baseScale = raw.baseScale ?? (raw.scale != null ? parseFloat(raw.scale) : null)
      const currentS = getS()
      const targetScale = baseScale ?? currentS
      if (Math.abs(targetScale - currentS) > 0.001) {
        leafer.scaleOfWorld({ x: cx, y: cy }, targetScale / currentS)
        setTimeout(() => {
          scale.value = getS()
          leafer?.emit(ZoomEvent.END, { scale: getS(), totalScale: getS() } as any)
        }, 350)
      }

      sectionGroupMap.forEach((g, id) => {
        if (id !== sectionId) {
          g.opacity = 0.25; g.hittable = false; g.editable = false; g.draggable = false
        }
      })
      seatModule.updateSeatLOD()
    }
    _origOpenGroup(group)
  }

  const _origCloseGroup = editor.closeGroup.bind(editor)
  editor.closeGroup = function () {
    if (focusedSectionId.value) {
      focusedSectionId.value = null
      focusedSectionName.value = ''
      title.value = '座位图设计器'
      emit('section-focus-change', false)
      if (vertexEdit.isEditing.value) vertexEdit.exitVertexEdit()
      if (seatVertexEdit.isEditing.value) seatVertexEdit.exit()
    }
    _origCloseGroup()
    sectionGroupMap.forEach((group) => {
      group.opacity = 1; group.hittable = true; group.editable = true; group.draggable = true
    })
    seatModule.updateSeatLOD()
    ;(leafer as any)?.__updateViewPort?.()
  }

  // 拖拽/旋转时选择框跟手 + 边框同步（Group 嵌套自动处理子元素跟随）
  const syncBorder = () => {
    if (currentBorder && currentBorderBody) {
      currentBorder.x = currentBorderBody.x
      currentBorder.y = currentBorderBody.y
      currentBorder.rotation = currentBorderBody.rotation
    }
  }
  editor.on(EditorMoveEvent.MOVE, () => {
    ;(editor as any).editBox?.update()
    syncBorder()
  })
  editor.on(EditorRotateEvent.ROTATE, () => {
    ;(editor as any).editBox?.update()
    syncBorder()
  })
  leafer.on(LP.MOVE, (e: any) => {
    const w = canvasToWorld(e.x, e.y)
    mode.handleMove(w.x, w.y)
  })
  leafer.on(LP.UP, () => {
    const sel2 = (editor as any)?.selector
    if (sel2?.__boxHidden) {
      const list: any[] = (editor as any)?.list ?? []
      const allSeat = list.length > 0 && list.every((el: any) => el.__seatRow)
      const isSingleSection = list.length === 1 && list[0]?.__sectionGroup
      if (!allSeat && !isSingleSection) {
        ;(editor as any).editBox.visible = true
        ;(editor as any).editBox.update()
      }
      sel2.__boxHidden = false
    }
    // 单个分区不更新包围盒
    const list2: any[] = (editor as any)?.list ?? []
    if (!(list2.length === 1 && list2[0]?.__sectionGroup)) {
      ;(editor as any).editBox?.update()
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

  console.log('[PathEditor] mount renderAll, venueData keys:', Object.keys(props.venueData || {}))
  renderAll(props.venueData)

  // 选中变化 → 边框层管理
  editor.on(EditorEvent.SELECT, () => {
    const list: any[] = (editor as any)?.list ?? []
    selectedCount.value = list.length

    if (!vertexEdit.isEditing.value) {
      if (currentBorder) {
        currentBorder.remove()
        currentBorder = null
        currentBorderBody = null
      }
    }

    // 选中单个分区时，绘制贴合分区形状的蓝色边框
    // 兼容两种选中情况：SectionGroup（__sectionGroup===true）或内部 Path（__sectionGroup 指向父 Group）
    if (list.length === 1 && list[0]?.__sectionGroup) {
      const el = list[0]
      const isGroup = el.__sectionGroup === true
      const group = isGroup ? el : el.__sectionGroup
      const pathChild = isGroup
        ? group.children?.find((c: any) => c.tag === 'Path')
        : el
      if (pathChild && group && leafer) {
        const s = getS()
        currentBorderBody = group
        currentBorder = new Path({
          id: `section-border-${group.__sectionId}`,
          path: pathChild.path,
          x: group.x ?? 0,
          y: group.y ?? 0,
          rotation: group.rotation ?? 0,
          fill: 'transparent',
          stroke: '#3b82f6',
          strokeWidth: 2 / s,
          editable: false,
          draggable: false,
          hittable: true,
          zIndex: 998,
        })
        leafer.add(currentBorder)
      }
    }

    // 选中变化时刷新座位条高亮
    seatModule.updateSeatLOD()

    // 座位排 或 单个分区 → 隐藏包围盒
    if (list.length > 0 && (
      list.every((el: any) => el.__seatRow) ||
      (list.length === 1 && list[0]?.__sectionGroup)
    )) {
      ;(editor as any).editBox.visible = false
    }

    if (props.currentTool === 'node' && list.length === 1 && !vertexEdit.isEditing.value && !seatVertexEdit.isEditing.value) {
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
        if (seatVertexEdit.isEditing.value) return
        deleteSelected()
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
    if (currentBorder) currentBorder.strokeWidth = 1 / s
    seatModule.updateSeatLOD()
  })

  emit('ready', leafer, editor)
})

onUnmounted(() => {
  if (canvas && boundWheel) { canvas.removeEventListener('wheel', boundWheel); boundWheel = null }
  const onKey2 = (leafer as any)?.__onKey
  if (onKey2) document.removeEventListener('keydown', onKey2)
  leafer?.destroy()
  leafer = null
})

// ==================== Watch ====================

watch(() => props.venueData, (newVal) => {
  console.log('[PathEditor] watch fired, venueData keys:', Object.keys(newVal || {}), 'sections:', (newVal as any)?.sections?.length)
  renderAll(newVal)
})

watch(() => props.currentTool, (tool) => {
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
  buildVenueData,
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
