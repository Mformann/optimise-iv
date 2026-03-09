import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Card, Modal, Form, Input, InputNumber, Switch,
  message, Typography, Popconfirm, Tag, Select
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { offersApi, dripsApi } from '../../api';
import { Offer, Drip } from '../../types';
import { handleApiError } from '../../utils/handleApiError';

const { Title } = Typography;
const { TextArea } = Input;

const Offers: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [availableDrips, setAvailableDrips] = useState<Drip[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerType, setOfferType] = useState<'money' | 'drip'>('money');
  const [form] = Form.useForm();

  useEffect(() => {
    loadOffers();
    loadDrips();
  }, []);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const data = await offersApi.getAll();
      setOffers(data);
    } catch (error) {
      handleApiError(error, 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const loadDrips = async () => {
    try {
      const data = await dripsApi.getAll(true);
      setAvailableDrips(data);
    } catch (error) {
      handleApiError(error, 'Failed to load drips');
    }
  };

  const handleCreate = () => {
    setEditingOffer(null);
    form.resetFields();
    form.setFieldsValue({ type: 'money', cost: 0, fixed_value: true, is_active: true });
    setOfferType('money');
    setModalOpen(true);
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setOfferType(offer.type);
    form.setFieldsValue({
      ...offer,
      is_active: offer.is_active,
      fixed_value: offer.fixed_value,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await offersApi.delete(id);
      message.success('Offer deleted');
      loadOffers();
    } catch (error) {
      handleApiError(error, 'Failed to delete offer');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // Clean up fields based on type
      const payload = { ...values };
      if (payload.type === 'money') {
        payload.drip_id = null;
        payload.drip_quantity = null;
        payload.expires_at_pattern = null;
      } else {
        payload.value = null;
      }

      if (editingOffer) {
        await offersApi.update(editingOffer.id, payload);
        message.success('Offer updated');
      } else {
        await offersApi.create(payload);
        message.success('Offer created');
      }
      setModalOpen(false);
      loadOffers();
    } catch (error) {
      handleApiError(error, 'Failed to save offer');
    }
  };

  const columns: ColumnsType<Offer> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (type) => (
        <Tag color={type === 'money' ? 'blue' : 'green'}>
          {type === 'money' ? 'Money' : 'Drip'}
        </Tag>
      ),
      filters: [
        { text: 'Money', value: 'money' },
        { text: 'Drip', value: 'drip' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Cost',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      render: (cost, record) => (
        <span>
          ${cost.toFixed(2)}
          {!record.fixed_value && <Tag color="orange" style={{ marginLeft: 4 }}>Flexible</Tag>}
        </span>
      ),
      sorter: (a, b) => a.cost - b.cost,
    },
    {
      title: 'Reward',
      key: 'reward',
      width: 180,
      render: (_, record) => {
        if (record.type === 'money') {
          return <span>${record.value?.toFixed(2)} wallet credit</span>;
        }
        return <span>{record.drip_quantity}x {record.drip_name || 'Unknown Drip'}</span>;
      },
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code) => code ? <Tag>{code}</Tag> : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 90,
      render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>,
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this offer?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Offers / Promos</Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Offer
          </Button>
        </div>

        <Table columns={columns} dataSource={offers} rowKey="id" loading={loading} />
      </Card>

      <Modal
        title={editingOffer ? 'Edit Offer' : 'New Offer'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g., Summer Special, Buy 5 Get 1 Free" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="Optional description for this offer" />
          </Form.Item>

          <Form.Item name="type" label="Offer Type" rules={[{ required: true }]}>
            <Select onChange={(val: 'money' | 'drip') => setOfferType(val)}>
              <Select.Option value="money">Money (Wallet Credit)</Select.Option>
              <Select.Option value="drip">Drip Credits</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="cost"
            label="Cost (What patient pays)"
            rules={[{ required: true, message: 'Cost is required' }]}
          >
            <InputNumber min={0} step={0.01} precision={2} prefix="$" style={{ width: '100%' }} />
          </Form.Item>

          {offerType === 'money' && (
            <Form.Item
              name="value"
              label="Wallet Credit Value (What patient gets)"
              rules={[{ required: true, message: 'Value is required for money offers' }]}
            >
              <InputNumber min={0} step={0.01} precision={2} prefix="$" style={{ width: '100%' }} />
            </Form.Item>
          )}

          {offerType === 'drip' && (
            <>
              <Form.Item
                name="drip_id"
                label="Drip"
                rules={[{ required: true, message: 'Drip is required for drip offers' }]}
              >
                <Select placeholder="Select Drip" showSearch filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }>
                  {availableDrips.map(d => (
                    <Select.Option key={d.id} value={d.id} label={d.name}>
                      {d.name} (${d.price})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="drip_quantity"
                label="Drip Quantity"
                rules={[{ required: true, message: 'Quantity is required for drip offers' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="expires_at_pattern" label="Expiry Pattern (optional)">
                <Input placeholder="e.g., +90 days, +6 months, +1 year" />
              </Form.Item>
            </>
          )}

          <Form.Item name="code" label="Promo Code (optional)">
            <Input placeholder="e.g., SUMMER2025" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Space size="large">
            <Form.Item name="fixed_value" label="Fixed Cost" valuePropName="checked">
              <Switch checkedChildren="Fixed" unCheckedChildren="Flexible" />
            </Form.Item>
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">{editingOffer ? 'Update' : 'Create'}</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Offers;
