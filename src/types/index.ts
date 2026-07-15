// 分区多边形数据（PathEditor 通用格式）
export interface EditorPolygon {
  id: string
  path: string
  x: number
  y: number
  fill: string
  stroke?: string
  strokeWidth?: number
  name?: string
}

export interface Position {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// 座位状态常量定义（项目级常量）
export const SEAT_STATUS = {
  /** 可选 */
  AVAILABLE: 'available' as const,
  /** 已预订 */
  BOOKED: 'booked' as const,
  /** 已保留 */
  RESERVED: 'reserved' as const,
  /** 禁用 */
  DISABLED: 'disabled' as const,
  /** 选中 */
  SELECTED: 'selected' as const,
} as const

// 座位状态类型（从常量派生）
export type SeatStatus = typeof SEAT_STATUS[keyof typeof SEAT_STATUS]

// 后端座位状态数字编码（与数据库/接口约定保持一致）
export const SEAT_STATUS_BACKEND = {
  AVAILABLE: 1,
  SOLD: 2,
  LOCKED: 3,
  UNAVAILABLE: 0,
} as const

// 前端状态 → 后端数字
export const STATUS_TO_BACKEND: Record<SeatStatus, number> = {
  [SEAT_STATUS.AVAILABLE]: SEAT_STATUS_BACKEND.AVAILABLE,
  [SEAT_STATUS.SELECTED]: SEAT_STATUS_BACKEND.AVAILABLE,
  [SEAT_STATUS.BOOKED]: SEAT_STATUS_BACKEND.SOLD,
  [SEAT_STATUS.RESERVED]: SEAT_STATUS_BACKEND.LOCKED,
  [SEAT_STATUS.DISABLED]: SEAT_STATUS_BACKEND.UNAVAILABLE,
}

// 后端数字 → 前端状态
export const STATUS_FROM_BACKEND: Record<number, SeatStatus> = {
  [SEAT_STATUS_BACKEND.AVAILABLE]: SEAT_STATUS.AVAILABLE,
  [SEAT_STATUS_BACKEND.SOLD]: SEAT_STATUS.BOOKED,
  [SEAT_STATUS_BACKEND.LOCKED]: SEAT_STATUS.RESERVED,
  [SEAT_STATUS_BACKEND.UNAVAILABLE]: SEAT_STATUS.DISABLED,
}

// 座位类型
export type SeatType = 'seat' | 'booth' | 'table' | 'general' | 'wheelchair'

// 绘制模式
export type SeatDrawMode = 'single-seat' | 'row-straight' | 'row-curved' | 'row-segments' | 'section' | 'section-diagonal'



// 数据驱动架构的核心类型
export interface VenueData {
  id: string
  name: string
  type: 'SIMPLE' | 'WITH_SECTIONS' | 'WITH_FLOORS'
  categories: Category[]
  sections: Section[]
  baseScale?: number   // 座位绘制基准缩放，随数据源持久化
}

// 扩展 Category 支持 key 字段
export interface Category {
  key: string | number
  label: string
  color: string
  accessible?: boolean
  price?: number  // 分类价格（单位：元）
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
  // 多段转折座位排的关键节点索引数组
  // 记录每段转折处的座位索引，用于渲染多段转折排
  segmentIndices?: number[]
  // 基准缩放比例（seats.io 风格：首次绘制时记录，用于后续渲染）
  baseScale?: number
}

// 扩展 Seat 支持 Seats.io 风格
// 字段名与后端接口保持一致（snake_case），避免导入导出时反复映射
export interface Seat {
  id: string
  label: string
  x: number
  y: number
  cat_id: string | number
  status: SeatStatus
  type: 'seat' | 'wheelchair' | 'companion' | 'generalAdmission'
  
