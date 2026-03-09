import React, { useState } from 'react';
import { Modal, Form, InputNumber, Select, Input, Button, message } from 'antd';
import { walletApi } from '../../../api/wallet';

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patientId: string;
}

const AddMoneyModal: React.FC<Props> = ({ open, onClose, onSuccess, patientId }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            await walletApi.addMoney(patientId, values);
            message.success('Money added successfully');
            form.resetFields();
            onSuccess();
            onClose();
        } catch (error) {
            message.error('Failed to add money');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Add Money to Wallet"
            open={open}
            onCancel={onClose}
            footer={null}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ method: 'cash' }}
            >
                <Form.Item
                    name="amount"
                    label="Amount"
                    rules={[{ required: true, message: 'Please enter amount' }]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => (value ? parseInt(value.replace(/\$\s?|(,*)/g, ''), 10) : 0) as any}
                        min={1}
                        step={1}
                        precision={0}
                    />
                </Form.Item>

                <Form.Item
                    name="method"
                    label="Payment Method"
                    rules={[{ required: true }]}
                >
                    <Select>
                        <Select.Option value="cash">Cash</Select.Option>
                        <Select.Option value="card">Card</Select.Option>
                        <Select.Option value="transfer">Bank Transfer</Select.Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="description"
                    label="Description"
                >
                    <Input.TextArea rows={2} />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                        Add Money
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddMoneyModal;
