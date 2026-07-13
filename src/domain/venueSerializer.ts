import { nanoid } from 'nanoid'
import type { VenueData } from '../types'
import type { LeaferUI } from '../types/leafer-meta'

/**
 * 场馆序列化器
 *
 * 职责：把 VenueData 序列化为可存储/传输的格式，
 * 或从 Leafer 画布状态反序列化回 VenueData。
 *
 * 注意：buildVenueDataFromCanvas 仍依赖 Leafer 运行时元素，
 * 这是当前"画布为中心"架构的遗留。后续应逐步让 store 数据成为唯一真相，
 * 最终只保留 serializeVenue / deserializeVenue。
 */

/** 把 VenueData 序列化为 JSON 字符串 */
export function serializeVenue(venue: VenueData): string {
  return JSON.stringify(venue, null, 2)
}

/** 从 JSON 字符串反序列化 VenueData */
export function deserializeVenue(json: string): VenueData {
  return JSON.parse(json)
}

export interface CanvasSerializerInput {
  /** 原始场馆数据，用于补齐 id/categories/未在画布上的 section 等 */
  rawVenue: any
  /** Section Group 映射：sectionId -> Leafer Group */
  sectionGroupMap: Map<string, LeaferUI>
  /** 座位排 Group 数组 */
  seatRowGroups: LeaferUI[]
}

/**
 * 从 Leafer 画布状态构建 VenueData
 *
 * 这是当前架构下必要的反向序列化：画布上的 SectionGroup、座位排 Group
 * 包含了位置、旋转、路径等运行时信息，需要转回 VenueData 的持久化格式。
 */
