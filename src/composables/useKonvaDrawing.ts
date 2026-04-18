/**
 * @file useKonvaDrawing.ts
 * @brief Konva 画布绘制功能 Composable - 简化版
 * 
 * 所有绘制功能使用模块级共享状态，不依赖 Vue 响应式
 * 这样可以被旧代码直接调用，无需通过 composable 包装
 */

import Konva from 'konva'
import type { Position, Seat, SeatRow, PathPoint } from '../types'
import { defaultSeatMapConfig } from '../types'
import { generateId } from '../utils/id'
import { useVenueStore } from '../stores/venueStore'

// ==================== 类型定义（从 useDrawing 合并）====================

// 绘制工具模式
export type DrawingToolMode =
  | 'select'
  | 'selectseat'
  | 'pan'
  | 'draw_seat'
  | 'row-straight'
  | 'section'
  | 'section-diagonal'
  | 'draw_rect'
  | 'draw_ellipse'
  | 'draw_polygon'
  | 'draw_polyline'
  | 'draw_sector'
  | 'draw_text'
  | 'draw_area'

// 兼容旧代码的 ToolMode（保留所有旧值）
export type ToolMode =
  | 'select' | 'pan'
  | 'single-seat'
  | 'row-straight'
  | 'section'
  | 'section-diagonal'
  | 'drawCircle' | 'drawRect' | 'drawPolygon' | 'drawPolyline' | 'drawSector'
  | 'text' | 'image'
  | 'drawRow' | 'drawSegmentRow' | 'drawMultiRow' | 'selectseat'
  | 'drawLine' | 'restroom' | 'drawRoundTable'
  | 'seat' | 'row' | 'section-old' | 'booth' | 'table' | 'shape' | 'stage'
  | 'drawSeat' | 'drawFreehand' | 'drawLineRow' | 'drawArcRow' | 'drawText' | 'drawStage'
  | DrawingToolMode

// 绘制步骤
export type DrawStep = 'idle' | 'first' | 'second' | 'third'

// 绘制状态
export type DrawingState = 'idle' | 'placingSeat' | 'dragging' | 'drawing'

// 预览状态
export interface DrawingPreviewState {
  isActive: boolean
  startPos: Position | null
  currentPos: Position | null
  points: Position[]
}

// ==================== 几何工具函数（从 useDrawing 合并）====================

/** 计算两点间的单位向量和距离 */
export function getUnitVector(from: Position, to: Position): { ux: number; uy: number; dist: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 0.001) return { ux: 1, uy: 0, dist: 0 }
  return { ux: dx / dist, uy: dy / dist, dist }
}

/** 计算两点间角度（度） */
export function getAngle(from: Position, to: Position): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return Math.atan2(dy, dx) * 180 / Math.PI
}

/** 沿方向生成座位坐标列表 */
export function generateSeatsAlongLine(
  count: number,
  startX: number,
  startY: number,
  spacing: number,
  angleDeg: number
): Position[] {
  const angleRad = (angleDeg * Math.PI) / 180
  const seats: Position[] = []
  for (let i = 0; i < count; i++) {
    seats.push({
      x: startX + Math.cos(angleRad) * spacing * i,
      y: startY + Math.sin(angleRad) * spacing * i
    })
  }
  return seats
}

