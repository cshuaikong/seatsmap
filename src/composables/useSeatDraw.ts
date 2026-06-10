import { Ellipse, Line, Text, Group } from 'leafer-ui'

const SEAT_SPACING = 18
const ROW_SPACING = 24
const SEAT_RADIUS = 6
const CLOSE_THRESHOLD = 15

const PREVIEW_FILL = 'rgba(59,130,246,0.18)'
const PREVIEW_STROKE = 'rgba(59,130,246,0.45)'
const PREVIEW_LABEL = 'rgba(59,130,246,0.55)'
const MULTI_STROKE = 'rgba(255,152,0,0.50)'
const MULTI_LABEL = 'rgba(0,0,0,0.50)'

function getUnitVector(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 0.001) return { ux: 1, uy: 0, dist: 0 }
  return { ux: dx / dist, uy: dy / dist, dist }
}

export interface SeatDrawCtx {
  getLeafer: () => any
  getEditor: () => any
  getCanvas: () => HTMLCanvasElement | null
  getAllPaths: () => any[]
  getS: () => number
  setPanEnabled: (v: boolean) => void
  onFinish: (data: { tool: string; rows: SeatDrawRowData[] }) => void
  onToolChange: (tool: string) => void
}

export interface SeatDrawRowData {
  x: number
  y: number
  ux: number
  uy: number
  count: number
  spacing: number
}

