// ============================================================
// 【代码段功能】合规页（阶段 7：隐私政策 / 用户协议）
//   统一渲染：标题 + 分节内容；用于前台表单授权勾选的落地页
//   （PIPL 合规：表单点明示 + 勾选授权，UIUX §3.5；正式文案上线前由甲方确认）
// ============================================================
import { Link } from 'react-router-dom';
import { colors, fonts, radius, shadow } from '../../theme/design-tokens';

interface Props {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}

export default function LegalPage({ title, updated, sections }: Props) {
  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ background: colors.ink, color: '#FAFAF9', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>LEGAL</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 40, margin: '10px 0 0', fontWeight: 600 }}>{title}</h1>
      </div>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px 80px' }}>
        <div style={{ color: colors.muted, fontSize: 13, marginBottom: 24 }}>更新日期：{updated}</div>
        <div style={{ background: colors.surface, borderRadius: radius.lg, padding: '36px 40px', boxShadow: shadow.sm }}>
          {sections.map((s) => (
            <section key={s.heading} style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, margin: '0 0 10px' }}>{s.heading}</h2>
              {s.body.map((p, i) => <p key={i} style={{ lineHeight: 1.9, fontSize: 14.5, color: colors.ink2, margin: '6px 0' }}>{p}</p>)}
            </section>
          ))}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${colors.line}`, fontSize: 13, color: colors.muted }}>
            如您对上述内容有疑问，可通过 <Link to="/contact" style={{ color: colors.goldD }}>联系我们</Link> 页面与客服沟通。
          </div>
        </div>
      </div>
    </div>
  );
}
