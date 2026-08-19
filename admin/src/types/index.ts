// ============================================================
// 【代码段功能】后台共用类型定义
//   与后端 /api/auth/* 返回结构对齐（开发技术文档 v1.4 §6.2）
// ============================================================

// 统一响应包装：{ code, message, data, trace_id }
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  trace_id: string | null;
}

// 登录用户信息（users 表核心字段，数据库文档 v2.3）
export interface UserInfo {
  id: number;
  username: string;
  real_name?: string | null;
  nickname?: string | null;
  phone?: string | null;
  email?: string | null;
  gender?: number;
  position?: string | null;
  dept_id?: number | null;
  role_id?: number | null;
  avatar?: string | null;
  last_login_at?: string | null;
  // 角色权限编码集合（登录/me 时后端附带，按钮级权限数据源）
  permissions?: string[];
}

// 登录响应：双 Token + 用户信息
export interface LoginResult {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserInfo;
}

// 菜单项（与后端 /api/auth/menus 返回结构一致）
export interface MenuItem {
  key: string;          // 菜单唯一标识
  label: string;        // 显示名称
  path?: string | null; // 路由路径
  icon?: string | null;
  perms: string[];      // 所需权限编码（空数组 = 目录节点）
  children?: MenuItem[];
}
