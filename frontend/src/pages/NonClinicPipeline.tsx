import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Tag, Button, Space, Typography, Badge, Modal, Select, message, Empty, Spin
} from 'antd';
import {
  ReloadOutlined, UserAddOutlined, SendOutlined, FormOutlined, HeartOutlined, PlayCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { appointmentsApi, usersApi } from '../api';
import { Appointment, User } from '../types';
import { handleApiError } from '../utils/handleApiError';

const { Title, Text } = Typography;

const STAGES = [
  { key: 'pending_precheck', label: 'Pre-Check', color: '#faad14' },
  { key: 'pending_review', label: 'Pending Review', color: '#1890ff' },
  { key: 'review_risky', label: 'Risky Review', color: '#ff4d4f' },
  { key: 'confirmed', label: 'Confirmed', color: '#52c41a' },
  { key: 'preparing', label: 'Preparing', color: '#722ed1' },
  { key: 'dispatched', label: 'Dispatched', color: '#13c2c2' },
  { key: 'vitals_check', label: 'Vitals Check', color: '#eb2f96' },
  { key: 'in_progress', label: 'In Progress', color: '#fa8c16' },
];

const NonClinicPipeline: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [nurses, setNurses] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<string>('');
  const [selectedNurse, setSelectedNurse] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pipeline, users] = await Promise.all([
        appointmentsApi.getNonClinicPipeline(),
        usersApi.getUsers(),
      ]);
      setAppointments(pipeline);
      setNurses(users.filter((u: User) => u.role === 'nurse' && u.is_active));
    } catch (error) {
      handleApiError(error, 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleMarkPreparing = async (id: string) => {
    setActionLoading(true);
    try {
      await appointmentsApi.markPreparing(id);
      message.success('Marked as preparing');
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignNurse = async () => {
    if (!selectedNurse) { message.warning('Select a nurse'); return; }
    setActionLoading(true);
    try {
      await appointmentsApi.assignNurse(selectedApptId, selectedNurse);
      message.success('Nurse assigned');
      setAssignModalOpen(false);
      setSelectedNurse('');
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to assign nurse');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async (id: string) => {
    setActionLoading(true);
    try {
      await appointmentsApi.markDispatched(id);
      message.success('Dispatched');
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to dispatch');
    } finally {
      setActionLoading(false);
    }
  };

  const getStageAppointments = (stageKey: string) =>
    appointments.filter(a => a.status === stageKey);

  const renderActions = (appt: Appointment) => {
    switch (appt.status) {
      case 'pending_precheck':
        return (
          <Button size="small" icon={<FormOutlined />}
            onClick={() => navigate(`/non-clinic/${appt.id}/precheck`)}>
            Fill Pre-Check
          </Button>
        );
      case 'confirmed':
        return (
          <Button size="small" type="primary" onClick={() => handleMarkPreparing(appt.id)}
            loading={actionLoading}>
            Mark Preparing
          </Button>
        );
      case 'preparing':
        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button size="small" icon={<UserAddOutlined />} block
              onClick={() => { setSelectedApptId(appt.id); setAssignModalOpen(true); }}>
              {appt.nurse_name ? `Nurse: ${appt.nurse_name}` : 'Assign Nurse'}
            </Button>
            <Button size="small" type="primary" icon={<SendOutlined />} block
              onClick={() => handleDispatch(appt.id)} loading={actionLoading}
              disabled={!appt.nurse_id}>
              Dispatch
            </Button>
          </Space>
        );
      case 'dispatched':
      case 'vitals_check':
        return (
          <Button size="small" icon={<HeartOutlined />}
            onClick={() => navigate(`/non-clinic/${appt.id}/vitals`)}>
            Record Vitals
          </Button>
        );
      case 'in_progress':
        return (
          <Button size="small" type="primary" icon={<PlayCircleOutlined />}
            onClick={() => navigate(`/session/${appt.id}`)}>
            Complete
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Non-Clinic Pipeline</Title>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>Refresh</Button>
      </div>

      {loading && appointments.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {STAGES.map(stage => {
            const stageAppts = getStageAppointments(stage.key);
            return (
              <div key={stage.key} style={{ minWidth: 280, flex: '0 0 300px' }}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color }} />
                      <span>{stage.label}</span>
                      <Badge count={stageAppts.length} style={{ backgroundColor: stage.color }} />
                    </Space>
                  }
                  bodyStyle={{ padding: 8, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}
                >
                  {stageAppts.length === 0 ? (
                    <Empty description="No appointments" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {stageAppts.map(appt => (
                        <Card key={appt.id} size="small" hoverable
                          style={{ borderLeft: `3px solid ${stage.color}` }}>
                          <div style={{ marginBottom: 8 }}>
                            <Text strong>{appt.patient_name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>{appt.clinic_name}</Text>
                          </div>
                          {appt.therapy_name && (
                            <Tag color="blue" style={{ marginBottom: 4 }}>{appt.therapy_name}</Tag>
                          )}
                          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                            {dayjs(appt.scheduled_date).format('DD MMM')} at {appt.scheduled_time}
                          </div>
                          {appt.nurse_name && (
                            <div style={{ fontSize: 12, marginBottom: 8 }}>
                              <Tag color="purple">Nurse: {appt.nurse_name}</Tag>
                            </div>
                          )}
                          {renderActions(appt)}
                        </Card>
                      ))}
                    </Space>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Modal title="Assign Nurse" open={assignModalOpen}
        onCancel={() => { setAssignModalOpen(false); setSelectedNurse(''); }}
        onOk={handleAssignNurse} confirmLoading={actionLoading}>
        <Select placeholder="Select nurse" style={{ width: '100%' }}
          value={selectedNurse || undefined} onChange={setSelectedNurse}>
          {nurses.map(n => <Select.Option key={n.id} value={n.id}>{n.name}</Select.Option>)}
        </Select>
      </Modal>
    </div>
  );
};

export default NonClinicPipeline;
