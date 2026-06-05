<template>
  <div class="pst">
    <div class="pst-bar">
      <span class="pst-title">Path 多边形框选测试</span>
      <button @click="fitContent">适应画布</button>
      <button @click="resetView">重置视图 (1:1)</button>
      <span class="pst-info">缩放: {{ scale.toFixed(2) }}x | 选中: {{ selectedCount }}</span>
      <button @click="exportJSON">JSON</button>
      <button @click="exportPNG">PNG</button>
      <button @click="exportSVG">SVG</button>
      <button v-if="isEditing" @click="exitVertexEdit" class="pst-btn-exit">退出编辑 (Esc)</button>
    </div>
    <div ref="containerRef" class="pst-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Leafer, Path, Rect, Ellipse, ZoomEvent, PointerEvent as LP, DragEvent } from 'leafer-ui'
import { LeafList } from '@leafer-ui/core'
import '@leafer-in/view'
import '@leafer-in/viewport'
import '@leafer-in/editor'
import { Editor, EditorEvent, EditorMoveEvent, EditorRotateEvent, EditSelectHelper } from '@leafer-in/editor'
import { compensateZoom } from '../utils/zoomCompensation'

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

// Path 轮廓边缓存 — 用于框选命中检测，rebuildPath 后清除
const edgeCache = new WeakMap<object, number[][]>()

// 边框层：仅单选分区时动态创建，拦截边线双击进入顶点编辑
// 多选或无选中时移除，避免拦截未选中分区的正常点击
let currentBorder: any = null
let currentBorderBody: any = null

// 预设几个不规则多边形
const polygons: { id: string; path: string; x: number; y: number; fill: string }[] = [
  {
    id: 'star',
    path: 'M0,-60 L14,-18 L58,-18 L22,10 L36,54 L0,28 L-36,54 L-22,10 L-58,-18 L-14,-18 Z',
    x: 300, y: 300, fill: 'rgba(239,68,68,0.2)',
  },
  {
    id: 'hexagon',
    path: 'M50,0 L25,43 L-25,43 L-50,0 L-25,-43 L25,-43 Z',
    x: 650, y: 260, fill: 'rgba(59,130,246,0.2)',
  },
  {
    id: 'arrow',
    path: 'M0,-50 L40,0 L20,0 L20,50 L-20,50 L-20,0 L-40,0 Z',
    x: 500, y: 500, fill: 'rgba(34,197,94,0.2)',
  },
  {
    id: 'blob',
    path: 'M0,-40 C30,-50 60,-20 55,10 C50,40 25,55 -10,45 C-45,35 -55,0 -45,-25 C-35,-50 -15,-45 0,-40 Z',
    x: 200, y: 500, fill: 'rgba(168,85,247,0.2)',
  },
  {
    id: 'diamond',
    path: 'M0,-60 L35,0 L0,60 L-35,0 Z',
    x: 750, y: 480, fill: 'rgba(251,146,60,0.2)',
  },
  {
    id: 'trapezoid',
    path: 'M-40,-35 L40,-35 L25,35 L-25,35 Z',
    x: 450, y: 120, fill: 'rgba(236,72,153,0.2)',
  },
]

