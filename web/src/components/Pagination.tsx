// ============================================================
// 【代码段功能】通用底部分页器（墨金风格）
//   用于前台列表页（产品中心/新案例/新闻动态/加入我们）底部翻页。
//   特点：
//   - 有数据即显示（至少 1 页），解决"数据不足一页时分页器不出现"的问题；
//   - 支持上一页/下一页（边界自动禁用）；
//   - 总页数较多时用省略号（…）截断，避免页码铺满整屏；
//   - 当前页金色高亮，并显示"共 X 页"。
// ============================================================
import { colors } from '../theme/design-tokens';

interface PaginationProps {
  current: number;        // 当前页码（从 1 起）
  total: number;          // 总记录数
  pageSize: number;       // 每页条数
  onChange: (page: number) => void;  // 翻页回调
}

// 生成页码序列：总页数 <=7 时全展示；否则以省略号截断中间页码
function buildPages(current: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | '...')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);
  if (left > 2) pages.push('...');               // 当前页左侧距首页过远 → 插入省略号
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push('...');  // 当前页右侧距末页过远 → 插入省略号
  pages.push(totalPages);
  return pages;
}

export default function Pagination({ current, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 无数据不渲染分页器（空态由页面自身提示）
  if (total <= 0) return null;

  // 基础按钮样式：常态白底描边，当前页金色高亮，禁用态降透明度
  const baseBtn = (active: boolean, disabled: boolean): React.CSSProperties => ({
    minWidth: 36, height: 36, padding: '0 12px', borderRadius: 8,
    border: `1px solid ${colors.line}`, cursor: disabled ? 'not-allowed' : 'pointer',
    background: active ? colors.gold : colors.surface,
    color: active ? '#fff' : colors.ink, fontSize: 13,
    opacity: disabled ? 0.4 : 1, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', transition: 'all .2s',
  });

  const go = (p: number) => { if (p >= 1 && p <= totalPages && p !== current) onChange(p); };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 32, flexWrap: 'wrap' }}>
      {/* 上一页 */}
      <button onClick={() => go(current - 1)} disabled={current <= 1} style={baseBtn(false, current <= 1)} aria-label="上一页">‹</button>

      {/* 页码（含省略号） */}
      {buildPages(current, totalPages).map((p, idx) =>
        p === '...'
          ? <span key={`e${idx}`} style={{ color: colors.muted, padding: '0 4px' }}>…</span>
          : <button key={p} onClick={() => go(p)} style={baseBtn(p === current, false)}>{p}</button>
      )}

      {/* 下一页 */}
      <button onClick={() => go(current + 1)} disabled={current >= totalPages} style={baseBtn(false, current >= totalPages)} aria-label="下一页">›</button>

      {/* 总页数信息 */}
      <span style={{ color: colors.muted, fontSize: 13, marginLeft: 6 }}>共 {totalPages} 页</span>
    </div>
  );
}
