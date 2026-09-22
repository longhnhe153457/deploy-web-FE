import React, { useState, useEffect } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, Select,
  InputNumber, DatePicker, message, Tag, Switch
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAllVouchers, deleteVoucher } from '../api/voucherApi';
import { getAllBranches } from '../api/branchApi';
import VoucherCreateModal from '../components/voucher/VoucherCreateModal';
import VoucherEditModal from '../components/voucher/VoucherEditModal';
import { useAuth, ROLES } from '../context/AuthContext';

const { Option } = Select;

const VoucherPage = () => {
  const { hasRole } = useAuth();
  const isOwnerOrAdmin = hasRole(ROLES.OWNER, ROLES.ADMIN);

  const [vouchers, setVouchers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);

  const [filterStatus, setFilterStatus] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const data = await getAllVouchers();
      setVouchers(data);
    } catch (error) {
      message.error('Lỗi tải danh sách Khuyến mãi');
    }
    setLoading(false);
  };

  const fetchBranches = async () => {
    if (!isOwnerOrAdmin) return;
    try {
      const res = await getAllBranches();
      setBranches(res.data || res);
    } catch (error) {
      console.error('Lỗi tải chi nhánh:', error);
    }
  };

  useEffect(() => {
    fetchVouchers();
    fetchBranches();
  }, []);

  const showModal = (record = null) => {
    if (record) {
      setEditingVoucher(record);
      setIsEditModalVisible(true);
    } else {
      setIsCreateModalVisible(true);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xóa Khuyến mãi',
      content: 'Bạn có chắc chắn muốn xóa khuyến mãi này không?',
      onOk: async () => {
        try {
          await deleteVoucher(id);
          message.success('Xóa thành công');
          fetchVouchers();
        } catch (error) {
          message.error(error?.response?.data?.message || 'Xóa thất bại');
        }
      }
    });
  };

  const processedVouchers = React.useMemo(() => {
    let list = vouchers.map(v => {
      const now = dayjs();
      let status = 'Active';
      if (dayjs(v.endDate).isBefore(now)) status = 'Expired';
      else if (!v.isActive) status = 'Disabled';
      else if (dayjs(v.startDate).isAfter(now)) status = 'Upcoming';
      return { ...v, status };
    });

    if (filterBranch !== 'All') {
      list = list.filter(v => !v.branchId || v.branchId === Number(filterBranch));
    }

    if (filterStatus !== 'All') {
      list = list.filter(v => v.status === filterStatus);
    }

    const statusPriority = { 'Active': 1, 'Upcoming': 2, 'Disabled': 3, 'Expired': 4 };
    list.sort((a, b) => {
      const pA = statusPriority[a.status] || 99;
      const pB = statusPriority[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf();
    });

    return list;
  }, [vouchers, filterStatus, filterBranch]);

  const columns = [
    {
      title: 'Mã Voucher',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <strong style={{ fontSize: 14 }}>{text}</strong>
    },
    {
      title: 'Tên CTKM',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{text}</span>
    },
    {
      title: 'Giá trị giảm',
      key: 'discount',
      render: (_, record) => (
        <span style={{ fontSize: 14, color: '#475569' }}>
          {record.discountType === 'Fixed'
            ? `${record.discountValue.toLocaleString()} đ`
            : `${record.discountValue}% (Tối đa ${record.maxDiscount.toLocaleString()} đ)`}
        </span>
      )
    },
    {
      title: 'Đơn tối thiểu',
      dataIndex: 'minOrderValue',
      render: (val) => <span style={{ fontSize: 14, color: '#475569' }}>{val.toLocaleString()} đ</span>
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_, record) => (
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {dayjs(record.startDate).format('DD/MM/YYYY')} - {dayjs(record.endDate).format('DD/MM/YYYY')}
        </span>
      )
    },
    {
      title: 'Giới hạn dùng',
      key: 'usage',
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 14, color: '#475569' }}>{record.usedCount} / {record.quantity}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {record.maxUsagePerCustomer ? `(Tối đa ${record.maxUsagePerCustomer}/khách)` : '(Không giới hạn/khách)'}
          </div>
        </div>
      )
    },
    {
      title: 'Áp dụng tại',
      key: 'branch',
      render: (_, record) => (
        record.branchId ? (
          <Tag color="blue" style={{ fontSize: 13 }}>{record.branchName}</Tag>
        ) : (
          <Tag color="blue" style={{ fontSize: 13 }}>Toàn hệ thống</Tag>
        )
      )
    },
    {
      title: 'Tình trạng',
      key: 'status',
      render: (_, record) => {
        const colors = {
          'Active': 'green',
          'Upcoming': 'gold',
          'Disabled': 'default',
          'Expired': 'error'
        };
        const labels = {
          'Active': 'Đang diễn ra',
          'Upcoming': 'Sắp tới',
          'Disabled': 'Đã khóa',
          'Expired': 'Đã kết thúc'
        };
        return <Tag color={colors[record.status]} style={{ fontSize: 13 }}>{labels[record.status]}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => {
        if (record.status === 'Expired') return <span style={{ fontSize: 12, color: '#94a3b8' }}>-</span>;
        const canEditDelete = isOwnerOrAdmin || record.branchId != null;
        if (!canEditDelete) return <span style={{ fontSize: 12, color: '#94a3b8' }}>-</span>;

        return (
          <Space size="middle">
            <Button icon={<EditOutlined />} onClick={() => showModal(record)} />
            <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
          </Space>
        );
      }
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          Tạo Voucher mới
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <span>Tình trạng:</span>
        <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 150 }}>
          <Option value="All">Tất cả</Option>
          <Option value="Active">Đang diễn ra</Option>
          <Option value="Upcoming">Sắp tới</Option>
          <Option value="Disabled">Đã khóa (Tắt)</Option>
          <Option value="Expired">Đã kết thúc</Option>
        </Select>

        {isOwnerOrAdmin && branches.length > 0 && (
          <>
            <span>Chi nhánh:</span>
            <Select value={filterBranch} onChange={setFilterBranch} style={{ width: 200 }}>
              <Option value="All">Tất cả chi nhánh</Option>
              {branches.map(b => (
                <Option key={b.id} value={b.id}>{b.name}</Option>
              ))}
            </Select>
          </>
        )}
      </Space>

      <Table
        columns={columns}
        dataSource={processedVouchers}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <VoucherCreateModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onSuccess={fetchVouchers}
        branches={branches}
      />

      <VoucherEditModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSuccess={fetchVouchers}
        branches={branches}
        editingVoucher={editingVoucher}
      />
    </div>
  );
};

export default VoucherPage;
