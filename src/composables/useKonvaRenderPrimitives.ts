/**
 * @file useKonvaRenderPrimitives.ts
 * @brief Konva 渲染原子函数 Composable
 *
 * 职责：提供纯 Konva 节点创建函数，不包含业务逻辑和事件绑定
 * 从 KonvaRenderer.vue 的渲染函数中提取
 */

import Konva from 'konva'
import type { SeatRow, Seat, ShapeObject, TextObject, AreaObject, CanvasImage } from '../types'

// ==================== 颜色工具函数 ====================

/**
 * 将颜色加深指定百分比
 * @param color - 十六进制颜色字符串 (#RGB 或 #RRGGBB)
 * @param percent - 加深百分比 (0-100)
 * @returns 加深后的十六进制颜色
 */
export function darkenColor(color: string, percent: number = 20): string {
  // 移除 # 号
  let hex = color.replace('#', '')
  
  // 处理简写形式 #RGB
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('')
  }
  
  // 解析 RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // 加深计算
  const factor = 1 - percent / 100
  const newR = Math.floor(r * factor)
  const newG = Math.floor(g * factor)
  const newB = Math.floor(b * factor)
  
  // 转换回十六进制
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`
}

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
    objectType: 'row',
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
 * 根据弧度计算座位在弧形上的位置
 * @param seats - 座位数组
 * @param curve - 弧度值 (-100 到 100)
 * @returns 计算后的座位位置数组
 */
function calculateCurvedPositions(seats: Seat[], curve: number): Array<{ x: number; y: number }> {
  if (!curve || curve === 0 || seats.length < 2) {
    // 无弧度，直接返回原始位置
    return seats.map(seat => ({ x: seat.x, y: seat.y }))
  }

  const count = seats.length
  const firstSeat = seats[0]
  const lastSeat = seats[count - 1]
  
  // 计算排的长度和角度
  const dx = lastSeat.x - firstSeat.x
  const dy = lastSeat.y - firstSeat.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const baseAngle = Math.atan2(dy, dx)
  
  // 直接使用度数作为弯曲角度（curve值即为度数）
  const maxCurveAngle = curve * (Math.PI / 180)
  
  // 计算弧形半径
  const chordLength = length
  const curveAngle = Math.abs(maxCurveAngle)
  const radius = curveAngle > 0.001 ? chordLength / (2 * Math.sin(curveAngle / 2)) : Infinity
  
  // 计算弧形中心点
  const midX = (firstSeat.x + lastSeat.x) / 2
  const midY = (firstSeat.y + lastSeat.y) / 2
  
  // 垂直于排方向的方向
  const perpX = -Math.sin(baseAngle) * (curve > 0 ? 1 : -1)
  const perpY = Math.cos(baseAngle) * (curve > 0 ? 1 : -1)
  
  // 圆心位置
  const centerX = midX + perpX * Math.sqrt(Math.max(0, radius * radius - (chordLength / 2) * (chordLength / 2)))
  const centerY = midY + perpY * Math.sqrt(Math.max(0, radius * radius - (chordLength / 2) * (chordLength / 2)))
  
  // 计算每个座位在弧形上的角度
  const startAngle = Math.atan2(firstSeat.y - centerY, firstSeat.x - centerX)
  const endAngle = Math.atan2(lastSeat.y - centerY, lastSeat.x - centerX)
  const angleStep = (endAngle - startAngle) / (count - 1)
  
  // 生成弧形位置
  return seats.map((_, i) => {
    const angle = startAngle + angleStep * i
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    }
  })
}

/**
 * 创建排的 sceneFunc（批次绘制座位）
 * 支持多段转折排渲染和弧度渲染
 */
export function createRowSceneFunc(
  row: SeatRow,
  getSeatColor: (seat: Seat) => string,
  isSelected: boolean,
  seatRadius: number
): (context: Konva.Context, shape: Konva.Shape) => void {
  return (context, shape) => {
    const radius = seatRadius

    // 获取关键节点索引集合
    const segmentIndices = new Set(row.segmentIndices || [])
    
    // 根据弧度计算座位位置
    const curvedPositions = calculateCurvedPositions(row.seats, row.curve || 0)

    // 按分类颜色分组绘制
    const colorGroups = groupSeatsByColor(row.seats, getSeatColor)

    // 批次绘制每个颜色组的座位
    Object.entries(colorGroups).forEach(([color, groupSeats]) => {
      if (groupSeats.length === 0) return

      context.beginPath()
      context.fillStyle = color

      // 使用计算后的弧形位置绘制
      groupSeats.forEach((seat, index) => {
        const pos = curvedPositions[row.seats.indexOf(seat)]
        context.moveTo(pos.x, pos.y)
        context.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
      })

      context.fill()

      // 绘制边框 - 使用加深后的颜色（seats.io 风格）
      context.save()
      const borderColor = darkenColor(color, 25)
      context.strokeStyle = borderColor
      context.lineWidth = 2
      groupSeats.forEach((seat) => {
        const pos = curvedPositions[row.seats.indexOf(seat)]
        context.beginPath()
        context.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
        context.stroke()
      })
      context.restore()
    })

    // 关键节点高亮已移除（不需要显示黄色/橙色圈）
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
