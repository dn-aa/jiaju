// ============================================================
// 【代码段功能】新闻动态（FR-1.4）
//   分类筛选（企业新闻/行业资讯）+ 图文列表 + 分页
// ============================================================
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { colors, fonts, maxWidth, radius, shadow } from '../../theme/design-tokens';
import { getArticles, type ArticleBrief } from '../../services/public';

const PAGE_SIZE = 6;

export default function News() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ list: ArticleBrief[]; total: number }>({ list: [], total: 0 });

  useEffect(() => {
    getArticles({ category: category || undefined, page })
      .then((d) => setData({ list: d.list, total: d.pagination.total }))
      .catch(() => undefined);
  }, [category, page]);

  const setCategory = (c: string) => {
    const next = new URLSearchParams(params);
    c ? next.set('category', c) : next.delete('category');
    setParams(next, { replace: true });
    setPage(1);
  };

  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ background: colors.ink, color: '#FAFAF9', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>NEWS</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 40, margin: '10px 0 0', fontWeight: 600 }}>新闻动态</h1>
      </div>
      <div style={{ maxWidth, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* 分类筛选 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          {[['', '全部'], ['company', '企业新闻'], ['industry', '行业资讯']].map(([v, label]) => (
            <button key={v} onClick={() => setCategory(v)}
              style={{ padding: '7px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13,
                background: category === v ? colors.gold : colors.soft, color: category === v ? '#fff' : colors.ink }}>
              {label}
            </button>
          ))}
        </div>

        {data.list.length === 0 ? (
          <div style={{ textAlign: 'center', color: colors.muted, padding: '80px 0' }}>暂无新闻</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {data.list.map((a) => (
              <Link key={a.id} to={`/news/${a.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: 20, background: colors.surface, borderRadius: radius.md, overflow: 'hidden', boxShadow: shadow.sm }}>
                <div style={{ width: 200, minWidth: 140, height: 120, background: colors.soft }}>
                  {a.cover_image ? <img src={a.cover_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d6d3d1', fontSize: 12 }}>暂无图片</div>}
                </div>
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{a.title}</div>
                  <div style={{ color: colors.muted, fontSize: 13, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {a.summary || '...'}
                  </div>
                  <div style={{ color: colors.goldD, fontSize: 12, marginTop: 8 }}>
                    {(a.publish_at || '').slice(0, 10)} {a.author ? `· ${a.author}` : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {data.total > PAGE_SIZE && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 32 }}>
            {Array.from({ length: Math.ceil(data.total / PAGE_SIZE) }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: n === page ? colors.gold : colors.soft, color: n === page ? '#fff' : colors.ink }}>
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
