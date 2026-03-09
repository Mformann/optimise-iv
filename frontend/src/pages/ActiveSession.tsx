import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Row, Col, Typography, Descriptions, List, Tag, Button,
    Form, Input, InputNumber, Space, message, Divider, Select, Modal, Table, Spin
} from 'antd';
import {
    UserOutlined, HistoryOutlined,
    CheckCircleOutlined, PlusOutlined, DeleteOutlined, GiftOutlined, SearchOutlined
} from '@ant-design/icons';
import { appointmentsApi, patientsApi, dripsApi, therapiesApi, clinicsApi, dripOrdersApi, offersApi } from '../api';
import { Appointment, Patient, Drip, Therapy, Clinic, DripOrder, Offer } from '../types';
import PaymentBreakdown, { PaymentSelection, PaymentBreakdownData } from '../components/sessions/PaymentBreakdown';
import { useAuth } from '../context/AuthContext';
import { handleApiError } from '../utils/handleApiError';

const { TextArea } = Input;

const ActiveSession: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [history, setHistory] = useState<Appointment[]>([]);
    const [availableDrips, setAvailableDrips] = useState<Drip[]>([]);
    const [availableTherapies, setAvailableTherapies] = useState<Therapy[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [prescribeDrips, setPrescribeDrips] = useState<{ drip_id: string; quantity: number; name: string }[]>([]);
    const [prescribeNotes, setPrescribeNotes] = useState('');
    const [prescribeClinic, setPrescribeClinic] = useState<string>('');
    const [prescribing, setPrescribing] = useState(false);
    const [prescribedOrders, setPrescribedOrders] = useState<DripOrder[]>([]);
    const [selectedDrips, setSelectedDrips] = useState<{ drip_id: string; quantity: number; price: number; name: string }[]>([]);
    const [viewingSession, setViewingSession] = useState<Appointment | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
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
    const [form] = Form.useForm();

    // Offer state
    const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
    const [offerCode, setOfferCode] = useState('');
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
    const [offerCustomCost, setOfferCustomCost] = useState<number | undefined>(undefined);
    const [offerPaymentMethod, setOfferPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [applyingOffer, setApplyingOffer] = useState(false);

    useEffect(() => {
        if (id) {
            loadData(id);
        }
    }, [id]);

    const loadData = async (appointmentId: string) => {
        setLoading(true);
        try {
            const appt = await appointmentsApi.getById(appointmentId);
            setAppointment(appt);

            const [patientData, historyData, dripsData, therapiesData, clinicsData, ordersData, offersData] = await Promise.all([
                patientsApi.getById(appt.patient_id),
                appointmentsApi.getAll({ patientId: appt.patient_id, limit: 10 }),
                dripsApi.getAll(true),
                therapiesApi.getAll(true),
                clinicsApi.getAll(true),
                dripOrdersApi.getByPatient(appt.patient_id),
                offersApi.getAll(true),
            ]);

            setPatient(patientData);
            setHistory(historyData.data.filter(a => a.id !== appointmentId));
            setAvailableDrips(dripsData);
            setAvailableTherapies(therapiesData);
            setClinics(clinicsData);
            setPrescribedOrders(ordersData);
            setActiveOffers(offersData);
            if (appt.clinic_id) setPrescribeClinic(appt.clinic_id);

            // Pre-fill existing drips if any
            if (appt.drips && appt.drips.length > 0) {
                setSelectedDrips(appt.drips.map(d => ({
                    drip_id: d.id,
                    name: d.name,
                    quantity: d.quantity,
                    price: d.price
                })));
            }

            form.setFieldsValue({
                remarks: appt.remarks,
                medical_notes: patientData.medical_notes,
                completion_notes: appt.completion_notes,
                final_price: appt.final_price || appt.drips?.reduce((sum, d) => sum + (d.price * d.quantity), 0) || 0
            });

        } catch (error) {
            handleApiError(error, 'Failed to load session data');
            navigate('/appointments');
        } finally {
            setLoading(false);
        }
    };

    // Fetch payment preview when drips change
    const fetchPaymentPreview = useCallback(async () => {
        if (!id || selectedDrips.length === 0) {
            setPaymentBreakdown(null);
            return;
        }

        setPaymentLoading(true);
        try {
            const dripsForPreview = selectedDrips.map(d => ({
                drip_id: d.drip_id,
                quantity: d.quantity,
                price: d.price
            }));
            const preview = await appointmentsApi.getPaymentPreview(id, dripsForPreview);
            setPaymentBreakdown(preview);
        } catch (error) {
            console.error('Failed to fetch payment preview:', error);
            // Don't show error to user - payment section will just be hidden
        } finally {
            setPaymentLoading(false);
        }
    }, [id, selectedDrips]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchPaymentPreview();
        }, 300); // Debounce

        return () => clearTimeout(timeoutId);
    }, [fetchPaymentPreview]);

    const handleAddDrip = (dripId: string) => {
        const drip = availableDrips.find(d => d.id === dripId);
        if (!drip) return;

        const existing = selectedDrips.find(d => d.drip_id === dripId);
        if (existing) {
            setSelectedDrips(selectedDrips.map(d =>
                d.drip_id === dripId ? { ...d, quantity: d.quantity + 1 } : d
            ));
        } else {
            setSelectedDrips([...selectedDrips, {
                drip_id: drip.id,
                name: drip.name,
                quantity: 1,
                price: drip.price
            }]);
        }
    };

    const handleAddTherapy = (therapyId: string) => {
        const therapy = availableTherapies.find(t => t.id === therapyId);
        if (!therapy || !therapy.drips) return;

        const newSelectedDrips = [...selectedDrips];

        therapy.drips.forEach(therapyDrip => {
            const existingIndex = newSelectedDrips.findIndex(d => d.drip_id === therapyDrip.id);
            if (existingIndex > -1) {
                newSelectedDrips[existingIndex] = {
                    ...newSelectedDrips[existingIndex],
                    quantity: newSelectedDrips[existingIndex].quantity + therapyDrip.quantity
                };
            } else {
                newSelectedDrips.push({
                    drip_id: therapyDrip.id,
                    name: therapyDrip.name,
                    quantity: therapyDrip.quantity,
                    price: therapyDrip.price
                });
            }
        });

        setSelectedDrips(newSelectedDrips);
    };

    const handleRemoveDrip = (dripId: string) => {
        setSelectedDrips(selectedDrips.filter(d => d.drip_id !== dripId));
    };

    const handleAddPrescribeDrip = (dripId: string) => {
        const drip = availableDrips.find(d => d.id === dripId);
        if (!drip) return;
        const existing = prescribeDrips.find(d => d.drip_id === dripId);
        if (existing) {
            setPrescribeDrips(prescribeDrips.map(d =>
                d.drip_id === dripId ? { ...d, quantity: d.quantity + 1 } : d
            ));
        } else {
            setPrescribeDrips([...prescribeDrips, { drip_id: drip.id, name: drip.name, quantity: 1 }]);
        }
    };

    const handleRemovePrescribeDrip = (dripId: string) => {
        setPrescribeDrips(prescribeDrips.filter(d => d.drip_id !== dripId));
    };

    const handlePrescribeForNurse = async () => {
        if (prescribeDrips.length === 0) {
            message.warning('Please add at least one drip to prescribe');
            return;
        }
        if (!prescribeClinic) {
            message.warning('Please select a clinic');
            return;
        }
        setPrescribing(true);
        try {
            await dripOrdersApi.createBatch({
                patient_id: patient!.id,
                clinic_id: prescribeClinic,
                appointment_id: appointment!.id,
                notes: prescribeNotes || undefined,
                drips: prescribeDrips.map(d => ({ drip_id: d.drip_id, quantity: d.quantity })),
            });
            message.success('Drips prescribed for nurse delivery');
            setPrescribeDrips([]);
            setPrescribeNotes('');
            // Reload prescribed orders
            const ordersData = await dripOrdersApi.getByPatient(patient!.id);
            setPrescribedOrders(ordersData);
        } catch (error) {
            handleApiError(error, 'Failed to prescribe drips');
        } finally {
            setPrescribing(false);
        }
    };

    const handleComplete = async (values: any) => {
        if (!appointment) return;

        // Validate payment if there are drips and not paying later
        if (selectedDrips.length > 0 && paymentBreakdown && !paymentSelection.pay_later) {
            const remainingToPay = paymentSelection.adjusted_remaining ?? paymentBreakdown.totals.remaining_to_pay;
            const totalProvided = (paymentSelection.use_wallet ? paymentSelection.wallet_amount : 0)
                + paymentSelection.cash_amount
                + paymentSelection.card_amount;

            if (remainingToPay > 0 && totalProvided < remainingToPay) {
                message.error(`Payment of $${totalProvided.toFixed(2)} does not cover remaining amount of $${remainingToPay.toFixed(2)}`);
                return;
            }
        }

        setCompleting(true);
        try {
            await Promise.all([
                appointmentsApi.complete(appointment.id, {
                    ...values,
                    drips: selectedDrips,
                    payment: selectedDrips.length > 0 ? {
                        use_credits: paymentSelection.use_credits,
                        use_wallet: paymentSelection.use_wallet,
                        wallet_amount: paymentSelection.wallet_amount,
                        cash_amount: paymentSelection.cash_amount,
                        card_amount: paymentSelection.card_amount,
                        pay_later: paymentSelection.pay_later
                    } : undefined
                }),
                patientsApi.update(patient!.id, {
                    medical_notes: values.medical_notes
                })
            ]);
            message.success('Session completed and payment processed');
            navigate('/appointments');
        } catch (error) {
            handleApiError(error, 'Failed to complete session');
        } finally {
            setCompleting(false);
        }
    };

    const calculateTotal = () => {
        return selectedDrips.reduce((sum, d) => sum + (d.price * d.quantity), 0);
    };

    useEffect(() => {
        const baseTotal = calculateTotal();
        const adjustedTotal = Math.max(0, baseTotal + (paymentSelection.adjustment_amount || 0));
        form.setFieldsValue({ final_price: adjustedTotal });
    }, [selectedDrips, paymentSelection.adjustment_amount]);

    const handleViewSession = async (session: Appointment) => {
        try {
            const details = await appointmentsApi.getById(session.id);
            setViewingSession(details);
            setModalVisible(true);
        } catch (error) {
            handleApiError(error, 'Failed to load session details');
        }
    };

    const handlePaymentChange = (payment: PaymentSelection) => {
        setPaymentSelection(payment);
    };

    const handleOfferSelect = (offerId: string) => {
        const offer = activeOffers.find(o => o.id === offerId);
        setSelectedOffer(offer || null);
        setOfferCustomCost(undefined);
    };

    const handleOfferCodeSearch = async () => {
        if (!offerCode.trim()) return;
        try {
            const offer = await offersApi.getByCode(offerCode.trim());
            setSelectedOffer(offer);
            message.success(`Found offer: ${offer.name}`);
        } catch (error) {
            handleApiError(error, 'Offer code not found or inactive');
        }
    };

    const handleApplyOffer = async () => {
        if (!selectedOffer || !patient) return;
        setApplyingOffer(true);
        try {
            await offersApi.redeem(selectedOffer.id, {
                patient_id: patient.id,
                payment_method: offerPaymentMethod,
                custom_cost: !selectedOffer.fixed_value ? offerCustomCost : undefined,
                appointment_id: appointment?.id,
            });
            message.success(`Offer "${selectedOffer.name}" applied successfully!`);
            setSelectedOffer(null);
            setOfferCode('');
            setOfferCustomCost(undefined);
            // Refresh payment preview to pick up updated wallet/drip balance
            fetchPaymentPreview();
        } catch (error) {
            handleApiError(error, 'Failed to apply offer');
        } finally {
            setApplyingOffer(false);
        }
    };

    if (loading || !appointment || !patient) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <Row gutter={24}>
                {/* Left Column: Patient Profile & History */}
                <Col span={8}>
                    <Card
                        title={<span><UserOutlined /> Patient Profile</span>}
                        style={{ marginBottom: '24px' }}
                    >
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Name">{patient.first_name} {patient.last_name}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{patient.phone}</Descriptions.Item>
                            <Descriptions.Item label="DOB">{patient.date_of_birth || 'N/A'}</Descriptions.Item>
                        </Descriptions>
                    </Card>

                    <Card title={<span><HistoryOutlined /> Past Sessions</span>}>
                        <List
                            dataSource={history}
                            renderItem={item => (
                                <List.Item
                                    onClick={() => handleViewSession(item)}
                                    style={{ cursor: 'pointer', padding: '12px' }}
                                    className="hover-highlight"
                                >
                                    <List.Item.Meta
                                        title={`${item.type.toUpperCase()} - ${item.scheduled_date}`}
                                        description={
                                            <div>
                                                <div>Status: <Tag color={item.status === 'completed' ? 'green' : 'gray'}>{item.status}</Tag></div>
                                                {item.remarks && <div style={{
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: '200px'
                                                }}>Remarks: {item.remarks}</div>}
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>

                {/* Right Column: Current Session */}
                <Col span={16}>
                    <Card
                        title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Current Session: {appointment.type.toUpperCase()}</span>
                                <Tag color="orange">IN PROGRESS</Tag>
                            </div>
                        }
                    >
                        <Form form={form} layout="vertical" onFinish={handleComplete}>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item name="medical_notes" label="Patient Medical History / Notes (Permanent)">
                                        <TextArea rows={3} placeholder="Enter permanent medical history/notes..." />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item name="remarks" label="Doctor Remarks / Assessment (This Session)">
                                        <TextArea rows={4} placeholder="Enter your clinical notes for this session..." />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider orientation="left">Drips & Treatments</Divider>

                            <Row gutter={16} style={{ marginBottom: '16px' }}>
                                <Col span={9}>
                                    <Select
                                        showSearch
                                        placeholder="Add a therapy (set of drips)..."
                                        style={{ width: '100%' }}
                                        onChange={handleAddTherapy}
                                        value={null}
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        options={availableTherapies.map(t => ({
                                            value: t.id,
                                            label: `${t.name} ($${t.price})`
                                        }))}
                                    />
                                </Col>
                                <Col span={9}>
                                    <Select
                                        showSearch
                                        placeholder="Search and add a drip..."
                                        style={{ width: '100%' }}
                                        onChange={handleAddDrip}
                                        value={null}
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        options={availableDrips.map(d => ({
                                            value: d.id,
                                            label: `${d.name} ($${d.price}) - Stock: ${d.stock_quantity}`,
                                            disabled: d.stock_quantity <= 0
                                        }))}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Button
                                        block
                                        icon={<PlusOutlined />}
                                        onClick={() => navigate('/appointments')}
                                    >
                                        Quick Appt
                                    </Button>
                                </Col>
                            </Row>

                            <List
                                header={<b>Selected Drips</b>}
                                bordered
                                dataSource={selectedDrips}
                                renderItem={item => (
                                    <List.Item
                                        actions={[
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={() => handleRemoveDrip(item.drip_id)}
                                            />
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={item.name}
                                            description={`$${item.price} each`}
                                        />
                                        <div style={{ marginRight: '24px' }}>
                                            Quantity:
                                            <InputNumber
                                                min={1}
                                                value={item.quantity}
                                                onChange={(val) => {
                                                    setSelectedDrips(selectedDrips.map(d =>
                                                        d.drip_id === item.drip_id ? { ...d, quantity: val || 1 } : d
                                                    ));
                                                }}
                                                style={{ marginLeft: '8px', width: '60px' }}
                                            />
                                        </div>
                                        <div><b>${(item.price * item.quantity).toFixed(2)}</b></div>
                                    </List.Item>
                                )}
                                style={{ marginBottom: '24px' }}
                            />

                            {/* Apply Offer / Promo Section */}
                            {activeOffers.length > 0 && (
                                <Card
                                    title={<span><GiftOutlined /> Apply Offer / Promo</span>}
                                    size="small"
                                    style={{ marginBottom: 24 }}
                                >
                                    <Row gutter={16} style={{ marginBottom: 12 }}>
                                        <Col span={12}>
                                            <Select
                                                showSearch
                                                allowClear
                                                placeholder="Select an offer..."
                                                style={{ width: '100%' }}
                                                value={selectedOffer?.id || undefined}
                                                onChange={handleOfferSelect}
                                                filterOption={(input, option) =>
                                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                }
                                                options={activeOffers.map(o => ({
                                                    value: o.id,
                                                    label: `${o.name} ($${o.cost}${!o.fixed_value ? ' flexible' : ''}) - ${o.type === 'money' ? `$${o.value} credit` : `${o.drip_quantity}x ${o.drip_name}`}`
                                                }))}
                                            />
                                        </Col>
                                        <Col span={8}>
                                            <Input
                                                placeholder="Enter promo code..."
                                                value={offerCode}
                                                onChange={e => setOfferCode(e.target.value)}
                                                onPressEnter={handleOfferCodeSearch}
                                            />
                                        </Col>
                                        <Col span={4}>
                                            <Button
                                                block
                                                icon={<SearchOutlined />}
                                                onClick={handleOfferCodeSearch}
                                                disabled={!offerCode.trim()}
                                            >
                                                Lookup
                                            </Button>
                                        </Col>
                                    </Row>

                                    {selectedOffer && (
                                        <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 12 }}>
                                            <Row gutter={16} align="middle">
                                                <Col span={12}>
                                                    <div><b>{selectedOffer.name}</b></div>
                                                    <div style={{ fontSize: 12, color: '#666' }}>
                                                        {selectedOffer.type === 'money'
                                                            ? `Pay $${selectedOffer.cost} → Get $${selectedOffer.value} wallet credit`
                                                            : `Pay $${selectedOffer.cost} → Get ${selectedOffer.drip_quantity}x ${selectedOffer.drip_name}`
                                                        }
                                                        {selectedOffer.code && <Tag style={{ marginLeft: 8 }}>{selectedOffer.code}</Tag>}
                                                    </div>
                                                </Col>
                                                <Col span={4}>
                                                    {!selectedOffer.fixed_value ? (
                                                        <InputNumber
                                                            value={offerCustomCost ?? selectedOffer.cost}
                                                            onChange={(val) => setOfferCustomCost(val ?? undefined)}
                                                            min={0}
                                                            precision={2}
                                                            prefix="$"
                                                            style={{ width: '100%' }}
                                                            placeholder="Cost"
                                                        />
                                                    ) : (
                                                        <Tag color="blue">${selectedOffer.cost}</Tag>
                                                    )}
                                                </Col>
                                                <Col span={4}>
                                                    <Select
                                                        value={offerPaymentMethod}
                                                        onChange={setOfferPaymentMethod}
                                                        style={{ width: '100%' }}
                                                        size="small"
                                                    >
                                                        <Select.Option value="cash">Cash</Select.Option>
                                                        <Select.Option value="card">Card</Select.Option>
                                                        <Select.Option value="transfer">Transfer</Select.Option>
                                                    </Select>
                                                </Col>
                                                <Col span={4}>
                                                    <Button
                                                        type="primary"
                                                        block
                                                        onClick={handleApplyOffer}
                                                        loading={applyingOffer}
                                                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                                    >
                                                        Apply
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* Payment Breakdown Section */}
                            {selectedDrips.length > 0 && (
                                <PaymentBreakdown
                                    breakdown={paymentBreakdown}
                                    loading={paymentLoading}
                                    onChange={handlePaymentChange}
                                />
                            )}

                            {/* Prescribe for Nurse Delivery Section */}
                            {(user?.role === 'admin' || user?.role === 'doctor') && (
                                <>
                                    <Divider orientation="left">Prescribe for Nurse Delivery</Divider>
                                    <Row gutter={16} style={{ marginBottom: 16 }}>
                                        <Col span={8}>
                                            <Select
                                                showSearch
                                                placeholder="Add drip for nurse..."
                                                style={{ width: '100%' }}
                                                onChange={handleAddPrescribeDrip}
                                                value={null}
                                                filterOption={(input, option) =>
                                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                }
                                                options={availableDrips.map(d => ({
                                                    value: d.id,
                                                    label: `${d.name} ($${d.price})`,
                                                    disabled: d.stock_quantity <= 0
                                                }))}
                                            />
                                        </Col>
                                        <Col span={6}>
                                            <Select
                                                placeholder="Clinic"
                                                style={{ width: '100%' }}
                                                value={prescribeClinic || undefined}
                                                onChange={setPrescribeClinic}
                                            >
                                                {clinics.map(c => (
                                                    <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                                                ))}
                                            </Select>
                                        </Col>
                                        <Col span={6}>
                                            <Input
                                                placeholder="Prescription notes..."
                                                value={prescribeNotes}
                                                onChange={e => setPrescribeNotes(e.target.value)}
                                            />
                                        </Col>
                                        <Col span={4}>
                                            <Button
                                                type="primary"
                                                block
                                                onClick={handlePrescribeForNurse}
                                                loading={prescribing}
                                                disabled={prescribeDrips.length === 0}
                                                style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                                            >
                                                Prescribe
                                            </Button>
                                        </Col>
                                    </Row>

                                    {prescribeDrips.length > 0 && (
                                        <List
                                            header={<b>Drips to Prescribe for Nurse</b>}
                                            bordered
                                            size="small"
                                            dataSource={prescribeDrips}
                                            renderItem={item => (
                                                <List.Item
                                                    actions={[
                                                        <Button
                                                            type="text"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => handleRemovePrescribeDrip(item.drip_id)}
                                                        />
                                                    ]}
                                                >
                                                    <span>{item.name}</span>
                                                    <InputNumber
                                                        min={1}
                                                        value={item.quantity}
                                                        onChange={(val) => {
                                                            setPrescribeDrips(prescribeDrips.map(d =>
                                                                d.drip_id === item.drip_id ? { ...d, quantity: val || 1 } : d
                                                            ));
                                                        }}
                                                        style={{ marginLeft: 16, width: 60 }}
                                                    />
                                                </List.Item>
                                            )}
                                            style={{ marginBottom: 16 }}
                                        />
                                    )}

                                    {prescribedOrders.length > 0 && (
                                        <Table
                                            size="small"
                                            dataSource={prescribedOrders.filter(o => o.appointment_id === id)}
                                            rowKey="id"
                                            pagination={false}
                                            style={{ marginBottom: 16 }}
                                            columns={[
                                                { title: 'Drip', dataIndex: 'drip_name', key: 'drip_name' },
                                                { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
                                                {
                                                    title: 'Status',
                                                    dataIndex: 'status',
                                                    key: 'status',
                                                    render: (s: string) => (
                                                        <Tag color={s === 'pending' ? 'orange' : s === 'delivered' ? 'green' : s === 'cancelled' ? 'red' : 'blue'}>
                                                            {s.toUpperCase()}
                                                        </Tag>
                                                    )
                                                },
                                                { title: 'Delivered By', dataIndex: 'delivered_by_name', key: 'delivered_by_name', render: (v: string) => v || '-' },
                                            ]}
                                            title={() => <b>Prescribed Orders for This Session</b>}
                                        />
                                    )}
                                </>
                            )}

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="final_price" label="Total Price ($)">
                                        <InputNumber style={{ width: '100%' }} precision={2} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="completion_notes" label="Completion Notes (Internal)">
                                        <Input placeholder="Extra notes for staff..." />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <div style={{ textAlign: 'right', marginTop: '24px' }}>
                                <Space>
                                    <Button onClick={() => navigate('/appointments')}>Exit Without Saving</Button>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={completing}
                                        icon={<CheckCircleOutlined />}
                                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                    >
                                        Complete & Process Payment
                                    </Button>
                                </Space>
                            </div>
                        </Form>
                    </Card>
                </Col>
            </Row>

            <Modal
                title={`Session Details: ${viewingSession?.scheduled_date}`}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setModalVisible(false)}>Close</Button>
                ]}
                width={700}
            >
                {viewingSession && (
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="Type" span={1}>{viewingSession.type.toUpperCase()}</Descriptions.Item>
                        <Descriptions.Item label="Status" span={1}>
                            <Tag color={viewingSession.status === 'completed' ? 'green' : 'gray'}>{viewingSession.status}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Time" span={1}>{viewingSession.scheduled_time}</Descriptions.Item>
                        <Descriptions.Item label="Clinician" span={1}>{viewingSession.doctor_name || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Session Remarks" span={2}>
                            {viewingSession.remarks || 'No remarks recorded.'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Admin Notes" span={2}>
                            {viewingSession.completion_notes || 'No admin notes.'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Final Price" span={2}>
                            <b>${viewingSession.final_price?.toFixed(2)}</b>
                        </Descriptions.Item>
                    </Descriptions>
                )}

                {viewingSession?.drips && viewingSession.drips.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <Typography.Title level={5}>Drips Used</Typography.Title>
                        <Table
                            dataSource={viewingSession.drips}
                            columns={[
                                { title: 'Drip Name', dataIndex: 'name', key: 'name' },
                                { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
                                { title: 'Price', dataIndex: 'price', key: 'price', render: (val) => `$${val.toFixed(2)}` },
                                { title: 'Total', key: 'total', render: (_, record) => `$${(record.price * record.quantity).toFixed(2)}` },
                            ]}
                            pagination={false}
                            size="small"
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ActiveSession;
