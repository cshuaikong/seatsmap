import { ref } from 'vue'
import { Rect, DragEvent } from 'leafer-ui'
import type { SeatDrawRowData } from './useSeatDraw'

export interface SeatVertexEditCtx {
  getLeafer: () => any
  getEditor: () => any
  getAllPaths: () => any[]
  getS: () => number
  setPanEnabled: (v: boolean) => void
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

    const sx = x - ux * r
    const sy = y - uy * r
    const ex = x + ux * spacing * lastIdx + ux * r
    const ey = y + uy * spacing * lastIdx + uy * r

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

    const h0 = new Rect({ ...handleBase, x: sx, y: sy })
    ;(h0 as any).__seatHandleIdx = 0
    h0.on_(DragEvent.DRAG, () => onHandleDrag(0))
    h0.on_(DragEvent.END, () => onHandleDragEnd(0))
    leafer.add(h0)
    handles.push(h0)

    const h1 = new Rect({ ...handleBase, x: ex, y: ey })
    ;(h1 as any).__seatHandleIdx = 1
    h1.on_(DragEvent.DRAG, () => onHandleDrag(1))
    h1.on_(DragEvent.END, () => onHandleDragEnd(1))
    leafer.add(h1)
    handles.push(h1)
  }

  /** 获取手柄投影到方向线上的位置（不修改手柄，只返回约束后的坐标） */
  function projectedHandle(idx: number): { x: number; y: number } {
    if (!rowData || handles.length < 2) return { x: 0, y: 0 }
    const { ux, uy } = rowData
    const hDragged = handles[idx]
    const hAnchor = handles[1 - idx]

    const dx = hDragged.x! - hAnchor.x!
    const dy = hDragged.y! - hAnchor.y!
    const dirSign = idx === 0 ? -1 : 1
    let t = (dx * ux + dy * uy) * dirSign
    t = Math.max(0, t)

    return {
      x: hAnchor.x! + ux * dirSign * t,
      y: hAnchor.y! + uy * dirSign * t,
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

    // 连续 bar 端点（跟随手柄，无跳动）
    let barStartX: number, barStartY: number
    let barEndX: number, barEndY: number

    if (idx === 0) {
      barStartX = proj.x + ux * r
      barStartY = proj.y + uy * r
      barEndX = anchor.x! - ux * r
      barEndY = anchor.y! - uy * r
    } else {
      barStartX = anchor.x! + ux * r
      barStartY = anchor.y! + uy * r
      barEndX = proj.x - ux * r
      barEndY = proj.y - uy * r
    }

    // 增量 count：手柄从原始位置沿朝向座位方向移动的距离 → 增减座位数
    const origPos = idx === 0 ? origHandle0! : origHandle1!
    // 从手柄指向座位的方向
    const dirX = idx === 0 ? ux : -ux
    const dirY = idx === 0 ? uy : -uy
    const movement = (proj.x - origPos.x) * dirX + (proj.y - origPos.y) * dirY
    const delta = -Math.round(movement / spacing)
    const newCount = Math.max(1, origRowData!.count + delta)

    rowData.x = barStartX
    rowData.y = barStartY
    rowData.count = newCount

    const endCenter = { x: barEndX, y: barEndY }
    ctx.onRebuild(target, { ...rowData }, endCenter, idx === 0)
  }

  function onHandleDragEnd(idx: number): void {
    if (!rowData || !origRowData || handles.length < 2) return

    const { ux, uy, spacing } = rowData

    // 吸附手柄到约束位置
    const proj = projectedHandle(idx)
    handles[idx].x = proj.x
    handles[idx].y = proj.y

    // 计算最终 delta，对齐位置
    const origPos = idx === 0 ? origHandle0! : origHandle1!
    const dirX = idx === 0 ? ux : -ux
    const dirY = idx === 0 ? uy : -uy
    const movement = (proj.x - origPos.x) * dirX + (proj.y - origPos.y) * dirY
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
    handles[0].x = x - ux * r
    handles[0].y = y - uy * r
    handles[1].x = x + ux * spacing * lastIdx + ux * r
    handles[1].y = y + uy * spacing * lastIdx + uy * r
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
