const BASE_URL = import.meta.env.VITE_API_BASE || ''
const REQUEST_TIMEOUT = 30000

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

function withTimeout<T>(promise: Promise<T>, ms: number, url: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`请求超时: ${url}`)), ms)
    )
  ])
}

export async function request<T = any>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = `${BASE_URL}${url}`
  const response = await withTimeout(
    fetch(fullUrl, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    }),
    REQUEST_TIMEOUT,
    fullUrl
  )

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText} (${fullUrl})`)
  }

  const rawText = await response.text()

  let json: ApiResponse<T>
  try {
    json = JSON.parse(rawText)
  } catch {
    throw new Error(`接口返回非 JSON 数据: ${fullUrl}\n${rawText.slice(0, 200)}`)
  }

  if (json.code !== 0) {
    throw new Error(json.msg || '接口错误')
  }
  return json.data
}
