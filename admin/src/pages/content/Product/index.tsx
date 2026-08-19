// ============================================================
// 【代码段功能】产品管理（BR-2）—— Tabs：产品 / 空间分类 / 图片管理
//   产品：CRUD + 发布状态（上架/下架/草稿）+ 置顶 + 排序 + 编辑回填 Modal
//   空间分类：CRUD + 启用/禁用（有关联产品删除被后端拦截）
//   图片管理：多图上传网格（点击上传/替换，BR-2.3）
// ============================================================
import { useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch,
  Table, Tabs, Tag, Upload, message, Popconfirm,
} from 'antd';
import { PlusOutlined, CopyOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '../../../components/PageHeader';
import StatusTag from '../../../components/StatusTag';
import UploadImage from '../../../components/UploadImage';
import RichText from '../../../components/RichText';
import { cmsApi } from '../../../services/cms';
import { http } from '../../../services/http';

// ---------- 类型定义（与后端 Out Schema 对齐） ----------
interface Category { id: number; name: string; sort: number; is_activate: number }
interface Product {
  id: number; category_id: number; series: string; product_code: string; name: string;
  description?: string | null; spec_params?: Record<string, string> | null;
  cover_image?: string | null; gallery?: string[] | null;
  status: 'draft' | 'off' | 'on'; is_top: number; sort: number; is_activate: number;
}

const productApi = cmsApi<Product>('products');
const categoryApi = cmsApi<Category>('categories');

export default function ProductManage() {
  const [activeTab, setActiveTab] = useState('products');
  return (
    <div>
      <PageHeader title="产品管理" />
      <Card style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          { key: 'products', label: '产品', children: <ProductTab /> },
          { key: 'categories', label: '空间分类', children: <CategoryTab /> },
          { key: 'images', label: '图片管理', children: <ImageTab /> },
        ]} />
      </Card>
    </div>
  );
}

