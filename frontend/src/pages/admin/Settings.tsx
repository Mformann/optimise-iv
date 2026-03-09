import React from 'react';
import { Card, Avatar, Typography, Descriptions, Tag, Row, Col, Divider } from 'antd';
import { UserOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const Settings: React.FC = () => {
  const { user } = useAuth();

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'admin':
        return 'red';
      case 'doctor':
        return 'blue';
      case 'reception':
        return 'green';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
      <Title level={4} style={{ margin: 0 }}>
        <SettingOutlined style={{ marginRight: 8 }} />
        Settings
      </Title>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={12}>
          <Card title="User Profile">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar
                size={80}
                style={{ backgroundColor: getRoleBadgeColor() === 'red' ? '#f50' : getRoleBadgeColor() === 'blue' ? '#2db7f5' : '#87d068' }}
                icon={<UserOutlined />}
              />
              <div style={{ marginTop: 16 }}>
                <Title level={4} style={{ margin: 0 }}>{user?.name}</Title>
                <Tag color={getRoleBadgeColor()} style={{ marginTop: 8, textTransform: 'capitalize' }}>
                  {user?.role}
                </Tag>
              </div>
            </div>

            <Divider />

            <Descriptions column={1} labelStyle={{ fontWeight: 500 }}>
              <Descriptions.Item label="Email">
                {user?.email || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {user?.phone || 'Not provided'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={user?.is_active ? 'green' : 'red'}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Member Since">
                {formatDate(user?.created_at)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="System Information">
            <Descriptions column={1} labelStyle={{ fontWeight: 500 }}>
              <Descriptions.Item label="Application">
                IV Therapy Clinic CRM
              </Descriptions.Item>
              <Descriptions.Item label="Version">
                1.0.0
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Text type="secondary">
              This CRM system helps manage IV therapy clinic operations including patient management,
              appointment scheduling, referral tracking, and partner commissions.
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Settings;
