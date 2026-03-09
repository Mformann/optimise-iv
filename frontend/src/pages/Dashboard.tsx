import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, List, Tag, Spin, Empty } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { appointmentsApi } from '../api';
import { Appointment } from '../types';
import dayjs from 'dayjs';
import { handleApiError } from '../utils/handleApiError';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    no_show: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = dayjs().format('YYYY-MM-DD');
        const [appointments, statsData] = await Promise.all([
          appointmentsApi.getCalendar(today, today, user?.role === 'doctor' ? user.id : undefined),
          appointmentsApi.getStats(
            dayjs().startOf('month').format('YYYY-MM-DD'),
            dayjs().endOf('month').format('YYYY-MM-DD')
          ),
        ]);
        setTodayAppointments(appointments);
        setStats(statsData);
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'blue';
      case 'in_progress':
        return 'orange';
      case 'completed':
        return 'green';
      case 'cancelled':
        return 'red';
      case 'no_show':
        return 'default';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Welcome back, {user?.name}!
        </Title>
      </div>
      <Text type="secondary">
        Here's what's happening today, {dayjs().format('dddd, MMMM D, YYYY')}
      </Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Appointments"
              value={todayAppointments.length}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Month - Scheduled"
              value={stats?.scheduled || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Month - Completed"
              value={stats?.completed || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Month - Cancelled/No-show"
              value={(stats?.cancelled || 0) + (stats?.no_show || 0)}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <>
                <CalendarOutlined /> Today's Schedule
              </>
            }
          >
            {todayAppointments.length === 0 ? (
              <Empty description="No appointments today" />
            ) : (
              <List
                dataSource={todayAppointments}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<TeamOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                      title={
                        <>
                          {item.patient_name}{' '}
                          <Tag color={getStatusColor(item.status)}>{item.status}</Tag>
                        </>
                      }
                      description={
                        <>
                          {item.scheduled_time} - {item.type}
                          {item.therapy_name && ` (${item.therapy_name})`}
                          <br />
                          <Text type="secondary">
                            Dr. {item.doctor_name} @ {item.clinic_name}
                          </Text>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Quick Actions">
            <Row gutter={[12, 12]}>
              {(user?.role === 'admin' || user?.role === 'reception') && (
                <>
                  <Col span={12}>
                    <Card
                      hoverable
                      size="small"
                      onClick={() => (window.location.href = '/patients?action=new')}
                    >
                      <Statistic
                        title="New Patient"
                        value=""
                        prefix={<TeamOutlined />}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card
                      hoverable
                      size="small"
                      onClick={() => (window.location.href = '/appointments?action=new')}
                    >
                      <Statistic
                        title="Quick Appointment"
                        value=""
                        prefix={<CalendarOutlined />}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Card>
                  </Col>
                </>
              )}
              <Col span={12}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => (window.location.href = '/calendar')}
                >
                  <Statistic
                    title="View Calendar"
                    value=""
                    prefix={<CalendarOutlined />}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => (window.location.href = '/appointments')}
                >
                  <Statistic
                    title="All Appointments"
                    value=""
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
