<script setup>
definePageMeta({ ssr: false, layout: 'blank' })
useHead({
  title: '登录 - SeatsMap',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const { login } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  if (!email.value || !password.value) {
    errorMsg.value = '请填写邮箱和密码'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    await login(email.value, password.value)
    navigateTo('/console/venues')
  } catch (e) {
    errorMsg.value = e?.data?.message || e?.message || '登录失败，请检查邮箱和密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>登录</h1>
      <p class="auth-desc">登录您的 SeatsMap 账户，管理场馆和座位图。</p>
      <form @submit.prevent="handleSubmit">
        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
        <div class="form-group">
          <label>邮箱</label>
          <input v-model="email" type="email" placeholder="您的邮箱" :disabled="loading" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="密码" :disabled="loading" />
        </div>
        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>
      <p class="auth-footer">还没有账户？<NuxtLink to="/contact">联系我们开通</NuxtLink></p>
    </div>
  </div>
</template>

<style scoped>
.auth-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8faff; }
.auth-card { width: 100%; max-width: 400px; padding: 40px; background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.auth-card h1 { font-size: 24px; font-weight: 700; color: #111; margin: 0 0 8px; }
.auth-desc { font-size: 14px; color: #666; margin: 0 0 24px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: #333; margin-bottom: 6px; }
.form-group input { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.form-group input:focus { outline: none; border-color: #4a7cff; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 24px; font-size: 14px; font-weight: 500; border-radius: 8px; border: none; cursor: pointer; text-decoration: none; }
.btn-primary { background: #4a7cff; color: #fff; }
.btn-primary:hover { background: #3a6ae8; }
.btn-full { width: 100%; }
.auth-footer { text-align: center; font-size: 13px; color: #888; margin: 20px 0 0; }
.auth-footer a { color: #4a7cff; }
.error-msg { background: #fff0f0; color: #d32f2f; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
