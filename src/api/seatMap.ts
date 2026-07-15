import { request } from './request'

export interface VenueListItem {
  id?: string
  name: string
  color?: string
}

export function getVenueId(item: VenueListItem): string {
  return item.id || ''
}

export function fetchSeatMaps(): Promise<VenueListItem[]> {
  return request<VenueListItem[]>('/api/venue/list')
}

export async function fetchSeatMapData(venueId: string): Promise<any> {
  const raw = await request<any>(`/api/venue?venue_id=${venueId}`)
  return raw
}

/** 获取座位列表（与场馆数据分离的独立接口） */
export async function fetchSeatList(venueId: string): Promise<any> {
  return request<any>(`/api/venue/seats?venue_id=${venueId}`)
}

export function editVenue(data: any): Promise<any> {
  return request('/api/venue/edit', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 创建新场馆（后端接口地址请根据实际接口调整） */
export function createVenue(venue: any): Promise<any> {
  return request('/api/venue/create', {
    method: 'POST',
    body: JSON.stringify({ venue }),
  })
}
