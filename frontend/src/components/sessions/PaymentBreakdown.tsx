import React, { useState, useEffect } from 'react';
import {
  Card, Table, Typography, Divider, InputNumber, Checkbox, Space, Alert, Statistic, Row, Col, Tag, Select
} from 'antd';
import { WalletOutlined, DollarOutlined, CreditCardOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface DripPaymentDetail {
  drip_id: string;
  drip_name: string;
  quantity_needed: number;
  quantity_from_credits: number;
  quantity_to_pay: number;
  unit_price: number;
  credit_value: number;
  payment_value: number;
}

export interface PaymentBreakdownData {
  drips: DripPaymentDetail[];
  totals: {
    total_amount: number;
    covered_by_credits: number;
    remaining_to_pay: number;
    wallet_balance: number;
    can_pay_from_wallet: boolean;
  };
}

export interface PaymentSelection {
  use_credits: boolean;
  use_wallet: boolean;
  wallet_amount: number;
  cash_amount: number;
  card_amount: number;
  pay_later: boolean;
  adjustment_amount: number;
  adjusted_remaining: number;
}

interface PaymentBreakdownProps {
  breakdown: PaymentBreakdownData | null;
  loading?: boolean;
  onChange: (payment: PaymentSelection) => void;
}

const PaymentBreakdown: React.FC<PaymentBreakdownProps> = ({ breakdown, loading, onChange }) => {
  const [useCredits] = useState(true);
  const [useWallet, setUseWallet] = useState(false);
  const [payLater, setPayLater] = useState(false);
  const [walletAmount, setWalletAmount] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);

  // Adjustment state
  const [adjustmentType, setAdjustmentType] = useState<'-' | '+'>('-');
  const [adjustmentMode, setAdjustmentMode] = useState<'%' | '$'>('%');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0);

  // Calculate remaining after credits
  const remainingToPay = breakdown?.totals.remaining_to_pay || 0;
  const walletBalance = breakdown?.totals.wallet_balance || 0;

  // Compute adjustment
  const computeAdjustment = (): number => {
    if (adjustmentValue === 0) return 0;
    const adj = adjustmentMode === '%'
      ? (remainingToPay * adjustmentValue / 100)
      : adjustmentValue;
    return adjustmentType === '-' ? -adj : adj;
  };

  const adjustment = computeAdjustment();
  const adjustedRemainingToPay = Math.max(0, remainingToPay + adjustment);

  // Calculate how much is still unpaid (using adjusted remaining)
  const totalProvided = (useWallet ? walletAmount : 0) + cashAmount + cardAmount;
  const stillUnpaid = Math.max(0, adjustedRemainingToPay - totalProvided);

  // Notify parent of payment changes
  useEffect(() => {
    onChange({
      use_credits: useCredits,
      use_wallet: useWallet,
      wallet_amount: useWallet ? walletAmount : 0,
      cash_amount: cashAmount,
      card_amount: cardAmount,
      pay_later: payLater,
      adjustment_amount: adjustment,
      adjusted_remaining: adjustedRemainingToPay,
    });
  }, [useCredits, useWallet, walletAmount, cashAmount, cardAmount, payLater, adjustment, adjustedRemainingToPay]);

  // Auto-set wallet amount when checkbox is toggled (uses adjusted remaining)
  useEffect(() => {
    if (useWallet) {
      const maxWallet = Math.min(walletBalance, adjustedRemainingToPay);
      setWalletAmount(maxWallet);
    } else {
      setWalletAmount(0);
    }
  }, [useWallet, walletBalance, adjustedRemainingToPay]);

  // Reset pay later if payment provided covers everything
  useEffect(() => {
    if (stillUnpaid === 0 && payLater) {
      setPayLater(false);
    }
  }, [stillUnpaid]);

  if (!breakdown) {
    return <Card loading={loading}>Loading payment information...</Card>;
  }

  const columns = [
    {
      title: 'Drip',
      dataIndex: 'drip_name',
      key: 'drip_name',
    },
    {
      title: 'Qty',
      dataIndex: 'quantity_needed',
      key: 'quantity_needed',
      width: 60,
      align: 'center' as const,
    },
    {
      title: 'From Credits',
      key: 'credits',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: DripPaymentDetail) => (
        record.quantity_from_credits > 0 ? (
          <Tag color="green">{record.quantity_from_credits}</Tag>
        ) : (
          <Text type="secondary">0</Text>
        )
      ),
    },
    {
      title: 'To Pay',
      key: 'to_pay',
      width: 150,
      render: (_: any, record: DripPaymentDetail) => (
        record.quantity_to_pay > 0 ? (
          <span>
            {record.quantity_to_pay} x ${record.unit_price.toFixed(2)} = <Text strong>${record.payment_value.toFixed(2)}</Text>
          </span>
        ) : (
          <Tag color="green">Covered</Tag>
        )
      ),
    },
  ];

  const hasCreditsToUse = breakdown.totals.covered_by_credits > 0;
  const fullyPaidByCredits = adjustedRemainingToPay === 0;

  return (
    <Card
      title={<span><DollarOutlined /> Payment Summary</span>}
      style={{ marginBottom: 24 }}
    >
      {/* Drips Breakdown Table */}
      <Table
        dataSource={breakdown.drips}
        columns={columns}
        rowKey="drip_id"
        pagination={false}
        size="small"
        style={{ marginBottom: 16 }}
      />

      {/* Totals Section */}
      <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Total Amount"
              value={breakdown.totals.total_amount}
              precision={2}
              prefix="$"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Covered by Credits"
              value={breakdown.totals.covered_by_credits}
              precision={2}
              prefix="-$"
              valueStyle={{ color: hasCreditsToUse ? '#3f8600' : '#999' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Remaining to Pay"
              value={breakdown.totals.remaining_to_pay}
              precision={2}
              prefix="$"
              valueStyle={{ color: remainingToPay > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Col>
        </Row>

        {/* Adjustment Controls */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text>Adjustment:</Text>
          <Select value={adjustmentType} onChange={setAdjustmentType} style={{ width: 60 }} size="small">
            <Select.Option value="-">-</Select.Option>
            <Select.Option value="+">+</Select.Option>
          </Select>
          <InputNumber
            value={adjustmentValue}
            onChange={(val) => setAdjustmentValue(val || 0)}
            min={0}
            precision={adjustmentMode === '%' ? 1 : 2}
            style={{ width: 90 }}
            size="small"
          />
          <Select value={adjustmentMode} onChange={setAdjustmentMode} style={{ width: 60 }} size="small">
            <Select.Option value="%">%</Select.Option>
            <Select.Option value="$">$</Select.Option>
          </Select>
          {adjustment !== 0 && (
            <Tag color={adjustmentType === '-' ? 'green' : 'orange'}>
              {adjustmentType === '-' ? 'Discount' : 'Surcharge'}: ${Math.abs(adjustment).toFixed(2)}
            </Tag>
          )}
        </div>

        {adjustment !== 0 && (
          <Row style={{ marginTop: 8 }}>
            <Col span={24}>
              <Statistic
                title="Adjusted Remaining"
                value={adjustedRemainingToPay}
                precision={2}
                prefix="$"
                valueStyle={{ color: adjustedRemainingToPay > 0 ? '#cf1322' : '#3f8600', fontSize: 20 }}
              />
            </Col>
          </Row>
        )}
      </div>

      {fullyPaidByCredits ? (
        <Alert
          message="Fully Covered by Drip Credits"
          description="All drips in this session are covered by the patient's pre-purchased drip credits. No additional payment required."
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <>
          <Divider orientation="left">Payment Method</Divider>

          {/* Wallet Payment Option */}
          <div style={{ marginBottom: 16 }}>
            <Space align="start">
              <Checkbox
                checked={useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                disabled={walletBalance <= 0}
              >
                <WalletOutlined /> Use Wallet Balance
              </Checkbox>
              <Text type="secondary">(Available: ${walletBalance.toFixed(2)})</Text>
            </Space>
            {useWallet && (
              <div style={{ marginTop: 8, marginLeft: 24 }}>
                <Space>
                  <Text>Amount:</Text>
                  <InputNumber
                    value={walletAmount}
                    onChange={(val) => setWalletAmount(val || 0)}
                    min={0}
                    max={Math.min(walletBalance, adjustedRemainingToPay)}
                    precision={2}
                    prefix="$"
                    style={{ width: 120 }}
                  />
                </Space>
              </div>
            )}
          </div>

          {/* Cash Payment */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <DollarOutlined />
              <Text>Cash:</Text>
              <InputNumber
                value={cashAmount}
                onChange={(val) => setCashAmount(val || 0)}
                min={0}
                precision={2}
                prefix="$"
                style={{ width: 120 }}
              />
            </Space>
          </div>

          {/* Card Payment */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <CreditCardOutlined />
              <Text>Card:</Text>
              <InputNumber
                value={cardAmount}
                onChange={(val) => setCardAmount(val || 0)}
                min={0}
                precision={2}
                prefix="$"
                style={{ width: 120 }}
              />
            </Space>
          </div>

          <Divider />

          {/* Pay Later Option */}
          <div style={{ marginBottom: 16 }}>
            <Checkbox
              checked={payLater}
              onChange={(e) => setPayLater(e.target.checked)}
              disabled={stillUnpaid === 0}
            >
              <Text strong style={{ color: '#fa8c16' }}>Pay Later (Add to Pending Balance)</Text>
            </Checkbox>
            <div style={{ marginLeft: 24, marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Patient's wallet balance will become negative. They can settle this amount later at reception.
              </Text>
            </div>
          </div>

          {/* Payment Status */}
          {stillUnpaid > 0 && !payLater ? (
            <Alert
              message={`Remaining Unpaid: $${stillUnpaid.toFixed(2)}`}
              description="Please provide sufficient payment to complete the session."
              type="warning"
              showIcon
            />
          ) : (
            <Alert
              message={payLater ? "Payment Deferred" : "Payment Complete"}
              description={
                payLater
                  ? `Remaining amount of $${stillUnpaid.toFixed(2)} will be added to pending balance.`
                  : `Total payment: $${totalProvided.toFixed(2)}${totalProvided > adjustedRemainingToPay ? ` (Change: $${(totalProvided - adjustedRemainingToPay).toFixed(2)})` : ''}`
              }
              type={payLater ? "info" : "success"}
              showIcon
            />
          )}
        </>
      )}
    </Card>
  );
};

export default PaymentBreakdown;
