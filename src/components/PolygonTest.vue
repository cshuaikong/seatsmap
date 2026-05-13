<template>
  <div class="poly-test">
    <div class="pt-toolbar">
      <template v-if="mode === 'draw'">
        <button class="active">绘制中 ({{ points.length }} 点)</button>
        <button class="finish-btn" :disabled="points.length < 3" @click="finishPolygon">完成绘制</button>
        <button @click="undoLast">撤销上一点</button>
        <button @click="clearAll">取消</button>
      </template>
      <template v-else>
        <button @click="startDraw">绘制多边形</button>
        <button :disabled="points.length < 3" @click="enterEdit">编辑顶点/弧度</button>
        <button @click="clearAll">清空</button>
      </template>
      <span class="sep" />
      <button @click="fitContent">适应画布</button>
      <button @click="resetView">重置视图</button>
      <span class="pt-info">
        顶点: {{ points.length }} | 弧边: {{ arcEdgeCount }} | 缩放: {{ viewScale.toFixed(2) }}
      </span>
    </div>
    <div ref="containerRef" class="pt-canvas" @dblclick.prevent="onDblClick" @keydown.enter.prevent="onEnterKey" />
    <div class="pt-hints">
      <strong>绘制:</strong> 点击画布放点 → 点<strong>"完成绘制"</strong>或<strong>双击起点</strong>闭合 |
      <strong>编辑:</strong> 拖拽<span class="dot blue"></span>顶点 | 拖拽<span class="dot green"></span>边中点加弧度 |
      滚轮缩放 | 拖拽空白平移 | Enter 完成 | Esc 取消
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Leafer, Group, Path, Ellipse, Line, ZoomEvent } from 'leafer-ui'
import '@leafer-in/view'
import { pathPointsToSvgPath } from '../viewer/geometry'
import type { PathPoint } from '../types'

const DRAG_THRESHOLD = 3
const CLOSE_RADIUS = 18 // 屏幕像素，与缩放无关

const containerRef = ref<HTMLDivElement>()
const points = ref<PathPoint[]>([])
const mode = ref<'draw' | 'edit' | 'idle'>('idle')
const viewScale = ref(1)
const arcEdgeCount = ref(0)

let leafer: Leafer | null = null
let canvas: HTMLCanvasElement | null = null

let pathEl: Path | null = null
let vertexGroup: Group | null = null
let edgeGroup: Group | null = null
// 预览层设为 hittable:false 避免拦截点击
let previewGroup: Group | null = null
let previewLine: Line | null = null
let previewDot: Ellipse | null = null
let startIndicator: Ellipse | null = null

let vertexHandles: Ellipse[] = []
let edgeHandles: Ellipse[] = []

// 平移状态
let pointerDown = false
let dragStarted = false
let downClient = { x: 0, y: 0 }
let startViewX = 0
let startViewY = 0
let boundWheel: ((e: WheelEvent) => void) | null = null
let boundPointerDown: ((e: PointerEvent) => void) | null = null
let boundPointerMove: ((e: PointerEvent) => void) | null = null
let boundPointerUp: ((e: PointerEvent) => void) | null = null
let boundKeyDown: ((e: KeyboardEvent) => void) | null = null

// ==================== 视口 ====================

function getScale(): number {
  return (leafer as any)?.scaleX ?? (leafer as any)?.__zoomLayer?.scaleX ?? 1
}

function screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
  if (!leafer || !canvas) return { x: 0, y: 0 }
  const local = leafer.interaction?.getLocal({ clientX, clientY })
  if (local) return { x: local.x, y: local.y }
  const rect = canvas.getBoundingClientRect()
  const sx = clientX - rect.left
  const sy = clientY - rect.top
  const sc = getScale()
  return { x: (sx - (leafer.x ?? 0)) / sc, y: (sy - (leafer.y ?? 0)) / sc }
}

// ==================== 渲染 ====================

function handleRadius(): number {
  return Math.max(4 / getScale(), 3)
}

