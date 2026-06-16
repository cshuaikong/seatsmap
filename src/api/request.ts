const BASE_URL = import.meta.env.VITE_API_BASE || 'http://seatmap.web.jinsc.cn'

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

export async function request<T = any>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`)
  }
  const json: ApiResponse<T> = await response.json()
  if (json.code !== 0) {
    throw new Error(json.msg || '接口错误')
  }
  return json.data
}
