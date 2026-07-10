import type { Seat, PathPoint, Section } from '../types'

// ==================== 几何检测常量 ====================

/** 边框命中阈值 (世界坐标)，对应屏幕约 10px */
const BORDER_HIT_RADIUS = 4

/** 弧边采样点数 */
const ARC_SAMPLE_COUNT = 12

// ==================== 几何检测工具 ====================

export interface AABB {
  x: number
  y: number
  width: number
  height: number
}

/** 点到线段的距离 */
function distToSegment(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-12) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** 获取弧边圆参数: { cx, cy, r, startAngle, endAngle }，null 表示无法计算 */
function getArcGeometry(
  ax: number, ay: number, bx: number, by: number, depth: number,
): { cx: number; cy: number; r: number; startAngle: number; endAngle: number } | null {
  const dx = bx - ax
  const dy = by - ay
  const L = Math.hypot(dx, dy)
  if (L < 1e-9) return null

  const halfChord = L / 2
  const sagitta = L * Math.abs(depth) * 0.5
  const R = Math.max(
    (sagitta * sagitta + halfChord * halfChord) / (2 * Math.max(sagitta, 0.001)),
    halfChord,
  )
  const h = Math.sqrt(Math.max(0, R * R - halfChord * halfChord))
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2

  // 右法线: (dy/L, -dx/L)；左法线: (-dy/L, dx/L)
  // depth>0 sweepFlag=1 时圆心在右法线侧，depth<0 sweepFlag=0 时圆心在左法线侧
  const sign = depth > 0 ? 1 : -1
  const cx = mx + sign * (dy / L) * h
  const cy = my + sign * (-dx / L) * h

  const startAngle = Math.atan2(ay - cy, ax - cx)
  const endAngle = Math.atan2(by - cy, bx - cx)

  return { cx, cy, r: R, startAngle, endAngle }
}

/** 采样弧边上的点 */
function sampleArcPoints(arc: ReturnType<typeof getArcGeometry>, count: number, _depth: number): Array<{ x: number; y: number }> {
  if (!arc) return []
  const { cx, cy, r, startAngle, endAngle } = arc

  let delta = endAngle - startAngle
  // 始终走短弧方向
  if (delta > Math.PI) delta -= Math.PI * 2
  else if (delta < -Math.PI) delta += Math.PI * 2

  const points: Array<{ x: number; y: number }> = []
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1)
    const angle = startAngle + delta * t
    points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
  }
  return points
}

// ==================== 公开几何函数 ====================

/** 获取分区在 world-space 的包围盒，无边框返回 null */
export function getSectionAABB(section: Section): AABB | null {
  const bx = section.x ?? 0
  const by = section.y ?? 0

  switch (section.type) {
    case 'rect':
      return { x: bx, y: by, width: section.width ?? 100, height: section.height ?? 100 }
    case 'ellipse': {
      const rx = section.radiusX ?? 50
      const ry = section.radiusY ?? 50
      return { x: bx, y: by, width: rx * 2, height: ry * 2 }
    }
    case 'path':
      if (!section.pathPoints || section.pathPoints.length < 3) return null
      return _pathPointsAABB(section.pathPoints, bx, by)
    default:
      return null
  }
}

/** 检测 worldPos 是否在分区边框内部 */
export function isInsideSection(section: Section, worldPos: { x: number; y: number }): boolean {
  const bx = section.x ?? 0
  const by = section.y ?? 0
  const px = worldPos.x
  const py = worldPos.y

  switch (section.type) {
    case 'rect':
      return px >= bx && px <= bx + (section.width ?? 100)
          && py >= by && py <= by + (section.height ?? 100)
    case 'ellipse': {
      const rx = section.radiusX ?? 50
      const ry = section.radiusY ?? 50
      const cx = bx + rx
      const cy = by + ry
      const dx = (px - cx) / rx
      const dy = (py - cy) / ry
      return dx * dx + dy * dy <= 1
    }
    case 'path':
      if (!section.pathPoints || section.pathPoints.length < 3) return false
      return _pathPolygonContains(section.pathPoints, bx, by, px, py)
    default:
      return false
  }
}

/** 检测 worldPos 是否靠近分区边框（用于双击进入顶点编辑），threshold = BORDER_HIT_RADIUS / scale */
export function isNearSectionBorder(section: Section, worldPos: { x: number; y: number }): boolean {
  const bx = section.x ?? 0
  const by = section.y ?? 0
  const px = worldPos.x
  const py = worldPos.y
  const threshold = BORDER_HIT_RADIUS

  switch (section.type) {
    case 'rect':
      return _isNearRectBorder(section, bx, by, px, py, threshold)
    case 'ellipse':
      return _isNearEllipseBorder(section, bx, by, px, py, threshold)
    case 'path':
      if (!section.pathPoints || section.pathPoints.length < 3) return false
      return _isNearPathBorder(section.pathPoints, bx, by, px, py, threshold)
    default:
      return false
  }
}

// ==================== 内部辅助函数 ====================

