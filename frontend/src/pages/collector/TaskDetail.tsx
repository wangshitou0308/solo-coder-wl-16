import { useEffect, useRef, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  InputNumber,
  List,
  Form,
  Upload,
  message,
  Result,
  Space,
  Image,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftOutlined, CameraOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload/interface';
import { Appointment, appointmentApi, uploadApi } from '../../api';

export default function CollectorTaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualQtys, setActualQtys] = useState<Record<number, number>>({});
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await appointmentApi.get(parseInt(id || '0'));
      if (res.success) {
        const d = res.data || null;
        setData(d);
        if (d) {
          const qtys: Record<number, number> = {};
          d.items.forEach((it) => {
            qtys[it.id] = it.actualQuantity ?? it.estimatedQuantity;
          });
          setActualQtys(qtys);
          setPhotoUrl(d.photoUrl || '');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const calcActualPoints = () =>
    data?.items.reduce(
      (sum, it) => sum + Math.round(it.pointsPerUnit * (actualQtys[it.id] || 0)),
      0
    ) || 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        try {
          const res = await uploadApi.image(base64, `appt_${id}_${Date.now()}.jpg`);
          if (res.success && res.data) {
            setPhotoUrl(res.data.url);
            message.success('照片上传成功');
          }
        } catch {
          setPhotoUrl(base64);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    const missing = data?.items.filter((it) => !(actualQtys[it.id] > 0));
    if (missing && missing.length > 0) {
      message.warning('请填写所有回收物的实际数量');
      return;
    }
    if (!photoUrl) {
      message.warning('请上传现场照片');
      return;
    }
    setSubmitting(true);
    try {
      const actualItems = (data?.items || []).map((it) => ({
        id: it.id,
        actualQuantity: actualQtys[it.id] || 0,
      }));
      const actualPoints = calcActualPoints();
      await appointmentApi.complete(parseInt(id || '0'), { actualItems, photoUrl });
      message.success(`回收完成，居民获得 ${actualPoints} 积分`);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  if (!data && !loading) {
    return <Result status="404" title="订单不存在" extra={<Button onClick={() => navigate(-1)}>返回</Button>} />;
  }

  const canComplete = data?.status === 'accepted';

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回列表
        </Button>
      </div>

      <Card loading={loading} style={{ borderRadius: 12, marginBottom: 16 }} title={`回收任务 #${data?.id}`}>
        {data && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="居民">
                <strong>{data.residentName}</strong> ({data.residentPhone})
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag
                  color={
                    data.status === 'pending'
                      ? 'default'
                      : data.status === 'accepted'
                      ? 'processing'
                      : data.status === 'completed'
                      ? 'success'
                      : 'error'
                  }
                >
                  {data.status === 'pending'
                    ? '待接单'
                    : data.status === 'accepted'
                    ? '已接单待上门'
                    : data.status === 'completed'
                    ? '已完成'
                    : '已取消'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="上门时间" span={2}>
                📅 {data.expectedDate} &nbsp; ⏰ {data.expectedTimeSlot}
              </Descriptions.Item>
              <Descriptions.Item label="回收地址" span={2}>
                📍 {data.address}
              </Descriptions.Item>
              {data.status === 'completed' && (
                <Descriptions.Item label="完成时间" span={2}>
                  {data.completedAt}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Card
              size="small"
              title="📦 回收物清单 - 填写实际数量"
              style={{ borderRadius: 8, marginBottom: 20 }}
              extra={
                <span>
                  预计总积分 <Tag color="blue">{data.estimatedPoints}</Tag>
                  {canComplete && (
                    <Tag color="orange" style={{ marginLeft: 8, fontSize: 13 }}>
                      实际结算积分：<strong>{calcActualPoints()}</strong>
                    </Tag>
                  )}
                  {data.status === 'completed' && (
                    <Tag color="success" style={{ marginLeft: 8, fontSize: 13 }}>
                      实际积分：<strong>{data.actualPoints}</strong>
                    </Tag>
                  )}
                </span>
              }
            >
              <List
                dataSource={data.items}
                renderItem={(it) => (
                  <List.Item key={it.id}>
                    <List.Item.Meta
                      avatar={<div style={{ fontSize: 32 }}>{it.icon}</div>}
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <strong>{it.categoryName}</strong>
                          <Tag color="green">
                            {it.pointsPerUnit}积分/{it.unit}
                          </Tag>
                          <Tag color="default">预计 {it.estimatedQuantity}{it.unit}</Tag>
                        </div>
                      }
                      description={
                        <div style={{ color: '#888', fontSize: 12 }}>
                          预计积分 ≈ {Math.round(it.pointsPerUnit * it.estimatedQuantity)}
                          {canComplete && (
                            <span style={{ color: '#fa8c16', marginLeft: 12 }}>
                              实际积分 ≈ {Math.round(it.pointsPerUnit * (actualQtys[it.id] || 0))}
                            </span>
                          )}
                        </div>
                      }
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#666', fontSize: 13 }}>实际：</span>
                      <InputNumber
                        min={0}
                        step={it.unit === '个' || it.unit === '件' || it.unit === '节' ? 1 : 0.5}
                        value={actualQtys[it.id]}
                        disabled={!canComplete}
                        onChange={(v) =>
                          setActualQtys((prev) => ({ ...prev, [it.id]: v || 0 }))
                        }
                        addonAfter={it.unit}
                        style={{ width: 140 }}
                      />
                    </div>
                  </List.Item>
                )}
              />
            </Card>

            {canComplete && (
              <Card
                size="small"
                title="📷 上传现场照片"
                style={{ borderRadius: 8, marginBottom: 20 }}
                extra={
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                }
              >
                {photoUrl ? (
                  <div>
                    <Image
                      src={photoUrl.startsWith('data:') ? photoUrl : photoUrl}
                      alt="现场照片"
                      width={280}
                      style={{ borderRadius: 8, border: '1px solid #eee' }}
                    />
                    <div style={{ marginTop: 10 }}>
                      <Button size="small" onClick={() => fileInputRef.current?.click()} loading={uploading}>
                        重新上传
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    icon={<CameraOutlined />}
                    size="large"
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploading}
                    style={{
                      width: 280,
                      height: 180,
                      border: '2px dashed #d9d9d9',
                      borderRadius: 10,
                      color: '#999',
                      fontSize: 15,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <CameraOutlined style={{ fontSize: 36, color: '#52c41a' }} />
                    <span>点击拍照/上传照片</span>
                  </Button>
                )}
              </Card>
            )}

            {data.status === 'completed' && data.photoUrl && (
              <Card size="small" title="📷 现场照片" style={{ borderRadius: 8, marginBottom: 20 }}>
                <Image
                  src={data.photoUrl}
                  alt="回收现场"
                  width={320}
                  style={{ borderRadius: 8 }}
                />
              </Card>
            )}

            {canComplete && (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleComplete}
                  loading={submitting}
                  style={{
                    background: 'linear-gradient(135deg, #52c41a, #389e0d)',
                    border: 'none',
                    padding: '0 48px',
                    height: 48,
                    fontSize: 16,
                    borderRadius: 24,
                    fontWeight: 600,
                  }}
                >
                  ✅ 确认完成回收（积分入账）
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
