import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Radio, Divider, Typography, message, DatePicker, Button } from 'antd';
import { dripsApi } from '../../../api/drips';
import { walletApi } from '../../../api/wallet';
import { Drip } from '../../../types';

const { Text } = Typography;

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patientId: string;
    walletBalance: number;
}

const PurchaseDripModal: React.FC<Props> = ({ open, onClose, onSuccess, patientId, walletBalance }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [drips, setDrips] = useState<Drip[]>([]);
    const [selectedDrip, setSelectedDrip] = useState<Drip | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [totalCost, setTotalCost] = useState<number>(0);

    useEffect(() => {
        if (open) {
            loadDrips();
            form.setFieldsValue({ quantity: 1, method: 'wallet' });
            setQuantity(1);
            setSelectedDrip(null);
            setTotalCost(0);
        }
    }, [open]);

    const loadDrips = async () => {
        try {
            const data = await dripsApi.getAll(true);
            setDrips(data);
        } catch (error) {
            message.error('Failed to load drips');
        }
    };

    useEffect(() => {
        if (selectedDrip) {
            setTotalCost(selectedDrip.price * quantity);
        } else {
            setTotalCost(0);
        }
    }, [selectedDrip, quantity]);

    const handleDripChange = (dripId: string) => {
        const drip = drips.find(d => d.id === dripId);
        setSelectedDrip(drip || null);
    };

    const handleQuantityChange = (value: number | null) => {
        setQuantity(value || 1);
    };

    const handleSubmit = async (values: any) => {
        if (values.method === 'wallet' && totalCost > walletBalance) {
            message.error('Insufficient wallet balance');
            return;
        }

        setLoading(true);
        try {
            await walletApi.purchaseDrip(patientId, {
                dripId: values.dripId,
                quantity: values.quantity,
                totalCost: totalCost,
                method: values.method,
                expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined
            });
            message.success('Drips purchased successfully');
            form.resetFields();
            setSelectedDrip(null);
            onSuccess();
            onClose();
        } catch (error: any) {
            // Handle axios error response properly
            const errorMessage = error.response?.data?.error || 'Failed to purchase drips';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Purchase Drip Credits"
            open={open}
            onCancel={onClose}
            footer={null}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ quantity: 1, method: 'wallet' }}
            >
                <Form.Item
                    name="dripId"
                    label="Select Drip"
                    rules={[{ required: true, message: 'Please select a drip' }]}
                >
                    <Select
                        placeholder="Select a drip"
                        onChange={handleDripChange}
                        optionLabelProp="label"
                    >
                        {drips.map(drip => (
                            <Select.Option key={drip.id} value={drip.id} label={drip.name}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{drip.name}</span>
                                    <span>${drip.price}</span>
                                </div>
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="quantity"
                    label="Quantity"
                    rules={[{ required: true, message: 'Quantity is required' }]}
                >
                    <InputNumber min={1} style={{ width: '100%' }} onChange={handleQuantityChange} />
                </Form.Item>

                {selectedDrip && (
                    <div style={{ marginBottom: 24, padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text>Price per unit:</Text>
                            <Text>${selectedDrip.price}</Text>
                        </div>
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text strong>Total Cost:</Text>
                            <Text strong style={{ fontSize: '16px' }}>${totalCost}</Text>
                        </div>
                    </div>
                )}

                <Form.Item
                    name="method"
                    label="Payment Method"
                    rules={[{ required: true }]}
                >
                    <Radio.Group style={{ width: '100%' }}>
                        <Radio.Button value="wallet" style={{ width: '100%', marginBottom: 8, textAlign: 'center' }}>
                            Wallet Balance
                            <div style={{ fontSize: '12px', color: totalCost > walletBalance ? 'red' : 'green' }}>
                                (Available: ${walletBalance})
                            </div>
                        </Radio.Button>
                        <div style={{ display: 'flex' }}>
                            <Radio.Button value="cash" style={{ flex: 1, textAlign: 'center' }}>Cash</Radio.Button>
                            <Radio.Button value="card" style={{ flex: 1, textAlign: 'center' }}>Card</Radio.Button>
                            <Radio.Button value="transfer" style={{ flex: 1, textAlign: 'center' }}>Transfer</Radio.Button>
                        </div>
                    </Radio.Group>
                </Form.Item>

                <Form.Item
                    name="expiresAt"
                    label="Expiry Date (Optional)"
                >
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                        Confirm Purchase
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default PurchaseDripModal;
