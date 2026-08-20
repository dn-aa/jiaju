// ============================================================
// 【代码段功能】前台墨金设计令牌（UI/UX v1.2 §2 / 附录 A）
//   双端共用：前台 tailwind.config 注入，后台 antdTheme 同源
// ============================================================

// 色彩令牌：墨色/香槟金/米白/浅金灰/描边（取值来自原型与设计文档）
export const colors = {
  ink: '#1C1917',       // 墨色：主按钮、强背景、主文字
  ink2: '#44403C',      // 次级文字
  muted: '#78716C',     // 弱化文字
  gold: '#B0894F',      // 香槟金：CTA、强调、链接
  goldD: '#97763F',
  danger: '#E5484D',    // 警示红：必填星标 *、错误提示
  bg: '#FAFAF9',        // 米白页面底
  surface: '#FFFFFF',   // 卡片表面
  soft: '#F5F3EF',      // 浅金灰区块底
  line: '#E7E5E4',      // 描边/分隔线
};

// 字体：标题衬线 / 正文无衬线（UI/UX §2.2）
export const fonts = {
  display: "'Cormorant Garamond', 'Noto Serif SC', serif",
  body: "'Montserrat', 'Noto Sans SC', sans-serif",
};

// 圆角 / 阴影 / 容器（UI/UX §2.3~2.4、§3.2）
export const radius = { sm: 8, md: 14, lg: 22 };
export const shadow = {
  sm: '0 1px 2px rgba(28,25,23,.05)',
  md: '0 10px 30px rgba(28,25,23,.08)',
  lg: '0 24px 60px rgba(28,25,23,.14)',
};
export const maxWidth = '1240px';   // 前台容器最大宽（§3.2）