onMounted(() => {
  if (!containerRef.value) return
  const w = containerRef.value.clientWidth || 1000
  const h = containerRef.value.clientHeight || 700

  leafer = new Leafer({
    view: containerRef.value,
    width: w, height: h,
    move: { scroll: true, disabled: false, holdSpaceKey: true, holdMiddleKey: true },
    wheel: { preventDefault: true },
    zoom: { min: 0.05, max: 20 },
  })

  // Editor
  editor = new Editor({ selector: true, moveable: true, rotateable: true, resizeable: false, flipable: false, skewable: false, keyEvent: true, hover: false, pointSize: 6, strokeWidth: 1 })

  // === selector 补丁（必须在 leafer.add(editor) 之前） ===
  const sel = (editor as any).selector
  if (sel) {
    // ① allow: Editor 的守门人 — 点击选中、框选、拖拽都先过这里。
    // 顶点编辑模式下只放行手柄，阻止对分区本体的所有交互。
    const _origAllow = sel.allow.bind(sel)
    sel.allow = (target: any) => {
      // vertexEditTarget 非空 = 正在顶点编辑，短路：只认手柄
      if (vertexEditTarget) {
        return target?.tag === 'Rect' || target?.tag === 'Ellipse'
      }
      // 边框层永远不参与 Editor 选中（独立响应双击）
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

    // ② findUI: 边框层 → body 重定向，使 Editor 所有操作（选中/拖拽/多选）
    // 均作用在 body 上，无需区分点击来源。
    const _origFindUI = sel.findUI.bind(sel)
    sel.findUI = function (e: any) {
      const result = _origFindUI(e)
      if (result === currentBorder && currentBorderBody) return currentBorderBody
      return result
    }

    // ③ checkAndSelect: 多选拖拽不替换为单选
    const _origCheck = sel.checkAndSelect.bind(sel)
    sel.checkAndSelect = function (e: any) {
      const find = sel.findUI(e)
      if (find && sel.editor.hasItem(find) && sel.editor.multiple && !sel.isMultipleSelect(e)) return
      _origCheck(e)
    }

    // ④ onDrag: 修复缩放后框选坐标空间不匹配
    const { findByBounds } = EditSelectHelper
    // 线段与矩形是否相交（Liang-Barsky）
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
        const total = e.getInnerTotal(this)
        const dragBounds = this.bounds.clone().unsign()

        // 世界空间边界 = 起点(local→world) + 当前指针(e.x/e.y 世界坐标)
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
        // Path 元素：精确路径碰撞 → 非 Path：保留默认 AABB
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

  // === 拖拽/旋转时选择框跟手 + 边框同步 ===
  const syncBorder = () => {
    if (currentBorder && currentBorderBody) {
      currentBorder.x = currentBorderBody.x
      currentBorder.y = currentBorderBody.y
      currentBorder.rotation = currentBorderBody.rotation
    }
  }
  editor.on(EditorMoveEvent.MOVE, () => { ;(editor as any).editBox?.update(); syncBorder() })
  editor.on(EditorRotateEvent.ROTATE, () => { ;(editor as any).editBox?.update(); syncBorder() })

  // === 框选时刷新 clientBounds，修复 Vue 布局偏移 ===
  leafer.on(LP.DOWN, () => {
    try { ;(leafer as any).canvas?.getClientBounds?.(true) } catch (_) {}
  })

  // 批量创建多边形（边框层由 SELECT 事件按需动态创建/移除）
  polygons.forEach((p) => {
    const body = new Path({
      id: p.id,
      path: p.path,
      x: p.x, y: p.y,
      fill: p.fill,
      stroke: p.fill.replace('0.2', '0.7'),
      strokeWidth: 2,
      strokeAlign: 'inside',
      editable: true,
      draggable: true,
      hittable: true,
    })
    leafer!.add(body)
    allPaths.push(body)

    // 主体双击 → 分区编辑模式（边框双击由 currentBorder 独立处理）
    body.on_(LP.DOUBLE_TAP, () => {
      console.log('双击主体，切换分区编辑模式')
    })
  })

  // 监听选中变化 → 管理边框层生命周期（仅单选分区时创建边框层）
  editor.on(EditorEvent.SELECT, () => {
    const list: any[] = (editor as any)?.list ?? []
    selectedCount.value = list.length

    // 顶点编辑模式下保留边框，不清除
    if (!isEditing.value) {
      // 移除旧边框层
      if (currentBorder) {
        currentBorder.remove()
        currentBorder = null
        currentBorderBody = null
      }
    }

    // 仅单选分区时创建边框层（多选或无选中不创建）
    if (!isEditing.value && list.length === 1 && list[0]?.tag === 'Path') {
      const body = list[0]
      const border = new Path({
        id: `section-border-${body.id}`,
        path: body.path,
        x: body.x, y: body.y,
        rotation: body.rotation,
        fill: 'transparent',
        stroke: '#3b82f6',
        strokeWidth: 1 / scale.value,
        hitFill: 'none' as any,
        hitStroke: 'all' as any,
        editable: false,
        draggable: false,
        hittable: true,
        cursor: 'pointer',
      })
      leafer!.add(border)
      currentBorder = border
      currentBorderBody = body

      // 边框双击 → 顶点编辑
      border.on_(LP.DOUBLE_TAP, () => {
        console.log('双击边框，切换顶点编辑模式')
        if (vertexEditTarget === body) {
          exitVertexEdit()
        } else {
          if (vertexEditTarget) exitVertexEdit()
          enterVertexEdit(body)
        }
      })
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

    // Escape 退出顶点编辑
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && vertexEditTarget) exitVertexEdit() }
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

})


function getS(): number {
  return (leafer as any)?.scaleX ?? (leafer as any)?.__zoomLayer?.scaleX ?? 1
}

// 对 SVG 圆弧 (rx=ry=R, x-rotation=0) 采样 n+1 个点
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
  vertexEditTarget = pathEl
  isEditing.value = true
  editor!.cancel() // 取消已有选中，隐藏选择框
  // locked 阻断 LeafHelper.draggable() 和 EditBox，比 draggable=false 更彻底
  // （draggable=false 会被 editable=true 兜底，locked 是无条件阻断）
  allPaths.forEach((p: any) => { p.locked = true })
  setPanEnabled(false)

  // 提取顶点和弧线深度（支持 M/L/C/A 命令）
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
        editArcDepths.push(0) // 贝塞尔边当作直边处理
        px = nums[4]; py = nums[5]
      } else if (type === 'A') {
        const x2 = nums[5], y2 = nums[6]
        editVerts.push({ x: x2, y: y2 })
        // 从 SVG arc 参数逆算弧度深度
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
    // Z 闭合：最后一条边（末顶点→首顶点）弧深为 0
    if (editArcDepths.length < editVerts.length) {
      editArcDepths.push(0)
    }
  }
  // 确保 arcDepths 与 verts 长度一致（原始路径 Z 闭合需补齐）
  while (editArcDepths.length < editVerts.length) editArcDepths.push(0)

  // rebuildPath 格式：最后一条边显式连回首顶点 v0 再追加 Z，
  // 导致首顶点在列表尾重复（M 起始 + 末边终点）。
  // 去掉重复顶点及其对应的退化 arcDepth 条目。
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

function exitVertexEdit(): void {
  const editedBody = vertexEditTarget // 保存引用，在清空后用于恢复选中
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
  // 重新选中 → SELECT 事件创建新的边框层（path 已是变形后的最新值）
  if (editedBody && editor) {
    editor.target = editedBody
  }
}

function setPanEnabled(enabled: boolean): void {
  const app = (leafer as any)?.app
  if (app?.config?.move) app.config.move.disabled = !enabled
}

// 手柄放在 leafer 根下，需将 body 局部坐标转为世界坐标（考虑旋转）
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

  // 顶点手柄
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

  // 边弧手柄：全部运算在局部空间，只在设置 h.x/h.y 时转到父空间
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

  // 根据已恢复的 editArcDepths 把手柄从初始中点偏移到正确弧顶位置
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
  // 清除边缓存，下次框选时重建
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

function exportJSON(): void {
  const data = allPaths.map((p: any) => ({
    id: p.id,
    path: p.path,
    x: r(p.x), y: r(p.y),
    rotation: r(p.rotation ?? 0),
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
    const rot = r(p.rotation ?? 0)
    const t = rot ? ` transform="translate(${r(p.x)},${r(p.y)}) rotate(${rot})"` : ` transform="translate(${r(p.x)},${r(p.y)})"`
    svg += `<path d="${p.path}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="2"${t}/>`
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

onUnmounted(() => {
  if (canvas && boundWheel) { canvas.removeEventListener('wheel', boundWheel); boundWheel = null }
  const onKey = (leafer as any)?.__onKey
  if (onKey) document.removeEventListener('keydown', onKey)
  leafer?.destroy()
  leafer = null
})
</script>

<style scoped>
.pst { display: flex; flex-direction: column; height: 100vh; background: #f8fafc; }
.pst-bar {
  display: flex; align-items: center; gap: 10px; padding: 6px 16px;
  background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
}
.pst-title { font-weight: 600; font-size: 13px; color: #1e293b; }
.pst-bar button {
  padding: 4px 10px; font-size: 11px; border: 1px solid #d1d5db;
  border-radius: 4px; background: #fff; cursor: pointer;
}
.pst-bar button:hover { background: #f1f5f9; }
.pst-btn-exit { background: #fef2f2 !important; color: #dc2626 !important; border-color: #fecaca !important; }
.pst-info { font-size: 11px; color: #64748b; margin-left: auto; }
.pst-canvas { flex: 1; overflow: hidden; background: #fff; }
</style>