/** 计算边界框 */
export function calculateBoundingBox(positions: Position[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (positions.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  positions.forEach(pos => {
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x)
    maxY = Math.max(maxY, pos.y)
  })
  return { minX, minY, maxX, maxY }
}

/** 计算多边形/路径中心点（支持 PathPoint） */
export function calculatePolygonCenter(points: PathPoint[] | Position[]): Position {
  if (points.length === 0) return { x: 0, y: 0 }
  let sumX = 0, sumY = 0
  points.forEach(p => {
    sumX += p.x
    sumY += p.y
  })
  return { x: sumX / points.length, y: sumY / points.length }
}

/** 将绝对坐标转换为相对坐标 */
export function toRelativePoints(points: PathPoint[] | Position[], center: Position): number[] {
  return points.flatMap(p => [p.x - center.x, p.y - center.y])
}

// ==================== 模块级共享状态 ====================

let _previewElements: Konva.Node[] = []
let _overlayLayer: Konva.Layer | null = null
let _currentTool: DrawingToolMode = 'select'

// 座位绘制状态
let _seatDrawStep: 'idle' | 'first' = 'idle'
let _seatDrawStartPos: Position | null = null

// 多排绘制状态（section-diagonal）
let _multiRowStep: 'idle' | 'first' | 'second' = 'idle'
let _multiRowStartPos: Position | null = null
let _multiRowEndPos: Position | null = null

// 多边形绘制状态
let _polygonPoints: PathPoint[] = []

// 矩形/椭圆拖拽状态
let _dragStartPos: Position | null = null

// ==================== 常量 ====================

const SEAT_RADIUS = defaultSeatMapConfig.defaultSeatRadius
const SEAT_SPACING = defaultSeatMapConfig.defaultSeatSpacing
const ROW_SPACING = defaultSeatMapConfig.defaultRowSpacing
const MIN_SHAPE_SIZE = 10
const SNAP_TO_START_DISTANCE = 15

// ==================== 基础工具函数 ====================

/** 设置预览层（必须在初始化时调用） */
export function setPreviewLayer(layer: Konva.Layer | null) {
  _overlayLayer = layer
}

/** 设置当前工具 */
export function setDrawingTool(tool: DrawingToolMode) {
  _currentTool = tool
  resetDrawingState()
}

/** 获取当前工具 */
export function getCurrentTool(): DrawingToolMode {
  return _currentTool
}

/** 判断是否处于绘制模式 */
export function isDrawingMode(): boolean {
  const drawingTools: DrawingToolMode[] = [
    'draw_seat', 'row-straight', 'section', 'section-diagonal',
    'draw_rect', 'draw_ellipse', 'draw_polygon',
    'draw_polyline', 'draw_sector', 'draw_text', 'draw_area'
  ]
  return drawingTools.includes(_currentTool)
}

/** 重置所有绘制状态 */
export function resetAllDrawingState() {
  _seatDrawStep = 'idle'
  _seatDrawStartPos = null
  _multiRowStep = 'idle'
  _multiRowStartPos = null
  _multiRowEndPos = null
  _polygonPoints = []
  _dragStartPos = null
  clearDrawingPreview()
}

/** 兼容旧代码的别名 */
export const resetDrawingState = resetAllDrawingState

/** 清除绘制预览 */
export function clearDrawingPreview() {
  _previewElements.forEach(el => el.destroy())
  _previewElements = []
  _overlayLayer?.batchDraw()
}

/** 添加预览元素 */
export function addPreviewElement(el: Konva.Group | Konva.Shape) {
  _overlayLayer?.add(el)
  _previewElements.push(el)
}

/** 批量绘制覆盖层 */
export function batchDrawOverlay() {
  _overlayLayer?.batchDraw()
}

// ==================== 辅助函数 ====================

/** 获取或创建默认 section */
const getOrCreateDefaultSection = (): string => {
  const venueStore = useVenueStore()
  if (venueStore.venue.sections.length === 0) {
    const sectionId = venueStore.addSection({
      name: '默认区域',
      rows: [],
      x: 0,
      y: 0
    })
    return sectionId || 'default'
  }
  return venueStore.venue.sections[0].id
}

/** 检查是否靠近起点（用于闭合多边形） */
const checkNearStartPoint = (pos: Position, points: Position[]): boolean => {
  if (points.length === 0) return false
  const start = points[0]
  const dx = pos.x - start.x
  const dy = pos.y - start.y
  return Math.sqrt(dx * dx + dy * dy) < SNAP_TO_START_DISTANCE
}

// ==================== 座位排绘制 ====================

/** 获取舞台缩放比例 */
const getStageScale = (): number => {
  return _overlayLayer?.getStage()?.scaleX() || 1
}

/** 创建鼠标跟随的预览圆（idle 状态） */
export function createSeatCursorPreview(pos: Position) {
  clearDrawingPreview()
  
  const stageScale = getStageScale()
  const visualScale = 1 / stageScale
  
  const circle = new Konva.Circle({
    x: pos.x,
    y: pos.y,
    radius: SEAT_RADIUS * visualScale,
    fill: '#ffffff',
    stroke: '#3b82f6',
    strokeWidth: 1.5 * visualScale,
    opacity: 0.8,
    listening: false
  })
  addPreviewElement(circle)
  batchDrawOverlay()
}

/** 创建座位排预览 */
export function createSeatRowPreview(startPos: Position, endPos: Position) {
  const { ux, uy, dist } = getUnitVector(startPos, endPos)
  
  const stageScale = getStageScale()
  const visualScale = 1 / stageScale
  
  // 视觉间距和半径（反向缩放，保持视觉大小恒定）
  const visualSeatSpacing = SEAT_SPACING * visualScale
  const visualSeatRadius = SEAT_RADIUS * visualScale

  if (dist < visualSeatSpacing) return

  const count = Math.max(2, Math.floor(dist / visualSeatSpacing) + 1)

  clearDrawingPreview()

  // 绘制辅助线
  const line = new Konva.Line({
    points: [startPos.x, startPos.y, endPos.x, endPos.y],
    stroke: '#3b82f6',
    strokeWidth: 1.5 * visualScale,
    dash: [6 * visualScale, 6 * visualScale],
    listening: false
  })
  addPreviewElement(line)

  // 起点标记已移除（避免绘制完成后留下标记）

  // 绘制起点标记
  const startDot = new Konva.Circle({
    x: startPos.x,
    y: startPos.y,
    radius: 5 * visualScale,
    fill: '#3b82f6',
    stroke: '#fff',
    strokeWidth: 1.5 * visualScale,
    listening: false
  })
  addPreviewElement(startDot)
  
  // 生成座位数据（使用视觉间距）
  const seats: { x: number; y: number }[] = []
  for (let i = 0; i < count; i++) {
    seats.push({ x: i * visualSeatSpacing, y: 0 })
  }
  
  // 计算边界
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  seats.forEach(seat => {
    minX = Math.min(minX, seat.x - visualSeatRadius)
    minY = Math.min(minY, seat.y - visualSeatRadius)
    maxX = Math.max(maxX, seat.x + visualSeatRadius)
    maxY = Math.max(maxY, seat.y + visualSeatRadius)
  })
  
  const width = maxX - minX
  const height = maxY - minY
  const angle = Math.atan2(uy, ux) * 180 / Math.PI
  
  // 绘制座位预览
  const shape = new Konva.Shape({
    x: startPos.x,
    y: startPos.y,
    width,
    height,
    rotation: angle,
    listening: false,
    perfectDrawEnabled: false
  })
  
  shape.sceneFunc((ctx) => {
    seats.forEach(seat => {
      ctx.beginPath()
      ctx.arc(seat.x, seat.y, visualSeatRadius, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 1.5 * visualScale
      ctx.stroke()
    })
  })
  addPreviewElement(shape)
  batchDrawOverlay()
}

/** 提交座位排到 store */
export function submitSeatRow(startPos: Position, endPos: Position) {
  const { ux, uy, dist } = getUnitVector(startPos, endPos)
  
  // 获取当前缩放比例
  const stageScale = getStageScale()
  const visualScale = 1 / stageScale
  
  // 视觉间距（用于计算座位数量）
  const visualSeatSpacing = SEAT_SPACING * visualScale
  
  if (dist < visualSeatSpacing) {
    clearDrawingPreview()
    return
  }
  
  const count = Math.max(2, Math.floor(dist / visualSeatSpacing) + 1)
  const angle = Math.atan2(uy, ux) * 180 / Math.PI
  
  // 生成座位（使用视觉间距，这样座位大小与预览一致）
  const seats: Seat[] = []
  for (let i = 0; i < count; i++) {
    seats.push({
      id: generateId(),
      label: '',  // 默认空标签
      x: i * visualSeatSpacing + SEAT_RADIUS * visualScale,
      y: SEAT_RADIUS * visualScale,
      categoryKey: useVenueStore().venue.categories[0]?.key || 1,
      status: 'available',
      objectType: 'seat'
    })
  }
  
  // 提交到 store（保存视觉间距，这样座位会随分区一起缩放）
  const sectionId = getOrCreateDefaultSection()
  useVenueStore().addRow(sectionId, {
    label: '',
    seats,
    x: startPos.x,
    y: startPos.y,
    rotation: angle,
    curve: 0,
    seatSpacing: visualSeatSpacing  // 使用视觉间距
  })
  
  clearDrawingPreview()
}

/** 创建多排预览 */
export function createMultiRowPreview(startPos: Position, endPos: Position, currentPos: Position) {
  const { ux, uy, dist } = getUnitVector(startPos, endPos)
  
  if (dist < SEAT_SPACING) return
  
  const seatsPerRow = Math.max(2, Math.floor(dist / SEAT_SPACING) + 1)
  const rowAngle = Math.atan2(uy, ux) * 180 / Math.PI
  
  // 计算行方向和行数
  const { ux: rowUx, uy: rowUy } = getUnitVector(endPos, currentPos)
  const rowDist = Math.sqrt(
    Math.pow(currentPos.x - endPos.x, 2) + 
    Math.pow(currentPos.y - endPos.y, 2)
  )
  const rowCount = Math.max(1, Math.floor(rowDist / ROW_SPACING) + 1)
  
  clearDrawingPreview()
  
  // 绘制每排预览
  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const rowOffsetX = rowIdx * rowUx * ROW_SPACING
    const rowOffsetY = rowIdx * rowUy * ROW_SPACING
    const rowStartX = startPos.x + rowOffsetX
    const rowStartY = startPos.y + rowOffsetY
    
    // 绘制辅助线
    const line = new Konva.Line({
      points: [rowStartX, rowStartY, rowStartX + ux * (seatsPerRow - 1) * SEAT_SPACING, rowStartY + uy * (seatsPerRow - 1) * SEAT_SPACING],
      stroke: '#3b82f6',
      strokeWidth: 1.5,
      dash: [6, 6],
      listening: false
    })
    addPreviewElement(line)
    
    // 绘制座位预览
    for (let i = 0; i < seatsPerRow; i++) {
      const seatX = rowStartX + i * ux * SEAT_SPACING
      const seatY = rowStartY + i * uy * SEAT_SPACING
      
      const circle = new Konva.Circle({
        x: seatX,
        y: seatY,
        radius: SEAT_RADIUS,
        fill: '#ffffff',
        stroke: '#3b82f6',
        strokeWidth: 1.5,
        listening: false
      })
      addPreviewElement(circle)
    }
  }
  
  batchDrawOverlay()
}

/** 提交多排到 store */
export function submitMultiRow(startPos: Position, endPos: Position, currentPos: Position) {
  const { ux, uy, dist } = getUnitVector(startPos, endPos)
  
  if (dist < SEAT_SPACING) {
    clearDrawingPreview()
    return
  }
  
  const seatsPerRow = Math.max(2, Math.floor(dist / SEAT_SPACING) + 1)
  const rowAngle = Math.atan2(uy, ux) * 180 / Math.PI
  
  // 计算行方向和行数
  const { ux: rowUx, uy: rowUy } = getUnitVector(endPos, currentPos)
  const rowDist = Math.sqrt(
    Math.pow(currentPos.x - endPos.x, 2) + 
    Math.pow(currentPos.y - endPos.y, 2)
  )
  const rowCount = Math.max(1, Math.floor(rowDist / ROW_SPACING) + 1)
  
  const sectionId = getOrCreateDefaultSection()
  
  // 生成多排
  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const rowOffsetX = rowIdx * rowUx * ROW_SPACING
    const rowOffsetY = rowIdx * rowUy * ROW_SPACING
    
    const seats: Seat[] = []
    for (let i = 0; i < seatsPerRow; i++) {
      seats.push({
        id: generateId(),
        label: '',
        x: i * SEAT_SPACING + SEAT_RADIUS,
        y: SEAT_RADIUS,
        categoryKey: useVenueStore().venue.categories[0]?.key || 1,
        status: 'available',
        objectType: 'seat'
      })
    }
    
    useVenueStore().addRow(sectionId, {
      label: '',
      seats,
      x: startPos.x + rowOffsetX,
      y: startPos.y + rowOffsetY,
      rotation: rowAngle,
      curve: 0,
      seatSpacing: SEAT_SPACING
    })
  }
  
  clearDrawingPreview()
}

