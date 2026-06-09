import { useEffect, useState } from 'react';
import { Card, Row, Col, Tabs, List, Tag, Empty, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, SyncOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { PointsAccount, PointsRecord, pointsApi } from '../../api';

export default function ResidentPoints() {
  const [account, setAccount] = useState<PointsAccount | null>(null);
  const [records, setRecords] = useState<PointsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [accRes, recRes] = await Promise.all([pointsApi.getAccount(), pointsApi.getRecords()]);
        if (accRes.success) setAccount(accRes.data || null);
        if (recRes.success) setRecords(recRes.data?.records || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const trendOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: records.slice(0, 10).reverse().map((r) => r.createdAt.slice(5, 10)),
      axisLine: { lineStyle: { color: '#ddd' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f5f5f5' } },
    },
    series: [
      {
        name: '余额',
        type: 'line',
        smooth: true,
        data: records.slice(0, 10).reverse().map((r) => r.balance),
        lineStyle: { color: '#52c41a', width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82,196,26,0.3)' },
              { offset: 1, color: 'rgba(82,196,26,0.01)' },
            ],
          },
        },
        itemStyle: { color: '#52c41a' },
      },
    ],
  };

  const typeIcon: Record<string, { icon: JSX.Element; color: string }> = {
    earn: { icon: <ArrowUpOutlined />, color: '#52c41a' },
    spend: { icon: <ArrowDownOutlined />, color: '#f5222d' },
    rollover: { icon: <SyncOutlined />, color: '#1890ff' },
  };

  const typeLabel: Record<string, string> = {
    earn: '获得积分',
    spend: '消耗积分',
    rollover: '年度结转',
  };

  const filteredRecords = (type: string) =>
    type === 'all' ? records : records.filter((r) => r.type === type);

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <div
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)' }}
          >
            <Statistic
              title={<span style={{ color: '#fff', opacity: 0.9 }}>当前可用积分</span>}
              value={account?.currentPoints || 0}
              valueStyle={{ color: '#fff', fontSize: 36, fontWeight: 800 }}
              suffix={<span style={{ fontSize: 16 }}>分</span>}
            />
            <div className="stat-icon">🏆</div>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)' }}
          >
            <Statistic
              title={<span style={{ color: '#fff', opacity: 0.9 }}>本年度累计获得</span>}
              value={account?.totalEarned || 0}
              valueStyle={{ color: '#fff', fontSize: 36, fontWeight: 800 }}
              prefix={<ArrowUpOutlined />}
            />
            <div className="stat-icon">🌱</div>
          </div>
        </Col>
        <Col xs={24} md={8}>
          <div
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #ef5350 0%, #e53935 100%)' }}
          >
            <Statistic
              title={<span style={{ color: '#fff', opacity: 0.9 }}>本年度累计消耗</span>}
              value={account?.totalSpent || 0}
              valueStyle={{ color: '#fff', fontSize: 36, fontWeight: 800 }}
              prefix={<ArrowDownOutlined />}
            />
            <div className="stat-icon">🎁</div>
          </div>
        </Col>
      </Row>

      {account && account.lastYearPoints > 0 && (
        <Card
          style={{ borderRadius: 12, marginBottom: 24, background: '#fffbe6', border: '1px solid #ffe58f' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>📢 积分年度结转提醒</div>
              <div style={{ color: '#666', fontSize: 13 }}>
                您在 {account.currentYear - 1} 年度有 <strong style={{ color: '#d48806' }}>{account.lastYearPoints}</strong> 积分未使用，
                已按规则折半结转至本年（每年1月1日自动结转）
              </div>
            </div>
            <Tag color="orange" style={{ fontSize: 14 }}>
              结转 {Math.floor(account.lastYearPoints / 2)} 分
            </Tag>
          </div>
        </Card>
      )}

      <Row gutter={16}>
        <Col xs={24} lg={10}>
          <Card title="积分趋势图" style={{ borderRadius: 12 }} loading={loading}>
            {records.length > 0 ? (
              <ReactECharts option={trendOption} style={{ height: 280 }} />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="积分明细" style={{ borderRadius: 12 }} loading={loading}>
            <Tabs
              size="small"
              items={[
                { key: 'all', label: '全部' },
                { key: 'earn', label: '获得' },
                { key: 'spend', label: '消耗' },
                { key: 'rollover', label: '结转' },
              ]}
              renderTabBar={(props, DefaultTabBar) => <DefaultTabBar {...props} />}
            >
              {(['all', 'earn', 'spend', 'rollover'] as const).map((type) => (
                <Tabs.TabPane key={type} tab={type}>
                  {filteredRecords(type).length === 0 ? (
                    <Empty description="暂无记录" style={{ padding: '40px 0' }} />
                  ) : (
                    <List
                      dataSource={filteredRecords(type)}
                      style={{ maxHeight: 320, overflowY: 'auto' }}
                      renderItem={(r) => (
                        <List.Item key={r.id}>
                          <List.Item.Meta
                            avatar={
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 20,
                                  background: `${typeIcon[r.type].color}15`,
                                  color: typeIcon[r.type].color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 18,
                                }}
                              >
                                {typeIcon[r.type].icon}
                              </div>
                            }
                            title={
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 500 }}>{r.description}</span>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color: r.type === 'earn' ? '#52c41a' : r.type === 'spend' ? '#f5222d' : '#1890ff',
                                  }}
                                >
                                  {r.type === 'earn' ? '+' : r.type === 'spend' ? '-' : '±'}
                                  {Math.abs(r.points)}
                                </span>
                              </div>
                            }
                            description={
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Tag color={typeIcon[r.type].color} style={{ fontSize: 11 }}>
                                  {typeLabel[r.type]}
                                </Tag>
                                <span style={{ color: '#999', fontSize: 12 }}>
                                  {r.createdAt} · 余额 {r.balance}
                                </span>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Tabs.TabPane>
              ))}
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
