import { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Space, Rate, Select, message, Modal } from 'antd';
import { PlusOutlined, EyeOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { appointmentApi, Appointment } from '../../api';

const { Option } = Select;

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待接单' },
  accepted: { color: 'processing', label: '已接单' },
  completed: { color: 'success', label: '已完成' },
  cancelled: { color: 'error', label: '已取消' },
};

export default function ResidentAppointments() {
  const navigate = useNavigate();
  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [cancelling, setCancelling] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await appointmentApi.myList();
      if (res.success) setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = filter === 'all' ? data : data.filter((d) => d.status === filter);

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      await appointmentApi.cancel(id);
      message.success('取消成功');
      loadData();
    } finally {
      setCancelling(null);
    }
  };

  const columns = [
    {
      title: '预约编号',
      dataIndex: 'id',
      width: 90,
      render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#666' }}>#{v}</span>,
    },
    {
      title: '预约时间',
      dataIndex: 'expectedDate',
      width: 180,
      render: (_: string, r: Appointment) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.expectedDate}</div>
          <div style={{ color: '#999', fontSize: 12 }}>{r.expectedTimeSlot}</div>
        </div>
      ),
    },
    {
      title: '回收地址',
      dataIndex: 'address',
      ellipsis: true,
    },
    {
      title: '回收物',
      dataIndex: 'items',
      render: (items: Appointment['items']) => (
        <div style={{ fontSize: 12 }}>
          {items.map((i) => (
            <Tag key={i.id} style={{ marginBottom: 4 }}>
              {i.icon} {i.categoryName}×{i.estimatedQuantity}{i.unit}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: '预计/实际积分',
      width: 120,
      render: (_: any, r: Appointment) => (
        <div>
          {r.actualPoints !== undefined ? (
            <div>
              <Tag color="orange" style={{ fontSize: 13 }}>
                +{r.actualPoints}
              </Tag>
              <div style={{ fontSize: 11, color: '#999' }}>预计 {r.estimatedPoints}</div>
            </div>
          ) : (
            <Tag color="blue">{r.estimatedPoints} 积分</Tag>
          )}
        </div>
      ),
    },
    {
      title: '回收员',
      dataIndex: 'collectorName',
      width: 100,
      render: (v?: string) => v || <span style={{ color: '#bbb' }}>未分配</span>,
    },
    {
      title: '评价',
      width: 120,
      render: (_: any, r: Appointment) =>
        r.rating ? (
          <Rate disabled defaultValue={r.rating} size="small" />
        ) : (
          <span style={{ color: '#bbb' }}>-</span>
        ),
    },
    {
      title: '状态',
      width: 100,
      dataIndex: 'status',
      render: (v: string) => (
        <Tag color={statusMap[v].color} style={{ fontSize: 12 }}>
          {statusMap[v].label}
        </Tag>
      ),
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, r: Appointment) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/resident/appointments/${r.id}`)}
          >
            详情
          </Button>
          {(r.status === 'pending' || r.status === 'accepted') && (
            <Button
              type="link"
              danger
              size="small"
              icon={<CloseOutlined />}
              loading={cancelling === r.id}
              onClick={() => handleCancel(r.id)}
            >
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="我的预约记录"
      style={{ borderRadius: 12 }}
      extra={
        <Space>
          <Select
            value={filter}
            onChange={setFilter}
            style={{ width: 140 }}
            size="middle"
          >
            <Option value="all">全部状态</Option>
            <Option value="pending">待接单</Option>
            <Option value="accepted">已接单</Option>
            <Option value="completed">已完成</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/resident/appointments/new')}>
            提交预约
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filteredData}
        scroll={{ x: 900 }}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />
    </Card>
  );
}
