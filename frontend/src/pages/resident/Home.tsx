import { useEffect, useState } from 'react';
import { Row, Col, Card, Button, List, Tag, Rate, Empty } from 'antd';
import {
  CalendarOutlined,
  CrownOutlined,
  GiftOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { appointmentApi, categoryApi, pointsApi, Category, Appointment } from '../../api';
import { useAuthStore } from '../../store/authStore';

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待接单' },
  accepted: { color: 'processing', label: '已接单' },
  completed: { color: 'success', label: '已完成' },
  cancelled: { color: 'error', label: '已取消' },
};

export default function ResidentHome() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [categories, setCategories] = useState<Category[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, aptRes, ptRes] = await Promise.all([
          categoryApi.list(),
          appointmentApi.myList(),
          pointsApi.getAccount().catch(() => ({ success: false, data: { currentPoints: 0 } })),
        ]);
        if (catRes.success) setCategories(catRes.data || []);
        if (aptRes.success) setAppointments((aptRes.data || []).slice(0, 5));
        if (ptRes.success) setPoints(ptRes.data?.currentPoints || 0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <Card
        style={{
          background: 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)',
          borderRadius: 16,
          marginBottom: 24,
          border: 'none',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: 32, color: '#fff' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: '#fff', margin: 0, fontSize: 24, marginBottom: 8 }}>
              欢迎回来，{user?.realName} 🌿
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: 14 }}>
              让我们一起守护绿色家园，为环保贡献力量！
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, opacity: 0.85 }}>我的积分</div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>
              {points.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>可用积分</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <Button
            type="primary"
            size="large"
            style={{
              background: '#fff',
              color: '#2e7d32',
              border: 'none',
              fontWeight: 600,
              borderRadius: 24,
            }}
            onClick={() => navigate('/resident/appointments/new')}
          >
            📦 立即预约上门回收
          </Button>
          <Button
            size="large"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.5)',
              fontWeight: 500,
              borderRadius: 24,
            }}
            onClick={() => navigate('/resident/exchange')}
          >
            🎁 去积分商城兑换
          </Button>
        </div>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card
            onClick={() => navigate('/resident/appointments')}
            style={{ cursor: 'pointer', borderRadius: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: '#e3f2fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                <CalendarOutlined style={{ color: '#1976d2' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>我的预约</div>
                <div style={{ color: '#999', fontSize: 12 }}>共 {appointments.length} 条记录</div>
              </div>
              <ArrowRightOutlined style={{ color: '#ccc' }} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            onClick={() => navigate('/resident/points')}
            style={{ cursor: 'pointer', borderRadius: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: '#fff3e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                <CrownOutlined style={{ color: '#ff9800' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>积分中心</div>
                <div style={{ color: '#999', fontSize: 12 }}>当前 {points} 积分</div>
              </div>
              <ArrowRightOutlined style={{ color: '#ccc' }} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            onClick={() => navigate('/resident/exchange')}
            style={{ cursor: 'pointer', borderRadius: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: '#fce4ec',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                <GiftOutlined style={{ color: '#e91e63' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>积分商城</div>
                <div style={{ color: '#999', fontSize: 12 }}>多种好物兑换</div>
              </div>
              <ArrowRightOutlined style={{ color: '#ccc' }} />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title="最近预约"
            extra={
              <Button type="link" onClick={() => navigate('/resident/appointments')}>
                查看全部 <ArrowRightOutlined />
              </Button>
            }
            style={{ borderRadius: 12 }}
          >
            {appointments.length === 0 ? (
              <Empty description="暂无预约记录" />
            ) : (
              <List
                dataSource={appointments}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Tag color={statusMap[item.status].color} key="s">
                        {statusMap[item.status].label}
                      </Tag>,
                    ]}
                    style={{ cursor: 'pointer', padding: '12px 0' }}
                    onClick={() => navigate(`/resident/appointments/${item.id}`)}
                  >
                    <List.Item.Meta
                      avatar={<div style={{ fontSize: 28 }}>📦</div>}
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{item.expectedDate} {item.expectedTimeSlot}</span>
                          {item.rating && <Rate disabled defaultValue={item.rating} size="small" />}
                        </div>
                      }
                      description={
                        <div>
                          <div>📍 {item.address}</div>
                          <div style={{ marginTop: 4 }}>
                            🛒 {item.items.map((i) => `${i.categoryName}×${i.estimatedQuantity}${i.unit}`).join('、')}
                            {item.actualPoints !== undefined && (
                              <Tag color="orange" style={{ marginLeft: 8 }}>
                                积分 +{item.actualPoints}
                              </Tag>
                            )}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="可回收品类" style={{ borderRadius: 12, height: '100%' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
              {categories.slice(0, 8).map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    padding: 12,
                    background: '#fafafa',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 28 }}>{cat.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{cat.name}</div>
                    <div style={{ fontSize: 11, color: '#52c41a', fontWeight: 500 }}>
                      {cat.pointsPerUnit}积分/{cat.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
