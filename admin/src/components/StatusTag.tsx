// ============================================================
// 【代码段功能】行内状态切换 Tag（PRD v2.2 §7 通用约定）
//   点击 Tag 即时切换状态并 Toast 反馈；不同状态展示不同配色。
//   映射约定（方案 §2.5）：on=启用/上架/发布/上线，off=禁用/下架/下架/下线，draft=草稿
// ============================================================
import { Tag, message } from 'antd';
import { useState } from 'react';

// 状态 → 展示文案与颜色（对齐 UI/UX §2.1 语义色）
const STATUS_META: Record<string, { text: string; color: string; next: 'on' | 'off' }> = {
  on: { text: '启用/上架', color: 'success', next: 'off' },      // 绿色
  off: { text: '禁用/下架', color: 'error', next: 'on' },        // 红色
  draft: { text: '草稿', color: 'warning', next: 'on' },          // 橙色
};

interface Props {
  status: string;                          // 当前状态值
  onChange: (next: 'on' | 'off') => Promise<void> | void;  // 切换回调（调用后端）
  titles?: Record<string, string>;         // 自定义文案（如"招聘中/已暂停"）
}

export default function StatusTag({ status, onChange, titles }: Props) {
  const [loading, setLoading] = useState(false);
  const meta = STATUS_META[status] || { text: status, color: 'default', next: 'on' };
  const text = titles?.[status] || meta.text;

  // 点击 → 调用后端状态切换 → 成功后由父组件刷新列表
  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onChange(meta.next);
      message.success('状态已更新');
    } catch {
      /* 错误提示已由 http 拦截器统一处理 */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tag color={meta.color} style={{ cursor: 'pointer', borderRadius: 999, padding: '2px 10px' }}
      onClick={handleClick}>
      {loading ? '切换中...' : text}
    </Tag>
  );
}
