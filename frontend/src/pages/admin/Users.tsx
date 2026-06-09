import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Descriptions,
  Space,
  Row,
  Col,
  InputNumber,
  Rate,
  Image,
  Empty,
} from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { User, userApi } from '../../api';

const roleLabels: Record<string, string> = {
  resident: '居民',
  collector: '回收员',
  admin: '管理员',
};
const roleColors: Record<string, string> = {
  resident: 'blue',
  collector: 'orange',
  admin: 'purple',
};

export default function AdminUsers() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await userApi.list();
      if (res.success) setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = data.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (keyword) {
      const k = keyword.toLowerCase();
      if (
        !u.username.toLowerCase().includes(k) &&
        !(u.realName || '').toLowerCase().includes(k) &&
        !(u.phone || '').includes(keyword)
      )
        return false;
    }
    return true;
  });

  const openAdd = () => {
    setEditItem(null);
    form.resetFields();
    form.setFieldsValue({ role: 'resident' });
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditItem(u);
    form.setFieldsValue({
      username: u.username,
      realName: u.realName,
      phone: u.phone,
      role: u.role,
      community: u.community,
    });
    setModalOpen(true);
  };

  const handleDelete = (u: User) => {
    Modal.confirm({
      title: `删除用户「${u.realName || u.username}」`,
      content: '此操作不可恢复，是否继续？',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await userApi.del(u.id);
          message.success('已删除');
          load();
        } catch (e: any) {
          message.error(e?.message || '删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const vals = await form.validateFields();
      setSubmitting(true);
      if (editItem) {
        await userApi.update(editItem.id, vals);
        message.success('修改成功');
      } else {
        await userApi.create(vals);
        message.success('创建成功');
      }
      setModalOpen(false);
      load();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '用户',
      dataIndex: 'realName',
      render: (_: any, r: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: `linear-gradient(135deg, #${((r.id * 9301) % 0xffffff).toString(16).padStart(6, '0').slice(0, 6)}, #999)`,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            {(r.realName || r.username).charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{r.realName || r.username}</div>
            <div style={{ fontSize: 12, color: '#999' }}>@{r.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 100,
      render: (r: string) => <Tag color={roleColors[r]}>{roleLabels[r]}</Tag>,
    },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    {
      title: '所属社区',
      dataIndex: 'community',
      width: 160,
      render: (v: string) => v || <span style={{ color: '#bbb' }}>-</span>,
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => v?.replace('T', ' ').slice(0, 16),
    },
    {
      title: '操作',
      key: 'act',
      width: 180,
      render: (_: any, r: User) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      style={{ borderRadius: 12 }}
      title={
        <Space wrap>
          <Select
            allowClear
            placeholder="按角色筛选"
            value={roleFilter}
            onChange={setRoleFilter}
            style={{ width: 140 }}
            options={[
              { value: 'resident', label: '居民' },
              { value: 'collector', label: '回收员' },
              { value: 'admin', label: '管理员' },
            ]}
          />
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索姓名/用户名/电话"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 240 }}
          />
        </Space>
      }
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>添加用户</Button>}
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={filtered}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      <Modal
        title={editItem ? '编辑用户' : '新增用户'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="登录账号" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input disabled={!!editItem} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="密码" name="password" rules={editItem ? [] : [{ required: true, message: '请输入密码' }]}>
                <Input.Password placeholder={editItem ? '不修改请留空' : '默认123456'} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="真实姓名" name="realName" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="手机号" name="phone">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="角色" name="role" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'resident', label: '居民' },
                    { value: 'collector', label: '回收员' },
                    { value: 'admin', label: '管理员' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="所属社区" name="community">
                <Input placeholder="如：阳光社区" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}
