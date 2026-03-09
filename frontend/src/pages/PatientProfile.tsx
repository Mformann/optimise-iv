import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Row, Col, Typography, Descriptions, Tabs, Table, Tag,
    Button, Modal, Space, Empty, Spin, message, Badge, Checkbox
} from 'antd';
import {
    UserOutlined, HistoryOutlined, TeamOutlined,
    ArrowLeftOutlined, InfoCircleOutlined, CalendarOutlined,
    PhoneOutlined, MailOutlined, HomeOutlined, WalletOutlined,
    ExperimentOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { patientsApi, appointmentsApi, dripOrdersApi } from '../api';
import { Patient, Appointment, DripOrder } from '../types';
import PatientWallet from '../components/patients/Wallet/PatientWallet';
import { handleApiError } from '../utils/handleApiError';

const { Title, Text } = Typography;

const PatientProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [referrals, setReferrals] = useState<Patient[]>([]);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [dripOrders, setDripOrders] = useState<DripOrder[]>([]);

    useEffect(() => {
        if (id) {
            loadData(id);
        }
    }, [id]);

    const loadData = async (patientId: string) => {
        setLoading(true);
        try {
            const [patientData, apptsData, referralsData, ordersData] = await Promise.all([
                patientsApi.getById(patientId),
                appointmentsApi.getAll({ patientId, limit: 100 }),
                patientsApi.getReferrals(patientId),
                dripOrdersApi.getByPatient(patientId)
            ]);
            setPatient(patientData);
            setAppointments(apptsData.data);
            setReferrals(referralsData);
            setDripOrders(ordersData);
        } catch (error) {
            handleApiError(error, 'Failed to load patient data');
            navigate('/patients');
        } finally {
            setLoading(false);
        }
    };

    const handleBloodTestToggle = async (checked: boolean) => {
        try {
            await patientsApi.update(patient!.id, { blood_test_done: checked });
            setPatient({ ...patient!, blood_test_done: checked });
            message.success('Blood test status updated');
        } catch (error) {
            handleApiError(error, 'Failed to update blood test status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'processing';
            case 'in_progress': return 'warning';
            case 'completed': return 'success';
            case 'cancelled': return 'error';
            case 'no_show': return 'default';
            default: return 'default';
        }
    };

    const showAppointmentDetails = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setModalVisible(true);
    };

    const appointmentColumns: ColumnsType<Appointment> = [
        {
            title: 'Date',
            dataIndex: 'scheduled_date',
            key: 'scheduled_date',
            render: (date) => dayjs(date).format('MMM DD, YYYY'),
        },
        {
            title: 'Time',
            dataIndex: 'scheduled_time',
            key: 'scheduled_time',
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag color={type === 'drip' ? 'blue' : 'green'}>{type.toUpperCase()}</Tag>,
        },
        {
            title: 'Doctor',
            dataIndex: 'doctor_name',
            key: 'doctor_name',
        },
        {
            title: 'Clinic',
            dataIndex: 'clinic_name',
            key: 'clinic_name',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <Badge status={getStatusColor(status) as any} text={status} />,
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<InfoCircleOutlined />}
                    onClick={() => showAppointmentDetails(record)}
                >
                    Details
                </Button>
            ),
        },
    ];

    const referralColumns: ColumnsType<Patient> = [
        {
            title: 'Name',
            key: 'name',
            render: (_, record) => `${record.first_name} ${record.last_name}`,
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'City',
            dataIndex: 'city',
            key: 'city',
        },
        {
            title: 'Joined',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => dayjs(date).format('MMM DD, YYYY'),
        },
    ];

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!patient) {
        return <Empty description="Patient not found" />;
    }

    return (
        <div style={{ padding: '24px' }}>
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/patients')}
                style={{ marginBottom: 16 }}
            >
                Back to Patients
            </Button>

            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card>
                        <Row gutter={24} align="middle">
                            <Col>
                                <div style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    background: '#f0f2f5',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <UserOutlined style={{ fontSize: 40, color: '#bfbfbf' }} />
                                </div>
                            </Col>
                            <Col flex="1">
                                <Title level={2} style={{ margin: 0 }}>
                                    {patient.first_name} {patient.last_name}
                                </Title>
                                <Space split={<Text type="secondary">|</Text>} wrap>
                                    <span><PhoneOutlined /> {patient.phone}</span>
                                    {patient.email && <span><MailOutlined /> {patient.email}</span>}
                                    {patient.city && <span><HomeOutlined /> {patient.city}</span>}
                                    {patient.date_of_birth && (
                                        <span>
                                            <CalendarOutlined /> DOB: {dayjs(patient.date_of_birth).format('MMM DD, YYYY')}
                                            ({dayjs().diff(dayjs(patient.date_of_birth), 'year')} years)
                                        </span>
                                    )}
                                </Space>
                            </Col>
                            <Col>
                                <Space direction="vertical" align="end">
                                    <Tag color="blue" style={{ fontSize: 14, padding: '4px 8px' }}>
                                        {referrals.length} Referrals
                                    </Tag>
                                    <Checkbox
                                        checked={!!patient.blood_test_done}
                                        onChange={(e) => handleBloodTestToggle(e.target.checked)}
                                    >
                                        Blood Test Done
                                    </Checkbox>
                                </Space>
                            </Col>
                        </Row>
                    </Card>
                </Col>

                <Col span={24}>
                    <Card>
                        <Tabs defaultActiveKey="appointments" items={[
                            {
                                key: 'appointments',
                                label: <span><HistoryOutlined /> Appointments</span>,
                                children: (
                                    <Table
                                        columns={appointmentColumns}
                                        dataSource={appointments}
                                        rowKey="id"
                                        pagination={{ pageSize: 10 }}
                                    />
                                )
                            },
                            {
                                key: 'referrals',
                                label: <span><TeamOutlined /> Referrals</span>,
                                children: (
                                    <Table
                                        columns={referralColumns}
                                        dataSource={referrals}
                                        rowKey="id"
                                        pagination={{ pageSize: 10 }}
                                    />
                                )
                            },
                            {
                                key: 'drip-orders',
                                label: <span><ExperimentOutlined /> Drip Orders</span>,
                                children: (
                                    <Table
                                        columns={[
                                            {
                                                title: 'Drip',
                                                dataIndex: 'drip_name',
                                                key: 'drip_name',
                                            },
                                            {
                                                title: 'Quantity',
                                                dataIndex: 'quantity',
                                                key: 'quantity',
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
                                                render: (date: string) => dayjs(date).format('MMM DD, YYYY HH:mm'),
                                            },
                                            {
                                                title: 'Status',
                                                dataIndex: 'status',
                                                key: 'status',
                                                render: (status: string) => {
                                                    const color = status === 'pending' ? 'orange' : status === 'delivered' ? 'green' : status === 'cancelled' ? 'red' : 'blue';
                                                    return <Tag color={color}>{status.toUpperCase()}</Tag>;
                                                },
                                            },
                                            {
                                                title: 'Delivered By',
                                                dataIndex: 'delivered_by_name',
                                                key: 'delivered_by_name',
                                                render: (val: string) => val || '-',
                                            },
                                            {
                                                title: 'Delivered At',
                                                dataIndex: 'delivered_at',
                                                key: 'delivered_at',
                                                render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY HH:mm') : '-',
                                            },
                                            {
                                                title: 'Clinic',
                                                dataIndex: 'clinic_name',
                                                key: 'clinic_name',
                                            },
                                        ]}
                                        dataSource={dripOrders}
                                        rowKey="id"
                                        pagination={{ pageSize: 10 }}
                                    />
                                )
                            },
                            {
                                key: 'wallet',
                                label: <span><WalletOutlined /> Wallet</span>,
                                children: <PatientWallet patientId={patient.id} />
                            },
                            {
                                key: 'medical',
                                label: <span><InfoCircleOutlined /> Medical Notes</span>,
                                children: (
                                    <div style={{ padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
                                        <Text italic={!patient.medical_notes}>
                                            {patient.medical_notes || 'No medical notes recorded for this patient.'}
                                        </Text>
                                    </div>
                                )
                            }
                        ]} />
                    </Card>
                </Col>
            </Row>

            <Modal
                title="Appointment Details"
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setModalVisible(false)}>Close</Button>
                ]}
                width={700}
            >
                {selectedAppointment && (
                    <Descriptions bordered column={2}>
                        <Descriptions.Item label="Date">{selectedAppointment.scheduled_date}</Descriptions.Item>
                        <Descriptions.Item label="Time">{selectedAppointment.scheduled_time}</Descriptions.Item>
                        <Descriptions.Item label="Doctor">{selectedAppointment.doctor_name}</Descriptions.Item>
                        <Descriptions.Item label="Clinic">{selectedAppointment.clinic_name}</Descriptions.Item>
                        <Descriptions.Item label="Type">
                            <Tag color={selectedAppointment.type === 'drip' ? 'blue' : 'green'}>
                                {selectedAppointment.type.toUpperCase()}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                            <Tag color={getStatusColor(selectedAppointment.status)}>
                                {selectedAppointment.status.toUpperCase()}
                            </Tag>
                        </Descriptions.Item>

                        {selectedAppointment.status === 'completed' && (
                            <>
                                <Descriptions.Item label="Actual Start" span={1}>
                                    {selectedAppointment.actual_start_at ? dayjs(selectedAppointment.actual_start_at).format('HH:mm') : '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Actual End" span={1}>
                                    {selectedAppointment.actual_end_at ? dayjs(selectedAppointment.actual_end_at).format('HH:mm') : '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Doctor Remarks" span={2}>
                                    {selectedAppointment.remarks || 'No remarks'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Completion Notes" span={2}>
                                    {selectedAppointment.completion_notes || 'No notes'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Drips Used" span={2}>
                                    {selectedAppointment.drips && selectedAppointment.drips.length > 0 ? (
                                        <Table
                                            dataSource={selectedAppointment.drips}
                                            pagination={false}
                                            size="small"
                                            columns={[
                                                { title: 'Drip', dataIndex: 'name', key: 'name' },
                                                { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
                                                { title: 'Price', dataIndex: 'price', key: 'price', render: (p) => `$${p}` },
                                                { title: 'Total', key: 'total', render: (_, d) => `$${d.price * d.quantity}` },
                                            ]}
                                        />
                                    ) : 'No drips recorded'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Final price" span={2}>
                                    <Text strong>${selectedAppointment.final_price || 0}</Text>
                                </Descriptions.Item>
                            </>
                        )}

                        {(selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'in_progress') && (
                            <Descriptions.Item label="Scheduled Notes" span={2}>
                                {selectedAppointment.notes || 'No notes'}
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default PatientProfile;
