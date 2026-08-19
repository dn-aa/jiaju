// ============================================================
// 【代码段功能】联系我们（FR-6.4 / BR-6.2）
//   联系信息（地址/电话/邮箱/营业时间，与后台配置同源）+ 地图占位
//   + 在线预约表单（嵌入，BR-7.1）
// ============================================================
import { useEffect, useState } from 'react';
import { colors, fonts, maxWidth, radius, shadow } from '../../theme/design-tokens';
import AppointmentForm from '../../components/AppointmentForm';
import { getSiteConfig, type SiteConfig } from '../../services/public';

export default function Contact() {
  const [site, setSite] = useState<SiteConfig>({});

  useEffect(() => { getSiteConfig().then(setSite).catch(() => undefined); }, []);

  const info = [
    { label: '体验中心', value: site.address },
    { label: '客服电话', value: site.phone },
    { label: '联系邮箱', value: site.email },
    { label: '营业时间', value: site.hours || '周一至周日 10:00–20:00' },
  ];

  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ background: colors.ink, color: '#FAFAF9', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>CONTACT US</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 40, margin: '10px 0 0', fontWeight: 600 }}>联系我们</h1>
      </div>

      <div style={{ maxWidth, margin: '0 auto', padding: '36px 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 32 }}>
        {/* 左：联系信息 + 地图占位 */}
        <div>
          <div style={{ background: colors.surface, borderRadius: radius.lg, padding: 28, boxShadow: shadow.sm, marginBottom: 20 }}>
            <div style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 600, marginBottom: 16 }}>联系信息</div>
            {info.map((i) => (
              <div key={i.label} style={{ display: 'flex', marginBottom: 12, fontSize: 14 }}>
                <span style={{ width: 76, color: colors.muted, flexShrink: 0 }}>{i.label}</span>
                <span style={{ color: colors.ink2, wordBreak: 'break-all' }}>{i.value || '—'}</span>
              </div>
            ))}
          </div>
          {/* 地图占位（腾讯地图坐标，开发期展示；上线接入正式 key） */}
          <div style={{ height: 240, borderRadius: radius.lg, background: colors.soft, border: `1px solid ${colors.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.muted, fontSize: 13 }}>
            📍 地图占位（{site.map_coord || '坐标待配置'}）<br />
            上线前接入腾讯地图 JS SDK
          </div>
        </div>

        {/* 右：在线预约表单 */}
        <div style={{ background: colors.surface, borderRadius: radius.lg, padding: 28, boxShadow: shadow.md, alignSelf: 'start' }}>
          <div style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 600, marginBottom: 18 }}>在线预约到店</div>
          <AppointmentForm />
        </div>
      </div>
    </div>
  );
}
