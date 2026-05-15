import type { Seat, PathPoint } from '../types'

/**
 * 计算弧形排的座位位置
 */
export function calculateCurvedPositions(
  seats: Seat[],
  curve: number
): Array<{ x: number; y: number }> {
  if (!curve || curve === 0 || seats.length < 2) {
    return seats.map(seat => ({ x: seat.x, y: seat.y }))
  }

  const count = seats.length
  const firstSeat = seats[0]
  const lastSeat = seats[count - 1]

  const dx = lastSeat.x - firstSeat.x
  const dy = lastSeat.y - firstSeat.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const baseAngle = Math.atan2(dy, dx)

  const maxCurveAngle = curve * (Math.PI / 180)
  const chordLength = length
  const curveAngle = Math.abs(maxCurveAngle)
  const radius = curveAngle > 0.001
    ? chordLength / (2 * Math.sin(curveAngle / 2))
    : Infinity

  const midX = (firstSeat.x + lastSeat.x) / 2
  const midY = (firstSeat.y + lastSeat.y) / 2

  const perpX = -Math.sin(baseAngle) * (curve > 0 ? 1 : -1)
  const perpY = Math.cos(baseAngle) * (curve > 0 ? 1 : -1)

  const centerX = midX + perpX * Math.sqrt(
    Math.max(0, radius * radius - (chordLength / 2) * (chordLength / 2))
  )
  const centerY = midY + perpY * Math.sqrt(
    Math.max(0, radius * radius - (chordLength / 2) * (chordLength / 2))
  )

  const startAngle = Math.atan2(firstSeat.y - centerY, firstSeat.x - centerX)
  const endAngle = Math.atan2(lastSeat.y - centerY, lastSeat.x - centerX)
  const angleStep = (endAngle - startAngle) / (count - 1)

  return seats.map((_, index) => {
    const angle = startAngle + angleStep * index
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
