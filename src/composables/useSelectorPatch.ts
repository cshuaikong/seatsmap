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
  /** 是否处于分区编辑模式 */
  getFocusedSectionId?: () => string | null
}

export function useSelectorPatch(ctx: SelectorPatchCtx): void {
  const editor = ctx.getEditor()
  if (!editor) return

  const sel = (editor as any).selector
  if (!sel) return

  // ⓪ targetStroker 过滤：座位排和分区 Group 均不显示原生描边（分区有 sectionBorder 蓝色边框替代）
  const targetStroker = sel.targetStroker
  if (targetStroker) {
    const _origSetTarget = targetStroker.setTarget.bind(targetStroker)
    targetStroker.setTarget = function (target: any, style?: any) {
      if (Array.isArray(target)) {
        target = target.filter((el: any) => !el.__seatRow && el.__sectionGroup !== true)
      } else if (target?.__seatRow || target?.__sectionGroup === true) {
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
      if (!ctx.getFocusedSectionId?.() && list.every((el: any) => el.__seatRow)) return
      try { _origUpdate() } catch (_) {}
    }
  }

  // ① allow 覆盖：顶点编辑时允许手柄 + 分区切换，仅拦截边框和座位排
  const _origAllow = sel.allow.bind(sel)
  sel.allow = (target: any) => {
    if (ctx.getVertexTarget()) {
      if (target?.id?.startsWith?.('section-border-')) return false
      if (target?.__seatRow) return false
      return true
    }
    if (target?.id?.startsWith?.('section-border-')) return false
    if (ctx.getFocusedSectionId?.() && target?.__sectionGroup === true) return false
    if (!target) return _origAllow(target)
    let node = target
    while (node) {
      if (node === editor) return false
      node = node.parent
    }
    if (!target?.draggable && !target?.editable) return true
    return _origAllow(target)
  }

  // ② findUI 覆盖：座位排优先 + 边框重定向 + 分区内部 Path→Group 兜底 + focus 模式 findByBounds 兜底
  const _origFindUI = sel.findUI.bind(sel)
  const { findByBounds: _findByBoundsLocal } = EditSelectHelper
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
    // 命中分区内部 Path → 重定向到父 SectionGroup（非 focus 模式）
    if (result?.__sectionGroup && result.__sectionGroup !== true) {
      if (ctx.getFocusedSectionId?.()) return null
      return result.__sectionGroup
    }
    // 分区编辑模式下不返回 SectionGroup（原生 checkAndSelect 不调 allow，拦不住）
    if (result?.__sectionGroup === true && ctx.getFocusedSectionId?.()) return null
    if (result) return result

    // 分区编辑模式 fallback：用 findByBounds 直接查找座位排
    // 仅在点击事件时触发，跳过 pointermove（光标跟踪不需要）
    if (e.type !== 'pointermove') {
      const focusedId = ctx.getFocusedSectionId?.()
      if (focusedId) {
        const sectionMap = ctx.getSectionGroupMap?.()
        const focusedGroup = sectionMap?.get(focusedId)
        if (focusedGroup) {
          const px = e.x ?? 0
          const py = e.y ?? 0
          const wb = (sel as any).bounds.clone()
          wb.set(px - 2, py - 2, 4, 4)
          const candidates = _findByBoundsLocal(sel.editor.app, wb) as any[]
          for (const el of candidates) {
            if (el.parent?.__seatRow && el.parent.__sectionId === focusedId) {
              return el.parent
            }
            if (el.__seatRow && el.__sectionId === focusedId) {
              return el
            }
          }
        }
      }
    }

    return null
  }

  // ③ checkAndSelect 覆盖
  const _origCheck = sel.checkAndSelect.bind(sel)
  sel.checkAndSelect = function (e: any) {
    const find = sel.findUI(e)
    if (find && sel.editor.hasItem(find) && sel.editor.multiple && !sel.isMultipleSelect(e)) return

    // 分区编辑模式：拦截所有分区选中，原生 checkAndSelect 不调 allow 直接赋值 editor.target
    if (find?.__sectionGroup === true && ctx.getFocusedSectionId?.()) return

    // focus 模式：findByBounds fallback 查到的座位排（非直接命中），且当前无选中时，
    // 不传给原生 — 否则 editor.target 被设置后 editing→true，allowDrag 返回 false，框选无法启动
    // 若已有选中则放行，让原生 checkAndSelect 先清空选区再启动框选
    if (find?.__seatRow && ctx.getFocusedSectionId?.() && !sel.editor.editing) {
      const path = e.path?.list ?? e.path ?? []
      let directlyHit = false
      for (const leaf of path) {
        if (leaf === find) { directlyHit = true; break }
        if (leaf.parent === find) { directlyHit = true; break }
      }
      if (!directlyHit) return
    }

    _origCheck(e)
  }

  // ③½ allowDrag 覆盖：focus 模式下 SectionGroup 填满视口，
  // 原生 allow(e.target) 要求 target.leafer !== editor.leafer（即必须点在画布背景），
  // 但 focus 时任何点击都命中 SectionGroup/子元素，框选根本无法启动
  const _origAllowDrag = (sel as any).allowDrag.bind(sel)
  ;(sel as any).allowDrag = function (e: any) {
    if (ctx.getFocusedSectionId?.() && !this.dragging) {
      // 座位排顶点手柄拖拽 — 走原生逻辑（手柄 draggable → 返回 false，不启框选）
      if (e.target?.__seatHandleIdx != null) return _origAllowDrag(e)
      return true
    }
    return _origAllowDrag(e)
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

  // 遍历 bar 多段线逐段测试（直线排 2 点=1 段，弧线排 N 点=N-1 段）
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
      const focusedId = ctx.getFocusedSectionId?.()

      // 第1步：findByBounds AABB 粗筛叶子节点
      const sectionMap = ctx.getSectionGroupMap?.()
      const candidates = findByBounds(ed.app, worldBounds) as any[]

      // 第2步：手动注入 SectionGroup（findByBounds 跳过容器型 Group）
      //   分区编辑模式下不注入，避免选中非聚焦分区导致退出
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

      // 第3步：单次遍历 — 重定向 + 去重
      // 注意：__sectionGroup 有两种值：
      //   在 SectionGroup 上 → true（标记自己是分区）
      //   在内部 Path 上 → 父 SectionGroup 对象（用于重定向）
      const seen = new Set<any>()
      const hits: any[] = []
      for (const el of candidates) {
        if (el.id?.startsWith?.('section-border-')) continue
        // 分区编辑模式：座位排子元素重定向到父座位排 Group（仅当前分区）
        if (el.parent?.__seatRow) {
          if (focusedId && el.parent.__sectionId === focusedId && !seen.has(el.parent)
            && seatRowHitsRect(el.parent, wr.x, wr.y, wr.width, wr.height)) {
            seen.add(el.parent)
            hits.push(el.parent)
          }
          continue
        }
        if (el.__seatRow) {
          // findByBounds 直接命中的座位排 Group
          if (focusedId && el.__sectionId === focusedId && !seen.has(el)
            && seatRowHitsRect(el, wr.x, wr.y, wr.width, wr.height)) {
            seen.add(el)
            hits.push(el)
          }
          continue
        }

        // 分区编辑模式：只放行座位排，拦截所有分区/Path
        if (focusedId && el.__sectionGroup) continue

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

  // ⑤ checkOpenedGroups 拦截：分区编辑模式下禁止自动关闭
  const _origCheckOpened = (editor as any).checkOpenedGroups?.bind(editor)
  if (_origCheckOpened) {
    (editor as any).checkOpenedGroups = function () {
      if (ctx.getFocusedSectionId?.()) return
      try { _origCheckOpened() } catch (_) {}
    }
  }

}
