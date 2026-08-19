// ============================================================
// 【代码段功能】职位管理（BR-5.1）
//   职位 CRUD + 招聘中/已暂停（is_activate 映射）+ JD 富文本表单回填
//   字段：职位名/类型(社招/校招)/部门/地点/薪资/岗位职责/任职要求
// ============================================================
import { useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Popconfirm, message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '../../../components/PageHeader';
import StatusTag from '../../../components/StatusTag';
import RichText from '../../../components/RichText';
import { cmsApi } from '../../../services/cms';

interface Job {
  id: number; title: string; type: 'social' | 'campus'; dept?: string | null;
  location?: string | null; salary?: string | null; responsibility?: string | null;
  requirement?: string | null; sort: number; is_activate: number;
}

const jobApi = cmsApi<Job>('jobs');

export default function JobManage() {
  const [list, setList] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    const p = await jobApi.list({ page, page_size: 10, keyword: keyword || undefined });
    setList(p.list); setTotal(p.pagination.total);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, keyword]);

  const openModal = async (item?: Job) => {
    if (item) {
      const d = await jobApi.get(item.id);
      setEditing(d); form.setFieldsValue(d);
    } else { setEditing(null); form.resetFields(); form.setFieldsValue({ type: 'social', sort: 0 }); }
    setModalOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    if (editing) await jobApi.update(editing.id, v); else await jobApi.create(v);
    message.success('保存成功'); setModalOpen(false); load();
  };

  const columns: ColumnsType<Job> = [
    { title: '职位名称', dataIndex: 'title', ellipsis: true },
    { title: '类型', dataIndex: 'type', width: 100, render: (t) => (t === 'social' ? <Tag color="gold">社会招聘</Tag> : <Tag>校园招聘</Tag>) },
    { title: '部门', dataIndex: 'dept', width: 100 },
    { title: '工作地点', dataIndex: 'location', width: 120 },
    { title: '薪资范围', dataIndex: 'salary', width: 130 },
    { title: '状态', dataIndex: 'is_activate', width: 110, render: (v, r) =>
      <StatusTag status={v === 1 ? 'on' : 'off'} titles={{ on: '招聘中', off: '已暂停' }}
        onChange={async (next) => { await jobApi.setStatus(r.id, next); load(); }} /> },
    { title: '操作', width: 130, render: (_, r) => (
      <Space size={10}>
        <a style={{ color: '#B0894F' }} onClick={() => openModal(r)}>编辑</a>
        <Popconfirm title="确认删除该职位？" onConfirm={async () => { await jobApi.remove(r.id); message.success('已删除'); load(); }}>
          <a style={{ color: '#FF4D4F' }}>删除</a>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <div>
      <PageHeader title="职位管理" />
      <Card style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Input.Search placeholder="搜索职位名/部门" allowClear style={{ width: 240 }} onSearch={(v) => { setPage(1); setKeyword(v); }} />
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>+ 新增职位</Button>
        </div>
        <Table rowKey="id" columns={columns} dataSource={list} size="middle"
          pagination={{ total, current: page, pageSize: 10, showTotal: (t) => `共 ${t} 条`, onChange: setPage }} />
      </Card>

      {/* 职位编辑 Modal（JD 表单回填） */}
      <Modal open={modalOpen} title={editing ? `编辑职位 · ${editing.title}` : '新增职位'} width={720}
        onCancel={() => setModalOpen(false)} onOk={save} destroyOnClose>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="title" label="职位名称" rules={[{ required: true, message: '请输入职位名称' }]}><Input /></Form.Item>
            <Form.Item name="type" label="类型" rules={[{ required: true }]}>
              <Select options={[{ value: 'social', label: '社会招聘' }, { value: 'campus', label: '校园招聘' }]} />
            </Form.Item>
            <Form.Item name="dept" label="部门"><Input /></Form.Item>
            <Form.Item name="location" label="工作地点"><Input placeholder="如：上海" /></Form.Item>
            <Form.Item name="salary" label="薪资范围"><Input placeholder="如：15-25K（社招展示，校招可选）" /></Form.Item>
            <Form.Item name="sort" label="排序值"><Input /></Form.Item>
          </div>
          <Form.Item label="岗位职责" name="responsibility"><RichText height={150} /></Form.Item>
          <Form.Item label="任职要求" name="requirement"><RichText height={150} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
