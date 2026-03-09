import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Button, Space, Typography, Row, Col, Modal, Radio, Input, Descriptions,
  Tag, Badge, message, Empty, Spin, Divider, Alert
} from 'antd';
import {
  CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, PhoneOutlined, ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { doctorReviewsApi, preChecksApi } from '../api';
import { DoctorReview, PreCheckForm } from '../types';
import { handleApiError } from '../utils/handleApiError';

const { Title, Text } = Typography;

const DoctorReviewPanel: React.FC = () => {
  const [pendingAppointments, setPendingAppointments] = useState<{ appointment_id: string; patient_name: string; clinic_name: string; scheduled_date: string }[]>([]);
  const [riskyReviews, setRiskyReviews] = useState<DoctorReview[]>([]);
  const [loading, setLoading] = useState(false);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [selectedReview, setSelectedReview] = useState<DoctorReview | null>(null);
  const [preCheckForm, setPreCheckForm] = useState<PreCheckForm | null>(null);
  const [preCheckLoading, setPreCheckLoading] = useState(false);

  const [decision, setDecision] = useState<string>('');
  const [riskFactors, setRiskFactors] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [finalDecision, setFinalDecision] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await doctorReviewsApi.getPendingReviews();
      setPendingAppointments(data.pending_appointments || []);
      setRiskyReviews((data.reviews || []).filter(r => !r.call_completed && r.decision === 'risky'));
    } catch (error) {
      handleApiError(error, 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const openReviewModal = async (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setDecision('');
    setRiskFactors('');
    setReviewNotes('');
    setPreCheckForm(null);
    setReviewModalOpen(true);
    setPreCheckLoading(true);
    try {
      const form = await preChecksApi.getByAppointment(appointmentId);
      setPreCheckForm(form);
    } catch (error) {
      handleApiError(error, 'Could not load pre-check form');
    } finally {
      setPreCheckLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!decision) { message.warning('Please select a decision'); return; }
    setSubmitting(true);
    try {
      await doctorReviewsApi.createReview({
        appointment_id: selectedAppointmentId,
        decision: decision as any,
        risk_factors: riskFactors || undefined,
        notes: reviewNotes || undefined,
      });
      message.success('Review submitted');
      setReviewModalOpen(false);
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const openCallModal = (review: DoctorReview) => {
    setSelectedReview(review);
    setCallNotes('');
    setFinalDecision('');
    setCallModalOpen(true);
  };

  const handleCompleteCall = async () => {
    if (!selectedReview || !finalDecision || !callNotes) {
      message.warning('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      await doctorReviewsApi.completeDoctorCall(selectedReview.id, {
        call_notes: callNotes,
        final_decision: finalDecision as any,
      });
      message.success('Call completed');
      setCallModalOpen(false);
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to complete call');
    } finally {
      setSubmitting(false);
    }
  };

  const renderBoolField = (value: any, label: string) => {
    const isTrue = value === true || value === 1;
    return (
      <Descriptions.Item label={label}>
        <Tag color={isTrue ? 'red' : 'green'}>{isTrue ? 'Yes' : 'No'}</Tag>
      </Descriptions.Item>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>Doctor Reviews</Title>
          <Badge count={pendingAppointments.length} style={{ backgroundColor: '#1890ff' }} />
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>Refresh</Button>
      </div>

      {loading && pendingAppointments.length === 0 && riskyReviews.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <>
          <Title level={5}>Pending Reviews</Title>
          {pendingAppointments.length === 0 ? (
            <Empty description="No pending reviews" style={{ marginBottom: 24 }} />
          ) : (
            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
              {pendingAppointments.map(appt => (
                <Col key={appt.appointment_id} xs={24} sm={12} md={8} lg={6}>
                  <Card hoverable>
                    <Text strong>{appt.patient_name}</Text>
                    <br />
                    <Text type="secondary">{appt.clinic_name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(appt.scheduled_date).format('DD MMM YYYY')}
                    </Text>
                    <Divider style={{ margin: '12px 0' }} />
                    <Button type="primary" block icon={<CheckCircleOutlined />}
                      onClick={() => openReviewModal(appt.appointment_id)}>
                      Review
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          {riskyReviews.length > 0 && (
            <>
              <Title level={4}>
                <Space>
                  <WarningOutlined style={{ color: '#ff4d4f' }} />
                  Risky Cases - Call Required
                </Space>
              </Title>
              <Row gutter={[16, 16]}>
                {riskyReviews.map(review => (
                  <Col key={review.id} xs={24} sm={12} md={8} lg={6}>
                    <Card hoverable style={{ borderLeft: '3px solid #ff4d4f' }}>
                      <Text strong>{review.patient_name}</Text>
                      <br />
                      <Text type="secondary">{review.clinic_name}</Text>
                      <br />
                      {review.risk_factors && (
                        <Alert type="warning" message={review.risk_factors}
                          style={{ marginTop: 8, marginBottom: 8 }} showIcon />
                      )}
                      <Button type="primary" danger block icon={<PhoneOutlined />}
                        onClick={() => openCallModal(review)}>
                        Complete Call
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </>
      )}

      <Modal title="Review Pre-Check Form" open={reviewModalOpen} width={700}
        onCancel={() => setReviewModalOpen(false)} footer={null}>
        {preCheckLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : preCheckForm ? (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              {renderBoolField(preCheckForm.has_allergies, 'Allergies')}
              <Descriptions.Item label="Allergy Details">{preCheckForm.allergy_details || '-'}</Descriptions.Item>
              {renderBoolField(preCheckForm.has_chronic_conditions, 'Chronic Conditions')}
              <Descriptions.Item label="Condition Details">{preCheckForm.chronic_condition_details || '-'}</Descriptions.Item>
              <Descriptions.Item label="Current Medications" span={2}>{preCheckForm.current_medications || '-'}</Descriptions.Item>
              {renderBoolField(preCheckForm.is_pregnant, 'Pregnant')}
              {renderBoolField(preCheckForm.has_recent_surgery, 'Recent Surgery')}
              <Descriptions.Item label="Surgery Details">{preCheckForm.surgery_details || '-'}</Descriptions.Item>
              <Descriptions.Item label="BP History">{preCheckForm.blood_pressure_history || '-'}</Descriptions.Item>
              <Descriptions.Item label="Diabetes History">{preCheckForm.diabetes_history || '-'}</Descriptions.Item>
              {renderBoolField(preCheckForm.heart_condition, 'Heart Condition')}
              <Descriptions.Item label="Additional Notes" span={2}>{preCheckForm.additional_notes || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <div style={{ marginBottom: 16 }}>
              <Text strong>Decision:</Text>
              <br />
              <Radio.Group value={decision} onChange={e => setDecision(e.target.value)} style={{ marginTop: 8 }}>
                <Radio.Button value="safe"><CheckCircleOutlined /> Safe</Radio.Button>
                <Radio.Button value="risky"><WarningOutlined /> Risky</Radio.Button>
                <Radio.Button value="rejected"><CloseCircleOutlined /> Reject</Radio.Button>
              </Radio.Group>
            </div>

            {decision === 'risky' && (
              <div style={{ marginBottom: 16 }}>
                <Text>Risk Factors:</Text>
                <Input.TextArea rows={2} value={riskFactors} onChange={e => setRiskFactors(e.target.value)}
                  placeholder="Describe risk factors..." />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <Text>Notes:</Text>
              <Input.TextArea rows={2} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                placeholder="Additional notes..." />
            </div>

            <Button type="primary" block onClick={handleSubmitReview} loading={submitting}
              disabled={!decision}>
              Submit Review
            </Button>
          </>
        ) : (
          <Empty description="No pre-check form found" />
        )}
      </Modal>

      <Modal title="Complete Doctor Call" open={callModalOpen}
        onCancel={() => setCallModalOpen(false)} footer={null}>
        {selectedReview && (
          <>
            <Alert type="warning" message={`Risk factors: ${selectedReview.risk_factors || 'N/A'}`}
              style={{ marginBottom: 16 }} />

            <div style={{ marginBottom: 16 }}>
              <Text strong>Call Notes:</Text>
              <Input.TextArea rows={3} value={callNotes} onChange={e => setCallNotes(e.target.value)}
                placeholder="Document the call..." />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Final Decision:</Text>
              <br />
              <Radio.Group value={finalDecision} onChange={e => setFinalDecision(e.target.value)} style={{ marginTop: 8 }}>
                <Radio.Button value="cleared"><CheckCircleOutlined /> Cleared</Radio.Button>
                <Radio.Button value="rejected"><CloseCircleOutlined /> Rejected</Radio.Button>
              </Radio.Group>
            </div>

            <Button type="primary" block onClick={handleCompleteCall} loading={submitting}
              disabled={!finalDecision || !callNotes}>
              Complete Call
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
};

export default DoctorReviewPanel;
