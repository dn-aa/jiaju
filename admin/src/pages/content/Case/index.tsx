// ============================================================
// 【代码段功能】案例管理（BR-3）—— Tabs：案例列表 / 标签维护
//   案例：CRUD + 上架/下架（is_activate 映射）+ 类型/风格/空间筛选
//   标签维护：风格/空间字典（case_styles）CRUD（BR-3.2）
// ============================================================
import { useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Popconfirm, message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '../../../components/PageHeader';
import StatusTag from '../../../components/StatusTag';
import UploadImage from '../../../components/UploadImage';
import RichText from '../../../components/RichText';
import { cmsApi } from '../../../services/cms';

interface CaseItem { id: number; title: string; type: string; style?: string | null; space?: string | null; area?: string | null; cover?: string | null; sort: number; is_activate: number }
interface CaseStyle { id: number; name: string; type: 'style' | 'space'; sort: number; is_activate: number }

const caseApi = cmsApi<CaseItem>('cases');
const styleApi = cmsApi<CaseStyle>('case_styles');

export default function CaseManage() {
  return (
    <div>
      <PageHeader title="案例管理" />
      <Card style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}>
        <Tabs items={[
          { key: 'list', label: '案例列表', children: <CaseTab /> },
          { key: 'styles', label: '标签维护', children: <StyleTab /> },
        ]} />
      </Card>
    </div>
  );
}

function CaseTab() {
  const [list, setList] = useState<CaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CaseItem | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    const p = await caseApi.list({ page, page_size: 10, keyword: keyword || undefined, sort: 'sort,asc' });
    setList(p.list); setTotal(p.pagination.total);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, keyword, typeFilter]);

  const openModal = async (item?: CaseItem) => {
    if (item) {
      const d = await caseApi.get(item.id);
      setEditing(d); form.setFieldsValue(d);
    } else { setEditing(null); form.resetFields(); form.setFieldsValue({ type: '客户实景', sort: 0 }); }
    setModalOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    if (editing) await caseApi.update(editing.id, v); else await caseApi.create(v);
    message.success('保存成功'); setModalOpen(false); load();
  };

  const columns: ColumnsType<CaseItem> = [
    { title: '封面', dataIndex: 'cover', width: 70, render: (v) => v ? <img src={v} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} alt="" /> : '—' },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '类型', dataIndex: 'type', width: 100, render: (t) => <Tag color="gold">{t}</Tag> },
    { title: '风格 · 空间', width: 130, render: (_, r) => `${r.style || '—'} · ${r.space || '—'}` },
    { title: '面积', dataIndex: 'area', width: 80 },
    { title: '排序', dataIndex: 'sort', width: 70 },
    { title: '状态', dataIndex: 'is_activate', width: 110, render: (v, r) =>
      <StatusTag status={v === 1 ? 'on' : 'off'} onChange={async (next) => { await caseApi.setStatus(r.id, next); load(); }} /> },
    { title: '操作', width: 130, render: (_, r) => (
      <Space size={10}>
        <a style={{ color: '#B0894F' }} onClick={() => openModal(r)}>编辑</a>
        <Popconfirm title="确认删除该案例？" onConfirm={async () => { await caseApi.remove(r.id); message.success('已删除'); load(); }}>
          <a style={{ color: '#FF4D4F' }}>删除</a>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <>
      {/* 工具栏：关键字 + 类型筛选 + 新增 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input.Search placeholder="搜索标题/风格" allowClear style={{ width: 240 }} onSearch={(v) => { setPage(1); setKeyword(v); }} />
        <Select allowClear placeholder="类型" style={{ width: 140 }} value={typeFilter}
          onChange={(v) => { setPage(1); setTypeFilter(v); }}
          options={[{ value: '客户实景', label: '客户实景' }, { value: '设计方案', label: '设计方案' }]} />
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>+ 新增案例</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={list} size="middle"
        pagination={{ total, current: page, pageSize: 10, showTotal: (t) => `共 ${t} 条`, onChange: setPage }} />

      <Modal open={modalOpen} title={editing ? `编辑案例 · ${editing.title}` : '新增案例'} width={720}
        onCancel={() => setModalOpen(false)} onOk={save} destroyOnClose>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item>
            <Form.Item name="type" label="类型" rules={[{ required: true }]}>
              <Select options={[{ value: '客户实景', label: '客户实景' }, { value: '设计方案', label: '设计方案' }]} />
            </Form.Item>
            <Form.Item name="style" label="风格"><Input placeholder="如：现代/轻奢/新中式" /></Form.Item>
            <Form.Item name="space" label="空间"><Input placeholder="如：客厅/卧室" /></Form.Item>
            <Form.Item name="area" label="面积"><Input placeholder="如：128㎡" /></Form.Item>
            <Form.Item name="sort" label="排序值"><Input placeholder="0" /></Form.Item>
          </div>
          <Form.Item label="封面图片" name="cover" valuePropName="value">
            <UploadImage width={140} height={90} tip="点击上传/替换" />
          </Form.Item>
          <Form.Item label="项目背景" name="background"><RichText height={140} /></Form.Item>
          <Form.Item label="设计说明" name="description"><RichText height={140} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ==================== 标签维护（BR-3.2 风格/空间字典） ====================
function StyleTab() {
  const [list, setList] = useState<CaseStyle[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CaseStyle | null>(null);
  const [form] = Form.useForm();

  const load = async () => { setList((await styleApi.list({ page: 1, page_size: 50 })).list); };
  useEffect(() => { load(); }, []);

  const openModal = (item?: CaseStyle) => {
    setEditing(item || null); form.resetFields();
    if (item) form.setFieldsValue(item);
    setModalOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    if (editing) await styleApi.update(editing.id, v); else await styleApi.create(v);
    message.success('保存成功'); setModalOpen(false); load();
  };

  const columns: ColumnsType<CaseStyle> = [
    { title: '字典值', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', width: 120, render: (t) => (t === 'style' ? <Tag color="gold">风格</Tag> : <Tag>空间</Tag>) },
    { title: '排序', dataIndex: 'sort', width: 100 },
    { title: '状态', dataIndex: 'is_activate', width: 110, render: (v, r) =>
      <StatusTag status={v === 1 ? 'on' : 'off'} onChange={async (next) => { await styleApi.setStatus(r.id, next); load(); }} /> },
    { title: '操作', width: 130, render: (_, r) => (
      <Space size={10}>
        <a style={{ color: '#B0894F' }} onClick={() => openModal(r)}>编辑</a>
        <Popconfirm title="确认删除该字典项？" onConfirm={async () => { await styleApi.remove(r.id); message.success('已删除'); load(); }}>
          <a style={{ color: '#FF4D4F' }}>删除</a>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <>
      <div style={{ display: 'flex', marginBottom: 16 }}>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>+ 新增字典项</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={list} pagination={false} size="middle" />
      <Modal open={modalOpen} title={editing ? '编辑字典项' : '新增字典项'} onCancel={() => setModalOpen(false)} onOk={save} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="字典值" rules={[{ required: true, message: '请输入字典值' }]}><Input placeholder="如：侘寂" /></Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={[{ value: 'style', label: '风格' }, { value: 'space', label: '空间' }]} />
          </Form.Item>
          <Form.Item name="sort" label="排序值"><Input /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
