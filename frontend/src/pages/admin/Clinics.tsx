import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, Switch, Select,
  message, Typography, Popconfirm, Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { clinicsApi, usersApi } from '../../api';
import { Clinic, User } from '../../types';
import { handleApiError } from '../../utils/handleApiError';

const { Title } = Typography;

const Clinics: React.FC = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicDoctors, setClinicDoctors] = useState<User[]>([]);
  const [allDoctors, setAllDoctors] = useState<User[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadClinics();
    loadDoctors();
  }, []);

  const loadClinics = async () => {
    setLoading(true);
    try {
      const data = await clinicsApi.getAll();
      setClinics(data);
    } catch (error) {
      handleApiError(error, 'Failed to load clinics');
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const data = await usersApi.getDoctors();
      setAllDoctors(data);
    } catch (error) {
      handleApiError(error, 'Failed to load doctors');
    }
  };

  const loadClinicDoctors = async (clinicId: string) => {
    try {
      const data = await clinicsApi.getDoctors(clinicId);
      setClinicDoctors(data);
    } catch (error) {
      handleApiError(error, 'Failed to load clinic doctors');
    }
  };

  const handleCreate = () => {
    setEditingClinic(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    form.setFieldsValue(clinic);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await clinicsApi.delete(id);
      message.success('Clinic deleted');
      loadClinics();
    } catch (error) {
      handleApiError(error, 'Failed to delete clinic');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingClinic) {
        await clinicsApi.update(editingClinic.id, values);
        message.success('Clinic updated');
      } else {
        await clinicsApi.create(values as never);
        message.success('Clinic created');
      }
      setModalOpen(false);
      loadClinics();
    } catch (error) {
      handleApiError(error, 'Failed to save clinic');
    }
  };

  const handleManageDoctors = async (clinic: Clinic) => {
    setSelectedClinic(clinic);
    await loadClinicDoctors(clinic.id);
    setDoctorModalOpen(true);
  };

  const handleAssignDoctor = async (doctorId: string) => {
    if (!selectedClinic) return;
    try {
      await clinicsApi.assignDoctor(selectedClinic.id, doctorId);
      message.success('Doctor assigned');
      await loadClinicDoctors(selectedClinic.id);
    } catch (error) {
      handleApiError(error, 'Failed to assign doctor');
    }
  };

  const handleRemoveDoctor = async (doctorId: string) => {
    if (!selectedClinic) return;
    try {
      await clinicsApi.removeDoctor(selectedClinic.id, doctorId);
      message.success('Doctor removed');
      await loadClinicDoctors(selectedClinic.id);
    } catch (error) {
      handleApiError(error, 'Failed to remove doctor');
    }
  };

  const columns: ColumnsType<Clinic> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Type',
      dataIndex: 'location_type',
      key: 'location_type',
      render: (type: string) => (
        <Tag color={type === 'clinic' ? 'blue' : 'orange'}>
          {type === 'clinic' ? 'Clinic' : 'Non-Clinic'}
        </Tag>
      ),
    },
    { title: 'Address', dataIndex: 'address', key: 'address' },
    { title: 'City', dataIndex: 'city', key: 'city' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<TeamOutlined />} size="small" onClick={() => handleManageDoctors(record)}>
            Doctors
          </Button>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this clinic?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const availableDoctors = allDoctors.filter(
    (d) => !clinicDoctors.some((cd) => cd.id === d.id)
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Clinics</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Clinic
        </Button>
      </div>

      <Table bordered scroll={{ x: true }} size="small" columns={columns} dataSource={clinics} rowKey="id" loading={loading} />

      <Modal
        title={editingClinic ? 'Edit Clinic' : 'New Clinic'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="location_type" label="Location Type" rules={[{ required: true, message: 'Location type is required' }]}>
            <Select placeholder="Select location type">
              <Select.Option value="clinic">Clinic</Select.Option>
              <Select.Option value="non_clinic">Non-Clinic</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="city" label="City" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          {editingClinic && (
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">{editingClinic ? 'Update' : 'Create'}</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <Modal
        title={`Manage Doctors - ${selectedClinic?.name}`}
        open={doctorModalOpen}
        onCancel={() => setDoctorModalOpen(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>Assigned Doctors</Title>
          {clinicDoctors.length === 0 ? (
            <p>No doctors assigned</p>
          ) : (
            <Space wrap>
              {clinicDoctors.map((d) => (
                <Tag key={d.id} closable onClose={() => handleRemoveDoctor(d.id)}>
                  {d.name}
                </Tag>
              ))}
            </Space>
          )}
        </div>
        <div>
          <Title level={5}>Available Doctors</Title>
          {availableDoctors.length === 0 ? (
            <p>All doctors are assigned</p>
          ) : (
            <Space wrap>
              {availableDoctors.map((d) => (
                <Tag
                  key={d.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleAssignDoctor(d.id)}
                >
                  + {d.name}
                </Tag>
              ))}
            </Space>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Clinics;
