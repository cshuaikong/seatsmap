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
    proxy: {
      '/venue': {
        target: 'http://seatmap.web.jinsc.cn',
        changeOrigin: true,
      }
    }
  }
})
