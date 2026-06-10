import { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Steps,
  Tooltip,
  Divider,
  Tag,
  Alert,
  message,
  Spin,
  Result,
} from 'antd';
import { InfoCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { categoryApi, capacityApi, appointmentApi, Category, TimeSlot, Appointment } from '../../api';
import { useAuthStore } from '../../store/authStore';

export default function AppointmentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Map<number, number>>(new Map());
  const [date, setDate] = useState<Dayjs | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingAppointment, setLoadingAppointment] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    const init = async () => {
      const catRes = await categoryApi.list();
      if (catRes.success) setCategories(catRes.data || []);

      if (isEdit) {
        setLoadingAppointment(true);
        try {
          const res = await appointmentApi.get(parseInt(id || '0'));
          if (res.success && res.data) {
            const apt = res.data;
            if (apt.status !== 'pending') {
              message.error('只能修改待接单状态的预约');
              navigate(-1);
              return;
            }
            setAppointment(apt);
            const selectedMap = new Map<number, number>();
            apt.items.forEach((item) => {
              selectedMap.set(item.categoryId, item.estimatedQuantity);
            });
            setSelected(selectedMap);
            setDate(dayjs(apt.expectedDate));
            setSelectedSlot(apt.expectedTimeSlot);
            form.setFieldsValue({ address: apt.address });
          }
        } finally {
          setLoadingAppointment(false);
        }
      } else {
        form.setFieldsValue({ address: user?.address });
      }
    };
    init();
  }, [user, form, id, isEdit, navigate]);

  useEffect(() => {
    if (date) {
      setLoadingSlots(true);
      capacityApi.list(date.format('YYYY-MM-DD')).then((r) => {
        if (r.success) setTimeSlots(r.data || []);
        setLoadingSlots(false);
        setSelectedSlot('');
      });
    } else {
      setTimeSlots([]);
    }
  }, [date]);

  const estimatedPoints = Array.from(selected.entries()).reduce((sum, [id, qty]) => {
    const cat = categories.find((c) => c.id === id);
    return sum + (cat ? Math.round(cat.pointsPerUnit * qty) : 0);
  }, 0);

  const toggleCategory = (cat: Category) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(cat.id)) {
        next.delete(cat.id);
      } else {
        next.set(cat.id, 1);
      }
      return next;
    });
  };

  const updateQty = (id: number, val: number | null) => {
    if (val === null || val <= 0) return;
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(id, val);
      return next;
    });
  };

  const canNext = () => {
    if (step === 0) return selected.size > 0;
    if (step === 1) return !!selectedSlot;
    return true;
  };

  const handleSubmit = async () => {
    await form.validateFields();
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      const items = Array.from(selected.entries()).map(([categoryId, estimatedQuantity]) => ({
        categoryId,
        estimatedQuantity,
      }));

      if (isEdit) {
        const res = await appointmentApi.update(parseInt(id || '0'), {
          address: values.address,
          expectedDate: date!.format('YYYY-MM-DD'),
          expectedTimeSlot: selectedSlot,
          items,
        });
        if (res.success) {
          message.success('预约修改成功！时段容量已自动调整');
          navigate(`/resident/appointments/${id}`);
        }
      } else {
        const res = await appointmentApi.create({
          address: values.address,
          expectedDate: date!.format('YYYY-MM-DD'),
          expectedTimeSlot: selectedSlot,
          items,
        });
        if (res.success) {
          message.success('预约提交成功！预计可获得积分已计算');
          navigate(`/resident/appointments/${res.data?.id}`);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAppointment) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: '#999' }}>加载预约信息中...</div>
      </div>
    );
  }

  if (isEdit && !appointment) {
    return <Result status="404" title="预约不存在" extra={<Button onClick={() => navigate(-1)}>返回</Button>} />;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          {isEdit ? '返回详情' : '返回列表'}
        </Button>
      </div>

      <Card style={{ borderRadius: 12, marginBottom: 20 }}>
        <Steps current={step} style={{ maxWidth: 600, margin: '0 auto' }}>
          <Steps.Step title="选择回收物" />
          <Steps.Step title="预约时间" />
          <Steps.Step title={isEdit ? '确认修改' : '确认提交'} />
        </Steps>
      </Card>

      {step === 0 && (
        <Card title={isEdit ? '修改回收物品类' : '选择回收物品类'} style={{ borderRadius: 12 }}>
          <div className="category-grid" style={{ marginBottom: 24 }}>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`category-item ${selected.has(cat.id) ? 'selected' : ''}`}
                onClick={() => toggleCategory(cat)}
              >
                <div className="cat-icon">{cat.icon}</div>
                <div className="cat-name">{cat.name}</div>
                <div className="cat-points">
                  {cat.pointsPerUnit}积分/{cat.unit}
                </div>
                <Tooltip title={cat.tips} placement="bottom">
                  <Tag
                    icon={<InfoCircleOutlined />}
                    style={{ marginTop: 6, cursor: 'help', border: 'none' }}
                  >
                    投放须知
                  </Tag>
                </Tooltip>
              </div>
            ))}
          </div>

          {selected.size > 0 && (
            <>
              <Divider orientation="left">填写数量</Divider>
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {Array.from(selected.entries()).map(([id, qty]) => {
                  const cat = categories.find((c) => c.id === id)!;
                  return (
                    <Col xs={24} sm={12} md={8} key={id}>
                      <Card size="small" style={{ borderRadius: 8, background: '#fafafa' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                          <div style={{ fontSize: 28 }}>{cat.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{cat.name}</div>
                            <div style={{ color: '#999', fontSize: 12 }}>
                              {cat.pointsPerUnit}积分/{cat.unit}，约{' '}
                              {Math.round(cat.pointsPerUnit * qty)}积分
                            </div>
                          </div>
                          <InputNumber
                            min={0.1}
                            step={cat.unit === '个' || cat.unit === '件' || cat.unit === '节' ? 1 : 0.5}
                            value={qty}
                            onChange={(v) => updateQty(id, v)}
                            addonAfter={cat.unit}
                            style={{ width: 130 }}
                          />
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>

              <Alert
                showIcon
                type="success"
                message={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>已选择 {selected.size} 类回收物，预计可获得</span>
                    <Tag color="orange" style={{ fontSize: 18, padding: '4px 16px', borderRadius: 16 }}>
                      🏆 {estimatedPoints} 环保积分
                    </Tag>
                  </div>
                }
                style={{ marginBottom: 16 }}
              />
            </>
          )}

          <div style={{ textAlign: 'right' }}>
            <Button type="primary" size="large" onClick={() => setStep(1)} disabled={!canNext()}>
              下一步：{isEdit ? '修改时间' : '选择时间'}
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card title={isEdit ? "修改预约时间" : "选择预约时间"} style={{ borderRadius: 12 }}>
          <Form layout="vertical" form={form}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="回收地址"
                  name="address"
                  rules={[{ required: true, message: '请输入回收地址' }]}
                >
                  <Input.TextArea rows={2} placeholder="请输入详细的上门回收地址" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="上门日期"
                  rules={[{ required: true, message: '请选择日期' }]}
                >
                  <DatePicker
                    style={{ width: '100%', height: 40 }}
                    minDate={dayjs()}
                    maxDate={dayjs().add(14, 'day')}
                    value={date}
                    onChange={(d) => setDate(d)}
                    disabledDate={(d) => d.day() === 0}
                    format="YYYY年MM月DD日"
                  />
                </Form.Item>
              </Col>
            </Row>

            {date && (
              <>
                <Divider orientation="left">
                  {date.format('YYYY年MM月DD日')} 可选时段
                </Divider>
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  {timeSlots.map((slot) => (
                    <Col xs={12} sm={6} key={slot.timeSlot}>
                      <div
                        className={`time-slot-card ${slot.full ? 'disabled' : ''} ${
                          selectedSlot === slot.timeSlot ? 'selected' : ''
                        }`}
                        onClick={() => !slot.full && setSelectedSlot(slot.timeSlot)}
                      >
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                          {slot.timeSlot}
                        </div>
                        <div style={{ fontSize: 12 }}>
                          {slot.full ? (
                            <span style={{ color: '#ff4d4f' }}>已约满</span>
                          ) : (
                            <span>剩余 {slot.available} 个名额</span>
                          )}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </Form>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <Button size="large" onClick={() => setStep(0)}>
              上一步
            </Button>
            <Button type="primary" size="large" onClick={() => setStep(2)} disabled={!canNext()}>
              下一步：{isEdit ? '确认修改' : '确认信息'}
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title={isEdit ? "确认修改信息" : "确认预约信息"} style={{ borderRadius: 12 }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#888', fontSize: 13, marginBottom: 6 }}>📍 上门地址</div>
              <div style={{ fontSize: 15, fontWeight: 500, padding: 12, background: '#f6ffed', borderRadius: 8 }}>
                {form.getFieldValue('address')}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#888', fontSize: 13, marginBottom: 6 }}>⏰ 上门时间</div>
              <div style={{ fontSize: 15, fontWeight: 500, padding: 12, background: '#e6f7ff', borderRadius: 8 }}>
                {date?.format('YYYY年MM月DD日')} {selectedSlot}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#888', fontSize: 13, marginBottom: 6 }}>📦 回收物清单</div>
              <div style={{ padding: 16, background: '#fafafa', borderRadius: 8 }}>
                {Array.from(selected.entries()).map(([id, qty]) => {
                  const cat = categories.find((c) => c.id === id)!;
                  return (
                    <div
                      key={id}
                      style={{ display: 'flex', padding: '8px 0', borderBottom: '1px dashed #eee' }}
                    >
                      <div style={{ fontSize: 26, width: 40 }}>{cat.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>
                          {cat.name} × {qty} {cat.unit}
                        </div>
                        <div style={{ color: '#52c41a', fontSize: 12 }}>
                          约 {Math.round(cat.pointsPerUnit * qty)} 积分
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '2px solid #ddd',
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  <span>预计可得积分</span>
                  <span style={{ color: '#fa8c16' }}>🏆 {estimatedPoints} 分</span>
                </div>
              </div>
            </div>

            <Alert
              type="info"
              showIcon
              message={isEdit ? "温馨提示：修改后时段容量将自动调整，旧时段释放、新时段占用" : "温馨提示：实际积分为回收员上门后按实际称重/数量结算，可能与预计略有差异"}
              style={{ marginBottom: 20 }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button size="large" onClick={() => setStep(1)}>
                上一步
              </Button>
              <Button type="primary" size="large" loading={submitting} onClick={handleSubmit}>
                {isEdit ? "确认修改预约" : "确认提交预约"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
