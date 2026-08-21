// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  ssr: true,

  // ---- 站点元信息 ----
  site: {
    url: 'https://seatmap.page',
    name: 'SeatsMap - 在线座位图设计器',
  },

  // ---- 运行时配置 ----
  runtimeConfig: {
    apiBackend: process.env.NUXT_API_BACKEND || 'https://seatmap.web.jinsc.cn',
    // 联系表单邮件服务：仅在服务端读取，绝不暴露给浏览器。
    // 生产环境优先配置 NUXT_RESEND_API_KEY。
    resendApiKey: process.env.NUXT_RESEND_API_KEY || process.env.RESEND_API_KEY || '',
    contactInbox: process.env.NUXT_CONTACT_INBOX || 'contact@seatmap.page',
    contactFromEmail: process.env.NUXT_CONTACT_FROM_EMAIL || 'SeatsMap <contact@seatmap.page>',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      // GA4 衡量 ID（例如 G-XXXXXXXXXX）。未配置时不加载 Google 统计脚本。
      googleAnalyticsId: process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID || '',
    },
  },

  // ---- Nitro 配置 ----
  nitro: {
    // Cloudflare Pages 部署时通过环境变量 NITRO_PRESET=cloudflare-pages 指定
    // 本地开发无需设置，默认 Node.js

    // 开发环境 API 代理（仅本地开发生效）
    devProxy: {
      '/api': {
        target: 'https://seatmap.web.jinsc.cn',
        changeOrigin: true,
        headers: {
          'X-Forwarded-Host': 'seatmap.web.jinsc.cn',
        },
      },
    },
  },

  // ---- 全局 CSS ----
  css: ['~/assets/css/global.css'],

  // ---- 模块 ----
  modules: [
    '@nuxt/content',  // 内容管理模块，支持 Markdown 预渲染
  ],

  // ---- 内容模块配置 ----
  content: {
    // 启用文档驱动模式
    documentDriven: true,
    
    // 本地文件系统驱动
    sources: {
      local: {
        driver: 'fs',
        base: 'content'
      }
    },
    
    // 代码高亮
    highlight: {
      preload: ['ts', 'js', 'vue', 'md', 'json'],
      theme: {
        default: 'github-light',
        dark: 'github-dark'
      }
    },
    
    // Markdown 扩展
    markdown: {
      anchorLinks: {
        depth: 3,
        exclude: [1]
      }
    },
    
    // 实验性功能
    experimental: {
      clientDB: false // Cloudflare Pages 不支持 IndexedDB
    }
  },

  // ---- 按路由覆盖渲染模式 ----
  routeRules: {
    '/console/**': { ssr: false },
    '/login': { ssr: false },
    '/register': { ssr: false },
    
    // 内容页面预渲染
    '/blog/**': { prerender: true },
    '/cases/**': { prerender: true },
    
    // API 路由
    '/api/_content/**': { cors: true },
  },

  // ---- 开发工具 ----
  devtools: { enabled: true },
})
