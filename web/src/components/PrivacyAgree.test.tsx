// ============================================================
// 【代码段功能】PrivacyAgree 组件测试（UIUX §3.5 表单合规）
//   验证：默认未勾选、勾选联动、未勾选提示、限流提示文案展示
// ============================================================
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrivacyAgree from '../components/PrivacyAgree';

describe('PrivacyAgree 隐私授权组件', () => {
  it('展示隐私协议文案与限流提示', () => {
    render(<PrivacyAgree agreed={false} onChange={vi.fn()} />);
    expect(screen.getByText(/隐私政策/)).toBeInTheDocument();
    expect(screen.getByText(/每小时限提交 5 次/)).toBeInTheDocument();   // 限流提示
  });

  it('勾选后回调 onChange(true)', () => {
    const onChange = vi.fn();
    render(<PrivacyAgree agreed={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('未勾选时显示警示（touched 后）', () => {
    render(<PrivacyAgree agreed={false} onChange={vi.fn()} />);
    const cb = screen.getByRole('checkbox');
    fireEvent.click(cb);          // 勾选（touched）
    fireEvent.click(cb);          // 取消勾选
    expect(screen.getByText(/请先勾选隐私授权/)).toBeInTheDocument();
  });
});
