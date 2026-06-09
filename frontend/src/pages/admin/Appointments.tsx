import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Select,
  message,
  Descriptions,
  Space,
  Input,
  Rate,
  Image,
  List,
  Result,
} from 'antd';
import { SearchOutlined, EyeOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Appointment, appointmentApi } from '../../api';

const statusColor: Record<string, string> = {
  pending: 'default',
  accepted: 'processing',
  completed: 'success',
  cancelled: 'error',
};
const statusLabel: Record<string, string> = {
  pending: '待接单',
  accepted: '已接单',
  completed: '已完成',
  cancelled: '已取消',
};

export default function AdminAppointments() {
  const [data, setData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [curDetail, setCurDetail] = useState<Appointment | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await appointmentApi.list();
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
        (r.residentPhone || '').includes(keyword) ||
        (r.address || '').toLowerCase().includes(k) ||
        String(r.id).includes(keyword);
      if (!match) return false;
    }
    return true;
  });

  const openDetail = async (id: number) => {
    try {
      const res = await appointmentApi.get(id);
      if (res.success) {
        setCurDetail(res.data || null);
        setDetailVisible(true);
      }
    } catch {
      message.error('获取详情失败');
    }
  };

  const columns = [
    { title: '单号', dataIndex: 'id', width: 60 },
    {
      title: '居民',
      dataIndex: 'residentName',
      width: 120,
      render: (v: string, r: Appointment) => (
        <div>
          <div style={{ fontWeight: 500 }}>{v}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{r.residentPhone}</div>
        </div>
      ),
    },
    {
      title: '上门时间',
      width: 180,
      render: (_: any, r: Appointment) => (
        <div>
          <div style={{ fontSize: 13 }}>{r.expectedDate}</div>
          <div style={{ fontSize: 12, color: '#fa8c16' }}>{r.expectedTimeSlot}</div>
        </div>
      ),
    },
    {
      title: '地址',
      dataIndex: 'address',
      ellipsis: true,
      render: (v: string) => <span title={v}>📍 {v}</span>,
    },
    {
      title: '品类',
      width: 150,
      render: (_: any, r: Appointment) => (
        <Space size={[4, 4]} wrap>
          {r.items.slice(0, 3).map((it) => (
            <Tag key={it.id} color="green" style={{ fontSize: 11, padding: '0 6px' }}>
              {it.icon} {it.categoryName}
            </Tag>
          ))}
          {r.items.length > 3 && <Tag>等{r.items.length}类</Tag>}
        </Space>
      ),
    },
    {
      title: '回收员',
      dataIndex: 'collectorName',
      width: 100,
      render: (v: string) => v || <span style={{ color: '#bbb' }}>未接单</span>,
    },
    {
      title: '积分',
      width: 100,
      render: (_: any, r: Appointment) => (
        <div>
          <div style={{ fontSize: 11, color: '#999' }}>预计 {r.estimatedPoints}</div>
          {r.status === 'completed' && (
            <div style={{ fontSize: 13, color: '#52c41a', fontWeight: 700 }}>实际 {r.actualPoints}</div>
          )}
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
      title: '操作',
      key: 'act',
      width: 110,
      render: (_: any, r: Appointment) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <>
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
              placeholder="搜索居民/电话/地址/单号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 280 }}
            />
          </Space>
        }
        extra={<Tag color="blue">共 {filtered.length} 条</Tag>}
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filtered}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        title={curDetail ? `预约详情 #${curDetail.id}` : ''}
        footer={null}
        width={720}
        destroyOnClose
      >
        {curDetail ? (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="状态" span={2}>
                <Tag color={statusColor[curDetail.status]}>{statusLabel[curDetail.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="居民">{curDetail.residentName} ({curDetail.residentPhone})</Descriptions.Item>
              <Descriptions.Item label="回收员">
                {curDetail.collectorName || '-'} {curDetail.collectorName && curDetail.collectorPhone ? `(${curDetail.collectorPhone})` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="上门时间" span={2}>
                {curDetail.expectedDate} {curDetail.expectedTimeSlot}
              </Descriptions.Item>
              <Descriptions.Item label="回收地址" span={2}>
                📍 {curDetail.address}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{curDetail.createdAt}</Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {curDetail.status === 'completed' ? curDetail.completedAt : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="📦 回收物品" style={{ borderRadius: 8, marginBottom: 12 }} bodyStyle={{ padding: 0 }}>
              <Table
                rowKey="id"
                size="small"
                dataSource={curDetail.items}
                pagination={false}
                columns={[
                  { title: '品类', dataIndex: 'categoryName', render: (v, r: any) => `${r.icon} ${v}` },
                  { title: '单位', dataIndex: 'unit', width: 70 },
                  { title: '积分单价', dataIndex: 'pointsPerUnit', width: 80, render: (v) => `${v}分` },
                  { title: '预估数量', dataIndex: 'estimatedQuantity', width: 90 },
                  {
                    title: '实际数量',
                    dataIndex: 'actualQuantity',
                    width: 90,
                    render: (v) => (v === undefined || v === null ? <span style={{ color: '#bbb' }}>-</span> : v),
                  },
                ]}
              />
            </Card>

            {curDetail.photoUrl && (
              <Card size="small" title="📷 现场照片" style={{ borderRadius: 8, marginBottom: 12 }}>
                <Image width={240} src={curDetail.photoUrl} />
              </Card>
            )}

            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div style={{ flex: 1, padding: 12, background: '#e6f7ff', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ color: '#1890ff', fontSize: 12, marginBottom: 4 }}>预计积分</div>
                <div style={{ color: '#1890ff', fontSize: 22, fontWeight: 800 }}>{curDetail.estimatedPoints}</div>
              </div>
              <div style={{ flex: 1, padding: 12, background: '#f6ffed', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ color: '#52c41a', fontSize: 12, marginBottom: 4 }}>实际积分</div>
                <div style={{ color: '#52c41a', fontSize: 22, fontWeight: 800 }}>
                  {curDetail.status === 'completed' ? curDetail.actualPoints : '-'}
                </div>
              </div>
            </div>

            {curDetail.rating && (
              <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#d48806', marginBottom: 6 }}>📝 服务评价</div>
                <Rate disabled defaultValue={curDetail.rating} />
                {curDetail.comment && <div style={{ marginTop: 6, fontSize: 13 }}>{curDetail.comment}</div>}
              </div>
            )}
          </div>
        ) : (
          <Result status="404" title="暂无数据" />
        )}
      </Modal>
    </>
  );
}
