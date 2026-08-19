// ============================================================
// 【代码段功能】页标题（UI/UX v1.2 §4.1 .page-title）
//   衬线 22px 标题 + 金色左条 3px，用于每个管理模块页面顶部
// ============================================================
export default function PageHeader({ title, extra }: { title: string; extra?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 金色左条（品牌点缀） */}
        <div style={{ width: 3, height: 22, background: '#B0894F', borderRadius: 2 }} />
        <h2 style={{ margin: 0, fontFamily: "'Noto Serif SC', serif", fontSize: 22, color: '#1C1917' }}>
          {title}
        </h2>
      </div>
      {/* 右侧操作区（如「+ 新增」按钮） */}
      {extra}
    </div>
  );
}
