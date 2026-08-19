// ============================================================
// 【代码段功能】admin 后台 Vite 构建配置
//   - 端口 5174（区别于前台 5173）
//   - 开发期把 /api 与 /uploads 代理到本地 FastAPI(8000)，避免跨域
// ============================================================
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // React 插件：启用 JSX 自动转换与 Fast Refresh
  plugins: [react()],
  server: {
    port: 5174,                 // 后台开发端口
    proxy: {
      // 所有 /api 请求转发到后端服务（开发技术文档 §2.2）
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      // 上传文件（头像/图片/简历）通过后端静态目录访问
      '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
