<script setup>
import { reactive, ref } from 'vue'

useHead({
  title: '联系我们 - SeatsMap',
  meta: [{ name: 'description', content: '联系 SeatsMap 团队，获取产品试用、技术方案咨询和接入支持。' }],
})

const form = reactive({ name: '', company: '', email: '', message: '', website: '' })
const submitting = ref(false)
const submitState = ref('')
const submitError = ref('')

async function submitContact() {
  submitState.value = ''
  submitError.value = ''
  submitting.value = true
  try {
    await $fetch('/contact', { method: 'POST', body: form })
    submitState.value = '提交成功，我们会尽快回复您。'
    Object.assign(form, { name: '', company: '', email: '', message: '', website: '' })
  } catch (error) {
    submitError.value = error?.data?.statusMessage || '提交失败，请稍后重试或直接发送邮件联系我们。'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <section class="page-hero">
      <div class="container">
        <h1>联系我们</h1>
        <p>获取产品试用、技术方案咨询和接入支持。</p>
      </div>
    </section>

    <section class="section">
      <div class="container contact-grid">
        <div class="contact-card">
          <h3>产品试用</h3>
          <p>填写以下信息，我们将在 1 个工作日内联系您开通试用。</p>
          <form class="contact-form" @submit.prevent="submitContact">
            <div class="form-group">
              <label>姓名</label>
              <input v-model="form.name" type="text" placeholder="您的姓名" autocomplete="name" required :disabled="submitting" />
            </div>
            <div class="form-group">
              <label>公司</label>
              <input v-model="form.company" type="text" placeholder="公司 / 组织名称" autocomplete="organization" :disabled="submitting" />
            </div>
            <div class="form-group">
              <label>邮箱</label>
              <input v-model="form.email" type="email" placeholder="工作邮箱" autocomplete="email" required :disabled="submitting" />
            </div>
            <div class="form-group">
              <label>需求描述</label>
              <textarea v-model="form.message" rows="4" placeholder="简述您的场景和需求" required :disabled="submitting"></textarea>
            </div>
            <input v-model="form.website" class="honeypot" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
            <button type="submit" class="btn btn-primary" :disabled="submitting">{{ submitting ? '正在提交…' : '提交申请' }}</button>
            <p v-if="submitState" class="form-success" role="status">{{ submitState }}</p>
            <p v-if="submitError" class="form-error" role="alert">{{ submitError }}</p>
          </form>
        </div>

        <div class="contact-info">
          <div class="info-card">
            <h3>其他联系方式</h3>
            <div class="info-item">
              <strong>联系邮箱</strong>
              <p><a href="mailto:contact@seatmap.page">contact@seatmap.page</a></p>
            </div>
            <div class="info-item">
              <strong>商务合作</strong>
              <p>请联系商务团队洽谈合作方案。</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.section { padding: 80px 0; }

.page-hero { padding: 80px 0 48px; background: linear-gradient(180deg, #f8faff 0%, #fff 100%); text-align: center; }
.page-hero h1 { font-size: 36px; font-weight: 800; color: #111; margin: 0 0 12px; }
.page-hero p { font-size: 16px; color: #555; margin: 0; }

.contact-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 48px; align-items: start; }

.contact-card { padding: 32px; border: 1px solid #eee; border-radius: 12px; }
.contact-card h3 { font-size: 20px; font-weight: 600; color: #111; margin: 0 0 8px; }
.contact-card > p { font-size: 14px; color: #666; margin: 0 0 24px; }

.contact-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; font-weight: 500; color: #333; }
.form-group input, .form-group textarea {
  padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px;
  font-size: 14px; font-family: inherit; transition: border-color 0.15s;
}
.form-group input:focus, .form-group textarea:focus {
  outline: none; border-color: #4a7cff;
}

.btn { display: inline-flex; padding: 10px 24px; font-size: 14px; font-weight: 500; border-radius: 8px; text-decoration: none; cursor: pointer; border: none; }
.btn-primary { background: #4a7cff; color: #fff; }
.btn-primary:hover { background: #3a6ae8; }
.btn:disabled { cursor: not-allowed; opacity: .65; }
.honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
.form-success, .form-error { margin: -4px 0 0; font-size: 13px; }
.form-success { color: #138a55; }.form-error { color: #c33131; }

.info-card { padding: 24px; background: #f8faff; border-radius: 12px; }
.info-card h3 { font-size: 16px; font-weight: 600; color: #111; margin: 0 0 16px; }
.info-item { margin-bottom: 16px; }
.info-item strong { display: block; font-size: 14px; color: #333; margin-bottom: 4px; }
.info-item p { font-size: 13px; color: #666; margin: 0; }

@media (max-width: 768px) { .contact-grid { grid-template-columns: 1fr; } }
</style>