function _pathPointsAABB(pts: PathPoint[], ox: number, oy: number): AABB {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pts) {
    const wx = ox + p.x
    const wy = oy + p.y
    if (wx < minX) minX = wx
    if (wy < minY) minY = wy
    if (wx > maxX) maxX = wx
    if (wy > maxY) maxY = wy
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** 射线法检测点在多边形内 (PathPoint[], world-space) */
function _pathPolygonContains(pts: PathPoint[], ox: number, oy: number, px: number, py: number): boolean {
  let inside = false
  const n = pts.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ox + pts[i].x
    const yi = oy + pts[i].y
    const xj = ox + pts[j].x
    const yj = oy + pts[j].y
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** 点到 rect 四条边的最近距离 */
function _isNearRectBorder(
  _section: Section, bx: number, by: number, px: number, py: number, threshold: number,
): boolean {
  const w = _section.width ?? 100
  const h = _section.height ?? 100
  // 先排除远离 AABB 的点
  if (px < bx - threshold || px > bx + w + threshold || py < by - threshold || py > by + h + threshold) return false

  const edges = [
    [bx, by, bx + w, by],
    [bx + w, by, bx + w, by + h],
    [bx + w, by + h, bx, by + h],
    [bx, by + h, bx, by],
  ]
  for (const [ax, ay, bx2, by2] of edges) {
    if (distToSegment(px, py, ax, ay, bx2, by2) < threshold) return true
  }
  return false
}

/** 点到 ellipse 边界的近似距离 */
function _isNearEllipseBorder(
  section: Section, _bx: number, _by: number, px: number, py: number, threshold: number,
): boolean {
  const rx = section.radiusX ?? 50
  const ry = section.radiusY ?? 50
  const cx = _bx + rx
  const cy = _by + ry

  // 先快速排除远离 AABB 的点
  if (px < cx - rx - threshold || px > cx + rx + threshold || py < cy - ry - threshold || py > cy + ry + threshold) return false

  const dx = px - cx
  const dy = py - cy
  // 投影到椭圆边界
  const angle = Math.atan2(dy, dx)
  const ex = cx + rx * Math.cos(angle)
  const ey = cy + ry * Math.sin(angle)
  return Math.hypot(px - ex, py - ey) < threshold
}

/** 点到 path 各边的最近距离（含弧边采样） */
function _isNearPathBorder(
  pts: PathPoint[], ox: number, oy: number, px: number, py: number, threshold: number,
): boolean {
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const ax = ox + a.x
    const ay = oy + a.y
    const bx = ox + b.x
    const by = oy + b.y
    const ad = a.arcDepth ?? 0

    if (Math.abs(ad) < 0.005) {
      if (distToSegment(px, py, ax, ay, bx, by) < threshold) return true
    } else {
      const arc = getArcGeometry(ax, ay, bx, by, ad)
      const samples = sampleArcPoints(arc, ARC_SAMPLE_COUNT, ad)
      for (const s of samples) {
        if (Math.hypot(px - s.x, py - s.y) < threshold) return true
      }
      for (let j = 1; j < samples.length; j++) {
        if (distToSegment(px, py, samples[j - 1].x, samples[j - 1].y, samples[j].x, samples[j].y) < threshold) return true
      }
    }
  }
  return false
}

/**
 * 计算弧形排的座位位置
 * 每个座位根据其原始位置在弦上的比例映射到弧线上，保留原始间距关系
 */
export function calculateCurvedPositions(
  seats: Seat[],
  curve: number
): Array<{ x: number; y: number }> {
  if (!curve || curve === 0 || seats.length < 2) {
    return seats.map(seat => ({ x: seat.x, y: seat.y }))
  }

  // 找出排的左右极值座位（按 x 坐标）
  const sorted = [...seats].sort((a, b) => (a.x || 0) - (b.x || 0))
  const firstSeat = sorted[0]
  const lastSeat = sorted[sorted.length - 1]

  const dx = lastSeat.x - firstSeat.x
  const dy = lastSeat.y - firstSeat.y
  const chordLength = Math.sqrt(dx * dx + dy * dy)
  const baseAngle = Math.atan2(dy, dx)

  const maxCurveAngle = curve * (Math.PI / 180)
  const curveAngle = Math.abs(maxCurveAngle)
  const radius = curveAngle > 0.001
    ? chordLength / (2 * Math.sin(curveAngle / 2))
    : Infinity

  const midX = (firstSeat.x + lastSeat.x) / 2
  const midY = (firstSeat.y + lastSeat.y) / 2

  const perpX = -Math.sin(baseAngle) * (curve > 0 ? 1 : -1)
  const perpY = Math.cos(baseAngle) * (curve > 0 ? 1 : -1)

  const sagitta = Math.sqrt(
    Math.max(0, radius * radius - (chordLength / 2) * (chordLength / 2))
  )
  const centerX = midX + perpX * sagitta
  const centerY = midY + perpY * sagitta

  const startAngle = Math.atan2(firstSeat.y - centerY, firstSeat.x - centerX)
  const endAngle = Math.atan2(lastSeat.y - centerY, lastSeat.x - centerX)
  let delta = endAngle - startAngle
  // 始终走短弧方向
  if (delta > Math.PI) delta -= Math.PI * 2
  else if (delta < -Math.PI) delta += Math.PI * 2

  // 每个座位按其原始位置在弦上的比例映射到弧线（保序，保留间距关系）
  return seats.map(seat => {
    const sx = seat.x - firstSeat.x
    const sy = seat.y - firstSeat.y
    const proj = sx * Math.cos(baseAngle) + sy * Math.sin(baseAngle)
    const t = chordLength > 0 ? Math.max(0, Math.min(1, proj / chordLength)) : 0
    const angle = startAngle + delta * t
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    }
  })
}

