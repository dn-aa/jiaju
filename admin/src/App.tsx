// ============================================================
// 【代码段功能】App 根组件：墨金主题注入 + 路由挂载
// ============================================================
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { RouterProvider } from 'react-router-dom';
import { antdGoldTheme } from './theme/antdTheme';
import { router } from './router';

export default function App() {
  return (
    // 墨金主题 + 中文语言包（后台仅桌面端，NFR-4）
    <ConfigProvider theme={antdGoldTheme} locale={zhCN}>
      {/* AntApp 提供 message/notification 上下文（替代静态调用） */}
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  );
}
