import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

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
      '/venue': {
        target: 'https://seatmap.web.jinsc.cn',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})
