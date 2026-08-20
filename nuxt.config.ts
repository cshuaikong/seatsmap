// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  ssr: true,

  // ---- 站点元信息（供 sitemap / SEO 模块使用）----
  site: {
    url: 'https://seatmap.web.jinsc.cn',
    name: 'SeatsMap - 在线座位图设计器',
  },

  // ---- 运行时配置 ----
  runtimeConfig: {
    // 服务端私有：后端 API 真实地址（生产环境代理用）
    apiBackend: process.env.NUXT_API_BACKEND || 'https://seatmap.web.jinsc.cn',
    // 客户端公开：前端请求的 API 基地址
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
    },
  },

  // ---- 开发环境 API 代理（等价于旧 vite proxy）----
  nitro: {
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

  // ---- 按路由覆盖渲染模式 ----
  routeRules: {
    // 控制台 / 设计器：纯 CSR
    '/console/**': { ssr: false },
    // 登录 / 注册：CSR + noindex
    '/login': { ssr: false },
    '/register': { ssr: false },
  },

  // ---- 全局 CSS ----
  css: ['~/assets/css/global.css'],

  // ---- Vite 配置 ----
  vite: {
    // 确保本地 pkg 不被预构建（开发时热更新友好）
    optimizeDeps: {
      include: ['seatmap-designer'],
    },
  },

  // ---- 模块 ----
  modules: [
    '@nuxtjs/sitemap',
    '@nuxtjs/seo',
  ],

  // ---- Sitemap 配置 ----
  sitemap: {
    hostname: 'https://seatmap.web.jinsc.cn',
    exclude: ['/console/**', '/login', '/register'],
  },

  // ---- OG Image 配置（暂时禁用，后续按需启用）----
  ogImage: {
    enabled: false,
  },

  // ---- 开发工具 ----
  devtools: { enabled: true },
})
