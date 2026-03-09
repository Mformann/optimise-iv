import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, Row, Col, Statistic,
  Select, Modal, Form, Input, DatePicker, TimePicker, message, InputNumber
} from 'antd';
import {
  PlusOutlined, PhoneOutlined, SwapOutlined, ReloadOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { inquiriesApi, partnersApi, clinicsApi, usersApi, therapiesApi } from '../api';
import { Inquiry, Partner, Clinic, User, Therapy } from '../types';
import { handleApiError } from '../utils/handleApiError';
const { Title } = Typography;

const statusColors: Record<string, string> = {
  new: 'blue',
  contacted: 'orange',
  converted: 'green',
  lost: 'red',
};

const sourceLabels: Record<string, string> = {
  google_form: 'Google Form',
  whatsapp: 'WhatsApp',
  phone: 'Phone',
  walk_in: 'Walk-in',
  other: 'Other',
};

const Inquiries: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, new_count: 0, contacted: 0, converted: 0, lost: 0 });
  const [filterPartner, setFilterPartner] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [createForm] = Form.useForm();
  const [convertForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const nonClinicLocations = clinics.filter(c => c.location_type === 'non_clinic');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [inqData, statsData, partnersData, clinicsData, usersData, therapiesData] = await Promise.all([
        inquiriesApi.getAll({ partnerId: filterPartner, status: filterStatus as any }),
        inquiriesApi.getStats(filterPartner),
        partnersApi.getAll(),
        clinicsApi.getAll(),
        usersApi.getUsers(),
        therapiesApi.getAll(),
      ]);
      setInquiries(inqData);
      setStats(statsData);
      setPartners(partnersData);
      setClinics(clinicsData);
      setDoctors(usersData.filter((u: User) => u.role === 'doctor' && u.is_active));
      setTherapies(therapiesData.filter((t: Therapy) => t.is_active));
    } catch (error) {
      handleApiError(error, 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [filterPartner, filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      await inquiriesApi.create(values);
      message.success('Inquiry created');
      setCreateModalOpen(false);
      createForm.resetFields();
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to create inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContact = async (id: string) => {
    try {
      await inquiriesApi.markContacted(id);
      message.success('Marked as contacted');
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to mark contacted');
    }
  };

  const handleMarkLost = async (id: string) => {
    try {
      await inquiriesApi.update(id, { status: 'lost' } as any);
      message.success('Marked as lost');
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to update');
    }
  };

  const handleConvert = async (values: any) => {
    if (!selectedInquiry) return;
    setSubmitting(true);
    try {
      const data = {
        doctor_id: values.doctor_id,
        therapy_id: values.therapy_id,
        scheduled_date: values.scheduled_date.format('YYYY-MM-DD'),
        scheduled_time: values.scheduled_time.format('HH:mm'),
        duration_minutes: values.duration_minutes || 60,
        type: values.type || 'drip',
      };
      await inquiriesApi.convert(selectedInquiry.id, data);
      message.success('Inquiry converted to appointment');
      setConvertModalOpen(false);
      convertForm.resetFields();
      setSelectedInquiry(null);
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to convert inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<Inquiry> = [
    { title: 'Client Name', dataIndex: 'client_name', key: 'client_name' },
    { title: 'Phone', dataIndex: 'client_phone', key: 'client_phone' },
    { title: 'Partner', dataIndex: 'partner_name', key: 'partner_name' },
    { title: 'Location', dataIndex: 'clinic_name', key: 'clinic_name' },
    {
      title: 'Source', dataIndex: 'source', key: 'source',
      render: (s: string) => sourceLabels[s] || s,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColors[s]}>{s.toUpperCase()}</Tag>,
    },
    { title: 'Contacted By', dataIndex: 'contacted_by_name', key: 'contacted_by_name' },
    {
      title: 'Created', dataIndex: 'created_at', key: 'created_at',
      render: (d: string) => dayjs(d).format('DD MMM YYYY'),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, record: Inquiry) => (
        <Space size="small">
          {record.status === 'new' && (
            <Button size="small" icon={<PhoneOutlined />} onClick={() => handleContact(record.id)}>
              Contact
            </Button>
          )}
          {(record.status === 'new' || record.status === 'contacted') && (
            <>
              <Button size="small" type="primary" icon={<SwapOutlined />}
                onClick={() => { setSelectedInquiry(record); setConvertModalOpen(true); }}>
                Convert
              </Button>
              <Button size="small" danger icon={<CloseCircleOutlined />}
                onClick={() => handleMarkLost(record.id)}>
                Lost
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={4} style={{ margin: 0 }}>Host Inquiries</Title></Col>
        <Col>
          <Space>
            <Select placeholder="Filter Partner" allowClear style={{ width: 200 }}
              value={filterPartner} onChange={setFilterPartner}>
              {partners.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
            <Select placeholder="Filter Status" allowClear style={{ width: 150 }}
              value={filterStatus} onChange={setFilterStatus}>
              <Select.Option value="new">New</Select.Option>
              <Select.Option value="contacted">Contacted</Select.Option>
              <Select.Option value="converted">Converted</Select.Option>
              <Select.Option value="lost">Lost</Select.Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadData}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
              Log Inquiry
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}><Card><Statistic title="Total" value={stats.total} /></Card></Col>
        <Col span={5}><Card><Statistic title="New" value={stats.new_count} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={5}><Card><Statistic title="Contacted" value={stats.contacted} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
        <Col span={5}><Card><Statistic title="Converted" value={stats.converted} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={5}><Card><Statistic title="Lost" value={stats.lost} valueStyle={{ color: '#f5222d' }} /></Card></Col>
      </Row>

      <Card>
        <Table columns={columns} dataSource={inquiries} rowKey="id" loading={loading}
          pagination={{ pageSize: 20 }} />
      </Card>

      <Modal title="Log Inquiry" open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        footer={null} width={600}>
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="partner_id" label="Partner/Host" rules={[{ required: true }]}>
            <Select placeholder="Select partner">
              {partners.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="clinic_id" label="Location" rules={[{ required: true }]}>
            <Select placeholder="Select non-clinic location">
              {nonClinicLocations.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="client_name" label="Client Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="client_phone" label="Phone" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="client_email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="source" label="Source" initialValue="other">
            <Select>
              <Select.Option value="google_form">Google Form</Select.Option>
              <Select.Option value="whatsapp">WhatsApp</Select.Option>
              <Select.Option value="phone">Phone</Select.Option>
              <Select.Option value="walk_in">Walk-in</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="interest_notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} block>Create Inquiry</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Convert to Appointment" open={convertModalOpen}
        onCancel={() => { setConvertModalOpen(false); convertForm.resetFields(); setSelectedInquiry(null); }}
        footer={null} width={500}>
        {selectedInquiry && (
          <div style={{ marginBottom: 16 }}>
            <strong>{selectedInquiry.client_name}</strong> - {selectedInquiry.client_phone}
          </div>
        )}
        <Form form={convertForm} layout="vertical" onFinish={handleConvert}>
          <Form.Item name="doctor_id" label="Doctor" rules={[{ required: true }]}>
            <Select placeholder="Select doctor">
              {doctors.map(d => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="therapy_id" label="Therapy">
            <Select placeholder="Select therapy" allowClear>
              {therapies.map(t => <Select.Option key={t.id} value={t.id}>{t.name} - AED {t.price}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="Type" initialValue="drip">
            <Select>
              <Select.Option value="drip">Drip</Select.Option>
              <Select.Option value="consulting">Consulting</Select.Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="scheduled_date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scheduled_time" label="Time" rules={[{ required: true }]}>
                <TimePicker format="HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="duration_minutes" label="Duration (minutes)" initialValue={60}>
            <InputNumber min={15} max={240} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} block>Convert to Appointment</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Inquiries;
