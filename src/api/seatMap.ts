import { request } from './request'

export interface SeatMapEntry {
  id?: string
  venue_id?: string
  name: string
  color?: string
}

/** 兼容列表接口返回 id 或 venue_id */
export function getVenueId(item: SeatMapEntry): string {
  return item.venue_id || item.id || ''
}

export function fetchSeatMaps(): Promise<SeatMapEntry[]> {
  return request<SeatMapEntry[]>('/api/venue/list')
}

export async function fetchSeatMapData(venueId: string): Promise<any> {
  const raw = await request<any>(`/api/venue?venue_id=${venueId}`)
  // 后端返回 { venue: {...} }，提取内层
  return raw.venue || raw
}

/**
 * 把内部字段 categoryKey 映射为后端期望的 cat_id
 * 不改变原始对象
 */
function mapVenueToApi(venue: any): any {
  const mapped = JSON.parse(JSON.stringify(venue))
  mapped.sections?.forEach((section: any) => {
    section.rows?.forEach((row: any) => {
      row.seats?.forEach((seat: any) => {
        if (seat.categoryKey !== undefined) {
          seat.cat_id = seat.categoryKey
        }
      })
    })
  })
  return mapped
}

export function editVenue(data: any): Promise<any> {
  return request('/api/venue/edit', {
    method: 'POST',
    body: JSON.stringify(mapVenueToApi(data)),
  })
}

/** 创建新场馆（后端接口地址请根据实际接口调整） */
export function createVenue(venue: any): Promise<any> {
  return request('/api/venue/create', {
    method: 'POST',
    body: JSON.stringify({ venue: mapVenueToApi(venue) }),
  })
}
