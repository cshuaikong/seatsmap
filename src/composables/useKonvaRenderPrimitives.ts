/**
 * @file useKonvaRenderPrimitives.ts
 * @brief Konva 渲染原子函数 Composable
 *
 * 职责：提供纯 Konva 节点创建函数，不包含业务逻辑和事件绑定
 * 从 KonvaRenderer.vue 的渲染函数中提取
 */

import Konva from 'konva'
import type { SeatRow, Seat, ShapeObject, TextObject, AreaObject, CanvasImage } from '../types'
import { defaultSeatMapConfig } from '../types'

const SEAT_RADIUS = defaultSeatMapConfig.defaultSeatRadius

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
 * seatRadius 已经是逻辑半径（调用端已处理 baseScale），直接使用
 */
export function calculateRowBounds(row: SeatRow, seatRadius: number, visualScale: number = 1, baseScale: number = 1): RowShapeConfig {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  const radius = seatRadius

  row.seats.forEach((seat) => {
    minX = Math.min(minX, seat.x - radius)
    minY = Math.min(minY, seat.y - radius)
    maxX = Math.max(maxX, seat.x + radius)
    maxY = Math.max(maxY, seat.y + radius)
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

  // seatRadius 已经是逻辑半径（调用端已处理 baseScale），直接使用
  const drawRadius = seatRadius
  
  // 【修复】offset 应该从第一个座位的位置开始，而不是从半径开始
  // 座位 x 坐标从 logicalRadius 开始（i * gap + radius）
  const offsetX = row.seats.length > 0 ? row.seats[0].x : drawRadius
  const offsetY = row.seats.length > 0 ? row.seats[0].y : drawRadius
  
  const rowShape = new Konva.Shape({
    x: row.x,
    y: row.y,
    rotation: row.rotation || 0,
    width: width,
    height: height,
    offsetX: offsetX,
    offsetY: offsetY,
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

  // 重写 getSelfRect 修正 Transformer 包围盒
  // Konva 的 getSelfRect 返回的是相对于 shape 局部坐标系（已应用 offset）的边界
  // offsetX/offsetY 已经移动了原点，所以直接用 minX/minY
  ;(rowShape as any).getSelfRect = () => ({
    x: minX,
    y: minY,
    width: width,
    height: height
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
 * 座位坐标是逻辑坐标（visualConfig / baseScale），sceneFunc 直接使用逻辑坐标绘制
 * Konva 会自动将逻辑坐标乘以 stageScale 进行屏幕渲染
 */
export function createRowSceneFunc(
  row: SeatRow,
  getSeatColor: (seat: Seat) => string,
  isSelected: boolean,
  seatRadius: number,
  selectedSeatIds: string[] = [],
  visualScale: number = 1,
  baseScale: number = 1,
  forceBarMode: boolean = false,
  seatBorderWidth: number = 4
): (context: Konva.Context, shape: Konva.Shape) => void {
  return (context, shape) => {
   
    // 获取关键节点索引集合
    const segmentIndices = new Set(row.segmentIndices || [])
    
    // 动态获取当前舞台缩放
    const currentStageScale = shape.getStage()?.scaleX() || 1
    
    const curvedPositions = calculateCurvedPositions(row.seats, row.curve || 0)
    
    // seatRadius 已经是逻辑半径（调用端已处理 baseScale），直接使用
    const radius = seatRadius

    // 按分类颜色分组绘制
    const colorGroups = groupSeatsByColor(row.seats, getSeatColor)

    if (row.label && !forceBarMode) {
      // 标签紧贴第一个座位左侧，跟随弧形切线方向旋转
      const firstPos = curvedPositions[0] || { x: radius, y: radius }
      const seatSpacingStage = row.seatSpacing || seatRadius * 3
      const secondPos = curvedPositions[1] || { x: firstPos.x + seatSpacingStage, y: firstPos.y }

      const dx = secondPos.x - firstPos.x
      const dy = secondPos.y - firstPos.y
      const angle = Math.atan2(dy, dx)

      context.save()
      context.translate(firstPos.x, firstPos.y)
      context.rotate(angle)
      context.fillStyle = '#444'
      // 标签字体大小使用 radius（与座位编号一致），自动跟随缩放
      const labelFontSize = radius * 1.2  // 略大于座位半径，保持可读性
      context.font = `${labelFontSize}px Inter, -apple-system, sans-serif`
      context.textAlign = 'right'
      context.textBaseline = 'middle'
      context.fillText(row.label, -radius * 2.5, 0)
      context.restore()
    }
    // LOD 多级细节渲染策略（基于 baseScale 的相对缩放）
    // relativeScale < 0.3: 隐藏座位，只显示分区轮廓
    // 0.3 <= relativeScale < 0.7: 显示座位条（连续线条）
    // relativeScale >= 0.7: 显示座位圆 + 标签
    const store = (shape as any).getStage()?.$store
    const baseScale = store?.getBaseScale?.() || 1
    const relativeScale = currentStageScale / baseScale
    
    const LOD_SHOW_BARS = 0.3      // 相对缩放 > 0.3 显示座位条
    const LOD_SHOW_SEATS = 0.7     // 相对缩放 > 0.7 显示圆形座位
    
    // 全局视图或强制横条模式：使用座位条模式（连续线条）
    const displayMode = forceBarMode ? 'bar' : 
                        relativeScale < LOD_SHOW_BARS ? 'hidden' : 
                        relativeScale < LOD_SHOW_SEATS ? 'bar' : 
                        'seat+label'
    
    // 远景：隐藏座位（分区边框由 renderSectionBorder 单独渲染）
    if (displayMode === 'hidden') {
      return
    }
    
    // 近景：显示座位或座位条
    const showLabels = displayMode === 'seat+label' && !forceBarMode
    
    if (displayMode === 'bar') {
      // 【优化】绘制连续线条座位条（与预览模态框保持一致）
      const stageScale = shape.getStage()?.scaleX() || 1
      const store = (shape as any).getStage()?.$store
      const baseScale = store?.getBaseScale?.() || 1
      const configRadius = store?.visualConfig?.radius || 6
      
      // 线条宽度 = 座位直径（使用 baseScale 归一化）
      const lineWidth = (configRadius * 2) / baseScale
      
      // 提取所有座位位置作为连续线条的路径点
      const points: number[] = []
      curvedPositions.forEach(pos => {
        points.push(pos.x, pos.y)
      })
      
      if (points.length >= 4) {
        // 使用座位排的颜色（从第一个座位的 categoryKey 获取）
        const firstSeat = row.seats[0]
        const categoryKey = firstSeat?.categoryKey
        const category = store?.venue?.categories?.find((c: any) => c.key === categoryKey)
        const lineColor = category?.color || '#9E9E9E'
        
        context.save()
        context.strokeStyle = lineColor
        context.lineWidth = lineWidth
        context.globalAlpha = 0.4
        context.lineCap = 'round'  // 圆角端点
        context.lineJoin = 'round'  // 圆角连接（自动处理转折处）
        
        // 绘制连续线条（支持弧度和转折）
        context.beginPath()
        context.moveTo(points[0], points[1])
        
        // 使用二次贝塞尔曲线平滑（模拟 tension: 0.3）
        if (points.length >= 6) {
          for (let i = 2; i < points.length - 2; i += 2) {
            const xc = (points[i] + points[i + 2]) / 2
            const yc = (points[i + 1] + points[i + 3]) / 2
            context.quadraticCurveTo(points[i], points[i + 1], xc, yc)
          }
          // 最后一段
          context.quadraticCurveTo(
            points[points.length - 2],
            points[points.length - 1],
            points[points.length - 2],
            points[points.length - 1]
          )
        } else {
          // 只有两个点，直接画直线
          context.lineTo(points[2], points[3])
        }
        
        context.stroke()
        context.restore()
      }
    } else {
    
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
      // 边框线宽随缩放补偿，保持视觉比例恒定（使用参数传入的边框宽度）
      context.lineWidth = seatBorderWidth / currentStageScale
      groupSeats.forEach((seat) => {
        const pos = curvedPositions[row.seats.indexOf(seat)]
        context.beginPath()
        context.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
        context.stroke()
      })
      context.restore()
    })

    // 绘制座位标签（如果有）
    // 【LOD】根据缩放级别决定是否显示标签
    if (showLabels) {
      context.fillStyle = '#333333'  // 黑色字体
      // 字体大小与半径一致
      context.font = `${radius}px Inter, -apple-system, sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      
      row.seats.forEach((seat, index) => {
        if (seat.label) {
          const pos = curvedPositions[index]
          context.fillText(seat.label, pos.x, pos.y)
        }
      })
    }

    // 绘制选中座位的高亮圆圈（selectseat 模式）
    if (selectedSeatIds.length > 0) {
      context.save()
      context.strokeStyle = '#e53935'
      context.lineWidth = 3 / currentStageScale  // 选中边框线宽随缩放补偿
      row.seats.forEach((seat, index) => {
        if (selectedSeatIds.includes(seat.id)) {
          const pos = curvedPositions[index]
          context.beginPath()
          context.arc(pos.x, pos.y, radius + 2 / currentStageScale, 0, Math.PI * 2)
          context.stroke()
        }
      })
      context.restore()
    }

    // 关键节点高亮已移除（不需要显示黄色/橙色圈）
    }
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
        x: shape.x,
        y: shape.y,
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
