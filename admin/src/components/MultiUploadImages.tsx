// ============================================================
// 【代码段功能】多图上传组件（Banner 轮播多图，阶段 7）
//   - value: string[]（受控，图片 URL 列表）
//   - onChange: 返回新列表（支持追加 / 删除 / 单张替换）
//   - 复用 /api/files/upload（kind=image），校验与 UploadImage 一致
// ============================================================
import { Upload, message, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { http } from '../services/http';

interface Props {
  value?: string[] | null;
  onChange?: (urls: string[]) => void;
  width?: number;
  height?: number;
  max?: number;          // 最多张数（默认 5）
  tip?: string;
}

export default function MultiUploadImages({ value, onChange, width = 140, height = 84, max = 5, tip }: Props) {
  const urls = Array.isArray(value) ? value : [];

  // 上传单张 → 追加到列表末尾
  const beforeUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      message.error('仅支持 JPG/PNG/WebP 图片');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('图片需 ≤2MB');
      return Upload.LIST_IGNORE;
    }
    if (urls.length >= max) {
      message.warning(`最多上传 ${max} 张`);
      return Upload.LIST_IGNORE;
    }
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'image');
      const res = await http.post('/files/upload', form).then((r) => r.data);
      onChange?.([...urls, res.data.url]);
      message.success('上传成功');
    } catch {
      /* 错误已由拦截器提示 */
    }
    return Upload.LIST_IGNORE;
  };

  // 删除指定下标图片
  const remove = (idx: number) => {
    onChange?.(urls.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {urls.map((u, i) => (
          <div key={u + i} style={{ position: 'relative', width, height, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* 右上角操作：预览 / 删除 */}
            <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
              <a onClick={() => Modal.info({ title: '图片预览', content: <img src={u} alt="" style={{ maxWidth: 480, maxHeight: 320, objectFit: 'contain' }} /> })}>
                <EyeOutlined style={{ color: '#fff', background: 'rgba(0,0,0,.45)', borderRadius: 4, padding: 3 }} />
              </a>
              <a onClick={() => remove(i)}>
                <DeleteOutlined style={{ color: '#fff', background: 'rgba(220,38,38,.8)', borderRadius: 4, padding: 3 }} />
              </a>
            </div>
            <span style={{ position: 'absolute', left: 4, bottom: 4, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 11, padding: '1px 6px', borderRadius: 4 }}>
              第 {i + 1} 张
            </span>
          </div>
        ))}
        {/* 追加上传框 */}
        {urls.length < max && (
          <Upload accept="image/*" showUploadList={false} beforeUpload={beforeUpload}>
            <div style={{
              width, height, border: '1px dashed #d9d9d9', borderRadius: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: '#FAFAF9', color: '#78716C', fontSize: 12, gap: 4,
            }}>
              <PlusOutlined style={{ fontSize: 18 }} />
              添加图片
            </div>
          </Upload>
        )}
      </div>
      {tip && <div style={{ marginTop: 6, fontSize: 12, color: '#a8a29e' }}>{tip}</div>}
    </div>
  );
}
