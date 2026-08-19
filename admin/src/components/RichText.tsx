// ============================================================
// 【代码段功能】富文本编辑器封装（wangEditor 5，已确认选型）
//   用于新闻正文/产品描述/页面内容/案例说明等 LONGTEXT HTML 字段
//   - 输出 HTML，后端落库前经 bleach 白名单清洗（XSS 防护）
//   - 受控组件：value(html) → onChange
// ============================================================
import { useMemo, useState } from 'react';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import { IDomEditor, IEditorConfig } from '@wangeditor/editor';
import '@wangeditor/editor/dist/css/style.css';

interface Props {
  value?: string | null;               // 当前 HTML 内容（受控）
  onChange?: (html: string) => void;   // 内容变化回调
  height?: number;                     // 编辑区高度（默认 300）
}

export default function RichText({ value, onChange, height = 300 }: Props) {
  // editor 实例状态：供 Toolbar 联动（wangEditor-for-react 标准用法）
  const [editor, setEditor] = useState<IDomEditor | null>(null);

  // 编辑器配置：占位文案 + 图片上传走统一接口（kind=image）
  const editorConfig: Partial<IEditorConfig> = useMemo(() => ({
    placeholder: '请输入内容...',
    MENU_CONF: {
      uploadImage: {
        // 自定义图片上传：复用 /api/files/upload（服务端白名单校验）
        async customUpload(file: File, insertFn: (url: string, alt: string, href: string) => void) {
          const form = new FormData();
          form.append('file', file);
          form.append('kind', 'image');
          try {
            const res = await fetch('/api/files/upload', {
              method: 'POST',
              body: form,
              headers: { Authorization: `Bearer ${localStorage.getItem('tp_admin_access_token') || ''}` },
            }).then((r) => r.json());
            if (res.code === 0) insertFn(res.data.url, '', '');
            else alert(res.message || '图片上传失败');
          } catch {
            alert('图片上传失败');
          }
        },
      },
    },
  }), []);

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}>
      {/* 工具栏：绑定当前 editor 实例，随内容联动 */}
      <Toolbar editor={editor} defaultConfig={{}} style={{ borderBottom: '1px solid #E7E5E4' }} />
      {/* 编辑区：受控 value + onCreated 记录实例 */}
      <Editor
        defaultConfig={editorConfig as IEditorConfig}
        value={value || ''}
        onCreated={setEditor}
        onChange={(ed) => onChange?.(ed.getHtml())}
        style={{ height, overflowY: 'hidden' }}
      />
    </div>
  );
}