// ==================== 矩形绘制 ====================

/** 创建矩形预览 */
export function createRectPreview(startPos: Position, endPos: Position) {
  clearDrawingPreview()
  
  const width = Math.abs(endPos.x - startPos.x)
  const height = Math.abs(endPos.y - startPos.y)
  
  if (width < 5 || height < 5) return
  
  const x = Math.min(startPos.x, endPos.x)
  const y = Math.min(startPos.y, endPos.y)
  
  const rect = new Konva.Rect({
    x, y, width, height,
    fill: 'rgba(156, 163, 175, 0.4)',
    stroke: '#3b82f6',
    strokeWidth: 1.5,
    dash: [5, 4],
    listening: false
  })
  addPreviewElement(rect)
  batchDrawOverlay()
}

/** 提交矩形 - 创建 Section */
export function submitRect(startPos: Position, endPos: Position) {
  const width = Math.abs(endPos.x - startPos.x)
  const height = Math.abs(endPos.y - startPos.y)
  
  if (width < MIN_SHAPE_SIZE || height < MIN_SHAPE_SIZE) {
    clearDrawingPreview()
    return
  }
  
  const x = Math.min(startPos.x, endPos.x)
  const y = Math.min(startPos.y, endPos.y)
  
  // 创建 Section（不再是 Shape）
  // rect: x,y 为左上角，width,height 为宽高（与 ShapeObject 一致）
  useVenueStore().addSection({
    name: '矩形分区',
    rows: [],
    x: 0,
    y: 0,
    borderType: 'rect',
    borderX: x,
    borderY: y,
    borderWidth: width,
    borderHeight: height,
    borderFill: 'rgba(128,128,128,0.15)',  // 默认灰色半透明
    borderStroke: '#808080'  // 默认灰色边框
  })
  
  clearDrawingPreview()
}

