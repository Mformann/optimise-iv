import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Statistic, Empty, Spin, Space, Tag } from 'antd';
import { PlusOutlined, ShoppingCartOutlined, HistoryOutlined } from '@ant-design/icons';
import { walletApi } from '../../../api/wallet';
import { PatientWallet as PatientWalletType } from '../../../types';
import WalletTransactionHistory from './WalletTransactionHistory';
import AddMoneyModal from './AddMoneyModal';
import PurchaseDripModal from './PurchaseDripModal';
import dayjs from 'dayjs';

const { Text } = Typography;

interface Props {
    patientId: string;
}

const PatientWallet: React.FC<Props> = ({ patientId }) => {
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState<PatientWalletType | null>(null);
    const [addMoneyVisible, setAddMoneyVisible] = useState(false);
    const [purchaseDripVisible, setPurchaseDripVisible] = useState(false);

    useEffect(() => {
        loadWallet();
    }, [patientId]);

    const loadWallet = async () => {
        setLoading(true);
        try {
            const response = await walletApi.getWallet(patientId);
            setWallet(response.data || null);
        } catch (error) {
            console.error('Failed to load wallet', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div>;
    }

    if (!wallet) {
        return <Empty description="Wallet not initialized" />;
    }

    return (
        <div className="patient-wallet">
            <Row gutter={[16, 16]}>
                {/* Money Balance Card */}
                <Col xs={24} md={8}>
                    <Card
                        title="Wallet Balance"
                        extra={
                            <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => setAddMoneyVisible(true)}
                            >
                                Add Money
                            </Button>
                        }
                    >
                        <Statistic
                            title="Available Funds"
                            value={wallet.balance}
                            precision={2}
                            prefix="$"
                            valueStyle={{ color: '#3f8600' }}
                        />
                        <Button
                            style={{ marginTop: 16 }}
                            block
                            icon={<ShoppingCartOutlined />}
                            onClick={() => setPurchaseDripVisible(true)}
                        >
                            Buy Drips
                        </Button>
                    </Card>
                </Col>

                {/* Drip Balances */}
                <Col xs={24} md={16}>
                    <Card title="Drip Credits">
                        {wallet.drip_balances.length > 0 ? (
                            <Row gutter={[16, 16]}>
                                {wallet.drip_balances.map(drip => (
                                    <Col span={12} key={drip.id}>
                                        <Card size="small" type="inner" title={drip.drip_name}>
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text type="secondary">Quantity</Text>
                                                    <Text strong style={{ fontSize: '18px' }}>{drip.remaining_quantity}</Text>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                    <Text type="secondary">Expires</Text>
                                                    <Text>
                                                        {drip.expires_at ? (
                                                            <Tag color={dayjs(drip.expires_at).isBefore(dayjs()) ? 'red' : 'green'}>
                                                                {dayjs(drip.expires_at).format('MMM DD, YYYY')}
                                                            </Tag>
                                                        ) : (
                                                            <Tag color="green">Never</Tag>
                                                        )}
                                                    </Text>
                                                </div>
                                            </Space>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        ) : (
                            <Empty description="No drip credits" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                    </Card>
                </Col>

                {/* Transaction History */}
                <Col span={24}>
                    <Card title={<span><HistoryOutlined /> Transaction History</span>}>
                        <WalletTransactionHistory transactions={wallet.transactions} />
                    </Card>
                </Col>
            </Row>

            <AddMoneyModal
                open={addMoneyVisible}
                onClose={() => setAddMoneyVisible(false)}
                onSuccess={loadWallet}
                patientId={patientId}
            />

            <PurchaseDripModal
                open={purchaseDripVisible}
                onClose={() => setPurchaseDripVisible(false)}
                onSuccess={loadWallet}
                patientId={patientId}
                walletBalance={wallet.balance}
            />
        </div>
    );
};

export default PatientWallet;
