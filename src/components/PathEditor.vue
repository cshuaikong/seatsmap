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
    </div>
    <div ref="containerRef" class="pe-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Leafer, Path, ZoomEvent, PointerEvent as LP } from 'leafer-ui'
import { LeafList } from '@leafer-ui/core'
import '@leafer-in/view'
import '@leafer-in/viewport'
import '@leafer-in/editor'
import { Editor, EditorEvent, EditorMoveEvent, EditorRotateEvent, EditSelectHelper } from '@leafer-in/editor'
import { compensateZoom } from '../utils/zoomCompensation'
import type { VenueData } from '../types'
import { darkenColor, rotatePath, sampleArc } from '../utils/pathUtils'
import { usePolygonDraw } from '../composables/usePolygonDraw'
import { useVertexEdit } from '../composables/useVertexEdit'
import { exportJSON, exportPNG, exportSVG } from '../composables/usePathExport'
import { useEditorMode } from '../composables/useEditorMode'
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
const emit = defineEmits<{
  (e: 'body-double-tap', body: any): void
  (e: 'ready', leafer: any, editor: any): void
  (e: 'update:currentTool', tool: string): void
  (e: 'vertex-edit-change', active: boolean): void
}>()

const containerRef = ref<HTMLDivElement>()
const scale = ref(1)
const selectedCount = ref(0)

let leafer: Leafer | null = null
let editor: Editor | null = null
let canvas: HTMLCanvasElement | null = null
let boundWheel: ((e: WheelEvent) => void) | null = null

let allPaths: any[] = []
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

function createPolygonItem(p: { id: string; path: string; x: number; y: number; fill: string; stroke?: string; strokeWidth?: number; name?: string }) {
  const body = new Path({
    id: p.id,
    path: p.path,
    x: p.x, y: p.y,
    fill: p.fill,
    stroke: p.stroke || darkenColor(p.fill, 20),
    strokeWidth: p.strokeWidth ?? 1,
    strokeAlign: 'inside',
    zIndex: 0,
    editable: true,
    draggable: true,
    hittable: true,
  })
  leafer!.add(body)
  allPaths.push(body)

  body.on_(LP.DOUBLE_TAP, () => {
    emit('body-double-tap', body)
  })
}

function clearAllPaths() {
  allPaths.forEach(p => {
    try { leafer!.remove(p) } catch (_) {}
  })
  allPaths = []
  edgeCache = new WeakMap<object, number[][]>()
}

function renderAll(data: VenueData): void {
  clearAllPaths()

  const sections = data?.sections ?? []
  sections.forEach((s: any) => {
    if (s.type === 'path' && s.path) {
      createPolygonItem(s)
    }
  })

  if (editor) {
    editor.cancel()
    ;(editor as any).zIndex = 999
  }
}

function exportPaths(): VenueData['sections'] {
  return allPaths.map((p: any) => ({
    type: 'path',
    id: p.id,
    name: p.name || p.id,
    path: p.path,
    x: p.x,
    y: p.y,
    fill: p.fill,
    stroke: p.stroke,
    strokeWidth: p.strokeWidth,
    rotation: p.rotation ?? 0,
    rows: [],
  }))
}

// ==================== 多边形绘制 ====================

