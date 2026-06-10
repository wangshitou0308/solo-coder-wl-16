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
  GiftOutlined,
} from '@ant-design/icons';
import { exchangeApi, ExchangeProduct } from '../../api';

const { Text } = Typography;

export default function AdminProducts() {
  const [data, setData] = useState<ExchangeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ExchangeProduct | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await exchangeApi.listAllProducts();
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

  const handleEdit = (item: ExchangeProduct) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      if (editingItem) {
        await exchangeApi.updateProduct(editingItem.id, values);
        message.success('商品更新成功');
      } else {
        await exchangeApi.createProduct(values);
        message.success('商品创建成功');
      }
      
      setModalVisible(false);
      load();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: ExchangeProduct) => {
    try {
      await exchangeApi.toggleProduct(item.id);
      message.success(item.enabled ? '已下架' : '已上架');
      load();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const handleDelete = async (item: ExchangeProduct) => {
    try {
      await exchangeApi.deleteProduct(item.id);
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
      render: (v: number) => <Tag color="purple">#{v}</Tag>,
    },
    {
      title: '图标',
      dataIndex: 'image',
      width: 60,
      align: 'center' as const,
      render: (v: string) => <span style={{ fontSize: 24 }}>{v}</span>,
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      width: 180,
      render: (v: string, r: ExchangeProduct) => (
        <div>
          <Text strong>{v}</Text>
          {!r.enabled && (
            <Tag color="default" style={{ marginLeft: 8 }}>已下架</Tag>
          )}
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 100,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '积分价格',
      dataIndex: 'pointsCost',
      width: 100,
      render: (v: number) => (
        <span style={{ color: '#fa8c16', fontWeight: 600 }}>{v} 积分</span>
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 80,
      render: (v: number) => (
        <span style={{ color: v > 100 ? '#52c41a' : v > 10 ? '#fa8c16' : '#ff4d4f', fontWeight: 600 }}>
          {v}
        </span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
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
      render: (_: any, r: ExchangeProduct) => (
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
            title="确定要删除这个商品吗？"
            description="已有兑换记录的商品无法删除"
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
            <GiftOutlined style={{ color: '#eb2f96' }} />
            兑换商品管理
          </div>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增商品
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
        title={editingItem ? '编辑商品' : '新增商品'}
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
              name="image"
              rules={[{ required: true, message: '请输入图标' }]}
              style={{ width: 100 }}
            >
              <Input placeholder="🗑️" style={{ fontSize: 18, textAlign: 'center' }} />
            </Form.Item>
            <Form.Item
              label="商品名称"
              name="name"
              rules={[{ required: true, message: '请输入商品名称' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="如：抽绳垃圾袋（3卷装）" />
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
              label="商品分类"
              name="category"
              rules={[{ required: true, message: '请输入分类' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="如：日用品、充值卡、代金券" />
            </Form.Item>
            <Form.Item
              label="积分价格"
              name="pointsCost"
              rules={[{ required: true, message: '请输入积分价格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder="兑换所需积分"
                addonAfter="积分"
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="库存数量"
              name="stock"
              rules={[{ required: true, message: '请输入库存' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0" addonAfter="件" />
            </Form.Item>
          </div>

          <Form.Item
            label="商品描述"
            name="description"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="详细描述商品特点、使用说明等"
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
