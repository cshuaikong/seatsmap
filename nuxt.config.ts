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
    // 仅服务端可见；分别由 NUXT_RESEND_API_KEY、NUXT_CONTACT_INBOX、
    // NUXT_CONTACT_FROM_EMAIL 覆盖。
    resendApiKey: '',
    contactInbox: 'contact@seatmap.page',
    contactFromEmail: 'SeatsMap <contact@seatmap.page>',
    public: {
      // 浏览器可见；由 NUXT_PUBLIC_API_BASE、NUXT_PUBLIC_GOOGLE_ANALYTICS_ID 覆盖。
      apiBase: 'https://seatmap.web.jinsc.cn',
      googleAnalyticsId: 'G-H2N7YVT1TC',
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
