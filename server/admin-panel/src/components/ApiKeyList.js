// components/ApiKeyList.jsx
import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Tag, Modal, message } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../api/api';
import axios from 'axios';
import config from '../config';
import ApiKeyModal from './ApiKeyModal';

const ApiKeyList = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchKeys = async (params = {}) => {
    setLoading(true);
    try {
      const data = await axios
        .get('http://localhost:3000/api/admin', {
          headers: {
            apiKey:config.apiKey,
              'Content-Type': 'application/json',
          },
        })
        .then(response => response.data); // Convert to ApiKey
      setKeys(data.keys);
      setPagination({
        ...params.pagination,
        total:
          data.totalPages * params.pagination?.pageSize || pagination.pageSize,
      });
    } catch (error) {
      message.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys({ pagination });
  }, [searchText]);

  const handleTableChange = newPagination => {
    fetchKeys({ pagination: newPagination });
  };

  const revokeKey = async id => {
    try {
      await api.delete(`/admin/api-keys/${id}`);
      
      message.success('API key revoked');
      fetchKeys({ pagination });
    } catch (error) {
      message.error('Failed to revoke key');
    }
  };

  const createApiKey = async (values) => {
    try {
      await api.post('/admin/', values);
      message.success('API key created');
      setIsModalVisible(false);
      fetchKeys({ pagination });
    } catch (error) {
      message.error('Failed to create key');
    }
  }

  const renewKey = async (id, months) => {
    try {
      await api.patch(`/admin/api-keys/${id}/renew`, {
        durationMonths: months,
      });
      message.success('API key renewed');
      fetchKeys({ pagination });
    } catch (error) {
      message.error('Failed to renew key');
    }
  };

  const columns = [
    {
      title: 'Key',
      dataIndex: 'key',
      render: text => (
        <span className="truncate">{text.substring(0, 8)}...</span>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
    },
    {
      title: 'Owner',
      dataIndex: ['owner', 'email'],
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: active => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Active' : 'Revoked'}
        </Tag>
      ),
    },
    {
      title: 'Expires At',
      dataIndex: 'expiresAt',
      render: date => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            danger
            onClick={() => revokeKey(record._id)}
            disabled={!record.isActive}
          >
            Revoke
          </Button>
          <Button onClick={() => renewKey(record._id, 1)}>Renew (1M)</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="api-key-list">
      <div className="flex justify-between mb-4">
        <Input
          placeholder="Search keys..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          onChange={e => setSearchText(e.target.value)}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
        >
          Create API Key
        </Button>
      </div>

      <Table
        columns={columns}
        rowKey="_id"
        dataSource={keys}
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
      />

      <ApiKeyModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onCreate={createApiKey}
      />
    </div>
  );
};

export default ApiKeyList;