function createOrUpdatePath(): void {
  if (!leafer) return
  const d = pathPointsToSvgPath(points.value)
  if (!d) {
    pathEl?.remove()
    pathEl = null
    return
  }
  if (!pathEl) {
    pathEl = new Path({
      id: 'test-polygon',
      path: d,
      fill: 'rgba(59,130,246,0.15)',
      stroke: '#3b82f6',
      strokeWidth: 2,
    })
    leafer.add(pathEl)
  } else {
    ;(pathEl as any).path = d
  }
}

function rebuildVertices(): void {
  vertexHandles.forEach(h => h.remove())
  vertexHandles = []
  const vg = vertexGroup
  if (!vg) return
  const r = handleRadius()
  points.value.forEach((pt, i) => {
    const h = new Ellipse({
      id: `v-${i}`, x: pt.x, y: pt.y,
      width: r * 2, height: r * 2,
      fill: '#3b82f6', stroke: '#fff', strokeWidth: 1.5,
      draggable: true, cursor: 'move', hitFill: 'all', zIndex: 100,
    })
    h.on('drag', () => onVertexDrag(i))
    vg.add(h)
    vertexHandles.push(h)
  })
}

function rebuildEdgeHandles(): void {
  edgeHandles.forEach(h => h.remove())
  edgeHandles = []
  const eg = edgeGroup
  if (!eg || points.value.length < 3) return
  const r = handleRadius() * 0.85
  const n = points.value.length
  for (let i = 0; i < n; i++) {
    const a = points.value[i]
    const b = points.value[(i + 1) % n]
    if (!a || !b) continue
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const h = new Ellipse({
      id: `e-${i}`, x: mx, y: my,
      width: r * 2, height: r * 2,
      fill: '#22c55e', stroke: '#fff', strokeWidth: 1.5,
      draggable: true, cursor: 'grab', hitFill: 'all', zIndex: 99,
    })
    h.on('drag', () => onEdgeDrag(i))
    eg.add(h)
    edgeHandles.push(h)
  }
}

function updateAllHandles(): void {
  rebuildVertices()
  rebuildEdgeHandles()
  countArcs()
}

function countArcs(): void {
  arcEdgeCount.value = points.value.filter(
    p => p.type === 'arc' && Math.abs(p.arcDepth ?? 0) > 0.001
  ).length
}

function updateStartIndicator(): void {
  if (!startIndicator) return
  if (mode.value === 'draw' && points.value.length >= 1) {
    const first = points.value[0]
    startIndicator.x = first.x
    startIndicator.y = first.y
    startIndicator.visible = true
  } else {
    startIndicator.visible = false
  }
}

// ==================== 顶点/边交互 ====================

function onVertexDrag(index: number): void {
  const h = vertexHandles[index]
  const pt = points.value[index]
  if (!h || !pt) return
  pt.x = h.x ?? pt.x
  pt.y = h.y ?? pt.y
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
  const nx = -dy / edgeLen
  const ny = dx / edgeLen

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
  const n = points.value.length
  for (let i = 0; i < edgeHandles.length && i < n; i++) {
    const a = points.value[i]
    const b = points.value[(i + 1) % n]
    const eh = edgeHandles[i]
    if (!a || !b || !eh) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const edgeLen = Math.hypot(dx, dy) || 1
    const nx = -dy / edgeLen
    const ny = dx / edgeLen
    const ad = a.arcDepth ?? 0
    eh.x = (a.x + b.x) / 2 + nx * ad * (edgeLen * 0.5)
    eh.y = (a.y + b.y) / 2 + ny * ad * (edgeLen * 0.5)
  }
  countArcs()
}

// ==================== 模式 ====================

function startDraw(): void {
  mode.value = 'draw'
  clearPolygon()
  if (previewLine) previewLine.visible = true
  if (previewDot) previewDot.visible = true
  updateStartIndicator()
}

function enterEdit(): void {
  if (points.value.length < 3) return
  mode.value = 'edit'
  hideDrawPreview()
  createOrUpdatePath()
  updateAllHandles()
}

function undoLast(): void {
  if (mode.value === 'draw' && points.value.length > 0) {
    points.value = points.value.slice(0, -1)
    createOrUpdatePath()
    updateStartIndicator()
  }
}

