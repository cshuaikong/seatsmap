/**
 * 生产环境 API 代理
 * 将所有 /api/** 请求透传到后端服务器
 * 开发环境使用 nitro.devProxy（见 nuxt.config.ts）
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const backend = config.apiBackend
  const path = event.context.path || event.node.req.url || ''

  // 去掉 /api 前缀，拼接到后端地址
  const targetPath = path.replace(/^\/api/, '')
  const targetUrl = `${backend}${targetPath}`

  try {
    const result = await $fetch(targetUrl, {
      method: event.method,
      headers: {
        'content-type': event.headers.get('content-type') || 'application/json',
      },
      body: ['GET', 'HEAD'].includes(event.method) ? undefined : await readBody(event),
      query: getQuery(event),
    })
    return result
  } catch (error) {
    const status = error?.statusCode || error?.response?.status || 500
    const message = error?.data?.message || error?.message || 'API 代理错误'
    throw createError({ statusCode: status, message })
  }
})
