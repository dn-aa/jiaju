// ============================================================
// 【代码段功能】隐私授权勾选 + 限流提示（UIUX v1.2 §3.5 表单公共能力）
//   三表单（预约/留言/简历）共用：未勾选隐私授权不可提交；
//   展示限流提示文案（后端按 IP/手机号限流，超限返回错误）
// ============================================================
import { useState } from 'react';
import { colors } from '../theme/design-tokens';

interface Props {
  agreed: boolean;
  onChange: (v: boolean) => void;
}

export default function PrivacyAgree({ agreed, onChange }: Props) {
  const [touched, setTouched] = useState(false);

  return (
    <div style={{ marginBottom: 14, fontSize: 13 }}>
      {/* 隐私授权勾选（PIPL 合规，未勾选时提示） */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', color: colors.ink2, lineHeight: 1.6 }}>
        <input type="checkbox" checked={agreed}
          onChange={(e) => { setTouched(true); onChange(e.target.checked); }}
          style={{ marginTop: 3, accentColor: colors.gold, width: 15, height: 15 }} />
        <span>
          我已阅读并同意《隐私政策》与《用户协议》，同意 TP 全屋家居收集并使用上述信息用于需求对接（
          <span style={{ color: colors.goldD }}>仅用于本服务，最小化收集</span>）。
        </span>
      </label>
      {/* 未勾选即点提交时的提示 */}
      {touched && !agreed && (
        <div style={{ color: '#DC2626', marginTop: 6 }}>请先勾选隐私授权后再提交</div>
      )}
      {/* 限流提示（后端 IP/手机号 5 次/分，超限返回 code=3001） */}
      <div style={{ color: colors.muted, marginTop: 8, fontSize: 12 }}>
        ⏱ 为保障服务质量，同一设备/联系方式每小时限提交 5 次，请勿重复提交。
      </div>
    </div>
  );
}
