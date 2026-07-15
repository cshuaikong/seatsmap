import type { SeatRow, Seat, Section, Category } from '../types'
import { generateId } from '../utils/id'

/** 从单位向量计算旋转角度（度） */
export function rotationFromVector(ux: number, uy: number): number {
  return (Math.atan2(uy, ux) * 180) / Math.PI
}

/** 把 section Group 局部坐标/向量转世界坐标/向量 */
export function localToWorld(
  local: { x: number; y: number },
  section: { x?: number; y?: number; rotation?: number },
): { x: number; y: number } {
  const sx = section.x ?? 0
  const sy = section.y ?? 0
  const rot = ((section.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  return {
    x: +(sx + local.x * cos - local.y * sin).toFixed(2),
    y: +(sy + local.x * sin + local.y * cos).toFixed(2),
  }
}

export function localVectorToWorld(
  local: { ux: number; uy: number },
  sectionRotation: number,
): { ux: number; uy: number } {
  const rot = (sectionRotation * Math.PI) / 180
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  return {
    ux: +(local.ux * cos - local.uy * sin).toFixed(4),
    uy: +(local.ux * sin + local.uy * cos).toFixed(4),
  }
}

/** 根据 section fill 匹配默认 category key */
export function resolveCategoryKey(
  section: Section | undefined,
  categories: Category[],
): string | number {
  const fill = section?.fill
  if (fill) {
    const cat = categories.find(c => c.color === fill)
    if (cat) return cat.key
  }
  return 1
}

export interface SeatDrawRowData {
  x: number
  y: number
  ux: number
  uy: number
  count: number
  spacing: number
}

/** 把 canvas 绘制结果转成持久化 SeatRow + Seats */
export function buildSeatRowFromDrawData(
  rowData: SeatDrawRowData,
  options: {
    section?: Section
    categories: Category[]
    generateSeatId?: () => string
  },
): SeatRow {
  const { section, categories, generateSeatId = generateId } = options
  const categoryKey = resolveCategoryKey(section, categories)
  const rotation = rotationFromVector(rowData.ux, rowData.uy)

  const row_id = generateId()
  const sec_id = section?.id

  const seats: Seat[] = Array.from({ length: rowData.count }, (_, i) => ({
    id: generateSeatId(),
    label: String(i + 1),
    x: +(i * rowData.spacing).toFixed(2),
    y: 0,
    cat_id: categoryKey,
    status: 'available',
    type: 'seat',
    sec_id,
    row_id,
  }))

  return {
    id: row_id,
    label: '',
    x: rowData.x,
    y: rowData.y,
    rotation,
    seatSpacing: rowData.spacing,
    rowSpacing: 24,
    curve: 0,
    seats,
  }
}

/** 批量把 canvas 绘制结果转成 SeatRow[]（世界坐标） */
export function buildSeatRowsFromDrawData(
  rows: SeatDrawRowData[],
  options: {
    section?: Section
    categories: Category[]
    generateSeatId?: () => string
  },
): SeatRow[] {
  return rows.map(r => buildSeatRowFromDrawData(r, options))
}

/** 计算若干 row 的世界坐标包围盒 */
export function computeRowsBoundingBox(rows: SeatDrawRowData[]): {
  x: number
  y: number
  width: number
  height: number
} {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const row of rows) {
    const lastIdx = row.count - 1
    const lastX = row.x + row.ux * row.spacing * lastIdx
    const lastY = row.y + row.uy * row.spacing * lastIdx
    minX = Math.min(minX, row.x, lastX)
    minY = Math.min(minY, row.y, lastY)
    maxX = Math.max(maxX, row.x, lastX)
    maxY = Math.max(maxY, row.y, lastY)
  }
  const padding = 40
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }
}

/** 根据 row 列表生成一个包围它们的矩形 section */
export function buildSectionFromRows(
  rows: SeatDrawRowData[],
  options: { name?: string; fill?: string; stroke?: string },
): Omit<Section, 'id' | 'rows'> {
  const { x, y, width, height } = computeRowsBoundingBox(rows)
  const path = `M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`
  return {
    name: options.name || '分区',
    type: 'path',
    path,
    x,
    y,
    width,
    height,
    fill: options.fill || '#d1d5db',
    stroke: options.stroke || '#9ca3af',
    shapes: [],
    texts: [],
    areas: [],
  }
}

/** 将 section 局部的 SeatDrawRowData 转成世界坐标的 SeatRow */
export function buildWorldSeatRowsFromLocalDrawData(
  localRows: SeatDrawRowData[],
  section: { x?: number; y?: number; rotation?: number },
  options: {
    section: Section
    categories: Category[]
    generateSeatId?: () => string
  },
): SeatRow[] {
  return localRows.map(localRow => {
    const worldPos = localToWorld({ x: localRow.x, y: localRow.y }, section)
    const worldDir = localVectorToWorld({ ux: localRow.ux, uy: localRow.uy }, section.rotation ?? 0)
    return buildSeatRowFromDrawData(
      {
        x: worldPos.x,
        y: worldPos.y,
        ux: worldDir.ux,
        uy: worldDir.uy,
        count: localRow.count,
        spacing: localRow.spacing,
      },
      options,
    )
  })
}