// ==================== 椭圆绘制 ====================

/** 创建圆形预览 */
export function createEllipsePreview(startPos: Position, endPos: Position) {
  clearDrawingPreview()
  
  // 计算起点到终点的距离作为半径
  const dx = endPos.x - startPos.x
  const dy = endPos.y - startPos.y
  const radius = Math.sqrt(dx * dx + dy * dy)
  
  if (radius < 5) return
  
  // 圆形预览：圆心为起点
  const circle = new Konva.Ellipse({
    x: startPos.x,
    y: startPos.y,
    radiusX: radius,
    radiusY: radius,
    fill: 'rgba(156, 163, 175, 0.4)',
    stroke: '#3b82f6',
    strokeWidth: 1.5,
    dash: [5, 4],
    listening: false
  })
  addPreviewElement(circle)
  batchDrawOverlay()
}

/** 提交椭圆到 store */
/** 提交椭圆 - 创建 Section */
export function submitEllipse(startPos: Position, endPos: Position) {
  // 计算起点到终点的距离作为半径
  const dx = endPos.x - startPos.x
  const dy = endPos.y - startPos.y
  const radius = Math.sqrt(dx * dx + dy * dy)
  
  if (radius < MIN_SHAPE_SIZE / 2) {
    clearDrawingPreview()
    return
  }
  
  // 创建 Section（圆形）：圆心为起点，半径为起点到终点的距离
  useVenueStore().addSection({
    name: '圆形分区',
    rows: [],
    x: 0,
    y: 0,
    borderType: 'ellipse',
    borderX: startPos.x,
    borderY: startPos.y,
    borderRadiusX: radius,
    borderRadiusY: radius,
    borderFill: 'rgba(128,128,128,0.15)',  // 默认灰色半透明
    borderStroke: '#808080'  // 默认灰色边框
  })
  
  clearDrawingPreview()
}

