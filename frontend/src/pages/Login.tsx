import { useState } from 'react';
import { Form, Input, Button, Card, Select, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore } from '../store/authStore';

const { Option } = Select;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const accounts = [
    { label: '居民 - 张三', username: 'resident1', password: '123456' },
    { label: '居民 - 李四', username: 'resident2', password: '123456' },
    { label: '回收员 - 刘回收', username: 'collector1', password: '123456' },
    { label: '回收员 - 陈师傅', username: 'collector2', password: '123456' },
    { label: '管理员', username: 'admin', password: 'admin123' },
  ];

  const handleQuickSelect = (value: string) => {
    const acc = accounts.find((a) => a.username === value);
    if (acc) {
      form.setFieldsValue({ username: acc.username, password: acc.password });
    }
  };

  const [form] = Form.useForm();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authApi.login(values.username, values.password);
      if (res.success && res.data) {
        const { token, user } = res.data;
        setAuth(token, user);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        message.success(`欢迎回来，${user.realName}！`);
        const path =
          user.role === 'resident'
            ? '/resident/home'
            : user.role === 'collector'
            ? '/collector/tasks'
            : '/admin/dashboard';
        navigate(path);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <div className="login-icon">♻️</div>
          <div className="login-title">社区废旧物品回收服务</div>
          <div className="login-subtitle">环保回收 · 积分激励 · 绿色社区</div>
        </div>
        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          <Form.Item label="快捷登录" name="quick">
            <Select placeholder="选择测试账号" allowClear onChange={handleQuickSelect}>
              {accounts.map((acc) => (
                <Option key={acc.username} value={acc.username}>
                  {acc.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登 录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 16 }}>
          测试账号：居民 resident1/123456 &nbsp;|&nbsp; 回收员 collector1/123456 &nbsp;|&nbsp; 管理员 admin/admin123
        </div>
      </Card>
    </div>
  );
}
