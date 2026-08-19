// ============================================================
// 【代码段功能】工作台（数据看板占位，BR-9 阶段 3 实现）
//   展示三条线索量的占位统计卡（墨金风格），后续接入 /api/dashboard/lead-stats
// ============================================================
import { Card, Col, Row } from 'antd';
import { CalendarOutlined, CommentOutlined, FileTextOutlined } from '@ant-design/icons';

// 统计卡数据（阶段 3 联调后由接口返回）
const STATS = [
  { title: '在线预约', value: '--', icon: <CalendarOutlined />, tip: '预约到店看样/体验（BR-7）' },
  { title: '留言咨询', value: '--', icon: <CommentOutlined />, tip: '通用咨询留言（BR-8）' },
  { title: '简历投递', value: '--', icon: <FileTextOutlined />, tip: '招聘简历投递（BR-5.2）' },
];

export default function Dashboard() {
  return (
    <div>
      {/* 页标题：衬线 22px + 金色左条（UI/UX §4.1 .page-title） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 3, height: 22, background: '#B0894F', borderRadius: 2 }} />
        <h2 style={{ margin: 0, fontFamily: "'Noto Serif SC', serif", fontSize: 22, color: '#1C1917' }}>工作台</h2>
      </div>

      {/* 线索量统计卡（阶段 3 接入真实数据与趋势图） */}
      <Row gutter={[20, 20]}>
        {STATS.map((s) => (
          <Col xs={24} sm={8} key={s.title}>
            <Card style={{ borderRadius: 8, boxShadow: '0 1px 2px rgba(28,25,23,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#B0894F', fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontSize: 14, color: '#78716C', marginTop: 8 }}>{s.title}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, color: '#1C1917', fontWeight: 600 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: '#a8a29e' }}>{s.tip}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 数据范围说明（BR-9 按角色限定维度；阶段 3 实现） */}
      <Card style={{ marginTop: 20, borderRadius: 8 }}>
        <div style={{ color: '#78716C', fontSize: 13 }}>
          📌 看板数据范围按角色限定：客服看预约+留言，招聘专员看简历，超管看全部（内容编辑无看板权限）。
          <br />阶段 3（线索管理+数据看板）将接入趋势折线、分类柱状与明细下钻（ECharts，墨金配色）。
        </div>
      </Card>
    </div>
  );
}
