import React, { useState, useCallback } from 'react';
import { Typography, Card, Select, Space, Button, Row, Col, Statistic, Tag, Empty, Spin, message } from 'antd';
import { DollarOutlined, PlusOutlined, ShoppingCartOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { patientsApi } from '../api/patients';
import { walletApi } from '../api/wallet';
import { Patient, PatientWallet } from '../types';
import AddMoneyModal from '../components/patients/Wallet/AddMoneyModal';
import PurchaseDripModal from '../components/patients/Wallet/PurchaseDripModal';
import WalletTransactionHistory from '../components/patients/Wallet/WalletTransactionHistory';
import dayjs from 'dayjs';
import { handleApiError } from '../utils/handleApiError';

const { Title, Text } = Typography;

// Debounce helper
function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
    let timeout: any;
    return function executedFunction(...args: Parameters<T>) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

const Transactions: React.FC = () => {
    const [searchLoading, setSearchLoading] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [wallet, setWallet] = useState<PatientWallet | null>(null);
    const [walletLoading, setWalletLoading] = useState(false);
    const [addMoneyModalOpen, setAddMoneyModalOpen] = useState(false);
    const [purchaseDripModalOpen, setPurchaseDripModalOpen] = useState(false);

    const searchPatients = async (query: string) => {
        if (!query || query.length < 2) {
            setPatients([]);
            return;
        }
        setSearchLoading(true);
        try {
            const results = await patientsApi.search(query);
            setPatients(results);
        } catch (error) {
            handleApiError(error, 'Failed to search patients');
        } finally {
            setSearchLoading(false);
        }
    };

    const debouncedSearch = useCallback(debounce(searchPatients, 300), []);

    const handleSearch = (value: string) => {
        debouncedSearch(value);
    };

    const loadWallet = async (patientId: string) => {
        setWalletLoading(true);
        try {
            const response = await walletApi.getWallet(patientId);
            setWallet(response.data || null);
        } catch (error) {
            handleApiError(error, 'Failed to load wallet');
            setWallet(null);
        } finally {
            setWalletLoading(false);
        }
    };

    const handlePatientSelect = (patientId: string) => {
        const patient = patients.find(p => p.id === patientId);
        setSelectedPatient(patient || null);
        if (patient) {
            loadWallet(patient.id);
        }
    };

    const handleRefresh = () => {
        if (selectedPatient) {
            loadWallet(selectedPatient.id);
        }
    };

    const getActiveDrips = () => {
        if (!wallet) return [];
        return wallet.drip_balances.filter(drip => drip.remaining_quantity > 0);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                    Transactions
                </Title>
                {/* <Button icon={<ReloadOutlined />} onClick={loadData}>Refresh</Button> */}
            </div>
            {/* <Title level={4}>Transactions</Title> */}

            {/* Patient Search */}
            <div style={{ marginBottom: 24 }}>
                <Select
                    showSearch
                    placeholder="Search patient by name or phone..."
                    style={{ width: '100%' }}
                    size="large"
                    filterOption={false}
                    onSearch={handleSearch}
                    onChange={handlePatientSelect}
                    loading={searchLoading}
                    notFoundContent={searchLoading ? <Spin size="small" /> : null}
                    value={selectedPatient?.id}
                    allowClear
                    onClear={() => {
                        setSelectedPatient(null);
                        setWallet(null);
                        setPatients([]);
                    }}
                >
                    {patients.map(patient => (
                        <Select.Option key={patient.id} value={patient.id}>
                            <Space>
                                <UserOutlined />
                                <span>{patient.first_name} {patient.last_name}</span>
                                <Text type="secondary">
                                    <PhoneOutlined /> {patient.phone}
                                </Text>
                            </Space>
                        </Select.Option>
                    ))}
                </Select>
            </div>

            {/* Selected Patient Info */}
            {selectedPatient && (
                <>
                    <div style={{ marginBottom: 24 }}>
                        <Row justify="space-between" align="middle">
                            <Col>
                                <Space size="large">
                                    <div>
                                        <Text strong style={{ fontSize: 18 }}>
                                            {selectedPatient.first_name} {selectedPatient.last_name}
                                        </Text>
                                        <br />
                                        <Text type="secondary">
                                            <PhoneOutlined /> {selectedPatient.phone}
                                        </Text>
                                    </div>
                                </Space>
                            </Col>
                            <Col>
                                <Space>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setAddMoneyModalOpen(true)}
                                    >
                                        Add Money
                                    </Button>
                                    <Button
                                        icon={<ShoppingCartOutlined />}
                                        onClick={() => setPurchaseDripModalOpen(true)}
                                    >
                                        Buy Drips
                                    </Button>
                                </Space>
                            </Col>
                        </Row>
                    </div>

                    {/* Wallet Summary */}
                    {walletLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                            <Spin size="large" />
                        </div>
                    ) : wallet ? (
                        <>
                            <Row gutter={24} style={{ marginBottom: 24 }}>
                                <Col xs={24} sm={8}>
                                    <Card>
                                        <Statistic
                                            title="Wallet Balance"
                                            value={wallet.balance}
                                            precision={2}
                                            prefix={<DollarOutlined />}
                                            valueStyle={{ color: wallet.balance > 0 ? '#3f8600' : undefined }}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={16}>
                                    <Card title="Active Drip Credits">
                                        {getActiveDrips().length > 0 ? (
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                {getActiveDrips().map(drip => (
                                                    <div key={drip.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Space>
                                                            <Text>{drip.drip_name}</Text>
                                                            <Tag color="blue">x{drip.remaining_quantity}</Tag>
                                                        </Space>
                                                        {drip.expires_at && (
                                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                                Expires: {dayjs(drip.expires_at).format('MMM DD, YYYY')}
                                                            </Text>
                                                        )}
                                                    </div>
                                                ))}
                                            </Space>
                                        ) : (
                                            <Empty description="No active drip credits" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                        )}
                                    </Card>
                                </Col>
                            </Row>

                            {/* Transaction History */}
                            <Card title="Transaction History">
                                <WalletTransactionHistory
                                    transactions={wallet.transactions}
                                    loading={walletLoading}
                                />
                            </Card>
                        </>
                    ) : (
                        <Empty description="No wallet data available" />
                    )}
                </>
            )}

            {/* Empty State */}
            {!selectedPatient && (
                <Card>
                    <Empty
                        description="Search for a patient to view their wallet and manage transactions"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                </Card>
            )}

            {/* Modals */}
            {selectedPatient && (
                <>
                    <AddMoneyModal
                        open={addMoneyModalOpen}
                        onClose={() => setAddMoneyModalOpen(false)}
                        onSuccess={handleRefresh}
                        patientId={selectedPatient.id}
                    />
                    <PurchaseDripModal
                        open={purchaseDripModalOpen}
                        onClose={() => setPurchaseDripModalOpen(false)}
                        onSuccess={handleRefresh}
                        patientId={selectedPatient.id}
                        walletBalance={wallet?.balance || 0}
                    />
                </>
            )}
        </div>
    );
};

export default Transactions;
