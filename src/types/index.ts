export interface Position {
  x: number
  y: number
}

// 座位状态类型
export type SeatStatus = 'available' | 'booked' | 'reserved' | 'disabled'

// 座位类型
export type SeatType = 'seat' | 'booth' | 'table' | 'general' | 'wheelchair'

// 绘制模式
export type SeatDrawMode = 'single-seat' | 'row-straight' | 'row-curved' | 'row-segments' | 'section' | 'section-diagonal'

// 旧类型定义（保持兼容性）
export interface SeatLegacy {
  id: string
  label: string
  x: number
  y: number
  radius: number
  status: SeatStatus
  type: SeatType
  category: string
  categoryId: string
  rowId: string
  sectionId: string
  rowNumber: string
  seatNumber: string
  isWheelchair: boolean
  isCompanion: boolean
}

export interface RowLegacy {
  id: string
  label: string
  x: number
  y: number
  rotation: number
  seats: SeatLegacy[]
}

export interface SectionLegacy {
  id: string
  name: string
  x: number
  y: number
  rotation: number
  rows: RowLegacy[]
}

export interface CategoryLegacy {
  id: string
  name: string
  color: string
  accessible: boolean
}

export interface ChartData {
  name: string
  width: number
  height: number
  sections: Section[]
  categories: Category[]
}

// 数据驱动架构的核心类型
export interface VenueData {
  id: string
  name: string
  venueType: 'SIMPLE' | 'WITH_SECTIONS' | 'WITH_SECTIONS_AND_FLOORS'
  categories: Category[]
  sections: Section[]
  focalPoint?: Position
}

// 扩展 Category 支持 key 字段
export interface Category {
  key: string | number
  label: string
  color: string
  accessible?: boolean
}

// 扩展 Row 支持更多属性
export interface SeatRow {
  id: string
  label: string
  seats: Seat[]
  curve?: number
  seatSpacing?: number
  rowSpacing?: number
  rotation?: number
  x?: number
  y?: number
}

// 扩展 Seat 支持 Seats.io 风格
export interface Seat {
  id: string
  label: string
  x: number
  y: number
  categoryKey: string | number
  status: SeatStatus
  objectType: 'seat' | 'wheelchair' | 'companion' | 'generalAdmission'
  
  // 可选属性
  radius?: number
  rowId?: string
  sectionId?: string
  
  // 无障碍设施
  isAccessible?: boolean
  isCompanionSeat?: boolean
  hasRestrictedView?: boolean
  
  // 邻居关系
  leftNeighbour?: string
  rightNeighbour?: string
  
  // 距离舞台中心
  distanceToFocalPoint?: number
}

// 扩展 Section
export interface Section {
  id: string
  name: string
  rows: SeatRow[]
  x?: number
  y?: number
  rotation?: number
  // 扩展对象类型
  shapes?: ShapeObject[]
  texts?: TextObject[]
  areas?: AreaObject[]
}

// 座位图配置接口
export interface SeatMapConfig {
  defaultSeatRadius: number
  defaultSeatSpacing: number
  defaultRowSpacing: number
  showRowLabels: boolean
  showSeatLabels: boolean
  statusColors: Record<SeatStatus, string>
  categoryColors: Record<string, string>
  // 区块配置
  sectionConfig: {
    seatsPerRow: number
    rowCount: number
  }
}

// 默认座位图配置
export const defaultSeatMapConfig: SeatMapConfig = {
  defaultSeatRadius: 12,
  defaultSeatSpacing: 28,
  defaultRowSpacing: 32,
  showRowLabels: true,
  showSeatLabels: true,
  
  statusColors: {
    available: '#4CAF50',
    booked: '#F44336',
    reserved: '#FF9800',
    disabled: '#9E9E9E',
  },
  
  categoryColors: {
    'VIP': '#FFD700',
    '普通席': '#4CAF50',
    '特价席': '#2196F3',
    '无障碍': '#9C27B0',
  },
  
  sectionConfig: {
    seatsPerRow: 8,
    rowCount: 5,
  },
}

export type ToolType = 'select' | 'pan' | 'seat' | 'row' | 'section' | 'stage' | 'text' | 'image' | 'shape'

// ========== 新增类型定义 ==========

// 通用标签配置
export interface LabelConfig {
  label: string
  displayedLabel: string
  locked: boolean
}

// 排标签配置
export interface RowLabelConfig extends LabelConfig {
  enabled: boolean
  position: 'left' | 'right'
  displayedType: string
}

// 座位标签配置
export interface SeatLabelConfig {
  labels: string
  displayedType: string
  locked: boolean
}

// 形状对象
export interface ShapeObject {
  id: string
  type: 'rect' | 'ellipse' | 'polygon' | 'sector' | 'polyline'
  x: number
  y: number
  width?: number
  height?: number
  rotation: number
  cornerRadius?: number
  fill: string
  stroke: string
  strokeWidth: number
  opacity?: number
  // polygon/polyline 专用
  points?: number[]
  // sector 专用
  innerRadius?: number
  outerRadius?: number
  angle?: number
  locked?: boolean
  order?: number
  scale?: number
  smoothing?: number
  label?: {
    type?: string
    caption?: string
    fontSize?: number
    positionX?: number
    positionY?: number
  }
}

// 文本对象
export interface TextObject {
  id: string
  type: 'text'
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily?: string
  fontStyle?: string
  fill: string
  rotation?: number
  width?: number
  height?: number
  align?: 'left' | 'center' | 'right'
  locked?: boolean
  scale?: number
  // 兼容旧字段
  caption?: string
  textColor?: string
  bold?: boolean
  italic?: boolean
}

// 区域对象
export interface AreaObject {
  id: string
  type: 'area'
  label: string
  // 多边形顶点 (相对于区域位置的坐标)
  points: number[]
  fill?: string
  opacity?: number
  width?: number
  height?: number
  rotation?: number
  cornerRadius?: number
  translucent?: boolean
  scale?: number
  categoryId?: string
  areaLabeling?: LabelConfig & {
    visible?: boolean
    fontSize?: number
    positionX?: number
    positionY?: number
  }
  capacityType?: 'general_admission'
  capacity?: number
  entrance?: string
  locked?: boolean
}

// 选中对象类型
export type SelectedObjectType = 'seat' | 'row' | 'rect' | 'ellipse' | 'polygon'
  | 'sector' | 'polyline' | 'text' | 'area' | 'none'

// 面板选中
export interface PanelSelection {
  type: SelectedObjectType
  ids: string[]
  nodes: any[]
  isMixed: boolean
}

// ========== 扩展现有接口 ==========

// 扩展 Seat 接口
export interface SeatExtended extends Seat {
  displayedLabel?: string
  displayedType?: string
  accessibility?: 'none' | 'wheelchair'
  restrictedView?: boolean
  entrance?: string
}

// 扩展 Row 接口
export interface RowExtended extends SeatRow {
  curve?: number
  seatSpacing?: number
  rowLabeling?: RowLabelConfig
  seatLabeling?: SeatLabelConfig
  entrance?: string
}
