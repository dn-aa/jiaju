// ============================================================
// 【代码段功能】前台路由（阶段 5：10 页全量注册，PRD §5 信息架构）
//   首页 / 产品中心(列表+详情) / 新案例(列表+详情) / 新闻(列表+详情)
//   加入我们(列表+详情+投递) / 关于我们 / 联系我们 / 在线预约 / 在线留言
// ============================================================
import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import Home from '../pages/Home';
import Products from '../pages/Products';
import ProductDetail from '../pages/ProductDetail';
import Cases from '../pages/Cases';
import CaseDetail from '../pages/CaseDetail';
import News from '../pages/News';
import NewsDetail from '../pages/NewsDetail';
import Jobs from '../pages/Jobs';
import JobDetail from '../pages/JobDetail';
import About from '../pages/About';
import Contact from '../pages/Contact';
import Appointment from '../pages/Appointment';
import Message from '../pages/Message';

export const router = createBrowserRouter([
  {
    // 全局布局（顶栏+页脚）包裹所有页面
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/products', element: <Products /> },
      { path: '/products/:id', element: <ProductDetail /> },
      { path: '/cases', element: <Cases /> },
      { path: '/cases/:id', element: <CaseDetail /> },
      { path: '/news', element: <News /> },
      { path: '/news/:id', element: <NewsDetail /> },
      { path: '/jobs', element: <Jobs /> },
      { path: '/recruit', element: <Jobs /> },   // 招聘入口（文档 §4.1 #5，职位列表）
      { path: '/jobs/:id', element: <JobDetail /> },
      { path: '/about', element: <About /> },
      { path: '/contact', element: <Contact /> },
      { path: '/appointment', element: <Appointment /> },
      { path: '/message', element: <Message /> },
      // 兜底：未匹配回首页
      { path: '*', element: <Home /> },
    ],
  },
]);
