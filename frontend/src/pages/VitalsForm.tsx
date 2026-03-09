import React, { useState, useEffect } from 'react';
import {
  Card, Form, InputNumber, Radio, Input, Button, Space, Typography, Descriptions,
  Tag, message, Spin, Divider, Row, Col, Alert
} from 'antd';
import { ArrowLeftOutlined, HeartOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { appointmentsApi, vitalsApi } from '../api';
import { Appointment, Vitals } from '../types';
import { handleApiError } from '../utils/handleApiError';

const { Title } = Typography;

const RANGES = {
  systolic: { min: 90, max: 140 },
  diastolic: { min: 60, max: 90 },
  heart_rate: { min: 60, max: 100 },
  temperature: { min: 36.1, max: 37.2 },
  oxygen_saturation: { min: 95, max: 100 },
  blood_sugar: { min: 70, max: 140 },
};

const isOutOfRange = (value: number | undefined, range: { min: number; max: number }) => {
  if (value === undefined || value === null) return false;
  return value < range.min || value > range.max;
};

const VitalsFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [existingVitals, setExistingVitals] = useState<Vitals | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const appt = await appointmentsApi.getById(id);
        setAppointment(appt);

        try {
          const vitals = await vitalsApi.getByAppointment(id);
          setExistingVitals(vitals);
        } catch {
          // No existing vitals
        }
      } catch (error) {
        handleApiError(error, 'Failed to load appointment');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleSubmit = async (values: any) => {
    if (!id) return;
    setSubmitting(true);
    try {
      await vitalsApi.recordVitals({
        appointment_id: id,
        blood_pressure_systolic: values.blood_pressure_systolic,
        blood_pressure_diastolic: values.blood_pressure_diastolic,
        heart_rate: values.heart_rate,
        temperature: values.temperature,
        oxygen_saturation: values.oxygen_saturation,
        blood_sugar: values.blood_sugar,
        weight: values.weight,
        decision: values.decision,
        abnormal_notes: values.abnormal_notes,
      });
      message.success(values.decision === 'normal'
        ? 'Vitals recorded - Appointment proceeding'
        : 'Vitals recorded - Appointment cancelled due to abnormal readings');
      navigate('/non-clinic');
    } catch (error) {
      handleApiError(error, 'Failed to record vitals');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValuesChange = (_: any, allValues: any) => {
    setFormValues(allValues);
  };

  const getFieldStatus = (field: string, range: { min: number; max: number }) => {
    const value = formValues[field];
    if (value === undefined || value === null) return {};
    if (isOutOfRange(value, range)) {
      return { validateStatus: 'error' as const, help: `Normal: ${range.min}-${range.max}` };
    }
    return { validateStatus: 'success' as const };
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>;
  }

  if (existingVitals) {
    return (
      <div>
        <Space style={{ marginBottom: 24 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/non-clinic')}>Back</Button>
          <Title level={3} style={{ margin: 0 }}>Vitals Record</Title>
          <Tag color={existingVitals.decision === 'normal' ? 'green' : 'red'}>
            {existingVitals.decision?.toUpperCase()}
          </Tag>
        </Space>

        <Card>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Blood Pressure">
              {existingVitals.blood_pressure_systolic}/{existingVitals.blood_pressure_diastolic} mmHg
            </Descriptions.Item>
            <Descriptions.Item label="Heart Rate">{existingVitals.heart_rate} bpm</Descriptions.Item>
            <Descriptions.Item label="Temperature">{existingVitals.temperature} °C</Descriptions.Item>
            <Descriptions.Item label="O2 Saturation">{existingVitals.oxygen_saturation}%</Descriptions.Item>
            <Descriptions.Item label="Blood Sugar">{existingVitals.blood_sugar} mg/dL</Descriptions.Item>
            <Descriptions.Item label="Weight">{existingVitals.weight} kg</Descriptions.Item>
            <Descriptions.Item label="Nurse">{existingVitals.nurse_name}</Descriptions.Item>
            <Descriptions.Item label="Recorded At">{dayjs(existingVitals.recorded_at).format('DD MMM YYYY HH:mm')}</Descriptions.Item>
            {existingVitals.abnormal_notes && (
              <Descriptions.Item label="Abnormal Notes" span={2}>{existingVitals.abnormal_notes}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/non-clinic')}>Back</Button>
        <Title level={3} style={{ margin: 0 }}>
          <HeartOutlined /> Record Vitals
        </Title>
      </Space>

      {appointment && (
        <Card size="small" style={{ marginBottom: 24 }}>
          <Descriptions size="small" column={3}>
            <Descriptions.Item label="Patient">{appointment.patient_name}</Descriptions.Item>
            <Descriptions.Item label="Phone">{appointment.patient_phone}</Descriptions.Item>
            <Descriptions.Item label="Location">{appointment.clinic_name}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit} onValuesChange={handleValuesChange}>
          <Divider orientation="left">Blood Pressure</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="blood_pressure_systolic" label="Systolic (mmHg)"
                rules={[{ required: true }]} {...getFieldStatus('blood_pressure_systolic', RANGES.systolic)}>
                <InputNumber min={50} max={300} style={{ width: '100%' }} placeholder="90-140" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="blood_pressure_diastolic" label="Diastolic (mmHg)"
                rules={[{ required: true }]} {...getFieldStatus('blood_pressure_diastolic', RANGES.diastolic)}>
                <InputNumber min={30} max={200} style={{ width: '100%' }} placeholder="60-90" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Other Vitals</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="heart_rate" label="Heart Rate (bpm)"
                rules={[{ required: true }]} {...getFieldStatus('heart_rate', RANGES.heart_rate)}>
                <InputNumber min={20} max={250} style={{ width: '100%' }} placeholder="60-100" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="temperature" label="Temperature (°C)"
                rules={[{ required: true }]} {...getFieldStatus('temperature', RANGES.temperature)}>
                <InputNumber min={34} max={43} step={0.1} style={{ width: '100%' }} placeholder="36.1-37.2" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="oxygen_saturation" label="O2 Saturation (%)"
                rules={[{ required: true }]} {...getFieldStatus('oxygen_saturation', RANGES.oxygen_saturation)}>
                <InputNumber min={50} max={100} style={{ width: '100%' }} placeholder="95-100" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="blood_sugar" label="Blood Sugar (mg/dL)"
                {...getFieldStatus('blood_sugar', RANGES.blood_sugar)}>
                <InputNumber min={20} max={600} style={{ width: '100%' }} placeholder="70-140" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="weight" label="Weight (kg)">
                <InputNumber min={1} max={500} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Decision</Divider>
          <Form.Item name="decision" label="Vitals Assessment" rules={[{ required: true }]}>
            <Radio.Group size="large">
              <Radio.Button value="normal" style={{ color: '#52c41a' }}>Normal - Proceed</Radio.Button>
              <Radio.Button value="abnormal" style={{ color: '#ff4d4f' }}>Abnormal - Cancel</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.decision !== curr.decision}>
            {({ getFieldValue }) => getFieldValue('decision') === 'abnormal' ? (
              <>
                <Alert type="error" message="Appointment will be cancelled due to abnormal vitals"
                  style={{ marginBottom: 16 }} showIcon />
                <Form.Item name="abnormal_notes" label="Abnormal Notes" rules={[{ required: true }]}>
                  <Input.TextArea rows={3} placeholder="Describe the abnormal findings and reason for cancellation..." />
                </Form.Item>
              </>
            ) : null}
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={submitting} block size="large">
            Record Vitals
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default VitalsFormPage;
