import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  message,
  Descriptions,
  Space,
  Select,
  Input,
  Result,
} from 'antd';
import { SearchOutlined, SendOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { ExchangeOrder, exchangeApi } from '../../api';

const statusColor: Record<string, string> = {
  pending: 'warning',
  shipped: 'processing',
  delivered: 'success',
  cancelled: 'error',
};
const statusLabel: Record<string, string> = {
  pending: '待发货',
  shipped: '已发货',
  delivered: '已完成',
  cancelled: '已取消',
};

export default function AdminExchange() {
  const [data, setData] = useState<ExchangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await exchangeApi.adminList();
      if (res.success) setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = data.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (keyword) {
      const k = keyword.toLowerCase();
      const match =
        (r.residentName || '').toLowerCase().includes(k) ||
        (r.productName || '').toLowerCase().includes(k) ||
        String(r.id).includes(keyword);
      if (!match) return false;
    }
    return true;
  });

  const handleShip = (id: number) => {
    Modal.confirm({
      title: '确认发货',
      content: '确认已兑换商品已准备好并安排发货？',
      okText: '确认发货',
      onOk: async () => {
        try {
          await exchangeApi.ship(id);
          message.success('发货成功');
          load();
        } catch {
          message.error('操作失败');
        }
      },
    });
  };

  const handleCancel = (id: number) => {
    Modal.confirm({
      title: '取消订单并退款',
      content: '取消后积分将返还给用户，确认继续？',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await exchangeApi.cancel(id);
          message.success('已取消并退还积分');
          load();
        } catch {
          message.error('操作失败');
        }
      },
    });
  };

  const columns = [
    { title: '单号', dataIndex: 'id', width: 60 },
    {
      title: '用户',
      width: 130,
      render: (_: any, r: ExchangeOrder) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.residentName}</div>
          <div style={{ fontSize: 12, color: '#999' }}>@{r.residentUsername}</div>
        </div>
      ),
    },
    {
      title: '商品',
      width: 180,
      render: (_: any, r: ExchangeOrder) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 28 }}>{r.productIcon}</div>
          <div>
            <div style={{ fontWeight: 500 }}>{r.productName}</div>
            <div style={{ fontSize: 12, color: '#999' }}>x {r.quantity}</div>
          </div>
        </div>
      ),
    },
    {
      title: '消耗积分',
      dataIndex: 'pointsUsed',
      width: 100,
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ color: '#fa8c16', fontWeight: 700, fontSize: 15 }}>-{v}</span>
      ),
    },
    {
      title: '收货信息',
      dataIndex: 'address',
      ellipsis: true,
      render: (v: string, r: ExchangeOrder) => (
        <div>
          <div style={{ fontSize: 12 }}>{v}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{r.recipientPhone}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag>,
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => v?.replace('T', ' ').slice(0, 16),
    },
    {
      title: '操作',
      key: 'act',
      width: 160,
      render: (_: any, r: ExchangeOrder) => (
        <Space>
          {r.status === 'pending' && (
            <Button
              size="small"
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleShip(r.id)}
            >
              发货
            </Button>
          )}
          {(r.status === 'pending' || r.status === 'shipped') && (
            <Button
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleCancel(r.id)}
            >
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const counts = {
    pending: data.filter((d) => d.status === 'pending').length,
    shipped: data.filter((d) => d.status === 'shipped').length,
    delivered: data.filter((d) => d.status === 'delivered').length,
    cancelled: data.filter((d) => d.status === 'cancelled').length,
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div
          style={{
            flex: 1,
            minWidth: 140,
            background: 'linear-gradient(135deg, #fff7e6, #fff1f0)',
            padding: '14px 18px',
            borderRadius: 10,
            border: '1px solid #ffd591',
          }}
        >
          <div style={{ fontSize: 12, color: '#d48806', marginBottom: 4 }}>📦 待发货</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fa8c16' }}>{counts.pending}</div>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 140,
            background: 'linear-gradient(135deg, #e6f7ff, #f0f5ff)',
            padding: '14px 18px',
            borderRadius: 10,
            border: '1px solid #91caff',
          }}
        >
          <div style={{ fontSize: 12, color: '#096dd9', marginBottom: 4 }}>🚚 已发货</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1890ff' }}>{counts.shipped}</div>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 140,
            background: 'linear-gradient(135deg, #f6ffed, #e6fffb)',
            padding: '14px 18px',
            borderRadius: 10,
            border: '1px solid #95de64',
          }}
        >
          <div style={{ fontSize: 12, color: '#389e0d', marginBottom: 4 }}>✅ 已完成</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#52c41a' }}>{counts.delivered}</div>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 140,
            background: 'linear-gradient(135deg, #fff0f6, #f9f0ff)',
            padding: '14px 18px',
            borderRadius: 10,
            border: '1px solid #ffadd2',
          }}
        >
          <div style={{ fontSize: 12, color: '#c41d7f', marginBottom: 4 }}>❌ 已取消</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#eb2f96' }}>{counts.cancelled}</div>
        </div>
      </div>

      <Card
        style={{ borderRadius: 12 }}
        title={
          <Space wrap>
            <Select
              allowClear
              placeholder="按状态筛选"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
              options={Object.keys(statusLabel).map((k) => ({ value: k, label: statusLabel[k] }))}
            />
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索用户/商品/单号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 280 }}
            />
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filtered}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>
    </>
  );
}
