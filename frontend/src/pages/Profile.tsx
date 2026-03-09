import React from 'react';
import { Card, Avatar, Typography, Descriptions, Tag, Space, Divider } from 'antd';
import { UserOutlined, MailOutlined, IdcardOutlined, PhoneOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const { Title, Text } = Typography;

const Profile: React.FC = () => {
    const { user } = useAuth();
    const { theme } = useTheme();

    const getRoleColor = (role?: string) => {
        switch (role) {
            case 'admin': return 'volcano';
            case 'doctor': return 'blue';
            case 'reception': return 'green';
            case 'nurse': return 'purple';
            default: return 'default';
        }
    };

    if (!user) return null;

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0' }}>
            <Title level={2} style={{ marginBottom: 24 }}>My Profile</Title>

            <Card
                bordered={false}
                style={{
                    borderRadius: 12,
                    boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
                    <Avatar
                        size={80}
                        icon={<UserOutlined />}
                        style={{
                            backgroundColor: getRoleColor(user.role) === 'default' ? '#ccc' : undefined,
                            marginRight: 24,
                        }}
                        className={`bg-${getRoleColor(user.role)}`} // A quick way to use Antd colors if needed or handle manually
                    />
                    <div>
                        <Title level={3} style={{ margin: 0 }}>{user.name}</Title>
                        <Space style={{ marginTop: 8 }}>
                            <Tag color={getRoleColor(user.role)} style={{ textTransform: 'capitalize', fontSize: 14, padding: '2px 8px' }}>
                                {user.role}
                            </Tag>
                        </Space>
                    </div>
                </div>

                <Divider />

                <Title level={4} style={{ marginBottom: 16 }}>Account Information</Title>
                <Descriptions column={1} bordered size="middle">
                    <Descriptions.Item label={<Space><IdcardOutlined /> User ID</Space>}>
                        <Text copyable>{user.id}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Space><MailOutlined /> Email</Space>}>
                        {user.email || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label={<Space><PhoneOutlined /> Phone</Space>}>
                        {user.phone || 'N/A'}
                    </Descriptions.Item>
                </Descriptions>
            </Card>
        </div>
    );
};

export default Profile;