// ==================== 多边形绘制 ====================

/** 创建多边形预览（支持弧线） */
export function createPolygonPreview(points: PathPoint[], currentPos: Position) {
  clearDrawingPreview()
  
  if (points.length === 0) return
  
  // 获取舞台缩放比例，用于反向缩放保持视觉大小恒定
  const stage = _overlayLayer?.getStage()
  const stageScale = stage?.scaleX() || 1
  const handleScale = 1 / stageScale
  
  // 绘制已固定的点（从该点出发的边若为弧线则高亮）
  points.forEach((p, i) => {
    const isArcStart = p.type === 'arc'
    const dot = new Konva.Circle({
      x: p.x,
      y: p.y,
      radius: (i === 0 ? 3 : 2) * handleScale,  // 反向缩放，保持视觉大小恒定
      fill: isArcStart ? '#f59e0b' : (i === 0 ? '#3b82f6' : '#60a5fa'),
      stroke: '#fff',
      strokeWidth: 1 * handleScale,
      listening: false
    })
    addPreviewElement(dot)
    
    if (isArcStart) {
      const arcMark = new Konva.Text({
        x: p.x - 6 * handleScale,
        y: p.y - 12 * handleScale,
        text: '⌒',
        fontSize: 10 * handleScale,
        fill: '#f59e0b',
        listening: false
      })
      addPreviewElement(arcMark)
    }
  })
  
  if (points.length >= 2) {
    const pathData = pointsToPathData(points, false)
    
    const path = new Konva.Path({
      data: pathData,
      stroke: '#3b82f6',
      strokeWidth: 1.5 * handleScale,  // 反向缩放保持视觉大小恒定
      listening: false
    })
    addPreviewElement(path)
  }
  
  const lastPoint = points[points.length - 1]
  const isNearStart = checkNearStartPoint(currentPos, points)
  const targetPoint = isNearStart ? points[0] : currentPos
  const previewType = lastPoint.type ?? 'line'
  const previewDepth = lastPoint.arcDepth ?? 0
  const useArcPreview = previewType === 'arc' && Math.abs(previewDepth) > 0.0001
  
  if (useArcPreview) {
    const previewPath = new Konva.Path({
      data: calculateEdgePath(lastPoint, targetPoint, previewDepth),
      stroke: isNearStart ? '#22c55e' : '#3b82f6',
      strokeWidth: 1.5 * handleScale,  // 反向缩放保持视觉大小恒定
      dash: isNearStart ? [] : [5 * handleScale, 5 * handleScale],
      listening: false
    })
    addPreviewElement(previewPath)
  } else {
    const previewLine = new Konva.Line({
      points: [lastPoint.x, lastPoint.y, targetPoint.x, targetPoint.y],
      stroke: isNearStart ? '#22c55e' : '#3b82f6',
      strokeWidth: 1.5 * handleScale,  // 反向缩放保持视觉大小恒定
      dash: isNearStart ? [] : [5 * handleScale, 5 * handleScale],
      listening: false
    })
    addPreviewElement(previewLine)
  }
  
  if (isNearStart && points.length >= 3) {
    const fillPath = pointsToPathData(points, true)
    
    const fill = new Konva.Path({
      data: fillPath,
      fill: 'rgba(156, 163, 175, 0.3)',
      listening: false
    })
    addPreviewElement(fill)
    
    const highlight = new Konva.Circle({
      x: points[0].x,
      y: points[0].y,
      radius: 4 * handleScale,  // 反向缩放保持视觉大小恒定
      fill: '#22c55e',
      stroke: '#fff',
      strokeWidth: 1.5 * handleScale,
      listening: false
    })
    addPreviewElement(highlight)
  }
  
  batchDrawOverlay()
}

