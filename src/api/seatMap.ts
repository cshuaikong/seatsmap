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
  return request<SeatMapEntry[]>('/venue/list')
}

export async function fetchSeatMapData(venueId: string): Promise<any> {
  const raw = await request<any>(`/venue?venue_id=${venueId}`)
  // 后端返回 { venue: {...} }，提取内层
  return raw.venue || raw
}

export function editVenue(data: any): Promise<any> {
  return request('/venue/edit', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
