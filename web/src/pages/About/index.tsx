// ============================================================
// 【代码段功能】关于我们（FR-6.2 / BR-6.2）
//   Tab 切换：关于 TP / 发展历程 / 品牌介绍（富文本内容来自后台页面内容管理）
// ============================================================
import { useEffect, useState } from 'react';
import { colors, fonts, maxWidth, radius, shadow } from '../../theme/design-tokens';
import { getPages, type PageContent } from '../../services/public';

const TABS: { key: string; label: string }[] = [
  { key: 'about', label: '关于 TP' },
  { key: 'history', label: '发展历程' },
  { key: 'brand', label: '品牌介绍' },
];

export default function About() {
  const [pages, setPages] = useState<Record<string, PageContent>>({});
  const [active, setActive] = useState('about');

  useEffect(() => {
    getPages().then((list) => {
      const map: Record<string, PageContent> = {};
      list.forEach((p) => { map[p.key] = p; });
      setPages(map);
    }).catch(() => undefined);
  }, []);

  const page = pages[active];

  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ background: colors.ink, color: '#FAFAF9', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>ABOUT TP</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 40, margin: '10px 0 0', fontWeight: 600 }}>关于我们</h1>
      </div>

      <div style={{ maxWidth, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Tab 切换 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActive(t.key)}
              style={{ padding: '9px 26px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 14,
                background: active === t.key ? colors.gold : colors.soft, color: active === t.key ? '#fff' : colors.ink }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 页面内容（富文本，后台维护） */}
        <div style={{ background: colors.surface, borderRadius: radius.lg, padding: '36px 40px', boxShadow: shadow.sm }}>
          {page?.title && <h2 style={{ fontFamily: fonts.display, fontSize: 28, margin: '0 0 18px' }}>{page.title}</h2>}
          {page?.content ? (
            <div className="rich-text" dangerouslySetInnerHTML={{ __html: page.content }} style={{ lineHeight: 2, fontSize: 15, color: colors.ink2 }} />
          ) : (
            <div style={{ color: colors.muted, textAlign: 'center', padding: '60px 0' }}>
              该栏目内容维护中，请稍后访问
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
