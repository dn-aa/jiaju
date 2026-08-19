// ============================================================
// 【代码段功能】React Query 数据获取 Hooks（对齐技术栈：React Query）
//   封装公开接口为 useQuery：自动缓存/重试/加载态，页面聚焦渲染
// ============================================================
import { useQuery } from '@tanstack/react-query';
import {
  getArticle, getArticles, getCase, getCases, getHome, getJob, getJobs,
  getProduct, getProducts, type ArticleBrief, type ArticleDetail,
  type CaseBrief, type CaseDetail, type HomeData, type JobBrief,
  type JobDetail, type PageData, type ProductBrief, type ProductDetail,
} from '../services/public';

// 首页聚合数据
export function useHome() {
  return useQuery({ queryKey: ['home'], queryFn: getHome });
}

// 产品列表（category/keyword/page 任一变化自动重新请求）
export function useProducts(categoryId?: number, keyword?: string, page = 1) {
  return useQuery({
    queryKey: ['products', categoryId, keyword, page],
    queryFn: () => getProducts({ category_id: categoryId, keyword: keyword || undefined, page }),
  });
}

// 产品详情
export function useProduct(id: number) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  });
}

// 案例列表/详情
export function useCases(type?: string, page = 1) {
  return useQuery({ queryKey: ['cases', type, page], queryFn: () => getCases({ type, page }) });
}
export function useCase(id: number) {
  return useQuery({ queryKey: ['case', id], queryFn: () => getCase(id), enabled: !!id });
}

// 新闻列表/详情
export function useArticles(category?: string, page = 1) {
  return useQuery({ queryKey: ['articles', category, page], queryFn: () => getArticles({ category, page }) });
}
export function useArticle(id: number) {
  return useQuery({ queryKey: ['article', id], queryFn: () => getArticle(id), enabled: !!id });
}

// 职位列表/详情
export function useJobs(type?: string, page = 1) {
  return useQuery({ queryKey: ['jobs', type, page], queryFn: () => getJobs({ type, page }) });
}
export function useJob(id: number) {
  return useQuery({ queryKey: ['job', id], queryFn: () => getJob(id), enabled: !!id });
}

// 类型透出（供页面引用）
export type { ArticleBrief, ArticleDetail, CaseBrief, CaseDetail, HomeData, JobBrief, JobDetail, PageData, ProductBrief, ProductDetail };
