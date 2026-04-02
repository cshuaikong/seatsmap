/**
 * @file useKonvaDrawing.ts
 * @brief Konva 画布绘制功能 Composable
 * 
 * 职责：
 * 1. 管理绘制工具状态
 * 2. 处理绘制预览（座位排、矩形、椭圆、多边形、文本）
 * 3. 提交绘制结果到 store
 * 
 * 从 KonvaRenderer.vue 拆分出来，独立管理绘制相关逻辑
 */

import { ref, type Ref } from 'vue'
import Konva from 'konva'
import type { Position, Seat, SeatRow, ShapeObject, TextObject, AreaObject } from '../types'
import { defaultSeatMapConfig } from '../types'
import { generateId } from '../utils/id'
import { useVenueStore } from '../stores/venueStore'
import type { DrawingToolMode } from './useDrawing'

// ==================== 类型定义 ====================

export type SeatDrawStep = 'idle' | 'first' | 'second'

export interface SeatDrawPoints {
  first: Position | null
  second: Position | null
}

export interface UseKonvaDrawingOptions {
  /** 覆盖层 Layer，用于显示预览 */
  overlayLayer: Ref<Konva.Layer | null>
  /** 绘制完成后的回调 */
  onDrawingComplete?: () => void
}

export interface UseKonvaDrawingReturn {
  // 状态
  currentDrawingTool: Ref<DrawingToolMode>
  seatDrawStep: Ref<SeatDrawStep>
  seatDrawPoints: Ref<SeatDrawPoints>
  
  // 工具控制
  setDrawingTool: (tool: DrawingToolMode) => void
  resetSeatDrawingState: () => void
  isDrawingMode: () => boolean
  
  // 预览控制
  clearDrawingPreview: () => void
  
  // 事件处理
  handleDrawingClick: (pos: Position) => void
  handleDrawingMove: (pos: Position) => void
  
  // 绘制提交（供外部调用）
  submitSeatRow: (startPos: Position, endPos: Position) => void
  submitRect: (startPos: Position, endPos: Position) => void
  submitEllipse: (startPos: Position, endPos: Position) => void
  submitPolygon: (points: Position[]) => void
  submitArea: (points: Position[]) => void
  submitText: (pos: Position) => void
}

// ==================== 常量 ====================

const SEAT_RADIUS = defaultSeatMapConfig.defaultSeatRadius
const SEAT_SPACING = defaultSeatMapConfig.defaultSeatSpacing
const MIN_SHAPE_SIZE = 10
const SNAP_TO_START_DISTANCE = 15

// ==================== 辅助函数 ====================

/** 计算两点间的单位向量和距离 */
const getUnitVector = (from: Position, to: Position): { ux: number; uy: number; dist: number } => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 0.001) return { ux: 1, uy: 0, dist: 0 }
  return { ux: dx / dist, uy: dy / dist, dist }
}

/** 计算多边形中心点 */
const calculatePolygonCenter = (points: Position[]): Position => {
  let sumX = 0, sumY = 0
  points.forEach(p => {
    sumX += p.x
    sumY += p.y
  })
  return { x: sumX / points.length, y: sumY / points.length }
}

/** 将点数组转换为相对坐标 */
const toRelativePoints = (points: Position[], centerX: number, centerY: number): number[] => {
  return points.flatMap(p => [p.x - centerX, p.y - centerY])
}

// ==================== 独立的绘制工具函数 ====================
// 这些函数不依赖 composable 状态，可以被旧代码直接调用

let _previewElements: Konva.Node[] = []
let _overlayLayer: Konva.Layer | null = null

