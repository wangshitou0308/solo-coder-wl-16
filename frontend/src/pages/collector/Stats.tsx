import { useEffect, useState } from 'react';
import { Card, Row, Col, List, Rate, Tag, Statistic, Empty } from 'antd';
import {
  CheckCircleOutlined,
  CrownOutlined,
  StarOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { statsApi } from '../../api';

export default function CollectorStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await statsApi.collector();
        if (res.success) setData(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const s = data?.stats || {};
  const rank = data?.rank || {};

  const todayTasksOption = {
    tooltip: {},
    series: [
      {
        type: 'gauge',
        progress: { show: true, width: 18 },
        axisLine: { lineStyle: { width: 18 } },
        axisTick: { show: false },
        splitLine: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: {
          offsetCenter: [0, '-10%'],
          fontSize: 14,
          color: '#666',
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '20%'],
          fontSize: 36,
          fontWeight: 'bolder',
          formatter: '{value}',
          color: '#52c41a',
        },
        data: [
          {
            value: s.todayCompleted || 0,
            name: '今日完成',
          },
        ],
        max: Math.max(10, (s.todayCompleted || 0) * 2),
      },
    ],
  };

  const monthRanking = rank.monthCompleted || [];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <div
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)' }}
          >
            <Statistic
              title={<span style={{ color: '#fff', opacity: 0.9 }}>本月订单</span>}
              value={s.monthOrders || 0}
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 800 }}
              prefix={<CalendarOutlined />}
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
              title={<span style={{ color: '#fff', opacity: 0.9 }}>本月完成</span>}
              value={s.monthCompleted || 0}
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 800 }}
              prefix={<CheckCircleOutlined />}
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
              title={<span style={{ color: '#fff', opacity: 0.9 }}>回收积分</span>}
              value={s.monthPoints || 0}
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 800 }}
              prefix={<CrownOutlined />}
            />
            <div className="stat-icon">🏆</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #eb2f96 0%, #c41d7f 100%)' }}
          >
            <Statistic
              title={<span style={{ color: '#fff', opacity: 0.9 }}>平均评分</span>}
              value={Number(s.avgRating || 0).toFixed(1)}
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 800 }}
              prefix={<StarOutlined />}
              suffix={<span style={{ fontSize: 16 }}>/5.0</span>}
            />
            <div className="stat-icon">⭐</div>
          </div>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} lg={10}>
          <Card title="📊 本月业绩概览" style={{ borderRadius: 12 }} loading={loading}>
            {data ? (
              <div style={{ padding: 10 }}>
                <ReactECharts option={todayTasksOption} style={{ height: 220 }} />
                <Row gutter={[8, 8]} style={{ marginTop: 10 }}>
                  <Col xs={12}>
                    <div
                      style={{
                        padding: 12,
                        background: '#e6f7ff',
                        borderRadius: 8,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#1890ff', marginBottom: 4 }}>待处理任务</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#1890ff' }}>
                        {s.pendingTasks || 0}
                      </div>
                    </div>
                  </Col>
                  <Col xs={12}>
                    <div
                      style={{
                        padding: 12,
                        background: '#fff7e6',
                        borderRadius: 8,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#fa8c16', marginBottom: 4 }}>5星好评</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#fa8c16' }}>
                        {s.fiveStarCount || 0}
                      </div>
                    </div>
                  </Col>
                </Row>
                <div style={{ marginTop: 16, padding: 12, background: '#f9f0ff', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#722ed1', marginBottom: 4 }}>
                        <TrophyOutlined /> 本月排名
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#722ed1' }}>
                        第 {rank.position} 名
                        <span style={{ fontSize: 13, fontWeight: 400, color: '#999', marginLeft: 6 }}>
                          / 共 {rank.total} 人
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 48 }}>🏅</div>
                  </div>
                </div>
              </div>
            ) : (
              <Empty />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title="🏆 本月回收员排行榜" style={{ borderRadius: 12 }} loading={loading}>
            {monthRanking.length > 0 ? (
              <List
                dataSource={monthRanking}
                renderItem={(item: any, idx) => {
                  const isMe = rank.position === idx + 1;
                  return (
                    <div
                      className="ranking-item"
                      key={item.id}
                      style={{
                        padding: '14px 8px',
                        background: isMe ? '#e6fffb' : 'transparent',
                        borderRadius: 8,
                        marginBottom: 4,
                      }}
                    >
                      <div
                        className={`ranking-num ${idx === 0 ? 'top1' : idx === 1 ? 'top2' : idx === 2 ? 'top3' : ''}`}
                      >
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 15 }}>
                            {item.realName}
                          </span>
                          {isMe && (
                            <Tag color="cyan" style={{ fontSize: 11 }}>
                              <ThunderboltOutlined /> 我
                            </Tag>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fa8c16' }}>
                          {item.completed || 0}
                          <span style={{ fontSize: 12, color: '#999', fontWeight: 400, marginLeft: 4 }}>
                            单
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
      </Row>

      {data?.todayTasks && data.todayTasks.length > 0 && (
        <Card
          title="📅 今日任务"
          style={{ borderRadius: 12, marginTop: 24 }}
          extra={
            <Tag color="processing" style={{ fontSize: 13 }}>
              共 {data.todayTasks.length} 个任务
            </Tag>
          }
        >
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3 }}
            dataSource={data.todayTasks}
            renderItem={(task: any) => (
              <List.Item key={task.id}>
                <Card
                  size="small"
                  style={{ borderRadius: 10, background: '#fafafa' }}
                  bodyStyle={{ padding: 14 }}
                >
                  <div style={{ marginBottom: 8, color: '#fa8c16', fontWeight: 600 }}>
                    ⏰ {task.expectedTimeSlot}
                  </div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{task.residentName}</div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                    📞 {task.residentPhone}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#888',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 8,
                    }}
                    title={task.address}
                  >
                    📍 {task.address}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 8,
                      borderTop: '1px dashed #ddd',
                    }}
                  >
                    <Tag color="blue" style={{ margin: 0 }}>
                      预计 {task.estimatedPoints}分
                    </Tag>
                    {task.items && <span style={{ fontSize: 12, color: '#999' }}>{task.items.length}类</span>}
                  </div>
                </Card>
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}
