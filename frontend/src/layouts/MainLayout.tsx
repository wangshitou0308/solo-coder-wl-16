import { useEffect, useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Badge, message } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  PlusCircleOutlined,
  GiftOutlined,
  CrownOutlined,
  OrderedListOutlined,
  BarChartOutlined,
  DashboardOutlined,
  DesktopOutlined,
  TeamOutlined,
  ShoppingOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  AppstoreOutlined,
  OrderedListOutlined as OrderedListOutlined2,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState as useReactState } from 'react';
import { useAuthStore } from '../store/authStore';
import NotificationDrawer from '../components/NotificationDrawer';
import { authApi } from '../api';

const { Sider, Header, Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useReactState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    const timer = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(timer);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const res = await authApi.getUnreadCount();
      if (res.success) {
        setUnreadCount(res.data?.unreadCount || 0);
      }
    } catch {}
  };

  const residentItems = [
    { key: '/resident/home', icon: <HomeOutlined />, label: '首页' },
    { key: '/resident/appointments', icon: <CalendarOutlined />, label: '我的预约' },
    { key: '/resident/appointments/new', icon: <PlusCircleOutlined />, label: '提交预约' },
    { key: '/resident/points', icon: <CrownOutlined />, label: '积分中心' },
    { key: '/resident/exchange', icon: <GiftOutlined />, label: '积分商城' },
  ];

  const collectorItems = [
    { key: '/collector/tasks', icon: <OrderedListOutlined />, label: '任务管理' },
    { key: '/collector/stats', icon: <BarChartOutlined />, label: '业绩统计' },
  ];

  const adminItems = [
    { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '管理台' },
    { key: '/admin/data-screen', icon: <DesktopOutlined />, label: '数据大屏' },
    { key: '/admin/appointments', icon: <CalendarOutlined />, label: '预约管理' },
    { key: '/admin/categories', icon: <OrderedListOutlined2 />, label: '品类管理' },
    { key: '/admin/products', icon: <AppstoreOutlined />, label: '商品管理' },
    { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
    { key: '/admin/exchange', icon: <ShoppingOutlined />, label: '兑换管理' },
  ];

  const getMenuItems = () => {
    switch (user?.role) {
      case 'resident':
        return residentItems;
      case 'collector':
        return collectorItems;
      case 'admin':
        return adminItems;
      default:
        return [];
    }
  };

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/resident/appointments/') && path !== '/resident/appointments/new') {
      return '/resident/appointments';
    }
    if (path.startsWith('/collector/tasks/')) {
      return '/collector/tasks';
    }
    return path;
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: '个人信息',
        onClick: handleProfile,
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        danger: true,
        onClick: () => {
          logout();
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        },
      },
    ],
  };

  const roleLabel: Record<string, string> = {
    resident: '居民端',
    collector: '回收员端',
    admin: '管理端',
  };

  return (
    <Layout className="main-layout">
      <Sider
        className="main-sider"
        width={220}
        collapsible
        collapsed={collapsed}
        trigger={null}
      >
        <div
          style={{
            padding: collapsed ? '16px 8px' : '16px 20px',
            color: '#fff',
            fontSize: collapsed ? 24 : 18,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span>♻️</span>
          {!collapsed && (
            <span style={{ fontSize: 15 }}>
              {user?.role === 'admin' ? '回收管理' : '绿色回收'}
            </span>
          )}
        </div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[getSelectedKey()]}
          openKeys={[]}
          items={getMenuItems()}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            <div className="logo">
              <span>🌿</span>
              社区废旧物品回收预约与积分兑换服务系统
              <Badge
                count={roleLabel[user?.role || '']}
                style={{
                  backgroundColor: user?.role === 'admin' ? '#1677ff' : user?.role === 'collector' ? '#fa8c16' : '#52c41a',
                  fontSize: 11,
                  padding: '0 8px',
                  marginLeft: 12,
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Badge count={unreadCount} size="small" offset={[-2, 2]}>
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                onClick={() => setNotificationOpen(true)}
                style={{ fontSize: 16, padding: '4px 12px' }}
              />
            </Badge>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: 20,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar style={{ backgroundColor: '#52c41a', verticalAlign: 'middle' }}>
                  {user?.realName?.charAt(0) || 'U'}
                </Avatar>
                <span style={{ fontWeight: 500 }}>{user?.nickname || user?.realName}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="main-content">
          <Outlet />
        </Content>
      </Layout>
      <NotificationDrawer
        open={notificationOpen}
        onClose={() => {
          setNotificationOpen(false);
          loadUnreadCount();
        }}
      />
    </Layout>
  );
}
