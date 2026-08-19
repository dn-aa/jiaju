// ============================================================
// 【代码段功能】在线预约独立页（BR-7.1）
//   复用 AppointmentForm 组件（时段与后台配置同源）
// ============================================================
import { colors, fonts, radius, shadow } from '../../theme/design-tokens';
import AppointmentForm from '../../components/AppointmentForm';

export default function AppointmentPage() {
  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ background: colors.ink, color: '#FAFAF9', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>APPOINTMENT</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 40, margin: '10px 0 0', fontWeight: 600 }}>在线预约</h1>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '36px 24px 80px' }}>
        <div style={{ background: colors.surface, borderRadius: radius.lg, padding: 32, boxShadow: shadow.md }}>
          <AppointmentForm />
        </div>
      </div>
    </div>
  );
}
