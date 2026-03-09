import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, Select, Switch,
  message, Typography, Popconfirm, Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usersApi } from '../../api';
import { User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { handleApiError } from '../../utils/handleApiError';

const { Title } = Typography;

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [filterRole, setFilterRole] = useState<UserRole | undefined>();

  useEffect(() => {
    loadUsers();
  }, [filterRole]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.getUsers(filterRole);
      setUsers(data);
    } catch (error) {
      handleApiError(error, 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
      password: undefined,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await usersApi.delete(id);
      message.success('User deleted');
      loadUsers();
    } catch (error) {
      handleApiError(error, 'Failed to delete user');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingUser) {
        const updates = { ...values };
        if (!updates.password) delete updates.password;
        await usersApi.update(editingUser.id, updates);
        message.success('User updated');
      } else {
        await usersApi.create(values as never);
        message.success('User created');
      }
      setModalOpen(false);
      loadUsers();
    } catch (error) {
      handleApiError(error, 'Failed to save user');
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'red';
      case 'doctor': return 'blue';
      case 'reception': return 'green';
      case 'nurse': return 'purple';
      default: return 'default';
    }
  };

  const columns: ColumnsType<User> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => <Tag color={getRoleColor(role)}>{role.toUpperCase()}</Tag>,
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
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          {record.id !== currentUser?.id && (
            <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(record.id)}>
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Users</Title>
        <Space>
          <Select
            placeholder="Filter by role"
            style={{ width: 150 }}
            value={filterRole}
            onChange={setFilterRole}
            allowClear
          >
            <Select.Option value="admin">Admin</Select.Option>
            <Select.Option value="doctor">Doctor</Select.Option>
            <Select.Option value="reception">Reception</Select.Option>
            <Select.Option value="nurse">Nurse</Select.Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add User
          </Button>
        </Space>
      </div>

      <Table bordered scroll={{ x: true }} size="small" columns={columns} dataSource={users} rowKey="id" loading={loading} />

      <Modal
        title={editingUser ? 'Edit User' : 'New User'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingUser ? 'New Password (leave empty to keep current)' : 'Password'}
            rules={editingUser ? [] : [{ required: true, min: 6 }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="admin">Admin</Select.Option>
              <Select.Option value="doctor">Doctor</Select.Option>
              <Select.Option value="reception">Reception</Select.Option>
              <Select.Option value="nurse">Nurse</Select.Option>
            </Select>
          </Form.Item>
          {editingUser && (
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">{editingUser ? 'Update' : 'Create'}</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