  // 可选属性
  radius?: number
  row_id?: string
  sec_id?: string
  ven_id?: string
  
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

// 多边形/路径点类型
export interface PathPoint {
  x: number
  y: number
  type?: 'line' | 'arc'  // 从当前点出发的下一条边类型
  arcDepth?: number      // 当前点到下一点这条边的弯曲深度（-1~1，0 为直线，正负表示两侧）
}

// 扩展 Section - 同时作为分区容器和可选边框
// - rect: x,y 为左上角，width,height 为宽高
// - ellipse: x,y 为中心点，radiusX,radiusY 为半径
// - polygon: x,y 为中心点，points 为相对坐标数组
// - path: x,y 为中心点，pathPoints 为带弧线的路径点
export interface Section {
  id: string
  name: string
  rows: SeatRow[]
  x?: number             // 分区位置
  y?: number
  rotation?: number
  shapes?: ShapeObject[]
  texts?: TextObject[]
  areas?: AreaObject[]
  // 分区形状类型
  type?: 'rect' | 'ellipse' | 'path' | 'none'
  width?: number          // rect 专用
  height?: number         // rect 专用
  radiusX?: number        // ellipse 专用
  radiusY?: number        // ellipse 专用
  points?: number[]       // polygon 专用（相对坐标）
  arcDepths?: number[]    // polygon 弧深数组
  pathPoints?: PathPoint[] // path 专用
  path?: string           // SVG path 字符串（PathEditor 使用）
  cornerRadius?: number   // rect 圆角
  fill?: string
  stroke?: string
  opacity?: number
  zIndex?: number
  readonly?: boolean
}

// 座位图配置选项（用户可配置的全部行为/外观参数）
export interface SeatMapOptions {
  /** 座位视觉 */
  seats: {
    radius: number           // 座位圆点半径 (屏幕像素)，默认 6
    spacing: number          // 座位间距 (屏幕像素)，默认 18
    rowSpacing: number       // 排间距 (屏幕像素)，默认 24
    strokeWidth: number      // 座位边框宽度 (屏幕像素)，默认 2
    singleSeatSpacing: number // 单行座位时的回退间距 (屏幕像素)，默认 28
  }
  /** 标签显示 */
  labels: {
    showRowLabels: boolean
    showSeatLabels: boolean
    sectionNameFontSize: number  // 默认 14
  }
  /** 颜色体系 */
  colors: {
    categoryColors: Record<string, string>
    statusColors: Record<SeatStatus, string>
    sectionDefaultFill: string
    sectionDefaultStroke: string
    seatDefaultFill: string
    seatStrokeDarken: number          // 暗化量 0-100，默认 30
    selectionStroke: string
    previewFill: string
  }
  /** 编辑行为 */
  editor: {
    handleSize: number       // 控制点屏幕像素，默认 6
    strokeWidth: number      // 编辑器描边宽度，默认 1
    closeThreshold: number   // 绘制闭合阈值 (像素)，默认 15
    zoomMin: number          // 默认 0.05
    zoomMax: number          // 默认 20
  }
  /** LOD / 性能 */
  lod: {
    seatDotMinRadius: number       // 屏幕半径低于此值只画圆点，默认 3
    seatFullMinRadius: number      // 屏幕半径高于此值画完整座位，默认 6
    sectionNameMinScale: number    // 缩放低于此值隐藏分区名，默认 0.8
  }
  /** 新建区段默认值 */
  sectionDefaults: {
    seatsPerRow: number      // 默认 8
    rowCount: number         // 默认 5
  }
  /** 功能开关 */
  features: {
    showMinimap: boolean
    showGrid: boolean
  }
}

export const defaultSeatMapOptions: SeatMapOptions = {
  seats: {
    radius: 6,
    spacing: 18,
    rowSpacing: 24,
    strokeWidth: 2,
    singleSeatSpacing: 28,
  },
  labels: {
    showRowLabels: true,
    showSeatLabels: true,
    sectionNameFontSize: 14,
  },
  colors: {
    categoryColors: {
      '普通席': '#4CAF50',
    },
    statusColors: {
      [SEAT_STATUS.AVAILABLE]: '#9E9E9E',
      [SEAT_STATUS.BOOKED]: '#F44336',
      [SEAT_STATUS.RESERVED]: '#FF9800',
      [SEAT_STATUS.DISABLED]: '#616161',
      [SEAT_STATUS.SELECTED]: '#4CAF50',
    },
    sectionDefaultFill: '#d1d5db',
    sectionDefaultStroke: '#9ca3af',
    seatDefaultFill: '#A5D6A7',
    seatStrokeDarken: 30,
    selectionStroke: '#3b82f6',
    previewFill: 'rgba(59,130,246,0.18)',
  },
  editor: {
    handleSize: 6,
    strokeWidth: 1,
    closeThreshold: 15,
    zoomMin: 0.05,
    zoomMax: 20,
  },
  lod: {
    seatDotMinRadius: 3,
    seatFullMinRadius: 6,
    sectionNameMinScale: 0.8,
  },
  sectionDefaults: {
    seatsPerRow: 8,
    rowCount: 5,
  },
  features: {
    showMinimap: true,
    showGrid: false,
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
  // 分类关联（用于配色）
  categoryKey?: string | number
  // polygon/polyline 专用
  points?: number[]
  arcDepths?: number[]  // 弧深数组，长度=points.length/2，每条边的弯曲深度 (-1~1)
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
  arcDepths?: number[]  // 弧深数组，长度=points.length/2，每条边的弯曲深度 (-1~1)
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

// 图片对象（可拖拽到画布）
export interface CanvasImage {
  id: string
  type: 'image'
  // 图片数据源 (base64 或 URL)
  src: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  opacity?: number
  // 是否锁定位置
  locked?: boolean
  // 原始文件名
  fileName?: string
  // 是否可见
  visible?: boolean
  // 层级控制（数值越大越在上层，默认 0）
  zIndex?: number
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
