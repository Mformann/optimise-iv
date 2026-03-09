import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, Select, InputNumber, Switch,
  message, Typography, Popconfirm, Tag, Statistic, Row, Col
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { partnersApi } from '../../api';
import { Partner, CommissionType } from '../../types';
import { handleApiError } from '../../utils/handleApiError';

const { Title } = Typography;

interface Commission {
  id: string;
  partner_id: string;
  patient_id: string;
  amount: number;
  status: 'pending' | 'paid';
  created_at: string;
  patient_name?: string;
}

const Partners: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const data = await partnersApi.getAll();
      setPartners(data);
    } catch (error) {
      handleApiError(error, 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async (partnerId: string) => {
    try {
      const data = await partnersApi.getCommissions(partnerId);
      setCommissions(data);
    } catch (error) {
      handleApiError(error, 'Failed to load commissions');
    }
  };

  const handleCreate = () => {
    setEditingPartner(null);
    form.resetFields();
    form.setFieldsValue({ commission_type: 'percentage', commission_value: 10 });
    setModalOpen(true);
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    form.setFieldsValue(partner);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await partnersApi.delete(id);
      message.success('Partner deleted');
      loadPartners();
    } catch (error) {
      handleApiError(error, 'Failed to delete partner');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingPartner) {
        await partnersApi.update(editingPartner.id, values);
        message.success('Partner updated');
      } else {
        await partnersApi.create(values as {
          name: string;
          contact_name?: string;
          email?: string;
          phone?: string;
          commission_type: CommissionType;
          commission_value: number;
        });
        message.success('Partner created');
      }
      setModalOpen(false);
      loadPartners();
    } catch (error) {
      handleApiError(error, 'Failed to save partner');
    }
  };

  const handleViewCommissions = async (partner: Partner) => {
    setSelectedPartner(partner);
    await loadCommissions(partner.id);
    setCommissionModalOpen(true);
  };

  const handleMarkPaid = async (commissionId: string) => {
    if (!selectedPartner) return;
    try {
      await partnersApi.markCommissionPaid(selectedPartner.id, commissionId);
      message.success('Commission marked as paid');
      await loadCommissions(selectedPartner.id);
      loadPartners();
    } catch (error) {
      handleApiError(error, 'Failed to update commission');
    }
  };

  const columns: ColumnsType<Partner> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Contact', dataIndex: 'contact_name', key: 'contact_name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Commission',
      key: 'commission',
      render: (_, record) => (
        <Tag color="blue">
          {record.commission_type === 'percentage'
            ? `${record.commission_value}%`
            : `$${record.commission_value}`}
        </Tag>
      ),
    },
    {
      title: 'Pending',
      key: 'pending',
      render: (_, record) => (
        <Tag color={record.commission_stats?.pending ? 'orange' : 'default'}>
          ${record.commission_stats?.pending?.toFixed(2) || '0.00'}
        </Tag>
      ),
    },
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
          <Button
            icon={<DollarOutlined />}
            size="small"
            onClick={() => handleViewCommissions(record)}
          >
            Commissions
          </Button>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this partner?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const commissionColumns: ColumnsType<Commission> = [
    { title: 'Patient', dataIndex: 'patient_name', key: 'patient_name' },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `$${amount.toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={status === 'paid' ? 'green' : 'orange'}>{status}</Tag>,
    },
    { title: 'Date', dataIndex: 'created_at', key: 'created_at', render: (date) => new Date(date).toLocaleDateString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) =>
        record.status === 'pending' && (
          <Button size="small" type="primary" onClick={() => handleMarkPaid(record.id)}>
            Mark Paid
          </Button>
        ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Partner Organizations</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Partner
        </Button>
      </div>

      <Table bordered scroll={{ x: true }} size="small" columns={columns} dataSource={partners} rowKey="id" loading={loading} />

      <Modal
        title={editingPartner ? 'Edit Partner' : 'New Partner'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Organization Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contact_name" label="Contact Name">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="commission_type" label="Commission Type" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="percentage">Percentage</Select.Option>
                  <Select.Option value="fixed">Fixed Amount</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="commission_value" label="Commission Value" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          {editingPartner && (
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">{editingPartner ? 'Update' : 'Create'}</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <Modal
        title={`Commissions - ${selectedPartner?.name}`}
        open={commissionModalOpen}
        onCancel={() => setCommissionModalOpen(false)}
        footer={null}
        width={800}
      >
        {selectedPartner && (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              {(() => {
                const totalCommission = commissions.reduce((sum, c) => sum + c.amount, 0);
                const pendingCommission = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
                const paidCommission = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
                return (
                  <>
                    <Col span={8}>
                      <Statistic
                        title="Total Commissions"
                        value={totalCommission}
                        prefix="$"
                        precision={2}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Pending"
                        value={pendingCommission}
                        prefix="$"
                        precision={2}
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Paid"
                        value={paidCommission}
                        prefix="$"
                        precision={2}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                  </>
                );
              })()}
            </Row>
            <Table columns={commissionColumns} dataSource={commissions} rowKey="id" />
          </>
        )}
      </Modal>
    </div>
  );
};

export default Partners;
