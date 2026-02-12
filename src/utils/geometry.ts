import type { Point, Rect } from '../types'

/**
 * 几何计算工具函数
 */

/** 计算两点之间的距离 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

/** 计算两点之间的角度（弧度） */
export function angle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}

/** 点绕中心旋转 */
export function rotatePoint(point: Point, center: Point, rotation: number): Point {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const dx = point.x - center.x
  const dy = point.y - center.y
  
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  }
}

/** 对齐到网格 */
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  }
}

/** 检查点是否在矩形内 */
export function pointInRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && 
         point.x <= rect.x + rect.width &&
         point.y >= rect.y && 
         point.y <= rect.y + rect.height
}

/** 检查两个矩形是否相交 */
export function rectIntersect(r1: Rect, r2: Rect): boolean {
  return !(r2.x > r1.x + r1.width ||
           r2.x + r2.width < r1.x ||
           r2.y > r1.y + r1.height ||
           r2.y + r2.height < r1.y)
}

/** 计算矩形的中心点 */
export function rectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  }
}

/** 将屏幕坐标转换为 SVG 坐标 */
export function screenToSvg(
  screenPoint: Point, 
  svgElement: SVGSVGElement
): Point {
  const point = svgElement.createSVGPoint()
  point.x = screenPoint.x
  point.y = screenPoint.y
  const svgPoint = point.matrixTransform(svgElement.getScreenCTM()?.inverse())
  return { x: svgPoint.x, y: svgPoint.y }
}

/** 生成弧形排座位位置 */
export function generateArcSeats(
  center: Point,
  radius: number,
  startAngle: number,
  endAngle: number,
  count: number
): Point[] {
  const points: Point[] = []
  const angleStep = (endAngle - startAngle) / (count - 1)
  
  for (let i = 0; i < count; i++) {
    const angle = startAngle + angleStep * i
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    })
  }
  
  return points
}

/** 计算排的对齐角度 */
export function calculateRowAngle(seats: Point[]): number {
  if (seats.length < 2) return 0
  const first = seats[0]
  const last = seats[seats.length - 1]
  return Math.atan2(last.y - first.y, last.x - first.x)
}
