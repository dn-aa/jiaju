// ============================================================
// 【代码段功能】图片上传组件（PRD §7 通用约定 / UI/UX §4.3 Upload）
//   - 点击选择本地文件（隐藏 input），选中后预览并显示文件名/大小
//   - 上传到 /api/files/upload（kind=image），成功后回调 URL
//   - 支持"已有图片时点击直接替换"（图片管理页复用）
// ============================================================
import { useState } from 'react';
import { Upload, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { http } from '../services/http';

interface Props {
  value?: string | null;                 // 当前图片 URL（受控）
  onChange?: (url: string) => void;      // 上传成功回调
  width?: number;                        // 预览宽（默认 100）
  height?: number;                       // 预览高（默认 100）
  tip?: string;                          // 提示文案
}

export default function UploadImage({ value, onChange, width = 100, height = 100, tip }: Props) {
  const [uploading, setUploading] = useState(false);

  // 上传前校验类型/大小（与服务端白名单一致：jpg/png/webp ≤2MB）
  const beforeUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      message.error('仅支持 JPG/PNG/WebP 图片');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('图片需 ≤2MB');
      return Upload.LIST_IGNORE;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'image');
      const res = await http.post('/files/upload', form).then((r) => r.data);
      onChange?.(res.data.url);          // 回传图片 URL 给表单
      message.success('上传成功');
    } catch {
      /* 错误已由拦截器提示 */
    } finally {
      setUploading(false);
    }
    return Upload.LIST_IGNORE;           // 阻止 antd 默认上传行为
  };

  return (
    <div>
      <Upload accept="image/*" showUploadList={false} beforeUpload={beforeUpload}>
        {/* 已有图片 → 显示图片且可点击替换；无图 → 显示虚线加号框 */}
        <div
          style={{
            width, height,
            border: value ? 'none' : '1px dashed #d9d9d9',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', cursor: 'pointer', background: '#FAFAF9',
          }}
        >
          {value ? (
            <img src={value} alt="预览" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center', color: '#78716C' }}>
              <PlusOutlined style={{ fontSize: 20 }} />
              <div style={{ fontSize: 12, marginTop: 4 }}>{uploading ? '上传中...' : '点击上传'}</div>
            </div>
          )}
        </div>
      </Upload>
      {tip && <div style={{ fontSize: 12, color: '#a8a29e', marginTop: 4 }}>{tip}</div>}
    </div>
  );
}