// ==================== 产品列表 ====================
function ProductTab() {
  const [list, setList] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [cats, setCats] = useState<Category[]>([]);
  const [caseOptions, setCaseOptions] = useState<{ value: number; label: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form] = Form.useForm();

  // 加载产品列表 + 空间分类 + 案例（供关联案例多选下拉，BR-2 关联产品）
  const load = async () => {
    const [p, c, cs] = await Promise.all([
      productApi.list({ page, page_size: 10, keyword: keyword || undefined }),
      categoryApi.list({ page: 1, page_size: 50 }),
      cmsApi<{ id: number; title: string }>('cases').list({ page: 1, page_size: 100 }),
    ]);
    setList(p.list); setTotal(p.pagination.total);
    setCats(c.list);
    setCaseOptions(cs.list.map((x) => ({ value: x.id, label: x.title })));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, keyword]);

  // 打开新增/编辑 Modal：编辑时用 detail 回填表单（PRD §7 通用约定）
  const openModal = async (item?: Product) => {
    if (item) {
      const detail = await productApi.get(item.id);   // 编辑回填数据源
      setEditing(detail);
      form.setFieldsValue({
        ...detail,
        spec_params: Object.entries(detail.spec_params || {}).map(([k, v]) => ({ k, v })),
        related_case_ids: (detail as unknown as { related_case_ids?: number[] }).related_case_ids || [],
      });
    } else {
      setEditing(null);
      form.resetFields();
      form.setFieldsValue({ status: 'draft', is_top: 0, sort: 0 });
    }
    setModalOpen(true);
  };

  // 保存：新增走 POST（即时上列表），编辑走 PUT（回填保存）
  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
      spec_params: Object.fromEntries((v.spec_params || []).map((r: { k: string; v: string }) => [r.k, r.v])),
      is_top: v.is_top ? 1 : 0,
      related_case_ids: v.related_case_ids || [],   // 关联案例（case_products 同步维护）
    };
    if (editing) await productApi.update(editing.id, payload);
    else await productApi.create(payload);
    message.success(editing ? '保存成功' : '新增成功');
    setModalOpen(false);
    load();
  };

  // 行内状态切换：发布状态（draft/off/on）
  const changeStatus = async (id: number, status: 'on' | 'off') => {
    await productApi.setStatus(id, status);
    load();
  };

  const columns: ColumnsType<Product> = [
    { title: '封面', dataIndex: 'cover_image', width: 80, render: (v) =>
      v ? <img src={v} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} alt="" /> : <span style={{ color: '#d9d9d9' }}>无图</span> },
    { title: '产品名称', dataIndex: 'name', ellipsis: true },
    { title: '空间分类', dataIndex: 'category_id', width: 90, render: (id) => cats.find((c) => c.id === id)?.name || id },
    { title: '系列', dataIndex: 'series', width: 100 },
    { title: '产品编号', dataIndex: 'product_code', width: 120 },
    { title: '置顶', dataIndex: 'is_top', width: 70, render: (v) => (v ? <Tag color="gold">置顶</Tag> : <Tag>—</Tag>) },
    { title: '排序', dataIndex: 'sort', width: 70 },
    { title: '发布状态', dataIndex: 'status', width: 120, render: (s, r) => <StatusTag status={s} onChange={(next) => changeStatus(r.id, next)} /> },
    { title: '操作', width: 140, render: (_, r) => (
      <Space size={10}>
        <a style={{ color: '#B0894F' }} onClick={() => openModal(r)}>编辑</a>
        <Popconfirm title="确认删除该产品？此操作将记录日志" onConfirm={async () => { await productApi.remove(r.id); message.success('已删除'); load(); }}>
          <a style={{ color: '#FF4D4F' }}>删除</a>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <>
      {/* 工具栏：搜索 + 新增（新增后即时上列表） */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input.Search placeholder="搜索名称/编号/系列" allowClear style={{ width: 260 }}
          onSearch={(v) => { setPage(1); setKeyword(v); }} />
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>+ 新增产品</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={list} size="middle"
        pagination={{ total, current: page, pageSize: 10, showTotal: (t) => `共 ${t} 条`, onChange: setPage }} />

      {/* 新增/编辑 Modal：带数据回填（标题含对象名） */}
      <Modal open={modalOpen} title={editing ? `编辑产品 · ${editing.name}` : '新增产品'}
        width={720} onCancel={() => setModalOpen(false)} onOk={save} destroyOnClose>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="name" label="产品名称" rules={[{ required: true, message: '请输入产品名称' }]}>
              <Input placeholder="如：云隐布艺沙发" />
            </Form.Item>
            <Form.Item name="product_code" label="产品编号" rules={[{ required: true, message: '请输入产品编号' }]}>
              <Input placeholder="唯一编号，如 TP-S-001" />
            </Form.Item>
            <Form.Item name="category_id" label="空间分类" rules={[{ required: true }]}>
              <Select options={cats.map((c) => ({ value: c.id, label: c.name }))} placeholder="选择空间分类" />
            </Form.Item>
            <Form.Item name="series" label="系列" rules={[{ required: true, message: '请输入系列' }]}>
              <Input placeholder="如：胡桃木" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="sort" label="排序值"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="status" label="发布状态" rules={[{ required: true }]}>
              <Select options={[
                { value: 'on', label: '上架' }, { value: 'off', label: '下架' }, { value: 'draft', label: '草稿' },
              ]} />
            </Form.Item>
            <Form.Item name="is_top" label="置顶" valuePropName="checked">
              <Switch checkedChildren="置顶" unCheckedChildren="否" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item label="封面图片" name="cover_image" valuePropName="value">
              <UploadImage width={120} height={120} tip="点击上传/替换（JPG/PNG/WebP ≤2MB）" />
            </Form.Item>
            <Form.Item label="规格参数（键值对）">
              <Form.List name="spec_params">
                {(fields, { add, remove }) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fields.map((f) => (
                      <Space key={f.key} align="baseline">
                        <Form.Item name={[f.name, 'k']} noStyle><Input placeholder="参数名（如 材质）" style={{ width: 120 }} /></Form.Item>
                        <Form.Item name={[f.name, 'v']} noStyle><Input placeholder="参数值（如 棉麻布艺）" style={{ width: 150 }} /></Form.Item>
                        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(f.name)} />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add({ k: '', v: '' })} block>+ 添加参数</Button>
                  </div>
                )}
              </Form.List>
            </Form.Item>
          </div>
          {/* 关联案例（BR-2 关联产品；前台产品详情"案例应用"区块展示） */}
          <Form.Item name="related_case_ids" label="关联案例（可多选）">
            <Select mode="multiple" allowClear placeholder="选择该产品应用到的案例"
              options={caseOptions} optionFilterProp="label" />
          </Form.Item>
          <Form.Item label="产品描述（富文本）" name="description">
            <RichText height={200} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ==================== 空间分类（BR-2.1） ====================
function CategoryTab() {
  const [list, setList] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const load = async () => { setList((await categoryApi.list({ page: 1, page_size: 50 })).list); };
  useEffect(() => { load(); }, []);

  const openModal = (item?: Category) => {
    setEditing(item || null);
    form.resetFields();
    if (item) form.setFieldsValue(item);
    setModalOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    if (editing) await categoryApi.update(editing.id, v);
    else await categoryApi.create(v);
    message.success('保存成功'); setModalOpen(false); load();
  };

  const columns: ColumnsType<Category> = [
    { title: '分类名称', dataIndex: 'name' },
    { title: '排序', dataIndex: 'sort', width: 100 },
    { title: '状态', dataIndex: 'is_activate', width: 120, render: (v, r) =>
      <StatusTag status={v === 1 ? 'on' : 'off'} onChange={async (next) => {
        await categoryApi.setStatus(r.id, next); load();
      }} /> },
    { title: '操作', width: 140, render: (_, r) => (
      <Space size={10}>
        <a style={{ color: '#B0894F' }} onClick={() => openModal(r)}>编辑</a>
        <Popconfirm title="确认删除？有关联产品时后端会拦截" onConfirm={async () => {
          try { await categoryApi.remove(r.id); message.success('已删除'); load(); }
          catch { /* 拦截错误由拦截器提示 */ }
        }}>
          <a style={{ color: '#FF4D4F' }}>删除</a>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <>
      <div style={{ display: 'flex', marginBottom: 16 }}>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>+ 新增分类</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={list} pagination={false} size="middle" />
      <Modal open={modalOpen} title={editing ? '编辑分类' : '新增分类'} onCancel={() => setModalOpen(false)}
        onOk={save} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="如：客厅 / 卧室 / 全屋" />
          </Form.Item>
          <Form.Item name="sort" label="排序值"><InputNumber style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ==================== 图片管理（BR-2.3，网格上传/替换） ====================
function ImageTab() {
  const [images, setImages] = useState<string[]>([]);

  // 点击选择本地文件上传，成功后加入网格
  const uploadAndAdd = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { message.error('仅支持 JPG/PNG/WebP'); return false; }
    if (file.size > 2 * 1024 * 1024) { message.error('图片需 ≤2MB'); return false; }
    const form = new FormData();
    form.append('file', file); form.append('kind', 'image');
    const res = await http.post('/files/upload', form).then((r) => r.data);
    setImages((prev) => [...prev, res.data.url]);
    message.success('上传成功');
    return false;
  };

  return (
    <div>
      <div style={{ marginBottom: 12, color: '#78716C', fontSize: 13 }}>
        上传图片统一存入服务端（JPG/PNG/WebP ≤2MB）。产品图集请在「产品」表单中引用图片 URL。
      </div>
      {/* 网格：已上传图片 + 上传入口 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12 }}>
        {images.map((url) => (
          <div key={url} style={{ position: 'relative', border: '1px solid #E7E5E4', borderRadius: 8, overflow: 'hidden' }}>
            <img src={url} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: '#FAFAF9' }}>
              {/* 复制 URL 按钮：便于粘贴到产品图集 */}
              <Button size="small" type="text" icon={<CopyOutlined />} title="复制URL" onClick={() => { navigator.clipboard?.writeText(url); message.success('URL 已复制'); }} />
              <Button size="small" type="text" danger icon={<DeleteOutlined />} title="删除" onClick={() => setImages((p) => p.filter((x) => x !== url))} />
            </div>
          </div>
        ))}
        {/* 上传入口：点击选择本地文件 */}
        <Upload accept="image/*" showUploadList={false} beforeUpload={uploadAndAdd}>
          <div style={{ height: 116, border: '1px dashed #d9d9d9', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#78716C', cursor: 'pointer' }}>
            <UploadOutlined style={{ fontSize: 22 }} />
            <div style={{ fontSize: 12, marginTop: 6 }}>点击上传图片</div>
          </div>
        </Upload>
      </div>
    </div>
  );
}