/** 提交多边形/路径到 store - 创建 Section（统一使用 path 数据） */
export function submitPolygon(points: PathPoint[]) {
  if (points.length < 3) {
    clearDrawingPreview()
    _polygonPoints = []
    return
  }
  
  const center = calculatePolygonCenter(points)
  const relativePathPoints = points.map((p) => ({
    x: p.x - center.x,
    y: p.y - center.y,
    type: p.type ?? 'line',
    arcDepth: p.arcDepth
  }))
  
  useVenueStore().addSection({
    name: '路径分区',
    rows: [],
    x: 0,
    y: 0,
    borderType: 'path',
    borderX: center.x,
    borderY: center.y,
    borderPathPoints: relativePathPoints,
    borderFill: 'rgba(128,128,128,0.15)',  // 默认灰色半透明
    borderStroke: '#808080'  // 默认灰色边框
  })
  
  clearDrawingPreview()
  _polygonPoints = []
}

// ==================== 区域绘制 ====================

/** 提交区域到 store */
export function submitArea(points: Position[]) {
  if (points.length < 3) {
    clearDrawingPreview()
    _polygonPoints = []
    return
  }
  
  const flatPoints: number[] = []
  points.forEach(p => flatPoints.push(p.x, p.y))
  
  const sectionId = getOrCreateDefaultSection()
  useVenueStore().addArea(sectionId, {
    type: 'area',
    label: '区域',
    points: flatPoints,
    fill: 'rgba(100, 100, 100, 0.3)',
    opacity: 0.3,
    translucent: true
  })
  
  clearDrawingPreview()
  _polygonPoints = []
}

// ==================== 文本绘制 ====================

/** 创建文本预览 */
export function createTextPreview(pos: Position) {
  clearDrawingPreview()
  
  const text = new Konva.Text({
    x: pos.x,
    y: pos.y,
    text: '文本',
    fontSize: 16,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fill: '#333333',
    listening: false
  })
  addPreviewElement(text)
  batchDrawOverlay()
}

/** 提交文本到 store */
export function submitText(pos: Position) {
  const sectionId = getOrCreateDefaultSection()
  useVenueStore().addText(sectionId, {
    type: 'text',
    x: pos.x,
    y: pos.y,
    text: '文本',
    fontSize: 16,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fill: '#333333',
    rotation: 0
  })
  
  clearDrawingPreview()
}

// ==================== 统一事件处理 ====================

/** 处理绘制点击事件 */
export function handleDrawingClick(pos: Position, event?: MouseEvent): boolean {
  switch (_currentTool) {
    case 'draw_seat':
    case 'row-straight':
    case 'section':
      return handleSeatClick(pos)
    case 'section-diagonal':
      return handleMultiRowClick(pos)
    case 'draw_rect':
    case 'draw_ellipse':
      return handleShapeClick(pos)
    case 'draw_polygon':
    case 'draw_area':
      return handlePolygonClick(pos, event)
    case 'draw_text':
      submitText(pos)
      return true
    default:
      return false
  }
}

/** 处理绘制移动事件 */
export function handleDrawingMove(pos: Position): boolean {
  switch (_currentTool) {
    case 'draw_seat':
    case 'row-straight':
    case 'section':
      return handleSeatMove(pos)
    case 'section-diagonal':
      return handleMultiRowMove(pos)
    case 'draw_rect':
      if (_dragStartPos) {
        createRectPreview(_dragStartPos, pos)
        return true
      }
      return false
    case 'draw_ellipse':
      if (_dragStartPos) {
        createEllipsePreview(_dragStartPos, pos)
        return true
      }
      return false
    case 'draw_polygon':
    case 'draw_area':
      if (_polygonPoints.length > 0) {
        createPolygonPreview(_polygonPoints, pos)
        return true
      }
      return false
    case 'draw_text':
      createTextPreview(pos)
      return true
    default:
      return false
  }
}

/** 处理座位绘制点击 */
function handleSeatClick(pos: Position): boolean {
  if (_seatDrawStep === 'idle') {
    _seatDrawStartPos = pos
    _seatDrawStep = 'first'
    clearDrawingPreview()
    return true
  } else if (_seatDrawStep === 'first' && _seatDrawStartPos) {
    submitSeatRow(_seatDrawStartPos, pos)
    _seatDrawStep = 'idle'
    _seatDrawStartPos = null
    return true
  }
  return false
}

