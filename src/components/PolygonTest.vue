<template>
  <div class="poly-test">
    <div class="pt-toolbar">
      <template v-if="mode === 'draw'">
        <button class="active">绘制中 ({{ points.length }} 点)</button>
        <button class="finish-btn" :disabled="points.length < 3" @click="finishPolygon">完成绘制</button>
        <button @click="undoLast">撤销</button>
        <button @click="cancelDraw">取消</button>
      </template>
      <template v-else>
        <button @click="startDraw">绘制</button>
        <button
          v-if="points.length >= 3"
          :class="{ active: subMode === 'select' }"
          @click="enterSelect"
        >
          选择/移动
        </button>
        <button
          v-if="points.length >= 3"
          :class="{ active: subMode === 'vertex' }"
          @click="enterVertexEdit"
        >
          编辑顶点
        </button>
        <button @click="clearAll">清空</button>
      </template>
      <span class="sep" />
      <button @click="fitContent">适应画布</button>
      <button @click="resetView">重置视图</button>
      <span class="pt-info">
        <template v-if="mode === 'draw'">绘制中 ({{ points.length }}点)</template>
        <template v-if="mode === 'done'">
          {{ subMode === 'vertex' ? '顶点编辑' : '选择/移动' }} | 顶点:{{ points.length }} 弧边:{{ arcEdgeCount }}
        </template>
        | 缩放:{{ viewScale.toFixed(1) }}
      </span>
    </div>
    <div ref="containerRef" class="pt-canvas" />
    <div class="pt-hints">
      <strong>选择:</strong> 点击多边形内部 → 移动/旋转 |
      <strong>顶点:</strong> 点击多边形边框 → 进入顶点编辑 | 拖拽<span class="dot sq" />方块移动顶点 |
      拖拽<span class="dot green" />绿点加弧度 | 点击空白/Esc 退出顶点模式 | Enter 完成绘制
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Leafer,
  Group,
  Path,
  Rect,
  Ellipse,
  Line,
  ZoomEvent,
  DragEvent,
  PointerEvent as LeaferPointer,
} from 'leafer-ui'
import '@leafer-in/view'
import '@leafer-in/editor'
import { Editor } from '@leafer-in/editor'
import { pathPointsToSvgPath } from '../viewer/geometry'
import type { PathPoint } from '../types'

const DRAG_THRESHOLD = 3
const CLOSE_RADIUS = 18
const BORDER_HIT_RADIUS = 10

const containerRef = ref<HTMLDivElement>()
const points = ref<PathPoint[]>([])
const mode = ref<'draw' | 'done' | 'idle'>('idle')
const subMode = ref<'select' | 'vertex'>('select')
const viewScale = ref(1)
const arcEdgeCount = ref(0)

let leafer: Leafer | null = null
let editor: Editor | null = null
let canvas: HTMLCanvasElement | null = null

let pathEl: Path | null = null
let vertexGroup: Group | null = null
let edgeGroup: Group | null = null
let previewGroup: Group | null = null
let previewLine: Line | null = null
let previewDot: Ellipse | null = null
let startIndicator: Ellipse | null = null

let vertexHandles: Rect[] = []
let edgeHandles: Ellipse[] = []

// viewport gesture state
let pointerDown = false
let dragStarted = false
let downClient = { x: 0, y: 0 }
let startViewX = 0
let startViewY = 0
let vertexDragging = false
// Leafer TAP 事件解绑
let offTap: (() => void) | null = null

let boundWheel: ((e: WheelEvent) => void) | null = null
let boundPointerDown: ((e: PointerEvent) => void) | null = null
let boundPointerMove: ((e: PointerEvent) => void) | null = null
let boundPointerUp: ((e: PointerEvent) => void) | null = null
let boundKeyDown: ((e: KeyboardEvent) => void) | null = null

// ==================== 工具函数 ====================

function getScale(): number {
  return (leafer as any)?.scaleX ?? (leafer as any)?.__zoomLayer?.scaleX ?? 1
}

function handleRadius(): number {
  return Math.max(4 / getScale(), 3)
}

