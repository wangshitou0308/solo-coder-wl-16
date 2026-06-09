import { useEffect, useState } from 'react';
import { Card, Row, Col, List, Statistic, Tag } from 'antd';
import {
  TeamOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { statsApi } from '../../api';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await statsApi.dashboard();
        if (res.success) setData(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const s = data?.summary || {};
  const categoryData = data?.categoryStats || [];
  const trendData = data?.trend30 || { dates: [], values: [], co2: [] };

  const categoryPieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: {
      bottom: 0,
      left: 'center',
      textStyle: { fontSize: 11 },
      type: 'scroll',
    },
    color: ['#52c41a', '#1890ff', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', '#f5222d', '#faad14'],
    series: [
      {
        name: '品类分布',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
        labelLine: { length: 10, length2: 8 },
        data: categoryData,
      },
    ],
  };

  const trendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['回收单数', '积分发放', '碳减排(kg)'], top: 0, right: 10, textStyle: { fontSize: 11 } },
    grid: { left: 40, right: 50, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.dates,
      axisLabel: { fontSize: 10, interval: 3, rotate: 0 },
    },
    yAxis: [
      { type: 'value', name: '单/积分', axisLabel: { fontSize: 10 } },
      { type: 'value', name: 'kg CO₂', axisLabel: { fontSize: 10 }, splitLine: { show: false } },
    ],
    series: [
      {
        name: '回收单数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#1890ff' },
        areaStyle: { color: 'rgba(24,144,255,0.12)' },
        data: trendData.orders,
      },
      {
        name: '积分发放',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#52c41a' },
        areaStyle: { color: 'rgba(82,196,26,0.10)' },
        data: trendData.points,
      },
      {
        name: '碳减排(kg)',
        type: 'bar',
        yAxisIndex: 1,
        itemStyle: { color: 'rgba(114,46,209,0.7)', borderRadius: [4, 4, 0, 0] },
        data: trendData.co2,
      },
    ],
  };

  const ranking = data?.collectorRanking || [];

  return (
    <div>
      <div
        className="dashboard-header"
        style={{
          background: 'linear-gradient(135deg, #52c41a 0%, #1890ff 50%, #722ed1 100%)',
          padding: '24px 28px',
          borderRadius: 16,
          color: '#fff',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 24, fontWeight: 700 }}>🌿 社区环保大数据中心</h2>
          <div style={{ opacity: 0.9, marginTop: 6 }}>让每一次回收都变成对地球的守护 🌍</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, opacity: 0.9 }}>
          <div>累计服务：<strong style={{ fontSize: 18 }}>{s.totalAppointments}</strong> 次</div>
          <div style={{ marginTop: 4 }}>累计参与居民：<strong style={{ fontSize: 18 }}>{s.participants}</strong> 人</div>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <div
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)' }}
          >
            <Statistic
              title={<span style={{ color: '#fff', opacity: 0.9 }}>预约总数</span>}
              value={s.totalAppointments || 0}
              valueStyle={{ color: '#fff', fontSize: 30, fontWeight: 800 }}
              prefix={<CheckCircleOutlined />}
            />
            <div className="stat-icon">📋</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' }}
          >
            <Statistic
              title={<span style={{ color: '#fff', opacity: 0.9 }}>已完成</span>}
              value={s.completedAppointments || 0}
              valueStyle={{ color: '#fff', fontSize: 30, fontWeight: 800 }}
              prefix={<TeamOutlined />}
              suffix={<span style={{ fontSize: 14, opacity: 0.85 }}>单</span>}
            />
            <div className="stat-icon">✅</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)' }}
          >
            <Statistic
              title={<span style={{ color: '#fff', opacity: 0.9 }}>发放积分</span>}
              value={s.totalPoints || 0}
              valueStyle={{ color: '#fff', fontSize: 30, fontWeight: 800 }}
              prefix={<WalletOutlined />}
            />
            <div className="stat-icon">💎</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #eb2f96 0%, #c41d7f 100%)' }}
          >
            <Statistic
              title={<span style={{ color: '#fff', opacity: 0.9 }}>碳减排估算</span>}
              value={Number(s.carbonReductionKg || 0).toFixed(0)}
              valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 800 }}
              prefix={<DollarOutlined />}
              suffix={<span style={{ fontSize: 14, opacity: 0.85 }}>kg CO₂</span>}
            />
            <div className="stat-icon">🌱</div>
          </div>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={15}>
          <Card
            title="📈 近30天回收趋势"
            style={{ borderRadius: 12, marginBottom: 16 }}
            loading={loading}
            bodyStyle={{ padding: 8 }}
          >
            {data ? (
              <ReactECharts option={trendOption} style={{ height: 340 }} />
            ) : null}
          </Card>

          <Card
            title="♻️ 回收品类分布"
            style={{ borderRadius: 12 }}
            loading={loading}
            bodyStyle={{ padding: 8 }}
          >
            {data ? (
              <ReactECharts option={categoryPieOption} style={{ height: 300 }} />
            ) : null}
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            title="🏆 回收员业绩榜"
            style={{ borderRadius: 12, marginBottom: 16 }}
            loading={loading}
          >
            {ranking.length > 0 ? (
              <List
                dataSource={ranking.slice(0, 8)}
                renderItem={(item: any, idx) => (
                  <div
                    className="ranking-item"
                    key={item.id}
                    style={{ padding: '12px 4px', marginBottom: 4, borderRadius: 8 }}
                  >
                    <div
                      className={`ranking-num ${
                        idx === 0 ? 'top1' : idx === 1 ? 'top2' : idx === 2 ? 'top3' : ''
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {item.realName || item.username}
                      </div>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        好评率 {item.rating || '0'}% · {item.points || 0} 分
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#fa8c16' }}>
                        {item.completed || 0}
                        <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}> 单</span>
                      </div>
                    </div>
                  </div>
                )}
              />
            ) : (
              <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>暂无数据</div>
            )}
          </Card>

          <Card
            title="💡 社区亮点"
            style={{ borderRadius: 12 }}
            bodyStyle={{ padding: 16 }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #e6fffb, #e6f7ff)',
                padding: 18,
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 14, color: '#08979c', fontWeight: 600, marginBottom: 6 }}>🌳 环境贡献</div>
              <div style={{ color: '#555', lineHeight: 1.8 }}>
                通过回收减少了约 <strong style={{ color: '#52c41a' }}>{Number(s.carbonReductionKg / 1000).toFixed(2)}</strong> 吨碳排放，
                相当于种了 <strong style={{ color: '#52c41a' }}>{Math.floor((s.carbonReductionKg || 0) / 18)}</strong> 棵树！
              </div>
            </div>
            <div
              style={{
                background: 'linear-gradient(135deg, #fff7e6, #fff0f6)',
                padding: 18,
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 14, color: '#d46b08', fontWeight: 600, marginBottom: 6 }}>👥 居民参与</div>
              <div style={{ color: '#555', lineHeight: 1.8 }}>
                共 <strong style={{ color: '#eb2f96' }}>{s.residents || 0}</strong> 位居民参与，
                参与率约 <strong style={{ color: '#eb2f96' }}>{s.totalAppointments > 0 ? Math.min(100, Math.round(((s.participants || 0) / (s.residents || 1)) * 100)) : 0}%</strong>，
                社区环保氛围浓厚！
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
