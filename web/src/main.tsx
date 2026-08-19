// ============================================================
// 【代码段功能】web 入口：React 挂载 + 全局样式 + React Query 提供者
//   QueryClient：数据缓存/自动重试/错误静默（前台展示兜底空态）
// ============================================================
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// 前台数据获取客户端：默认缓存 5 分钟、失败静默（页面兜底空态）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 分钟视为新鲜
      retry: 1,                       // 失败重试 1 次
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
