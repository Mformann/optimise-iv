import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Switch,
  message, Typography, Popconfirm, Tag, Select, Divider
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { therapiesApi, dripsApi } from '../../api';
import { Therapy, Drip } from '../../types';
import { handleApiError } from '../../utils/handleApiError';

const { Title } = Typography;
const { TextArea } = Input;

const Therapies: React.FC = () => {
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const [availableDrips, setAvailableDrips] = useState<Drip[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTherapy, setEditingTherapy] = useState<Therapy | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadTherapies();
    loadDrips();
  }, []);

  const loadTherapies = async () => {
    setLoading(true);
    try {
      const data = await therapiesApi.getAll();
      setTherapies(data);
    } catch (error) {
      handleApiError(error, 'Failed to load therapies');
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
    setEditingTherapy(null);
    form.resetFields();
    form.setFieldsValue({ duration_minutes: 30, price: 0, drips: [] });
    setModalOpen(true);
  };

  const handleEdit = (therapy: Therapy) => {
    setEditingTherapy(therapy);
    // Format drips for form
    const formattedDrips = therapy.drips?.map(d => ({
      drip_id: d.id,
      quantity: d.quantity
    })) || [];

    form.setFieldsValue({
      ...therapy,
      drips: formattedDrips
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await therapiesApi.delete(id);
      message.success('Therapy deleted');
      loadTherapies();
    } catch (error) {
      handleApiError(error, 'Failed to delete therapy');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingTherapy) {
        await therapiesApi.update(editingTherapy.id, values);
        message.success('Therapy updated');
      } else {
        await therapiesApi.create(values);
        message.success('Therapy created');
      }
      setModalOpen(false);
      loadTherapies();
    } catch (error) {
      handleApiError(error, 'Failed to save therapy');
    }
  };

  const columns: ColumnsType<Therapy> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Drips',
      key: 'drips',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.drips?.map(d => (
            <Tag key={d.id} color="blue">{d.name} x{d.quantity}</Tag>
          )) || '-'}
        </Space>
      )
    },
    {
      title: 'Duration',
      dataIndex: 'duration_minutes',
      key: 'duration_minutes',
      render: (min) => `${min} min`,
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `$${price.toFixed(2)}`,
      sorter: (a, b) => a.price - b.price,
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
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this therapy?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>IV Therapies</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Therapy
        </Button>
      </div>

      <Table bordered scroll={{ x: true }} size="small" columns={columns} dataSource={therapies} rowKey="id" loading={loading} />

      <Modal
        title={editingTherapy ? 'Edit Therapy' : 'New Therapy'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={2} />
          </Form.Item>

          <Divider orientation="left">Recipe (Drips)</Divider>

          <Form.List name="drips">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'drip_id']}
                      rules={[{ required: true, message: 'Missing drip' }]}
                    >
                      <Select placeholder="Select Drip" style={{ width: 300 }}>
                        {availableDrips.map(d => (
                          <Select.Option key={d.id} value={d.id}>{d.name} (${d.price})</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      rules={[{ required: true, message: 'Missing quantity' }]}
                    >
                      <InputNumber min={1} placeholder="Qty" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Drip to Recipe
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Divider />

          <Space size="large">
            <Form.Item
              name="duration_minutes"
              label="Duration (minutes)"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="price" label="Package Price ($)" rules={[{ required: true }]}>
              <InputNumber min={0} step={0.01} />
            </Form.Item>
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">{editingTherapy ? 'Update' : 'Create'}</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Therapies;
