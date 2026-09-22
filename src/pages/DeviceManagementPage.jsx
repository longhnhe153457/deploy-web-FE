import { useState, useEffect, useRef } from 'react';
import { Table, Button, Space, message, Tag, Select, Popconfirm, Spin, Modal, Form, Input } from 'antd';
import { getDevicesByBranch, deleteDevice, revokeDevice, updateDevice } from '../api/deviceApi';
import { getAllBranches } from '../api/branchApi';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import DeviceEditModal from '../components/device/DeviceEditModal';

import { Link } from 'react-router-dom';

const DeviceManagementPage = () => {
  const [devices, setDevices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await getAllBranches();
        const allBranches = res.data;
        let availableBranches = allBranches;
        const isAdminOrOwner = user?.roles?.some(r => r === 'Admin' || r === 'Owner');
        if (!isAdminOrOwner && user?.branchIds && user.branchIds.length > 0) {
          availableBranches = allBranches.filter(b => user.branchIds.includes(b.id));
        }
        setBranches(availableBranches);
        if (availableBranches.length > 0) {
          setSelectedBranch(availableBranches[0].id);
        }
      } catch (err) {
        message.error('Lỗi khi tải chi nhánh');
      }
    };
    fetchBranches();
  }, [user]);

  useEffect(() => {
    if (selectedBranch) {
      loadDevices();
    }
  }, [selectedBranch]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const res = await getDevicesByBranch(selectedBranch);
      setDevices(res.data);
    } catch (err) {
      console.error(err);
      message.error(`Lỗi khi tải danh sách thiết bị: ${err.response?.status || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const actionRef = useRef(false);

  const handleRevoke = async (id) => {
    if (actionRef.current) return;
    actionRef.current = true;
    try {
      await revokeDevice(id);
      message.success('Đã thu hồi quyền thiết bị thành công');
      loadDevices();
    } catch (err) {
      message.error('Lỗi khi thu hồi thiết bị');
    } finally {
      actionRef.current = false;
    }
  };

  const handleActivate = async (record) => {
    if (actionRef.current) return;
    actionRef.current = true;
    try {
      await updateDevice({
        id: record.id,
        name: record.name,
        deviceType: record.deviceType,
        isActive: true
      });
      message.success('Đã cấp lại quyền cho thiết bị thành công');
      loadDevices();
    } catch (err) {
      message.error('Lỗi khi cấp quyền thiết bị');
    } finally {
      actionRef.current = false;
    }
  };

  const handleDelete = async (id) => {
    if (actionRef.current) return;
    actionRef.current = true;
    try {
      await deleteDevice(id);
      message.success('Đã xóa thiết bị thành công');
      loadDevices();
    } catch (err) {
      message.error('Lỗi khi xóa thiết bị');
    } finally {
      actionRef.current = false;
    }
  };

  const openEditModal = (record) => {
    setEditingDevice(record);
    setIsEditModalVisible(true);
  };

  const columns = [
    { title: 'Tên thiết bị', dataIndex: 'name', key: 'name' },
    { 
      title: 'Loại', 
      dataIndex: 'deviceType', 
      key: 'deviceType',
      render: (type) => {
        const colors = { POS: 'blue', Waiter: 'green', Kitchen: 'orange', Attendance: 'purple' };
        return <Tag color={colors[type] || 'default'}>{type}</Tag>;
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => isActive ? <Tag color="success">Hoạt động</Tag> : <Tag color="error">Đã thu hồi</Tag>
    },
    { 
      title: 'Hoạt động cuối', 
      dataIndex: 'lastActiveAt', 
      key: 'lastActiveAt',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'Chưa hoạt động'
    },
    { 
      title: 'Ngày tạo', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : ''
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>Sửa</Button>
          {record.isActive ? (
            <Popconfirm title="Thu hồi quyền của thiết bị này?" onConfirm={() => handleRevoke(record.id)}>
              <Button size="small" type="primary" danger>Thu hồi</Button>
            </Popconfirm>
          ) : (
            <Popconfirm title="Cấp lại quyền cho thiết bị này?" onConfirm={() => handleActivate(record)}>
              <Button size="small" type="primary" style={{ backgroundColor: '#52c41a' }}>Cấp quyền</Button>
            </Popconfirm>
          )}
          <Popconfirm title="Xóa thiết bị này khỏi hệ thống?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>Xóa</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Quản Lý Thiết Bị</h2>
        <Space>
          <Select 
            value={selectedBranch}
            onChange={setSelectedBranch}
            style={{ width: 200 }}
            placeholder="Chọn chi nhánh"
          >
            {branches.map(b => (
              <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
            ))}
          </Select>
          <Link to="/device-setup">
            <Button type="primary">Thiết lập thiết bị này</Button>
          </Link>
        </Space>
      </div>

      <Table 
        columns={columns} 
        dataSource={devices} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <DeviceEditModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSuccess={loadDevices}
        editingDevice={editingDevice}
      />
    </div>
  );
};

export default DeviceManagementPage;
