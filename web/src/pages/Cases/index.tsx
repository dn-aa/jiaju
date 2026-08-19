// ============================================================
// 【代码段功能】新案例（FR-1.3）
//   类型筛选（客户实景/设计方案）+ 案例网格 + 分页
// ============================================================
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { colors, fonts, maxWidth, radius, shadow } from '../../theme/design-tokens';
import { getCases, type CaseBrief } from '../../services/public';

const PAGE_SIZE = 6;

export default function Cases() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || '';
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ list: CaseBrief[]; total: number }>({ list: [], total: 0 });

  useEffect(() => {
    getCases({ type: type || undefined, page })
      .then((d) => setData({ list: d.list, total: d.pagination.total }))
      .catch(() => undefined);
  }, [type, page]);

  const setType = (t: string) => {
    const next = new URLSearchParams(params);
    t ? next.set('type', t) : next.delete('type');
    setParams(next, { replace: true });
    setPage(1);
  };

  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ background: colors.ink, color: '#FAFAF9', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>CASES</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 40, margin: '10px 0 0', fontWeight: 600 }}>新案例</h1>
      </div>
      <div style={{ maxWidth, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* 类型筛选 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          {[['', '全部'], ['客户实景', '客户实景'], ['设计方案', '设计方案']].map(([v, label]) => (
            <button key={v} onClick={() => setType(v)}
              style={{ padding: '7px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13,
                background: type === v ? colors.gold : colors.soft, color: type === v ? '#fff' : colors.ink }}>
              {label}
            </button>
          ))}
        </div>

        {data.list.length === 0 ? (
          <div style={{ textAlign: 'center', color: colors.muted, padding: '80px 0' }}>暂无案例</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 24 }}>
            {data.list.map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ borderRadius: radius.md, overflow: 'hidden', boxShadow: shadow.sm, background: colors.surface }}>
                  <div style={{ height: 200, background: colors.soft }}>
                    {c.cover ? <img src={c.cover} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d6d3d1' }}>暂无图片</div>}
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{c.title}</div>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>
                      {c.type} · {c.style || '—'} · {c.space || '—'} {c.area ? `· ${c.area}` : ''}
                    </div>
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
