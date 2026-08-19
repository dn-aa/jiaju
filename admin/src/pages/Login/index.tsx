// ============================================================
// 【代码段功能】后台登录页（BR-1.1）
//   全屏墨色渐变 + 居中白卡（UI/UX v1.2 §4.1 登录页规范）
//   账号密码登录 → 保存双 Token → 拉取用户与菜单 → 跳转工作台
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { http } from '../../services/http';
import { useAuthStore } from '../../store/auth';
import type { LoginResult, MenuItem, UserInfo } from '../../types';

// 演示角色快捷入口：便于四角色验收（原型同款）
const QUICK_ROLES = [
  { username: 'admin', label: '超级管理员' },
  { username: 'editor01', label: '内容编辑' },
  { username: 'cs01', label: '客服' },
  { username: 'hr01', label: '招聘专员' },
];

export default function Login() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const setMenus = useAuthStore((s) => s.setMenus);
  const [loading, setLoading] = useState(false);

  // 登录主流程：POST /api/auth/login → 保存凭证 → 拉取 /me 与 /menus → 跳转
  const doLogin = async (username: string, password: string) => {
    setLoading(true);
    try {
      const data = await http
        .post<{ code: number; data: LoginResult }>('/auth/login', { username, password })
        .then((r) => r.data.data);
      // 保存双 Token（含 localStorage 持久化）
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      // 并行拉取用户信息与菜单树（RBAC 动态路由数据源）
      const [me, menus] = await Promise.all([
        http.get<{ code: number; data: UserInfo }>('/auth/me').then((r) => r.data.data),
        http.get<{ code: number; data: MenuItem[] }>('/auth/menus').then((r) => r.data.data),
      ]);
      setUser(me);
      setMenus(menus);
      message.success(`欢迎回来，${me.nickname || me.real_name || me.username}`);
      navigate('/dashboard', { replace: true }); // 登录后进入工作台
    } catch {
      // 错误提示已由 http 拦截器统一处理
    } finally {
      setLoading(false);
    }
  };

  return (
    // 全屏墨色渐变背景（#211c17 → #1C1917 → #0d0b09），对齐 UI/UX §4.1
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #211c17 0%, #1C1917 55%, #0d0b09 100%)',
      }}
    >
      {/* 登录白卡：400px 圆角 14，投影 0 12px 40px */}
      <div
        style={{
          width: 400,
          background: '#fff',
          borderRadius: 14,
          padding: '36px 32px 28px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        }}
      >
        {/* 品牌 Mark：方形墨底 + 金色 TP */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 52,
              height: 52,
              margin: '0 auto 10px',
              background: '#1C1917',
              border: '1px solid #B0894F',
              borderRadius: 8,
              color: '#B0894F',
              fontFamily: "'Cormorant Garamond', 'Noto Serif SC', serif",
              fontSize: 24,
              lineHeight: '52px',
              fontWeight: 600,
            }}
          >
            TP
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Noto Serif SC', serif", fontSize: 20, color: '#1C1917' }}>
            TP 全屋家居 · 后台管理
          </h1>
          <p style={{ margin: '6px 0 0', color: '#78716C', fontSize: 12, letterSpacing: '0.14em' }}>
            高端全屋定制 · 内容与线索管理
          </p>
        </div>

        {/* 登录表单：用户名 + 密码，聚焦态金色（焦点环 rgba(176,137,79,.15)） */}
        <Form onFinish={(v: { username: string; password: string }) => doLogin(v.username, v.password)} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入登录名' }]}>
            <Input prefix={<UserOutlined />} placeholder="登录名（如 admin）" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码（默认 admin123）" />
          </Form.Item>
          {/* 主操作按钮：墨底白字 */}
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 40 }}>
              登 录
            </Button>
          </Form.Item>
        </Form>

        {/* 演示角色快捷进入：一键填充并登录（原型同款，方便四角色验收） */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {QUICK_ROLES.map((r) => (
            <Button key={r.username} size="small" style={{ borderColor: '#B0894F', color: '#97763F' }}
              onClick={() => doLogin(r.username, 'admin123')}>
              {r.label}
            </Button>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#a8a29e', fontSize: 12, marginTop: 16 }}>
          演示默认密码 admin123，生产部署后请修改
        </p>
      </div>
    </div>
  );
}
