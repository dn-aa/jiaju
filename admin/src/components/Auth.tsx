// ============================================================
// 【代码段功能】按钮级权限指令组件（BR-1.2 RBAC）
//   用法：<Auth code="product:edit"><Button/></Auth>
//   当前用户角色权限不含指定编码时，不渲染子元素（无权限不展示）
// ============================================================
import { useAuthStore } from '../store/auth';

// 权限匹配规则与后端一致：超管 "*" 或精确/前缀通配（content:* 匹配 content:view）
function hasPerm(code: string, perms: string[]): boolean {
  return perms.some((p) => p === '*' || p === code || (p.endsWith(':*') && code.startsWith(p.slice(0, -1))));
}

interface AuthProps {
  code: string;        // 所需权限编码，如 product:edit
  children: React.ReactNode;
}

export default function Auth({ code, children }: AuthProps) {
  // 取当前用户角色权限集合（登录/me 时由后端附带返回 permissions）
  const user = useAuthStore((s) => s.user);
  const perms = user?.permissions ?? [];
  if (!hasPerm(code, perms)) return null;
  return <>{children}</>;
}
