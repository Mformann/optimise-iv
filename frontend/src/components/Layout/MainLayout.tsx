import React, { useState } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Badge,
  Space,
  Typography,
  Button,
  theme,
} from "antd";
import {
  DashboardOutlined,
  CalendarOutlined,
  UserOutlined,
  TeamOutlined,
  MedicineBoxOutlined,
  BankOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  PartitionOutlined,
  ShareAltOutlined,
  SunOutlined,
  MoonOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FormOutlined,
  NodeIndexOutlined,
  AuditOutlined,
  BarChartOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationPopover from '../Notifications/NotificationPopover';
import { useTheme } from '../../context/ThemeContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme: currentTheme, toggleTheme } = useTheme();
  theme.useToken();

  const getMenuItems = () => {
    const items = [
      {
        key: "/dashboard",
        icon: <DashboardOutlined />,
        label: "Dashboard",
      },
      {
        key: "/calendar",
        icon: <CalendarOutlined />,
        label: "Calendar",
      },
      {
        key: "/patients",
        icon: <TeamOutlined />,
        label: "Patients",
      },
      {
        key: "/appointments",
        icon: <MedicineBoxOutlined />,
        label: "Appointments",
      },
      {
        key: "/drip-orders",
        icon: <ExperimentOutlined />,
        label: "Drip Orders",
      },
      {
        key: "/transactions",
        icon: <DollarOutlined />,
        label: "Transactions",
      },
    ];

    // Non-clinic items for admin and reception
    if (user?.role === "admin" || user?.role === "reception") {
      items.push({
        key: "/inquiries",
        icon: <FormOutlined />,
        label: "Inquiries",
      });
    }

    // Non-clinic pipeline for all staff
    items.push({
      key: "/non-clinic",
      icon: <NodeIndexOutlined />,
      label: "Non-Clinic Pipeline",
    });

    // Doctor reviews for doctor and admin
    if (user?.role === "admin" || user?.role === "doctor") {
      items.push({
        key: "/doctor-reviews",
        icon: <AuditOutlined />,
        label: "Doctor Reviews",
      });
    }

    if (user?.role === "admin") {
      items.push(
        {
          key: "/clinics",
          icon: <BankOutlined />,
          label: "Clinics",
        },
        {
          key: "/users",
          icon: <UserOutlined />,
          label: "Users",
        },
        {
          key: "/therapies",
          icon: <MedicineBoxOutlined />,
          label: "Therapies",
        },
        {
          key: "/drips",
          icon: <MedicineBoxOutlined />,
          label: "Drip Inventory",
        },
        {
          key: '/offers',
          icon: <GiftOutlined />,
          label: 'Offers / Promos',
        },
        {
          key: '/partners',
          icon: <PartitionOutlined />,
          label: "Partners",
        },
        {
          key: "/referrals",
          icon: <ShareAltOutlined />,
          label: "Referrals",
        },
        {
          key: "/settings",
          icon: <SettingOutlined />,
          label: "Settings",
        },
        {
          key: "/host-reports",
          icon: <BarChartOutlined />,
          label: "Host Reports",
        },
      );
    }

    return items;
  };

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => navigate("/profile"),
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
    },
  ];

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case "admin":
        return "#f50";
      case "doctor":
        return "#2db7f5";
      case "reception":
        return "#87d068";
      case "nurse":
        return "#722ed1";
      default:
        return "#999";
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", display: "flex" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme={"dark"}
        style={{
          boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
          zIndex: 10,
          flexShrink: 0,
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          overflow: "auto",
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            borderBottom: `1px solid #303030`,
          }}
        >
          <Text strong style={{ fontSize: collapsed ? 14 : 18, color: "white" }}>
            {collapsed ? "CRM" : "IV Clinic CRM"}
          </Text>
        </div>
        <Menu
          mode="inline"
          theme={"dark"}
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 200,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header
          style={{
            background: currentTheme === 'dark' ? '#2a68c0' : '#bde2fd',
            padding: "0 24px",
            position: "fixed",
            top: 0,
            left: collapsed ? 80 : 200,
            right: 0,
            zIndex: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            transition: "left 0.2s",
          }}
        >
          <Space size="large">
            <Button
              type="text"
              icon={
                currentTheme === "dark" ? <SunOutlined /> : <MoonOutlined />
              }
              onClick={toggleTheme}
              style={{ fontSize: "18px" }}
            />
            <NotificationPopover>
              <Badge count={unreadCount} size="small">
                <BellOutlined style={{ fontSize: 20, cursor: "pointer" }} />
              </Badge>
            </NotificationPopover>
            <Dropdown menu={{ items: userMenuItems }} trigger={["click"]}>
              <Space style={{ cursor: "pointer" }}>
                <Avatar
                  style={{ backgroundColor: getRoleBadgeColor() }}
                  icon={<UserOutlined />}
                />
                <div style={{ lineHeight: 1.2 }}>
                  <Text strong>{user?.name}</Text>
                  <br />
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, textTransform: "capitalize" }}
                  >
                    {user?.role}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: 24,
            marginTop: 88,
            borderRadius: 8,
            minHeight: 280,
            flex: 1,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
