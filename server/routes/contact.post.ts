type ContactSubmission = {
  name?: unknown
  company?: unknown
  email?: unknown
  message?: unknown
  website?: unknown
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] || character))
}

/**
 * 官网联系表单（POST /contact）。使用非 /api 路径，以免被历史 API 代理转发。
 * Resend 密钥必须只配置为服务端环境变量 NUXT_RESEND_API_KEY，
 * 并在 Resend 中验证 NUXT_CONTACT_FROM_EMAIL 所属域名。
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<ContactSubmission>(event)
  // 蜜罐字段：正常用户不会填写；机器人不返回错误信息。
  if (clean(body.website, 200)) return { ok: true }

  const name = clean(body.name, 100)
  const company = clean(body.company, 160)
  const email = clean(body.email, 254)
  const message = clean(body.message, 3000)

  if (!name || !email || !message || !EMAIL_PATTERN.test(email)) {
    throw createError({ statusCode: 400, statusMessage: '请填写姓名、有效邮箱和需求描述。' })
  }

  const config = useRuntimeConfig(event)
  if (!config.resendApiKey) {
    console.error('[contact] Missing NUXT_RESEND_API_KEY')
    throw createError({ statusCode: 503, statusMessage: '邮件服务尚未配置，请直接发送邮件联系我们。' })
  }

  try {
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.resendApiKey}` },
      body: {
        from: config.contactFromEmail,
        to: [config.contactInbox],
        reply_to: email,
        subject: `[SeatsMap 官网咨询] ${name}${company ? `｜${company}` : ''}`,
        text: `姓名：${name}\n公司：${company || '未填写'}\n邮箱：${email}\n\n需求描述：\n${message}`,
        html: `<h2>SeatsMap 官网咨询</h2><p><strong>姓名：</strong>${escapeHtml(name)}</p><p><strong>公司：</strong>${escapeHtml(company || '未填写')}</p><p><strong>邮箱：</strong><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p><p><strong>需求描述：</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
      },
    })
  } catch (error: any) {
    console.error('[contact] Failed to send message', error?.data || error?.message)
    throw createError({ statusCode: 502, statusMessage: '邮件发送失败，请直接发送邮件联系我们。' })
  }

  return { ok: true }
})

