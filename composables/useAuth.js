/**
 * 用户认证 composable（预留）
 * 后续后端提供注册/登录接口后启用
 */
import { ref, computed } from 'vue'

// 单例状态（SSR 安全：服务端每次请求独立，客户端共享）
const _user = ref(null)
const _token = ref(null)

export function useAuth() {
  const config = useRuntimeConfig()

  const isLoggedIn = computed(() => !!_token.value)
  const user = computed(() => _user.value)

  /** 登录 */
  async function login(email, password) {
    try {
      const res = await $fetch(`${config.public.apiBase}/auth/login`, {
        method: 'POST',
        body: { email, password },
      })
      const data = res?.data ?? res
      _token.value = data?.token ?? null
      _user.value = data?.user ?? null
      // 持久化到 cookie（SSR 安全）
      if (import.meta.client && _token.value) {
        document.cookie = `token=${_token.value}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      }
      return data
    } catch (e) {
      throw e
    }
  }

  /** 注册 */
  async function register(email, name, password) {
    try {
      const res = await $fetch(`${config.public.apiBase}/auth/register`, {
        method: 'POST',
        body: { email, name, password },
      })
      return res?.data ?? res
    } catch (e) {
      throw e
    }
  }

  /** 登出 */
  function logout() {
    _token.value = null
    _user.value = null
    if (import.meta.client) {
      document.cookie = 'token=; path=/; max-age=0'
    }
    navigateTo('/login')
  }

  /** 获取当前用户信息 */
  async function fetchUser() {
    if (!_token.value) return
    try {
      const res = await $fetch(`${config.public.apiBase}/auth/me`, {
        headers: {
          Authorization: `Bearer ${_token.value}`,
        },
      })
      _user.value = res?.data ?? res ?? null
    } catch {
      // token 过期或无效
      logout()
    }
  }

  /** 初始化：从 cookie 恢复 token */
  function init() {
    if (import.meta.client) {
      const match = document.cookie.match(/token=([^;]+)/)
      if (match) {
        _token.value = match[1]
        fetchUser()
      }
    }
  }

  return {
    user,
    token: _token,
    isLoggedIn,
    login,
    register,
    logout,
    fetchUser,
    init,
  }
}
