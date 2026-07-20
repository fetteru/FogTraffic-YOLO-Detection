import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4174', changeOrigin: true }
    }
  },
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 900 },
  optimizeDeps: { include: ['vue', 'vue-router', 'element-plus', 'echarts'] }
});
