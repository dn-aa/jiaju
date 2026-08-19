// ============================================================
// 【代码段功能】产品详情页（FR-1.2.2）
//   主图 + 图集（缩略图切换）、名称/系列/编号、规格参数表、
//   富文本描述（后台编辑的 HTML）、「预约看样」CTA
// ============================================================
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { colors, fonts, maxWidth, radius, shadow } from '../../theme/design-tokens';
import { getProduct, type ProductDetail } from '../../services/public';

export default function ProductDetail() {
  const { id } = useParams();
  const [p, setP] = useState<ProductDetail | null>(null);
  const [mainImg, setMainImg] = useState<string | null>(null);

  useEffect(() => {
    getProduct(Number(id)).then((d) => { setP(d); setMainImg(d.cover_image || d.gallery?.[0] || null); })
      .catch(() => undefined);
  }, [id]);

  if (!p) return <div style={{ padding: '120px 0', textAlign: 'center', color: '#a8a29e' }}>加载中...</div>;

  const specs = Object.entries(p.spec_params || {});

  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ background: colors.soft, padding: '20px 24px' }}>
        <div style={{ maxWidth, margin: '0 auto', fontSize: 13, color: colors.muted }}>
          <Link to="/" style={{ color: colors.goldD, textDecoration: 'none' }}>首页</Link> /{' '}
          <Link to="/products" style={{ color: colors.goldD, textDecoration: 'none' }}>产品中心</Link> / {p.name}
        </div>
      </div>

      <div style={{ maxWidth, margin: '0 auto', padding: '36px 24px 64px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 40 }}>
        {/* 左侧：主图 + 图集 */}
        <div>
          <div style={{ height: 400, borderRadius: radius.lg, overflow: 'hidden', background: colors.surface, boxShadow: shadow.md }}>
            {mainImg ? <img src={mainImg} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d6d3d1' }}>暂无图片</div>}
          </div>
          {/* 图集缩略图切换（gallery + 封面） */}
          {[...(p.gallery || []), p.cover_image].filter(Boolean).length > 1 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              {[...(p.gallery || []), p.cover_image].filter(Boolean).slice(0, 6).map((img, i) => (
                <div key={i} onClick={() => setMainImg(img as string)} style={{ width: 64, height: 56, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: mainImg === img ? `2px solid ${colors.gold}` : `1px solid ${colors.line}` }}>
                  <img src={img as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：信息 + 规格 + CTA */}
        <div>
          <div style={{ color: colors.gold, letterSpacing: '.24em', fontSize: 12 }}>{p.series.toUpperCase()}</div>
          <h1 style={{ fontFamily: fonts.display, fontSize: 32, margin: '8px 0 6px' }}>{p.name}</h1>
          <div style={{ color: colors.muted, fontSize: 13 }}>产品编号：{p.product_code}</div>

          {/* 规格参数表（FR-1.2.2） */}
          {specs.length > 0 && (
            <table style={{ width: '100%', marginTop: 24, borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                {specs.map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: `1px solid ${colors.line}` }}>
                    <td style={{ padding: '10px 8px', color: colors.muted, width: 120 }}>{k}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 500 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <Link to="/contact"
            style={{ display: 'inline-block', marginTop: 28, padding: '13px 36px', borderRadius: 999, background: colors.gold, color: '#fff', textDecoration: 'none', fontSize: 14 }}>
            预约看样
          </Link>
        </div>
      </div>

      {/* 富文本描述（后台编辑 HTML，已 XSS 清洗） */}
      {p.description && (
        <div style={{ maxWidth, margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 600, marginBottom: 16 }}>产品介绍</div>
          {/* 富文本样式基础重置（对齐墨金基调） */}
          <div className="rich-text" dangerouslySetInnerHTML={{ __html: p.description }}
            style={{ lineHeight: 1.9, fontSize: 14.5, color: colors.ink2 }} />
        </div>
      )}
    </div>
  );
}
