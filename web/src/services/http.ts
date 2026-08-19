// ============================================================
// 【代码段功能】前台 HTTP 客户端（公开只读接口 + 线索提交）
//   前台无登录体系：仅统一错误提示与业务码解析
// ============================================================
import axios from 'axios';

export const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 响应拦截：业务码非 0 统一提示并 reject（表单提交失败文案由页面控制）
http.interceptors.response.use(
  (resp) => {
    const body = resp.data as { code: number; message: string };
    if (body && typeof body.code === 'number' && body.code !== 0) {
      return Promise.reject(new Error(body.message || '请求失败'));
    }
    return resp;
  },
  (error) => {
    return Promise.reject(new Error(error.response?.data?.message || '网络异常，请稍后重试'));
  },
);
