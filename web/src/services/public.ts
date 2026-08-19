// ============================================================
// 【代码段功能】前台公开接口封装（阶段 5）
//   全部为 /api/public/* 只读接口或线索提交接口（无需登录）
// ============================================================
import { http } from './http';

export interface Banner { id: number; image: string; title?: string | null; subtitle?: string | null; link?: string | null }
export interface Category { id: number; name: string }
export interface ProductBrief { id: number; name: string; series: string; product_code: string; cover_image?: string | null; category_id: number; is_top: number }
export interface ProductDetail extends ProductBrief {
  description?: string | null; spec_params: Record<string, string>; gallery: string[];
  related_cases?: { id: number; title: string; type: string; cover?: string | null }[];
}
export interface CaseBrief { id: number; title: string; type: string; style?: string | null; space?: string | null; area?: string | null; cover?: string | null }
export interface CaseDetail extends CaseBrief { gallery: string[]; background?: string | null; description?: string | null;
  related_products?: { id: number; name: string; cover_image?: string | null; series: string; product_code: string }[];
}
export interface ArticleBrief { id: number; title: string; category: string; summary?: string | null; cover_image?: string | null; source?: string | null; author?: string | null; publish_at?: string | null }
export interface ArticleDetail extends ArticleBrief {
  body?: string | null;
  prev?: { id: number; title: string } | null;   // 上一篇（FR-4.3）
  next?: { id: number; title: string } | null;   // 下一篇
}
export interface JobBrief { id: number; title: string; type: string; dept?: string | null; location?: string | null; salary?: string | null }
export interface JobDetail extends JobBrief { responsibility?: string | null; requirement?: string | null }
export interface PageContent { key: string; title?: string | null; content?: string | null }
export interface SiteConfig { address?: string; phone?: string; email?: string; hours?: string; map_coord?: string; appointment_slots?: string[] }

export interface PageData<T> { list: T[]; pagination: { total: number; page: number; page_size: number } }

// 首页聚合数据结构
export interface HomeData {
  banners: Banner[];
  categories: Category[];
  hot_products: ProductBrief[];
  new_cases: CaseBrief[];
  news: ArticleBrief[];
  steps: { step_no: number; title: string; desc?: string | null }[];
  reviews: { id: number; avatar?: string | null; name: string; city?: string | null; house?: string | null; rating: number; content?: string | null }[];
  announcement?: string | null;
}

// ---------- 首页聚合 ----------
export const getHome = () => http.get('/public/home').then((r) => r.data.data as HomeData);

// ---------- 内容列表/详情 ----------
export const getCategories = () => http.get('/public/categories').then((r) => r.data.data as Category[]);
export const getProducts = (p: { category_id?: number; keyword?: string; page?: number }) =>
  http.get('/public/products', { params: p }).then((r) => r.data.data as PageData<ProductBrief>);
export const getProduct = (id: number) => http.get(`/public/products/${id}`).then((r) => r.data.data as ProductDetail);
export const getCases = (p: { type?: string; page?: number }) =>
  http.get('/public/cases', { params: p }).then((r) => r.data.data as PageData<CaseBrief>);
export const getCase = (id: number) => http.get(`/public/cases/${id}`).then((r) => r.data.data as CaseDetail);
export const getArticles = (p: { category?: string; page?: number }) =>
  http.get('/public/articles', { params: p }).then((r) => r.data.data as PageData<ArticleBrief>);
export const getArticle = (id: number) => http.get(`/public/articles/${id}`).then((r) => r.data.data as ArticleDetail);
export const getJobs = (p: { type?: string; page?: number }) =>
  http.get('/public/jobs', { params: p }).then((r) => r.data.data as PageData<JobBrief>);
export const getJob = (id: number) => http.get(`/public/jobs/${id}`).then((r) => r.data.data as JobDetail);
export const getPages = () => http.get('/public/pages').then((r) => r.data.data as PageContent[]);
export const getSiteConfig = () => http.get('/public/site-config').then((r) => r.data.data as SiteConfig);

// ---------- 线索提交（预约/留言/简历） ----------
export const submitAppointment = (body: Record<string, unknown>) =>
  http.post('/public/appointments', body).then((r) => r.data);
export const submitMessage = (body: Record<string, unknown>) =>
  http.post('/public/messages', body).then((r) => r.data);
export const submitApplication = (form: FormData) =>
  http.post('/public/applications', form).then((r) => r.data);
