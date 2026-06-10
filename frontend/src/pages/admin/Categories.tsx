import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  message,
  Space,
  Popconfirm,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  OrderedListOutlined,
} from '@ant-design/icons';
import { categoryApi, Category } from '../../api';

const { Text, Paragraph } = Typography;

export default function AdminCategories() {
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Category | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await categoryApi.listAll();
      if (res.success) setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (item: Category) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      if (editingItem) {
        await categoryApi.update(editingItem.id, values);
        message.success('品类更新成功');
      } else {
        await categoryApi.create(values);
        message.success('品类创建成功');
      }
      
      setModalVisible(false);
      load();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: Category) => {
    try {
      await categoryApi.toggle(item.id);
      message.success(item.enabled ? '已下架' : '已上架');
      load();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const handleDelete = async (item: Category) => {
    try {
      await categoryApi.remove(item.id);
      message.success('删除成功');
      load();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'sort',
      width: 70,
      align: 'center' as const,
      render: (v: number) => <Tag color="blue">#{v}</Tag>,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 60,
      align: 'center' as const,
      render: (v: string) => <span style={{ fontSize: 24 }}>{v}</span>,
    },
    {
      title: '品类名称',
      dataIndex: 'name',
      width: 120,
      render: (v: string, r: Category) => (
        <div>
          <Text strong>{v}</Text>
          {!r.enabled && (
            <Tag color="default" style={{ marginLeft: 8 }}>已下架</Tag>
          )}
        </div>
      ),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      width: 80,
    },
    {
      title: '积分单价',
      dataIndex: 'pointsPerUnit',
      width: 100,
      render: (v: number) => (
        <span style={{ color: '#fa8c16', fontWeight: 600 }}>{v} 积分</span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (v: string) => <span title={v}>{v}</span>,
    },
    {
      title: '投放须知',
      dataIndex: 'tips',
      width: 200,
      ellipsis: true,
      render: (v: string) => <span title={v}>{v}</span>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 80,
      align: 'center' as const,
      render: (v: number) => (
        <Tag color={v ? 'success' : 'default'}>
          {v ? '已上架' : '已下架'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'act',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, r: Category) => (
        <Space size={4}>
          <Button
            size="small"
            type="link"
            icon={r.enabled ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => handleToggle(r)}
          >
            {r.enabled ? '下架' : '上架'}
          </Button>
          <Button
            size="small"
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(r)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个品类吗？"
            description="已有预约记录的品类无法删除"
            onConfirm={() => handleDelete(r)}
          >
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        style={{ borderRadius: 12 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <OrderedListOutlined style={{ color: '#52c41a' }} />
            回收品类管理
          </div>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增品类
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          columns={columns}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        open={modalVisible}
        title={editingItem ? '编辑品类' : '新增品类'}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="图标"
              name="icon"
              rules={[{ required: true, message: '请输入图标' }]}
              style={{ width: 100 }}
            >
              <Input placeholder="📄" style={{ fontSize: 18, textAlign: 'center' }} />
            </Form.Item>
            <Form.Item
              label="品类名称"
              name="name"
              rules={[{ required: true, message: '请输入品类名称' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="如：废纸" />
            </Form.Item>
            <Form.Item
              label="排序"
              name="sort"
              style={{ width: 120 }}
            >
              <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="计量单位"
              name="unit"
              rules={[{ required: true, message: '请输入单位' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="如：公斤、个、件" />
            </Form.Item>
            <Form.Item
              label="积分单价"
              name="pointsPerUnit"
              rules={[{ required: true, message: '请输入积分单价' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder="每单位积分"
                addonAfter="积分"
              />
            </Form.Item>
          </div>

          <Form.Item
            label="品类描述"
            name="description"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="包括哪些物品，简单描述该品类"
            />
          </Form.Item>

          <Form.Item
            label="投放须知"
            name="tips"
            rules={[{ required: true, message: '请输入投放须知' }]}
            extra="告知居民投放前需要注意的事项"
          >
            <Input.TextArea
              rows={3}
              placeholder="请尽量叠放整齐，去除塑料包装..."
            />
          </Form.Item>

          {editingItem && (
            <Form.Item
              label="上架状态"
              name="enabled"
              valuePropName="checked"
            >
              <Switch checkedChildren="上架" unCheckedChildren="下架" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}
