// ============================================================
// 【代码段功能】在线留言（BR-8.1）
//   姓名/联系方式/留言内容 + 验证码 → 后台「留言咨询」待处理
// ============================================================
import { useState } from 'react';
import { colors, fonts, radius, shadow } from '../../theme/design-tokens';
import CaptchaInput from '../../components/CaptchaInput';
import { submitMessage } from '../../services/public';

export default function Message() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [captcha, setCaptcha] = useState({ captcha_id: '', captcha_code: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.contact || !form.content) { alert('请填写姓名、联系方式与留言内容'); return; }
    if (!captcha.captcha_code) { alert('请输入验证码'); return; }
    setSubmitting(true);
    try {
      await submitMessage({ ...form, ...captcha });
      setDone(true);
    } catch (e) {
      alert((e as Error).message || '提交失败，请重试');
      setCaptcha((c) => ({ ...c, captcha_code: '' }));
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ background: colors.ink, color: '#FAFAF9', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>MESSAGE</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 40, margin: '10px 0 0', fontWeight: 600 }}>在线留言</h1>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '36px 24px 80px' }}>
        <div style={{ background: colors.surface, borderRadius: radius.lg, padding: 32, boxShadow: shadow.md }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: 40 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 600, margin: '12px 0 6px' }}>留言提交成功</div>
              <div style={{ color: colors.muted, fontSize: 14 }}>我们会尽快回复您，感谢咨询</div>
            </div>
          ) : (
            <>
              <F label="姓名 *"><input style={inp} value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="您的称呼" /></F>
              <F label="联系方式 *"><input style={inp} value={form.contact || ''} onChange={(e) => set('contact', e.target.value)} placeholder="手机号或邮箱" /></F>
              <F label="留言内容 *"><textarea style={{ ...inp, width: '100%', minHeight: 110, resize: 'vertical' }} value={form.content || ''} onChange={(e) => set('content', e.target.value)} placeholder="想咨询的问题" /></F>
              <F label="验证码 *"><CaptchaInput value={captcha} onChange={setCaptcha} /></F>
              <button onClick={submit} disabled={submitting} style={{
                width: '100%', marginTop: 6, padding: 13, borderRadius: 999, border: 'none',
                background: colors.gold, color: '#fff', fontSize: 15, cursor: 'pointer', letterSpacing: '.1em',
              }}>{submitting ? '提交中...' : '提交留言'}</button>
            </>
          )}
        </div>
      </div>
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
