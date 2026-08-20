// ============================================================
// 【代码段功能】页面内容 / Banner 管理（BR-6）—— Tabs：Banner / 页面内容
//   Banner：CRUD + 上线/下线（is_activate）+ 生效/失效时间
//   页面内容：关于TP/发展历程/品牌介绍（富文本）+ 联系我们（联系信息+预约时段，单行配置）
// ============================================================
import { useEffect, useState } from 'react';
import {
  Button, Card, DatePicker, Form, Input, Space, Table, Popconfirm, message, Divider, Tabs,
} from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import PageHeader from '../../../components/PageHeader';
import StatusTag from '../../../components/StatusTag';
import UploadImage from '../../../components/UploadImage';
import MultiUploadImages from '../../../components/MultiUploadImages';
import RichText from '../../../components/RichText';
import { cmsApi } from '../../../services/cms';
import { getData, putData } from '../../../services/http';

interface Banner { id: number; image: string; images?: string[] | null; title?: string | null; subtitle?: string | null; link?: string | null; sort: number; online_at?: string | null; offline_at?: string | null; is_activate: number }
interface PageItem { id: number; key: string; title?: string | null; content?: string | null; is_activate?: number }
interface SiteConfig { address?: string; phone?: string; email?: string; hours?: string; map_coord?: string; appointment_slots?: string[] }

const bannerApi = cmsApi<Banner>('banners');
const pageApi = cmsApi<PageItem>('pages');

export default function PageManage() {
  return (
    <div>
      <PageHeader title="页面内容 · Banner" />
      <Card style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}>
        <Tabs items={[
          { key: 'banner', label: 'Banner 管理', children: <BannerTab /> },
          { key: 'page', label: '页面内容', children: <PageContentTab /> },
        ]} />
      </Card>
    </div>
  );
}

