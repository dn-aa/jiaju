// ============================================================
// 【代码段功能】简历投递管理（BR-5.2）
//   复用 LeadManage：列表脱敏 → 处理 Drawer（待处理→已查看→已联系/不合适 + 备注）
//   附：简历附件下载链接（详情中 attachment 字段）
//   注：emptyText='' 使未填字段显示空白（去掉 '—'），仅本模块生效
// ============================================================
import LeadManage, { type LeadConfig } from '../../leads/LeadManage';

const cfg: LeadConfig = {
  resource: 'applications',
  title: '简历投递管理',
  emptyText: '',   // 未填信息显示空白，去掉 '—'（预约/留言保持默认）
  statusOptions: [
    { value: 'pending', label: '待处理', color: 'warning' },
    { value: 'viewed', label: '已查看', color: 'processing' },
    { value: 'contacted', label: '已联系', color: 'success' },
    { value: 'rejected', label: '不合适', color: 'error' },
  ],
  detailFields: [
    { key: 'name', label: '姓名' },
    { key: 'phone', label: '手机号' },
    { key: 'email', label: '邮箱' },
    { key: 'school', label: '学校' },
    { key: 'education', label: '学历' },
    { key: 'major', label: '专业' },
    { key: 'grad_at', label: '毕业时间' },
    { key: 'work_years', label: '工作年限' },
    { key: 'current_title', label: '当前职位' },
    { key: 'intro', label: '个人简介' },
    { key: 'attachment', label: '简历附件' },
  ],
};

export default function ApplicationManage() {
  return <LeadManage cfg={cfg} />;
}
