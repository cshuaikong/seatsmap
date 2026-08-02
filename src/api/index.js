import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

// ==================== 场馆 ====================

/** 场馆列表 */
export function fetchVenueList() {
  return http.get('/venue/list')
}

/** 场馆详情（含分区 sections + 排 rows） */
export function fetchVenueDetail(venueId) {
  return http.get('/venue', { params: { venue_id: venueId } })
}

/** 座位列表（按 row_id 关联到排） */
export function fetchVenueSeats(venueId) {
  return http.get('/venue/seats', { params: { venue_id: venueId } })
}

/** 保存（新增+保存一体）。saveHandler 契约：必须显式 return true 才算成功 */
export async function saveVenue(data) {
  const res = await http.post('/venue/save', data)
  if (res.data?.code !== undefined && res.data.code !== 0) {
    throw new Error(res.data.msg || '保存失败')
  }
  return true
}

/** 删除场馆 */
export function deleteVenue(venueId) {
  return http.post('/venue/delete', null, { params: { venue_id: venueId } })
}
