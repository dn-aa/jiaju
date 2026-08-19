// ============================================================
// 【代码段功能】在线预约管理（BR-7）
//   复用 LeadManage：列表脱敏 → 处理 Drawer（待处理→已联系→已完成/已取消 + 备注）
// ============================================================
import LeadManage, { type LeadConfig } from '../LeadManage';

const cfg: LeadConfig = {
  resource: 'appointments',
  title: '在线预约管理',
  statusOptions: [
    { value: 'pending', label: '待处理', color: 'warning' },
    { value: 'contacted', label: '已联系', color: 'processing' },
    { value: 'done', label: '已完成', color: 'success' },
    { value: 'cancelled', label: '已取消', color: 'error' },
  ],
  detailFields: [
    { key: 'name', label: '姓名' },
    { key: 'phone', label: '手机号' },
    { key: 'appointment_date', label: '预约日期' },
    { key: 'slot', label: '时段' },
    { key: 'note', label: '客户备注' },
  ],
};

export default function AppointmentManage() {
  return <LeadManage cfg={cfg} />;
}
