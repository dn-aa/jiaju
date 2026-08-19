// ============================================================
// 【代码段功能】个人中心（BR-1.4）
//   - 修改密码：校验原密码，新密码 ≥6 位且两次一致
//   - 上传头像：点击选择本地文件（图片 ≤2MB），FileReader 预览
// ============================================================
import { useState } from 'react';
import { Avatar, Button, Form, Input, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { http } from '../../services/http';
import { useAuthStore } from '../../store/auth';

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [submitting, setSubmitting] = useState(false);

  // 修改密码：旧密码 + 新密码（≥6 位） + 确认一致
  const onChangePwd = async (v: { old_password: string; new_password: string }) => {
    setSubmitting(true);
    try {
      await http.post('/auth/change-password', {
        old_password: v.old_password,
        new_password: v.new_password,
      });
      message.success('密码修改成功，下次登录请使用新密码');
    } finally {
      setSubmitting(false);
    }
  };

  // 头像上传：校验图片类型/大小（≤2MB），成功后回写并刷新本地用户
  const handleAvatarUpload = async (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      message.error('仅支持 JPG/PNG/GIF/WebP 图片');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('头像图片需 ≤2MB');
      return false;
    }
    // FileReader 本地预览
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);

    const form = new FormData();
    form.append('file', file);
    try {
      const res = await http.post('/files/avatar', form).then((r) => r.data);
      setUser({ ...user!, avatar: res.data.url }); // 回写头像 URL 到全局状态
      message.success('头像已更新');
    } catch {
      /* 错误已由拦截器提示 */
    }
    return false; // 阻止 antd 默认上传
  };

  return (
    <div>
      {/* 头像区：64px 圆形 + 点击上传 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Avatar size={64} src={avatar || undefined} style={{ background: '#1C1917', fontSize: 24 }}>
          {(user?.nickname || user?.real_name || 'U').slice(0, 1)}
        </Avatar>
        <div style={{ marginTop: 10 }}>
          <Upload accept="image/*" showUploadList={false} beforeUpload={handleAvatarUpload}>
            <Button size="small" icon={<UploadOutlined />} style={{ borderColor: '#B0894F', color: '#97763F' }}>
              上传头像（≤2MB）
            </Button>
          </Upload>
        </div>
      </div>

      {/* 修改密码表单：新密码 ≥6 位且与确认一致 */}
      <Form layout="vertical" onFinish={onChangePwd} size="middle">
        <Form.Item label="原密码" name="old_password" rules={[{ required: true, message: '请输入原密码' }]}>
          <Input.Password placeholder="请输入原密码" />
        </Form.Item>
        <Form.Item label="新密码" name="new_password"
          rules={[{ required: true, min: 6, message: '新密码至少 6 位' }]}>
          <Input.Password placeholder="至少 6 位" />
        </Form.Item>
        <Form.Item label="确认新密码" name="confirm" dependencies={['new_password']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                // 两次输入不一致时给出提示
                if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                return Promise.reject(new Error('两次输入的新密码不一致'));
              },
            }),
          ]}>
          <Input.Password placeholder="再次输入新密码" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={submitting} style={{ height: 36 }}>
          确认修改
        </Button>
      </Form>
    </div>
  );
}
