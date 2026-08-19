// ============================================================
// 【代码段功能】加入我们 - 职位列表（FR-5.1 / BR-5.1）
//   社招/校招筛选 + 职位卡片（部门/地点/薪资）+ 招聘中状态
// ============================================================
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { colors, fonts, maxWidth, radius, shadow } from '../../theme/design-tokens';
import { getJobs, type JobBrief } from '../../services/public';

const PAGE_SIZE = 10;

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || '';
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ list: JobBrief[]; total: number }>({ list: [], total: 0 });

  useEffect(() => {
    getJobs({ type: type || undefined, page })
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
        <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>JOIN US</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 40, margin: '10px 0 0', fontWeight: 600 }}>加入我们</h1>
      </div>
      <div style={{ maxWidth, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* 类型筛选 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {[['', '全部'], ['social', '社会招聘'], ['campus', '校园招聘']].map(([v, label]) => (
            <button key={v} onClick={() => setType(v)}
              style={{ padding: '7px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13,
                background: type === v ? colors.gold : colors.soft, color: type === v ? '#fff' : colors.ink }}>
              {label}
            </button>
          ))}
        </div>

        {data.list.length === 0 ? (
          <div style={{ textAlign: 'center', color: colors.muted, padding: '80px 0' }}>暂无在招职位</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.list.map((j) => (
              <Link key={j.id} to={`/jobs/${j.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px', textDecoration: 'none',
                color: 'inherit', background: colors.surface, borderRadius: radius.md, boxShadow: shadow.sm,
                transition: 'all .2s', borderLeft: `3px solid ${colors.gold}`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 17 }}>{j.title}</div>
                  <div style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>
                    {j.type === 'social' ? '社会招聘' : '校园招聘'} · {j.dept || '—'} · {j.location || '—'}
                  </div>
                </div>
                {j.salary && <div style={{ color: colors.gold, fontSize: 15, fontWeight: 600 }}>{j.salary}</div>}
                <div style={{ color: colors.goldD, fontSize: 13 }}>查看详情 →</div>
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
