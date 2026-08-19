// ============================================================
// 【代码段功能】Tailwind 配置：注入墨金令牌与字体（开发技术文档 v1.4 §3.1）
// ============================================================
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // 色彩令牌：ink/gold/cream 等（UI/UX 附录 A）
      colors: {
        ink: '#1C1917',
        'ink-2': '#44403C',
        muted: '#78716C',
        gold: '#B0894F',
        'gold-d': '#97763F',
        cream: '#FAFAF9',
        soft: '#F5F3EF',
        line: '#E7E5E4',
      },
      // 字体：display 衬线 / body 无衬线
      fontFamily: {
        display: ["'Cormorant Garamond'", "'Noto Serif SC'", 'serif'],
        body: ["'Montserrat'", "'Noto Sans SC'", 'sans-serif'],
      },
      borderRadius: { sm: '8px', md: '14px', lg: '22px' },
      boxShadow: {
        card: '0 1px 2px rgba(28,25,23,.05)',
        hover: '0 10px 30px rgba(28,25,23,.08)',
        pop: '0 24px 60px rgba(28,25,23,.14)',
      },
    },
  },
  plugins: [],
} satisfies Config;
