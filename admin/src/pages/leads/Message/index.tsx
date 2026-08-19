// ============================================================
// 【代码段功能】留言咨询管理（BR-8）
//   复用 LeadManage：列表脱敏 → 处理 Drawer（未读→已读→已处理 + 备注）
// ============================================================
import LeadManage, { type LeadConfig } from '../LeadManage';

const cfg: LeadConfig = {
  resource: 'messages',
  title: '留言咨询管理',
  statusOptions: [
    { value: 'unread', label: '未读', color: 'error' },
    { value: 'read', label: '已读', color: 'processing' },
    { value: 'done', label: '已处理', color: 'success' },
  ],
  detailFields: [
    { key: 'name', label: '姓名' },
    { key: 'contact', label: '联系方式' },
    { key: 'content', label: '留言内容' },
  ],
};

export default function MessageManage() {
  return <LeadManage cfg={cfg} />;
}
