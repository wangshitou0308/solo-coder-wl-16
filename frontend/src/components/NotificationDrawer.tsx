import { useEffect, useState } from 'react';
import {
  Drawer,
  List,
  Badge,
  Button,
  Empty,
  Tag,
  Typography,
  Spin,
  message,
} from 'antd';
import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  GiftOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { authApi, Notification, NotificationType } from '../api';

const { Text, Paragraph } = Typography;

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

const typeConfig: Record<NotificationType, { icon: JSX.Element; color: string }> = {
  appointment_assigned: { icon: <CalendarOutlined />, color: 'blue' },
  appointment_accepted: { icon: <CheckCircleOutlined />, color: 'green' },
  appointment_completed: { icon: <CheckCircleOutlined />, color: 'success' },
  points_earned: { icon: <CrownOutlined />, color: 'orange' },
  exchange_order_status: { icon: <GiftOutlined />, color: 'purple' },
  system: { icon: <InfoCircleOutlined />, color: 'default' },
};

const typeLabel: Record<NotificationType, string> = {
  appointment_assigned: '预约分派',
  appointment_accepted: '回收接单',
  appointment_completed: '回收完成',
  points_earned: '积分到账',
  exchange_order_status: '兑换通知',
  system: '系统通知',
};

export default function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await authApi.getNotifications(50, 0);
      if (res.success) {
        setNotifications(res.data?.list || []);
        setUnreadCount(res.data?.unreadCount || 0);
      }
    } catch {
      message.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  const handleMarkRead = async (id: number) => {
    try {
      await authApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      message.error('操作失败');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await authApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
      setUnreadCount(0);
      message.success('已全部标记为已读');
    } catch {
      message.error('操作失败');
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <BellOutlined style={{ marginRight: 8 }} />
            消息中心
            {unreadCount > 0 && (
              <Badge count={unreadCount} style={{ marginLeft: 12 }} />
            )}
          </span>
          {unreadCount > 0 && (
            <Button type="link" onClick={handleMarkAllRead}>
              全部已读
            </Button>
          )}
        </div>
      }
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {notifications.length === 0 ? (
          <Empty description="暂无消息" style={{ marginTop: 80 }} />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                onClick={() => !item.read && handleMarkRead(item.id)}
                style={{
                  background: item.read ? 'transparent' : '#f0f7ff',
                  borderRadius: 8,
                  marginBottom: 8,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  border: '1px solid #e8e8e8',
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Badge dot={!item.read}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: `${typeConfig[item.type].color}15`,
                          color: typeConfig[item.type].color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                        }}
                      >
                        {typeConfig[item.type].icon}
                      </div>
                    </Badge>
                  }
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{item.title}</Text>
                      <Tag color={typeConfig[item.type].color} style={{ marginLeft: 8 }}>
                        {typeLabel[item.type]}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Paragraph style={{ marginBottom: 4, color: '#555' }}>
                        {item.content}
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.createdAt}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Spin>
    </Drawer>
  );
}
