// ============================================================
// 【代码段功能】线索管理通用页面组件（阶段 3：BR-5.2/7/8 共用）
//   列表（脱敏）→ 处理 Drawer（详情完整 + 状态流转 seg + 跟进备注）
//   三个模块（预约/留言/简历）通过配置复用本组件
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Drawer, Form, Input, Select, Space, Table, Tag, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '../../components/PageHeader';
import { getData, putData } from '../../services/http';

// 状态展示配置：value → 文案/颜色（对齐 UI/UX §2.1 语义色）
export interface StatusOption { value: string; label: string; color: string }

export interface LeadConfig {
  resource: 'appointments' | 'messages' | 'applications';  // 后端资源名
  title: string;                                            // 模块标题
  statusOptions: StatusOption[];                            // 状态枚举（流转目标）
  detailFields: { key: string; label: string }[];           // Drawer 中展示的完整字段
}

interface LeadItem {
  id: number; status: string; created_date?: string;
  name?: string; phone?: string; contact?: string; content?: string;
  appointment_date?: string; slot?: string; note?: string;
  [k: string]: unknown;
}

export default function LeadManage({ cfg }: { cfg: LeadConfig }) {
  const [list, setList] = useState<LeadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>();
  const [detail, setDetail] = useState<LeadItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // 加载列表：状态/关键字筛选 + 分页（返回脱敏数据）
  const load = useCallback(async () => {
    const d = await getData<{ list: LeadItem[]; pagination: { total: number } }>(
      `/leads/${cfg.resource}`, { page, page_size: 10, status: status || undefined, keyword: keyword || undefined });
    setList(d.list); setTotal(d.pagination.total);
  }, [cfg.resource, page, status, keyword]);
  useEffect(() => { load(); }, [load]);

  // 打开处理 Drawer：拉详情（完整信息）并回填状态/备注
  const openDrawer = async (item: LeadItem) => {
    const d = await getData<LeadItem>(`/leads/${cfg.resource}/${item.id}`);
    setDetail(d);
    form.setFieldsValue({ status: d.status, note: '' });
    setDrawerOpen(true);
  };

  // 状态流转提交：状态 + 备注 → PUT /status（备注写入操作日志留痕）
  const submit = async () => {
    const v = await form.validateFields();
    if (!detail) return;
    setSaving(true);
    try {
      await putData(`/leads/${cfg.resource}/${detail.id}/status`, { status: v.status, note: v.note });
      message.success('状态已更新');
      setDrawerOpen(false);
      load();
    } finally { setSaving(false); }
  };

  const columns: ColumnsType<LeadItem> = [
    ...cfg.detailFields
      .filter((f) => f.key !== 'note')
      .map((f) => ({
        title: f.label, dataIndex: f.key, ellipsis: true,
        render: (v: unknown) => (v == null || v === '' ? '—' : String(v)),
      })),
    { title: '提交时间', dataIndex: 'created_date', width: 150, render: (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : '—') },
    { title: '状态', dataIndex: 'status', width: 100, render: (s) => {
      const opt = cfg.statusOptions.find((o) => o.value === s);
      return <Tag color={opt?.color || 'default'}>{opt?.label || s}</Tag>;
    } },
    { title: '操作', width: 90, render: (_, r) => (
      <a style={{ color: '#B0894F' }} onClick={() => openDrawer(r)}>处理</a>
    ) },
  ];

  return (
    <div>
      <PageHeader title={cfg.title} />
      <Card style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}>
        {/* 工具栏：关键字 + 状态筛选 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Input.Search placeholder="搜索姓名/手机号" allowClear style={{ width: 240 }}
            onSearch={(v) => { setPage(1); setKeyword(v); }} />
          <Select allowClear placeholder="状态筛选" style={{ width: 160 }} value={status}
            onChange={(v) => { setPage(1); setStatus(v); }}
            options={cfg.statusOptions.map((o) => ({ value: o.value, label: o.label }))} />
        </div>
        <Table rowKey="id" columns={columns} dataSource={list} size="middle"
          pagination={{ total, current: page, pageSize: 10, showTotal: (t) => `共 ${t} 条`, onChange: setPage }} />
      </Card>

      {/* 处理 Drawer：详情（完整）+ 状态流转 + 跟进备注（BR-7.3/8.3） */}
      <Drawer open={drawerOpen} title={`处理 · ${cfg.title} #${detail?.id ?? ''}`} width={460}
        onClose={() => setDrawerOpen(false)}>
        {detail && (
          <>
            {/* 详情字段（完整个人信息，授权角色可见） */}
            <div style={{ background: '#FAFAF9', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              {cfg.detailFields.map((f) => (
                <div key={f.key} style={{ display: 'flex', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ width: 90, color: '#78716C', flexShrink: 0 }}>{f.label}</span>
                  {/* 附件字段渲染为下载链接（BR-5.2 简历附件下载） */}
                  {f.key === 'attachment' && detail[f.key] ? (
                    <a href={String(detail[f.key])} target="_blank" rel="noreferrer"
                      style={{ color: '#B0894F' }}>点击下载附件</a>
                  ) : (
                    <span style={{ color: '#1C1917', wordBreak: 'break-all' }}>{String(detail[f.key] ?? '—')}</span>
                  )}
                </div>
              ))}
            </div>
            <Form form={form} layout="vertical">
              {/* 状态流转 seg：待处理→已联系→已完成/已取消（按配置枚举） */}
              <Form.Item name="status" label="流转状态" rules={[{ required: true, message: '请选择状态' }]}>
                <Select options={cfg.statusOptions.map((o) => ({ value: o.value, label: o.label }))} />
              </Form.Item>
              <Form.Item name="note" label="跟进备注">
                <Input.TextArea rows={3} placeholder="填写跟进情况（记录到操作日志，可追溯）" />
              </Form.Item>
            </Form>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setDrawerOpen(false)}>取消</Button>
              <Button type="primary" loading={saving} onClick={submit}>确认更新</Button>
            </Space>
          </>
        )}
      </Drawer>
    </div>
  );
}
