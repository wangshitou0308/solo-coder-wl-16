import { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Row,
  Col,
  Avatar,
  message,
  Divider,
  Tag,
  Descriptions,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  EditOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { authApi, UserInfo } from '../api';
import { useAuthStore } from '../store/authStore';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await authApi.getMe();
      if (res.success && res.data) {
        const userData = res.data;
        form.setFieldsValue(userData);
        setUser(userData);
      }
    } catch {
      message.error('加载个人信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await authApi.updateProfile(values);
      if (res.success && res.data) {
        setUser(res.data);
        setEditing(false);
        message.success('个人信息更新成功');
      }
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    form.setFieldsValue(user);
    setEditing(false);
  };

  const roleLabel: Record<string, string> = {
    resident: '居民',
    collector: '回收员',
    admin: '管理员',
  };

  const roleColor: Record<string, string> = {
    resident: 'green',
    collector: 'orange',
    admin: 'blue',
  };

  return (
    <div>
      <Card
        style={{ borderRadius: 12, maxWidth: 800, margin: '0 auto' }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <UserOutlined style={{ color: '#52c41a' }} />
            个人信息
          </div>
        }
        extra={
          !editing ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
            >
              编辑
            </Button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button icon={<ReloadOutlined />} onClick={handleCancel}>
                取消
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
              >
                保存
              </Button>
            </div>
          )
        }
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Avatar
            size={80}
            style={{ backgroundColor: '#52c41a', fontSize: 32 }}
            icon={<UserOutlined />}
          />
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 600 }}>
              {user?.nickname || user?.realName}
            </span>
            <Tag color={roleColor[user?.role || '']} style={{ marginLeft: 8 }}>
              {roleLabel[user?.role || '']}
            </Tag>
          </div>
          <div style={{ color: '#999', marginTop: 4 }}>
            账号：{user?.username}
          </div>
        </div>

        <Divider />

        <Form form={form} layout="vertical" disabled={!editing}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="真实姓名"
                name="realName"
                rules={[{ required: true, message: '请输入真实姓名' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="请输入真实姓名" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="昵称" name="nickname">
                <Input placeholder="请输入昵称（选填）" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="手机号"
                name="phone"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
                ]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="所属社区" name="community">
                <Input prefix={<HomeOutlined />} placeholder="请输入所属社区（选填）" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="常用地址"
            name="address"
            extra="提交预约时将自动填入该地址作为默认回收地址"
          >
            <Input.TextArea
              rows={2}
              prefix={<EnvironmentOutlined />}
              placeholder="请输入详细地址，如：阳光社区1号楼101室"
            />
          </Form.Item>
        </Form>

        {!editing && user && (
          <>
            <Divider />
            <Card
              size="small"
              title="账户信息"
              style={{ borderRadius: 8, background: '#fafafa' }}
            >
              <Descriptions column={2} size="small">
                <Descriptions.Item label="用户ID">{user.id}</Descriptions.Item>
                <Descriptions.Item label="注册时间">
                  {user.createdAt?.replace('T', ' ').slice(0, 16)}
                </Descriptions.Item>
                <Descriptions.Item label="用户角色" span={2}>
                  <Tag color={roleColor[user.role]}>{roleLabel[user.role]}</Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </>
        )}
      </Card>
    </div>
  );
}
