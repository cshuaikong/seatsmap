import type { UI } from 'leafer-ui'

// ==================== 业务元数据（通过 element.data 挂载）====================

export interface SectionMeta {
  id: string
  type: 'section'
  name?: string
}

export interface SeatRowMeta {
  id: string
  type: 'seatRow'
  sectionId: string
  label?: string
}

export interface SeatMeta {
  id: string
  type: 'seat'
  catId?: string | number
}

export interface ShapeMeta {
  id: string
  type: 'shape'
}

export interface TextMeta {
  id: string
  type: 'text'
}

export interface AreaMeta {
  id: string
  type: 'area'
}

export type ElementBusinessMeta =
  | SectionMeta
  | SeatRowMeta
  | SeatMeta
  | ShapeMeta
  | TextMeta
  | AreaMeta

// ==================== 遗留 __xxx 元数据（兼容层，阶段 3 逐步移除）====================

export interface LeaferElementMeta {
  // 分区相关
  __sectionGroup?: boolean | any
  __sectionId?: string
  __sectionName?: string
  __sectionNameText?: boolean
  __body?: any
  __selectionBorder?: any
  __nameText?: any

  // 分区 Path 子元素
  __rawPath?: string
  __sectionBorder?: boolean

  // 座位排相关
  __seatRow?: boolean
  __seatRowData?: any
  __seatEllipses?: any[]
  __seatLocalPositions?: { x: number; y: number }[]
  __bar?: any
  __rowOriginX?: number
  __rowOriginY?: number
  __rawSeats?: any[]
  __rowSpacing?: number
  __seatSpacing?: number
  __curve?: number

  // 座位相关
  __seatId?: string
  __cat_id?: string | number
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

  // 顶点编辑/排端点编辑手柄
  __vi?: number
  __ei?: number
  __seatHandleIdx?: number
}

/**
 * 带业务元数据的 Leafer UI 元素。
 * 使用 Partial<LeaferElementMeta> 避免与 Leafer 原生属性（如 data）冲突。
 */
export type LeaferUI = UI & Partial<LeaferElementMeta>

/**
 * 把任意 Leafer 元素断言为带业务元数据的类型
 * 替代 (el as any).__xxx 的写法
 */
export function asLeaferUI(el: any): LeaferUI {
  return el as LeaferUI
}

/**
 * 获取元素的业务 ID，优先从 data 读取，兼容 __xxx
 */
export function getElementId(el: LeaferUI | undefined | null): string | undefined {
  if (!el) return undefined
  return (el.data as any)?.id ?? el.__sectionId ?? el.__rowId ?? el.__seatId ?? el.__shapeId ?? el.__textId ?? el.__areaId
}

/**
 * 获取元素的业务类型
 */
export function getElementType(el: LeaferUI | undefined | null): string | undefined {
  return ((el?.data as any)?.type) as string | undefined
}

/**
 * 判断元素是否为指定业务类型
 */
export function isElementType(el: LeaferUI | undefined | null, type: ElementBusinessMeta['type']): boolean {
  return ((el?.data as any)?.type) === type
}

/**
 * 设置元素的业务元数据
 */
export function setElementMeta<T extends ElementBusinessMeta>(el: UI, meta: T): void {
  ;(el as any).data = meta
}