export function useSeatDraw(ctx: SeatDrawCtx) {
  // ---- pool ----
  let previewGroup: Group | null = null
  let poolE: Ellipse[] = []
  let poolL: Line[] = []
  let poolT: Text[] = []
  let usedE = 0
  let usedL = 0
  let usedT = 0

  function acquireE(): Ellipse {
    if (usedE < poolE.length) { const e = poolE[usedE]; e.visible = true; usedE++; return e }
    const e = new Ellipse({ around: 'center' })
    previewGroup?.add(e)
    poolE.push(e)
    usedE++
    return e
  }
  function acquireL(): Line {
    if (usedL < poolL.length) { const l = poolL[usedL]; l.visible = true; usedL++; return l }
    const l = new Line()
    previewGroup?.add(l)
    poolL.push(l)
    usedL++
    return l
  }
  function acquireT(): Text {
    if (usedT < poolT.length) { const t = poolT[usedT]; t.visible = true; usedT++; return t }
    const t = new Text()
    previewGroup?.add(t)
    poolT.push(t)
    usedT++
    return t
  }
  function hideAll() {
    for (let i = 0; i < usedE; i++) poolE[i].visible = false
    for (let i = 0; i < usedL; i++) poolL[i].visible = false
    for (let i = 0; i < usedT; i++) poolT[i].visible = false
  }
  function resetFrame() { hideAll(); usedE = 0; usedL = 0; usedT = 0 }
  function clearPools() {
    previewGroup?.remove()
    previewGroup = null
    poolE = []; poolL = []; poolT = []
    usedE = 0; usedL = 0; usedT = 0
  }

  // ---- state ----
  let engaged = false
  let step: 'idle' | 'first' | 'second' = 'idle'
  let startPos: { x: number; y: number } | null = null
  let endPos: { x: number; y: number } | null = null
  let baseScale: number | null = null

  function getBaseScale(): number {
    return baseScale ?? ctx.getS()
  }

  function lockBaseScale(): void {
    if (baseScale === null) {
      baseScale = Math.round(ctx.getS() * 100) / 100
    }
  }

  function logicalSize(visual: number): number {
    return visual / Math.max(getBaseScale(), 0.02)
  }

  // ---- common ----
  function enterCommon(_tool: 'seat-row' | 'seat-section' | 'seat-diagonal') {
    engaged = true
    step = 'idle'
    startPos = null
    endPos = null
    const allPaths = ctx.getAllPaths()
    allPaths.forEach((p: any) => { p.hittable = false })
    const editor = ctx.getEditor()
    if (editor) (editor as any).hittable = false
    editor?.cancel()
    ctx.setPanEnabled(false)
    const canvas = ctx.getCanvas()
    if (canvas) canvas.style.cursor = 'crosshair'
    previewGroup = new Group({ hittable: false, zIndex: 9999 })
    ctx.getLeafer()?.add(previewGroup)
  }

  function exitCommon() {
    engaged = false
    clearPools()
    step = 'idle'
    startPos = null
    endPos = null
    const allPaths = ctx.getAllPaths()
    allPaths.forEach((p: any) => { p.hittable = true })
    const editor = ctx.getEditor()
    if (editor) (editor as any).hittable = true
    ctx.setPanEnabled(true)
    const canvas = ctx.getCanvas()
    if (canvas) canvas.style.cursor = ''
  }

  function isActive() { return engaged }

  // ---- cursor dot ----
  function showCursor(x: number, y: number) {
    resetFrame()
    const d = acquireE()
    d.set({ x, y, width: 8, height: 8, fill: PREVIEW_STROKE, stroke: '' })
  }

  // ---- seat row preview ----
  function showRowPreview(sx: number, sy: number, ex: number, ey: number) {
    resetFrame()
    const { ux, uy, dist } = getUnitVector({ x: sx, y: sy }, { x: ex, y: ey })
    const spacing = logicalSize(SEAT_SPACING)
    const radius = logicalSize(SEAT_RADIUS)
    const size = radius * 2
    const count = Math.max(1, Math.round(dist / spacing))
    const pts: number[] = []

    for (let i = 0; i < count; i++) {
      const px = sx + ux * spacing * i
      const py = sy + uy * spacing * i
      pts.push(px, py)
      const d = acquireE()
      d.set({ x: px, y: py, width: size, height: size, fill: PREVIEW_FILL, stroke: PREVIEW_STROKE, strokeWidth: 1 })
    }
    const line = acquireL()
    line.set({ points: pts, stroke: PREVIEW_STROKE, strokeWidth: size, strokeCap: 'round', opacity: 0.8 })
    const mx = sx + (ex - sx) / 2
    const my = sy + (ey - sy) / 2
    const label = acquireT()
    label.set({ x: mx, y: my - 7, text: String(count), fontSize: 14, fill: PREVIEW_LABEL, textAlign: 'center' })
  }

  // ---- multi-row preview ----
  function showMultiRowPreview(px: number, py: number) {
    if (!startPos || !endPos) return
    resetFrame()
    const { ux, uy, dist } = getUnitVector(startPos, endPos)
    const spacing = logicalSize(SEAT_SPACING)
    const rowSpacing = logicalSize(ROW_SPACING)
    const radius = logicalSize(SEAT_RADIUS)
    const size = radius * 2
    const count = Math.max(1, Math.round(dist / spacing))
    const perpX = -uy; const perpY = ux
    const depthX = px - startPos.x; const depthY = py - startPos.y
    const depthSign = depthX * perpX + depthY * perpY
    const rowCount = Math.max(1, Math.round(Math.abs(depthSign) / rowSpacing))
    const actualPerpX = depthSign > 0 ? perpX : -perpX
    const actualPerpY = depthSign > 0 ? perpY : -perpY

    for (let r = 0; r < rowCount; r++) {
      const ox = actualPerpX * rowSpacing * r
      const oy = actualPerpY * rowSpacing * r
      const pts: number[] = []
      for (let i = 0; i < count; i++) {
        const sx = startPos.x + ux * spacing * i + ox
        const sy = startPos.y + uy * spacing * i + oy
        pts.push(sx, sy)
        const d = acquireE()
        d.set({ x: sx, y: sy, width: size, height: size, fill: PREVIEW_FILL, stroke: MULTI_STROKE, strokeWidth: 1 })
      }
      const line = acquireL()
      line.set({ points: pts, stroke: MULTI_STROKE, strokeWidth: size, strokeCap: 'round', opacity: 0.8 })
    }
    const total = count * rowCount
    const cx = startPos.x + depthX / 2 + actualPerpX * rowSpacing * (rowCount - 1) / 2
    const cy = startPos.y + depthY / 2 + actualPerpY * rowSpacing * (rowCount - 1) / 2
    const label = acquireT()
    label.set({ x: cx, y: cy - 7, text: `${count}×${rowCount} = ${total}座`, fontSize: 14, fill: MULTI_LABEL, textAlign: 'center' })
  }

  // ---- submit helpers ----
  function buildRowData(sx: number, sy: number, ex: number, ey: number): SeatDrawRowData {
    const { ux, uy, dist } = getUnitVector({ x: sx, y: sy }, { x: ex, y: ey })
    const spacing = logicalSize(SEAT_SPACING)
    const count = Math.max(1, Math.round(dist / spacing))
    return { x: sx, y: sy, ux, uy, count, spacing }
  }

  function lastSeatPos(row: SeatDrawRowData): { x: number; y: number } {
    const lastIdx = row.count - 1
    return {
      x: row.x + row.ux * row.spacing * lastIdx,
      y: row.y + row.uy * row.spacing * lastIdx,
    }
  }

  // ==================== seat-row ====================

  function seatRowClick(x: number, y: number): boolean {
    if (step === 'idle') {
      step = 'first'
      startPos = { x, y }
      showCursor(x, y)
      return true
    }
    if (step === 'first' && startPos) {
      const row = buildRowData(startPos.x, startPos.y, x, y)
      lockBaseScale()
      ctx.onFinish({ tool: 'seat-row', rows: [row] })
      exitCommon()
      enterCommon('seat-row')
      return true
    }
    return false
  }

  function seatRowMove(x: number, y: number) {
    if (step === 'first' && startPos) {
      showRowPreview(startPos.x, startPos.y, x, y)
    }
  }

  // ==================== seat-section ====================

  function seatSectionClick(x: number, y: number): boolean {
    if (step === 'idle') {
      step = 'first'
      startPos = { x, y }
      showCursor(x, y)
      return true
    }
    if (step === 'first' && startPos) {
      const dist = Math.hypot(x - startPos.x, y - startPos.y)
      if (dist < CLOSE_THRESHOLD) {
        exitCommon()
        enterCommon('seat-section')
        return true
      }
      const row = buildRowData(startPos.x, startPos.y, x, y)
      lockBaseScale()
      ctx.onFinish({ tool: 'seat-section', rows: [row] })
      const lp = lastSeatPos(row)
      startPos = lp
      showCursor(lp.x, lp.y)
      return true
    }
    return false
  }

  function seatSectionMove(x: number, y: number) {
    if (step === 'first' && startPos) {
      showRowPreview(startPos.x, startPos.y, x, y)
    }
  }

  // ==================== seat-diagonal ====================

  function seatDiagonalClick(x: number, y: number): boolean {
    if (step === 'idle') {
      step = 'first'
      startPos = { x, y }
      showCursor(x, y)
      return true
    }
    if (step === 'first') {
      step = 'second'
      endPos = { x, y }
      showMultiRowPreview(x, y)
      return true
    }
    if (step === 'second' && startPos && endPos) {
      const { ux, uy, dist } = getUnitVector(startPos, endPos)
      const spacing = logicalSize(SEAT_SPACING)
      const rowSpacing = logicalSize(ROW_SPACING)
      const count = Math.max(1, Math.round(dist / spacing))
      const perpX = -uy; const perpY = ux
      const depthX = x - startPos.x; const depthY = y - startPos.y
      const depthSign = depthX * perpX + depthY * perpY
      const rowCount = Math.max(1, Math.round(Math.abs(depthSign) / rowSpacing))
      const actualPerpX = depthSign > 0 ? perpX : -perpX
      const actualPerpY = depthSign > 0 ? perpY : -perpY

      const rows: SeatDrawRowData[] = []
      for (let r = 0; r < rowCount; r++) {
        rows.push({
          x: startPos.x + actualPerpX * rowSpacing * r,
          y: startPos.y + actualPerpY * rowSpacing * r,
          ux, uy, count, spacing,
        })
      }
      lockBaseScale()
      ctx.onFinish({ tool: 'seat-diagonal', rows })
      exitCommon()
      enterCommon('seat-diagonal')
      return true
    }
    return false
  }

  function seatDiagonalMove(x: number, y: number) {
    if (step === 'first' && startPos) {
      showRowPreview(startPos.x, startPos.y, x, y)
    } else if (step === 'second') {
      showMultiRowPreview(x, y)
    }
  }

  // ==================== handlers ====================

  const seatRow = {
    enter: () => enterCommon('seat-row'),
    exit: exitCommon,
    onClick: (x: number, y: number) => seatRowClick(x, y),
    onMove: (x: number, y: number) => seatRowMove(x, y),
    isActive,
  }

  const seatSection = {
    enter: () => enterCommon('seat-section'),
    exit: exitCommon,
    onClick: (x: number, y: number) => seatSectionClick(x, y),
    onMove: (x: number, y: number) => seatSectionMove(x, y),
    isActive,
  }

  const seatDiagonal = {
    enter: () => enterCommon('seat-diagonal'),
    exit: exitCommon,
    onClick: (x: number, y: number) => seatDiagonalClick(x, y),
    onMove: (x: number, y: number) => seatDiagonalMove(x, y),
    isActive,
  }

  return { seatRow, seatSection, seatDiagonal, getBaseScale, resetBaseScale: () => { baseScale = null } }
}
