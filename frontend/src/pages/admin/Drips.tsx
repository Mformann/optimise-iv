import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Modal, Form, Input, InputNumber,
    message, Typography, Tag, Popconfirm, Switch, Row, Col
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { dripsApi } from '../../api';
import { Drip } from '../../types';
import { handleApiError } from '../../utils/handleApiError';

const { Title } = Typography;
const { TextArea } = Input;

const Drips: React.FC = () => {
    const [drips, setDrips] = useState<Drip[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDrip, setEditingDrip] = useState<Drip | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        loadDrips();
    }, []);

    const loadDrips = async () => {
        setLoading(true);
        try {
            const data = await dripsApi.getAll();
            setDrips(data);
        } catch (error) {
            handleApiError(error, 'Failed to load drips');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingDrip(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleEdit = (drip: Drip) => {
        setEditingDrip(drip);
        form.setFieldsValue(drip);
        setModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await dripsApi.delete(id);
            message.success('Drip deleted successfully');
            loadDrips();
        } catch (error) {
            handleApiError(error, 'Failed to delete drip');
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            if (editingDrip) {
                await dripsApi.update(editingDrip.id, values);
                message.success('Drip updated successfully');
            } else {
                await dripsApi.create(values);
                message.success('Drip created successfully');
            }
            setModalOpen(false);
            loadDrips();
        } catch (error) {
            handleApiError(error, 'Failed to save drip');
        }
    };

    const columns: ColumnsType<Drip> = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <span><MedicineBoxOutlined /> {text}</span>,
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            render: (price) => `$${price.toFixed(2)} `,
        },
        {
            title: 'Stock',
            dataIndex: 'stock_quantity',
            key: 'stock_quantity',
            render: (stock) => (
                <Tag color={stock < 10 ? 'red' : 'green'}>
                    {stock} units
                </Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active) => (
                <Tag color={active ? 'success' : 'default'}>
                    {active ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Delete this drip?"
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Drips Management (Inventory)</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                    New Drip
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={drips}
                rowKey="id"
                bordered scroll={{ x: true }} size="small"
                loading={loading}
                pagination={{ pageSize: 20 }}
            />

            <Modal
                title={editingDrip ? 'Edit Drip' : 'New Drip'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ is_active: true, stock_quantity: 1 }}>
                    <Form.Item
                        name="name"
                        label="Drip Name"
                        rules={[{ required: true, message: 'Name is required' }]}
                    >
                        <Input placeholder="e.g. Vitamin C, Zinc, Glutathione" />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <TextArea rows={2} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="price"
                                label="Unit Price ($)"
                                rules={[{ required: true }]}
                            >
                                <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="stock_quantity"
                                label="Current Stock"
                                rules={[{ required: true }]}
                            >
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="is_active" label="Is Active" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">
                                {editingDrip ? 'Update' : 'Create'}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Drips;
