import { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Tabs,
  List,
  Modal,
  InputNumber,
  Badge,
  message,
  Empty,
  Statistic,
} from 'antd';
import { ShoppingCartOutlined, CrownOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { ExchangeProduct, ExchangeOrder, exchangeApi, pointsApi, PointsAccount } from '../../api';

export default function ResidentExchange() {
  const [products, setProducts] = useState<ExchangeProduct[]>([]);
  const [orders, setOrders] = useState<ExchangeOrder[]>([]);
  const [account, setAccount] = useState<PointsAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyModal, setBuyModal] = useState<{ open: boolean; product: ExchangeProduct | null }>({
    open: false,
    product: null,
  });
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, oRes, aRes] = await Promise.all([
        exchangeApi.listProducts(),
        exchangeApi.listOrders(),
        pointsApi.getAccount().catch(() => ({ success: false, data: null })),
      ]);
      if (pRes.success) setProducts(pRes.data || []);
      if (oRes.success) setOrders(oRes.data || []);
      if (aRes.success) setAccount(aRes.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category)));
  const filteredProducts = category === 'all' ? products : products.filter((p) => p.category === category);

  const openBuy = (p: ExchangeProduct) => {
    setQuantity(1);
    setBuyModal({ open: true, product: p });
  };

  const handleBuy = async () => {
    if (!buyModal.product) return;
    const cost = buyModal.product.pointsCost * quantity;
    if ((account?.currentPoints || 0) < cost) {
      message.error('积分不足');
      return;
    }
    setSubmitting(true);
    try {
      await exchangeApi.createOrder(buyModal.product.id, quantity);
      message.success('兑换成功！请等待管理员发货');
      setBuyModal({ open: false, product: null });
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const orderStatusMap: Record<string, { color: string; label: string }> = {
    pending: { color: 'processing', label: '待发货' },
    shipped: { color: 'blue', label: '已发货' },
    delivered: { color: 'success', label: '已送达' },
    cancelled: { color: 'default', label: '已取消' },
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 12, background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 48 }}>🏆</div>
              <div style={{ flex: 1 }}>
                <Statistic
                  title={<span style={{ color: '#e65100' }}>我的积分余额</span>}
                  value={account?.currentPoints || 0}
                  valueStyle={{ color: '#e65100', fontSize: 32, fontWeight: 800 }}
                  prefix={<CrownOutlined />}
                />
              </div>
              <Button
                type="primary"
                size="large"
                style={{ background: '#e65100', border: 'none', borderRadius: 20 }}
                icon={<ShoppingCartOutlined />}
                onClick={() => document.getElementById('product-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                去兑换
              </Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>已兑换商品</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#52c41a' }}>{orders.length}</div>
            <div style={{ fontSize: 12, color: '#aaa' }}>件</div>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>累计消耗积分</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#f5222d' }}>
              {account?.totalSpent || 0}
            </div>
            <div style={{ fontSize: 12, color: '#aaa' }}>分</div>
          </Card>
        </Col>
      </Row>

      <div id="product-section">
        <Card
          title="🛍️ 积分商城"
          style={{ borderRadius: 12, marginBottom: 24 }}
          loading={loading}
          extra={
            <Tabs
              activeKey={category}
              onChange={setCategory}
              size="small"
              style={{ marginBottom: -16 }}
              items={[
                { key: 'all', label: '全部' },
                ...categories.map((c) => ({ key: c, label: c })),
              ]}
            />
          }
        >
          {filteredProducts.length === 0 ? (
            <Empty description="该分类暂无商品" />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredProducts.map((p) => (
                <Col xs={24} sm={12} md={8} lg={6} key={p.id}>
                  <Badge.Ribbon
                    text={p.stock === 0 ? '缺货' : p.stock < 10 ? '仅剩' + p.stock : ''}
                    color={p.stock === 0 ? '#999' : '#f5222d'}
                  >
                    <div className="product-card">
                      <div className="product-image">{p.image}</div>
                      <div style={{ padding: 16 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, minHeight: 42 }}>
                          {p.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#888',
                            marginBottom: 12,
                            minHeight: 36,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {p.description}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Tag color="orange" style={{ fontSize: 14, padding: '2px 12px' }}>
                            🏆 {p.pointsCost}
                          </Tag>
                          <Button
                            type="primary"
                            size="small"
                            disabled={p.stock === 0 || (account?.currentPoints || 0) < p.pointsCost}
                            onClick={() => openBuy(p)}
                          >
                            {p.stock === 0
                              ? '缺货'
                              : (account?.currentPoints || 0) < p.pointsCost
                              ? '积分不足'
                              : '立即兑换'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Badge.Ribbon>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      </div>

      <Card title="📋 我的兑换记录" style={{ borderRadius: 12 }} loading={loading}>
        {orders.length === 0 ? (
          <Empty description="暂无兑换记录" />
        ) : (
          <List
            dataSource={orders}
            renderItem={(o) => (
              <List.Item key={o.id}>
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        background: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 32,
                      }}
                    >
                      {o.productImage}
                    </div>
                  }
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>
                        {o.productName} × {o.quantity}
                      </span>
                      <Tag color={orderStatusMap[o.status].color} icon={o.status === 'delivered' ? <CheckCircleOutlined /> : undefined}>
                        {orderStatusMap[o.status].label}
                      </Tag>
                    </div>
                  }
                  description={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        消耗积分：<strong style={{ color: '#f5222d' }}>-{o.totalPoints}</strong>
                        <span style={{ color: '#ccc', margin: '0 8px' }}>|</span>
                        {o.status === 'shipped' && (o as any).shippedAt ? (
                          <span style={{ color: '#1890ff' }}>发货时间：{(o as any).shippedAt}</span>
                        ) : o.status === 'delivered' && o.deliveredAt ? (
                          <span style={{ color: '#52c41a' }}>送达时间：{o.deliveredAt}</span>
                        ) : (
                          <span style={{ color: '#999' }}>下单时间：{o.createdAt}</span>
                        )}
                      </span>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title="确认兑换"
        open={buyModal.open}
        onCancel={() => setBuyModal({ open: false, product: null })}
        onOk={handleBuy}
        confirmLoading={submitting}
        okText="确认兑换"
        okButtonProps={{ style: { background: '#fa8c16', border: 'none' } }}
      >
        {buyModal.product && (
          <div style={{ padding: 8 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 12,
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  flexShrink: 0,
                }}
              >
                {buyModal.product.image}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                  {buyModal.product.name}
                </div>
                <div style={{ color: '#666', fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>
                  {buyModal.product.description}
                </div>
                <div style={{ fontSize: 18, color: '#fa8c16', fontWeight: 700 }}>
                  🏆 {buyModal.product.pointsCost} 积分 / 件
                </div>
              </div>
            </div>
            <div
              style={{
                background: '#fafafa',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <span style={{ color: '#666' }}>兑换数量</span>
                <InputNumber
                  min={1}
                  max={buyModal.product.stock}
                  value={quantity}
                  onChange={(v) => setQuantity(v || 1)}
                  style={{ width: 140 }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 12,
                  borderTop: '1px dashed #ddd',
                }}
              >
                <span style={{ color: '#666' }}>我的余额</span>
                <span style={{ fontSize: 15 }}>
                  <CrownOutlined style={{ color: '#fa8c16' }} /> {account?.currentPoints || 0} 分
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 8,
                }}
              >
                <span style={{ color: '#666' }}>需支付</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#f5222d' }}>
                  -{buyModal.product.pointsCost * quantity} 积分
                </span>
              </div>
            </div>
            {(account?.currentPoints || 0) < buyModal.product.pointsCost * quantity && (
              <div style={{ color: '#f5222d', textAlign: 'center', fontSize: 13 }}>
                ⚠️ 积分不足，无法兑换
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