/** 处理座位绘制移动 */
function handleSeatMove(pos: Position): boolean {
  if (_seatDrawStep === 'idle') {
    createSeatCursorPreview(pos)
    return true
  } else if (_seatDrawStep === 'first' && _seatDrawStartPos) {
    createSeatRowPreview(_seatDrawStartPos, pos)
    return true
  }
  return false
}

/** 处理多排绘制点击 */
function handleMultiRowClick(pos: Position): boolean {
  if (_multiRowStep === 'idle') {
    // 第一步：确定起点
    _multiRowStartPos = pos
    _multiRowStep = 'first'
    clearDrawingPreview()
    return true
  } else if (_multiRowStep === 'first' && _multiRowStartPos) {
    // 第二步：确定第一排的终点（方向、角度、座位数）
    _multiRowEndPos = pos
    _multiRowStep = 'second'
    // 不清理预览，继续显示
    return true
  } else if (_multiRowStep === 'second' && _multiRowStartPos && _multiRowEndPos) {
    // 第三步：确定行数和行间距，完成绘制
    submitMultiRow(_multiRowStartPos, _multiRowEndPos, pos)
    _multiRowStep = 'idle'
    _multiRowStartPos = null
    _multiRowEndPos = null
    return true
  }
  return false
}

/** 处理多排绘制移动 */
function handleMultiRowMove(pos: Position): boolean {
  if (_multiRowStep === 'idle') {
    createSeatCursorPreview(pos)
    return true
  } else if (_multiRowStep === 'first' && _multiRowStartPos) {
    // 预览第一排
    createSeatRowPreview(_multiRowStartPos, pos)
    return true
  } else if (_multiRowStep === 'second' && _multiRowStartPos && _multiRowEndPos) {
    // 预览多排
    createMultiRowPreview(_multiRowStartPos, _multiRowEndPos, pos)
    return true
  }
  return false
}

/** 处理形状绘制点击（矩形/椭圆） */
function handleShapeClick(pos: Position): boolean {
  if (_dragStartPos === null) {
    _dragStartPos = pos
    return true
  } else {
    if (_currentTool === 'draw_rect') {
      submitRect(_dragStartPos, pos)
    } else if (_currentTool === 'draw_ellipse') {
      submitEllipse(_dragStartPos, pos)
    }
    _dragStartPos = null
    return true
  }
}

/** 处理多边形绘制点击（支持 Shift 键标记当前点出发的弧线边） */
function handlePolygonClick(pos: Position, event?: MouseEvent): boolean {
  // 检查是否闭合
  if (_polygonPoints.length >= 3 && checkNearStartPoint(pos, _polygonPoints)) {
    if (_currentTool === 'draw_polygon') {
      submitPolygon(_polygonPoints)
    } else {
      submitArea(_polygonPoints)
    }
    return true
  }
  
  // 检查是否按住 Shift 键（标记从当前点出发的下一条边为弧线）
  const isArc = !!event?.shiftKey
  const point: PathPoint = {
    x: pos.x,
    y: pos.y,
    type: isArc ? 'arc' : 'line',
    arcDepth: isArc ? 0 : 0
  }
  
  _polygonPoints.push(point)
  createPolygonPreview(_polygonPoints, pos)
  return true
}

/** 获取多边形点（供外部检查） */
export function getPolygonPoints(): Position[] {
  return _polygonPoints
}

/** 获取座位绘制状态（供外部检查） */
export function getSeatDrawStep(): 'idle' | 'first' {
  return _seatDrawStep
}

/** 获取座位绘制起点（供外部检查） */
export function getSeatDrawStartPos(): Position | null {
  return _seatDrawStartPos
}

/** 获取拖拽起点（供外部检查） */
export function getDragStartPos(): Position | null {
  return _dragStartPos
}

// ==================== Vue Composable（兼容旧代码）====================

import { ref, computed, shallowRef } from 'vue'

/**
 * 绘制状态管理 Composable（兼容 useDrawing）
 * 实际状态使用模块级变量，这里只提供 Vue 响应式包装
 */
