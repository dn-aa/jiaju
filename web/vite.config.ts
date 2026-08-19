// ============================================================
// 【代码段功能】web 前台 Vite 构建配置（含 vitest 测试环境）
//   - 端口 5173（后台为 5174）
//   - 开发期把 /api 与 /uploads 代理到本地 FastAPI(8000)
//   - test：vitest + jsdom 环境（组件/表单提交链路测试）
// ============================================================
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,                  // 前台开发端口
    proxy: {
      // 公开接口与线索提交均走 /api 前缀（开发技术文档 §1.2）
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      // 后台配置的图片（产品/案例/Banner 等）通过 /uploads 访问
      '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
  test: {
    environment: 'jsdom',          // 浏览器环境模拟（DOM API）
    globals: true,                 // describe/it/expect 全局可用
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
