// ============================================================
// 【代码段功能】认证状态管理（zustand）
//   集中管理：token（localStorage 持久化）、当前用户、菜单权限
//   供登录页写入、布局页读取、路由守卫判断
// ============================================================
import { create } from 'zustand';
import type { MenuItem, UserInfo } from '../types';

// 本地存储键：access_token 与 refresh_token
const ACCESS_KEY = 'tp_admin_access_token';
const REFRESH_KEY = 'tp_admin_refresh_token';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  menus: MenuItem[];          // 按角色过滤后的菜单树（后端返回）
  // 动作
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: UserInfo) => void;
  setMenus: (menus: MenuItem[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // 初始化时从 localStorage 恢复登录态（刷新页面不丢登录）
  accessToken: localStorage.getItem(ACCESS_KEY),
  refreshToken: localStorage.getItem(REFRESH_KEY),
  user: null,
  menus: [],

  // 保存双 Token：内存 + localStorage 双写
  setTokens: (access, refresh) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    set({ accessToken: access, refreshToken: refresh });
  },

  setUser: (user) => set({ user }),
  setMenus: (menus) => set({ menus }),

  // 退出登录：清空内存与本地存储
  logout: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    set({ accessToken: null, refreshToken: null, user: null, menus: [] });
  },
}));
