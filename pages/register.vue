<script setup>
definePageMeta({ ssr: false, layout: 'blank' })
useHead({
  title: '注册 - SeatsMap',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const { register } = useAuth()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const success = ref(false)

async function handleSubmit() {
  if (!name.value || !email.value || !password.value) {
    errorMsg.value = '请填写所有字段'
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    await register(email.value, name.value, password.value)
    success.value = true
  } catch (e) {
    errorMsg.value = e?.data?.message || e?.message || '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>注册</h1>
      <p class="auth-desc">注册 SeatsMap 账户，开始设计您的场馆座位图。</p>
      <div v-if="success" class="success-msg">
        <p>注册成功！请等待管理员开通账户。</p>
        <NuxtLink to="/login" class="btn btn-primary">去登录</NuxtLink>
      </div>
      <form v-else @submit.prevent="handleSubmit">
        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
        <div class="form-group">
          <label>姓名</label>
          <input v-model="name" type="text" placeholder="您的姓名" :disabled="loading" />
        </div>
        <div class="form-group">
          <label>邮箱</label>
          <input v-model="email" type="email" placeholder="工作邮箱" :disabled="loading" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="设置密码" :disabled="loading" />
        </div>
        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? '注册中…' : '注册' }}
        </button>
      </form>
      <p class="auth-footer">已有账户？<NuxtLink to="/login">去登录</NuxtLink></p>
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
.success-msg { text-align: center; padding: 24px 0; }
.success-msg p { color: #2e7d32; font-size: 15px; margin-bottom: 16px; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
