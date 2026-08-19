// ============================================================
// 【代码段功能】案例详情页（FR-3.4）
//   大图 + 图集浏览、基本信息（风格/空间/面积）、项目背景/设计说明（富文本）、
//   关联产品（case_products "本案应用产品"区块）；数据经 React Query 获取
// ============================================================
import { Link, useParams } from 'react-router-dom';
import { colors, fonts, maxWidth, radius, shadow } from '../../theme/design-tokens';
import { useCase } from '../../hooks/usePublic';

export default function CaseDetail() {
  const { id } = useParams();
  const { data: c } = useCase(Number(id));

  if (!c) return <div style={{ padding: '120px 0', textAlign: 'center', color: '#a8a29e' }}>加载中...</div>;

  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ background: colors.soft, padding: '20px 24px' }}>
        <div style={{ maxWidth, margin: '0 auto', fontSize: 13, color: colors.muted }}>
          <Link to="/" style={{ color: colors.goldD, textDecoration: 'none' }}>首页</Link> /{' '}
          <Link to="/cases" style={{ color: colors.goldD, textDecoration: 'none' }}>新案例</Link> / {c.title}
        </div>
      </div>

      <div style={{ maxWidth, margin: '0 auto', padding: '36px 24px 64px' }}>
        <h1 style={{ fontFamily: fonts.display, fontSize: 34, margin: '0 0 6px' }}>{c.title}</h1>
        <div style={{ color: colors.muted, fontSize: 14, marginBottom: 24 }}>
          {c.type} · {c.style || '—'} · {c.space || '—'} {c.area ? `· ${c.area}` : ''}
        </div>

        {/* 主图 */}
        <div style={{ borderRadius: radius.lg, overflow: 'hidden', boxShadow: shadow.md, marginBottom: 20 }}>
          {c.cover ? <img src={c.cover} alt={c.title} style={{ width: '100%', maxHeight: 520, objectFit: 'cover' }} />
            : <div style={{ height: 360, background: colors.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d6d3d1' }}>暂无图片</div>}
        </div>

        {/* 图集 */}
        {c.gallery && c.gallery.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14, marginBottom: 32 }}>
            {c.gallery.map((g, i) => (
              <img key={i} src={g} alt={`${c.title} ${i + 1}`} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: radius.sm }} />
            ))}
          </div>
        )}

        {/* 项目背景 / 设计说明（富文本） */}
        {c.background && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 600, marginBottom: 12 }}>项目背景</div>
            <div className="rich-text" dangerouslySetInnerHTML={{ __html: c.background }} style={{ lineHeight: 1.9, fontSize: 14.5, color: colors.ink2 }} />
          </div>
        )}
        {c.description && (
          <div>
            <div style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 600, marginBottom: 12 }}>设计说明</div>
            <div className="rich-text" dangerouslySetInnerHTML={{ __html: c.description }} style={{ lineHeight: 1.9, fontSize: 14.5, color: colors.ink2 }} />
          </div>
        )}

        {/* 关联产品（BR-3 关联产品；FR-3.4 "本案应用产品"区块） */}
        {c.related_products && c.related_products.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 600, marginBottom: 16 }}>本案应用产品</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
              {c.related_products.map((p) => (
                <Link key={p.id} to={`/products/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ borderRadius: radius.md, overflow: 'hidden', boxShadow: shadow.sm, background: colors.surface }}>
                    <div style={{ height: 150, background: colors.soft }}>
                      {p.cover_image ? <img src={p.cover_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d6d3d1', fontSize: 12 }}>暂无图片</div>}
                    </div>
                    <div style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{p.series} · {p.product_code}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
