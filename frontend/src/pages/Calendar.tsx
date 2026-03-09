import React, { useState, useEffect } from 'react';
import { Calendar as AntCalendar, Badge, Card, Select, Row, Col, Spin, Tag, Modal, Descriptions, Button, Space, Radio } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { appointmentsApi, clinicsApi, usersApi } from '../api';
import { Appointment, Clinic, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../utils/handleApiError';

type ViewMode = 'month' | 'day';

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string | undefined>();
  const [selectedDoctor, setSelectedDoctor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [clinicsData, doctorsData] = await Promise.all([
          clinicsApi.getAll(true),
          usersApi.getDoctors(),
        ]);
        setClinics(clinicsData);
        setDoctors(doctorsData);

        if (user?.role === 'doctor') {
          setSelectedDoctor(user.id);
        }
      } catch (error) {
        handleApiError(error);
      }
    };
    loadFilters();
  }, [user]);

  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true);
      try {
        const startDate = currentDate.startOf('month').format('YYYY-MM-DD');
        const endDate = currentDate.endOf('month').format('YYYY-MM-DD');
        const data = await appointmentsApi.getCalendar(
          startDate,
          endDate,
          selectedDoctor,
          selectedClinic
        );
        setAppointments(data);
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoading(false);
      }
    };
    loadAppointments();
  }, [currentDate, selectedClinic, selectedDoctor]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'scheduled': return 'processing';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'no_show': return 'default';
      default: return 'default';
    }
  };

  const getAppointmentsForDate = (date: Dayjs) => {
    return appointments.filter(
      (apt) => apt.scheduled_date === date.format('YYYY-MM-DD')
    );
  };

  const dateCellRender = (value: Dayjs) => {
    const dayAppointments = getAppointmentsForDate(value);
    if (dayAppointments.length === 0) return null;

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayAppointments.slice(0, 3).map((apt) => (
          <li key={apt.id} onClick={(e) => { e.stopPropagation(); setSelectedAppointment(apt); }}>
            <Badge
              status={getStatusColor(apt.status) as 'success' | 'processing' | 'error' | 'default' | 'warning'}
              text={
                <span style={{ fontSize: 11, cursor: 'pointer' }}>
                  {apt.scheduled_time} {apt.patient_name?.split(' ')[0]}
                </span>
              }
            />
          </li>
        ))}
        {dayAppointments.length > 3 && (
          <li style={{ fontSize: 11, color: '#1890ff' }}>
            +{dayAppointments.length - 3} more
          </li>
        )}
      </ul>
    );
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(currentDate);

    return (
      <div style={{ marginTop: 16 }}>
        {dayAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            No appointments for {currentDate.format('MMMM D, YYYY')}
          </div>
        ) : (
          dayAppointments.map((apt) => (
            <Card
              key={apt.id}
              size="small"
              style={{ marginBottom: 8, cursor: 'pointer' }}
              onClick={() => setSelectedAppointment(apt)}
            >
              <Row gutter={16} align="middle">
                <Col span={3}>
                  <strong>{apt.scheduled_time}</strong>
                </Col>
                <Col span={5}>
                  {apt.patient_name}
                </Col>
                <Col span={4}>
                  <Tag color={apt.type === 'drip' ? 'blue' : 'green'}>{apt.type}</Tag>
                </Col>
                <Col span={4}>
                  <Badge status={getStatusColor(apt.status) as never} text={apt.status} />
                </Col>
                <Col span={4}>
                  Dr. {apt.doctor_name?.split(' ').slice(-1)[0]}
                </Col>
                <Col span={4}>
                  {apt.clinic_name}
                </Col>
              </Row>
            </Card>
          ))
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
              <Radio.Button value="month">Month</Radio.Button>
              <Radio.Button value="day">Day</Radio.Button>
            </Radio.Group>
          </Col>
          <Col>
            <Select
              placeholder="Filter by Clinic"
              allowClear
              style={{ width: 200 }}
              value={selectedClinic}
              onChange={setSelectedClinic}
              options={clinics.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Col>
          {user?.role !== 'doctor' && (
            <Col>
              <Select
                placeholder="Filter by Doctor"
                allowClear
                style={{ width: 200 }}
                value={selectedDoctor}
                onChange={setSelectedDoctor}
                options={doctors.map((d) => ({ value: d.id, label: d.name }))}
              />
            </Col>
          )}
        </Row>

        {viewMode === 'month' ? (
          <AntCalendar
            value={currentDate}
            onChange={setCurrentDate}
            cellRender={(current) => dateCellRender(current)}
          />
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Button onClick={() => setCurrentDate(currentDate.subtract(1, 'day'))}>
                  Previous Day
                </Button>
                <strong>{currentDate.format('dddd, MMMM D, YYYY')}</strong>
                <Button onClick={() => setCurrentDate(currentDate.add(1, 'day'))}>
                  Next Day
                </Button>
                <Button onClick={() => setCurrentDate(dayjs())}>Today</Button>
              </Space>
            </div>
            {renderDayView()}
          </>
        )}
      </Card>

      <Modal
        title="Appointment Details"
        open={!!selectedAppointment}
        onCancel={() => setSelectedAppointment(null)}
        footer={null}
        width={600}
      >
        {selectedAppointment && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Patient" span={2}>
              {selectedAppointment.patient_name}
            </Descriptions.Item>
            <Descriptions.Item label="Date">
              {selectedAppointment.scheduled_date}
            </Descriptions.Item>
            <Descriptions.Item label="Time">
              {selectedAppointment.scheduled_time}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color={selectedAppointment.type === 'drip' ? 'blue' : 'green'}>
                {selectedAppointment.type}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge status={getStatusColor(selectedAppointment.status) as never} text={selectedAppointment.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Doctor">
              {selectedAppointment.doctor_name}
            </Descriptions.Item>
            <Descriptions.Item label="Clinic">
              {selectedAppointment.clinic_name}
            </Descriptions.Item>
            {selectedAppointment.therapy_name && (
              <Descriptions.Item label="Therapy" span={2}>
                {selectedAppointment.therapy_name}
              </Descriptions.Item>
            )}
            {selectedAppointment.notes && (
              <Descriptions.Item label="Notes" span={2}>
                {selectedAppointment.notes}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default Calendar;
