/**
 * @file useKonvaRenderPrimitives.ts
 * @brief Konva 渲染原子函数 Composable
 *
 * 职责：提供纯 Konva 节点创建函数，不包含业务逻辑和事件绑定
 * 从 KonvaRenderer.vue 的渲染函数中提取
 */

import Konva from 'konva'
import type { SeatRow, Seat, ShapeObject, TextObject, AreaObject, CanvasImage } from '../types'

// ==================== 类型定义 ====================

export interface CreateRowShapeOptions {
  seatRadius: number
  getSeatColor: (seat: Seat) => string
  isSelected: boolean
  sectionId: string
}

export interface RowShapeConfig {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  centerX: number
  centerY: number
}

// ==================== 工具函数 ====================

/**
 * 计算排的几何边界
 */
export function calculateRowBounds(row: SeatRow, seatRadius: number): RowShapeConfig {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  row.seats.forEach((seat) => {
    minX = Math.min(minX, seat.x - seatRadius)
    minY = Math.min(minY, seat.y - seatRadius)
    maxX = Math.max(maxX, seat.x + seatRadius)
    maxY = Math.max(maxY, seat.y + seatRadius)
  })

  const width = maxX - minX
  const height = maxY - minY
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return { minX, minY, maxX, maxY, width, height, centerX, centerY }
}

/**
 * 按颜色分组座位
 */
export function groupSeatsByColor(seats: Seat[], getSeatColor: (seat: Seat) => string): Record<string, Seat[]> {
  const colorGroups: Record<string, Seat[]> = {}

  seats.forEach((seat) => {
    const color = getSeatColor(seat)
    if (!colorGroups[color]) colorGroups[color] = []
    colorGroups[color].push(seat)
  })

  return colorGroups
}

// ==================== 节点创建函数 ====================

/**
 * 创建排 Shape 节点（不含事件绑定）
 */
export function createRowShape(
  row: SeatRow,
  bounds: RowShapeConfig,
  options: CreateRowShapeOptions
): Konva.Shape {
  const { seatRadius, isSelected, sectionId } = options
  const { minX, minY, maxX, maxY, width, height, centerX, centerY } = bounds

  const rowShape = new Konva.Shape({
    x: row.x,
    y: row.y,
    rotation: row.rotation || 0,
    width: width,
    height: height,
    offsetX: seatRadius,
    offsetY: seatRadius,
    draggable: false,
    id: `row-${row.id}`,
    name: 'row-shape',
    perfectDrawEnabled: false,
    transformsEnabled: 'all',
    rowData: row,
    sectionId: sectionId,
    hitMinX: minX,
    hitMinY: minY,
    hitMaxX: maxX,
    hitMaxY: maxY,
    centerX: centerX,
    centerY: centerY
  })

  return rowShape
}

/**
 * 创建排的 sceneFunc（批次绘制座位）
 */
export function createRowSceneFunc(
  row: SeatRow,
  getSeatColor: (seat: Seat) => string,
  isSelected: boolean,
  seatRadius: number
): (context: Konva.Context, shape: Konva.Shape) => void {
  return (context, shape) => {
    const radius = seatRadius

    // 按分类颜色分组绘制
    const colorGroups = groupSeatsByColor(row.seats, getSeatColor)

    // 批次绘制每个颜色组的座位
    Object.entries(colorGroups).forEach(([color, groupSeats]) => {
      if (groupSeats.length === 0) return

      context.beginPath()
      context.fillStyle = color

      // 使用局部坐标绘制
      groupSeats.forEach(seat => {
        context.moveTo(seat.x, seat.y)
        context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
      })

      context.fill()

      // 绘制边框
      context.save()
      context.strokeStyle = isSelected ? '#3b82f6' : color
      context.lineWidth = 1
      groupSeats.forEach(seat => {
        context.beginPath()
        context.arc(seat.x, seat.y, radius, 0, Math.PI * 2)
        context.stroke()
      })
      context.restore()
    })
  }
}

/**
 * 创建排的 hitFunc（自定义点击检测）
 */
export function createRowHitFunc(): (context: Konva.Context, shape: Konva.Shape) => void {
  return (context, shape) => {
    const hitMinX = shape.getAttr('hitMinX') as number
    const hitMinY = shape.getAttr('hitMinY') as number
    const hitMaxX = shape.getAttr('hitMaxX') as number
    const hitMaxY = shape.getAttr('hitMaxY') as number

    context.beginPath()
    context.rect(hitMinX, hitMinY, hitMaxX - hitMinX, hitMaxY - hitMinY)
    context.fillStrokeShape(shape)
  }
}

/**
 * 创建形状节点
 */
export function createShapeNode(shape: ShapeObject): Konva.Shape | null {
  switch (shape.type) {
    case 'rect':
      return new Konva.Rect({
        x: shape.x,
        y: shape.y,
        width: shape.width || 100,
        height: shape.height || 100,
        fill: shape.fill,
        stroke: shape.stroke || '#374151',
        strokeWidth: shape.strokeWidth || 1,
        draggable: true,
        name: 'shape-object',
        id: `shape-${shape.id}`
      })

    case 'ellipse':
      return new Konva.Ellipse({
        x: shape.x,
        y: shape.y,
        radiusX: shape.width ? shape.width / 2 : 50,
        radiusY: shape.height ? shape.height / 2 : 30,
        fill: shape.fill,
        stroke: shape.stroke || '#374151',
        strokeWidth: shape.strokeWidth || 1,
        draggable: true,
        name: 'shape-object',
        id: `shape-${shape.id}`
      })

    case 'polygon':
      return new Konva.Line({
        points: shape.points || [],
        fill: shape.fill,
        stroke: shape.stroke || '#374151',
        strokeWidth: shape.strokeWidth || 1,
        closed: true,
        draggable: true,
        name: 'shape-object',
        id: `shape-${shape.id}`
      })

    default:
      return null
  }
}

/**
 * 创建文本节点
 */
export function createTextNode(text: TextObject): Konva.Text {
  return new Konva.Text({
    x: text.x,
    y: text.y,
    text: text.text,
    fontSize: text.fontSize || 14,
    fill: text.fill || '#374151',
    fontStyle: text.fontStyle || 'normal',
    draggable: true,
    name: 'text-object',
    id: `text-${text.id}`
  })
}

/**
 * 创建区域节点
 */
export function createAreaNode(area: AreaObject): Konva.Line {
  return new Konva.Line({
    points: area.points || [],
    fill: area.fill,
    stroke: '#6b7280',
    strokeWidth: 1,
    closed: true,
    draggable: true,
    name: 'area-object',
    id: `area-${area.id}`,
    opacity: area.opacity || 0.3
  })
}

/**
 * 创建图片节点（异步）
 */
export function createImageNode(canvasImage: CanvasImage): Promise<Konva.Image> {
  return new Promise((resolve) => {
    const imageObj = new Image()
    imageObj.onload = () => {
      const konvaImage = new Konva.Image({
        x: canvasImage.x,
        y: canvasImage.y,
        image: imageObj,
        width: canvasImage.width,
        height: canvasImage.height,
        draggable: false,
        listening: false,
        name: 'background-image',
        id: `image-${canvasImage.id}`
      })
      resolve(konvaImage)
    }
    imageObj.src = canvasImage.src
  })
}
