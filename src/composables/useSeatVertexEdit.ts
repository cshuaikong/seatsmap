import { ref } from 'vue'
import { Rect, DragEvent } from 'leafer-ui'
import type { SeatDrawRowData } from './useSeatDraw'

export interface SeatVertexEditCtx {
  getLeafer: () => any
  getEditor: () => any
  getAllPaths: () => any[]
  getS: () => number
  setPanEnabled: (v: boolean) => void
  getParentGroup?: () => any | null
  onToolChange: (tool: string) => void
  onRebuild: (group: any, newData: SeatDrawRowData, endCenter?: { x: number; y: number }, anchorFromEnd?: boolean) => void
}

export function useSeatVertexEdit(ctx: SeatVertexEditCtx) {
  const isEditing = ref(false)

  let target: any = null
  let rowData: SeatDrawRowData | null = null
  let handles: any[] = []
  let seatRadius = 0
  let draggingIdx = -1
  let origRowData: SeatDrawRowData | null = null
  let origHandle0: { x: number; y: number } | null = null
  let origHandle1: { x: number; y: number } | null = null

  function getRadius(): number {
    return (target as any)?.__seatRadius ?? 0
  }

  /** 局部坐标 → 世界坐标（叠加父 Group 变换） */
  function toWorldSpace(lx: number, ly: number): { x: number; y: number } {
    const parentGroup = ctx.getParentGroup?.()
    if (!parentGroup) return { x: lx, y: ly }
    const cos = Math.cos((parentGroup.rotation ?? 0) * Math.PI / 180)
    const sin = Math.sin((parentGroup.rotation ?? 0) * Math.PI / 180)
    return {
      x: (parentGroup.x ?? 0) + lx * cos - ly * sin,
      y: (parentGroup.y ?? 0) + lx * sin + ly * cos,
    }
  }

  /** 世界坐标 → 局部坐标（扣除父 Group 变换） */
  function toLocalSpace(wx: number, wy: number): { x: number; y: number } {
    const parentGroup = ctx.getParentGroup?.()
    if (!parentGroup) return { x: wx, y: wy }
    const cos = Math.cos((parentGroup.rotation ?? 0) * Math.PI / 180)
    const sin = Math.sin((parentGroup.rotation ?? 0) * Math.PI / 180)
    const dx = wx - (parentGroup.x ?? 0)
    const dy = wy - (parentGroup.y ?? 0)
    return {
      x: dx * cos + dy * sin,
      y: -dx * sin + dy * cos,
    }
  }

  function enter(group: any): void {
    exit(true)

    const data = (group as any).__seatRowData as SeatDrawRowData | undefined
    if (!data) return

    target = group
    rowData = { ...data }
    seatRadius = getRadius()
    isEditing.value = true

    ctx.getEditor()?.cancel()
    ctx.getAllPaths().forEach((p: any) => { p.locked = true })
    ctx.setPanEnabled(false)

    createHandles()
  }

  function exit(silent?: boolean): void {
    handles.forEach(h => { try { h.remove() } catch (_) {} })
    handles = []
    target = null
    rowData = null
    seatRadius = 0
    draggingIdx = -1
    origRowData = null
    origHandle0 = null
    origHandle1 = null
    isEditing.value = false

    ctx.getAllPaths().forEach((p: any) => { p.locked = false })
    ctx.setPanEnabled(true)

    if (!silent) {
      ctx.onToolChange('select')
    }
  }

  function createHandles(): void {
    const leafer = ctx.getLeafer()
    if (!leafer || !rowData) return

    const s = Math.max(ctx.getS(), 0.02)
    const size = 6 / s
    const strokeW = 1 / s
    const { x, y, ux, uy, count, spacing } = rowData
    const r = seatRadius
    const lastIdx = count - 1

    const lsx = x - ux * r
    const lsy = y - uy * r
    const lex = x + ux * spacing * lastIdx + ux * r
    const ley = y + uy * spacing * lastIdx + uy * r
    const wp0 = toWorldSpace(lsx, lsy)
    const wp1 = toWorldSpace(lex, ley)

    const handleBase = {
      width: size,
      height: size,
      fill: '#3b82f6',
      stroke: '#fff',
      strokeWidth: strokeW,
      draggable: true,
      hittable: true,
      cursor: 'move',
      around: 'center',
      zIndex: 99999,
    }

    const h0 = new Rect({ ...handleBase, x: wp0.x, y: wp0.y })
    ;(h0 as any).__seatHandleIdx = 0
    h0.on_(DragEvent.DRAG, () => onHandleDrag(0))
    h0.on_(DragEvent.END, () => onHandleDragEnd(0))
    leafer.add(h0)
    handles.push(h0)

    const h1 = new Rect({ ...handleBase, x: wp1.x, y: wp1.y })
    ;(h1 as any).__seatHandleIdx = 1
    h1.on_(DragEvent.DRAG, () => onHandleDrag(1))
    h1.on_(DragEvent.END, () => onHandleDragEnd(1))
    leafer.add(h1)
    handles.push(h1)
  }

  /** 获取手柄投影到方向线上的世界位置 */
  function projectedHandle(idx: number): { x: number; y: number } {
    if (!rowData || handles.length < 2) return { x: 0, y: 0 }
    // 将 ux/uy 从局部空间转到世界空间
    const { ux, uy } = rowData
    const parentGroup = ctx.getParentGroup?.()
    let wux = ux, wuy = uy
    if (parentGroup) {
      const cos = Math.cos((parentGroup.rotation ?? 0) * Math.PI / 180)
      const sin = Math.sin((parentGroup.rotation ?? 0) * Math.PI / 180)
      wux = ux * cos - uy * sin
      wuy = ux * sin + uy * cos
    }
    const hDragged = handles[idx]
    const hAnchor = handles[1 - idx]

    const dx = hDragged.x! - hAnchor.x!
    const dy = hDragged.y! - hAnchor.y!
    const dirSign = idx === 0 ? -1 : 1
    let t = (dx * wux + dy * wuy) * dirSign
    t = Math.max(0, t)

    return {
      x: hAnchor.x! + wux * dirSign * t,
      y: hAnchor.y! + wuy * dirSign * t,
    }
  }

  function onHandleDrag(idx: number): void {
    if (!rowData || handles.length < 2) return

    const proj = projectedHandle(idx)
    const anchor = handles[1 - idx]
    const { ux, uy, spacing } = rowData
    const r = seatRadius

    // 首帧保存原始状态
    if (draggingIdx < 0) {
      draggingIdx = idx
      origRowData = { ...rowData }
      origHandle0 = { x: handles[0].x!, y: handles[0].y! }
      origHandle1 = { x: handles[1].x!, y: handles[1].y! }
    }

    // 将 proj 和 anchor 从世界转局部
    const lpProj = toLocalSpace(proj.x, proj.y)
    const lpAnchor = toLocalSpace(anchor.x!, anchor.y!)

    // 连续 bar 端点（跟随手柄，无跳动）—— 在局部空间计算
    let barStartX: number, barStartY: number
    let barEndX: number, barEndY: number

    if (idx === 0) {
      barStartX = lpProj.x + ux * r
      barStartY = lpProj.y + uy * r
      barEndX = lpAnchor.x - ux * r
      barEndY = lpAnchor.y - uy * r
    } else {
      barStartX = lpAnchor.x + ux * r
      barStartY = lpAnchor.y + uy * r
      barEndX = lpProj.x - ux * r
      barEndY = lpProj.y - uy * r
    }

    // 增量 count：手柄从原始位置沿朝向座位方向移动的距离 → 增减座位数
    const origPos = idx === 0 ? origHandle0! : origHandle1!
    const lpOrigPos = toLocalSpace(origPos.x, origPos.y)
    const dirX = idx === 0 ? ux : -ux
    const dirY = idx === 0 ? uy : -uy
    const movement = (lpProj.x - lpOrigPos.x) * dirX + (lpProj.y - lpOrigPos.y) * dirY
    const delta = -Math.round(movement / spacing)
    const newCount = Math.max(1, origRowData!.count + delta)

    rowData.x = barStartX
    rowData.y = barStartY
    rowData.count = newCount

    // endCenter 在局部空间传给 rebuild
    ctx.onRebuild(target, { ...rowData }, { x: barEndX, y: barEndY }, idx === 0)
  }

  function onHandleDragEnd(idx: number): void {
    if (!rowData || !origRowData || handles.length < 2) return

    const { ux, uy, spacing } = rowData

    // 吸附手柄到约束位置（世界空间）
    const proj = projectedHandle(idx)
    handles[idx].x = proj.x
    handles[idx].y = proj.y

    // 计算最终 delta（用局部空间）
    const origPos = idx === 0 ? origHandle0! : origHandle1!
    const lpProj = toLocalSpace(proj.x, proj.y)
    const lpOrigPos = toLocalSpace(origPos.x, origPos.y)
    const dirX = idx === 0 ? ux : -ux
    const dirY = idx === 0 ? uy : -uy
    const movement = (lpProj.x - lpOrigPos.x) * dirX + (lpProj.y - lpOrigPos.y) * dirY
    const delta = -Math.round(movement / spacing)
    const finalCount = Math.max(1, origRowData.count + delta)

    if (idx === 0) {
      rowData.x = origRowData.x + ux * delta * spacing
      rowData.y = origRowData.y + uy * delta * spacing
    }
    rowData.count = finalCount

    draggingIdx = -1
    origRowData = null
    origHandle0 = null
    origHandle1 = null

    ctx.onRebuild(target, { ...rowData })
  }

  function updateHandlePositions(): void {
    if (!rowData || handles.length < 2) return
    const { x, y, ux, uy, count, spacing } = rowData
    const r = seatRadius
    const lastIdx = count - 1
    const wp0 = toWorldSpace(x - ux * r, y - uy * r)
    const wp1 = toWorldSpace(x + ux * spacing * lastIdx + ux * r, y + uy * spacing * lastIdx + uy * r)
    handles[0].x = wp0.x
    handles[0].y = wp0.y
    handles[1].x = wp1.x
    handles[1].y = wp1.y
  }

  function updateHandleSize(): void {
    const s = Math.max(ctx.getS(), 0.02)
    const size = 6 / s
    const strokeW = 1 / s
    handles.forEach(h => {
      h.width = size
      h.height = size
      h.strokeWidth = strokeW
    })
  }

  return {
    isEditing,
    enter,
    exit,
    getTarget: () => target,
    getHandles: () => handles,
    getRowData: () => rowData,
    updateHandlePositions,
    updateHandleSize,
  }
}
