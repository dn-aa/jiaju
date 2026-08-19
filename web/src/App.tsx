// ============================================================
// 【代码段功能】web 根组件：路由挂载
// ============================================================
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

export default function App() {
  return <RouterProvider router={router} />;
}
