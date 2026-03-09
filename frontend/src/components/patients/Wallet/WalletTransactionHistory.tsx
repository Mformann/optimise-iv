import React from 'react';
import { Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { WalletTransaction } from '../../../types';

const { Text } = Typography;

interface Props {
    transactions: WalletTransaction[];
    loading?: boolean;
}

const WalletTransactionHistory: React.FC<Props> = ({ transactions, loading }) => {
    const getTypeTag = (type: string) => {
        switch (type) {
            case 'money_deposit': return <Tag color="success">Deposit</Tag>;
            case 'money_spent': return <Tag color="warning">Spent</Tag>;
            case 'drip_purchase': return <Tag color="blue">Drip Buy</Tag>;
            case 'drip_usage': return <Tag color="default">Drip Use</Tag>;
            default: return <Tag>{type}</Tag>;
        }
    };

    const columns: ColumnsType<WalletTransaction> = [
        {
            title: 'Date',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => dayjs(date).format('MMM DD, YYYY HH:mm'),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => getTypeTag(type),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount, record) => {
                if (record.type === 'drip_usage' || record.type === 'drip_purchase') {
                    return '-'; // Or show cost if available?
                }
                return (
                    <Text type={amount > 0 ? 'success' : 'danger'}>
                        ${Math.abs(amount).toFixed(2)}
                    </Text>
                );
            }
        },
        {
            title: 'Drip',
            key: 'drip',
            render: (_, record) => {
                if (record.drip_id && record.drip_quantity) {
                    return `${record.drip_quantity} units`;
                }
                return '-';
            }
        },
        {
            title: 'Method',
            dataIndex: 'payment_method',
            key: 'payment_method',
            render: (method) => method ? <Tag>{method.toUpperCase()}</Tag> : '-',
        },
        {
            title: 'Source',
            key: 'source',
            render: (_, record) => {
                if (record.reference_type === 'appointment') {
                    return <Tag color="purple">Appointment</Tag>;
                }
                if (record.reference_type === 'drip_order') {
                    return <Tag color="cyan">Drip Order</Tag>;
                }
                if (record.reference_type === 'manual') {
                    return <Tag color="default">Manual</Tag>;
                }
                if (record.reference_id) {
                    return <Tag color="default">{record.reference_id.slice(0, 8)}...</Tag>;
                }
                return '-';
            },
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
        },
    ];

    return (
        <Table
            dataSource={transactions}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            size="small"
        />
    );
};

export default WalletTransactionHistory;
