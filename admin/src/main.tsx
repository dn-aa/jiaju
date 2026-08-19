// ============================================================
// 【代码段功能】admin 入口：React 挂载
// ============================================================
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 严格模式：开发期双渲染以暴露潜在副作用（生产无影响）
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
