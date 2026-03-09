import React from 'react';
import { Popover, List, Button, Typography, Empty, Tag, Space } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useNotifications } from '../../context/NotificationContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface NotificationPopoverProps {
  children: React.ReactNode;
}

const NotificationPopover: React.FC<NotificationPopoverProps> = ({ children }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();

  const content = (
    <div style={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Text strong>Notifications ({unreadCount} unread)</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Empty description="No notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          loading={isLoading}
          dataSource={notifications.slice(0, 10)}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '8px 0',
                background: item.is_read ? 'transparent' : '#f6ffed',
                borderRadius: 4,
                marginBottom: 4,
              }}
              actions={
                !item.is_read
                  ? [
                      <Button
                        key="read"
                        type="text"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => markAsRead(item.id)}
                      />,
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                title={
                  <Space>
                    {item.title}
                    <Tag
                      color={
                        item.type === 'appointment'
                          ? 'blue'
                          : item.type === 'reminder'
                          ? 'orange'
                          : 'default'
                      }
                      style={{ fontSize: 10 }}
                    >
                      {item.type}
                    </Tag>
                  </Space>
                }
                description={
                  <>
                    <Text style={{ fontSize: 12 }}>{item.message}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(item.created_at).fromNow()}
                    </Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title={null}
      trigger="click"
      placement="bottomRight"
    >
      {children}
    </Popover>
  );
};

export default NotificationPopover;
