/**
 * 生产环境 API 代理
 * 将所有 /api/** 请求透传到后端服务器
 * 开发环境使用 nitro.devProxy（见 nuxt.config.ts）
 * 兼容 Node.js / Cloudflare Workers 环境
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const backend = config.apiBackend

  // 使用跨环境兼容的方式获取路径
  const path = getRequestURL(event).pathname
  const query = getQuery(event)

  // 去掉 /api 前缀，拼接到后端地址
  const targetPath = path.replace(/^\/api/, '')
  const targetUrl = `${backend}${targetPath}`

  try {
    const result = await $fetch(targetUrl, {
      method: event.method as string,
      headers: {
        'content-type': event.headers.get('content-type') || 'application/json',
      },
      body: ['GET', 'HEAD'].includes(event.method) ? undefined : await readBody(event),
      query,
    })
    return result
  } catch (error: any) {
    const status = error?.statusCode || error?.response?.status || 500
    const message = error?.data?.message || error?.message || 'API 代理错误'
    throw createError({ statusCode: status, message })
  }
})