/** 判断路径边是否为弧线 */
export function isCurvedEdge(point: PathPoint): boolean {
  return point.type === 'arc' && Math.abs(point.arcDepth ?? 0) > 0.0001
}

/** 创建一段 SVG 弧线 */
export function createArcSegment(
  start: PathPoint,
  end: PathPoint,
  depth: number
): string {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy) || 1

  const sagitta = length * Math.abs(depth) * 0.5
  const halfChord = length / 2
  let radius = (sagitta * sagitta + halfChord * halfChord) / (2 * Math.max(sagitta, 0.001))
  radius = Math.max(radius, halfChord)

  const sweepFlag = depth > 0 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${end.x} ${end.y}`
}

/** 将 flat number[] + arcDepths 转为 PathPoint[] */
export function flatToPathPoints(points: number[], arcDepths?: number[]): PathPoint[] {
  const result: PathPoint[] = []
  const n = points.length / 2
  for (let i = 0; i < n; i++) {
    const ad = arcDepths?.[i] ?? 0
    result.push({
      x: points[i * 2],
      y: points[i * 2 + 1],
      type: Math.abs(ad) > 0.005 ? 'arc' : 'line',
      arcDepth: ad,
    })
  }
  return result
}

/** 检查 arcDepths 是否有非零值 */
export function hasArcs(arcDepths?: number[]): boolean {
  if (!arcDepths || arcDepths.length === 0) return false
  return arcDepths.some(v => Math.abs(v) > 0.005)
}

/** 将路径点数组转为 SVG Path 数据 */
export function pathPointsToSvgPath(points: PathPoint[]): string {
  if (points.length < 2) return ''

  let path = `M ${points[0].x} ${points[0].y}`

  points.forEach((start, index) => {
    const end = points[(index + 1) % points.length]

    if (isCurvedEdge(start)) {
      path += ' ' + createArcSegment(start, end, start.arcDepth ?? 0)
        .replace(`M ${start.x} ${start.y} `, '')
    } else {
      path += ` L ${end.x} ${end.y}`
    }
  })

  path += ' Z'
  return path
}

/** 解析 SVG path d 字符串，计算包围盒中心 */
export function getSvgPathCenter(d: string): { cx: number; cy: number } | null {
  if (!d) return null

  const cmdRe = /([MLQCAmkqcalvhtHVTsSzZ])\s*([^MLQCAmkqcalvhtHVTsSzZ]*)/g
  let match
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let curX = 0, curY = 0

  while ((match = cmdRe.exec(d)) !== null) {
    const rawCmd = match[1]
    const args = match[2].trim()
    const cmd = rawCmd.toUpperCase()
    const rel = rawCmd === rawCmd.toLowerCase()

    if (!args) {
      if (cmd === 'Z') { minX = Math.min(minX, curX); maxX = Math.max(maxX, curX); minY = Math.min(minY, curY); maxY = Math.max(maxY, curY) }
      continue
    }

    const nums = args.split(/[,\s]+/).filter(s => s.length > 0).map(Number)
    let i = 0
    const take = (): number => nums[i++] ?? 0

    const pt = (x: number, y: number) => {
      if (rel) { curX += x; curY += y } else { curX = x; curY = y }
      minX = Math.min(minX, curX); maxX = Math.max(maxX, curX)
      minY = Math.min(minY, curY); maxY = Math.max(maxY, curY)
    }

    switch (cmd) {
      case 'M':
        pt(take(), take())
        while (i + 1 < nums.length) pt(take(), take())
        break
      case 'L':
        while (i + 1 < nums.length) pt(take(), take())
        break
      case 'H':
        while (i < nums.length) { const x = take(); if (rel) curX += x; else curX = x; minX = Math.min(minX, curX); maxX = Math.max(maxX, curX) }
        break
      case 'V':
        while (i < nums.length) { const y = take(); if (rel) curY += y; else curY = y; minY = Math.min(minY, curY); maxY = Math.max(maxY, curY) }
        break
      case 'C':
        while (i + 5 < nums.length) { i += 4; pt(take(), take()) }
        break
      case 'Q':
        while (i + 3 < nums.length) { i += 2; pt(take(), take()) }
        break
      case 'A':
        while (i + 6 < nums.length) { i += 5; pt(take(), take()) }
        break
    }
  }

  if (minX === Infinity) return null
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}
