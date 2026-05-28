import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // 🌟 刪除 exclude，改用 include，強逼 Vite 乖乖地將呢兩個核心連同底層一齊打包！
  optimizeDeps: {
    include: ['@ai-sdk/vue', 'ai'] 
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