/** 设置预览层（由 KonvaRenderer 调用） */
export function setPreviewLayer(layer: Konva.Layer | null) {
  _overlayLayer = layer
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

/** 清除绘制预览 */
export function clearDrawingPreview() {
  _previewElements.forEach(el => el.destroy())
  _previewElements = []
  _overlayLayer?.batchDraw()
}

// ==================== Main Composable ====================

export function useKonvaDrawing(options: UseKonvaDrawingOptions): UseKonvaDrawingReturn {
  const { overlayLayer, onDrawingComplete } = options
  const venueStore = useVenueStore()
  
  // ==================== State ====================
  
  // 预览元素引用
  let previewElements: Konva.Node[] = []
  
  // 当前绘制模式
  const currentDrawingTool = ref<DrawingToolMode>('select')
  
  // 座位绘制状态机（分段式单击绘制）
  const seatDrawStep = ref<SeatDrawStep>('idle')
  const seatDrawPoints = ref<SeatDrawPoints>({ first: null, second: null })
  
  // 多边形/区域绘制点
  const polygonPoints = ref<Position[]>([])
  
  // 矩形/椭圆拖拽绘制起点
  const dragStartPos = ref<Position | null>(null)
  
  // ==================== 工具控制 ====================
  
  const resetSeatDrawingState = () => {
    seatDrawStep.value = 'idle'
    seatDrawPoints.value = { first: null, second: null }
    polygonPoints.value = []
    dragStartPos.value = null
  }
  
  const setDrawingTool = (tool: DrawingToolMode) => {
    if (currentDrawingTool.value !== tool) {
      resetSeatDrawingState()
    }
    currentDrawingTool.value = tool
    clearDrawingPreview()
  }
  
  const isDrawingMode = (): boolean => {
    const drawingTools: DrawingToolMode[] = [
      'draw_seat', 'draw_rect', 'draw_ellipse', 'draw_polygon',
      'draw_polyline', 'draw_sector', 'draw_text', 'draw_area'
    ]
    return drawingTools.includes(currentDrawingTool.value)
  }
  
  // ==================== 预览控制 ====================
  
  const clearDrawingPreview = () => {
    previewElements.forEach(el => el.destroy())
    previewElements = []
    overlayLayer.value?.batchDraw()
  }
  
  const addPreviewElement = (el: Konva.Group | Konva.Shape) => {
    overlayLayer.value?.add(el)
    previewElements.push(el)
  }
  
  const batchDrawOverlay = () => {
    overlayLayer.value?.batchDraw()
  }
  
  // ==================== 获取或创建默认 section ====================
  
  const getOrCreateDefaultSection = (): string => {
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
  
  // ==================== 座位排绘制 ====================
  
  const createSeatCursorPreview = (pos: Position) => {
    clearDrawingPreview()
    
    const circle = new Konva.Circle({
      x: pos.x,
      y: pos.y,
      radius: SEAT_RADIUS,
      fill: '#ffffff',
      stroke: '#3b82f6',
      strokeWidth: 1.5,
      opacity: 0.8,
      listening: false
    })
    addPreviewElement(circle)
    batchDrawOverlay()
  }
  
  const createSeatRowPreview = (startPos: Position, endPos: Position) => {
    const { ux, uy, dist } = getUnitVector(startPos, endPos)
    
    if (dist < SEAT_SPACING) return
    
    const count = Math.max(2, Math.floor(dist / SEAT_SPACING) + 1)
    
    clearDrawingPreview()
    
    // 绘制辅助线
    const line = new Konva.Line({
      points: [startPos.x, startPos.y, endPos.x, endPos.y],
      stroke: '#3b82f6',
      strokeWidth: 1.5,
      dash: [6, 6],
      listening: false
    })
    addPreviewElement(line)
    
    // 绘制起点标记
    const startDot = new Konva.Circle({
      x: startPos.x,
      y: startPos.y,
      radius: 5,
      fill: '#3b82f6',
      stroke: '#fff',
      strokeWidth: 1.5,
      listening: false
    })
    addPreviewElement(startDot)
    
    // 生成座位数据（局部坐标）
    const seats: { x: number; y: number }[] = []
    for (let i = 0; i < count; i++) {
      seats.push({ x: i * SEAT_SPACING, y: 0 })
    }
    
    // 计算边界
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    seats.forEach((seat) => {
      minX = Math.min(minX, seat.x - SEAT_RADIUS)
      minY = Math.min(minY, seat.y - SEAT_RADIUS)
      maxX = Math.max(maxX, seat.x + SEAT_RADIUS)
      maxY = Math.max(maxY, seat.y + SEAT_RADIUS)
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
        ctx.arc(seat.x, seat.y, SEAT_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 1.5
        ctx.stroke()
      })
    })
    addPreviewElement(shape)
    batchDrawOverlay()
  }
  
  const submitSeatRow = (startPos: Position, endPos: Position) => {
    const { ux, uy, dist } = getUnitVector(startPos, endPos)
    
    if (dist < SEAT_SPACING) {
      clearDrawingPreview()
      return
    }
    
    const count = Math.max(2, Math.floor(dist / SEAT_SPACING) + 1)
    const angle = Math.atan2(uy, ux) * 180 / Math.PI
    
    // 生成座位
    const seats: Seat[] = []
    for (let i = 0; i < count; i++) {
      seats.push({
        id: generateId(),
        label: String(i + 1),
        x: i * SEAT_SPACING + SEAT_RADIUS,
        y: SEAT_RADIUS,
        categoryKey: venueStore.venue.categories[0]?.key || 1,
        status: 'available',
        objectType: 'seat'
      })
    }
    
    // 提交到 store
    const sectionId = getOrCreateDefaultSection()
    venueStore.addRow(sectionId, {
      label: '',
      seats,
      x: startPos.x,
      y: startPos.y,
      rotation: angle,
      curve: 0,
      seatSpacing: SEAT_SPACING
    })
    
    clearDrawingPreview()
    onDrawingComplete?.()
  }
  
  // ==================== 矩形绘制 ====================
  
  const createRectPreview = (startPos: Position, endPos: Position) => {
    clearDrawingPreview()
    
    const width = Math.abs(endPos.x - startPos.x)
    const height = Math.abs(endPos.y - startPos.y)
    
    if (width < 5 || height < 5) return
    
    const x = Math.min(startPos.x, endPos.x)
    const y = Math.min(startPos.y, endPos.y)
    
    const rect = new Konva.Rect({
      x,
      y,
      width,
      height,
      fill: 'rgba(156, 163, 175, 0.4)',
      stroke: '#3b82f6',
      strokeWidth: 1.5,
      dash: [5, 4],
      listening: false
    })
    addPreviewElement(rect)
    batchDrawOverlay()
  }
  
  const submitRect = (startPos: Position, endPos: Position) => {
    const width = Math.abs(endPos.x - startPos.x)
    const height = Math.abs(endPos.y - startPos.y)
    
    if (width < MIN_SHAPE_SIZE || height < MIN_SHAPE_SIZE) {
      clearDrawingPreview()
      return
    }
    
    const x = Math.min(startPos.x, endPos.x)
    const y = Math.min(startPos.y, endPos.y)
    
    const sectionId = getOrCreateDefaultSection()
    venueStore.addShape(sectionId, {
      type: 'rect',
      x,
      y,
      width,
      height,
      rotation: 0,
      fill: 'rgba(156, 163, 175, 0.6)',
      stroke: 'transparent',
      strokeWidth: 0,
      cornerRadius: 8
    })
    
    clearDrawingPreview()
    onDrawingComplete?.()
  }
  
  // ==================== 椭圆绘制 ====================
  
  const createEllipsePreview = (startPos: Position, endPos: Position) => {
    clearDrawingPreview()
    
    const radiusX = Math.abs(endPos.x - startPos.x)
    const radiusY = Math.abs(endPos.y - startPos.y)
    
    if (radiusX < 5 || radiusY < 5) return
    
    const ellipse = new Konva.Ellipse({
      x: startPos.x,
      y: startPos.y,
      radiusX,
      radiusY,
      fill: 'rgba(156, 163, 175, 0.4)',
      stroke: '#3b82f6',
      strokeWidth: 1.5,
      dash: [5, 4],
      listening: false
    })
    addPreviewElement(ellipse)
    batchDrawOverlay()
  }
  
  const submitEllipse = (startPos: Position, endPos: Position) => {
    const radiusX = Math.abs(endPos.x - startPos.x)
    const radiusY = Math.abs(endPos.y - startPos.y)
    
    if (radiusX < MIN_SHAPE_SIZE || radiusY < MIN_SHAPE_SIZE) {
      clearDrawingPreview()
      return
    }
    
    const sectionId = getOrCreateDefaultSection()
    venueStore.addShape(sectionId, {
      type: 'ellipse',
      x: startPos.x,
      y: startPos.y,
      width: radiusX * 2,
      height: radiusY * 2,
      rotation: 0,
      fill: 'rgba(156, 163, 175, 0.6)',
      stroke: 'transparent',
      strokeWidth: 0
    })
    
    clearDrawingPreview()
    onDrawingComplete?.()
  }
  
  // ==================== 多边形绘制 ====================
  
  const createPolygonPreview = (points: Position[], currentPos: Position) => {
    clearDrawingPreview()
    
    if (points.length === 0) return
    
    // 绘制已固定的点
    points.forEach((p, i) => {
      const dot = new Konva.Circle({
        x: p.x,
        y: p.y,
        radius: i === 0 ? 4 : 3,
        fill: i === 0 ? '#3b82f6' : '#60a5fa',
        stroke: '#fff',
        strokeWidth: 1.5,
        listening: false
      })
      addPreviewElement(dot)
    })
    
    // 绘制固定线段
    if (points.length >= 2) {
      const linePoints: number[] = []
      points.forEach(p => linePoints.push(p.x, p.y))
      
      const line = new Konva.Line({
        points: linePoints,
        stroke: '#3b82f6',
        strokeWidth: 2,
        listening: false
      })
      addPreviewElement(line)
    }
    
    // 绘制预览线段
    const lastPoint = points[points.length - 1]
    const isNearStart = checkNearStartPoint(currentPos, points)
    const targetPoint = isNearStart ? points[0] : currentPos
    
    const previewLine = new Konva.Line({
      points: [lastPoint.x, lastPoint.y, targetPoint.x, targetPoint.y],
      stroke: isNearStart ? '#22c55e' : '#3b82f6',
      strokeWidth: 2,
      dash: isNearStart ? [] : [5, 5],
      listening: false
    })
    addPreviewElement(previewLine)
    
    // 如果靠近起点，显示闭合预览
    if (isNearStart && points.length >= 3) {
      const fillPoints = points.flatMap(p => [p.x, p.y])
      fillPoints.push(points[0].x, points[0].y)
      
      const fill = new Konva.Line({
        points: fillPoints,
        fill: 'rgba(156, 163, 175, 0.4)',
        closed: true,
        listening: false
      })
      addPreviewElement(fill)
      
      const highlight = new Konva.Circle({
        x: points[0].x,
        y: points[0].y,
        radius: 6,
        fill: '#22c55e',
        stroke: '#fff',
        strokeWidth: 2,
        listening: false
      })
      addPreviewElement(highlight)
    }
    
    batchDrawOverlay()
  }
  
  const checkNearStartPoint = (pos: Position, points: Position[]): boolean => {
    if (points.length === 0) return false
    const start = points[0]
    const dx = pos.x - start.x
    const dy = pos.y - start.y
    return Math.sqrt(dx * dx + dy * dy) < SNAP_TO_START_DISTANCE
  }
  
  const submitPolygon = (points: Position[]) => {
    if (points.length < 3) {
      clearDrawingPreview()
      polygonPoints.value = []
      return
    }
    
    const center = calculatePolygonCenter(points)
    const relativePoints = toRelativePoints(points, center.x, center.y)
    
    const sectionId = getOrCreateDefaultSection()
    venueStore.addShape(sectionId, {
      type: 'polygon',
      x: center.x,
      y: center.y,
      rotation: 0,
      fill: 'rgba(156, 163, 175, 0.6)',
      stroke: 'transparent',
      strokeWidth: 0,
      points: relativePoints
    })
    
    clearDrawingPreview()
    polygonPoints.value = []
    onDrawingComplete?.()
  }
  
  // ==================== 区域绘制 ====================
  
  const submitArea = (points: Position[]) => {
    if (points.length < 3) {
      clearDrawingPreview()
      polygonPoints.value = []
      return
    }
    
    const flatPoints: number[] = []
    points.forEach(p => flatPoints.push(p.x, p.y))
    
    const sectionId = getOrCreateDefaultSection()
    venueStore.addArea(sectionId, {
      type: 'area',
      label: '区域',
      points: flatPoints,
      fill: 'rgba(100, 100, 100, 0.3)',
      opacity: 0.3,
      translucent: true
    })
    
    clearDrawingPreview()
    polygonPoints.value = []
    onDrawingComplete?.()
  }
  
  // ==================== 文本绘制 ====================
  
  const createTextPreview = (pos: Position) => {
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
  
  const submitText = (pos: Position) => {
    const sectionId = getOrCreateDefaultSection()
    venueStore.addText(sectionId, {
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
    onDrawingComplete?.()
  }
  
  // ==================== 事件处理 ====================
  
  const handleDrawingClick = (pos: Position) => {
    const tool = currentDrawingTool.value
    
    switch (tool) {
      case 'draw_seat':
        handleSeatDrawingClick(pos)
        break
      case 'draw_rect':
      case 'draw_ellipse':
        handleShapeDrawingClick(pos)
        break
      case 'draw_polygon':
      case 'draw_area':
        handlePolygonDrawingClick(pos)
        break
      case 'draw_text':
        submitText(pos)
        break
    }
  }
  
  const handleSeatDrawingClick = (pos: Position) => {
    if (seatDrawStep.value === 'idle') {
      seatDrawPoints.value.first = { ...pos }
      seatDrawStep.value = 'first'
      clearDrawingPreview()
    } else if (seatDrawStep.value === 'first' && seatDrawPoints.value.first) {
      submitSeatRow(seatDrawPoints.value.first, pos)
      resetSeatDrawingState()
    }
  }
  
  const handleShapeDrawingClick = (pos: Position) => {
    if (dragStartPos.value === null) {
      dragStartPos.value = { ...pos }
    } else {
      if (currentDrawingTool.value === 'draw_rect') {
        submitRect(dragStartPos.value, pos)
      } else if (currentDrawingTool.value === 'draw_ellipse') {
        submitEllipse(dragStartPos.value, pos)
      }
      dragStartPos.value = null
    }
  }
  
  const handlePolygonDrawingClick = (pos: Position) => {
    // 检查是否闭合
    if (polygonPoints.value.length >= 3 && checkNearStartPoint(pos, polygonPoints.value)) {
      if (currentDrawingTool.value === 'draw_polygon') {
        submitPolygon(polygonPoints.value)
      } else {
        submitArea(polygonPoints.value)
      }
      return
    }
    
    polygonPoints.value.push({ ...pos })
    createPolygonPreview(polygonPoints.value, pos)
  }
  
  const handleDrawingMove = (pos: Position) => {
    const tool = currentDrawingTool.value
    
    switch (tool) {
      case 'draw_seat':
        handleSeatDrawingMove(pos)
        break
      case 'draw_rect':
        if (dragStartPos.value) {
          createRectPreview(dragStartPos.value, pos)
        }
        break
      case 'draw_ellipse':
        if (dragStartPos.value) {
          createEllipsePreview(dragStartPos.value, pos)
        }
        break
      case 'draw_polygon':
      case 'draw_area':
        if (polygonPoints.value.length > 0) {
          createPolygonPreview(polygonPoints.value, pos)
        }
        break
      case 'draw_text':
        createTextPreview(pos)
        break
    }
  }
  
  const handleSeatDrawingMove = (pos: Position) => {
    if (seatDrawStep.value === 'idle') {
      createSeatCursorPreview(pos)
    } else if (seatDrawStep.value === 'first' && seatDrawPoints.value.first) {
      createSeatRowPreview(seatDrawPoints.value.first, pos)
    }
  }
  
  // ==================== Return ====================
  
  return {
    // 状态
    currentDrawingTool,
    seatDrawStep,
    seatDrawPoints,
    
    // 工具控制
    setDrawingTool,
    resetSeatDrawingState,
    isDrawingMode,
    
    // 预览控制
    clearDrawingPreview,
    
    // 事件处理
    handleDrawingClick,
    handleDrawingMove,
    
    // 绘制提交
    submitSeatRow,
    submitRect,
    submitEllipse,
    submitPolygon,
    submitArea,
    submitText
  }
}
