// ============================================================
// 【代码段功能】账号管理（BR-10.1）
//   账号列表（角色/状态/最近登录）→ 新增/编辑 Modal（回填）
//   + 启用/禁用 + 重置密码（自定义或随机）+ 删除（admin 保护）
// ============================================================
import { useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, Popconfirm, Radio, Select,
  Space, Table, Tag, message,
} from 'antd';
import { PlusOutlined, KeyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '../../../components/PageHeader';
import { getData, http, postData, putData } from '../../../services/http';

interface Account {
  id: number; username: string; real_name?: string | null; nickname?: string | null;
  phone?: string | null; email?: string | null; gender?: number; position?: string | null;
  role_id?: number | null; role_name?: string | null; is_activate: number;
  last_login_at?: string | null;
}
interface Role { id: number; name: string; permissions: string[] }

export default function AccountManage() {
  const [list, setList] = useState<Account[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    const [d, r] = await Promise.all([
      getData<{ list: Account[]; pagination: { total: number } }>(
        '/sys/accounts', { page, page_size: 10, keyword: keyword || undefined }),
      getData<Role[]>('/sys/roles'),
    ]);
    setList(d.list); setTotal(d.pagination.total); setRoles(r);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, keyword]);

  // 打开新增/编辑 Modal：编辑回填（密码留空不改，走重置密码）
  const openModal = (item?: Account) => {
    setEditing(item || null);
    form.resetFields();
    if (item) form.setFieldsValue(item);
    else form.setFieldsValue({ gender: 0 });
    setModalOpen(true);
  };

  // 保存：创建必填密码；编辑密码留空不修改
  const save = async () => {
    const v = await form.validateFields();
    if (editing) await putData(`/sys/accounts/${editing.id}`, v);
    else {
      if (!v.password) { message.warning('请设置初始密码'); return; }
      await postData('/sys/accounts', v);
    }
    message.success('保存成功'); setModalOpen(false); load();
  };

  // 重置密码：自定义或随机（随机密码弹窗展示）
  const resetPwd = async (item: Account) => {
    const r = await postData<{ new_password: string }>(`/sys/accounts/${item.id}/reset-pwd`, { new_password: null });
    message.success(`已重置，新密码：${r.new_password}（请及时转交）`, 8);
  };

  const columns: ColumnsType<Account> = [
    { title: '登录名', dataIndex: 'username', width: 130 },
    { title: '姓名', dataIndex: 'real_name', width: 110, render: (v, r) => v || r.nickname || '—' },
    { title: '角色', dataIndex: 'role_name', width: 120, render: (v) => <Tag color="gold">{v || '—'}</Tag> },
    { title: '手机号', dataIndex: 'phone', width: 130, render: (v) => v || '—' },
    { title: '最近登录', dataIndex: 'last_login_at', width: 150, render: (v) => (v ? v.replace('T', ' ').slice(0, 16) : '—') },
    { title: '状态', dataIndex: 'is_activate', width: 90, render: (v) => (v === 1 ? <Tag color="success">启用</Tag> : <Tag color="error">禁用</Tag>) },
    { title: '操作', width: 220, render: (_, r) => (
      <Space size={10}>
        <a style={{ color: '#B0894F' }} onClick={() => openModal(r)}>编辑</a>
        <a style={{ color: '#97763F' }} onClick={() => resetPwd(r)}><KeyOutlined /> 重置密码</a>
        {/* 启用/禁用：禁用后该账号登录被拦截 */}
        <a style={{ color: r.is_activate === 1 ? '#FF4D4F' : '#52C41A' }}
          onClick={async () => {
            await putData(`/sys/accounts/${r.id}/status`, { active: r.is_activate !== 1 });
            message.success('状态已更新'); load();
          }}>{r.is_activate === 1 ? '禁用' : '启用'}</a>
        {/* 删除：内置 admin 与当前登录账号由后端保护 */}
        <Popconfirm title="确认删除该账号？" onConfirm={async () => { await http.delete(`/sys/accounts/${r.id}`); message.success('已删除'); load(); }}>
          <a style={{ color: '#FF4D4F' }}>删除</a>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <div>
      {!modalOpen ? (
        <>
          <PageHeader title="账号管理" />
          <Card style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}>
            {/* 工具栏：搜索 + 新增 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <Input.Search placeholder="搜索用户名/姓名/手机号" allowClear style={{ width: 260 }}
                onSearch={(v) => { setPage(1); setKeyword(v); }} />
              <div style={{ flex: 1 }} />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>+ 新增账号</Button>
            </div>
            <Table rowKey="id" columns={columns} dataSource={list} size="middle"
              pagination={{ total, current: page, pageSize: 10, showTotal: (t) => `共 ${t} 条`, onChange: setPage }} />
          </Card>
        </>
      ) : (
        /* 内联表单（替代弹窗）：短字段 2 列网格、长字段整行 */
        <Card
          title={editing ? `编辑账号 · ${editing.username}` : '新增账号'}
          extra={<Space>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={save}>保存</Button>
          </Space>}
          style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}
        >
          <Form form={form} layout="vertical">
            {/* 短字段：2 列网格，一行放 2 个控件 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, rowGap: 0, alignItems: 'start' }}>
              <Form.Item name="username" label="登录名" rules={[{ required: true, message: '请输入登录名' }]}>
                <Input disabled={!!editing} placeholder="创建后不可修改" />
              </Form.Item>
              <Form.Item name="role_id" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
                <Select options={roles.map((r) => ({ value: r.id, label: r.name }))} placeholder="选择角色" />
              </Form.Item>
              <Form.Item name="real_name" label="姓名"><Input /></Form.Item>
              <Form.Item name="nickname" label="昵称"><Input /></Form.Item>
              <Form.Item name="phone" label="手机号"><Input /></Form.Item>
              <Form.Item name="email" label="邮箱"><Input /></Form.Item>
              <Form.Item name="gender" label="性别">
                <Radio.Group options={[{ value: 0, label: '保密' }, { value: 1, label: '男' }, { value: 2, label: '女' }]} />
              </Form.Item>
              <Form.Item name="position" label="职位"><Input /></Form.Item>
            </div>
            {/* 初始密码：编辑时留空不修改（走重置密码接口） */}
            <Form.Item name="password" label={editing ? '初始密码（留空不修改）' : '初始密码'}
              rules={editing ? [] : [{ required: true, min: 6, message: '至少 6 位' }]}>
              <Input.Password placeholder={editing ? '不修改请留空' : '至少 6 位'} />
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
}
