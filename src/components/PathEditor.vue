<template>
  <div class="pe" :class="{ 'pe--embedded': hideToolbar }">
    <div v-if="!hideToolbar" class="pe-bar">
      <span class="pe-title">{{ title }}</span>
      <button @click="fitContent">适应画布</button>
      <button @click="resetView">重置视图 (1:1)</button>
      <span class="pe-info">缩放: {{ scale.toFixed(2) }}x | 选中: {{ selectedCount }}</span>
      <button @click="exportJSON">JSON</button>
      <button @click="exportPNG">PNG</button>
      <button @click="exportSVG">SVG</button>
      <button v-if="isEditing" @click="exitVertexEdit()" class="pe-btn-exit">退出编辑 (Esc)</button>
    </div>
    <div ref="containerRef" class="pe-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Leafer, Path, Rect, Ellipse, ZoomEvent, PointerEvent as LP, DragEvent } from 'leafer-ui'
import { LeafList } from '@leafer-ui/core'
import '@leafer-in/view'
import '@leafer-in/viewport'
import '@leafer-in/editor'
import { Editor, EditorEvent, EditorMoveEvent, EditorRotateEvent, EditSelectHelper } from '@leafer-in/editor'
import { compensateZoom } from '../utils/zoomCompensation'
import type { VenueData } from '../types'

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
const isEditing = ref(false)

let leafer: Leafer | null = null
let editor: Editor | null = null
let canvas: HTMLCanvasElement | null = null
let boundWheel: ((e: WheelEvent) => void) | null = null

// 顶点编辑状态
let vertexEditTarget: any = null
let vertexHandles: any[] = []
let edgeHandles: any[] = []
let editVerts: { x: number; y: number }[] = []
let editArcDepths: number[] = []
let allPaths: any[] = []

// 多边形绘制状态
let drawPolygonPoints: { x: number; y: number }[] = []
let drawPreviewPath: any = null
let drawVertexDots: any[] = []
const DRAW_CLOSE_THRESHOLD = 15

// Path 轮廓边缓存
let edgeCache = new WeakMap<object, number[][]>()

