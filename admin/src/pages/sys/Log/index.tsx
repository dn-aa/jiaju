// ============================================================
// 【代码段功能】操作日志（BR-10.3）
//   全部后台写操作留痕查询：时间/操作人/动作/对象/详情/IP + 关键字搜索 + 分页
// ============================================================
import { useEffect, useState } from 'react';
import { Card, Input, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '../../../components/PageHeader';
import { getData } from '../../../services/http';

interface LogItem {
  id: number; operator_id: number; operator_name: string; action: string;
  object_type: string; object_id?: number | null; detail?: string | null;
  ip?: string | null; created_date?: string | null;
}

// 动作 → 语义标签（提升可读性）
function actionTag(action: string) {
  if (action.includes('create')) return <Tag color="success">新增</Tag>;
  if (action.includes('delete')) return <Tag color="error">删除</Tag>;
  if (action.includes('status')) return <Tag color="warning">状态</Tag>;
  if (action.includes('sort')) return <Tag color="gold">排序</Tag>;
  if (action.includes('reset')) return <Tag color="processing">重置</Tag>;
  return <Tag>{action.split(':').pop() || action}</Tag>;
}

export default function LogManage() {
  const [list, setList] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');

  const load = async () => {
    const d = await getData<{ list: LogItem[]; pagination: { total: number } }>(
      '/sys/logs', { page, page_size: 20, keyword: keyword || undefined });
    setList(d.list); setTotal(d.pagination.total);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, keyword]);

  const columns: ColumnsType<LogItem> = [
    { title: '时间', dataIndex: 'created_date', width: 160, render: (v) => (v ? v.replace('T', ' ').slice(0, 19) : '—') },
    { title: '操作人', dataIndex: 'operator_name', width: 110 },
    { title: '动作', dataIndex: 'action', width: 150, render: (v) => <>{actionTag(v)} <span style={{ color: '#78716C' }}>{v}</span></> },
    { title: '对象', dataIndex: 'object_type', width: 120 },
    { title: '对象ID', dataIndex: 'object_id', width: 80, render: (v) => v ?? '—' },
    { title: '详情', dataIndex: 'detail', ellipsis: true },
    { title: 'IP', dataIndex: 'ip', width: 130, render: (v) => v || '—' },
  ];

  return (
    <div>
      <PageHeader title="操作日志" />
      <Card style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Input.Search placeholder="搜索操作人/动作/详情" allowClear style={{ width: 280 }}
            onSearch={(v) => { setPage(1); setKeyword(v); }} />
          <span style={{ color: '#a8a29e', fontSize: 13, alignSelf: 'center' }}>
            记录全部后台写操作（增删改/状态切换/排序/重置密码等），供审计追溯
          </span>
        </div>
        <Table rowKey="id" columns={columns} dataSource={list} size="middle"
          pagination={{ total, current: page, pageSize: 20, showTotal: (t) => `共 ${t} 条`, onChange: setPage }} />
      </Card>
    </div>
  );
}
