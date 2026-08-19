// ============================================================
// 【代码段功能】后台主布局（侧栏 + 顶栏 + 内容区居中）
//   依据 UI/UX v1.2 §4.1：
//   - 侧栏 220px 墨底，菜单按 RBAC 权限渲染（来自 /auth/menus）
//   - 顶栏白底：折叠按钮 + 面包屑 + 角色徽标 + 用户区（头像/昵称 → 个人中心）
//   - 内容区在侧栏右侧区域内居中（max-width 1320px、28/32px 内边距）
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Breadcrumb, Button, Dropdown, Layout, Menu, Modal, Tag } from 'antd';
import {
  DashboardOutlined, AppstoreOutlined, TeamOutlined, InboxOutlined,
  SettingOutlined, MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import Profile from '../pages/Profile';
import type { MenuItem as AuthMenuItem } from '../types';

const { Sider, Header, Content } = Layout;

// 菜单 key → 图标映射（原型菜单 emoji 占位实现时替换为 SVG/Lucide 风格，UI/UX §2.5）
const ICONS: Record<string, React.ReactNode> = {
  dashboard: <DashboardOutlined />,
  content: <AppstoreOutlined />,
  recruit: <TeamOutlined />,
  leads: <InboxOutlined />,
  sys: <SettingOutlined />,
};

// 把后端菜单树转换为 AntD Menu items（含子菜单）
function toMenuItems(items: AuthMenuItem[]): { key: string; label: React.ReactNode; icon?: React.ReactNode; children?: unknown[] }[] {
  return items.map((it) => ({
    key: it.path || it.key,           // 用 path 作为路由跳转 key
    label: it.label,
    icon: it.children?.length ? ICONS[it.key] : undefined,
    children: it.children?.length ? toMenuItems(it.children) : undefined,
  }));
}

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, menus, accessToken, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // 未登录（无 token）时重定向登录页（路由守卫兜底）
  useEffect(() => {
    if (!accessToken) navigate('/login', { replace: true });
  }, [accessToken, navigate]);

  const menuItems = useMemo(() => toMenuItems(menus), [menus]);

  // 当前路径对应的菜单标题（面包屑用）
  const currentTitle = useMemo(() => {
    const flat: { path: string; label: string }[] = [];
    const walk = (list: AuthMenuItem[]) =>
      list.forEach((it) => {
        if (it.path) flat.push({ path: it.path, label: it.label });
        if (it.children) walk(it.children);
      });
    walk(menus);
    return flat.find((f) => location.pathname.startsWith(f.path))?.label || '工作台';
  }, [menus, location.pathname]);

  // 退出登录：调用后端 logout（refresh 加入黑名单）+ 清理本地状态
  const handleLogout = () => {
    const rt = useAuthStore.getState().refreshToken;
    if (rt) httpPostLogout(rt);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ---------- 侧栏：墨底，可折叠（80px 仅图标） ---------- */}
      <Sider trigger={null} collapsible collapsed={collapsed} width={220} theme="dark"
        style={{ background: '#1C1917' }}>
        {/* Logo 区：TP Mark + 名称 */}
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, background: '#1C1917', border: '1px solid #B0894F', borderRadius: 6,
            color: '#B0894F', fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>TP</div>
          {!collapsed && (
            <div>
              <div style={{ color: '#FAFAF9', fontSize: 15, fontWeight: 600, fontFamily: "'Noto Serif SC', serif" }}>
                TP 全屋家居
              </div>
              <div style={{ color: '#B0894F', fontSize: 11, letterSpacing: '0.14em' }}>ADMIN SYSTEM</div>
            </div>
          )}
        </div>
        {/* 菜单：点击路由跳转（RBAC 已由后端 /menus 过滤） */}
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]}
          items={menuItems} style={{ background: '#1C1917' }}
          onClick={({ key }) => navigate(key)} />
      </Sider>

      <Layout>
        {/* ---------- 顶栏：白底 64px ---------- */}
        <Header style={{ background: '#fff', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #E7E5E4' }}>
          {/* 折叠按钮 */}
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)} />
          {/* 面包屑：上级 / 当前 */}
          <Breadcrumb items={[{ title: '首页' }, { title: currentTitle }]} />
          <div style={{ flex: 1 }} />
          {/* 角色徽标：金边金字胶囊 */}
          <Tag style={{ borderColor: '#B0894F', color: '#97763F', borderRadius: 999 }}>{user?.role_id ? '系统用户' : '系统用户'}</Tag>
          {/* 用户区：头像 + 昵称 → 下拉（个人中心 / 退出） */}
          <Dropdown
            menu={{
              items: [
                { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'profile') setProfileOpen(true);
                if (key === 'logout') handleLogout();
              },
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar size={32} src={user?.avatar || undefined} style={{ background: '#1C1917' }}>
                {(user?.nickname || user?.real_name || 'U').slice(0, 1)}
              </Avatar>
              <span style={{ color: '#1C1917' }}>{user?.nickname || user?.real_name || user?.username}</span>
            </div>
          </Dropdown>
        </Header>

        {/* ---------- 内容区：居中（max-width 1320px）+ 对称边距（UI/UX §4.1） ---------- */}
        <Content style={{ padding: '28px 32px', background: '#FAFAF9' }}>
          <div style={{ maxWidth: 1320, margin: '0 auto' }}>
            <Outlet />   {/* 子路由（各管理模块页面）渲染出口 */}
          </div>
        </Content>
      </Layout>

      {/* 个人中心弹窗：修改密码 + 上传头像（BR-1.4） */}
      <Modal open={profileOpen} title="个人中心" footer={null} width={460}
        onCancel={() => setProfileOpen(false)}>
        <Profile />
      </Modal>
    </Layout>
  );
}

// 退出登录：调用后端刷新黑名单接口（独立请求，避免拦截器循环）
import { http } from '../services/http';
function httpPostLogout(refreshToken: string) {
  http.post('/auth/logout', { refresh_token: refreshToken }).catch(() => undefined);
}
