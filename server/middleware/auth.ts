/**
 * 服务端鉴权中间件（预留）
 * 后续后端提供用户系统后，在此处统一校验 token
 * 
 * 当前仅做透传，不做拦截
 */
export default defineEventHandler((event) => {
  // 不访问 event.node.req：该 Node 兼容对象在 Cloudflare Workers 下不可靠。
  const url = getRequestURL(event).pathname

  // 仅对 /api/ 开头的请求做鉴权处理
  if (!url.startsWith('/api/')) return

  // 后续在此添加 token 校验逻辑：
  // const token = getCookie(event, 'token')
  // if (!token && requiresAuth(url)) {
  //   throw createError({ statusCode: 401, message: 'Unauthorized' })
  // }
})