export function buildVenueDataFromCanvas(input: CanvasSerializerInput): VenueData {
  const { rawVenue, sectionGroupMap, seatRowGroups } = input
  const raw = rawVenue || {}

  // 1. 从 sectionGroupMap 构建 section 基础数据
  //    x/y/rotation 从 Group 读，path 从子 Path 读
  const pathSectionMap = new Map<string, any>()
  sectionGroupMap.forEach((group, sectionId) => {
    const pathChild = group.children?.find((c: any) => c.tag === 'Path') as LeaferUI | undefined
    if (!pathChild) return

    const sec: any = {
      id: sectionId,
      name: group.__sectionName || '',
      rows: [] as any[],
      type: 'path',
      x: +(group.x ?? 0).toFixed(2),
      y: +(group.y ?? 0).toFixed(2),
      fill: pathChild.fill,
      stroke: pathChild.stroke,
      path: pathChild.path,
      width: pathChild.width ?? 100,
      height: pathChild.height ?? 100,
    }
    if (group.rotation) sec.rotation = +(group.rotation ?? 0).toFixed(2)
    if (group.zIndex != null) sec.zIndex = group.zIndex
    pathSectionMap.set(sectionId, sec)
  })

  // 2. 从 seatRowGroups 构建 row → section 关系
  const sectionRowsMap = new Map<string, any[]>()
  const sectionRowLookup = new Map<string, Map<string, any>>()

  seatRowGroups.forEach((g: LeaferUI) => {
    const sectionId = g.__sectionId
    if (!sectionId) return

    if (!sectionRowsMap.has(sectionId)) sectionRowsMap.set(sectionId, [])
    if (!sectionRowLookup.has(sectionId)) sectionRowLookup.set(sectionId, new Map())

    const rowLookup = sectionRowLookup.get(sectionId)!
    const rowId = g.__rowId || nanoid(8)
    const ellipses = (g.__seatEllipses || []) as LeaferUI[]
    const rowData = g.__seatRowData
    const rowLabel = g.__rowLabel || ''
    const barPts = (g.__bar as any)?.points ?? []

    // SectionGroup 世界变换（用于局部 → 世界）
    const sectionGroup = sectionGroupMap.get(sectionId)
    const sX = sectionGroup?.x ?? 0
    const sY = sectionGroup?.y ?? 0
    const sRot = ((sectionGroup?.rotation ?? 0) * Math.PI) / 180
    const cosS = Math.cos(sRot)
    const sinS = Math.sin(sRot)

    // Row 原点：局部 → 世界
    const rowGX = g.x ?? 0
    const rowGY = g.y ?? 0
    const barPt0 = barPts[0] ?? rowData?.x ?? 0
    const barPt1 = barPts[1] ?? rowData?.y ?? 0
    const rowLocalX = rowGX + barPt0
    const rowLocalY = rowGY + barPt1
    const rowWorldX = sX + rowLocalX * cosS - rowLocalY * sinS
    const rowWorldY = sY + rowLocalX * sinS + rowLocalY * cosS

    // 世界行方向
    const fbX = rowData ? barPt0 + rowData.ux * rowData.spacing * (rowData.count - 1) : barPt0
    const fbY = rowData ? barPt1 + rowData.uy * rowData.spacing * (rowData.count - 1) : barPt1
    const beLX = rowGX + (barPts[2] ?? fbX)
    const beLY = rowGY + (barPts[3] ?? fbY)
    const beWX = sX + beLX * cosS - beLY * sinS
    const beWY = sY + beLX * sinS + beLY * cosS
    const worldRowRot = Math.atan2(beWY - rowWorldY, beWX - rowWorldX)

    if (!rowLookup.has(rowId)) {
      const row: any = {
        id: rowId,
        label: rowLabel,
        x: +rowWorldX.toFixed(2),
        y: +rowWorldY.toFixed(2),
        rotation: +(worldRowRot * 180 / Math.PI).toFixed(2),
        curve: +(g.__curve ?? 0).toFixed(2),
        seats: [],
      }
      if (g.__seatSpacing != null) row.seatSpacing = +g.__seatSpacing.toFixed(2)
      if (g.__rowSpacing != null) row.rowSpacing = +g.__rowSpacing.toFixed(2)
      if (g.__categoryId != null) row.categoryKey = g.__categoryId
      rowLookup.set(rowId, row)
      sectionRowsMap.get(sectionId)!.push(row)
    }

    const row = rowLookup.get(rowId)!

    // 世界行方向 → 行局部坐标逆旋转
    const cosWRR = Math.cos(-worldRowRot)
    const sinWRR = Math.sin(-worldRowRot)

    ellipses.forEach((ell: LeaferUI) => {
      const src = ell.__sourceSeat
      const ellLocalX = rowGX + (ell.x ?? 0)
      const ellLocalY = rowGY + (ell.y ?? 0)
      const eWX = sX + ellLocalX * cosS - ellLocalY * sinS
      const eWY = sY + ellLocalX * sinS + ellLocalY * cosS
      const wx = eWX - rowWorldX
      const wy = eWY - rowWorldY
      const localX = wx * cosWRR - wy * sinWRR
      const localY = wx * sinWRR + wy * cosWRR

      row.seats.push({
        id: ell.__seatId || src?.id || nanoid(8),
        label: src?.label || '',
        x: +localX.toFixed(2),
        y: +localY.toFixed(2),
        categoryKey: ell.__categoryKey ?? src?.categoryKey ?? 1,
        status: normalizeSeatStatus(src?.status),
        objectType: normalizeSeatObjectType(src?.objectType),
      })
    })
  })

  // 3. 合并 section：有 Group 的直接输出
  const sections: any[] = []
  const seenSectionIds = new Set<string>()

  sectionGroupMap.forEach((_group, sectionId) => {
    const sec = pathSectionMap.get(sectionId)
    if (!sec) return
    if (sectionRowsMap.has(sectionId)) {
      sec.rows = sectionRowsMap.get(sectionId)!
    }
    sections.push(sec)
    seenSectionIds.add(sectionId)
  })

  // 4. 补充只有座位没有边框的 section（从原始 venueData）
  const origSections = rawVenue?.sections ?? []
  for (const orig of origSections) {
    if (seenSectionIds.has(orig.id)) continue
    if (!sectionRowsMap.has(orig.id)) continue
    sections.push({
      id: orig.id,
      name: orig.name,
      rows: sectionRowsMap.get(orig.id)!,
      type: orig.type || orig.borderType || 'path',
      x: +(orig.x ?? 0).toFixed(2),
      y: +(orig.y ?? 0).toFixed(2),
      fill: orig.fill || '#dbdbdb',
      stroke: orig.stroke || '#81C784',
    })
    seenSectionIds.add(orig.id)
  }

  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    categories: raw.categories ?? [],
    baseScale: +(raw.baseScale ?? raw.scale ?? 1),
    sections
  }
}

// ==================== 辅助函数 ====================

const STATUS_MAP: Record<string, number> = {
  available: 0,
  sold: 1,
  reserved: 2
}

function normalizeSeatStatus(status: string | undefined): number {
  return STATUS_MAP[status || 'available'] ?? 0
}

function normalizeSeatObjectType(objectType: string | undefined): 'seat' | 'wheelchair' | 'companion' | 'generalAdmission' {
  const map: Record<string, any> = {
    seat: 'seat',
    wheelchair: 'wheelchair',
    companion: 'companion',
    generalAdmission: 'generalAdmission'
  }
  return map[objectType || 'seat'] || 'seat'
}
