// ============================================================
// 【代码段功能】后台墨金主题（Ant Design 5 Token 覆盖）
//   依据 UI/UX 设计文档 v1.2 §2 / 开发技术文档 v1.4 §3.2：
//   - 取消 AntD 默认蓝(#1677ff)，主色/强调色替换为墨金体系
//   - 菜单选中态、布局侧栏/顶栏、焦点环统一墨金令牌
// ============================================================
import type { ThemeConfig } from 'antd';

export const antdGoldTheme: ThemeConfig = {
  token: {
    // 主操作色 = 墨色（主按钮、选中态），符合 PRD §4.1「取消 AntD 蓝」
    colorPrimary: '#1C1917',
    // 强调/链接/信息色 = 香槟金
    colorInfo: '#B0894F',
    colorLink: '#B0894F',
    colorLinkHover: '#97763F',
    // 圆角：后台 8px（UI/UX §2.3）
    borderRadius: 8,
    // 正文无衬线字体（UI/UX §2.2）
    fontFamily: "'Montserrat', 'Noto Sans SC', sans-serif",
    colorBgLayout: '#FAFAF9',
    colorTextBase: '#1C1917',
  },
  components: {
    // 侧栏菜单：选中项金底金字
    Menu: {
      itemSelectedBg: 'rgba(176,137,79,0.12)',
      itemSelectedColor: '#B0894F',
      itemHoverColor: '#B0894F',
    },
    // 布局：侧栏墨底、顶栏墨底（与前台视觉一致）
    Layout: {
      siderBg: '#1C1917',
      headerBg: '#ffffff',
    },
    Button: {
      // 主按钮墨底白字（对比度 ≈17:1，WCAG AA）
      primaryColor: '#ffffff',
    },
  },
};