function clearPolygon(): void {
  pathEl?.remove(); pathEl = null
  vertexHandles.forEach(h => h.remove()); vertexHandles = []
  edgeHandles.forEach(h => h.remove()); edgeHandles = []
  points.value = []
  arcEdgeCount.value = 0
  if (startIndicator) startIndicator.visible = false
}

function clearAll(): void {
  mode.value = 'idle'
  clearPolygon()
  hideDrawPreview()
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
    if (mode.value === 'edit') updateAllHandles()
  }, 350)
}

function resetView(): void {
  if (!leafer) return
  const l = leafer as any
  if (l.zoom) l.zoom('set', 1, undefined, true)
  leafer.x = 0; leafer.y = 0
  ;(leafer as any).__updateViewPort?.()
  viewScale.value = 1
  if (mode.value === 'edit') updateAllHandles()
}

// ==================== 完成绘制 ====================

function finishPolygon(): void {
  if (points.value.length < 3) return
  mode.value = 'edit'
  hideDrawPreview()
  createOrUpdatePath()
  updateAllHandles()
}

// ==================== 画布点击处理 ====================

function isNearFirstPoint(pos: { x: number; y: number }): boolean {
  if (points.value.length < 3) return false
  const first = points.value[0]
  return Math.hypot(pos.x - first.x, pos.y - first.y) < CLOSE_RADIUS / getScale()
}

function handleClick(e: PointerEvent): void {
  if (mode.value !== 'draw') return
  const pos = screenToWorld(e.clientX, e.clientY)
  if (!pos) return

  // 单击起点附近 → 闭合
  if (isNearFirstPoint(pos)) {
    finishPolygon()
    return
  }

  // 添加顶点
  points.value = [...points.value, { x: pos.x, y: pos.y }]
  createOrUpdatePath()
  updateStartIndicator()
  if (previewDot) {
    previewDot.x = pos.x
    previewDot.y = pos.y
  }
}

function handleMove(e: PointerEvent): void {
  if (mode.value !== 'draw' || points.value.length === 0 || !previewLine) return
  const pos = screenToWorld(e.clientX, e.clientY)
  if (!pos) return
  const last = points.value[points.value.length - 1]
  ;(previewLine as any).points = [last.x, last.y, pos.x, pos.y]

  // 高亮起点
  if (points.value.length >= 2 && previewDot) {
    previewDot.fill = isNearFirstPoint(pos) ? '#22c55e' : '#94a3b8'
  }
}

function onDblClick(): void {
  if (mode.value === 'draw' && points.value.length >= 3) {
    finishPolygon()
  }
}

function onEnterKey(): void {
  if (mode.value === 'draw' && points.value.length >= 3) {
    finishPolygon()
  }
}

// ==================== 视口事件 ====================

