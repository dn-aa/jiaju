// ============================================================
// 【代码段功能】HTTP 客户端封装（axios）
//   - 自动注入 Authorization: Bearer <access_token>
//   - 401 时用 refresh_token 无感刷新后重放请求（BR-1.3）
//   - 业务错误（code!=0）统一 message.error 提示并 reject
// ============================================================
import axios, { AxiosError } from 'axios';
import { message } from 'antd';
import { useAuthStore } from '../store/auth';
import type { ApiResponse } from '../types';

// 创建实例：基础前缀 /api，超时 15s（开发技术文档 §1.2 统一前缀）
export const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// ---------- 请求拦截：注入 Bearer Token ----------
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    // 所有请求自动携带登录凭证（公开接口忽略即可）
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------- 响应拦截：401 无感刷新 + 统一错误提示 ----------
let refreshing: Promise<string | null> | null = null;

// 刷新 access_token：调用 /auth/refresh，失败返回 null
async function tryRefresh(): Promise<string | null> {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await axios.post<ApiResponse<{ access_token: string; refresh_token: string }>>(
      '/api/auth/refresh',
      { refresh_token: refreshToken },
    );
    if (res.data.code === 0) {
      const d = res.data.data;
      setTokens(d.access_token, d.refresh_token);   // 轮换后的新双 Token
      return d.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

http.interceptors.response.use(
  (resp) => {
    // 后端统一响应包装：业务码非 0 视为失败，统一 Toast 提示
    const body = resp.data as ApiResponse;
    if (body && typeof body.code === 'number' && body.code !== 0) {
      message.error(body.message || '请求失败');
      return Promise.reject(new Error(body.message));
    }
    return resp;
  },
  async (error: AxiosError) => {
    // 401（未认证）：尝试用 refresh_token 刷新后重放原请求
    if (error.response?.status === 401) {
      // 并发 401 只触发一次刷新（共享 Promise）
      refreshing = refreshing || tryRefresh();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken && error.config) {
        // 用新 token 重放失败的请求
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return http.request(error.config);
      }
      // 刷新失败 → 退出登录并跳转登录页
      useAuthStore.getState().logout();
      if (!location.pathname.startsWith('/login')) {
        message.error('登录已过期，请重新登录');
        location.href = '/login';
      }
      return Promise.reject(error);
    }
    // 其余错误统一提示
    message.error((error.response?.data as ApiResponse)?.message || '网络异常，请稍后重试');
    return Promise.reject(error);
  },
);

// ---------- 业务数据便捷读取：返回 data 字段 ----------
export async function getData<T>(url: string, params?: object): Promise<T> {
  const res = await http.get<ApiResponse<T>>(url, { params });
  return res.data.data;
}

export async function postData<T>(url: string, body?: object): Promise<T> {
  const res = await http.post<ApiResponse<T>>(url, body);
  return res.data.data;
}

export async function putData<T>(url: string, body?: object): Promise<T> {
  const res = await http.put<ApiResponse<T>>(url, body);
  return res.data.data;
}
