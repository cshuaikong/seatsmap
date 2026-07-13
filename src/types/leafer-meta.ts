import type { UI } from 'leafer-ui'

/**
 * Leafer UI 元素业务元数据
 * 项目中通过 __xxx 在 Leafer 元素上挂载业务数据，这里统一声明类型
 */
export interface LeaferElementMeta {
  // 分区相关
  __sectionGroup?: boolean
  __sectionId?: string
  __sectionName?: string

  // 座位排相关
  __seatRow?: boolean
  __seatRowData?: any
  __seatEllipses?: any[]
  __bar?: any
  __rowOriginX?: number
  __rowOriginY?: number
  __rawSeats?: any[]
  __rowSpacing?: number
  __seatSpacing?: number
  __curve?: number

  // 座位相关
  __seatId?: string
  __categoryKey?: string | number
  __sourceSeat?: any

  // 形状/文本/区域相关
  __shapeId?: string
  __textId?: string
  __areaId?: string
  __categoryId?: string | number

  // 编辑配置
  editConfig?: any
  __originalStroke?: string
  __isVenueDataSeat?: boolean

  // 标签与显示
  __labelText?: any
  __rowLabelText?: boolean
  __seatLabelText?: boolean

  // 排级元数据
  __seatRadius?: number
  __rowId?: string
  __rowLabel?: string
  __rotation?: number
  __anchorFromEnd?: boolean
}

export type LeaferUI = UI & LeaferElementMeta

/**
 * 把任意 Leafer 元素断言为带业务元数据的类型
 * 替代 (el as any).__xxx 的写法
 */
export function asLeaferUI(el: any): LeaferUI {
  return el as LeaferUI
}