// 边框层
let currentBorder: any = null
let currentBorderBody: any = null


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

  editor = new Editor({ selector: true, moveable: true, rotateable: true, resizeable: false, flipable: false, skewable: false, keyEvent: true, hover: false, pointSize: 6, strokeWidth: 1,stroke :'#3b82f6', multiSelect: true })

  // === selector 补丁 ===
  const sel = (editor as any).selector
  if (sel) {
    const _origAllow = sel.allow.bind(sel)
    sel.allow = (target: any) => {
      if (vertexEditTarget) {
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

    // ④ onDrag: 框选坐标空间修复
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
      const d: string = el.path
      if (!d) return false

      let edges = edgeCache.get(el)
      if (!edges) {
        const cmds = d.match(/[MLQCZA][^MLQCZA]*/gi)
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

      const w = el.__world
      if (!w) return false
      for (const e of edges) {
        const wx1 = e[0] * w.a + e[1] * w.c + w.e
        const wy1 = e[0] * w.b + e[1] * w.d + w.f
        const wx2 = e[2] * w.a + e[3] * w.c + w.e
        const wy2 = e[2] * w.b + e[3] * w.d + w.f
        if (segHitsRect(wx1, wy1, wx2, wy2, rx, ry, rw, rh)) return true
      }
      return false
    }

    sel.onDrag = function (e: any) {
      if (e.multiTouch) return
      if (this.editor.dragging) return this.onDragEnd(e)
      if (this.dragging) {
        const editor = this.editor
        // 框选期间隐藏 editBox，避免闪烁
        if (!(this as any).__boxHidden) {
          ;(editor as any).editBox.visible = false
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
        const candidates = findByBounds(editor.app, worldBounds)
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
          if (selectList.length !== editor.list.length || editor.list.some((c: any, i: number) => c !== selectList[i])) {
            editor.target = selectList as any
          }
        } else {
          editor.target = this.originList.list
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
    if (props.currentTool !== 'drawPolygon' || drawPolygonPoints.length === 0) return
    const w = canvasToWorld(e.x, e.y)
    updateDrawPreview(w.x, w.y)
  })
  leafer.on(LP.UP, () => {
    // 框选结束后恢复 editBox
    const sel = (editor as any)?.selector
    if (sel?.__boxHidden) {
      ;(editor as any).editBox.visible = true
      ;(editor as any).editBox.update()
      sel.__boxHidden = false
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
  // 多边形绘制：点击添加顶点或闭合
  leafer.on(LP.CLICK, (e: any) => {
    if (props.currentTool !== 'drawPolygon') return
    const w = canvasToWorld(e.x, e.y)
    if (drawPolygonPoints.length >= 3 && isNearFirstPoint(w.x, w.y)) {
      finishDrawPolygon()
    } else {
      addDrawPoint(w.x, w.y)
      if (drawPolygonPoints.length === 1) updateDrawPreview(w.x, w.y)
    }
  })
  // 首次渲染
  renderAll(props.venueData)

  // 选中变化 → 边框层管理
  editor.on(EditorEvent.SELECT, () => {
    const list: any[] = (editor as any)?.list ?? []
    selectedCount.value = list.length

    if (!isEditing.value) {
      if (currentBorder) {
        currentBorder.remove()
        currentBorder = null
        currentBorderBody = null
      }
    }

    // if (list.length === 1 && list[0]?.tag === 'Path') {
    //   const body = list[0]
    //   const border = new Path({
    //     id: `section-border-${body.id}`,
    //     path: body.path,
    //     x: body.x, y: body.y,
    //     rotation: body.rotation,
    //     fill: 'transparent',
    //     stroke: '#3b82f6',
    //     strokeWidth: 1 / scale.value,
    //     hitFill: 'none' as any,
    //     hitStroke: 'all' as any,
    //     editable: false,
    //     draggable: false,
    //     hittable: true,
    //     cursor: 'pointer',
    //   })
    //   leafer!.add(border)
    //   currentBorder = border
    //   currentBorderBody = body

    // }

    // 处于 node 模式时，选中分区自动进入/切换顶点编辑（enterVertexEdit 内部处理清理）
    if (props.currentTool === 'node' && list.length === 1 && list[0]?.tag === 'Path' && vertexEditTarget !== list[0]) {
      enterVertexEdit(list[0])
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
        if (drawPolygonPoints.length > 0) { cancelDrawPolygon(); return }
        if (vertexEditTarget) exitVertexEdit()
      }
    }
    document.addEventListener('keydown', onKey)
    ;(leafer as any).__onKey = onKey
  })

  leafer.on(ZoomEvent.END, () => {
    scale.value = getS()
    const s = getS()
    const handles = vertexEditTarget ? [...vertexHandles, ...edgeHandles] : undefined
    compensateZoom(editor, s, handles)
    if (currentBorder) currentBorder.strokeWidth = 1 / s
  })

  emit('ready', leafer, editor)
})

watch(() => props.venueData, (newVal) => {
  renderAll(newVal)
})

watch(() => props.currentTool, (tool) => {
  if (tool === 'node') {
    const list: any[] = (editor as any)?.list ?? []
    if (!isEditing.value && list.length === 1 && list[0]?.tag === 'Path') {
      enterVertexEdit(list[0])
    }
  } else if (isEditing.value) {
    exitVertexEdit()
  }

  if (tool === 'drawPolygon') {
    enterDrawPolygon()
  } else if (drawPolygonPoints.length > 0) {
    cancelDrawPolygon()
  }
})

// 将十六进制颜色加深
function darkenColor(hex: string, percent: number): string {
  let r = parseInt(hex.slice(1, 3), 16)
  let g = parseInt(hex.slice(3, 5), 16)
  let b = parseInt(hex.slice(5, 7), 16)
  r = Math.floor(r * (1 - percent / 100))
  g = Math.floor(g * (1 - percent / 100))
  b = Math.floor(b * (1 - percent / 100))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

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

  // setTimeout(() => fitContent(), 100)
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

  // setTimeout(() => fitContent(), 100)
}


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

// SVG 圆弧采样
function sampleArc(x1: number, y1: number, x2: number, y2: number, R: number, sweep: number, n: number): {x:number,y:number}[] {
  const chord = Math.hypot(x2 - x1, y2 - y1)
  if (chord < 0.001 || R * 2 < chord) return [{x:x1,y:y1},{x:x2,y:y2}]
  const h = chord / 2
  const d = Math.sqrt(Math.max(0, R * R - h * h))
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const nx = -(y2 - y1) / chord, ny = (x2 - x1) / chord
  const cx = mx + nx * d * (sweep ? 1 : -1)
  const cy = my + ny * d * (sweep ? 1 : -1)
  let a1 = Math.atan2(y1 - cy, x1 - cx)
  let a2 = Math.atan2(y2 - cy, x2 - cx)
  if (sweep && a2 <= a1) a2 += 2 * Math.PI
  if (!sweep && a2 >= a1) a2 -= 2 * Math.PI
  const pts = []
  for (let i = 0; i <= n; i++) {
    const a = a1 + (a2 - a1) * (i / n)
    pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) })
  }
  return pts
}

// ==================== 顶点编辑 ====================

function enterVertexEdit(pathEl: any): void {
  // 清理旧的顶点编辑状态（handle、边框等）
  vertexHandles.forEach(h => h.remove())
  edgeHandles.forEach(h => h.remove())
  vertexHandles = []
  edgeHandles = []
  editVerts = []
  editArcDepths = []
  vertexEditTarget = pathEl
  isEditing.value = true
  emit('vertex-edit-change', true)
  editor!.cancel()
  allPaths.forEach((p: any) => { p.locked = true })
  setPanEnabled(false)

  const d: string = pathEl.path
  editVerts = []
  editArcDepths = []
  let px = 0, py = 0
  const cmds = d.match(/[MLCA][^MLCAZ]*/gi)
  if (cmds) {
    for (const cmd of cmds) {
      const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter((n: any) => !isNaN(n))
      const type = cmd[0]
      if (type === 'M') {
        editVerts.push({ x: nums[0], y: nums[1] })
        px = nums[0]; py = nums[1]
      } else if (type === 'L') {
        editVerts.push({ x: nums[0], y: nums[1] })
        editArcDepths.push(0)
        px = nums[0]; py = nums[1]
      } else if (type === 'C') {
        editVerts.push({ x: nums[4], y: nums[5] })
        editArcDepths.push(0)
        px = nums[4]; py = nums[5]
      } else if (type === 'A') {
        const x2 = nums[5], y2 = nums[6]
        editVerts.push({ x: x2, y: y2 })
        const R = nums[0], sweep = nums[4]
        const chord = Math.hypot(x2 - px, y2 - py) || 1
        const half = chord / 2
        if (R >= half) {
          const sagitta = R - Math.sqrt(R * R - half * half)
          editArcDepths.push(sweep ? (2 * sagitta) / chord : -(2 * sagitta) / chord)
        } else {
          editArcDepths.push(0)
        }
        px = x2; py = y2
      }
    }
    if (editArcDepths.length < editVerts.length) {
      editArcDepths.push(0)
    }
  }
  while (editArcDepths.length < editVerts.length) editArcDepths.push(0)

  if (editVerts.length > 1) {
    const first = editVerts[0], last = editVerts[editVerts.length - 1]
    if (Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01) {
      editVerts.pop()
      if (editArcDepths.length > editVerts.length) editArcDepths.pop()
    }
  }
  editArcDepths = editArcDepths.slice(0, editVerts.length)

  createAllHandles()
}

function exitVertexEdit(silent?: boolean): void {
  const editedBody = vertexEditTarget
  vertexHandles.forEach(h => h.remove())
  edgeHandles.forEach(h => h.remove())
  vertexHandles = []
  edgeHandles = []
  editVerts = []
  editArcDepths = []
  vertexEditTarget = null
  isEditing.value = false
  allPaths.forEach((p: any) => { p.locked = false })
  setPanEnabled(true)
  if (editedBody && editor) {
    editor.target = editedBody
  }
  if (!silent) {
    emit('update:currentTool', 'select')
    emit('vertex-edit-change', false)
  }
}

function setPanEnabled(enabled: boolean): void {
  const app = (leafer as any)?.app
  if (app?.config?.move) app.config.move.disabled = !enabled
}

// ==================== 多边形绘制 ====================

function enterDrawPolygon(): void {
  allPaths.forEach((p: any) => { p.hittable = false })
  if (editor) (editor as any).hittable = false
  editor?.cancel()
  setPanEnabled(false)
  if (canvas) canvas.style.cursor = 'crosshair'
}

function exitDrawPolygon(): void {
  drawPreviewPath?.remove()
  drawPreviewPath = null
  drawVertexDots.forEach(d => d.remove())
  drawVertexDots = []
  drawPolygonPoints = []
  allPaths.forEach((p: any) => { p.hittable = true })
  if (editor) (editor as any).hittable = true
  setPanEnabled(true)
  if (canvas) canvas.style.cursor = ''
}

function isNearFirstPoint(x: number, y: number): boolean {
  if (drawPolygonPoints.length < 3) return false
  const first = drawPolygonPoints[0]
  return Math.hypot(x - first.x, y - first.y) < DRAW_CLOSE_THRESHOLD
}

function addDrawPoint(x: number, y: number): void {
  drawPolygonPoints.push({ x, y })
  const hs = Math.max(getS(), 0.02)
  const size = 6 / hs
  const dot = new Rect({
    width: size, height: size,
    fill: '#3b82f6', stroke: '#fff', strokeWidth: 1.5 / hs,
    x, y,
    around: 'center',
    draggable: false, hittable: false,
  })
  leafer!.add(dot)
  drawVertexDots.push(dot)
}

function updateDrawPreview(mx: number, my: number): void {
  drawPreviewPath?.remove()
  drawPreviewPath = null
  if (drawPolygonPoints.length === 0) return

  const pts = [...drawPolygonPoints, { x: mx, y: my }]
  let d = `M${r(pts[0].x)},${r(pts[0].y)}`
  for (let i = 1; i < pts.length; i++) {
    d += `L${r(pts[i].x)},${r(pts[i].y)}`
  }
  if (drawPolygonPoints.length > 2 && isNearFirstPoint(mx, my)) {
    d += 'Z'
  }

  const hs = Math.max(getS(), 0.02)
  drawPreviewPath = new Path({
    path: d,
    fill: 'rgba(59,130,246,0.12)',
    stroke: '#3b82f6',
    strokeWidth: 1.5 / hs,
    dashPattern: [6 / hs, 4 / hs],
    editable: false, draggable: false, hittable: false,
  })
  leafer!.add(drawPreviewPath)
}

function finishDrawPolygon(): void {
  const pts = drawPolygonPoints
  let d = `M${r(pts[0].x)},${r(pts[0].y)}`
  for (let i = 1; i < pts.length; i++) {
    d += `L${r(pts[i].x)},${r(pts[i].y)}`
  }
  d += 'Z'

  const id = `section-${Date.now()}`
  createPolygonItem({
    id,
    path: d,
    x: 0, y: 0,
    fill: 'rgba(59,130,246,0.2)',
    name: `分区 ${allPaths.length + 1}`,
  })
  exitDrawPolygon()
  emit('update:currentTool', 'select')
}

function cancelDrawPolygon(): void {
  exitDrawPolygon()
}

function toWorld(lx: number, ly: number, ox: number, oy: number, rad: number) {
  const c = Math.cos(rad), s = Math.sin(rad)
  return { x: ox + lx * c - ly * s, y: oy + lx * s + ly * c }
}
function toLocal(wx: number, wy: number, ox: number, oy: number, rad: number) {
  const c = Math.cos(rad), s = Math.sin(rad)
  const dx = wx - ox, dy = wy - oy
  return { x: dx * c + dy * s, y: -dx * s + dy * c }
}

function createAllHandles(): void {
  const el = vertexEditTarget
  if (!el) return
  const ox = el.x ?? 0, oy = el.y ?? 0
  const angle = ((el.rotation ?? 0) * Math.PI) / 180
  const n = editVerts.length
  const hs = Math.max(getS(), 0.02)
  const handleSize = 6 / hs
  const handleStroke = 1 / hs

  for (let i = 0; i < n; i++) {
    const v = editVerts[i]
    const wp = toWorld(v.x, v.y, ox, oy, angle)
    const h = new Rect({
      x: wp.x, y: wp.y,
      width: handleSize, height: handleSize,
      fill: '#3b82f6', stroke: '#fff', strokeWidth: handleStroke,
      draggable: true, cursor: 'move',
      around: 'center',
    })
    ;(h as any).__vi = i

    h.on_(DragEvent.DRAG, () => {
      editVerts[i] = toLocal(h.x!, h.y!, ox, oy, angle)
      rebuildPath()
      repositionEdgeHandles(i)
      repositionEdgeHandles((i - 1 + n) % n)
    })

    leafer!.add(h)
    vertexHandles.push(h)
  }

  for (let i = 0; i < n; i++) {
    const a = editVerts[i], b = editVerts[(i + 1) % n]
    const midW = toWorld((a.x + b.x) / 2, (a.y + b.y) / 2, ox, oy, angle)
    const h = new Ellipse({
      x: midW.x, y: midW.y,
      width: handleSize, height: handleSize,
      fill: '#22c55e', stroke: '#fff', strokeWidth: handleStroke,
      draggable: true, cursor: 'move',
      around: 'center',
    })
    ;(h as any).__ei = i

    h.on_(DragEvent.DRAG, () => {
      const lp = toLocal(h.x!, h.y!, ox, oy, angle)
      const hlx = lp.x, hly = lp.y
      const ca = editVerts[i], cb = editVerts[(i + 1) % n]
      const cmx = (ca.x + cb.x) / 2, cmy = (ca.y + cb.y) / 2
      const cdx = cb.x - ca.x, cdy = cb.y - ca.y
      const cLen = Math.hypot(cdx, cdy) || 1
      const cnx = cdy / cLen, cny = -cdx / cLen
      const proj = (hlx - cmx) * cnx + (hly - cmy) * cny
      editArcDepths[i] = Math.max(-1, Math.min(1, proj / (cLen * 0.5)))
      repositionEdgeHandles(i)
      rebuildPath()
    })

    h.on_(DragEvent.END, () => {
      const ad = editArcDepths[i]
      const ca = editVerts[i], cb = editVerts[(i + 1) % n]
      const cmx = (ca.x + cb.x) / 2, cmy = (ca.y + cb.y) / 2
      const cdx = cb.x - ca.x, cdy = cb.y - ca.y
      const cLen = Math.hypot(cdx, cdy) || 1
      const cnx = cdy / cLen, cny = -cdx / cLen
      const snapW = toWorld(cmx + cnx * ad * cLen * 0.5, cmy + cny * ad * cLen * 0.5, ox, oy, angle)
      h.x = snapW.x
      h.y = snapW.y
    })

    leafer!.add(h)
    edgeHandles.push(h)
  }

  for (let i = 0; i < n; i++) repositionEdgeHandles(i)
}

function repositionEdgeHandles(edgeIndex: number): void {
  const el = vertexEditTarget
  if (!el) return
  const ox = el.x ?? 0, oy = el.y ?? 0
  const angle = ((el.rotation ?? 0) * Math.PI) / 180
  const n = editVerts.length
  const ei = ((edgeIndex % n) + n) % n
  const h = edgeHandles[ei]
  if (!h) return
  const a = editVerts[ei], b = editVerts[(ei + 1) % n]
  const cmx = (a.x + b.x) / 2, cmy = (a.y + b.y) / 2
  const dx = b.x - a.x, dy = b.y - a.y
  const edgeLen = Math.hypot(dx, dy) || 1
  const arcDepth = editArcDepths[ei] ?? 0
  const nx = dy / edgeLen, ny = -dx / edgeLen
  const wp = toWorld(cmx + nx * arcDepth * edgeLen * 0.5, cmy + ny * arcDepth * edgeLen * 0.5, ox, oy, angle)
  h.x = wp.x
  h.y = wp.y
}

const r = (n: number) => +n.toFixed(2)

function rebuildPath(): void {
  const el = vertexEditTarget
  if (!el) return
  const verts = editVerts
  const n = verts.length
  if (n < 2) return
  let d = `M${r(verts[0].x)},${r(verts[0].y)}`
  for (let i = 0; i < n; i++) {
    const a = verts[i], b = verts[(i + 1) % n]
    const depth = editArcDepths[i] ?? 0
    if (Math.abs(depth) > 0.0001) {
      const dx = b.x - a.x, dy = b.y - a.y
      const L = Math.hypot(dx, dy) || 1
      const sagitta = L * Math.abs(depth) * 0.5
      const halfChord = L / 2
      let R = (sagitta * sagitta + halfChord * halfChord) / (2 * Math.max(sagitta, 0.001))
      R = Math.max(R, halfChord)
      const sweep = depth > 0 ? 1 : 0
      d += `A${r(R)},${r(R)} 0 0 ${sweep} ${r(b.x)},${r(b.y)}`
    } else {
      d += `L${r(b.x)},${r(b.y)}`
    }
  }
  d += 'Z'
  try { el.path = d } catch (_) { el.setAttr?.('path', d) }
  if (currentBorder) currentBorder.path = d
  edgeCache.delete(el)
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

function rotatePath(d: string, angle: number): string {
  if (!angle) return d
  const rad = angle * Math.PI / 180
  const c = Math.cos(rad), s = Math.sin(rad)
  const rot = (x: number, y: number) => [r(x * c - y * s), r(x * s + y * c)]
  const cmds = d.match(/[MLCZA][^MLCZA]*/gi)
  if (!cmds) return d
  const parts: string[] = []
  for (const cmd of cmds) {
    const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
    const type = cmd[0]
    if (type === 'M' || type === 'L') {
      const [rx, ry] = rot(nums[0], nums[1])
      parts.push(`${type}${rx},${ry}`)
    } else if (type === 'A') {
      const [rx, ry] = rot(nums[5], nums[6])
      parts.push(`A${r(nums[0])},${r(nums[1])} ${nums[2]} ${nums[3]} ${nums[4]} ${rx},${ry}`)
    } else if (type === 'C') {
      const [rx1, ry1] = rot(nums[0], nums[1])
      const [rx2, ry2] = rot(nums[2], nums[3])
      const [rx3, ry3] = rot(nums[4], nums[5])
      parts.push(`C${rx1},${ry1} ${rx2},${ry2} ${rx3},${ry3}`)
    } else if (type === 'Z') {
      parts.push('Z')
    }
  }
  return parts.join('')
}

function exportJSON(): void {
  const data = allPaths.map((p: any) => ({
    id: p.id,
    path: rotatePath(p.path, p.rotation ?? 0),
    x: r(p.x), y: r(p.y),
    fill: p.fill,
    stroke: p.stroke,
  }))
  downloadFile('polygons.json', JSON.stringify(data, null, 2))
}

function exportPNG(): void {
  const cv = leafer?.canvas?.view as HTMLCanvasElement | undefined
  if (!cv) return
  const url = cv.toDataURL('image/png')
  downloadURL(url, 'canvas.png')
}

function exportSVG(): void {
  const w = leafer?.width ?? 1000, h = leafer?.height ?? 700
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  for (const p of allPaths) {
    const d = rotatePath(p.path, p.rotation ?? 0)
    svg += `<path d="${d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="2" transform="translate(${r(p.x)},${r(p.y)})"/>`
  }
  svg += '</svg>'
  downloadFile('canvas.svg', svg)
}

function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/octet-stream' })
  downloadURL(URL.createObjectURL(blob), filename)
}

function downloadURL(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a)
}

defineExpose({ fitContent, resetView, getScale: getS, exportJSON, exportPNG, exportSVG, getLeafer: () => leafer, getEditor: () => editor,
  toggleVertexEdit: () => { isEditing.value ? exitVertexEdit() : enterVertexEdit((editor as any)?.list?.[0]) },
  isVertexEditActive: () => isEditing.value,
  exportPaths,
})

onUnmounted(() => {
  if (canvas && boundWheel) { canvas.removeEventListener('wheel', boundWheel); boundWheel = null }
  const onKey = (leafer as any)?.__onKey
  if (onKey) document.removeEventListener('keydown', onKey)
  leafer?.destroy()
  leafer = null
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
