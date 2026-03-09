import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Table, Button, Input, Space, Modal, Form, Select, DatePicker,
  message, Typography, Tag, Popconfirm, Tabs, Checkbox, Tooltip, Spin
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, CheckOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { patientsApi, referralsApi, partnersApi, clinicsApi, usersApi, therapiesApi, appointmentsApi } from '../api';
import { Patient, ReferralSource, Partner, Clinic, User, Therapy, AppointmentType } from '../types';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../utils/handleApiError';

const { Title } = Typography;
const { TextArea } = Input;

const Patients: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [form] = Form.useForm();
  const [appointmentForm] = Form.useForm();

  // Reference data
  const [referralSources, setReferralSources] = useState<ReferralSource[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const [referringPatients, setReferringPatients] = useState<Patient[]>([]);
  const [searchReferringLoading, setSearchReferringLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [confirmedTabs, setConfirmedTabs] = useState<Set<string>>(new Set());

  const TAB_ORDER = ['basic', 'address', 'referral', 'medical'] as const;

  const handleNextTab = (currentTab: string) => {
    setConfirmedTabs(prev => new Set([...prev, currentTab]));
    const idx = TAB_ORDER.indexOf(currentTab as typeof TAB_ORDER[number]);
    if (idx < TAB_ORDER.length - 1) {
      setActiveTab(TAB_ORDER[idx + 1]);
    }
  };

  const handleMarkAsRead = (tab: string) => {
    setConfirmedTabs(prev => new Set([...prev, tab]));
  };


  useEffect(() => {
    loadPatients();
    loadReferenceData();
  }, [page]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      if (searchQuery) {
        const data = await patientsApi.searchPatients(searchQuery);
        setPatients(data);
        setTotal(data.length);
      } else {
        const data = await patientsApi.getPatients(page, 20);
        setPatients(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      handleApiError(error, 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [sourcesData, partnersData, clinicsData, doctorsData, therapiesData] = await Promise.all([
        referralsApi.getSources(true),
        partnersApi.getAll(true),
        clinicsApi.getAll(true),
        usersApi.getDoctors(),
        therapiesApi.getAll(true),
      ]);
      setReferralSources(sourcesData);
      setPartners(partnersData);
      setClinics(clinicsData);
      setDoctors(doctorsData);
      setTherapies(therapiesData);
    } catch (error) {
      handleApiError(error, 'Failed to load reference data');
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadPatients();
  };

  const handlePatientSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setReferringPatients([]);
      return;
    }
    setSearchReferringLoading(true);
    try {
      const data = await patientsApi.searchPatients(query);
      setReferringPatients(data);
    } catch (error) {
      handleApiError(error, 'Failed to search patients');
    } finally {
      setSearchReferringLoading(false);
    }
  };


  const handleCreate = () => {
    setEditingPatient(null);
    form.resetFields();
    setActiveTab('basic');
    setConfirmedTabs(new Set());
    setModalOpen(true);
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    form.setFieldsValue({
      ...patient,
      blood_test_done: !!patient.blood_test_done,
      date_of_birth: patient.date_of_birth ? dayjs(patient.date_of_birth) : undefined,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await patientsApi.delete(id);
      message.success('Patient deleted successfully');
      loadPatients();
    } catch (error) {
      handleApiError(error, 'Failed to delete patient');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const data = {
        ...values,
        date_of_birth: values.date_of_birth
          ? (values.date_of_birth as dayjs.Dayjs).format('YYYY-MM-DD')
          : undefined,
      };

      if (editingPatient) {
        await patientsApi.updatePatient(editingPatient.id, data);
        message.success('Patient updated successfully');
      } else {
        await patientsApi.createPatient(data as never);
        message.success('Patient created successfully');
      }
      setModalOpen(false);
      loadPatients();
    } catch (error) {
      handleApiError(error, 'Failed to save patient');
    }
  };

  const handleQuickAppointment = (patient: Patient) => {
    setSelectedPatient(patient);
    appointmentForm.resetFields();
    appointmentForm.setFieldsValue({ patient_id: patient.id });
    setAppointmentModalOpen(true);
  };

  const handleCreateAppointment = async (values: Record<string, unknown>) => {
    try {
      if (values.is_quick) {
        await appointmentsApi.createQuick({
          patient_id: values.patient_id as string,
          doctor_id: values.doctor_id as string,
          clinic_id: values.clinic_id as string,
          therapy_id: values.therapy_id as string,
          type: values.type as AppointmentType,
          notes: values.notes as string,
        });
      } else {
        await appointmentsApi.createAppointment({
          patient_id: values.patient_id as string,
          doctor_id: values.doctor_id as string,
          clinic_id: values.clinic_id as string,
          therapy_id: values.therapy_id as string,
          type: values.type as AppointmentType,
          scheduled_date: (values.scheduled_date as dayjs.Dayjs).format('YYYY-MM-DD'),
          scheduled_time: (values.scheduled_time as dayjs.Dayjs).format('HH:mm'),
          notes: values.notes as string,
        });
      }
      message.success('Appointment created successfully');
      setAppointmentModalOpen(false);
    } catch (error) {
      handleApiError(error, 'Failed to book appointment');
    }
  };

  const columns: ColumnsType<Patient> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <Link to={`/patients/${record.id}`}>
          {record.first_name} {record.last_name}
        </Link>
      ),
      sorter: (a, b) => a.last_name.localeCompare(b.last_name),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: 'Referrals',
      dataIndex: 'referral_count',
      key: 'referral_count',
      render: (count) => count ? <Tag color="blue">{count}</Tag> : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<CalendarOutlined />}
            size="small"
            onClick={() => handleQuickAppointment(record)}
          >
            Book
          </Button>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          {user?.role === 'admin' && (
            <Popconfirm
              title="Delete this patient?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (loading && patients.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Patients</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          New Patient
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search patients..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 300 }}
        />
        <Button onClick={handleSearch}>Search</Button>
        {searchQuery && (
          <Button onClick={() => { setSearchQuery(''); setPage(1); loadPatients(); }}>
            Clear
          </Button>
        )}
      </Space>

      <Table
        columns={columns}
        dataSource={patients}
        rowKey="id"
        loading={loading}
        bordered
        size='small'
        scroll={{ x: true }}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          onChange: setPage,
        }}
      />

      {/* Patient Form Modal */}
      <Modal
        title={editingPatient ? 'Edit Patient' : 'New Patient'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'basic',
                label: (
                  <span>
                    Basic Info{confirmedTabs.has('basic') && <CheckOutlined style={{ color: '#52c41a', marginLeft: 4 }} />}
                  </span>
                ),
                children: (
                  <>
                    <Form.Item
                      name="first_name"
                      label="First Name"
                      rules={[{ required: true, message: 'First name is required' }]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name="last_name"
                      label="Last Name"
                      rules={[{ required: true, message: 'Last name is required' }]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name="phone"
                      label="Phone"
                      rules={[{ required: true, message: 'Phone is required' }]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email">
                      <Input type="email" />
                    </Form.Item>
                    <Form.Item name="date_of_birth" label="Date of Birth">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    {!editingPatient && (
                      <div style={{ textAlign: 'right', marginTop: 8 }}>
                        <Button onClick={() => handleNextTab('basic')}>Next →</Button>
                      </div>
                    )}
                  </>
                ),
              },
              {
                key: 'address',
                label: (
                  <span>
                    Address{confirmedTabs.has('address') && <CheckOutlined style={{ color: '#52c41a', marginLeft: 4 }} />}
                  </span>
                ),
                children: (
                  <>
                    <Form.Item name="address" label="Address">
                      <Input />
                    </Form.Item>
                    <Form.Item name="city" label="City">
                      <Input />
                    </Form.Item>
                    {!editingPatient && (
                      <div style={{ textAlign: 'right', marginTop: 8 }}>
                        <Button onClick={() => handleNextTab('address')}>Next →</Button>
                      </div>
                    )}
                  </>
                ),
              },
              {
                key: 'referral',
                label: (
                  <span>
                    Referral Info{confirmedTabs.has('referral') && <CheckOutlined style={{ color: '#52c41a', marginLeft: 4 }} />}
                  </span>
                ),
                children: (
                  <>
                    <Form.Item name="referral_source_id" label="How did you hear about us?">
                      <Select allowClear placeholder="Select referral source">
                        {referralSources.map((s) => (
                          <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, curr) => prev.referral_source_id !== curr.referral_source_id}
                    >
                      {({ getFieldValue }) => {
                        const sourceId = getFieldValue('referral_source_id');
                        const source = referralSources.find((s: ReferralSource) => s.id === sourceId);
                        const isFriendFamily = source?.name === 'Friend/Family Referral';

                        if (isFriendFamily) {
                          return (
                            <Form.Item
                              name="referred_by_patient_id"
                              label="Referrer (Patient)"
                              rules={[{ required: true, message: 'Please select a referrer' }]}
                            >
                              <Select
                                showSearch
                                placeholder="Search patient by name or phone"
                                defaultActiveFirstOption={false}
                                showArrow={false}
                                filterOption={false}
                                onSearch={handlePatientSearch}
                                loading={searchReferringLoading}
                                notFoundContent={null}
                                dropdownStyle={{ minWidth: 300 }}
                              >
                                {referringPatients.map((p) => (
                                  <Select.Option key={p.id} value={p.id}>
                                    {p.first_name} {p.last_name} ({p.phone})
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          );
                        }
                        return null;
                      }}
                    </Form.Item>
                    <Form.Item name="partner_id" label="Partner Referral">
                      <Select allowClear placeholder="Select partner">
                        {partners.map((p) => (
                          <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    {!editingPatient && (
                      <div style={{ textAlign: 'right', marginTop: 8 }}>
                        <Button onClick={() => handleNextTab('referral')}>Next →</Button>
                      </div>
                    )}
                  </>
                ),
              },
              {
                key: 'medical',
                label: (
                  <span>
                    Medical Notes{confirmedTabs.has('medical') && <CheckOutlined style={{ color: '#52c41a', marginLeft: 4 }} />}
                  </span>
                ),
                children: (
                  <>
                    <Form.Item name="medical_notes" label="Medical Notes">
                      <TextArea rows={4} />
                    </Form.Item>
                    <Form.Item name="blood_test_done" valuePropName="checked" initialValue={false}>
                      <Checkbox>Blood Test Done</Checkbox>
                    </Form.Item>
                    {!editingPatient && (
                      <div style={{ textAlign: 'right', marginTop: 8 }}>
                        <Button
                          type={confirmedTabs.has('medical') ? 'default' : 'primary'}
                          icon={confirmedTabs.has('medical') ? <CheckOutlined /> : undefined}
                          onClick={() => handleMarkAsRead('medical')}
                        >
                          {confirmedTabs.has('medical') ? 'Marked as Read' : 'Mark as Read'}
                        </Button>
                      </div>
                    )}
                  </>
                ),
              },
            ]}
          />
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              {editingPatient ? (
                <Button type="primary" htmlType="submit">Update</Button>
              ) : (
                TAB_ORDER.every(tab => confirmedTabs.has(tab)) ? (
                  <Button type="primary" htmlType="submit">Create</Button>
                ) : (
                  <Tooltip title="Please review all tabs and click Next / Mark as Read on each one">
                    <Button type="primary" disabled>Create</Button>
                  </Tooltip>
                )
              )}
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Appointment Modal */}
      <Modal
        title={`Book Appointment - ${selectedPatient?.first_name} ${selectedPatient?.last_name}`}
        open={appointmentModalOpen}
        onCancel={() => setAppointmentModalOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={appointmentForm} layout="vertical" onFinish={handleCreateAppointment}>
          <Form.Item name="patient_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="is_quick" label="Appointment Type" initialValue={true}>
            <Select>
              <Select.Option value={true}>Walk-in (Now)</Select.Option>
              <Select.Option value={false}>Scheduled</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.is_quick !== curr.is_quick}
          >
            {({ getFieldValue }) =>
              !getFieldValue('is_quick') && (
                <>
                  <Form.Item
                    name="scheduled_date"
                    label="Date"
                    rules={[{ required: true }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="scheduled_time"
                    label="Time"
                    rules={[{ required: true }]}
                  >
                    <DatePicker.TimePicker format="HH:mm" style={{ width: '100%' }} />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
          <Form.Item
            name="clinic_id"
            label="Clinic"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select clinic">
              {clinics.map((c) => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
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
              <Button onClick={() => setAppointmentModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Create Appointment</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Patients;