// ==================== Banner 管理（BR-6.1） ====================
function BannerTab() {
  const [list, setList] = useState<Banner[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form] = Form.useForm();

  const load = async () => { setList((await bannerApi.list({ page: 1, page_size: 50, sort: 'sort,asc' })).list); };
  useEffect(() => { load(); }, []);

  const openModal = async (item?: Banner) => {
    if (item) {
      const d = await bannerApi.get(item.id);
      setEditing(d);
      form.setFieldsValue({ ...d, online_at: d.online_at ? dayjs(d.online_at) : null, offline_at: d.offline_at ? dayjs(d.offline_at) : null });
    } else { setEditing(null); form.resetFields(); form.setFieldsValue({ sort: 0 }); }
    setModalOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      ...v,
      online_at: v.online_at ? v.online_at.toISOString() : null,
      offline_at: v.offline_at ? v.offline_at.toISOString() : null,
    };
    if (editing) await bannerApi.update(editing.id, payload); else await bannerApi.create(payload);
    message.success('保存成功'); setModalOpen(false); load();
  };

  const columns: ColumnsType<Banner> = [
    { title: '图片', dataIndex: 'image', width: 120, render: (v) => <img src={v} style={{ width: 100, height: 44, objectFit: 'cover', borderRadius: 6 }} alt="" /> },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '副标题', dataIndex: 'subtitle', ellipsis: true },
    { title: '排序', dataIndex: 'sort', width: 70 },
    { title: '生效/失效', width: 190, render: (_, r) => (
      <span style={{ fontSize: 12, color: '#78716C' }}>
        {r.online_at ? dayjs(r.online_at).format('MM-DD HH:mm') : '—'} ~ {r.offline_at ? dayjs(r.offline_at).format('MM-DD HH:mm') : '—'}
      </span>
    ) },
    { title: '状态', dataIndex: 'is_activate', width: 110, render: (v, r) =>
      <StatusTag status={v === 1 ? 'on' : 'off'} titles={{ on: '上线', off: '下线' }}
        onChange={async (next) => { await bannerApi.setStatus(r.id, next); load(); }} /> },
    { title: '操作', width: 130, render: (_, r) => (
      <Space size={10}>
        <a style={{ color: '#B0894F' }} onClick={() => openModal(r)}>编辑</a>
        <Popconfirm title="确认删除该 Banner？" onConfirm={async () => { await bannerApi.remove(r.id); message.success('已删除'); load(); }}>
          <a style={{ color: '#FF4D4F' }}>删除</a>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <div>
      {!modalOpen ? (
        <>
          <div style={{ display: 'flex', marginBottom: 16 }}>
            <div style={{ flex: 1 }} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>+ 新增 Banner</Button>
          </div>
          <Table rowKey="id" columns={columns} dataSource={list} pagination={false} size="middle" />
        </>
      ) : (
        /* 内联表单（替代弹窗）：短字段网格、长字段整行 */
        <Card
          title={editing ? '编辑 Banner' : '新增 Banner'}
          extra={<Space>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={save}>保存</Button>
          </Space>}
          style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}
        >
          <Form form={form} layout="vertical">
            {/* 封面 + 标题/副标题 */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, alignItems: 'start' }}>
              <Form.Item label="主图/封面" name="image" rules={[{ required: true, message: '请上传图片' }]} valuePropName="value">
                <UploadImage width={140} height={70} tip="点击上传" />
              </Form.Item>
              <div>
                <Form.Item name="title" label="标题"><Input /></Form.Item>
                <Form.Item name="subtitle" label="副标题"><Input /></Form.Item>
              </div>
            </div>
            {/* 轮播多图：新增 Banner 可插入多张图片（首页按序轮播展示） */}
            <Form.Item name="images" label="轮播图集（多张）" valuePropName="value" initialValue={[]}>
              <MultiUploadImages max={5} tip="可上传多张图片，首页将按此顺序轮播展示；不填时使用上方主图" />
            </Form.Item>
            {/* 短字段：3 列一行 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', columnGap: 16, rowGap: 0, alignItems: 'start' }}>
              <Form.Item name="link" label="跳转链接"><Input placeholder="如 /products" /></Form.Item>
              <Form.Item name="online_at" label="生效时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="offline_at" label="失效时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
            </div>
            <Form.Item name="sort" label="排序值"><Input /></Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
}

// ==================== 页面内容（BR-6.2） ====================
function PageContentTab() {
  const [pages, setPages] = useState<Record<string, PageItem>>({});
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({});
  const [contactForm] = Form.useForm();

  // 加载 4 个页面内容 + 联系信息配置（与前台同源）
  const load = async () => {
    const keys = ['about', 'history', 'brand', 'contact'];
    const list = (await pageApi.list({ page: 1, page_size: 50 })).list;
    const map: Record<string, PageItem> = {};
    keys.forEach((k) => {
      const found = list.find((p) => p.key === k);
      map[k] = found || { id: 0, key: k, title: '', content: '' };
    });
    setPages(map);
    try { setSiteConfig(await getData<SiteConfig>('/cms/site-config')); } catch { /* 无配置时忽略 */ }
  };
  useEffect(() => { load(); }, []);

  // 保存页面内容（key 唯一；更新时若 id=0 则新建）
  const savePage = async (key: string) => {
    const p = pages[key];
    if (!p.title && !p.content) { message.warning('内容为空，未保存'); return; }
    if (p.id) await pageApi.update(p.id, { key, title: p.title, content: p.content });
    else await pageApi.create({ key, title: p.title, content: p.content });
    message.success('页面内容已保存');
  };

  // 保存联系信息配置（site_config 单行）
  const saveContact = async () => {
    const v = await contactForm.validateFields();
    await putData('/cms/site-config', {
      ...v,
      appointment_slots: (v.appointment_slots || '').split('\n').map((s: string) => s.trim()).filter(Boolean),
    });
    message.success('联系信息已保存（前台「联系我们」页与页脚同步生效）');
  };

  const pageEditors: { key: string; label: string; desc: string }[] = [
    { key: 'about', label: '关于 TP', desc: '品牌概述、企业定位、核心价值观（富文本+图片）' },
    { key: 'history', label: '发展历程', desc: '时间轴条目（年份+事件），请以富文本维护' },
    { key: 'brand', label: '品牌介绍', desc: '品牌故事、品牌理念、荣誉资质（富文本+图片）' },
  ];

  return (
    <div>
      {/* 富文本页面（关于TP/发展历程/品牌介绍） */}
      {pageEditors.map((ed) => (
        <div key={ed.key} style={{ marginBottom: 24 }}>
          <Divider orientation="left" style={{ color: '#1C1917', fontWeight: 600 }}>{ed.label}</Divider>
          <div style={{ color: '#78716C', fontSize: 12, marginBottom: 8 }}>{ed.desc}</div>
          <Form.Item label="标题">
            <Input value={pages[ed.key]?.title || ''} placeholder="页面标题"
              onChange={(e) => setPages((p) => ({ ...p, [ed.key]: { ...p[ed.key], title: e.target.value } }))} />
          </Form.Item>
          <RichText height={200} value={pages[ed.key]?.content || ''}
            onChange={(html) => setPages((p) => ({ ...p, [ed.key]: { ...p[ed.key], content: html } }))} />
          <div style={{ marginTop: 8 }}>
            <Button icon={<SaveOutlined />} style={{ borderColor: '#B0894F', color: '#97763F' }}
              onClick={() => savePage(ed.key)}>保存{ed.label}</Button>
          </div>
        </div>
      ))}

      {/* 联系我们：联系信息 + 预约时段（BR-6.2 / FR-6.4.1 与前台同源） */}
      <Divider orientation="left" style={{ color: '#1C1917', fontWeight: 600 }}>联系我们</Divider>
      <Form form={contactForm} layout="vertical" initialValues={{
        ...siteConfig,
        appointment_slots: (siteConfig.appointment_slots || []).join('\n'),
      }} style={{ maxWidth: 520 }}>
        <Form.Item name="address" label="体验中心地址"><Input placeholder="如：上海市徐汇区××路 ×× 号" /></Form.Item>
        <Form.Item name="phone" label="客服电话"><Input placeholder="如：400-XXX-XXXX" /></Form.Item>
        <Form.Item name="email" label="联系邮箱"><Input placeholder="如：contact@tp-home.com" /></Form.Item>
        <Form.Item name="hours" label="营业时间"><Input placeholder="默认：周一至周日 10:00–20:00" /></Form.Item>
        <Form.Item name="map_coord" label="地图坐标"><Input placeholder="如：121.47,31.23（腾讯地图，开发期占位）" /></Form.Item>
        <Form.Item name="appointment_slots" label="预约时段选项（每行一个）">
          <Input.TextArea rows={3} placeholder={'上午（09:00–12:00）\n下午（13:00–18:00）\n晚间（18:00–20:00）'} />
        </Form.Item>
        <Button type="primary" icon={<SaveOutlined />} onClick={saveContact}>保存联系信息</Button>
      </Form>
    </div>
  );
}
