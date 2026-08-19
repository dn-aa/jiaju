// ============================================================
// 【代码段功能】工作台 / 数据看板（BR-9）
//   - 统计卡：预约/留言/简历（total/今日/本周/本月，按角色维度）
//   - 趋势折线 + 分类柱状（ECharts，墨金配色：金 #B0894F / 墨 #1C1917 / 品牌绿 #52C41A）
//   - 明细下钻：点击维度进入对应线索列表
//   - scope-tip 标注当前角色数据范围（客服/招聘/超管）
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Card, Col, Row, Tag } from 'antd';
import * as echarts from 'echarts';
import PageHeader from '../../components/PageHeader';
import { getData } from '../../services/http';

interface Stats {
  types: Record<string, { total: number; today: number; week: number; month: number }>;
  trend: Record<string, string | number>[];
  effective_leads: number;
  scope: string[];
}

// 维度中文名与颜色（折线/柱状配色）；带索引签名以便按字符串键取值
const DIM: Record<string, { label: string; color: string }> = {
  appointment: { label: '在线预约', color: '#B0894F' },
  message: { label: '留言咨询', color: '#1C1917' },
  application: { label: '简历投递', color: '#52C41A' },
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const lineRef = useRef<HTMLDivElement>(null);   // 折线图容器
  const barRef = useRef<HTMLDivElement>(null);    // 柱状图容器

  // 拉取看板数据（按角色维度自动过滤）
  const load = async () => {
    try {
      setStats(await getData<Stats>('/dashboard/lead-stats?range=30'));
    } catch { /* 无权限等由拦截器提示 */ }
  };
  useEffect(() => { load(); }, []);

  // 数据就绪后渲染 ECharts（折线：30 天趋势；柱状：今日各维度）
  useEffect(() => {
    if (!stats || !lineRef.current || !barRef.current) return;
    const types = stats.scope;
    // ---------- 趋势折线：金线 + 圆点 ----------
    const line = echarts.init(lineRef.current);
    line.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: types.map((t) => DIM[t]?.label), textStyle: { color: '#78716C' } },
      grid: { left: 40, right: 20, top: 36, bottom: 24 },
      xAxis: { type: 'category', data: stats.trend.map((r) => r.date), axisLine: { lineStyle: { color: '#999' } } },
      yAxis: { type: 'value', minInterval: 1, axisLine: { lineStyle: { color: '#999' } } },
      series: types.map((t) => ({
        name: DIM[t]?.label, type: 'line', smooth: true, symbolSize: 6,
        data: stats.trend.map((r) => r[t] || 0),
        lineStyle: { color: DIM[t]?.color, width: 2.5 },
        itemStyle: { color: DIM[t]?.color },
      })),
    });
    // ---------- 分类柱状：今日各维度量 ----------
    const bar = echarts.init(barRef.current);
    bar.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 36, bottom: 24 },
      xAxis: { type: 'category', data: types.map((t) => DIM[t]?.label), axisLine: { lineStyle: { color: '#999' } } },
      yAxis: { type: 'value', minInterval: 1, axisLine: { lineStyle: { color: '#999' } } },
      series: [{
        type: 'bar', barWidth: 40,
        data: types.map((t) => ({ value: stats.types[t]?.today || 0, itemStyle: { color: DIM[t]?.color } })),
      }],
    });
    // 组件卸载时释放实例（避免内存泄漏）
    return () => { line.dispose(); bar.dispose(); };
  }, [stats]);

  return (
    <div>
      <PageHeader title="工作台" extra={
        stats && <span style={{ fontSize: 13, color: '#78716C' }}>
          有效线索（按手机号去重）：
          <b style={{ color: '#B0894F', fontFamily: "'Cormorant Garamond', serif", fontSize: 22 }}>{stats.effective_leads}</b>
        </span>
      } />

      {/* scope-tip：标注当前角色数据范围（BR-9 角色维度） */}
      {stats && (
        <div style={{ background: '#F5F3EF', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#78716C' }}>
          📌 当前角色看板范围：
          {stats.scope.map((t) => <Tag key={t} color="gold" style={{ marginLeft: 8 }}>{DIM[t]?.label}</Tag>)}
          {stats.scope.length === 0 && <Tag>无权限</Tag>}
          <span style={{ marginLeft: 8 }}>（客服看预约+留言 / 招聘看简历 / 超管看全部 / 编辑无权限）</span>
        </div>
      )}

      {/* 统计卡：总线索量（原始条数，不去重） */}
      <Row gutter={[20, 20]}>
        {(stats?.scope || []).map((t) => (
          <Col xs={24} sm={8} key={t}>
            <Card style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}>
              <div style={{ color: DIM[t]?.color, fontSize: 14, fontWeight: 600 }}>{DIM[t]?.label}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 44, color: '#1C1917', fontWeight: 600, margin: '6px 0' }}>
                {stats?.types[t]?.total ?? 0}
              </div>
              <div style={{ fontSize: 12, color: '#a8a29e' }}>
                今日 {stats?.types[t]?.today ?? 0} · 本周 {stats?.types[t]?.week ?? 0} · 本月 {stats?.types[t]?.month ?? 0}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表区：趋势折线 + 分类柱状 */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={14}>
          <Card title="线索趋势（近 30 天）" size="small" style={{ borderRadius: 8 }}>
            <div ref={lineRef} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="今日线索分布" size="small" style={{ borderRadius: 8 }}>
            <div ref={barRef} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>

      {/* 下钻入口：点击维度查看明细（BR-9.2） */}
      <Card style={{ marginTop: 20, borderRadius: 8 }} size="small">
        <div style={{ fontSize: 13, color: '#78716C' }}>
          明细下钻（阶段 3 已就绪）：进入「在线预约 / 留言咨询 / 简历投递」模块即可查看与处理对应线索列表。
        </div>
      </Card>
    </div>
  );
}
