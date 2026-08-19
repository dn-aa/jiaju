// ============================================================
// 【代码段功能】前台全局布局（UI/UX v1.2 §4.2 前台结构规范）
//   - 顶部公告条（FR-7.5 可配置公告）
//   - 顶栏导航：首页/产品中心/新案例/新闻动态/加入我们/关于我们/联系我们
//     （深墨透明 → 滚动态实色 + 底部金色细线；左侧 TP 品牌 Mark）
//   - 页脚：三列（品牌介绍 / 快捷导航 / 联系信息）+ 备案占位
// ============================================================
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { colors, fonts, maxWidth } from '../theme/design-tokens';
import { getHome, getSiteConfig, type SiteConfig } from '../services/public';

// 主导航（PRD §5 信息架构）
const NAVS = [
  { to: '/', label: '首页' },
  { to: '/products', label: '产品中心' },
  { to: '/cases', label: '新案例' },
  { to: '/news', label: '新闻动态' },
  { to: '/jobs', label: '加入我们' },
  { to: '/about', label: '关于我们' },
  { to: '/contact', label: '联系我们' },
];

export default function Layout() {
  const [scrolled, setScrolled] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [site, setSite] = useState<SiteConfig>({});
  const { pathname } = useLocation();

  // 滚动监听：超过 40px 顶栏由透明变实色
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 拉取公告条与联系信息（页脚同源）
  useEffect(() => {
    getHome().then((h) => setAnnouncement(h.announcement || null)).catch(() => undefined);
    getSiteConfig().then(setSite).catch(() => undefined);
  }, []);

  // 首页 Hero 透明顶栏（深色底），内页浅色顶栏
  const isHome = pathname === '/';
  const solid = scrolled || !isHome;

  return (
    <div style={{ fontFamily: fonts.body, color: colors.ink, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ---------- 顶部公告条（FR-7.5） ---------- */}
      {announcement && (
        <div style={{ background: colors.gold, color: '#fff', textAlign: 'center', fontSize: 13, padding: '6px 16px' }}>
          {announcement}
        </div>
      )}

      {/* ---------- 顶栏导航（透明→实色滚动） ---------- */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: solid ? colors.bg : 'transparent',
        borderBottom: solid ? `1px solid ${colors.line}` : '1px solid rgba(250,250,249,.08)',
        transition: 'all .25s',
      }}>
        <div style={{ maxWidth, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* 品牌 Mark（点击回首页） */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 6, border: `1px solid ${colors.gold}`,
              background: colors.ink, color: colors.gold, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontFamily: fonts.display, fontWeight: 600, fontSize: 15,
            }}>TP</div>
            <span style={{ color: solid ? colors.ink : '#FAFAF9', fontSize: 15, fontWeight: 600, fontFamily: fonts.display }}>
              TP 全屋家居
            </span>
          </Link>
          {/* 导航链接 */}
          <nav style={{ display: 'flex', gap: 26, flex: 1, justifyContent: 'flex-end' }}>
            {NAVS.map((n) => (
              <Link key={n.to} to={n.to}
                style={{
                  color: solid ? colors.ink2 : '#e7d9c0', textDecoration: 'none', fontSize: 14,
                  letterSpacing: '.04em', position: 'relative', padding: '4px 0',
                  borderBottom: pathname === n.to ? `2px solid ${colors.gold}` : '2px solid transparent',
                }}>
                {n.label}
              </Link>
            ))}
          </nav>
          {/* CTA：预约到店 */}
          <Link to="/contact" style={{
            padding: '9px 22px', borderRadius: 999, background: colors.gold, color: '#fff',
            textDecoration: 'none', fontSize: 13, letterSpacing: '.05em', whiteSpace: 'nowrap',
          }}>预约到店</Link>
        </div>
      </header>

      {/* ---------- 内容区（子路由出口） ---------- */}
      <main style={{ flex: 1 }}><Outlet /></main>

      {/* ---------- 页脚：品牌 / 快捷导航 / 联系信息（FR-6.4.1 同源） ---------- */}
      <footer style={{ background: colors.ink, color: '#a8a29e', padding: '48px 24px 20px', fontSize: 13 }}>
        <div style={{ maxWidth, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 32 }}>
          <div>
            <div style={{ color: '#FAFAF9', fontFamily: fonts.display, fontSize: 18, marginBottom: 10 }}>TP 全屋家居</div>
            <p style={{ lineHeight: 1.8, margin: 0, maxWidth: 300 }}>
              以墨为骨、以金为魂，专注高端全屋定制。设计、生产、安装、售后一站式服务。
            </p>
          </div>
          <div>
            <div style={{ color: colors.gold, marginBottom: 10, letterSpacing: '.12em' }}>快速导航</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {NAVS.map((n) => (
                <Link key={n.to} to={n.to} style={{ color: '#a8a29e', textDecoration: 'none' }}>{n.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: colors.gold, marginBottom: 10, letterSpacing: '.12em' }}>联系信息</div>
            <div style={{ lineHeight: 2 }}>
              <div>地址：{site.address || '—'}</div>
              <div>电话：{site.phone || '—'}</div>
              <div>邮箱：{site.email || '—'}</div>
              <div>营业时间：{site.hours || '周一至周日 10:00–20:00'}</div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth, margin: '24px auto 0', borderTop: '1px solid #44403C', paddingTop: 14, textAlign: 'center', color: '#78716C', fontSize: 12 }}>
          © 2026 TP 全屋家居 · 演示项目（ICP 备案占位）
        </div>
      </footer>
    </div>
  );
}
