import { LeafList } from '@leafer-ui/core'
import { EditSelectHelper } from '@leafer-in/editor'
import { sampleArc } from '../utils/pathUtils'

export interface SelectorPatchCtx {
  getEditor: () => any
  getEdgeCache: () => WeakMap<object, number[][]>
  getVertexTarget: () => any
  /** 判断 el 是否是分区边框，是则返回关联的 SectionGroup */
  getBorderGroup: (el: any) => any
  /** 框选完成后通知座位排选中变化 */
  onSeatRowsSelected?: (groups: any[]) => void
  /** 获取分区 Group 映射（findByBounds 无法命中容器型 Group） */
  getSectionGroupMap?: () => Map<string, any>
}

export function useSelectorPatch(ctx: SelectorPatchCtx): void {
  const editor = ctx.getEditor()
  if (!editor) return

  const sel = (editor as any).selector
  if (!sel) return

  // ⓪ targetStroker 过滤：只过滤座位排，分区保留原生描边（currentBorder 层叠其上）
  const targetStroker = sel.targetStroker
  if (targetStroker) {
    const _origSetTarget = targetStroker.setTarget.bind(targetStroker)
    targetStroker.setTarget = function (target: any, style?: any) {
      if (Array.isArray(target)) {
        target = target.filter((el: any) => !el.__seatRow)
      } else if (target?.__seatRow) {
        return
      }
      if (Array.isArray(target) && target.length === 0) return
      _origSetTarget(target, style)
    }
  }

  // ① editBox.update 包装：座位排/单个分区不显示包围盒
  const editBox = (editor as any).editBox
  if (editBox) {
    const _origUpdate = editBox.update.bind(editBox)
    editBox.update = function () {
      const list: any[] = (editor as any)?.list ?? []
      if (list.length === 0) return
      if (list.every((el: any) => el.__seatRow)) return
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

  // ② findUI 覆盖：座位排优先 + 边框重定向 + 分区内部 Path→Group 兜底
  const _origFindUI = sel.findUI.bind(sel)
  sel.findUI = function (e: any) {
    const result = _origFindUI(e)
    // 命中分区边框 → 重定向到关联的 SectionGroup
    const borderGroup = ctx.getBorderGroup(result)
    if (borderGroup) return borderGroup
    // 优先返回 __seatRow Group（防止被分区图形拦截）
    const path = e.path?.list ?? e.path ?? []
    for (const leaf of path) {
      const p = leaf.parent
      if (p?.__seatRow) return p
    }
    // 命中分区内部 Path → 重定向到父 SectionGroup
    if (result?.__sectionGroup && result.__sectionGroup !== true) {
      return result.__sectionGroup
    }
    if (result) return result
    return null
  }

  // ③ checkAndSelect 覆盖
  const _origCheck = sel.checkAndSelect.bind(sel)
  sel.checkAndSelect = function (e: any) {
    const find = sel.findUI(e)
    if (find && sel.editor.hasItem(find) && sel.editor.multiple && !sel.isMultipleSelect(e)) return
    _origCheck(e)
  }

  // ④ onDrag 覆盖：AABB 粗筛 + pathHitsRect 精判
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

      // 第1步：findByBounds AABB 粗筛叶子节点
      const candidates = findByBounds(ed.app, worldBounds) as any[]

      // 第2步：手动注入 SectionGroup（findByBounds 跳过容器型 Group）
      //   用内部 Path 做 pathHitsRect 精判，命中则把 SectionGroup 加入候选
      const sectionMap = ctx.getSectionGroupMap?.()
      if (sectionMap) {
        sectionMap.forEach((group: any) => {
          if (!group.__world || !group.visible || group.locked) return
          const pc = group.children?.find((c: any) => c.tag === 'Path')
          if (!pc) return
          if (pathHitsRect(pc, wr.x, wr.y, wr.width, wr.height)) {
            candidates.push(group)
          }
        })
      }

      // 第3步：单次遍历 — 重定向 + 去重
      // 注意：__sectionGroup 有两种值：
      //   在 SectionGroup 上 → true（标记自己是分区）
      //   在内部 Path 上 → 父 SectionGroup 对象（用于重定向）
      const seen = new Set<any>()
      const hits: any[] = []
      for (const el of candidates) {
        if (el.id?.startsWith?.('section-border-')) continue
        if (el.parent?.__seatRow || el.__seatRow) continue

        const isSection = el.__sectionGroup === true
        const parentGroup = !isSection && el.__sectionGroup ? el.__sectionGroup : null
        const target = parentGroup || el
        if (seen.has(target)) continue

        if (isSection) {
          // 手动注入的 SectionGroup — 已在上面用 pathHitsRect 精判过
          seen.add(target)
          hits.push(target)
        } else if (parentGroup) {
          // 内部 Path → 重定向到父 SectionGroup
          // findByBounds 查到的是叶子 Path，用 pathHitsRect 精判
          if (pathHitsRect(el, wr.x, wr.y, wr.width, wr.height)) {
            seen.add(target)
            hits.push(target)
          }
        } else if (el.tag === 'Path') {
          if (pathHitsRect(el, wr.x, wr.y, wr.width, wr.height)) {
            seen.add(target)
            hits.push(target)
          }
        }
      }

      const leafList = new LeafList(hits)

      this.bounds.width = total.x
      this.bounds.height = total.y
      this.selectArea.setBounds(dragBounds.get())

      ctx.onSeatRowsSelected?.([])

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
