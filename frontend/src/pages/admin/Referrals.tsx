import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Card, Modal, Form, Input, Select, InputNumber, Switch,
  message, Typography, Popconfirm, Tag, Tabs
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, GiftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { referralsApi } from '../../api';
import { ReferralSource, ReferralScheme, RewardType } from '../../types';
import { handleApiError } from '../../utils/handleApiError';

const { Title } = Typography;
const { TextArea } = Input;

interface ReferralReward {
  id: string;
  referrer_patient_id: string;
  referred_patient_id: string;
  scheme_id: string;
  status: 'pending' | 'claimed' | 'expired';
  created_at: string;
  claimed_at?: string;
  referrer_name?: string;
  referred_name?: string;
  scheme_name?: string;
}

const Referrals: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sources');

  // Sources state
  const [sources, setSources] = useState<ReferralSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<ReferralSource | null>(null);
  const [sourceForm] = Form.useForm();

  // Schemes state
  const [schemes, setSchemes] = useState<ReferralScheme[]>([]);
  const [schemesLoading, setSchemesLoading] = useState(false);
  const [schemeModalOpen, setSchemeModalOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<ReferralScheme | null>(null);
  const [schemeForm] = Form.useForm();

  // Rewards state
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  useEffect(() => {
    loadSources();
    loadSchemes();
    loadRewards();
  }, []);

  // Sources functions
  const loadSources = async () => {
    setSourcesLoading(true);
    try {
      const data = await referralsApi.getSources();
      setSources(data);
    } catch (error) {
      handleApiError(error, 'Failed to load referral sources');
    } finally {
      setSourcesLoading(false);
    }
  };

  const handleCreateSource = () => {
    setEditingSource(null);
    sourceForm.resetFields();
    setSourceModalOpen(true);
  };

  const handleEditSource = (source: ReferralSource) => {
    setEditingSource(source);
    sourceForm.setFieldsValue(source);
    setSourceModalOpen(true);
  };

  const handleDeleteSource = async (id: string) => {
    try {
      await referralsApi.deleteSource(id);
      message.success('Referral source deleted');
      loadSources();
    } catch (error) {
      handleApiError(error, 'Failed to delete referral source');
    }
  };

  const handleSourceSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingSource) {
        await referralsApi.updateSource(editingSource.id, values as {
          name?: string;
          description?: string;
          is_active?: boolean;
        });
        message.success('Referral source updated');
      } else {
        await referralsApi.createSource(values as { name: string; description?: string });
        message.success('Referral source created');
      }
      setSourceModalOpen(false);
      loadSources();
    } catch (error) {
      handleApiError(error, 'Failed to save referral source');
    }
  };

  // Schemes functions
  const loadSchemes = async () => {
    setSchemesLoading(true);
    try {
      const data = await referralsApi.getSchemes();
      setSchemes(data);
    } catch (error) {
      handleApiError(error, 'Failed to load referral schemes');
    } finally {
      setSchemesLoading(false);
    }
  };

  const handleCreateScheme = () => {
    setEditingScheme(null);
    schemeForm.resetFields();
    schemeForm.setFieldsValue({ reward_type: 'discount', reward_value: 10, min_referrals: 1 });
    setSchemeModalOpen(true);
  };

  const handleEditScheme = (scheme: ReferralScheme) => {
    setEditingScheme(scheme);
    schemeForm.setFieldsValue(scheme);
    setSchemeModalOpen(true);
  };

  const handleDeleteScheme = async (id: string) => {
    try {
      await referralsApi.deleteScheme(id);
      message.success('Referral scheme deleted');
      loadSchemes();
    } catch (error) {
      handleApiError(error, 'Failed to delete referral scheme');
    }
  };

  const handleSchemeSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingScheme) {
        await referralsApi.updateScheme(editingScheme.id, values as {
          name?: string;
          description?: string;
          reward_type?: RewardType;
          reward_value?: number;
          min_referrals?: number;
          is_active?: boolean;
        });
        message.success('Referral scheme updated');
      } else {
        await referralsApi.createScheme(values as {
          name: string;
          description?: string;
          reward_type: RewardType;
          reward_value: number;
          min_referrals: number;
        });
        message.success('Referral scheme created');
      }
      setSchemeModalOpen(false);
      loadSchemes();
    } catch (error) {
      handleApiError(error, 'Failed to save referral scheme');
    }
  };

  // Rewards functions
  const loadRewards = async () => {
    setRewardsLoading(true);
    try {
      const data = await referralsApi.getRewards();
      setRewards(data);
    } catch (error) {
      handleApiError(error, 'Failed to load referral rewards');
    } finally {
      setRewardsLoading(false);
    }
  };

  const handleClaimReward = async (rewardId: string) => {
    try {
      await referralsApi.claimReward(rewardId);
      message.success('Reward claimed successfully');
      loadRewards();
    } catch (error) {
      handleApiError(error, 'Failed to claim reward');
    }
  };

  // Column definitions
  const sourceColumns: ColumnsType<ReferralSource> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEditSource(record)} />
          <Popconfirm title="Delete this source?" onConfirm={() => handleDeleteSource(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const schemeColumns: ColumnsType<ReferralScheme> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-',
    },
    {
      title: 'Reward Type',
      dataIndex: 'reward_type',
      key: 'reward_type',
      render: (type: RewardType) => {
        const colors: Record<RewardType, string> = {
          discount: 'blue',
          free_therapy: 'purple',
          cash: 'green',
        };
        const labels: Record<RewardType, string> = {
          discount: 'Discount',
          free_therapy: 'Free Therapy',
          cash: 'Cash',
        };
        return <Tag color={colors[type]}>{labels[type]}</Tag>;
      },
    },
    {
      title: 'Reward Value',
      dataIndex: 'reward_value',
      key: 'reward_value',
      render: (value, record) => {
        switch (record.reward_type) {
          case 'discount':
            return `${value}%`;
          case 'free_therapy':
            return `${value} session(s)`;
          case 'cash':
            return `$${value}`;
          default:
            return value;
        }
      },
    },
    {
      title: 'Min Referrals',
      dataIndex: 'min_referrals',
      key: 'min_referrals',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEditScheme(record)} />
          <Popconfirm title="Delete this scheme?" onConfirm={() => handleDeleteScheme(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rewardColumns: ColumnsType<ReferralReward> = [
    {
      title: 'Referrer',
      dataIndex: 'referrer_name',
      key: 'referrer_name',
      render: (text) => text || 'Unknown',
    },
    {
      title: 'Referred',
      dataIndex: 'referred_name',
      key: 'referred_name',
      render: (text) => text || 'Unknown',
    },
    {
      title: 'Scheme',
      dataIndex: 'scheme_name',
      key: 'scheme_name',
      render: (text) => text || 'Unknown',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: 'pending' | 'claimed' | 'expired') => {
        const colors: Record<string, string> = {
          pending: 'orange',
          claimed: 'green',
          expired: 'red',
        };
        return <Tag color={colors[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Tag>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) =>
        record.status === 'pending' && (
          <Button
            icon={<GiftOutlined />}
            size="small"
            type="primary"
            onClick={() => handleClaimReward(record.id)}
          >
            Claim
          </Button>
        ),
    },
  ];

  const tabItems = [
    {
      key: 'sources',
      label: 'Referral Sources',
      children: (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>Referral Sources</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateSource}>
              Add Source
            </Button>
          </div>
          <Table columns={sourceColumns} dataSource={sources} rowKey="id" loading={sourcesLoading} />
        </Card>
      ),
    },
    {
      key: 'schemes',
      label: 'Referral Schemes',
      children: (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>Referral Schemes</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateScheme}>
              Add Scheme
            </Button>
          </div>
          <Table columns={schemeColumns} dataSource={schemes} rowKey="id" loading={schemesLoading} />
        </Card>
      ),
    },
    {
      key: 'rewards',
      label: 'Referral Rewards',
      children: (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0 }}>Referral Rewards</Title>
            <Button onClick={loadRewards}>Refresh</Button>
          </div>
          <Table columns={rewardColumns} dataSource={rewards} rowKey="id" loading={rewardsLoading} />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Referral Management</Title>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {/* Source Modal */}
      <Modal
        title={editingSource ? 'Edit Referral Source' : 'New Referral Source'}
        open={sourceModalOpen}
        onCancel={() => setSourceModalOpen(false)}
        footer={null}
      >
        <Form form={sourceForm} layout="vertical" onFinish={handleSourceSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} />
          </Form.Item>
          {editingSource && (
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setSourceModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">{editingSource ? 'Update' : 'Create'}</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Scheme Modal */}
      <Modal
        title={editingScheme ? 'Edit Referral Scheme' : 'New Referral Scheme'}
        open={schemeModalOpen}
        onCancel={() => setSchemeModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={schemeForm} layout="vertical" onFinish={handleSchemeSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="reward_type" label="Reward Type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="discount">Discount (%)</Select.Option>
              <Select.Option value="free_therapy">Free Therapy (sessions)</Select.Option>
              <Select.Option value="cash">Cash ($)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="reward_value" label="Reward Value" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="min_referrals" label="Minimum Referrals Required" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          {editingScheme && (
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setSchemeModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">{editingScheme ? 'Update' : 'Create'}</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Referrals;
