import React, { useState, useEffect } from 'react';
import {
  Card, Form, Switch, Input, Button, Space, Typography, Descriptions, Tag, message, Spin, Divider
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { appointmentsApi, preChecksApi } from '../api';
import { Appointment, PreCheckForm as PreCheckFormType } from '../types';
import { handleApiError } from '../utils/handleApiError';

const { Title } = Typography;

const PreCheckFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [existingForm, setExistingForm] = useState<PreCheckFormType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const appt = await appointmentsApi.getById(id);
        setAppointment(appt);

        try {
          const existing = await preChecksApi.getByAppointment(id);
          setExistingForm(existing);
          form.setFieldsValue({
            has_allergies: !!existing.has_allergies,
            allergy_details: existing.allergy_details,
            has_chronic_conditions: !!existing.has_chronic_conditions,
            chronic_condition_details: existing.chronic_condition_details,
            current_medications: existing.current_medications,
            is_pregnant: !!existing.is_pregnant,
            has_recent_surgery: !!existing.has_recent_surgery,
            surgery_details: existing.surgery_details,
            blood_pressure_history: existing.blood_pressure_history,
            diabetes_history: existing.diabetes_history,
            heart_condition: !!existing.heart_condition,
            additional_notes: existing.additional_notes,
          });
        } catch {
          // No existing form
        }
      } catch (error) {
        handleApiError(error, 'Failed to load appointment');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, form]);

  const handleSaveDraft = async () => {
    if (!id || !appointment) return;
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      if (existingForm) {
        await preChecksApi.create({
          patient_id: appointment.patient_id,
          appointment_id: id,
          ...values,
        });
      } else {
        const created = await preChecksApi.create({
          patient_id: appointment.patient_id,
          appointment_id: id,
          ...values,
        });
        setExistingForm(created);
      }
      message.success('Draft saved');
    } catch (error) {
      handleApiError(error, 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!id || !appointment) return;
    setSubmitting(true);
    try {
      const values = form.getFieldsValue();

      if (!existingForm) {
        const created = await preChecksApi.create({
          patient_id: appointment.patient_id,
          appointment_id: id,
          ...values,
        });
        await preChecksApi.submit(created.id, values);
      } else {
        await preChecksApi.submit(existingForm.id, values);
      }

      message.success('Pre-check submitted for review');
      navigate('/non-clinic');
    } catch (error) {
      handleApiError(error, 'Failed to submit pre-check');
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = existingForm?.status === 'submitted' || existingForm?.status === 'reviewed';

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/non-clinic')}>Back</Button>
        <Title level={3} style={{ margin: 0 }}>Health Pre-Check Form</Title>
        {existingForm && <Tag color={existingForm.status === 'submitted' ? 'blue' : existingForm.status === 'reviewed' ? 'green' : 'default'}>{existingForm.status?.toUpperCase()}</Tag>}
      </Space>

      {appointment && (
        <Card size="small" style={{ marginBottom: 24 }}>
          <Descriptions size="small" column={3}>
            <Descriptions.Item label="Patient">{appointment.patient_name}</Descriptions.Item>
            <Descriptions.Item label="Phone">{appointment.patient_phone}</Descriptions.Item>
            <Descriptions.Item label="Location">{appointment.clinic_name}</Descriptions.Item>
            <Descriptions.Item label="Date">{appointment.scheduled_date}</Descriptions.Item>
            <Descriptions.Item label="Time">{appointment.scheduled_time}</Descriptions.Item>
            <Descriptions.Item label="Therapy">{appointment.therapy_name || 'N/A'}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card>
        <Form form={form} layout="vertical" disabled={isReadOnly}>
          <Divider orientation="left">Allergies</Divider>
          <Form.Item name="has_allergies" label="Has Allergies?" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.has_allergies !== curr.has_allergies}>
            {({ getFieldValue }) => getFieldValue('has_allergies') ? (
              <Form.Item name="allergy_details" label="Allergy Details">
                <Input.TextArea rows={2} placeholder="List allergies..." />
              </Form.Item>
            ) : null}
          </Form.Item>

          <Divider orientation="left">Chronic Conditions</Divider>
          <Form.Item name="has_chronic_conditions" label="Has Chronic Conditions?" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.has_chronic_conditions !== curr.has_chronic_conditions}>
            {({ getFieldValue }) => getFieldValue('has_chronic_conditions') ? (
              <Form.Item name="chronic_condition_details" label="Condition Details">
                <Input.TextArea rows={2} placeholder="List conditions..." />
              </Form.Item>
            ) : null}
          </Form.Item>

          <Form.Item name="current_medications" label="Current Medications">
            <Input.TextArea rows={2} placeholder="List current medications..." />
          </Form.Item>

          <Divider orientation="left">Other Medical History</Divider>
          <Form.Item name="is_pregnant" label="Pregnant?" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="has_recent_surgery" label="Recent Surgery?" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.has_recent_surgery !== curr.has_recent_surgery}>
            {({ getFieldValue }) => getFieldValue('has_recent_surgery') ? (
              <Form.Item name="surgery_details" label="Surgery Details">
                <Input.TextArea rows={2} placeholder="Describe surgery..." />
              </Form.Item>
            ) : null}
          </Form.Item>

          <Form.Item name="blood_pressure_history" label="Blood Pressure History">
            <Input.TextArea rows={2} placeholder="Known BP issues..." />
          </Form.Item>

          <Form.Item name="diabetes_history" label="Diabetes History">
            <Input.TextArea rows={2} placeholder="Known diabetes issues..." />
          </Form.Item>

          <Form.Item name="heart_condition" label="Heart Condition?" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Divider orientation="left">Additional Information</Divider>
          <Form.Item name="additional_notes" label="Additional Notes">
            <Input.TextArea rows={3} placeholder="Any other relevant information..." />
          </Form.Item>

          {!isReadOnly && (
            <Space>
              <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={saving}>
                Save Draft
              </Button>
              <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit} loading={submitting}>
                Submit for Review
              </Button>
            </Space>
          )}
        </Form>
      </Card>
    </div>
  );
};

export default PreCheckFormPage;