const polygonDraw = usePolygonDraw({
  getLeafer: () => leafer,
  getEditor: () => editor,
  getCanvas: () => canvas,
  getAllPaths: () => allPaths,
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

// ==================== 顶点编辑 ====================

const vertexEdit = useVertexEdit({
  getLeafer: () => leafer,
  getEditor: () => editor,
  getAllPaths: () => allPaths,
  getS,
  setPanEnabled,
  getEdgeCache: () => edgeCache,
  getCurrentBorder: () => currentBorder,
  onToolChange: (tool) => emit('update:currentTool', tool),
})

watch(() => vertexEdit.isEditing.value, (v) => emit('vertex-edit-change', v))

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

function onExportJSON() { exportJSON(allPaths) }
function onExportPNG() { exportPNG(leafer) }
function onExportSVG() { exportSVG(leafer, allPaths) }

// ==================== 生命周期 ====================

onMounted(() => {
  if (!containerRef.value) return
  const w = containerRef.value.clientWidth || 800
  const h = containerRef.value.clientHeight || 800

  leafer = new Leafer({
    view: containerRef.value,
    width: w, height: h,
    move: { scroll: true, disabled: false, holdSpaceKey: true, holdMiddleKey: true },
    wheel: { preventDefault: true },
    zoom: { min: 0.05, max: 20 },
  })

  editor = new Editor({ selector: true, moveable: true, rotateable: true, resizeable: false, flipable: false, skewable: false, keyEvent: true, hover: false, pointSize: 6, strokeWidth: 1, stroke: '#3b82f6', multiSelect: true })

  // === selector 补丁 ===
  const sel = (editor as any).selector
  if (sel) {
    const _origAllow = sel.allow.bind(sel)
    sel.allow = (target: any) => {
      if (vertexEdit.getTarget()) {
        return target?.tag === 'Rect' || target?.tag === 'Ellipse'
      }
      if (target?.id?.startsWith?.('section-border-')) return false
      if (!target) return _origAllow(target)
      let node = target
      while (node) {
        if (node === editor) return false
        node = node.parent
      }
      if (!target?.draggable && !target?.editable) return true
      return _origAllow(target)
    }

    const _origFindUI = sel.findUI.bind(sel)
    sel.findUI = function (e: any) {
      const result = _origFindUI(e)
      if (result === currentBorder && currentBorderBody) return currentBorderBody
      return result
    }

    const _origCheck = sel.checkAndSelect.bind(sel)
    sel.checkAndSelect = function (e: any) {
      const find = sel.findUI(e)
      if (find && sel.editor.hasItem(find) && sel.editor.multiple && !sel.isMultipleSelect(e)) return
      _origCheck(e)
    }

    // 框选坐标空间修复
    const { findByBounds } = EditSelectHelper
    const segHitsRect = (ax: number, ay: number, bx: number, by: number,
                         rx: number, ry: number, rw: number, rh: number): boolean => {
      const rx2 = rx + rw, ry2 = ry + rh
      if (ax >= rx && ax <= rx2 && ay >= ry && ay <= ry2) return true
      if (bx >= rx && bx <= rx2 && by >= ry && by <= ry2) return true
      let t0 = 0, t1 = 1
      const dx = bx - ax, dy = by - ay
      const p = [-dx, dx, -dy, dy]
      const q = [ax - rx, rx2 - ax, ay - ry, ry2 - ay]
      for (let i = 0; i < 4; i++) {
        if (p[i] === 0) { if (q[i] < 0) return false }
        else {
          const t = q[i] / p[i]
          if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t }
          else { if (t < t0) return false; if (t < t1) t1 = t }
        }
      }
      return t0 <= t1
    }

    const pathHitsRect = (el: any, rx: number, ry: number, rw: number, rh: number): boolean => {
      const d2: string = el.path
      if (!d2) return false

      let edges = edgeCache.get(el)
      if (!edges) {
        const cmds = d2.match(/[MLQCZA][^MLQCZA]*/gi)
        if (!cmds) return false
        edges = []
        let cx = 0, cy = 0, startX = 0, startY = 0, px = 0, py = 0
        for (const cmd of cmds) {
          const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
          const type = cmd[0]
          if (type === 'M') {
            cx = nums[0]; cy = nums[1]; startX = cx; startY = cy
            px = cx; py = cy
          } else if (type === 'L') {
            edges.push([px, py, nums[0], nums[1]])
            cx = nums[0]; cy = nums[1]; px = cx; py = cy
          } else if (type === 'C') {
            const x0 = cx, y0 = cy
            for (let s = 1; s <= 8; s++) {
              const t = s / 8, u = 1 - t
              const qx = u*u*u*x0 + 3*u*u*t*nums[0] + 3*u*t*t*nums[2] + t*t*t*nums[4]
              const qy = u*u*u*y0 + 3*u*u*t*nums[1] + 3*u*t*t*nums[3] + t*t*t*nums[5]
              edges.push([px, py, qx, qy])
              px = qx; py = qy
            }
            cx = nums[4]; cy = nums[5]
          } else if (type === 'A') {
            const pts = sampleArc(px, py, nums[5], nums[6], nums[0], nums[4], 8)
            for (let s = 1; s < pts.length; s++) {
              edges.push([pts[s-1].x, pts[s-1].y, pts[s].x, pts[s].y])
            }
            cx = nums[5]; cy = nums[6]; px = cx; py = cy
          } else if (type === 'Z') {
            edges.push([px, py, startX, startY])
            cx = startX; cy = startY; px = startX; py = startY
          }
        }
        edgeCache.set(el, edges)
      }

      const w2 = el.__world
      if (!w2) return false
      for (const e of edges) {
        const wx1 = e[0] * w2.a + e[1] * w2.c + w2.e
        const wy1 = e[0] * w2.b + e[1] * w2.d + w2.f
        const wx2 = e[2] * w2.a + e[3] * w2.c + w2.e
        const wy2 = e[2] * w2.b + e[3] * w2.d + w2.f
        if (segHitsRect(wx1, wy1, wx2, wy2, rx, ry, rw, rh)) return true
      }
      return false
    }

    sel.onDrag = function (e: any) {
      if (e.multiTouch) return
      if (this.editor.dragging) return this.onDragEnd(e)
      if (this.dragging) {
        const ed = this.editor
        if (!(this as any).__boxHidden) {
          ;(ed as any).editBox.visible = false
          ;(this as any).__boxHidden = true
        }
        const total = e.getInnerTotal(this)
        const dragBounds = this.bounds.clone().unsign()

        const worldBounds = dragBounds.clone()
        const sw = (this as any).__world
        if (sw) {
          const startWX = this.bounds.x * sw.a + this.bounds.y * sw.c + sw.e
          const startWY = this.bounds.x * sw.b + this.bounds.y * sw.d + sw.f
          worldBounds.set(
            Math.min(startWX, e.x),
            Math.min(startWY, e.y),
            Math.abs(e.x - startWX),
            Math.abs(e.y - startWY)
          )
        }
        const wr = worldBounds.get()
        const candidates = findByBounds(ed.app, worldBounds)
        const list = (candidates as any[]).filter((el: any) => {
          if (el.id?.startsWith?.('section-border-')) return false
          if (el.tag === 'Path') return pathHitsRect(el, wr.x, wr.y, wr.width, wr.height)
          return true
        })
        const leafList = new LeafList(list)

        this.bounds.width = total.x
        this.bounds.height = total.y
        this.selectArea.setBounds(dragBounds.get())

        if (leafList.length) {
          const selectList: any[] = []
          this.originList.forEach((item: any) => { if (!leafList.has(item)) selectList.push(item) })
          leafList.forEach((item: any) => { if (!this.originList.has(item)) selectList.push(item) })
          if (selectList.length !== ed.list.length || ed.list.some((c: any, i: number) => c !== selectList[i])) {
            ed.target = selectList as any
          }
        } else {
          ed.target = this.originList.list
        }
      }
    }
  }

  leafer.add(editor as any)

  // 拖拽/旋转时选择框跟手 + 边框同步 + 旋转烘焙
  const syncBorder = () => {
    if (currentBorder && currentBorderBody) {
      currentBorder.x = currentBorderBody.x
      currentBorder.y = currentBorderBody.y
      currentBorder.rotation = currentBorderBody.rotation
    }
  }
  let didRotate = false
  editor.on(EditorMoveEvent.MOVE, () => { ;(editor as any).editBox?.update(); syncBorder() })
  editor.on(EditorRotateEvent.ROTATE, () => { ;(editor as any).editBox?.update(); syncBorder(); didRotate = true })
  leafer.on(LP.MOVE, (e: any) => {
    const w = canvasToWorld(e.x, e.y)
    mode.handleMove(w.x, w.y)
  })
  leafer.on(LP.UP, () => {
    const sel2 = (editor as any)?.selector
    if (sel2?.__boxHidden) {
      ;(editor as any).editBox.visible = true
      ;(editor as any).editBox.update()
      sel2.__boxHidden = false
    }
    if (!didRotate) return
    didRotate = false
    const list: any[] = (editor as any)?.list ?? []
    list.forEach((el: any) => {
      if (el.tag !== 'Path') return
      const rot = el.rotation ?? 0
      if (!rot) return
      el.path = rotatePath(el.path, rot)
      el.rotation = 0
    })
    if (currentBorder && currentBorderBody) {
      currentBorder.path = currentBorderBody.path
      currentBorder.rotation = 0
    }
    ;(editor as any).editBox?.update()
  })

  // 框选时刷新 clientBounds
  leafer.on(LP.DOWN, () => {
    try { ;(leafer as any).canvas?.getClientBounds?.(true) } catch (_) {}
  })
  leafer.on(LP.CLICK, (e: any) => {
    const w = canvasToWorld(e.x, e.y)
    mode.handleClick(w.x, w.y)
  })

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

    if (props.currentTool === 'node' && list.length === 1 && list[0]?.tag === 'Path' && vertexEdit.getTarget() !== list[0]) {
      vertexEdit.enterVertexEdit(list[0])
      return
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
        mode.cancelCurrent()
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
    if (currentBorder) currentBorder.strokeWidth = 1 / s
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
  renderAll(newVal)
})

watch(() => props.currentTool, (tool) => {
  // node 模式特殊处理：如果已有选中 path，直接进入顶点编辑
  if (tool === 'node') {
    const list: any[] = (editor as any)?.list ?? []
    if (!vertexEdit.isEditing.value && list.length === 1 && list[0]?.tag === 'Path') {
      vertexEdit.enterVertexEdit(list[0])
      return
    }
  } else if (vertexEdit.isEditing.value) {
    vertexEdit.exitVertexEdit()
  }

  mode.switchTo(tool)
})

// ==================== Expose ====================

defineExpose({
  fitContent, resetView,
  getScale: getS,
  exportJSON: onExportJSON, exportPNG: onExportPNG, exportSVG: onExportSVG,
  getLeafer: () => leafer, getEditor: () => editor,
  toggleVertexEdit: () => {
    vertexEdit.isEditing.value ? vertexEdit.exitVertexEdit() : vertexEdit.enterVertexEdit((editor as any)?.list?.[0])
  },
  isVertexEditActive: () => vertexEdit.isEditing.value,
  exportPaths,
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