export function useDrawing() {
  // 当前工具（响应式包装）
  const currentTool = ref<DrawingToolMode>(_currentTool)
  
  // 绘制状态
  const drawingState = ref<DrawingState>('idle')
  const mousePos = ref<Position>({ x: 0, y: 0 })
  const showPreview = ref(false)
  
  // 预览状态（响应式包装）
  const previewState = ref({
    isActive: _dragStartPos !== null || _polygonPoints.length > 0,
    startPos: _dragStartPos,
    currentPos: mousePos.value,
    points: _polygonPoints
  })
  
  // 是否是数据驱动的绘制工具
  const isDataDrivenTool = computed(() => {
    return ['draw_seat', 'row-straight', 'section', 'section-diagonal', 'draw_rect', 'draw_ellipse', 'draw_polygon', 'draw_polyline', 'draw_sector', 'draw_text', 'draw_area'].includes(currentTool.value)
  })
  
  // 多边形点（响应式包装）
  const polygonPoints = computed(() => _polygonPoints)
  
  // 座位绘制状态（响应式包装）
  const seatDrawStep = computed(() => _seatDrawStep)
  const seatDrawPoints = ref({
    first: _seatDrawStartPos,
    second: null as Position | null,
    third: null as Position | null
  })
  
  // 绘制步骤
  const drawStep = ref<DrawStep>('idle')
  const drawPoints = ref({
    first: null as Position | null,
    second: null as Position | null,
    third: null as Position | null
  })
  
  // 方法
  const setTool = (tool: DrawingToolMode) => {
    setDrawingTool(tool)
    currentTool.value = tool
  }
  
  const startDrawing = (pos: Position) => {
    _dragStartPos = pos
    previewState.value.isActive = true
    previewState.value.startPos = pos
  }
  
  const updateDrawing = (pos: Position) => {
    mousePos.value = pos
    previewState.value.currentPos = pos
  }
  
  const finishDrawing = () => {
    _dragStartPos = null
    previewState.value.isActive = false
    previewState.value.startPos = null
  }
  
  const addPolygonPoint = (pos: Position | PathPoint) => {
    _polygonPoints.push(pos as PathPoint)
    previewState.value.points = _polygonPoints
  }
  
  const clearPolygonPoints = () => {
    // 使用 splice 清空数组以触发响应式更新
    _polygonPoints.splice(0, _polygonPoints.length)
    previewState.value.points = _polygonPoints
  }
  
  const isNearStartPoint = (pos: Position): boolean => {
    return checkNearStartPoint(pos, _polygonPoints)
  }
  
  const resetDrawingState = () => {
    resetAllDrawingState()
    drawingState.value = 'idle'
    drawStep.value = 'idle'
    drawPoints.value = { first: null, second: null, third: null }
    seatDrawPoints.value = { first: null, second: null, third: null }
  }
  
  return {
    // 常量
    SEAT_RADIUS,
    SEAT_SPACING,
    ROW_SPACING,
    MIN_SHAPE_SIZE,
    // 状态
    currentTool,
    drawingState,
    mousePos,
    showPreview,
    previewState,
    polygonPoints,
    seatDrawStep,
    seatDrawPoints,
    drawStep,
    drawPoints,
    isDataDrivenTool,
    // 方法
    setTool,
    startDrawing,
    updateDrawing,
    finishDrawing,
    addPolygonPoint,
    clearPolygonPoints,
    isNearStartPoint,
    resetDrawingState
  }
}

// ==================== 弧线辅助函数 ====================

/** 将 PathPoint 数组转换为 SVG Path 数据 */
function pointsToPathData(points: PathPoint[], closed: boolean = false): string {
  if (points.length < 2) return ''
  
  let path = `M ${points[0].x} ${points[0].y}`
  const segmentCount = closed ? points.length : points.length - 1

  for (let i = 0; i < segmentCount; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    const edgeType = start.type ?? 'line'
    const depth = start.arcDepth ?? 0

    path += edgeType === 'arc' && Math.abs(depth) > 0.0001
      ? ` ${createArcSegment(start, end, depth)}`
      : ` L ${end.x} ${end.y}`
  }
  
  if (closed && points.length > 0) {
    path += ' Z'
  }
  
  return path
}

/** 创建圆弧路径段（SVG Arc）- 完美圆角
 * 使用 sagitta（矢高）计算圆弧半径
 */
function createArcSegment(start: Position, end: Position, depth: number): string {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.sqrt(dx * dx + dy * dy) || 1
  
  // sagitta = 矢高（圆弧中点到弦的距离）
  const sagitta = length * Math.abs(depth) * 0.5
  
  // 根据矢高和弦长计算半径: r = (s^2 + (c/2)^2) / (2*s)
  const halfChord = length / 2
  let radius = (sagitta * sagitta + halfChord * halfChord) / (2 * Math.max(sagitta, 0.001))
  
  // 限制最小半径
  radius = Math.max(radius, halfChord)
  
  const sweepFlag = depth > 0 ? 1 : 0
  
  return `A ${radius} ${radius} 0 0 ${sweepFlag} ${end.x} ${end.y}`
}

/** 计算弧线预览路径 */
function calculateEdgePath(start: PathPoint, end: Position, depth: number): string {
  return `M ${start.x} ${start.y} ${createArcSegment(start, end, depth)}`
}

// 模块级别导出常量
export { SEAT_RADIUS, SEAT_SPACING, ROW_SPACING, MIN_SHAPE_SIZE }
