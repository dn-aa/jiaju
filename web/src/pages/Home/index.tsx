// ============================================================
// 【代码段功能】前台首页（BR-1.x 全区块，UI/UX v1.2 §3.3 首页规范）
//   ①Hero 轮播（后台 Banner，生效时间内）②空间分类入口
//   ③热门产品（上架+置顶优先）④新案例 ⑤新闻动态 ⑥服务流程 ⑦客户口碑
//   全部数据来自 /api/public/home（后台配置驱动，FR-1.2/1.9/1.10/1.11）
// ============================================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { colors, fonts, maxWidth, radius, shadow } from '../../theme/design-tokens';
import { useHome } from '../../hooks/usePublic';

// 品牌实力数字（FR-1.x 品牌背书区块；静态配置，来源品牌资料）
const BRAND_STATS = [
  { num: '18', label: '年高端定制深耕' },
  { num: '2600+', label: '全屋定制案例' },
  { num: '32', label: '项工艺细节标准' },
  { num: '98%', label: '客户满意度' },
];

export default function Home() {
  const [bannerIdx, setBannerIdx] = useState(0);
  // 首页数据：React Query 缓存 + 自动请求（对齐技术栈）
  const { data } = useHome();

  // 轮播帧 = 每个 Banner 的多图展平（images 存在则逐张一帧，否则主图单帧）
  const slides = (data?.banners || []).flatMap((b) => {
    const imgs = b.images && b.images.length ? b.images : [b.image];
    return imgs.map((img) => ({ id: `${b.id}-${img}`, img, title: b.title, subtitle: b.subtitle, link: b.link }));
  });

  // Banner 自动轮播（4.5s 一帧；多图/多条时启用）
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!data) return <div style={{ padding: '120px 0', textAlign: 'center', color: '#a8a29e' }}>加载中...</div>;

  const { categories, hot_products, new_cases, news, steps, reviews } = data;

  return (
    <div style={{ fontFamily: fonts.body }}>
      {/* ================= ① Hero：Banner 轮播（无图时墨色渐变占位） ================= */}
      <section style={{ position: 'relative', height: 'min(78vh, 640px)', overflow: 'hidden', background: colors.ink }}>
        {slides.length > 0 ? (
          slides.map((s, i) => (
            <div key={s.id} style={{
              position: 'absolute', inset: 0, opacity: i === bannerIdx ? 1 : 0, transition: 'opacity .8s',
            }}>
              <img src={s.img} alt={s.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(28,25,23,.35) 0%, rgba(28,25,23,.65) 100%)',
              }} />
              <div style={{
                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center',
              }}>
                <h1 style={{ color: '#FAFAF9', fontFamily: fonts.display, fontSize: 'clamp(38px,5.5vw,68px)', fontWeight: 600, margin: 0 }}>
                  {s.title || 'TP 全屋家居'}
                </h1>
                {s.subtitle && <p style={{ color: '#e7d9c0', letterSpacing: '.08em', marginTop: 14, fontSize: 17 }}>{s.subtitle}</p>}
              </div>
            </div>
          ))
        ) : (
          // 无 Banner 时默认首屏（渐变 + 金辉，与原型一致）
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            background: `radial-gradient(ellipse at 30% 20%, rgba(176,137,79,.18), transparent 55%),
                         radial-gradient(ellipse at 75% 80%, rgba(176,137,79,.10), transparent 50%),
                         linear-gradient(160deg, #211c17, #1C1917 60%, #0d0b09)`,
          }}>
            <div>
              <div style={{ color: colors.gold, letterSpacing: '.32em', fontSize: 12, textTransform: 'uppercase', marginBottom: 18 }}>
                TP WHOLE-HOME FURNISHING
              </div>
              <h1 style={{ fontFamily: fonts.display, fontSize: 'clamp(40px,6vw,76px)', fontWeight: 600, color: '#FAFAF9', margin: 0, lineHeight: 1.2 }}>
                高端全屋定制
              </h1>
              <p style={{ color: '#e7d9c0', fontSize: 18, letterSpacing: '.06em', margin: '18px 0 30px' }}>
                以墨为骨 · 以金为魂 · 定制品质人居
              </p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
                <Link to="/contact" style={{ padding: '13px 34px', borderRadius: 999, background: colors.gold, color: '#fff', textDecoration: 'none', fontSize: 14 }}>在线预约</Link>
                <Link to="/products" style={{ padding: '13px 34px', borderRadius: 999, border: '1px solid #FAFAF9', color: '#FAFAF9', textDecoration: 'none', fontSize: 14 }}>浏览产品</Link>
              </div>
            </div>
          </div>
        )}
        {/* 轮播指示点（按总帧数） */}
        {slides.length > 1 && (
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setBannerIdx(i)}
                style={{ width: 8, height: 8, borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: i === bannerIdx ? colors.gold : 'rgba(250,250,249,.4)' }} />
            ))}
          </div>
        )}
      </section>

      {/* ================= ② 空间分类入口（FR-1.2） ================= */}
      <section style={{ maxWidth, margin: '0 auto', padding: '56px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>SPACE SERIES</div>
          <h2 style={{ fontFamily: fonts.display, fontSize: 30, margin: '8px 0 0' }}>空间系列</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16 }}>
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.id}`}
              style={{
                padding: '26px 0', textAlign: 'center', textDecoration: 'none', borderRadius: radius.md,
                background: colors.surface, boxShadow: shadow.sm, border: `1px solid ${colors.line}`,
                transition: 'all .2s', color: colors.ink, fontSize: 15, fontWeight: 500,
              }}>
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      {/* ================= ③ 热门产品（FR-1.2，上架+置顶） ================= */}
      {hot_products.length > 0 && (
        <section style={{ maxWidth, margin: '0 auto', padding: '56px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>HOT PRODUCTS</div>
              <h2 style={{ fontFamily: fonts.display, fontSize: 30, margin: '8px 0 0' }}>热门产品</h2>
            </div>
            <Link to="/products" style={{ color: colors.goldD, textDecoration: 'none', fontSize: 14 }}>全部产品 →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 20 }}>
            {hot_products.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ background: colors.surface, borderRadius: radius.md, overflow: 'hidden', boxShadow: shadow.sm, transition: 'all .25s' }}>
                  <div style={{ height: 200, background: colors.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.cover_image ? <img src={p.cover_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: '#d6d3d1', fontSize: 13 }}>暂无图片</span>}
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                    <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{p.series}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ================= ④ 新案例（FR-1.3） ================= */}
      {new_cases.length > 0 && (
        <section style={{ maxWidth, margin: '0 auto', padding: '56px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>NEW CASES</div>
              <h2 style={{ fontFamily: fonts.display, fontSize: 30, margin: '8px 0 0' }}>新案例</h2>
            </div>
            <Link to="/cases" style={{ color: colors.goldD, textDecoration: 'none', fontSize: 14 }}>全部案例 →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
            {new_cases.map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ borderRadius: radius.md, overflow: 'hidden', boxShadow: shadow.sm, background: colors.surface }}>
                  <div style={{ height: 180, background: colors.soft }}>
                    {c.cover ? <img src={c.cover} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d6d3d1' }}>暂无图片</div>}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{c.title}</div>
                    <div style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{c.type} · {c.style || '—'}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ================= ⑤ 新闻动态（FR-1.4） ================= */}
      {news.length > 0 && (
        <section style={{ maxWidth, margin: '0 auto', padding: '56px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>NEWS</div>
              <h2 style={{ fontFamily: fonts.display, fontSize: 30, margin: '8px 0 0' }}>新闻动态</h2>
            </div>
            <Link to="/news" style={{ color: colors.goldD, textDecoration: 'none', fontSize: 14 }}>全部新闻 →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {news.map((n, i) => (
              <Link key={n.id} to={`/news/${n.id}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
                padding: '16px 4px', textDecoration: 'none', color: 'inherit',
                borderTop: i === 0 ? `1px solid ${colors.line}` : `1px solid ${colors.line}`,
              }}>
                <span style={{ fontWeight: 500, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                <span style={{ color: colors.muted, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {(n.publish_at || '').slice(0, 10)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ================= ⑤.5 品牌实力数字（FR-1.x 品牌背书） ================= */}
      <section style={{ background: colors.ink, marginTop: 56, padding: '56px 24px' }}>
        <div style={{ maxWidth, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>STRENGTH</div>
            <h2 style={{ fontFamily: fonts.display, fontSize: 30, margin: '8px 0 0', color: '#FAFAF9' }}>品牌实力</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 24 }}>
            {BRAND_STATS.map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: fonts.display, fontSize: 52, fontWeight: 600, color: colors.gold, lineHeight: 1.2 }}>
                  {s.num}
                </div>
                <div style={{ color: '#e7d9c0', fontSize: 14, letterSpacing: '.06em', marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ⑥ 服务流程（FR-1.10，四步） ================= */}
      {steps.length > 0 && (
        <section style={{ background: colors.soft, marginTop: 56, padding: '56px 24px' }}>
          <div style={{ maxWidth, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>SERVICE PROCESS</div>
              <h2 style={{ fontFamily: fonts.display, fontSize: 30, margin: '8px 0 0' }}>服务流程</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
              {steps.map((s) => (
                <div key={s.step_no} style={{ background: colors.surface, borderRadius: radius.md, padding: 26, boxShadow: shadow.sm }}>
                  <div style={{ fontFamily: fonts.display, fontSize: 34, color: colors.gold, fontWeight: 600 }}>{s.step_no}</div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginTop: 8 }}>{s.title}</div>
                  {s.desc && <div style={{ color: colors.muted, fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>{s.desc}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= ⑦ 客户口碑（FR-1.11） ================= */}
      {reviews.length > 0 && (
        <section style={{ maxWidth, margin: '0 auto', padding: '56px 24px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>REVIEWS</div>
            <h2 style={{ fontFamily: fonts.display, fontSize: 30, margin: '8px 0 0' }}>客户口碑</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            {reviews.map((r) => (
              <div key={r.id} style={{ background: colors.surface, borderRadius: radius.md, padding: 24, boxShadow: shadow.sm, border: `1px solid ${colors.line}` }}>
                <div style={{ color: colors.gold, letterSpacing: '.2em' }}>{'★'.repeat(r.rating)}</div>
                <p style={{ color: colors.ink2, fontSize: 14, lineHeight: 1.8, margin: '12px 0', minHeight: 44 }}>“{r.content || ''}”</p>
                <div style={{ color: colors.muted, fontSize: 13 }}>
                  {r.name} · {r.city || ''} {r.house ? `· ${r.house}` : ''}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
