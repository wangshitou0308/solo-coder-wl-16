import { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  List,
  Tag,
  Button,
  Avatar,
  Empty,
  Space,
  Rate,
  Badge,
  message,
  Modal,
} from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  CheckOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Appointment, appointmentApi } from '../../api';

const statusColor: Record<string, string> = {
  pending: 'default',
  assigned: 'blue',
  accepted: 'processing',
  completed: 'success',
  cancelled: 'error',
};

const statusLabel: Record<string, string> = {
  pending: '待分派',
  assigned: '待接单',
  accepted: '待上门',
  completed: '已完成',
  cancelled: '已取消',
};

export default function CollectorTasks() {
  const navigate = useNavigate();
  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [accepting, setAccepting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await appointmentApi.myList();
      if (res.success) setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (id: number) => {
    Modal.confirm({
      title: '确认接单',
      content: '确定要接这个回收订单吗？',
      okText: '确认接单',
      onOk: async () => {
        setAccepting(id);
        try {
          await appointmentApi.accept(id);
          message.success('接单成功');
          load();
        } finally {
          setAccepting(null);
        }
      },
    });
  };

  const filterData = (status: string) => {
    if (status === 'all') return data;
    if (status === 'mine') return data.filter((d) => d.status === 'assigned' || d.status === 'accepted' || d.status === 'completed');
    return data.filter((d) => d.status === status);
  };

  const renderList = (list: Appointment[]) =>
    list.length === 0 ? (
      <Empty description="暂无订单" style={{ padding: 60 }} />
    ) : (
      <List
        dataSource={list}
        renderItem={(item) => (
          <Card
            key={item.id}
            size="small"
            style={{ marginBottom: 12, borderRadius: 10 }}
            bodyStyle={{ padding: 16 }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar style={{ backgroundColor: item.collectorId ? '#fa8c16' : '#1890ff', verticalAlign: 'middle' }}>
                      {item.residentName?.charAt(0) || '居'}
                    </Avatar>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.residentName}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        <PhoneOutlined /> {item.residentPhone}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Tag color={statusColor[item.status]} style={{ fontSize: 12 }}>
                      {statusLabel[item.status]}
                    </Tag>
                    <div style={{ fontSize: 11, color: '#bbb', textAlign: 'right', marginTop: 2 }}>
                      #{item.id}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
                  <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                    <span>
                      <ClockCircleOutlined style={{ color: '#fa8c16', marginRight: 4 }} />
                      {item.expectedDate} {item.expectedTimeSlot}
                    </span>
                    {item.actualPoints !== undefined && (
                      <span style={{ color: '#fa8c16', fontWeight: 600 }}>积分 +{item.actualPoints}</span>
                    )}
                  </Space>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: '#555',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 4,
                  }}
                >
                  <EnvironmentOutlined style={{ color: '#f5222d', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.address}</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  {item.items.map((it) => (
                    <Badge
                      key={it.id}
                      count={`${it.estimatedQuantity}${it.unit}`}
                      style={{ backgroundColor: '#52c41a', marginRight: 8, marginBottom: 4 }}
                    >
                      <Tag
                        style={{
                          padding: '2px 8px 2px 28px',
                          border: 'none',
                          background: '#f6ffed',
                          color: '#389e0d',
                          borderRadius: 14,
                        }}
                      >
                        {it.icon} {it.categoryName}
                      </Tag>
                    </Badge>
                  ))}
                  <Tag color="blue" style={{ borderRadius: 14, padding: '2px 10px' }}>
                    预计 {item.estimatedPoints} 积分
                  </Tag>
                </div>

                {item.rating && (
                  <div style={{ marginBottom: 12, padding: 8, background: '#fffbe6', borderRadius: 6 }}>
                    <Rate disabled defaultValue={item.rating} size="small" />
                    {item.comment && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{item.comment}</div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/collector/tasks/${item.id}`)}>
                    详情
                  </Button>
                  {item.status === 'assigned' && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckOutlined />}
                      loading={accepting === item.id}
                      onClick={() => handleAccept(item.id)}
                    >
                      确认接单
                    </Button>
                  )}
                  {item.status === 'accepted' && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => navigate(`/collector/tasks/${item.id}`)}
                      style={{ background: '#fa8c16', border: 'none' }}
                    >
                      处理完成
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
      />
    );

  const countAssigned = data.filter((d) => d.status === 'assigned').length;
  const countAccepted = data.filter((d) => d.status === 'accepted').length;
  const countMine = data.filter((d) => d.status === 'assigned' || d.status === 'accepted' || d.status === 'completed').length;

  return (
    <Card
      style={{ borderRadius: 12 }}
      title={
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          style={{ marginBottom: -24 }}
          items={[
            {
              key: 'all',
              label: <span>全部 <Tag style={{ marginLeft: 4 }}>{data.length}</Tag></span>,
            },
            {
              key: 'assigned',
              label: (
                <span>
                  待接单
                  {countAssigned > 0 && (
                    <Badge
                      count={countAssigned}
                      style={{ backgroundColor: '#1890ff', marginLeft: 6 }}
                      offset={[-2, -2]}
                    >
                      <Tag style={{ marginLeft: 4, visibility: 'hidden' }}>0</Tag>
                    </Badge>
                  )}
                </span>
              ),
            },
            {
              key: 'accepted',
              label: (
                <span>
                  待上门
                  {countAccepted > 0 && (
                    <Tag color="processing" style={{ marginLeft: 4 }}>{countAccepted}</Tag>
                  )}
                </span>
              ),
            },
            {
              key: 'mine',
              label: <span>我的任务 <Tag style={{ marginLeft: 4 }}>{countMine}</Tag></span>,
            },
          ]}
        />
      }
      bodyStyle={{ padding: 16 }}
    >
      <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', paddingRight: 8 }}>
        {renderList(filterData(activeTab))}
      </div>
    </Card>
  );
}