function setupEvents(): void {
  if (!canvas) return
  canvas.style.touchAction = 'none'
  ;(canvas.style as any).webkitTapHighlightColor = 'transparent'

  boundWheel = (e: WheelEvent) => {
    e.preventDefault()
    const local = leafer!.interaction?.getLocal({ clientX: e.clientX, clientY: e.clientY })
    if (!local) return
    const delta = e.deltaY > 0 ? -0.5 : 0.5
    const changeScale = 1 + delta * 0.5
    leafer!.scaleOfWorld(local, changeScale)
    leafer!.emit(ZoomEvent.END, { scale: getScale(), totalScale: getScale() } as any)
  }

  boundPointerDown = (e: PointerEvent) => {
    pointerDown = true
    dragStarted = false
    downClient = { x: e.clientX, y: e.clientY }
    startViewX = leafer!.x ?? 0
    startViewY = leafer!.y ?? 0
  }

  boundPointerMove = (e: PointerEvent) => {
    handleMove(e)
    if (!pointerDown) return
    if (!dragStarted) {
      const dx = e.clientX - downClient.x
      const dy = e.clientY - downClient.y
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
      dragStarted = true
    }
    leafer!.x = startViewX + (e.clientX - downClient.x)
    leafer!.y = startViewY + (e.clientY - downClient.y)
  }

  boundPointerUp = (e: PointerEvent) => {
    if (!dragStarted) {
      handleClick(e)
    }
    pointerDown = false
    dragStarted = false
  }

  boundKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && mode.value === 'draw' && points.value.length >= 3) {
      e.preventDefault()
      finishPolygon()
    } else if (e.key === 'Escape' && mode.value === 'draw') {
      clearAll()
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
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight

  leafer = new Leafer({ view: containerRef.value, width: w, height: h })

  vertexGroup = new Group({ id: 'vertex-handles' })
  edgeGroup = new Group({ id: 'edge-handles' })
  previewGroup = new Group({ id: 'preview', hittable: false })
  leafer.add(vertexGroup)
  leafer.add(edgeGroup)
  leafer.add(previewGroup)

  // 预览线（虚线连接最后一点到鼠标）
  previewLine = new Line({
    id: 'preview-line', points: [0, 0, 0, 0],
    stroke: '#3b82f6', strokeWidth: 1.5, dashPattern: [6, 4],
    hittable: false,
  })
  previewGroup.add(previewLine)
  previewLine.visible = false

  // 最后一个顶点的位置标记
  previewDot = new Ellipse({
    id: 'preview-dot',
    x: 0, y: 0, width: 8, height: 8,
    fill: '#94a3b8', stroke: '#fff', strokeWidth: 1,
    hittable: false,
  })
  previewGroup.add(previewDot)
  previewDot.visible = false

  // 起点指示器（大圆环，提示点击此处闭合）
  startIndicator = new Ellipse({
    id: 'start-indicator',
    x: 0, y: 0,
    width: CLOSE_RADIUS * 2, height: CLOSE_RADIUS * 2,
    fill: 'rgba(34,197,94,0.12)',
    stroke: '#22c55e',
    strokeWidth: 2,
    dashPattern: [4, 4],
    hittable: false,
  })
  previewGroup.add(startIndicator)
  startIndicator.visible = false

  leafer.on(ZoomEvent.END, () => {
    viewScale.value = getScale()
    if (mode.value === 'edit') updateAllHandles()
    if (mode.value === 'draw') {
      // 更新起点指示器大小以保持屏幕像素恒定
      const r = CLOSE_RADIUS / getScale()
      if (startIndicator) {
        startIndicator.width = r * 2
        startIndicator.height = r * 2
      }
    }
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
  leafer?.destroy()
  leafer = null
})
</script>

<style scoped>
.poly-test { display: flex; flex-direction: column; height: 100vh; background: #f8fafc; }
.pt-toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; flex-wrap: wrap; }
.pt-toolbar button { padding: 5px 12px; font-size: 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; color: #374151; cursor: pointer; white-space: nowrap; }
.pt-toolbar button:hover:not(:disabled) { background: #f1f5f9; }
.pt-toolbar button.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.pt-toolbar button:disabled { opacity: 0.4; cursor: default; }
.pt-toolbar .finish-btn { background: #22c55e; color: #fff; border-color: #22c55e; font-weight: 600; }
.pt-toolbar .finish-btn:hover:not(:disabled) { background: #16a34a; }
.pt-toolbar .finish-btn:disabled { opacity: 0.4; }
.sep { width: 1px; height: 20px; background: #e2e8f0; margin: 0 4px; }
.pt-info { font-size: 11px; color: #64748b; margin-left: auto; }
.pt-canvas { flex: 1; overflow: hidden; background: #fff; }
.pt-hints { padding: 6px 16px; font-size: 11px; color: #64748b; background: #fff; border-top: 1px solid #e2e8f0; flex-shrink: 0; line-height: 1.6; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; vertical-align: middle; margin: 0 2px; }
.dot.blue { background: #3b82f6; border: 2px solid #fff; box-shadow: 0 0 0 1px #3b82f6; }
.dot.green { background: #22c55e; border: 2px solid #fff; box-shadow: 0 0 0 1px #22c55e; }
</style>
