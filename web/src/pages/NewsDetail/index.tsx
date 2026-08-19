// ============================================================
// 【代码段功能】新闻详情页（FR-4.3）
//   标题/来源/作者/发布时间 + 富文本正文（后台编辑，XSS 清洗后展示）
//   + 上一篇/下一篇导航（按发布时间相邻）
// ============================================================
import { Link, useParams } from 'react-router-dom';
import { colors, fonts, maxWidth } from '../../theme/design-tokens';
import { useArticle } from '../../hooks/usePublic';

export default function NewsDetail() {
  const { id } = useParams();
  const { data: a } = useArticle(Number(id));

  if (!a) return <div style={{ padding: '120px 0', textAlign: 'center', color: '#a8a29e' }}>加载中...</div>;

  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ background: colors.soft, padding: '20px 24px' }}>
        <div style={{ maxWidth, margin: '0 auto', fontSize: 13, color: colors.muted }}>
          <Link to="/" style={{ color: colors.goldD, textDecoration: 'none' }}>首页</Link> /{' '}
          <Link to="/news" style={{ color: colors.goldD, textDecoration: 'none' }}>新闻动态</Link> / {a.title}
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: fonts.display, fontSize: 32, margin: 0, lineHeight: 1.4 }}>{a.title}</h1>
        <div style={{ color: colors.muted, fontSize: 13, margin: '14px 0 28px', paddingBottom: 20, borderBottom: `1px solid ${colors.line}` }}>
          {a.category === 'company' ? '企业新闻' : '行业资讯'} · {(a.publish_at || '').slice(0, 10)}
          {a.author ? ` · ${a.author}` : ''} {a.source ? ` · 来源：${a.source}` : ''}
        </div>
        {/* 富文本正文 */}
        {a.summary && <div style={{ color: colors.muted, fontSize: 14, marginBottom: 16, lineHeight: 1.8 }}>{a.summary}</div>}
        <div className="rich-text" dangerouslySetInnerHTML={{ __html: a.body || '' }} style={{ lineHeight: 2, fontSize: 15, color: colors.ink2 }} />

        {/* 上一篇/下一篇（FR-4.3） */}
        <div style={{ marginTop: 40, borderTop: `1px solid ${colors.line}`, paddingTop: 18, display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 14 }}>
          {a.prev ? (
            <Link to={`/news/${a.prev.id}`} style={{ color: colors.goldD, textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ← 上一篇：{a.prev.title}
            </Link>
          ) : <span style={{ flex: 1, color: '#d6d3d1' }}>已是第一篇</span>}
          {a.next ? (
            <Link to={`/news/${a.next.id}`} style={{ color: colors.goldD, textDecoration: 'none', flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              下一篇：{a.next.title} →
            </Link>
          ) : <span style={{ flex: 1, textAlign: 'right', color: '#d6d3d1' }}>已是最新一篇</span>}
        </div>
      </div>
    </div>
  );
}
