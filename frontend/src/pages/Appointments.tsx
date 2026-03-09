import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Modal, Form, Select, DatePicker, Input,
  message, Typography, Tag, Badge, Popconfirm, Row, Col, InputNumber, Alert
} from 'antd';
import {
  PlusOutlined, PlayCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, DeleteOutlined, EditOutlined, HistoryOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { appointmentsApi, patientsApi, clinicsApi, usersApi, therapiesApi } from '../api';
import { Appointment, Patient, Clinic, User, Therapy, AppointmentType } from '../types';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../utils/handleApiError';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [patientHistory, setPatientHistory] = useState<Appointment[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [form] = Form.useForm();

  // Filters
  const [filterDate, setFilterDate] = useState<dayjs.Dayjs | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterClinic, setFilterClinic] = useState<string | undefined>();

  // Reference data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientBalance, setSelectedPatientBalance] = useState<number | null>(null);

  useEffect(() => {
    loadAppointments();
    loadReferenceData();
  }, [page, filterDate, filterStatus, filterClinic, user]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const filters: Record<string, string | number> = { page, limit: 20 };
      if (filterDate) filters.date = filterDate.format('YYYY-MM-DD');
      if (filterStatus) filters.status = filterStatus;
      if (filterClinic) filters.clinicId = filterClinic;
      if (user?.role === 'doctor') filters.doctorId = user.id;

      const data = await appointmentsApi.getAppointments(filters as any);
      setAppointments(data.data);
      setTotal(data.total);
    } catch (error) {
      handleApiError(error, 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [clinicsData, doctorsData, therapiesData] = await Promise.all([
        clinicsApi.getAll(true),
        usersApi.getDoctors(),
        therapiesApi.getAll(true),
      ]);
      setClinics(clinicsData);
      setDoctors(doctorsData);
      setTherapies(therapiesData);
    } catch (error) {
      handleApiError(error, 'Failed to load reference data');
    }
  };

  const searchPatients = async (query: string) => {
    if (query.length < 2) {
      setPatients([]);
      return;
    }
    try {
      const data = await patientsApi.searchPatients(query);
      setPatients(data);
    } catch (error) {
      handleApiError(error, 'Failed to search patients');
    }
  };

  const loadPatientBalance = async (patientId: string) => {
    try {
      // Assuming user wallet endpoint is available via axios directly or I need to add to api/patients.ts
      // Let's uset apiClient directly for now as per plan
      const { apiClient } = await import('../api');
      const response = await apiClient.get(`/wallet/${patientId}`);
      if (response.data.success) {
        setSelectedPatientBalance(response.data.data.balance);
      }
    } catch (error) {
      handleApiError(error, 'Failed to load patient wallet');
      setSelectedPatientBalance(null);
    }
  };

  const handleCreate = () => {
    setEditingAppointment(null);
    setSelectedPatientBalance(null);
    form.resetFields();
    form.setFieldsValue({
      scheduled_date: dayjs(),
      scheduled_time: dayjs(),
      duration_minutes: 30,
    });
    setModalOpen(true);
  };

  const handleEdit = async (record: Appointment) => {
    setEditingAppointment(record);
    setSelectedPatientBalance(null);
    // Pre-load patients list with the patient from the appointment if not already loaded
    if (!patients.find(p => p.id === record.patient_id)) {
      try {
        const patientData = await patientsApi.getPatient(record.patient_id);
        setPatients(prev => [...prev, patientData]);
      } catch (error) {
        handleApiError(error, 'Failed to load patient details');
      }
    }

    form.resetFields();
    form.setFieldsValue({
      patient_id: record.patient_id,
      doctor_id: record.doctor_id,
      clinic_id: record.clinic_id,
      therapy_id: record.therapy_id,
      type: record.type,
      scheduled_date: dayjs(record.scheduled_date),
      scheduled_time: dayjs(record.scheduled_time, 'HH:mm'),
      duration_minutes: record.duration_minutes,
      notes: record.notes,
    });
    setModalOpen(true);
  };

  const handleViewHistory = async (patientId: string, patientName: string) => {
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      // We can use a dummy patient object if we only have the name, or fetch details if needed.
      // For the header, just the name is enough.
      setSelectedPatient({ id: patientId, first_name: patientName.split(' ')[0], last_name: patientName.split(' ').slice(1).join(' ') } as Patient);

      const data = await appointmentsApi.getAppointments({ patientId, limit: 50 });
      setPatientHistory(data.data);
    } catch (error) {
      handleApiError(error, 'Failed to load patient history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingAppointment) {
        await appointmentsApi.updateAppointment(editingAppointment.id, {
          doctor_id: values.doctor_id as string,
          clinic_id: values.clinic_id as string,
          therapy_id: values.therapy_id as string,
          type: values.type as AppointmentType,
          scheduled_date: (values.scheduled_date as dayjs.Dayjs).format('YYYY-MM-DD'),
          scheduled_time: (values.scheduled_time as dayjs.Dayjs).format('HH:mm'),
          duration_minutes: values.duration_minutes as number,
          notes: values.notes as string,
        });
        message.success('Appointment updated successfully');
      } else {
        await appointmentsApi.createAppointment({
          patient_id: values.patient_id as string,
          doctor_id: values.doctor_id as string,
          clinic_id: values.clinic_id as string,
          therapy_id: values.therapy_id as string,
          type: values.type as AppointmentType,
          scheduled_date: (values.scheduled_date as dayjs.Dayjs).format('YYYY-MM-DD'),
          scheduled_time: (values.scheduled_time as dayjs.Dayjs).format('HH:mm'),
          duration_minutes: values.duration_minutes as number,
          notes: values.notes as string,
        });
        message.success('Appointment created successfully');
      }
      setModalOpen(false);
      setEditingAppointment(null);
      loadAppointments();
    } catch (error) {
      handleApiError(error, 'Failed to save appointment');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await appointmentsApi.start(id);
      message.success('Appointment started');
      navigate(`/session/${id}`);
    } catch (error) {
      handleApiError(error, 'Failed to start appointment');
    }
  };

  const handleComplete = (appointment: Appointment) => {
    navigate(`/session/${appointment.id}`);
  };

  const handleCancel = async (id: string) => {
    try {
      await appointmentsApi.cancelAppointment(id);
      message.success('Appointment cancelled');
      loadAppointments();
    } catch (error) {
      handleApiError(error, 'Failed to cancel appointment');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await appointmentsApi.delete(id);
      message.success('Appointment deleted');
      loadAppointments();
    } catch (error) {
      handleApiError(error, 'Failed to delete appointment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'processing';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'no_show': return 'default';
      default: return 'default';
    }
  };

  const columns: ColumnsType<Appointment> = [
    {
      title: 'Date/Time',
      key: 'datetime',
      render: (_, record) => (
        <>
          <div>{record.scheduled_date}</div>
          <Text type="secondary">{record.scheduled_time}</Text>
        </>
      ),
      sorter: (a, b) =>
        `${a.scheduled_date} ${a.scheduled_time}`.localeCompare(`${b.scheduled_date} ${b.scheduled_time}`),
    },
    {
      title: 'Patient',
      key: 'patient',
      render: (_, record) => (
        <>
          <div>{record.patient_name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.patient_phone}</Text>
        </>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'drip' ? 'blue' : 'green'}>{type}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge status={getStatusColor(status) as any} text={status} />
      ),
    },
    {
      title: 'Doctor',
      dataIndex: 'doctor_name',
      key: 'doctor_name',
    },
    {
      title: 'Clinic',
      key: 'clinic_name',
      render: (_, record) => {
        const clinic = clinics.find(c => c.id === record.clinic_id);
        return (
          <Space size={4}>
            <span>{record.clinic_name}</span>
            {clinic?.location_type === 'non_clinic' && (
              <Tag color="orange" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>Non-Clinic</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'scheduled' && (user?.role === 'doctor' || user?.role === 'admin') && (
            <Button
              icon={<PlayCircleOutlined />}
              size="small"
              type="primary"
              onClick={() => handleStart(record.id)}
            >
              Start
            </Button>
          )}
          {record.status === 'in_progress' && (user?.role === 'doctor' || user?.role === 'admin') && (
            <Button
              icon={<CheckCircleOutlined />}
              size="small"
              type="primary"
              style={{ background: '#52c41a' }}
              onClick={() => handleComplete(record)}
            >
              Resume / Complete
            </Button>
          )}
          {record.status === 'scheduled' && (
            <Popconfirm
              title="Cancel this appointment?"
              onConfirm={() => handleCancel(record.id)}
            >
              <Button icon={<CloseCircleOutlined />} size="small" danger>
                Cancel
              </Button>
            </Popconfirm>
          )}
          {record.status === 'scheduled' && (
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            >
              Edit
            </Button>
          )}
          <Button
            icon={<HistoryOutlined />}
            size="small"
            onClick={() => handleViewHistory(record.patient_id, record.patient_name || 'Unknown Patient')}
            title="View History"
          />
          {user?.role === 'admin' && (
            <Popconfirm
              title="Delete this appointment?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Appointments</Title>
        {(user?.role === 'admin' || user?.role === 'reception') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Appointment
          </Button>
        )}
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <DatePicker
            placeholder="Filter by date"
            value={filterDate}
            onChange={setFilterDate}
            allowClear
          />
        </Col>
        <Col>
          <Select
            placeholder="Filter by status"
            style={{ width: 150 }}
            value={filterStatus}
            onChange={setFilterStatus}
            allowClear
          >
            <Select.Option value="scheduled">Scheduled</Select.Option>
            <Select.Option value="in_progress">In Progress</Select.Option>
            <Select.Option value="completed">Completed</Select.Option>
            <Select.Option value="cancelled">Cancelled</Select.Option>
            <Select.Option value="no_show">No Show</Select.Option>
          </Select>
        </Col>
        <Col>
          <Select
            placeholder="Filter by clinic"
            style={{ width: 200 }}
            value={filterClinic}
            onChange={setFilterClinic}
            allowClear
          >
            {clinics.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name}{c.location_type === 'non_clinic' ? ' (Non-Clinic)' : ''}
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col>
          <Button onClick={() => { setFilterDate(null); setFilterStatus(undefined); setFilterClinic(undefined); }}>
            Clear Filters
          </Button>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={appointments}
        rowKey="id"
        loading={loading}
        bordered
        scroll={{ x: true }}
        size='small'
        pagination={{
          current: page,
          pageSize: 20,
          total,
          onChange: setPage,
        }}
      />

      {/* Create/Edit Appointment Modal */}
      <Modal
        title={editingAppointment ? "Edit Appointment" : "New Appointment"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="patient_id"
            label="Patient"
            rules={[{ required: true, message: 'Patient is required' }]}
          >
            <Select
              showSearch
              placeholder="Search patient..."
              filterOption={false}
              disabled={!!editingAppointment}
              onSearch={(value) => {
                setPatientSearch(value);
                searchPatients(value);
              }}
              onChange={(value) => loadPatientBalance(value)}
              notFoundContent={patientSearch.length < 2 ? 'Type to search...' : 'No patients found'}
            >
              {patients.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} - {p.phone}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedPatientBalance !== null && selectedPatientBalance < 0 && (
            <Alert
              message="Pending Payment Warning"
              description={`This patient has a pending balance of $${Math.abs(selectedPatientBalance).toFixed(2)}. Please collect payment if possible.`}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="scheduled_date"
                label="Date"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="scheduled_time"
                label="Time"
                rules={[{ required: true }]}
              >
                <DatePicker.TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="clinic_id"
                label="Clinic"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select clinic">
                  {clinics.map((c) => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name}{c.location_type === 'non_clinic' ? ' (Non-Clinic)' : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="doctor_id"
                label="Doctor"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select doctor">
                  {doctors.map((d) => (
                    <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Type"
                rules={[{ required: true }]}
              >
                <Select placeholder="Select type">
                  <Select.Option value="consulting">Consulting</Select.Option>
                  <Select.Option value="drip">Drip</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="duration_minutes"
                label="Duration (min)"
                rules={[{ required: true, message: 'Duration is required' }]}
              >
                <InputNumber min={5} step={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="therapy_id" label="Therapy">
            <Select allowClear placeholder="Select therapy">
              {therapies.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.name} (${t.price})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingAppointment ? 'Update' : 'Create'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Patient History Modal */}
      <Modal
        title={`History: ${selectedPatient?.first_name || ''} ${selectedPatient?.last_name || ''}`}
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setHistoryModalOpen(false)}>Close</Button>
        ]}
        width={800}
      >
        <Table
          dataSource={patientHistory}
          rowKey="id"
          loading={historyLoading}
          pagination={{ pageSize: 5 }}
          size="small"
          columns={[
            {
              title: 'Date',
              key: 'date',
              render: (_, r) => `${r.scheduled_date} ${r.scheduled_time}`,
              sorter: (a, b) => `${a.scheduled_date} ${a.scheduled_time}`.localeCompare(`${b.scheduled_date} ${b.scheduled_time}`),
            },
            {
              title: 'Type',
              dataIndex: 'type',
              key: 'type',
              render: (t) => <Tag color={t === 'drip' ? 'blue' : 'green'}>{t}</Tag>,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (s) => <Badge status={getStatusColor(s) as any} text={s} />,
            },
            {
              title: 'Clinic',
              dataIndex: 'clinic_name',
              key: 'clinic',
            },
            {
              title: 'Doctor',
              dataIndex: 'doctor_name',
              key: 'doctor',
            }
          ]}
        />
      </Modal>
    </div>
  );
};

export default Appointments;
