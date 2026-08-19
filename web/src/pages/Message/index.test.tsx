// ============================================================
// 【代码段功能】在线留言提交链路测试（BR-8.1 关键 E2E 前置）
//   mock 接口层：填写表单 → 勾选隐私 → 提交 → 展示成功态
//   （验证码组件在 jsdom 中加载图片，mock CaptchaInput）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Message from './index';

// mock 提交接口与验证码组件（避免真实网络与图片加载）
vi.mock('../../services/public', () => ({
  submitMessage: vi.fn().mockResolvedValue({ code: 0, message: 'ok' }),
}));
vi.mock('../../components/CaptchaInput', () => ({
  default: ({ value, onChange }: { value: { captcha_code: string }; onChange: (v: { captcha_code: string }) => void }) => (
    <input
      placeholder="验证码"
      value={value.captcha_code}
      onChange={(e) => onChange({ captcha_id: 'x', captcha_code: e.target.value })}
    />
  ),
}));

describe('在线留言提交链路（BR-8.1）', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('未勾选隐私授权时提交被拦截', async () => {
    render(<Message />);
    fireEvent.change(screen.getByPlaceholderText('您的称呼'), { target: { value: '测试用户' } });
    fireEvent.change(screen.getByPlaceholderText('手机号或邮箱'), { target: { value: '13800001111' } });
    fireEvent.change(screen.getByPlaceholderText('想咨询的问题'), { target: { value: '想了解全屋定制' } });
    // 不勾选隐私 → 提交 → alert 拦截
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    fireEvent.click(screen.getByText('提交留言'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('请先勾选隐私授权'));
  });

  it('填写完整 + 勾选隐私 + 验证码 → 提交成功展示成功态', async () => {
    render(<Message />);
    fireEvent.change(screen.getByPlaceholderText('您的称呼'), { target: { value: '测试用户' } });
    fireEvent.change(screen.getByPlaceholderText('手机号或邮箱'), { target: { value: '13800001111' } });
    fireEvent.change(screen.getByPlaceholderText('想咨询的问题'), { target: { value: '想了解全屋定制' } });
    fireEvent.click(screen.getByRole('checkbox'));                     // 勾选隐私授权
    fireEvent.change(screen.getByPlaceholderText('验证码'), { target: { value: 'ABCD' } });
    fireEvent.click(screen.getByText('提交留言'));
    // 提交成功后展示成功态
    await waitFor(() => expect(screen.getByText(/留言提交成功/)).toBeInTheDocument());
  });
});
