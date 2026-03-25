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

export interface Seat {
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

export interface Row {
  id: string
  label: string
  x: number
  y: number
  rotation: number
  seats: Seat[]
}

export interface Section {
  id: string
  name: string
  x: number
  y: number
  rotation: number
  rows: Row[]
}

export interface Category {
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
  defaultSeatRadius: 6,
  defaultSeatSpacing: 18,
  defaultRowSpacing: 22,
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
