// ============================================================
// 【代码段功能】后台路由（RBAC 动态注册）
//   - 静态路由：/login（登录）、/（主布局）
//   - 主布局内按已实现模块注册业务路由（阶段 2 新增内容管理 5 模块；
//     阶段 3~5 继续追加 leads/sys 模块）
//   - 未登录访问受保护区 → 重定向 /login（路由守卫）
// ============================================================
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import NoPerm from '../pages/NoPerm';
import ProductManage from '../pages/content/Product';
import CaseManage from '../pages/content/Case';
import ArticleManage from '../pages/content/Article';
import PageManage from '../pages/content/Page';
import JobManage from '../pages/recruit/Job';
import ApplicationManage from '../pages/recruit/Application';
import AppointmentManage from '../pages/leads/Appointment';
import MessageManage from '../pages/leads/Message';
import AccountManage from '../pages/sys/Account';
import RoleManage from '../pages/sys/Role';
import LogManage from '../pages/sys/Log';
import { useAuthStore } from '../store/auth';

// 守卫：无 token 一律回登录页
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// 开发中占位组件：对应菜单已注册但模块在后续阶段实现
function ComingSoon({ name }: { name: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: '#78716C' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🛠️</div>
      <div style={{ fontSize: 16, marginBottom: 4 }}>{name}模块开发中</div>
      <div style={{ fontSize: 13 }}>按《项目开发实施方案》阶段 3~5 逐步交付</div>
    </div>
  );
}

// 菜单 path → 已实现组件映射（后续阶段在此追加）
const MODULES: Record<string, React.ReactNode> = {
  '/dashboard': <Dashboard />,
  // 阶段 2：内容管理
  '/content/product': <ProductManage />,
  '/content/case': <CaseManage />,
  '/content/article': <ArticleManage />,
  '/content/page': <PageManage />,
  '/recruit/job': <JobManage />,
  // 阶段 3：线索管理
  '/recruit/application': <ApplicationManage />,
  '/leads/appointment': <AppointmentManage />,
  '/leads/message': <MessageManage />,
  // 阶段 4：系统管理
  '/sys/account': <AccountManage />,
  '/sys/role': <RoleManage />,
  '/sys/log': <LogManage />,
};

// 主布局内的子路由：从已实现模块 + 占位生成
const moduleRoutes = (menuPaths: string[]) => {
  const paths = menuPaths.length ? menuPaths : Object.keys(MODULES);
  return paths.map((p) => ({
    path: p.replace(/^\//, ''),
    element: MODULES[p] || <ComingSoon name={p.split('/').pop() || p} />,
  }));
};

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    // 子路由动态生成：依据当前菜单（刷新后先取 store；首次进入由布局拉取菜单）
    children: [
      ...moduleRoutes(['/dashboard', '/content/product', '/content/case', '/content/article', '/content/page', '/recruit/job', '/recruit/application', '/leads/appointment', '/leads/message', '/sys/account', '/sys/role', '/sys/log']),
      { path: '403', element: <NoPerm /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
