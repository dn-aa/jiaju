// ============================================================
// 【代码段功能】CMS 资源 API 封装（阶段 2）
//   统一 REST 风格（开发技术文档 v1.4 §6.5）：
//   GET 列表/详情、POST 创建、PUT 更新、DELETE 删除、PUT status、POST sort
// ============================================================
import { http, getData, postData, putData } from './http';

// 分页结果结构（后端统一返回 list + pagination）
export interface PageResult<T> {
  list: T[];
  pagination: { total: number; page: number; page_size: number; pages: number };
}

// 状态切换入参：on/off/draft（由后端按资源映射到 is_activate/status/is_published）
export interface StatusPayload {
  status: 'on' | 'off' | 'draft';
}

/** 通用资源 CRUD 工厂：传入资源名返回一组操作方法 */
export function cmsApi<T extends { id: number }>(resource: string) {
  return {
    /** 列表：keyword 搜索 + 分页 + 排序 */
    list: (params: { page?: number; page_size?: number; keyword?: string; sort?: string } = {}) =>
      getData<PageResult<T>>(`/cms/${resource}`, params),

    /** 详情：编辑表单回填数据源 */
    get: (id: number) => getData<T>(`/cms/${resource}/${id}`),

    /** 创建：新增后即时上列表 */
    create: (payload: Partial<T>) => postData<T>(`/cms/${resource}`, payload),

    /** 更新：编辑保存（全量字段） */
    update: (id: number, payload: Partial<T>) => putData<T>(`/cms/${resource}/${id}`, payload),

    /** 删除：物理删除（产品系列关联产品时后端拦截） */
    remove: (id: number) => http.delete(`/cms/${resource}/${id}`).then((r) => r.data),

    /** 统一状态切换：行内 Tag 点击调用 */
    setStatus: (id: number, status: StatusPayload['status']) =>
      putData<{ id: number; status: string }>(`/cms/${resource}/${id}/status`, { status }),

    /** 批量排序 */
    sort: (items: { id: number; sort: number }[]) =>
      postData<void>(`/cms/${resource}/sort`, { items }),
  };
}
