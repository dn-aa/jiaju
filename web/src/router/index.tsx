// ============================================================
// 【代码段功能】前台路由骨架（阶段 5 实现全部 10 页）
//   阶段 1：仅首页占位展示墨金风格；其余页面路由已预留
// ============================================================
import { createBrowserRouter } from 'react-router-dom';
import Home from '../pages/Home';

// 页面路由表（与 PRD §5 信息架构一致；阶段 5 逐个实现）
export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  // 预留（阶段 5 实现）：
  // /products /products/:id 产品中心
  // /cases /cases/:id       新案例展示
  // /news /news/:id         新闻
  // /recruit /jobs/:id      招聘/职位详情
  // /about /about/history /about/brand /contact 关于我们/联系我们
]);
