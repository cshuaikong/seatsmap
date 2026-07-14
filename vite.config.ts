import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const API_TARGET = 'https://seatmap.web.jinsc.cn'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  publicDir: 'static',
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            console.error(`[proxy error] ${req.method} ${req.url} -> ${API_TARGET}${req.url}`, err.message)
          })
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`[proxy] ${req.method} ${req.url} -> ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path}`)
          })
        }
      }
    }
  }
})
