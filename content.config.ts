// https://content.nuxt.com/setup/configuration
export default defineContentConfig({
  // 默认集合配置
  defaultLocale: 'zh-CN',
  
  // 内容来源配置
  sources: {
    // 本地文件系统
    local: {
      driver: 'fs',
      base: 'content'
    }
  },
  
  // 内容国际化配置
  locales: ['en', 'zh-CN'],
  
  // 本地化路由映射
  i18n: {
    strategy: 'prefix_except_default',
    locales: [
      { code: 'en', iso: 'en-US', name: 'English' },
      { code: 'zh-CN', iso: 'zh-CN', name: '中文' }
    ],
    defaultLocale: 'zh-CN'
  },
  
  // Markdown 解析配置
  markdown: {
    // 代码块主题
    highlight: {
      theme: {
        default: 'github-light',
        dark: 'github-dark'
      },
      preload: ['ts', 'js', 'vue', 'md', 'json']
    },
    
    // 锚点链接
    anchorLinks: {
      depth: 3,
      exclude: [1]
    }
  },
  
  // 查询预设
  experimental: {
    clientDB: false, // 在 Cloudflare Pages 上禁用客户端数据库
    stripQueryParameters: false
  }
})