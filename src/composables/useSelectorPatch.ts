import { LeafList } from '@leafer-ui/core'
import { EditSelectHelper } from '@leafer-in/editor'
import { sampleArc } from '../utils/pathUtils'

export interface SelectorPatchCtx {
  getEditor: () => any
  getEdgeCache: () => WeakMap<object, number[][]>
  getVertexTarget: () => any
  getCurrentBorder: () => any
  getCurrentBorderBody: () => any
  /** 框选完成后通知座位排选中变化 */
  onSeatRowsSelected?: (groups: any[]) => void
  /** 获取所有座位排 Group（用于 findOne 无法命中容器的问题） */
  getSeatRowGroups?: () => any[]
}

export function useSelectorPatch(ctx: SelectorPatchCtx): void {
  const editor = ctx.getEditor()
  if (!editor) return

  const sel = (editor as any).selector
  if (!sel) return

  // ⓪ targetStroker setTarget 拦截：过滤 __seatRow，不画单个座位排的包围描边
  const targetStroker = sel.targetStroker
  if (targetStroker) {
    const _origSetTarget = targetStroker.setTarget.bind(targetStroker)
    targetStroker.setTarget = function (target: any, style?: any) {
      if (Array.isArray(target)) {
        target = target.filter((el: any) => !el.__seatRow)
      } else if (target?.__seatRow) {
        return
      }
      _origSetTarget(target, style)
    }
  }

  // ⓪① editBox.update 包装：防止 __seatRow 导致 getLayoutBounds 崩溃
  const editBox = (editor as any).editBox
  if (editBox) {
    const _origUpdate = editBox.update.bind(editBox)
    editBox.update = function () {
      const list: any[] = (editor as any)?.list ?? []
      if (list.length > 0 && list.every((el: any) => el.__seatRow)) return
      if (list.length === 0) return
      try { _origUpdate() } catch (_) {}
    }
  }

  // ① allow 覆盖：顶点编辑时只允许选中 Rect/Ellipse
  const _origAllow = sel.allow.bind(sel)
  sel.allow = (target: any) => {
    if (ctx.getVertexTarget()) {
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

  // ② findUI 覆盖：点击边框→body，点击座位排子元素→父Group
  const _origFindUI = sel.findUI.bind(sel)
  sel.findUI = function (e: any) {
    const result = _origFindUI(e)
    if (result === ctx.getCurrentBorder() && ctx.getCurrentBorderBody()) {
      return ctx.getCurrentBorderBody()
    }
    if (result) return result
    // findOne 要求 editable=true，Group 子元素(Line/Path)都不满足，
    // 但 Group 本身是 isBranch 容器不会被 findOne 返回。
    // 这里扫描命中路径，找到 __seatRow Group 作为选中目标。
    const path = e.path?.list ?? e.path ?? []
    for (const leaf of path) {
      const p = leaf.parent
      if (p?.__seatRow) return p
    }
    return null
  }

  // ③ checkAndSelect 覆盖
  const _origCheck = sel.checkAndSelect.bind(sel)
  sel.checkAndSelect = function (e: any) {
    const find = sel.findUI(e)
    if (find && sel.editor.hasItem(find) && sel.editor.multiple && !sel.isMultipleSelect(e)) return
    _origCheck(e)
  }

  // ④ onDrag 覆盖：框选坐标空间修复 + Path 线段碰撞检测
  const { findByBounds } = EditSelectHelper

  const segHitsRect = (
    ax: number, ay: number, bx: number, by: number,
    rx: number, ry: number, rw: number, rh: number,
  ): boolean => {
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

    const cache = ctx.getEdgeCache()
    let edges = cache.get(el)
    if (!edges) {
      const cmds = d.match(/[MLQCZA][^MLQCZA]*/gi)
      if (!cmds) return false
      edges = []
      let cx = 0, cy = 0, startX = 0, startY = 0, px = 0, py = 0
      for (const cmd of cmds) {
        const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter((n: any) => !isNaN(n))
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
      cache.set(el, edges)
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

  const groupHitsRect = (el: any, rx: number, ry: number, rw: number, rh: number): boolean => {
    const w = el.__world
    if (!w || !el.children) return false
    let line: any = null
    for (let i = 0; i < el.children.length; i++) {
      if (el.children[i].tag === 'Line') { line = el.children[i]; break }
    }
    if (!line?.points || line.points.length < 4) return false
    const r = (line.strokeWidth ?? 0) / 2
    if (r <= 0) return false
    const ax = line.points[0] * w.a + line.points[1] * w.c + w.e
    const ay = line.points[0] * w.b + line.points[1] * w.d + w.f
    const bx = line.points[2] * w.a + line.points[3] * w.c + w.e
    const by = line.points[2] * w.b + line.points[3] * w.d + w.f
    return segHitsRect(ax, ay, bx, by, rx - r, ry - r, rw + r + r, rh + r + r)
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
          Math.abs(e.y - startWY),
        )
      }
      const wr = worldBounds.get()
      const candidates = findByBounds(ed.app, worldBounds) as any[]

      // findOne/eachFind 无法命中容器型 Group（isBranch），
      // 手动补充 __seatRow Group 碰撞检测
      const seatGroups = ctx.getSeatRowGroups?.() ?? []
      for (const g of seatGroups) {
        if (!g.__world || !g.visible || g.locked) continue
        const gw = g.__world
        const gx = gw.e, gy = gw.f
        // 用 worldBounds 快速粗筛（再靠 groupHitsRect 精判）
        if (
          gx + (g.children?.[0]?.strokeWidth ?? 0) >= wr.x &&
          gy + (g.children?.[0]?.strokeWidth ?? 0) >= wr.y
        ) {
          if (groupHitsRect(g, wr.x, wr.y, wr.width, wr.height)) {
            candidates.push(g)
          }
        }
      }

      const list = (candidates as any[]).filter((el: any) => {
        if (el.id?.startsWith?.('section-border-')) return false
        // 座位排子元素（Line/Path）重定向到父 Group
        if (el.parent?.__seatRow) return false
        if (el.tag === 'Path') return pathHitsRect(el, wr.x, wr.y, wr.width, wr.height)
        if (el.tag === 'Group') return groupHitsRect(el, wr.x, wr.y, wr.width, wr.height)
        return true
      })
      const leafList = new LeafList(list)

      this.bounds.width = total.x
      this.bounds.height = total.y
      this.selectArea.setBounds(dragBounds.get())

      // 通知 bar 变色：提取命中的座位排 Group
      ctx.onSeatRowsSelected?.(list.filter((el: any) => el.__seatRow))

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
