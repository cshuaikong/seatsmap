// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  ssr: true,

  // ---- 站点元信息 ----
  site: {
    url: 'https://seatmap.web.jinsc.cn',
    name: 'SeatsMap - 在线座位图设计器',
  },

  // ---- 运行时配置 ----
  runtimeConfig: {
    apiBackend: process.env.NUXT_API_BACKEND || 'https://seatmap.web.jinsc.cn',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
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

  // ---- Vite 配置 ----
  vite: {
    // 本地 pkg 预构建配置：排除以避免已压缩代码的变量名冲突
    optimizeDeps: {
      exclude: ['seatmap-designer'],
    },
    build: {
      // 将 seatmap-designer 作为外部依赖，不参与 Rollup 打包
      rollupOptions: {
        external: ['seatmap-designer'],
      },
    },
    // SSR 构建也排除
    ssr: {
      noExternal: [],
    },
  },

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
