import { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Rate,
  List,
  Modal,
  Input,
  message,
  Space,
  Result,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftOutlined, StarOutlined } from '@ant-design/icons';
import { Appointment, appointmentApi } from '../../api';

const statusMap: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待接单' },
  accepted: { color: 'processing', label: '已接单' },
  completed: { color: 'success', label: '已完成' },
  cancelled: { colour: 'error', label: '已取消' },
};

export default function ResidentAppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [rateModal, setRateModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await appointmentApi.get(parseInt(id || '0'));
      if (res.success) setData(res.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleRate = async () => {
    if (!rating) {
      message.warning('请选择评分星级');
      return;
    }
    setSubmitting(true);
    try {
      await appointmentApi.rate(parseInt(id || '0'), rating, comment);
      message.success('评价成功');
      setRateModal(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    Modal.confirm({
      title: '确认取消预约',
      content: '确定要取消该上门回收预约吗？',
      okText: '确认取消',
      okType: 'danger',
      onOk: async () => {
        await appointmentApi.cancel(parseInt(id || '0'));
        message.success('已取消预约');
        load();
      },
    });
  };

  if (!data && !loading) {
    return <Result status="404" title="预约不存在" subTitle="可能已被删除" extra={<Button onClick={() => navigate(-1)}>返回</Button>} />;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回列表
        </Button>
      </div>

      <Card
        loading={loading}
        style={{ borderRadius: 12 }}
        title={
          <Space>
            <span>预约详情 #{data?.id}</span>
            {data && <Tag color={statusMap[data.status].color} style={{ fontSize: 13 }}>{statusMap[data.status].label}</Tag>}
          </Space>
        }
        extra={
          data && (data.status === 'pending' || data.status === 'accepted') && (
            <Button danger onClick={handleCancel}>取消预约</Button>
          )
        }
      >
        {data && (
          <>
            <Descriptions column={2} bordered size="middle" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="预约时间" span={2}>
                {data.createdAt}
              </Descriptions.Item>
              <Descriptions.Item label="上门日期">
                <strong>{data.expectedDate}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="上门时段">
                <strong>{data.expectedTimeSlot}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="回收地址" span={2}>
                📍 {data.address}
              </Descriptions.Item>
              <Descriptions.Item label="回收员">
                {data.collectorName ? `${data.collectorName} (${data.collectorPhone})` : <span style={{ color: '#bbb' }}>等待接单中...</span>}
              </Descriptions.Item>
              <Descriptions.Item label="预计积分">
                <Tag color="blue">{data.estimatedPoints}</Tag>
              </Descriptions.Item>
              {data.status === 'completed' && (
                <>
                  <Descriptions.Item label="实际获得积分">
                    <Tag color="orange" style={{ fontSize: 14 }}>+{data.actualPoints}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="完成时间">
                    {data.completedAt}
                  </Descriptions.Item>
                </>
              )}
              {data.status === 'accepted' && (
                <Descriptions.Item label="接单时间">{data.acceptedAt}</Descriptions.Item>
              )}
            </Descriptions>

            <Card size="small" title="📦 回收物清单" style={{ borderRadius: 8, marginBottom: 24 }}>
              <List
                dataSource={data.items}
                renderItem={(item) => (
                  <List.Item key={item.id}>
                    <List.Item.Meta
                      avatar={<div style={{ fontSize: 32 }}>{item.icon}</div>}
                      title={
                        <Space>
                          <strong>{item.categoryName}</strong>
                          <Tag color="green">
                            {item.pointsPerUnit}积分/{item.unit}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                          <span>预计：{item.estimatedQuantity} {item.unit} ≈ {Math.round(item.pointsPerUnit * item.estimatedQuantity)}积分</span>
                          {data.status === 'completed' && item.actualQuantity !== undefined && (
                            <span style={{ color: '#fa8c16', fontWeight: 600 }}>
                              实际：{item.actualQuantity} {item.unit} = {Math.round(item.pointsPerUnit * item.actualQuantity)}积分
                            </span>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
              <div
                style={{
                  textAlign: 'right',
                  padding: 12,
                  borderTop: '2px solid #eee',
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {data.status === 'completed' ? (
                  <span>实际结算：<span style={{ color: '#fa8c16', fontSize: 18 }}>🏆 {data.actualPoints} 积分</span></span>
                ) : (
                  <span>预计积分：<span style={{ color: '#1890ff', fontSize: 18 }}>🏆 {data.estimatedPoints} 积分</span></span>
                )}
              </div>
            </Card>

            {data.photoUrl && (
              <Card size="small" title="📷 现场照片" style={{ borderRadius: 8, marginBottom: 24 }}>
                <img
                  src={data.photoUrl}
                  alt="回收现场"
                  style={{ maxWidth: 400, borderRadius: 8, border: '1px solid #eee' }}
                />
              </Card>
            )}

            {data.status === 'completed' && (
              <Card
                size="small"
                title={
                  <Space>
                    <StarOutlined style={{ color: '#faad14' }} />
                    服务评价
                  </Space>
                }
                style={{ borderRadius: 8 }}
                extra={
                  !data.rating ? (
                    <Button type="primary" onClick={() => setRateModal(true)}>
                      去评价
                    </Button>
                  ) : null
                }
              >
                {data.rating ? (
                  <div>
                    <Rate disabled defaultValue={data.rating} style={{ fontSize: 24 }} />
                    {data.comment && (
                      <div style={{ marginTop: 8, padding: 12, background: '#fafafa', borderRadius: 8 }}>
                        {data.comment}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#999', padding: '20px 0', textAlign: 'center' }}>
                    您还未对本次服务进行评价
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </Card>

      <Modal
        title="评价回收服务"
        open={rateModal}
        onCancel={() => setRateModal(false)}
        onOk={handleRate}
        confirmLoading={submitting}
        okText="提交评价"
      >
        <div style={{ textAlign: 'center', padding: 12 }}>
          <div style={{ fontSize: 15, marginBottom: 12 }}>请为本次服务打分</div>
          <Rate value={rating} onChange={setRating} style={{ fontSize: 36 }} />
          <div style={{ marginTop: 4, height: 20, color: '#fa8c16', fontWeight: 600 }}>
            {rating ? `${rating} 星` : ''}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>评价内容（选填）</div>
          <Input.TextArea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="说说您对本次回收服务的感受..."
            maxLength={200}
            showCount
          />
        </div>
      </Modal>
    </div>
  );
}
