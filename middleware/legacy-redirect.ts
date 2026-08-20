/**
 * 旧链接兼容中间件
 * 将 /?venue_id=xxx 301 重定向到 /console/venues/xxx
 * 此中间件在阶段 5 之后仍然保留，确保所有旧书签/链接永久有效
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/' && to.query.venue_id) {
    return navigateTo(`/console/venues/${to.query.venue_id}`, {
      redirectCode: 301,
    })
  }
})
