// ============================================================
// 【代码段功能】前台首页占位（阶段 1 骨架验证）
//   展示墨金风格的 Hero 首屏骨架，验证脚手架/令牌/路由链路；
//   完整首页（轮播/系列/案例/新闻/流程/评价）在阶段 5 按原型实现
// ============================================================
import { colors, fonts, maxWidth, radius, shadow } from '../../theme/design-tokens';

export default function Home() {
  return (
    <div style={{ fontFamily: fonts.body, color: colors.ink }}>
      {/* ---------- Hero 首屏：深墨径向渐变 + 金辉光晕（UI/UX §3.3①） ---------- */}
      <section
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 24px',
          background: `radial-gradient(ellipse at 30% 20%, rgba(176,137,79,.18), transparent 55%),
                       radial-gradient(ellipse at 75% 80%, rgba(176,137,79,.10), transparent 50%),
                       linear-gradient(160deg, #211c17, #1C1917 60%, #0d0b09)`,
        }}
      >
        <div>
          {/* Eyebrow 小标：金色全大写宽字距（UI/UX §2.2） */}
          <div style={{ color: colors.gold, letterSpacing: '.32em', fontSize: 12, textTransform: 'uppercase', marginBottom: 18 }}>
            TP WHOLE-HOME FURNISHING
          </div>
          {/* H1：白色衬线大标题（clamp 40~76px） */}
          <h1 style={{
            fontFamily: fonts.display, fontSize: 'clamp(40px,6vw,76px)', fontWeight: 600,
            color: '#FAFAF9', margin: 0, lineHeight: 1.2,
          }}>
            高端全屋定制
          </h1>
          {/* slogan：米金色 */}
          <p style={{ color: '#e7d9c0', fontSize: 18, letterSpacing: '.06em', margin: '18px 0 30px' }}>
            以墨为骨 · 以金为魂 · 定制品质人居
          </p>
          {/* 双 CTA（FR-1.8 预约引导） */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#/contact" style={{
              display: 'inline-block', padding: '13px 34px', borderRadius: 999, background: colors.gold,
              color: '#fff', textDecoration: 'none', fontSize: 14, transition: 'all .2s',
            }}>在线预约</a>
            <a href="#/products" style={{
              display: 'inline-block', padding: '13px 34px', borderRadius: 999, border: '1px solid #FAFAF9',
              color: '#FAFAF9', textDecoration: 'none', fontSize: 14, transition: 'all .2s',
            }}>浏览产品</a>
          </div>
        </div>
      </section>

      {/* ---------- 说明条：阶段 1 骨架提示（阶段 5 移除） ---------- */}
      <section style={{ maxWidth, margin: '48px auto', padding: '0 24px' }}>
        <div style={{
          border: '1px dashed #B0894F', borderRadius: radius.md, padding: '28px 24px', textAlign: 'center',
          background: colors.surface, boxShadow: shadow.sm, color: colors.muted, fontSize: 14,
        }}>
          <p style={{ margin: 0, color: colors.ink, fontWeight: 600 }}>前台脚手架就绪 ✅（阶段 1）</p>
          <p style={{ margin: '10px 0 0' }}>
            设计令牌、Tailwind、路由、HTTP 客户端已配置。完整 10 页（首页/产品/案例/新闻/招聘/关于我们/联系我们）
            将在阶段 5 按《前台原型》逐页实现，全部内容由后台配置驱动。
          </p>
        </div>
      </section>
    </div>
  );
}
