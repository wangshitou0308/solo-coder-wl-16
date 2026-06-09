import { useEffect, useState } from 'react';
import { Row, Col, Card, List, Progress, Tag, Spin } from 'antd';
import ReactECharts from 'echarts-for-react';
import { statsApi } from '../../api';
import './DataScreen.css';

export default function AdminDataScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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
  const ranking = data?.collectorRanking || [];

  const trendOption = {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,20,40,0.9)', borderColor: '#00cfff', textStyle: { color: '#fff' } },
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.dates,
      axisLabel: { color: '#9ec5ff', fontSize: 10, interval: 2 },
      axisLine: { lineStyle: { color: '#00cfff22' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ec5ff', fontSize: 10 },
      splitLine: { lineStyle: { color: '#00cfff22', type: 'dashed' } },
    },
    series: [
      {
        name: '回收单数',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#00ff9d', width: 2, shadowColor: '#00ff9d', shadowBlur: 10 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(0,255,157,0.5)' }, { offset: 1, color: 'rgba(0,255,157,0.05)' }],
          },
        },
        data: trendData.orders,
      },
      {
        name: '积分发放',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#ff9d00', width: 2, shadowColor: '#ff9d00', shadowBlur: 10 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(255,157,0,0.4)' }, { offset: 1, color: 'rgba(255,157,0,0.05)' }],
          },
        },
        data: trendData.points,
      },
    ],
  };

  const categoryOption = {
    tooltip: { trigger: 'item', backgroundColor: 'rgba(0,20,40,0.9)', textStyle: { color: '#fff' } },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center',
      textStyle: { color: '#9ec5ff', fontSize: 11 },
      itemGap: 10,
    },
    color: ['#00ff9d', '#00cfff', '#ff9d00', '#ff4dd2', '#9d4dff', '#4dff9d', '#ff4d4d', '#ffd24d'],
    series: [
      {
        name: '品类',
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['65%', '50%'],
        label: { color: '#fff', fontSize: 10, formatter: '{b}\n{d}%' },
        labelLine: { lineStyle: { color: '#00cfff55' } },
        itemStyle: { borderColor: '#001a33', borderWidth: 2 },
        data: categoryData,
      },
    ],
  };

  const co2BarOption = {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,20,40,0.9)', textStyle: { color: '#fff' } },
    grid: { left: 50, right: 15, top: 15, bottom: 30 },
    xAxis: {
      type: 'category',
      data: trendData.dates,
      axisLabel: { color: '#9ec5ff', fontSize: 9, interval: 3 },
      axisLine: { lineStyle: { color: '#00cfff22' } },
    },
    yAxis: {
      type: 'value',
      name: 'kg CO₂',
      nameTextStyle: { color: '#9ec5ff', fontSize: 10 },
      axisLabel: { color: '#9ec5ff', fontSize: 10 },
      splitLine: { lineStyle: { color: '#00cfff22', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        barWidth: 12,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#00ff9d' }, { offset: 1, color: 'rgba(0,255,157,0.2)' }],
          },
        },
        data: trendData.co2,
      },
    ],
  };

  const formatTime = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
      d.getHours()
    ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

  const weekDay = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][currentTime.getDay()];

  return (
    <div className="data-screen-container">
      <div className="data-screen-header">
        <div className="header-left">🌿 {weekDay}</div>
        <div className="header-title">
          <span>社区废旧物品回收大数据中心</span>
          <div className="title-subtitle">Community Recycling Big Data Center</div>
        </div>
        <div className="header-right">
          <span>📅 {formatTime(currentTime)}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 200 }}>
          <Spin size="large" />
        </div>
      ) : (
        <div className="data-screen-body">
          <div className="data-screen-col left">
            <div className="screen-panel">
              <div className="panel-title">📊 核心数据概览</div>
              <Row gutter={[12, 12]} style={{ marginTop: 0 }}>
                <Col xs={12}>
                  <div className="kpi-box blue">
                    <div className="kpi-num">{s.totalAppointments || 0}</div>
                    <div className="kpi-label">总预约数</div>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="kpi-box green">
                    <div className="kpi-num">{s.completedAppointments || 0}</div>
                    <div className="kpi-label">已完成数</div>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="kpi-box orange">
                    <div className="kpi-num">{s.totalPoints || 0}</div>
                    <div className="kpi-label">发放积分</div>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="kpi-box purple">
                    <div className="kpi-num">{s.participants || 0}</div>
                    <div className="kpi-label">参与人数</div>
                  </div>
                </Col>
              </Row>
            </div>

            <div className="screen-panel">
              <div className="panel-title">🌱 碳减排贡献</div>
              <div style={{ padding: '8px 4px' }}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '16px 12px',
                    background: 'linear-gradient(135deg, rgba(0,255,157,0.12), rgba(0,207,255,0.12))',
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#9ec5ff', marginBottom: 4 }}>累计碳减排</div>
                  <div style={{ fontSize: 34, fontWeight: 900, color: '#00ff9d', textShadow: '0 0 14px rgba(0,255,157,0.4)' }}>
                    {Number(s.carbonReductionKg || 0).toFixed(1)}
                    <span style={{ fontSize: 14, marginLeft: 4 }}>kg CO₂</span>
                  </div>
                </div>
                <Row gutter={8}>
                  <Col span={12}>
                    <div className="mini-stat">
                      <div className="mini-num">{Number((s.carbonReductionKg || 0) / 1000).toFixed(2)}</div>
                      <div className="mini-label">吨碳排放</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="mini-stat">
                      <div className="mini-num">{Math.floor((s.carbonReductionKg || 0) / 18)}</div>
                      <div className="mini-label">≈ 棵树🌳</div>
                    </div>
                  </Col>
                </Row>
                <div style={{ marginTop: 12 }}>
                  <Progress
                    percent={Math.min(100, Math.round(((s.participants || 0) / Math.max(1, s.residents || 1)) * 100))}
                    strokeColor={{ from: '#00ff9d', to: '#00cfff' }}
                    trailColor="rgba(0,207,255,0.1)"
                    showInfo
                    format={(p) => `居民参与率 ${p}%`}
                  />
                </div>
              </div>
            </div>

            <div className="screen-panel">
              <div className="panel-title">🏆 回收员业绩榜 TOP 5</div>
              <List
                dataSource={ranking.slice(0, 5)}
                locale={{ emptyText: '暂无数据' }}
                renderItem={(item: any, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 6px',
                      borderBottom: idx < 4 ? '1px solid rgba(0,207,255,0.08)' : 'none',
                    }}
                  >
                    <div
                      className={`rank-badge ${idx === 0 ? 'r1' : idx === 1 ? 'r2' : idx === 2 ? 'r3' : ''}`}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, marginLeft: 10 }}>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                        {item.realName || item.username}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ec5ff' }}>
                        ⭐ {item.rating || 0}% · {item.points || 0}积分
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#ff9d00', fontSize: 20, fontWeight: 800, textShadow: '0 0 8px rgba(255,157,0,0.5)' }}>
                        {item.completed || 0}
                      </div>
                      <div style={{ fontSize: 10, color: '#9ec5ff' }}>完成单</div>
                    </div>
                  </div>
                )}
              />
            </div>
          </div>

          <div className="data-screen-col center">
            <div className="screen-panel">
              <div className="panel-title">📈 近30天回收与积分趋势</div>
              <ReactECharts option={trendOption} style={{ height: 260 }} />
            </div>

            <div className="screen-panel">
              <div className="panel-title">🌍 社区环保成果</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  padding: '4px 0',
                }}
              >
                {[
                  { icon: '♻️', label: '回收品类', value: categoryData.length, color: '#00ff9d' },
                  { icon: '👥', label: '总居民', value: s.residents || 0, color: '#00cfff' },
                  { icon: '🎁', label: '兑换订单', value: s.exchangeOrders || 0, color: '#ff9d00' },
                  { icon: '💝', label: '兑出积分', value: s.exchangedPoints || 0, color: '#ff4dd2' },
                ].map((it, i) => (
                  <div key={i} className="result-card" style={{ borderColor: it.color }}>
                    <div className="result-icon" style={{ background: `${it.color}22`, color: it.color }}>
                      {it.icon}
                    </div>
                    <div className="result-value" style={{ color: it.color }}>{it.value}</div>
                    <div className="result-label">{it.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, textAlign: 'center', padding: '14px', background: 'linear-gradient(90deg, rgba(0,255,157,0.08), rgba(0,207,255,0.08), rgba(255,157,0,0.08))', borderRadius: 10 }}>
                <div style={{ fontSize: 13, color: '#9ec5ff' }}>
                  "每一次回收都是对地球的一份守护"
                </div>
                <div style={{ fontSize: 11, color: '#9ec5ff88', marginTop: 4 }}>
                  让绿色成为社区最美的底色 🌏
                </div>
              </div>
            </div>

            <div className="screen-panel">
              <div className="panel-title">🪨 近30天每日碳减排 (kg)</div>
              <ReactECharts option={co2BarOption} style={{ height: 220 }} />
            </div>
          </div>

          <div className="data-screen-col right">
            <div className="screen-panel">
              <div className="panel-title">♻️ 品类回收占比</div>
              <ReactECharts option={categoryOption} style={{ height: 280 }} />
            </div>

            <div className="screen-panel">
              <div className="panel-title">📋 最近回收动态</div>
              <div style={{ padding: '4px 0' }}>
                {ranking.slice(0, 5).map((c: any, idx) => (
                  <div
                    key={`act-${idx}`}
                    style={{
                      padding: '10px 8px',
                      borderBottom: idx < 4 ? '1px solid rgba(0,207,255,0.08)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#fff', fontSize: 13 }}>
                        🏃 {(c.realName || '回收员').slice(0, 3)} 完成 {c.completed || 0} 单
                      </span>
                      <Tag
                        color="success"
                        style={{
                          fontSize: 10,
                          background: 'rgba(0,255,157,0.12)',
                          border: 'none',
                          color: '#00ff9d',
                        }}
                      >
                        +{c.points || 0}分
                      </Tag>
                    </div>
                    <div style={{ fontSize: 11, color: '#9ec5ff88' }}>
                      好评率 {(c.rating || 0)}% · 回收量 {(c.weight || 0)}kg
                    </div>
                  </div>
                ))}
                {ranking.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9ec5ff66' }}>暂无数据</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