/** pathEl 存在时获取 world-space 顶点（含元素自身 x/y/rotation 偏移） */
function getWorldPoints(): PathPoint[] {
  if (!pathEl) return points.value
  const ox = pathEl.x ?? 0
  const oy = pathEl.y ?? 0
  const rot = pathEl.rotation ?? 0
  if (ox === 0 && oy === 0 && rot === 0) return points.value
  const rad = (rot * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return points.value.map((p) => ({
    ...p,
    x: p.x * cos - p.y * sin + ox,
    y: p.x * sin + p.y * cos + oy,
  }))
}

function distToSegment(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function isNearBorder(worldPos: { x: number; y: number }): boolean {
  const wpts = getWorldPoints()
  if (wpts.length < 3) return false
  const threshold = BORDER_HIT_RADIUS / getScale()
  const n = wpts.length
  for (let i = 0; i < n; i++) {
    const a = wpts[i]
    const b = wpts[(i + 1) % n]
    if (!a || !b) continue
    if (distToSegment(worldPos.x, worldPos.y, a.x, a.y, b.x, b.y) < threshold) return true
  }
  return false
}

function isInsidePolygon(worldPos: { x: number; y: number }): boolean {
  const wpts = getWorldPoints()
  if (wpts.length < 3) return false
  let inside = false
  const n = wpts.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = wpts[i]?.x ?? 0
    const yi = wpts[i]?.y ?? 0
    const xj = wpts[j]?.x ?? 0
    const yj = wpts[j]?.y ?? 0
    if (yi > worldPos.y !== yj > worldPos.y
        && worldPos.x < ((xj - xi) * (worldPos.y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// ==================== 渲染 ====================

function createOrUpdatePath(): void {
  if (!leafer) return
  const d = pathPointsToSvgPath(points.value)
  if (!d) {
    pathEl?.remove()
    pathEl = null
    return
  }
  if (pathEl) {
    pathEl.path = d as any
  } else {
    pathEl = new Path({
      id: 'test-polygon',
      path: d,
      x: 0, y: 0, rotation: 0,
      fill: 'rgba(59,130,246,0.15)',
      stroke: '#3b82f6',
      strokeWidth: 2,
      cursor: 'move',
      hittable: true,
    })
    pathEl.on(LeaferPointer.DOUBLE_CLICK, () => {
      if (mode.value === 'done') enterVertexEdit()
    })
    leafer.add(pathEl)
  }
}

function buildVertexHandles(): void {
  vertexHandles.forEach((h) => h.remove())
  vertexHandles = []
  const vg = vertexGroup
  if (!vg) return
  const size = handleRadius() * 2
  const wpts = getWorldPoints()
  wpts.forEach((pt, i) => {
    const h = new Rect({
      id: `v-${i}`,
      x: pt.x - size / 2,
      y: pt.y - size / 2,
      width: size,
      height: size,
      fill: '#3b82f6',
      stroke: '#fff',
      strokeWidth: 1.5,
      draggable: true,
      cursor: 'crosshair',
      hitFill: 'all',
      zIndex: 100,
    })
    h.on(DragEvent.START, () => { vertexDragging = true })
    h.on('drag', () => onVertexDrag(i))
    h.on(DragEvent.END, () => { vertexDragging = false })
    vg.add(h)
    vertexHandles.push(h)
  })
}

function buildEdgeHandles(): void {
  edgeHandles.forEach((h) => h.remove())
  edgeHandles = []
  const eg = edgeGroup
  if (!eg || points.value.length < 3) return
  const r = handleRadius() * 0.85
  const wpts = getWorldPoints()
  const n = wpts.length
  for (let i = 0; i < n; i++) {
    const a = wpts[i]
    const b = wpts[(i + 1) % n]
    if (!a || !b) continue
    const dx2 = b.x - a.x
    const dy2 = b.y - a.y
    const edgeLen = Math.hypot(dx2, dy2) || 1
    const nx2 = dy2 / edgeLen
    const ny2 = -dx2 / edgeLen
    const ad = a.arcDepth ?? 0
    const hx = (a.x + b.x) / 2 + nx2 * ad * (edgeLen * 0.5)
    const hy = (a.y + b.y) / 2 + ny2 * ad * (edgeLen * 0.5)
    const h = new Ellipse({
      id: `e-${i}`,
      x: hx, y: hy,
      width: r * 2, height: r * 2,
      around: 'center',
      fill: '#22c55e',
      stroke: '#fff',
      strokeWidth: 1.5,
      draggable: true,
      cursor: 'grab',
      hitFill: 'all',
      zIndex: 99,
    })
    h.on(DragEvent.START, () => { vertexDragging = true })
    h.on('drag', () => onEdgeDrag(i))
    h.on(DragEvent.END, () => { vertexDragging = false })
    eg.add(h)
    edgeHandles.push(h)
  }
}

function refreshAllHandles(): void {
  buildVertexHandles()
  buildEdgeHandles()
  countArcs()
}

function countArcs(): void {
  arcEdgeCount.value = points.value.filter(
    (p) => p.type === 'arc' && Math.abs(p.arcDepth ?? 0) > 0.001,
  ).length
}

function syncStartIndicator(): void {
  if (!startIndicator) return
  if (mode.value === 'draw' && points.value.length >= 1) {
    const first = points.value[0]
    const r = CLOSE_RADIUS / getScale()
    startIndicator.set({ x: first.x, y: first.y, width: r * 2, height: r * 2 })
    startIndicator.visible = true
  } else {
    startIndicator.visible = false
  }
}

// ==================== 顶点/边拖拽 ====================

function onVertexDrag(index: number): void {
  const h = vertexHandles[index]
  const pt = points.value[index]
  if (!h || !pt) return
  const hw = (h.width ?? 0) / 2
  pt.x = (h.x ?? pt.x) + hw
  pt.y = (h.y ?? pt.y) + hw
  syncPathAndEdges()
}

function onEdgeDrag(edgeIndex: number): void {
  const h = edgeHandles[edgeIndex]
  if (!h) return
  const n = points.value.length
  const a = points.value[edgeIndex]
  const b = points.value[(edgeIndex + 1) % n]
  if (!a || !b) return

  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const hx = h.x ?? mx
  const hy = h.y ?? my

  const dx = b.x - a.x
  const dy = b.y - a.y
  const edgeLen = Math.hypot(dx, dy) || 1
  const nx = dy / edgeLen
  const ny = -dx / edgeLen

  const proj = (hx - mx) * nx + (hy - my) * ny
  const arcDepth = Math.max(-1, Math.min(1, proj / (edgeLen * 0.5)))

  a.type = Math.abs(arcDepth) > 0.005 ? 'arc' : 'line'
  a.arcDepth = arcDepth

  h.x = mx + nx * arcDepth * (edgeLen * 0.5)
  h.y = my + ny * arcDepth * (edgeLen * 0.5)

  syncPathAndEdges()
}

function syncPathAndEdges(): void {
  createOrUpdatePath()
  const size = handleRadius() * 2
  const wpts = getWorldPoints()
  const n = points.value.length
  for (let i = 0; i < vertexHandles.length && i < n; i++) {
    const h = vertexHandles[i]
    const pt = wpts[i]
    if (h && pt) {
      h.set({ x: pt.x - size / 2, y: pt.y - size / 2, width: size, height: size })
    }
  }
  for (let i = 0; i < edgeHandles.length && i < n; i++) {
    const a = wpts[i]
    const b = wpts[(i + 1) % n]
    const eh = edgeHandles[i]
    if (!a || !b || !eh) continue
    const dx2 = b.x - a.x
    const dy2 = b.y - a.y
    const edgeLen = Math.hypot(dx2, dy2) || 1
    const nx2 = dy2 / edgeLen
    const ny2 = -dx2 / edgeLen
    const ad = a.arcDepth ?? 0
    eh.set({
      x: (a.x + b.x) / 2 + nx2 * ad * (edgeLen * 0.5),
      y: (a.y + b.y) / 2 + ny2 * ad * (edgeLen * 0.5),
    })
  }
  countArcs()
}

/** 将 pathEl 的 transform (x/y/rotation) 烘焙到 points.value 中并重置元素变换 */
function bakeTransformToPoints(): void {
  if (!pathEl) return
  const ox = pathEl.x ?? 0
  const oy = pathEl.y ?? 0
  const rot = pathEl.rotation ?? 0
  if (ox === 0 && oy === 0 && rot === 0) return
  const rad = (rot * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  points.value = points.value.map((p) => ({
    ...p,
    x: p.x * cos - p.y * sin + ox,
    y: p.x * sin + p.y * cos + oy,
  }))
  pathEl.x = 0
  pathEl.y = 0
  pathEl.rotation = 0
}

// ==================== 模式切换 ====================

function startDraw(): void {
  mode.value = 'draw'
  editor?.cancel()
  hideVertices()
  clearPolygon()
  if (previewLine) previewLine.visible = true
  if (previewDot) previewDot.visible = true
  syncStartIndicator()
}

function enterSelect(): void {
  if (points.value.length < 3) return
  bakeTransformToPoints()
  createOrUpdatePath()
  mode.value = 'done'
  subMode.value = 'select'
  hideVertices()
  hideDrawPreview()
  if (pathEl) {
    pathEl.hittable = true
    pathEl.editable = true
    const el = pathEl
    setTimeout(() => editor?.select(el), 0)
  }
}

function enterVertexEdit(): void {
  if (points.value.length < 3) return
  bakeTransformToPoints()
  createOrUpdatePath()
  mode.value = 'done'
  subMode.value = 'vertex'
  editor?.cancel()
  if (pathEl) {
    pathEl.editable = false
    pathEl.hittable = false
  }
  refreshAllHandles()
}

function undoLast(): void {
  if (mode.value === 'draw' && points.value.length > 0) {
    points.value = points.value.slice(0, -1)
    createOrUpdatePath()
    syncStartIndicator()
  }
}

function cancelDraw(): void {
  clearAll()
}

function clearPolygon(): void {
  pathEl?.remove()
  pathEl = null
  vertexHandles.forEach((h) => h.remove())
  vertexHandles = []
  edgeHandles.forEach((h) => h.remove())
  edgeHandles = []
  points.value = []
  arcEdgeCount.value = 0
  if (startIndicator) startIndicator.visible = false
}

function clearAll(): void {
  mode.value = 'idle'
  subMode.value = 'select'
  editor?.cancel()
  clearPolygon()
  hideDrawPreview()
}

function hideVertices(): void {
  vertexHandles.forEach((h) => h.remove())
  vertexHandles = []
  edgeHandles.forEach((h) => h.remove())
  edgeHandles = []
}

function hideDrawPreview(): void {
  if (previewLine) previewLine.visible = false
  if (previewDot) previewDot.visible = false
  if (startIndicator) startIndicator.visible = false
}

function fitContent(): void {
  if (!leafer) return
  const l = leafer as any
  if (l.zoom) l.zoom('fit', 50, undefined, true)
  setTimeout(() => {
    viewScale.value = getScale()
    if (subMode.value === 'vertex') refreshAllHandles()
  }, 350)
}

function resetView(): void {
  if (!leafer) return
  const l = leafer as any
  if (l.zoom) l.zoom('set', 1, undefined, true)
  leafer.x = 0
  leafer.y = 0
  ;(leafer as any).__updateViewPort?.()
  viewScale.value = 1
  if (subMode.value === 'vertex') refreshAllHandles()
}

function finishPolygon(): void {
  if (points.value.length < 3) return
  mode.value = 'done'
  hideDrawPreview()
  createOrUpdatePath()
  enterSelect()
}

// ==================== 核心交互：通过 Leafer TAP 事件 ====================

/** 绘制模式：判断是否靠近起点 */
function isNearFirstPoint(wx: number, wy: number): boolean {
  if (points.value.length < 3) return false
  const first = points.value[0]
  return Math.hypot(wx - first.x, wy - first.y) < CLOSE_RADIUS / getScale()
}

/**
 * 主要点击处理：使用 LeaferJS 内置 TAP 事件
 * 好处：e.x / e.y 直接是正确 world 坐标，无需手动 screenToWorld
 */
function onLeaferTap(e: any): void {
  const wx = e.x ?? 0
  const wy = e.y ?? 0

  // ---- 绘制模式 ----
  if (mode.value === 'draw') {
    if (isNearFirstPoint(wx, wy)) {
      finishPolygon()
      return
    }
    points.value = [...points.value, { x: wx, y: wy }]
    createOrUpdatePath()
    syncStartIndicator()
    if (previewDot) {
      previewDot.x = wx
      previewDot.y = wy
    }
    return
  }

  // ---- 结束态：无多边形则忽略 ----
  if (points.value.length < 3) return

  const pos = { x: wx, y: wy }

  // ---- 顶点编辑模式：点击空白退出 ----
  if (subMode.value === 'vertex') {
    if (!isInsidePolygon(pos) && !isNearBorder(pos)) {
      enterSelect()
    }
    return
  }

  // ---- 选择模式：点击边框 → 顶点编辑 ----
  if (subMode.value === 'select') {
    if (isNearBorder(pos)) {
      enterVertexEdit()
    }
    // 否则让 Editor 处理（点击内部 → 选中/移动/旋转）
  }
}

// ==================== 预览线跟随鼠标 ====================

function onLeaferPointerMove(e: any): void {
  if (mode.value === 'draw' && points.value.length > 0 && previewLine) {
    const wx = e.x ?? 0
    const wy = e.y ?? 0
    const last = points.value[points.value.length - 1]
    ;(previewLine as any).points = [last.x, last.y, wx, wy]
    if (points.value.length >= 2 && previewDot) {
      previewDot.fill = isNearFirstPoint(wx, wy) ? '#22c55e' : '#94a3b8'
    }
  }
}

// ==================== DOM 事件（仅用于 viewport 手势） ====================

function setupEvents(): void {
  if (!canvas) return
  canvas.style.touchAction = 'none'
  ;(canvas.style as any).webkitTapHighlightColor = 'transparent'

  // LeaferJS 内置 TAP 事件 — world 坐标自动正确
  offTap = leafer!.on_(LeaferPointer.TAP, onLeaferTap) as unknown as (() => void)

  // 预览线跟随
  leafer!.on_(LeaferPointer.MOVE, onLeaferPointerMove)

  // 滚轮缩放
  boundWheel = (e: WheelEvent) => {
    e.preventDefault()
    const local = leafer!.interaction?.getLocal({ clientX: e.clientX, clientY: e.clientY })
    if (!local) return
    const delta = e.deltaY > 0 ? -0.5 : 0.5
    leafer!.scaleOfWorld(local, 1 + delta * 0.5)
    leafer!.emit(ZoomEvent.END, { scale: getScale(), totalScale: getScale() } as any)
  }

  // 单指拖拽平移
  boundPointerDown = (e: PointerEvent) => {
    // Editor 正在拖拽时跳过，防止 viewport 位移叠加到元素位移上
    if (editor?.dragging) return
    pointerDown = true
    dragStarted = false
    downClient = { x: e.clientX, y: e.clientY }
    startViewX = leafer!.x ?? 0
    startViewY = leafer!.y ?? 0
  }

  boundPointerMove = (e: PointerEvent) => {
    // Editor 拖拽或顶点拖拽时跳过，防止 viewport 平移叠加
    if (!pointerDown || editor?.dragging || vertexDragging) return
    if (!dragStarted) {
      const dx = e.clientX - downClient.x
      const dy = e.clientY - downClient.y
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
      dragStarted = true
    }
    leafer!.x = startViewX + (e.clientX - downClient.x)
    leafer!.y = startViewY + (e.clientY - downClient.y)
  }

  boundPointerUp = () => {
    pointerDown = false
    dragStarted = false
  }

  boundKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && mode.value === 'draw' && points.value.length >= 3) {
      e.preventDefault()
      finishPolygon()
    } else if (e.key === 'Escape') {
      if (mode.value === 'draw') cancelDraw()
      else if (subMode.value === 'vertex') enterSelect()
    }
  }

  canvas.addEventListener('wheel', boundWheel, { passive: false })
  canvas.addEventListener('pointerdown', boundPointerDown)
  window.addEventListener('pointermove', boundPointerMove)
  window.addEventListener('pointerup', boundPointerUp)
  window.addEventListener('keydown', boundKeyDown)
}

// ==================== 生命周期 ====================

onMounted(() => {
  if (!containerRef.value) return
  const w = containerRef.value.clientWidth || 800
  const h = containerRef.value.clientHeight || 600

  leafer = new Leafer({ view: containerRef.value, width: w, height: h })

  editor = new Editor({
    stroke: '#836DFF',
    strokeWidth: 2,
    pointSize: 8,
    moveable: true,
    resizeable: true,
    rotateable: true,
    selector: true,
    editBox: true,
    hover: false,
    select: 'press',
    keyEvent: true,
    rotationSnap: 15,
  })
  leafer.add(editor as any)

  vertexGroup = new Group({ id: 'vertex-handles' })
  edgeGroup = new Group({ id: 'edge-handles' })
  previewGroup = new Group({ id: 'preview', hittable: false })
  leafer.add(vertexGroup)
  leafer.add(edgeGroup)
  leafer.add(previewGroup)

  previewLine = new Line({
    id: 'preview-line', points: [0, 0, 0, 0],
    stroke: '#3b82f6', strokeWidth: 1.5, dashPattern: [6, 4],
    hittable: false,
  })
  previewGroup.add(previewLine)
  previewLine.visible = false

  previewDot = new Ellipse({
    id: 'preview-dot', x: 0, y: 0, width: 8, height: 8,
    fill: '#94a3b8', stroke: '#fff', strokeWidth: 1, hittable: false,
  })
  previewGroup.add(previewDot)
  previewDot.visible = false

  startIndicator = new Ellipse({
    id: 'start-indicator', x: 0, y: 0,
    width: CLOSE_RADIUS * 2, height: CLOSE_RADIUS * 2,
    fill: 'rgba(34,197,94,0.12)', stroke: '#22c55e', strokeWidth: 2,
    dashPattern: [4, 4], hittable: false, visible: false,
  })
  previewGroup.add(startIndicator)

  leafer.on(ZoomEvent.END, () => {
    viewScale.value = getScale()
    if (subMode.value === 'vertex') refreshAllHandles()
    if (mode.value === 'draw') syncStartIndicator()
  })

  leafer.waitViewReady(() => {
    canvas = leafer!.canvas.view as HTMLCanvasElement
    setupEvents()
  })
})

onUnmounted(() => {
  if (canvas) {
    if (boundWheel) { canvas.removeEventListener('wheel', boundWheel); boundWheel = null }
    if (boundPointerDown) { canvas.removeEventListener('pointerdown', boundPointerDown); boundPointerDown = null }
    window.removeEventListener('pointermove', boundPointerMove!); boundPointerMove = null
    window.removeEventListener('pointerup', boundPointerUp!); boundPointerUp = null
    canvas = null
  }
  if (boundKeyDown) { window.removeEventListener('keydown', boundKeyDown); boundKeyDown = null }
  if (offTap) { offTap(); offTap = null }
  leafer?.destroy()
  leafer = null
})
</script>

<style scoped>
.poly-test { display: flex; flex-direction: column; height: 100vh; background: #f8fafc; }
.pt-toolbar {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px;
  background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; flex-wrap: wrap;
}
.pt-toolbar button {
  padding: 5px 12px; font-size: 12px; border: 1px solid #d1d5db;
  border-radius: 6px; background: #fff; color: #374151; cursor: pointer; white-space: nowrap;
}
.pt-toolbar button:hover:not(:disabled) { background: #f1f5f9; }
.pt-toolbar button.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.pt-toolbar button:disabled { opacity: 0.4; cursor: default; }
.pt-toolbar .finish-btn { background: #22c55e; color: #fff; border-color: #22c55e; font-weight: 600; }
.pt-toolbar .finish-btn:hover:not(:disabled) { background: #16a34a; }
.pt-toolbar .finish-btn:disabled { opacity: 0.4; }
.sep { width: 1px; height: 20px; background: #e2e8f0; margin: 0 4px; }
.pt-info { font-size: 11px; color: #64748b; margin-left: auto; }
.pt-canvas { flex: 1; overflow: hidden; background: #fff; }
.pt-hints {
  padding: 6px 16px; font-size: 11px; color: #64748b; background: #fff;
  border-top: 1px solid #e2e8f0; flex-shrink: 0; line-height: 1.6;
}
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; vertical-align: middle; margin: 0 2px; }
.dot.sq { border-radius: 2px; background: #3b82f6; border: 2px solid #fff; box-shadow: 0 0 0 1px #3b82f6; }
.dot.green { background: #22c55e; border: 2px solid #fff; box-shadow: 0 0 0 1px #22c55e; }
</style>