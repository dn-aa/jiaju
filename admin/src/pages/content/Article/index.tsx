// ============================================================
// 【代码段功能】新闻管理（BR-4）
//   文章 CRUD + 发布/下架（is_published）+ 置顶/推荐 + 富文本正文
//   字段：标题/分类(企业新闻/行业资讯)/封面/摘要/正文/来源/发布时间/截止时间/作者
// ============================================================
import { useEffect, useState } from 'react';
import {
  Button, Card, DatePicker, Form, Input, Select, Space, Switch, Table, Tag, Popconfirm, message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageHeader from '../../../components/PageHeader';
import StatusTag from '../../../components/StatusTag';
import UploadImage from '../../../components/UploadImage';
import RichText from '../../../components/RichText';
import { cmsApi } from '../../../services/cms';

interface Article {
  id: number; title: string; category: 'company' | 'industry'; cover_image?: string | null;
  summary?: string | null; body?: string | null; source?: string | null;
  is_published: number; is_top: number; publish_at?: string | null; expire_at?: string | null;
  author?: string | null; is_activate: number;
}

const articleApi = cmsApi<Article>('articles');

export default function ArticleManage() {
  const [list, setList] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [catFilter, setCatFilter] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    const p = await articleApi.list({ page, page_size: 10, keyword: keyword || undefined, sort: 'publish_at,desc' });
    setList(p.list); setTotal(p.pagination.total);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, keyword, catFilter]);

  const openModal = async (item?: Article) => {
    if (item) {
      const d = await articleApi.get(item.id);
      setEditing(d);
      // 日期字段转为 dayjs（适配 DatePicker）
      form.setFieldsValue({ ...d, publish_at: d.publish_at ? dayjs(d.publish_at) : null, expire_at: d.expire_at ? dayjs(d.expire_at) : null });
    } else {
      setEditing(null); form.resetFields();
      form.setFieldsValue({ category: 'company', is_published: 0, is_top: 0 });
    }
    setModalOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
      is_published: v.is_published ? 1 : 0,
      is_top: v.is_top ? 1 : 0,
      publish_at: v.publish_at ? v.publish_at.toISOString() : null,
      expire_at: v.expire_at ? v.expire_at.toISOString() : null,
    };
    if (editing) await articleApi.update(editing.id, payload); else await articleApi.create(payload);
    message.success('保存成功'); setModalOpen(false); load();
  };

  const columns: ColumnsType<Article> = [
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '分类', dataIndex: 'category', width: 110, render: (c) => (c === 'company' ? <Tag color="gold">企业新闻</Tag> : <Tag>行业资讯</Tag>) },
    { title: '作者', dataIndex: 'author', width: 90 },
    { title: '发布时间', dataIndex: 'publish_at', width: 150, render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
    { title: '置顶/推荐', dataIndex: 'is_top', width: 90, render: (v) => (v ? <Tag color="gold">置顶</Tag> : '—') },
    { title: '发布状态', dataIndex: 'is_published', width: 110, render: (v, r) =>
      <StatusTag status={v === 1 ? 'on' : 'off'} onChange={async (next) => { await articleApi.setStatus(r.id, next); load(); }} /> },
    { title: '操作', width: 130, render: (_, r) => (
      <Space size={10}>
        <a style={{ color: '#B0894F' }} onClick={() => openModal(r)}>编辑</a>
        <Popconfirm title="确认删除该文章？" onConfirm={async () => { await articleApi.remove(r.id); message.success('已删除'); load(); }}>
          <a style={{ color: '#FF4D4F' }}>删除</a>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <div>
      {!modalOpen ? (
        <>
          <PageHeader title="新闻管理" />
          <Card style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}>
            {/* 工具栏 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <Input.Search placeholder="搜索标题/作者" allowClear style={{ width: 240 }} onSearch={(v) => { setPage(1); setKeyword(v); }} />
              <Select allowClear placeholder="分类" style={{ width: 140 }} value={catFilter} onChange={(v) => { setPage(1); setCatFilter(v); }}
                options={[{ value: 'company', label: '企业新闻' }, { value: 'industry', label: '行业资讯' }]} />
              <div style={{ flex: 1 }} />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>+ 写文章</Button>
            </div>
            <Table rowKey="id" columns={columns} dataSource={list} size="middle"
              pagination={{ total, current: page, pageSize: 10, showTotal: (t) => `共 ${t} 条`, onChange: setPage }} />
          </Card>
        </>
      ) : (
        /* 内联表单（替代弹窗）：短字段 2 列网格、长字段整行 */
        <Card
          title={editing ? `编辑文章 · ${editing.title}` : '写文章'}
          extra={<Space>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={save}>保存</Button>
          </Space>}
          style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}
        >
          <Form form={form} layout="vertical">
            {/* 短字段：2 列网格，一行放 2 个控件 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, rowGap: 0, alignItems: 'start' }}>
              <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item>
              <Form.Item name="category" label="分类" rules={[{ required: true }]}>
                <Select options={[{ value: 'company', label: '企业新闻' }, { value: 'industry', label: '行业资讯' }]} />
              </Form.Item>
              <Form.Item name="author" label="作者"><Input /></Form.Item>
              <Form.Item name="source" label="来源（转载标注）"><Input placeholder="如：转载自××家居网" /></Form.Item>
              <Form.Item name="publish_at" label="发布时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="expire_at" label="截止时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
            </div>
            {/* 封面 + 摘要 */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, alignItems: 'start' }}>
              <Form.Item label="封面图" name="cover_image" valuePropName="value">
                <UploadImage width={140} height={90} tip="点击上传" />
              </Form.Item>
              <Form.Item label="摘要" name="summary">
                <Input.TextArea rows={3} maxLength={500} showCount placeholder="文章摘要（列表页展示）" />
              </Form.Item>
            </div>
            {/* 小控件：发布 / 置顶 */}
            <div style={{ display: 'flex', gap: 32 }}>
              <Form.Item name="is_published" label="是否发布" valuePropName="checked"><Switch checkedChildren="发布" unCheckedChildren="草稿" /></Form.Item>
              <Form.Item name="is_top" label="置顶/推荐" valuePropName="checked"><Switch checkedChildren="置顶" unCheckedChildren="否" /></Form.Item>
            </div>
            {/* 长字段：整行展示 */}
            <Form.Item label="正文（富文本）" name="body"><RichText height={260} /></Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
}
