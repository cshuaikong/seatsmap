import { LeafList } from '@leafer-ui/core'
import { EditSelectHelper } from '@leafer-in/editor'
import { sampleArc } from '../utils/pathUtils'

export interface SelectorPatchCtx {
  getEditor: () => any
  getEdgeCache: () => WeakMap<object, number[][]>
  getVertexTarget: () => any
  onSeatRowsSelected?: (groups: any[]) => void
  getSectionGroupMap?: () => Map<string, any>
  getFocusedSectionId?: () => string | null
}

export function useSelectorPatch(ctx: SelectorPatchCtx): void {
  const editor = ctx.getEditor()
  if (!editor) return

  const sel = (editor as any).selector
  if (!sel) return

  // ⓪ targetStroker：SectionGroup 用 __selectionBorder，SeatRow 用 editBox，都不需要原生矩形描边
  const targetStroker = sel.targetStroker
  if (targetStroker) {
    const _origSetTarget = targetStroker.setTarget.bind(targetStroker)
    targetStroker.setTarget = function (target: any, style?: any) {
      const isSectionOrRow = (el: any) => el?.__seatRow || el?.__sectionGroup === true
      if (Array.isArray(target)) {
        const filtered = target.filter((el: any) => !isSectionOrRow(el))
        if (filtered.length === 0) return
        _origSetTarget(filtered, style)
      } else if (!isSectionOrRow(target)) {
        _origSetTarget(target, style)
      }
    }
  }

  // ① editBox.update — 座位排选中时穿透整个 editor 层；座位选中时隐藏 editBox 避免遮挡
  const editBox = (editor as any).editBox
  if (editBox) {
    const _origUpdate = editBox.update.bind(editBox)
    editBox.update = function () {
      const list: any[] = (editor as any)?.list ?? []
      try { _origUpdate() } catch (_) {}
      const allSeats = list.length > 0 && list.every((el: any) => el.__seatRow)
      const hasSeats = list.some((el: any) => el.__seatId)
      if (allSeats) {
        // 座位排选中时保留 editBox 用于拖拽/旋转，但让事件能穿透到子座位圆
        ;(editor as any).hittable = true
        ;(editor as any).hitSelf = false
        ;(editor as any).hitChildren = true
        ;(editBox as any).hittable = true
        ;(editBox as any).hitSelf = false
        ;(editBox as any).hitChildren = true
        if ((editBox as any).rect) {
          ;(editBox as any).rect.hittable = false
        }
      } else if (hasSeats) {
        // 座位选择不需要 editBox，隐藏即可
        ;(editBox as any).visible = false
        ;(editBox as any).hittable = false
      } else {
        ;(editBox as any).hittable = true
        ;(editBox as any).hitSelf = true
        ;(editBox as any).hitChildren = true
        if ((editBox as any).rect) {
          ;(editBox as any).rect.hittable = true
        }
        ;(editor as any).hittable = true
        ;(editor as any).hitSelf = true
        ;(editor as any).hitChildren = true
      }
    }
  }

  // ② allow 覆盖
  const _origAllow = sel.allow.bind(sel)
  sel.allow = (target: any) => {
    if (ctx.getVertexTarget()) {
      if (target?.__seatRow) return false
      return true
    }
    if (ctx.getFocusedSectionId?.() && target?.__sectionGroup === true) return false
    if (!target) return _origAllow(target)
    let node = target
    let inSeatRow = false
    while (node) {
      if (node === editor) return false
      if (node?.__seatRow) inSeatRow = true
      node = node.parent
    }
    // 非分区编辑模式下禁止选中座位排/座位
    if (inSeatRow && !ctx.getFocusedSectionId?.()) return false
    if (!target?.draggable && !target?.editable) return true
    return _origAllow(target)
  }

  // ③ findUI — 仅保留 focus 模式下命中可见座位圆的归一
  const _origFindUI = sel.findUI.bind(sel)
  sel.findUI = function (e: any) {
    const result = _origFindUI(e)
    const path = e.path?.list ?? e.path ?? []
    const focusedId = ctx.getFocusedSectionId?.()
    // focus 模式下，命中可见的单个座位圆 → 直接选中座位
    if (focusedId) {
      for (const leaf of path) {
        if (leaf?.__seatId && leaf.visible) return leaf
      }
    }
    if (result) return result
    return null
  }

  // ④ checkAndSelect — 恢复原生，SectionGroup/SeatRow 点选由 BEFORE_DOWN 处理
  const _origCheck = sel.checkAndSelect.bind(sel)
  sel.checkAndSelect = function (e: any) {
    const find = sel.findUI(e)
    if (find && sel.editor.hasItem(find) && sel.editor.multiple && !sel.isMultipleSelect(e)) return
    _origCheck(e)
  }

  // ⑤ allowDrag — focus 模式下让 Editor 自己处理拖拽
  const _origAllowDrag = (sel as any).allowDrag.bind(sel)
  ;(sel as any).allowDrag = function (e: any) {
    if (ctx.getFocusedSectionId?.() && !this.dragging) {
      // 座位端点编辑手柄仍走原生
      if (e.target?.__seatHandleIdx != null) return _origAllowDrag(e)
    }
    return _origAllowDrag(e)
  }

  // ⑤‑1 onDragStart — 框选起点，强制刷新布局避免第一次拖拽时 __world 未计算导致 bounds 为 0,0
  sel.onDragStart = function (e: any) {
    if (e.multiTouch) return
    if (this.waitSelect) this.waitSelect()

    if (this.allowDrag(e)) {
      const { editor } = this
      const { stroke, area } = editor.mergeConfig

      // 关键：第一次拖拽时 selector/editor 的世界矩阵可能还没刷新，
      // 导致 e.getInnerPoint(this) 取到错误起点 (0,0)，选框从左上角开始。
      // 这里先强制更新布局，确保 worldTransform 已生效。
      try {
        this.updateLayout?.()
        editor?.updateLayout?.()
        editor?.app?.updateLayout?.()
      } catch (_) {}

      const { x, y } = e.getInnerPoint(this)
      this.bounds.set(x, y)

      this.selectArea.setStyle({ visible: true, stroke, x, y }, area)
      this.selectArea.setBounds(this.bounds.get())

      this.originList = editor.leafList.clone()
    }
  }

  // ⑥ onDrag — 框选
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

  const seatRowHitsRect = (rowGroup: any, rx: number, ry: number, rw: number, rh: number): boolean => {
    const bar = rowGroup.__bar
    const pts: number[] = bar?.points
    if (!pts || pts.length < 4) return false
    const w = rowGroup.__world
    if (!w) return false
    const r = rowGroup.__seatRadius ?? 0
    const prx = rx - r, pry = ry - r, prw = rw + r * 2, prh = rh + r * 2
    for (let i = 0; i < pts.length - 2; i += 2) {
      const wx1 = pts[i] * w.a + pts[i + 1] * w.c + w.e
      const wy1 = pts[i] * w.b + pts[i + 1] * w.d + w.f
      const wx2 = pts[i + 2] * w.a + pts[i + 3] * w.c + w.e
      const wy2 = pts[i + 2] * w.b + pts[i + 3] * w.d + w.f
      if (segHitsRect(wx1, wy1, wx2, wy2, prx, pry, prw, prh)) return true
    }
    return false
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
    if (ctx.getVertexTarget()) return
    if (this.editor.dragging) return this.onDragEnd(e)
    if (this.dragging) {
      const ed = this.editor
      if (!(this as any).__boxHidden) {
        ;(ed as any).editBox.visible = false
        ;(this as any).__boxHidden = true
      }
      const total = e.getInnerTotal(this)
      const dragBounds = this.bounds.clone().unsign()

      // 使用鼠标按下时的世界坐标作为选框起点，不依赖 this.bounds 与 __world 矩阵，
      // 避免初次拖拽时 bounds 为 0,0 导致选框从左上角开始。
      const startWorldX = e.x - e.totalX
      const startWorldY = e.y - e.totalY
      const worldBounds = dragBounds.clone()
      worldBounds.set(
        Math.min(startWorldX, e.x),
        Math.min(startWorldY, e.y),
        Math.abs(e.x - startWorldX),
        Math.abs(e.y - startWorldY),
      )
      const wr = worldBounds.get()
      const focusedId = ctx.getFocusedSectionId?.()

      const sectionMap = ctx.getSectionGroupMap?.()
      const candidates = findByBounds(ed.app, worldBounds) as any[]

      if (sectionMap && !focusedId) {
        sectionMap.forEach((group: any) => {
          if (!group.__world || !group.visible || group.locked) return
          const pc = group.children?.find((c: any) => c.tag === 'Path')
          if (!pc) return
          if (pathHitsRect(pc, wr.x, wr.y, wr.width, wr.height)) {
            candidates.push(group)
          }
        })
      }

      const seen = new Set<any>()
      const hits: any[] = []
      for (const el of candidates) {
        if (el.id?.startsWith?.('section-border-')) continue
        if (el.parent?.__seatRow) {
          if (focusedId && el.parent.__sectionId === focusedId && !seen.has(el.parent)
            && seatRowHitsRect(el.parent, wr.x, wr.y, wr.width, wr.height)) {
            seen.add(el.parent)
            hits.push(el.parent)
          }
          continue
        }
        if (el.__seatRow) {
          if (focusedId && el.__sectionId === focusedId && !seen.has(el)
            && seatRowHitsRect(el, wr.x, wr.y, wr.width, wr.height)) {
            seen.add(el)
            hits.push(el)
          }
          continue
        }

        if (focusedId && el.__sectionGroup) continue

        const isSection = el.__sectionGroup === true
        const parentGroup = !isSection && el.__sectionGroup ? el.__sectionGroup : null
        const target = parentGroup || el
        if (seen.has(target)) continue

        if (isSection) {
          // 分区 Group 的 __world 可能因为选中边框（粗 stroke / visible=false）
          // 或文本标签而变得很大，不能直接用包围盒命中。改用 body Path 精确检测。
          const body = target.children?.find((c: any) => c.tag === 'Path' && !c.__sectionBorder)
          if (body && pathHitsRect(body, wr.x, wr.y, wr.width, wr.height)) {
            seen.add(target)
            hits.push(target)
          }
        } else if (parentGroup) {
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

      const focusedGroup = focusedId && sectionMap ? sectionMap.get(focusedId) : null

      if (leafList.length) {
        const selectList: any[] = []
        this.originList.forEach((item: any) => { if (!leafList.has(item)) selectList.push(item) })
        leafList.forEach((item: any) => { if (!this.originList.has(item)) selectList.push(item) })
        if (focusedGroup) {
          for (let i = selectList.length - 1; i >= 0; i--) {
            let p = selectList[i].parent
            let inGroup = false
            while (p) { if (p === focusedGroup) { inGroup = true; break } p = p.parent }
            if (!inGroup) selectList.splice(i, 1)
          }
        }
        if (selectList.length !== ed.list.length || ed.list.some((c: any, i: number) => c !== selectList[i])) {
          ed.target = selectList as any
        }
      } else {
        ed.target = this.originList.list
      }
    }
  }

  // ⑦ checkOpenedGroups — focus 模式禁止自动关闭
  const _origCheckOpened = (editor as any).checkOpenedGroups?.bind(editor)
  if (_origCheckOpened) {
    (editor as any).checkOpenedGroups = function () {
      if (ctx.getFocusedSectionId?.()) return
      try { _origCheckOpened() } catch (_) {}
    }
  }

}
