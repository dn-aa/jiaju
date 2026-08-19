// ============================================================
// 【代码段功能】图形验证码组件（FR-7.2）
//   - 显示验证码图片 + 输入框，点击图片可刷新
//   - 提交时携带 captcha_id + captcha_code（一次性消费）
// ============================================================
import { useEffect, useState } from 'react';
import { http } from '../services/http';

interface Props {
  value: { captcha_id: string; captcha_code: string };   // 受控值（随表单提交）
  onChange: (v: { captcha_id: string; captcha_code: string }) => void;
}

export default function CaptchaInput({ value, onChange }: Props) {
  const [image, setImage] = useState<string | null>(null);

  // 拉取新验证码（返回 id + base64 图片）
  const refresh = async () => {
    try {
      const d = await http.get('/public/captcha').then((r) => r.data.data);
      setImage(d.image);
      onChange({ captcha_id: d.captcha_id, captcha_code: '' });
    } catch { /* 网络异常时静默 */ }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <input
        placeholder="验证码"
        value={value.captcha_code}
        onChange={(e) => onChange({ ...value, captcha_code: e.target.value.toUpperCase() })}
        style={{
          flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #d6d3d1',
          fontSize: 14, fontFamily: 'inherit', outline: 'none',
        }}
      />
      {/* 点击刷新验证码 */}
      {image ? (
        <img src={image} alt="验证码" title="点击刷新" onClick={refresh}
          style={{ height: 40, borderRadius: 8, cursor: 'pointer', border: '1px solid #E7E5E4' }} />
      ) : (
        <div style={{ height: 40, width: 120, borderRadius: 8, background: '#F5F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a8a29e', fontSize: 12 }}>
          加载中...
        </div>
      )}
    </div>
  );
}
