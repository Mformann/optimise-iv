import React, { useState, useEffect } from 'react';
import {
  Card, Select, DatePicker, Button, Space, Typography, Row, Col, Statistic, message, Empty, Spin
} from 'antd';
import { BarChartOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { partnersApi } from '../../api';
import { Partner, HostReport } from '../../types';
import { handleApiError } from '../../utils/handleApiError';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const HostReports: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [report, setReport] = useState<HostReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [partnersLoading, setPartnersLoading] = useState(true);

  useEffect(() => {
    const loadPartners = async () => {
      try {
        const data = await partnersApi.getAll();
        setPartners(data);
      } catch (error) {
        handleApiError(error, 'Failed to load partners');
      } finally {
        setPartnersLoading(false);
      }
    };
    loadPartners();
  }, []);

  const generateReport = async () => {
    if (!selectedPartner) {
      message.warning('Please select a partner');
      return;
    }
    setLoading(true);
    try {
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD');
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD');
      const data = await partnersApi.getHostReport(selectedPartner, startDate, endDate);
      setReport(data);
    } catch (error) {
      handleApiError(error, 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ['Metric', 'Value'],
      ['Partner', report.partner?.name || ''],
      ['Inquiries', String(report.inquiry_count)],
      ['Conversions', String(report.converted_count)],
      ['Conversion Rate', `${report.conversion_rate}%`],
      ['Appointments', String(report.appointment_count)],
      ['Completed', String(report.completed_count)],
      ['Revenue', String(report.total_revenue)],
      ['Total Commission', String(report.total_commission)],
      ['Pending Commission', String(report.pending_commission)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `host-report-${report.partner?.name || 'unknown'}-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <BarChartOutlined style={{ marginRight: 8 }} />
          Host Reports
        </Title>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Space wrap size="middle">
          <Select placeholder="Select Partner" style={{ width: 300 }}
            value={selectedPartner || undefined} onChange={setSelectedPartner}
            loading={partnersLoading} showSearch optionFilterProp="children">
            {partners.map(p => (
              <Select.Option key={p.id} value={p.id}>
                {p.name} {p.venue_type ? `(${p.venue_type})` : ''}
              </Select.Option>
            ))}
          </Select>
          <RangePicker value={dateRange} onChange={(dates) => setDateRange(dates as any)} />
          <Button type="primary" icon={<ReloadOutlined />} onClick={generateReport} loading={loading}>
            Generate Report
          </Button>
          {report && (
            <Button icon={<DownloadOutlined />} onClick={exportCsv}>Export CSV</Button>
          )}
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : report ? (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8} md={6}>
              <Card>
                <Statistic title="Inquiries" value={report.inquiry_count} valueStyle={{ color: '#1890ff' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card>
                <Statistic title="Conversions" value={report.converted_count}
                  suffix={<span style={{ fontSize: 14 }}>({report.conversion_rate}%)</span>}
                  valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card>
                <Statistic title="Appointments" value={report.appointment_count} />
              </Card>
            </Col>
            <Col xs={12} sm={8} md={6}>
              <Card>
                <Statistic title="Completed" value={report.completed_count}
                  valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic title="Total Revenue" value={report.total_revenue}
                  prefix="AED" precision={2} valueStyle={{ color: '#3f8600' }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic title="Total Commission" value={report.total_commission}
                  prefix="AED" precision={2} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic title="Pending Commission" value={report.pending_commission}
                  prefix="AED" precision={2} valueStyle={{ color: '#cf1322' }} />
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Empty description="Select a partner and generate a report" />
      )}
    </div>
  );
};

export default HostReports;
