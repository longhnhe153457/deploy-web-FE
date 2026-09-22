import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Card,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Switch,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CalendarOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getHolidayConfigs,
  createHolidayConfig,
  updateHolidayConfig,
  deleteHolidayConfig,
} from '../api/holidayConfigApi';
import { getAllBranches } from '../api/branchApi';
import { useAuth } from '../context/AuthContext';

const { RangePicker } = DatePicker;

const HolidayConfigPage = () => {
  const { user, role } = useAuth();
  const isOwnerOrAdmin = user?.roleId === 1 || user?.roleId === 2 || ['Owner', 'Admin'].includes(role);

  const [configs, setConfigs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [editingRecord, setEditingRecord] = useState(null);

  const [form] = Form.useForm();

  // Load Branches
  const fetchBranches = useCallback(async () => {
    try {
      const res = await getAllBranches();
      setBranches(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBranchFilter) params.branchId = selectedBranchFilter;
      const res = await getHolidayConfigs(params);
      setConfigs(res.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách cấu hình ngày Lễ/Tết!');
    } finally {
      setLoading(false);
    }
  }, [selectedBranchFilter]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Open Modal
  const handleOpenModal = (type, record = null) => {
    setModalType(type);
    setEditingRecord(record);
    setIsModalOpen(true);

    if (type === 'edit' && record) {
      form.setFieldsValue({
        name: record.name,
        dateRange: [
          record.fromDate ? dayjs(record.fromDate) : null,
          record.toDate ? dayjs(record.toDate) : null,
        ],
        coefficient: record.coefficient ?? 3.0,
        branchIds: record.branchIds && record.branchIds.length > 0 ? record.branchIds : (record.branchId ? [record.branchId] : []),
        isRecurring: record.isRecurring ?? false,
        isActive: record.isActive ?? true,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        coefficient: 3.0,
        isRecurring: false,
        isActive: true,
        branchIds: [],
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
  };

  // Handle Submit
  const handleSubmit = async (values) => {
    try {
      const [fromDate, toDate] = values.dateRange || [];
      const payload = {
        name: values.name,
        fromDate: fromDate ? fromDate.format('YYYY-MM-DD') : null,
        toDate: toDate ? toDate.format('YYYY-MM-DD') : null,
        coefficient: values.coefficient,
        branchIds: values.branchIds && values.branchIds.length > 0 ? values.branchIds : null,
        isRecurring: values.isRecurring ?? false,
        isActive: values.isActive ?? true,
      };

      if (modalType === 'create') {
        await createHolidayConfig(payload);
        message.success('Thêm mới cấu hình ngày Lễ/Tết thành công!');
      } else {
        await updateHolidayConfig(editingRecord.id, {
          ...payload,
          id: editingRecord.id,
        });
        message.success('Cập nhật cấu hình ngày Lễ/Tết thành công!');
      }
      handleCloseModal();
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình!';
      message.error(errorMsg);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    try {
      await deleteHolidayConfig(id);
      message.success('Xóa cấu hình ngày Lễ/Tết thành công!');
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi xóa cấu hình!';
      message.error(errorMsg);
    }
  };

  // Filter
  const filteredConfigs = configs.filter((c) => {
    const search = searchText.toLowerCase();
    const name = c.name?.toLowerCase() || '';
    return name.includes(search);
  });

  // Table Columns
  const baseColumns = [
    {
      title: 'Mã',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id) => <strong style={{ color: '#1890ff' }}>#{id}</strong>,
    },
    {
      title: 'Tên ngày Lễ / Tết',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <strong style={{ color: '#e8442a', fontSize: 14 }}>{name}</strong>,
    },
    {
      title: 'Thời gian áp dụng',
      key: 'dateRange',
      render: (_, record) => {
        const from = record.fromDate ? dayjs(record.fromDate).format('DD/MM/YYYY') : '—';
        const to = record.toDate ? dayjs(record.toDate).format('DD/MM/YYYY') : '—';
        return (
          <Space>
            <CalendarOutlined style={{ color: '#8c8c8c' }} />
            <span>{from} ➔ {to}</span>
          </Space>
        );
      },
    },
    {
      title: 'Hệ số lương',
      dataIndex: 'coefficient',
      key: 'coefficient',
      render: (coeff) => (
        <Tag color="volcano" style={{ fontSize: 14, fontWeight: 700, padding: '2px 10px' }}>
          x{coeff ? coeff.toFixed(1) : '1.0'}
        </Tag>
      ),
      sorter: (a, b) => a.coefficient - b.coefficient,
    },
    {
      title: 'Áp dụng chi nhánh',
      key: 'branchNames',
      render: (_, record) => {
        if (record.branchNames && record.branchNames.length > 0) {
          return (
            <Space wrap size={[0, 4]}>
              {record.branchNames.map((name, idx) => (
                <Tag color="blue" key={idx}>{name}</Tag>
              ))}
            </Space>
          );
        }
        if (record.branchId) {
          return <Tag color="blue">{record.branchName || `Chi nhánh ID ${record.branchId}`}</Tag>;
        }
        return <Tag color="purple">Toàn hệ thống</Tag>;
      },
    },
    {
      title: 'Lặp lại',
      dataIndex: 'isRecurring',
      key: 'isRecurring',
      render: (isRecurring) => (
        <Tag color={isRecurring ? 'cyan' : 'default'}>
          {isRecurring ? 'Hàng năm' : 'Cố định 1 lần'}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Đang hoạt động' : 'Tắt'}
        </Tag>
      ),
    },
  ];

  const actionColumn = {
    title: 'Hành động',
    key: 'actions',
    fixed: 'right',
    width: 110,
    render: (_, record) => (
      <Space size="middle">
        <Tooltip title="Chỉnh sửa">
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#1890ff' }} />}
            onClick={() => handleOpenModal('edit', record)}
          />
        </Tooltip>
        <Tooltip title="Xóa">
          <Popconfirm
            title="Bạn chắc chắn muốn xóa cấu hình Lễ/Tết này?"
            okText="Đồng ý"
            cancelText="Hủy"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Tooltip>
      </Space>
    ),
  };

  const columns = isOwnerOrAdmin ? [...baseColumns, actionColumn] : baseColumns;

  return (
    <div className="holiday-config-page animate-fade-in" style={{ padding: '4px 0' }}>
      {/* Header */}
      <Card
        style={{
          marginBottom: 16,
          background: 'linear-gradient(135deg, #fffbfb 0%, #fff6f5 100%)',
          border: '1px solid #ffdeda',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#ffefed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e8442a',
                fontSize: 22,
              }}
            >
              <DollarOutlined />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#e8442a', fontWeight: 700 }}>
                Cấu Hình Hệ Số Ngày Lễ / Tết
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                Thiết lập hệ số nhân lương (ví dụ: Tết 3.0x, Lễ 2.0x) cho các khoảng thời gian trong năm
              </p>
            </div>
          </div>

          {isOwnerOrAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              style={{
                background: 'linear-gradient(135deg, #e8442a, #ff8c42)',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(232, 68, 42, 0.25)',
              }}
              onClick={() => handleOpenModal('create')}
            >
              Thêm ngày Lễ / Tết
            </Button>
          )}
        </div>
      </Card>

      {/* Filter & Table */}
      <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="Tìm kiếm theo tên ngày Lễ/Tết..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 350, borderRadius: '8px' }}
          />

          <Select
            placeholder="Lọc theo Chi nhánh"
            allowClear
            value={selectedBranchFilter}
            onChange={(val) => setSelectedBranchFilter(val)}
            style={{ width: 220, borderRadius: '8px' }}
          >
            {branches.map((b) => (
              <Select.Option key={b.id} value={b.id}>
                {b.name}
              </Select.Option>
            ))}
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredConfigs}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
        />
      </Card>

      {/* Modal Create / Edit */}
      <Modal
        maskClosable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: '#e8442a' }}>
            <CalendarOutlined />
            <span>{modalType === 'create' ? 'THÊM CẤU HÌNH NGÀY LỄ / TẾT' : 'CẬP NHẬT CẤU HÌNH NGÀY LỄ / TẾT'}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        width={540}
        okText={modalType === 'create' ? 'Tạo mới' : 'Cập nhật'}
        cancelText="Hủy bỏ"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #e8442a, #ff8c42)',
            border: 'none',
            borderRadius: '6px',
          },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Tên dịp Lễ / Tết"
            rules={[{ required: true, message: 'Vui lòng nhập tên dịp Lễ/Tết!' }]}
          >
            <Input placeholder="VD: Tết Nguyên Đán 2026, Quốc Khánh 2/9, Giỗ Tổ Hùng Vương..." />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Khoảng thời gian áp dụng (Từ ngày ➔ Đến ngày)"
            rules={[{ required: true, message: 'Vui lòng chọn khoảng thời gian áp dụng!' }]}
          >
            <RangePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              placeholder={['Từ ngày', 'Đến ngày']}
            />
          </Form.Item>

          <Form.Item
            name="coefficient"
            label="Hệ số lương (Lương giờ × Hệ số)"
            rules={[{ required: true, message: 'Vui lòng nhập hệ số lương!' }]}
          >
            <InputNumber
              min={1.0}
              max={10.0}
              step={0.5}
              style={{ width: '100%' }}
              placeholder="VD: 3.0"
            />
          </Form.Item>

          <Form.Item
            name="branchIds"
            label="Áp dụng chi nhánh"
          >
            <Select
              mode="multiple"
              placeholder="Chọn các chi nhánh áp dụng (Mặc định: Toàn hệ thống)"
              allowClear
              style={{ width: '100%' }}
            >
              {branches.map((b) => (
                <Select.Option key={b.id} value={b.id}>
                  {b.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="isRecurring"
            label="Lặp lại hàng năm"
            valuePropName="checked"
          >
            <Switch checkedChildren="Có" unCheckedChildren="Không" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Kích hoạt quy tắc"
            valuePropName="checked"
          >
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HolidayConfigPage;
