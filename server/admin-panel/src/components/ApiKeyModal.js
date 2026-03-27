// components/ApiKeyModal.jsx
import React, { useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, message } from 'antd';
import api from '../api/api';

const ApiKeyModal = ({ visible, onCancel, onCreate }) => {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);


  React.useEffect(() => {
    if (visible) {
     
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      title="Create New API Key"
      okText="Create"
      cancelText="Cancel"
      onCancel={onCancel}
      onOk={() => {
        form
          .validateFields()
          .then(values => {
            onCreate(values);
            form.resetFields();
          })
          .catch(info => {
            console.log('Validate Failed:', info);
          });
      }}
    >
      <Form form={form} layout="vertical" name="api_key_form">
       

        <Form.Item
          name="name"
          label="Key Name"
          rules={[
            { required: true, message: 'Please input a name for the key' },
          ]}
        >
          <Input placeholder="e.g., Production Key" />
        </Form.Item>

        <Form.Item
          name="durationMonths"
          label="Duration (months)"
          initialValue={1}
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={24} />
        </Form.Item>

        <Form.Item
          name="scopes"
          label="Permissions"
          initialValue={['basic']}
          rules={[{ required: true }]}
        >
          <Select mode="multiple" placeholder="Select permissions">
            <Select.Option value="basic">Basic Access</Select.Option>
            <Select.Option value="read">Read Data</Select.Option>
            <Select.Option value="write">Write Data</Select.Option>
            <Select.Option value="admin">Admin Access</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ApiKeyModal;
