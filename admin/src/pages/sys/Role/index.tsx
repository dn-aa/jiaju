// ============================================================
// 【代码段功能】角色管理（BR-10.2）
//   角色列表（权限数/创建时间）→ 新增/编辑 Modal
//   ：名称 + 权限树勾选（按模块分组，与后端权限编码一致），保存后即时生效
// ============================================================
import { useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag, Tree, message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '../../../components/PageHeader';
import { getData, http, postData, putData } from '../../../services/http';

interface Role { id: number; name: string; permissions: string[]; created_date?: string | null }

// 权限树定义（对齐开发技术文档 v1.4 附录 E 权限编码；前端维护，与后端一致）
const PERM_TREE = [
  {
    title: '工作台', key: 'dashboard',
    children: [{ title: '查看数据看板', key: 'dashboard:view' }],
  },
  {
    title: '内容管理', key: 'content',
    children: [
      { title: '产品管理（查看/编辑）', key: 'product:view' }, { title: '产品编辑操作', key: 'product:edit' },
      { title: '案例管理（查看/编辑）', key: 'case:view' }, { title: '案例编辑操作', key: 'case:edit' },
      { title: '新闻管理（查看/编辑）', key: 'article:view' }, { title: '新闻编辑操作', key: 'article:edit' },
      { title: '职位管理（查看/编辑）', key: 'job:view' }, { title: '职位编辑操作', key: 'job:edit' },
      { title: '页面/Banner 维护', key: 'content:view' }, { title: '页面/Banner 编辑', key: 'content:edit' },
    ],
  },
  {
    title: '线索管理', key: 'leads',
    children: [
      { title: '在线预约处理', key: 'leads:appointment' },
      { title: '留言咨询处理', key: 'leads:message' },
      { title: '简历投递处理', key: 'leads:application' },
    ],
  },
  {
    title: '系统管理', key: 'sys',
    children: [
      { title: '账号管理', key: 'sys:account' },
      { title: '角色管理', key: 'sys:role' },
      { title: '操作日志', key: 'sys:log' },
    ],
  },
];

export default function RoleManage() {
  const [list, setList] = useState<Role[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [form] = Form.useForm();

  const load = async () => { setList(await getData<Role[]>('/sys/roles')); };
  useEffect(() => { load(); }, []);

  // 打开新增/编辑：编辑回填名称与权限勾选（权限树数据源）
  const openModal = (item?: Role) => {
    setEditing(item || null);
    form.resetFields();
    if (item) {
      form.setFieldsValue(item);
      setCheckedKeys(item.permissions.includes('*') ? ['*'] : item.permissions);
    } else { setCheckedKeys([]); }
    setModalOpen(true);
  };

  // 保存：勾选的权限编码集合整体提交（超管角色锁定为 ["*"]）
  const save = async () => {
    const v = await form.validateFields();
    const perms = editing?.permissions.includes('*') ? ['*'] : checkedKeys;
    if (editing) await putData(`/sys/roles/${editing.id}`, { name: v.name, permissions: perms });
    else await postData('/sys/roles', { name: v.name, permissions: perms });
    message.success('保存成功'); setModalOpen(false); load();
  };

  const columns: ColumnsType<Role> = [
    { title: '角色名称', dataIndex: 'name' },
    { title: '权限项', dataIndex: 'permissions', render: (p: string[]) =>
      p.includes('*') ? <Tag color="gold">全部权限（超管）</Tag> : <Tag>{p.length} 项</Tag> },
    { title: '创建时间', dataIndex: 'created_date', width: 160, render: (v) => (v ? v.replace('T', ' ').slice(0, 16) : '—') },
    { title: '操作', width: 140, render: (_, r) => (
      <Space size={10}>
        <a style={{ color: '#B0894F' }} onClick={() => openModal(r)}>编辑</a>
        {/* 内置超管角色不可删除（保护角色完整性） */}
        {r.permissions.includes('*') ? <span style={{ color: '#d9d9d9' }}>内置不可删</span> : (
          <Popconfirm title="确认删除该角色？（关联账号将失去该角色）" onConfirm={async () => {
            try { await http.delete(`/sys/roles/${r.id}`); message.success('已删除'); load(); }
            catch { /* 拦截器提示 */ }
          }}>
            <a style={{ color: '#FF4D4F' }}>删除</a>
          </Popconfirm>
        )}
      </Space>
    ) },
  ];

  return (
    <div>
      <PageHeader title="角色管理" />
      <Card style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}>
        <div style={{ display: 'flex', marginBottom: 16 }}>
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>+ 新增角色</Button>
        </div>
        <Table rowKey="id" columns={columns} dataSource={list} pagination={false} size="middle" />
      </Card>

      {/* 角色编辑 Modal：权限树勾选（BR-10.2） */}
      <Modal open={modalOpen} title={editing ? `编辑角色 · ${editing.name}` : '新增角色'} width={520}
        onCancel={() => setModalOpen(false)} onOk={save} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="如：渠道运营" />
          </Form.Item>
        </Form>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#1C1917' }}>权限配置（勾选后保存即时生效）</div>
        {editing?.permissions.includes('*') ? (
          <div style={{ color: '#B0894F', padding: 12, background: '#F5F3EF', borderRadius: 8 }}>
            内置超级管理员拥有全部权限（"*"），不可调整。
          </div>
        ) : (
          <Tree
            checkable defaultExpandAll
            treeData={PERM_TREE}
            checkedKeys={checkedKeys}
            onCheck={(keys) => setCheckedKeys((keys as string[]).filter((k) => !PERM_TREE.some((p) => p.key === k)))}
          />
        )}
      </Modal>
    </div>
  );
}
