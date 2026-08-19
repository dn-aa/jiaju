// ============================================================
// 【代码段功能】在线预约表单组件（BR-7.1，Contact 页与独立预约页复用）
//   姓名/手机号/日期（>=今天）/时段（site_config 预约时段）/备注 + 验证码
// ============================================================
import { useEffect, useState } from 'react';
import { colors, fonts } from '../theme/design-tokens';
import CaptchaInput from './CaptchaInput';
import PrivacyAgree from './PrivacyAgree';
import { getSiteConfig, submitAppointment } from '../services/public';

export default function AppointmentForm() {
  const [slots, setSlots] = useState<string[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [captcha, setCaptcha] = useState({ captcha_id: '', captcha_code: '' });
  const [agreed, setAgreed] = useState(false);   // 隐私授权（PIPL 合规，UIUX §3.5）
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // 预约时段来自后台联系信息配置（BR-6.2 与前台同源）
  useEffect(() => {
    getSiteConfig().then((c) => setSlots(c.appointment_slots || [])).catch(() => undefined);
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.phone || !form.appointment_date) { alert('请填写姓名、手机号与预约日期'); return; }
    if (!agreed) { alert('请先勾选隐私授权'); return; }
    if (!captcha.captcha_code) { alert('请输入验证码'); return; }
    setSubmitting(true);
    try {
      await submitAppointment({ ...form, ...captcha });
      setDone(true);
    } catch (e) {
      alert((e as Error).message || '提交失败，请重试');
      setCaptcha((c) => ({ ...c, captcha_code: '' }));
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 600, margin: '12px 0 6px' }}>预约提交成功</div>
        <div style={{ color: colors.muted, fontSize: 14 }}>客服将尽快与您电话确认到店时间</div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <F label="姓名 *"><input style={inp} value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="您的称呼" /></F>
        <F label="手机号 *"><input style={inp} value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="11 位手机号" /></F>
        <F label="预约日期 *"><input style={inp} type="date" min={today} value={form.appointment_date || ''} onChange={(e) => set('appointment_date', e.target.value)} /></F>
        <F label="时段">
          <select style={inp} value={form.slot || ''} onChange={(e) => set('slot', e.target.value)}>
            <option value="">请选择时段</option>
            {slots.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </F>
      </div>
      <F label="预约备注"><textarea style={{ ...inp, width: '100%', minHeight: 60, resize: 'vertical' }} value={form.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="想了解的品类/需求（选填）" /></F>
      <F label="验证码 *"><CaptchaInput value={captcha} onChange={setCaptcha} /></F>
      <PrivacyAgree agreed={agreed} onChange={setAgreed} />
      <button onClick={submit} disabled={submitting} style={{
        width: '100%', marginTop: 6, padding: 13, borderRadius: 999, border: 'none',
        background: colors.gold, color: '#fff', fontSize: 15, cursor: 'pointer', letterSpacing: '.1em',
      }}>{submitting ? '提交中...' : '提交预约'}</button>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d6d3d1', fontSize: 14, fontFamily: 'inherit', outline: 'none' };
