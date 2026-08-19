// ============================================================
// 【代码段功能】职位详情 + 投递表单（FR-5.2 / BR-5.2）
//   JD（岗位职责/任职要求富文本）+ 投递表单：
//   校招填学校/学历/专业/毕业时间，社招填工作年限/当前职位；
//   附件简历上传（pdf/doc/docx ≤10MB）+ 验证码 + 提交成功提示
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { colors, fonts, maxWidth, radius, shadow } from '../../theme/design-tokens';
import CaptchaInput from '../../components/CaptchaInput';
import PrivacyAgree from '../../components/PrivacyAgree';
import { getJob, submitApplication, type JobDetail } from '../../services/public';

export default function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [form, setForm] = useState<Record<string, string | number>>({ job_id: Number(id) });
  const [captcha, setCaptcha] = useState({ captcha_id: '', captcha_code: '' });
  const [agreed, setAgreed] = useState(false);   // 隐私授权（PIPL 合规）
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getJob(Number(id)).then(setJob).catch(() => undefined); }, [id]);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  // 投递提交：multipart（字段 + 附件 + 验证码）
  const submit = async () => {
    if (!form.name || !form.phone) { alert('请填写姓名与手机号'); return; }
    if (!agreed) { alert('请先勾选隐私授权'); return; }
    if (!captcha.captcha_code) { alert('请输入验证码'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      fd.append('captcha_id', captcha.captcha_id);
      fd.append('captcha_code', captcha.captcha_code);
      if (file) fd.append('attachment', file);
      await submitApplication(fd);
      setDone(true);
    } catch (e) {
      alert((e as Error).message || '投递失败，请重试');
    } finally { setSubmitting(false); }
  };

  if (!job) return <div style={{ padding: '120px 0', textAlign: 'center', color: '#a8a29e' }}>加载中...</div>;
  const isCampus = job.type === 'campus';

  return (
    <div style={{ fontFamily: fonts.body }}>
      <div style={{ background: colors.soft, padding: '20px 24px' }}>
        <div style={{ maxWidth, margin: '0 auto', fontSize: 13, color: colors.muted }}>
          <Link to="/" style={{ color: colors.goldD, textDecoration: 'none' }}>首页</Link> /{' '}
          <Link to="/jobs" style={{ color: colors.goldD, textDecoration: 'none' }}>加入我们</Link> / {job.title}
        </div>
      </div>

      <div style={{ maxWidth, margin: '0 auto', padding: '36px 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 36 }}>
        {/* 左侧：JD */}
        <div>
          <h1 style={{ fontFamily: fonts.display, fontSize: 30, margin: 0 }}>{job.title}</h1>
          <div style={{ display: 'flex', gap: 16, color: colors.muted, fontSize: 13, margin: '12px 0 24px', flexWrap: 'wrap' }}>
            <span>{job.type === 'social' ? '社会招聘' : '校园招聘'}</span>
            <span>{job.dept}</span>
            <span>{job.location}</span>
            {job.salary && <span style={{ color: colors.gold, fontWeight: 600 }}>{job.salary}</span>}
          </div>
          {job.responsibility && (
            <>
              <div style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, margin: '20px 0 10px' }}>岗位职责</div>
              <div className="rich-text" dangerouslySetInnerHTML={{ __html: job.responsibility }} style={{ lineHeight: 1.9, fontSize: 14.5, color: colors.ink2 }} />
            </>
          )}
          {job.requirement && (
            <>
              <div style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, margin: '20px 0 10px' }}>任职要求</div>
              <div className="rich-text" dangerouslySetInnerHTML={{ __html: job.requirement }} style={{ lineHeight: 1.9, fontSize: 14.5, color: colors.ink2 }} />
            </>
          )}
        </div>

        {/* 右侧：投递表单（BR-5.2） */}
        <div style={{ background: colors.surface, borderRadius: radius.lg, padding: 28, boxShadow: shadow.md, alignSelf: 'start' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 40 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 600, margin: '12px 0 6px' }}>投递成功</div>
              <div style={{ color: colors.muted, fontSize: 14 }}>简历已送达，HR 将尽快与您联系</div>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 600, marginBottom: 18 }}>投递简历</div>
              {/* 基础信息 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="姓名 *"><input style={inp} value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="您的姓名" /></Field>
                <Field label="手机号 *"><input style={inp} value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="11 位手机号" /></Field>
              </div>
              <Field label="邮箱"><input style={{ ...inp, width: '100%' }} value={form.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="选填" /></Field>
              <Field label="个人简介"><textarea style={{ ...inp, width: '100%', minHeight: 70, resize: 'vertical' }} value={form.intro || ''} onChange={(e) => set('intro', e.target.value)} placeholder="一句话介绍自己（选填）" /></Field>
              {/* 校招/社招差异化字段 */}
              {isCampus ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="学校"><input style={inp} value={form.school || ''} onChange={(e) => set('school', e.target.value)} /></Field>
                  <Field label="学历"><input style={inp} value={form.education || ''} onChange={(e) => set('education', e.target.value)} placeholder="本科/硕士" /></Field>
                  <Field label="专业"><input style={inp} value={form.major || ''} onChange={(e) => set('major', e.target.value)} /></Field>
                  <Field label="毕业时间"><input style={inp} value={form.grad_at || ''} onChange={(e) => set('grad_at', e.target.value)} placeholder="如 2027.06" /></Field>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="工作年限"><input style={inp} type="number" value={form.work_years || ''} onChange={(e) => set('work_years', e.target.value)} placeholder="年" /></Field>
                  <Field label="当前职位"><input style={inp} value={form.current_title || ''} onChange={(e) => set('current_title', e.target.value)} /></Field>
                </div>
              )}
              {/* 附件简历（pdf/doc/docx ≤10MB） */}
              <Field label="简历附件">
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <button onClick={() => fileRef.current?.click()} style={{
                  width: '100%', padding: 12, borderRadius: 8, border: `1px dashed ${colors.gold}`, background: colors.soft,
                  color: colors.goldD, fontSize: 13, cursor: 'pointer',
                }}>
                  {file ? `已选择：${file.name}（${(file.size / 1024).toFixed(0)}KB）` : '点击上传简历附件（PDF/Word ≤10MB）'}
                </button>
              </Field>
              <Field label="验证码 *">
                <CaptchaInput value={captcha} onChange={setCaptcha} />
              </Field>
              <PrivacyAgree agreed={agreed} onChange={setAgreed} />
              <button onClick={submit} disabled={submitting} style={{
                width: '100%', marginTop: 8, padding: 13, borderRadius: 999, border: 'none',
                background: colors.gold, color: '#fff', fontSize: 15, cursor: 'pointer', letterSpacing: '.1em',
              }}>{submitting ? '提交中...' : '立即投递'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 表单字段容器 + 通用输入样式
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: 8, border: '1px solid #d6d3d1', fontSize: 14, fontFamily: 'inherit', outline: 'none' };
