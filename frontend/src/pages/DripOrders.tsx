import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Space, Typography, Row, Col, Statistic,
  Select, Modal, Input, message, Popconfirm, Descriptions
} from 'antd';
import {
  MedicineBoxOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ReloadOutlined, ClockCircleOutlined, ExperimentOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { dripOrdersApi, clinicsApi } from '../api';
import { DripOrder, Clinic } from '../types';
import { useAuth } from '../context/AuthContext';
import PaymentBreakdown, { PaymentSelection, PaymentBreakdownData } from '../components/sessions/PaymentBreakdown';
import { handleApiError } from '../utils/handleApiError';

const { Title, Text } = Typography;
const { TextArea } = Input;

const DripOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DripOrder[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, delivered_today: 0, cancelled: 0 });
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterClinic, setFilterClinic] = useState<string | undefined>();

  // Deliver modal state
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DripOrder | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [delivering, setDelivering] = useState(false);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdownData | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSelection, setPaymentSelection] = useState<PaymentSelection>({
    use_credits: true,
    use_wallet: false,
    wallet_amount: 0,
    cash_amount: 0,
    card_amount: 0,
    pay_later: false,
    adjustment_amount: 0,
    adjusted_remaining: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData, statsData, clinicsData] = await Promise.all([
        dripOrdersApi.getAll({ status: filterStatus, clinic_id: filterClinic }),
        dripOrdersApi.getStats(filterClinic),
        clinicsApi.getAll(),
      ]);
      setOrders(ordersData);
      setStats(statsData);
      setClinics(clinicsData);
    } catch (error) {
      handleApiError(error, 'Failed to load drip orders');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterClinic]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeliverClick = async (order: DripOrder) => {
    setSelectedOrder(order);
    setDeliveryNotes('');
    setPaymentSelection({
      use_credits: true,
      use_wallet: false,
      wallet_amount: 0,
      cash_amount: 0,
      card_amount: 0,
      pay_later: false,
      adjustment_amount: 0,
      adjusted_remaining: 0,
    });
    setPaymentBreakdown(null);
    setDeliverModalOpen(true);

    // Load payment preview
    setPaymentLoading(true);
    try {
      const preview = await dripOrdersApi.getPaymentPreview(order.id);
      setPaymentBreakdown(preview);
    } catch (error) {
      console.error('Failed to load payment preview:', error);
      setPaymentBreakdown(null);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!selectedOrder) return;

    // Validate payment
    if (paymentBreakdown && !paymentSelection.pay_later) {
      const remainingToPay = paymentBreakdown.totals.remaining_to_pay;
      const totalProvided = (paymentSelection.use_wallet ? paymentSelection.wallet_amount : 0)
        + paymentSelection.cash_amount
        + paymentSelection.card_amount;

      if (remainingToPay > 0 && totalProvided < remainingToPay) {
        message.error(`Payment of $${totalProvided.toFixed(2)} does not cover remaining amount of $${remainingToPay.toFixed(2)}`);
        return;
      }
    }

    setDelivering(true);
    try {
      await dripOrdersApi.deliver(selectedOrder.id, {
        delivery_notes: deliveryNotes || undefined,
        payment: {
          use_credits: paymentSelection.use_credits,
          use_wallet: paymentSelection.use_wallet,
          wallet_amount: paymentSelection.wallet_amount,
          cash_amount: paymentSelection.cash_amount,
          card_amount: paymentSelection.card_amount,
          pay_later: paymentSelection.pay_later,
        },
      });
      message.success('Drip delivered successfully!');
      setDeliverModalOpen(false);
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to deliver drip order');
    } finally {
      setDelivering(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      await dripOrdersApi.cancel(orderId);
      message.success('Order cancelled');
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to cancel order');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'in_progress': return 'processing';
      case 'delivered': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const canDeliver = user?.role === 'admin' || user?.role === 'nurse';
  const canCancel = user?.role === 'admin' || user?.role === 'doctor';

  const columns: ColumnsType<DripOrder> = [
    {
      title: 'Patient',
      key: 'patient',
      render: (_, record) => (
        <div>
          <Text strong>{record.patient_name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.patient_phone}</Text>
        </div>
      ),
    },
    {
      title: 'Drip',
      key: 'drip',
      render: (_, record) => (
        <div>
          <Text>{record.drip_name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.quantity} x ${record.drip_price?.toFixed(2) || '0.00'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Clinic',
      dataIndex: 'clinic_name',
      key: 'clinic_name',
    },
    {
      title: 'Prescribed By',
      dataIndex: 'prescribed_by_name',
      key: 'prescribed_by_name',
    },
    {
      title: 'Prescribed At',
      dataIndex: 'prescribed_at',
      key: 'prescribed_at',
      render: (val) => dayjs(val).format('MMM DD, YYYY HH:mm'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>,
    },
    {
      title: 'Delivered By',
      dataIndex: 'delivered_by_name',
      key: 'delivered_by_name',
      render: (val) => val || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && canDeliver && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleDeliverClick(record)}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Deliver
            </Button>
          )}
          {record.status === 'pending' && canCancel && (
            <Popconfirm title="Cancel this order?" onConfirm={() => handleCancel(record.id)}>
              <Button size="small" danger icon={<CloseCircleOutlined />}>
                Cancel
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <ExperimentOutlined /> Drip Orders
        </Title>
        <Button icon={<ReloadOutlined />} onClick={loadData}>Refresh</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats.in_progress}
              prefix={<MedicineBoxOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Delivered Today"
              value={stats.delivered_today}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Cancelled"
              value={stats.cancelled}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <Select
            placeholder="Filter by status"
            style={{ width: 160 }}
            value={filterStatus}
            onChange={setFilterStatus}
            allowClear
          >
            <Select.Option value="pending">Pending</Select.Option>
            <Select.Option value="in_progress">In Progress</Select.Option>
            <Select.Option value="delivered">Delivered</Select.Option>
            <Select.Option value="cancelled">Cancelled</Select.Option>
          </Select>
          <Select
            placeholder="Filter by clinic"
            style={{ width: 200 }}
            value={filterClinic}
            onChange={setFilterClinic}
            allowClear
          >
            {clinics.map(c => (
              <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
            ))}
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* Deliver Modal */}
      <Modal
        key={selectedOrder?.id}
        title="Deliver Drip Order"
        open={deliverModalOpen}
        onCancel={() => setDeliverModalOpen(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setDeliverModalOpen(false)}>Cancel</Button>,
          <Button
            key="deliver"
            type="primary"
            loading={delivering}
            onClick={handleDeliver}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            icon={<CheckCircleOutlined />}
          >
            Confirm Delivery & Process Payment
          </Button>,
        ]}
      >
        {selectedOrder && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Patient">{selectedOrder.patient_name}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedOrder.patient_phone}</Descriptions.Item>
              <Descriptions.Item label="Drip">{selectedOrder.drip_name}</Descriptions.Item>
              <Descriptions.Item label="Quantity">{selectedOrder.quantity}</Descriptions.Item>
              <Descriptions.Item label="Clinic">{selectedOrder.clinic_name}</Descriptions.Item>
              <Descriptions.Item label="Prescribed By">{selectedOrder.prescribed_by_name}</Descriptions.Item>
              {selectedOrder.notes && (
                <Descriptions.Item label="Doctor's Notes" span={2}>{selectedOrder.notes}</Descriptions.Item>
              )}
            </Descriptions>

            <PaymentBreakdown
              breakdown={paymentBreakdown}
              loading={paymentLoading}
              onChange={setPaymentSelection}
            />

            <div style={{ marginTop: 16 }}>
              <Text strong>Delivery Notes (optional):</Text>
              <TextArea
                rows={2}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Any notes about the delivery..."
                style={{ marginTop: 8 }}
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default DripOrders;
