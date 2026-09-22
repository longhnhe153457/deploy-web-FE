import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Card,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  TimePicker,
  Space,
  Row,
  Col,
  Tag,
  Tooltip,
  Popconfirm,
  Radio,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getAllShifts,
  createShift,
  updateShift,
  deleteShift,
} from '../api/shiftApi';
import { useAuth } from '../context/AuthContext';

const ROLE_NAME_MAP = {
  Manager: 'Quản lý',
  Cashier: 'Thu ngân',
  Chef: 'Bếp trưởng',
  Waiter: 'Phục vụ',
};

const SYSTEM_ROLES = [
  { id: 4, name: 'Thu ngân', color: 'blue' },
  { id: 5, name: 'Bếp trưởng', color: 'orange' },
  { id: 6, name: 'Phục vụ', color: 'green' },
];

const ShiftPage = () => {

  const { user, role } = useAuth();
  const isOwnerOrAdmin = user?.roleId === 1 || user?.roleId === 2 || ['Owner', 'Admin'].includes(role);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [editingRecord, setEditingRecord] = useState(null);

  const [form] = Form.useForm();

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllShifts();
      setShifts(res.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải dữ liệu ca làm việc!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create / Edit Open
  const handleOpenModal = (type, record = null) => {
    setModalType(type);
    setEditingRecord(record);
    setIsModalOpen(true);

    if (type === 'edit' && record) {
      const minRolesMap = {};
      SYSTEM_ROLES.forEach(r => { minRolesMap[r.id] = 0; });
      if (record.roleRequirements) {
        record.roleRequirements.forEach(req => {
          minRolesMap[req.roleId] = req.minQuantity;
        });
      }

      form.setFieldsValue({
        name: record.name,
        startTime: record.startTime ? dayjs(record.startTime, 'HH:mm:ss') : null,
        endTime: record.endTime ? dayjs(record.endTime, 'HH:mm:ss') : null,
        standardHours: record.standardHours ?? 8.0,
        isNightShift: record.isNightShift ?? false,
        nightBonusRate: record.nightBonusRate ?? 1.3,
        nightAllowance: record.nightAllowance ?? 0,
        nightStartTime: record.nightStartTime ? dayjs(record.nightStartTime, 'HH:mm:ss') : null,
        nightEndTime: record.nightEndTime ? dayjs(record.nightEndTime, 'HH:mm:ss') : null,
        nightHours: record.nightHours ?? 0,
        isActive: record.isActive ?? true,
        applicableTo: record.applicableTo || 'ALL',
        minRoles: minRolesMap,
      });
    } else {
      form.resetFields();
      const defaultMinRoles = { 3: 0, 4: 1, 5: 1, 6: 2 };
      form.setFieldsValue({
        standardHours: 8.0,
        isNightShift: false,
        nightBonusRate: 1.3,
        nightAllowance: 0,
        nightStartTime: null,
        nightEndTime: null,
        nightHours: 0,
        isActive: true,
        applicableTo: 'ALL',
        minRoles: defaultMinRoles,
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
  };

  // Submit Handler
  const handleSubmit = async (values) => {
    try {
      const roleReqsPayload = SYSTEM_ROLES
        .map(r => ({
          roleId: r.id,
          minQuantity: values.minRoles?.[r.id] ?? 0
        }))
        .filter(item => item.minQuantity > 0);

      const dataPayload = {
        name: values.name,
        startTime: values.startTime ? values.startTime.format('HH:mm:ss') : null,
        endTime: values.endTime ? values.endTime.format('HH:mm:ss') : null,
        standardHours: values.standardHours ?? 8.0,
        isNightShift: values.isNightShift ?? false,
        nightBonusRate: values.nightBonusRate ?? 1.3,
        nightAllowance: values.nightAllowance ?? 0,
        nightStartTime: values.nightStartTime ? values.nightStartTime.format('HH:mm:ss') : null,
        nightEndTime: values.nightEndTime ? values.nightEndTime.format('HH:mm:ss') : null,
        nightHours: values.nightHours ?? 0,
        isActive: values.isActive ?? true,
        applicableTo: values.applicableTo || 'ALL',
        roleRequirements: roleReqsPayload,
      };

      if (modalType === 'create') {
        const payload = {
          ...dataPayload,
          createdBy: user?.id || 1,
        };
        await createShift(payload);
        message.success('Thêm mới ca làm việc thành công!');
      } else {
        const payload = {
          ...dataPayload,
          id: editingRecord.id,
        };
        await updateShift(payload);
        message.success('Cập nhật ca làm việc thành công!');
      }
      handleCloseModal();
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu ca làm việc!';
      message.error(errorMsg);
    }
  };


  // Delete Handler
  const handleDelete = async (id) => {
    try {
      await deleteShift(id);
      message.success('Xóa ca làm việc thành công!');
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi xóa ca làm việc!';
      message.error(errorMsg);
    }
  };

  // Filter & Default Sort by Shift ID Ascending (1, 2, 3...)
  const filteredShifts = shifts
    .filter((s) => {
      const search = searchText.toLowerCase();
      const name = s.name?.toLowerCase() || '';
      const code = String(s.id);
      return name.includes(search) || code.includes(search);
    })
    .sort((a, b) => a.id - b.id);

  // Columns
  const baseColumns = [
    {
      title: 'Tên ca',
      dataIndex: 'name',
      key: 'name',
      render: (name) => (
        <strong style={{ color: '#e8442a' }}>{name}</strong>
      ),
    },
    {
      title: 'Giờ bắt đầu',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time) => {
        if (!time) return '—';
        const parsed = dayjs(time, 'HH:mm:ss');
        return parsed.isValid() ? parsed.format('HH:mm') : time;
      },
    },
    {
      title: 'Giờ kết thúc',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time) => {
        if (!time) return '—';
        const parsed = dayjs(time, 'HH:mm:ss');
        return parsed.isValid() ? parsed.format('HH:mm') : time;
      },
    },
    {
      title: 'Loại ca',
      dataIndex: 'isNightShift',
      key: 'isNightShift',
      render: (isNight) => (
        <Tag color={isNight ? 'purple' : 'blue'}>
          {isNight ? 'Ca đêm' : 'Ca ngày'}
        </Tag>
      ),
    },
    {
      title: 'Giờ chuẩn',
      dataIndex: 'standardHours',
      key: 'standardHours',
      render: (hrs) => `${hrs ?? 8.0}h`,
    },
    {
      title: 'Đối tượng áp dụng',
      dataIndex: 'applicableTo',
      key: 'applicableTo',
      render: (app) => {
        if (app === 'FULL_TIME') return <Tag color="blue">Toàn thời gian</Tag>;
        if (app === 'PART_TIME') return <Tag color="purple">Bán thời gian</Tag>;
        return <Tag color="default">Tất cả</Tag>;
      },
    },
    {
      title: 'NV tối thiểu theo Chức danh',
      dataIndex: 'roleRequirements',
      key: 'roleRequirements',
      render: (roleReqs) => {
        if (!roleReqs || roleReqs.length === 0) return <span style={{ color: '#9ca3af' }}>Chưa cấu hình</span>;
        return (
          <Space wrap size={[4, 4]}>
            {roleReqs.map((req) => {
              const roleObj = SYSTEM_ROLES.find((r) => r.id === req.roleId);
              const rawName = req.roleName || roleObj?.name || `Role ${req.roleId}`;
              const roleName = ROLE_NAME_MAP[rawName] || roleObj?.name || rawName;
              const color = roleObj?.color || 'blue';
              return (
                <Tag key={req.roleId} color={color} style={{ borderRadius: '4px' }}>
                  {roleName}: <strong>{req.minQuantity}</strong>
                </Tag>
              );
            })}
          </Space>
        );
      },
    },

    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
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
        <Tooltip title="Xóa ca làm việc">
          <Popconfirm
            title="Bạn chắc chắn muốn xóa ca làm việc này?"
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
    <div className="shifts-page animate-fade-in" style={{ padding: '4px 0' }}>
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
              <ClockCircleOutlined />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#e8442a', fontWeight: 700 }}>
                Quản Lý Ca Làm Việc
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                Thiết lập các ca làm việc, thời gian, giờ chuẩn và phụ cấp ca đêm
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
              Thêm ca mới
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Tìm kiếm theo tên ca làm việc..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 450, borderRadius: '8px' }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredShifts}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
          bordered
        />
      </Card>

      {/* Modal */}
      <Modal
        maskClosable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: '#e8442a' }}>
            <ClockCircleOutlined />
            <span>{modalType === 'create' ? 'TẠO MỚI CA LÀM VIỆC' : 'CẬP NHẬT CA LÀM VIỆC'}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        width={560}
        okText={modalType === 'create' ? 'Tạo mới' : 'Cập nhật'}
        cancelText="Hủy bỏ"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #e8442a, #ff8c42)',
            border: 'none',
            borderRadius: '6px',
          },
        }}
        cancelButtonProps={{
          style: {
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
            label="Tên ca làm việc"
            rules={[{ required: true, message: 'Vui lòng nhập tên ca làm việc!' }]}
          >
            <Input placeholder="VD: Ca sáng, Ca chiều, Ca đêm..." />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="startTime"
                label="Giờ bắt đầu"
                rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu!' }]}
              >
                <TimePicker
                  format="HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Bắt đầu"
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="endTime"
                label="Giờ kết thúc"
                rules={[{ required: true, message: 'Vui lòng chọn giờ kết thúc!' }]}
              >
                <TimePicker
                  format="HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Kết thúc"
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="standardHours"
                label="Số giờ chuẩn"
                rules={[{ required: true, message: 'Vui lòng nhập số giờ chuẩn!' }]}
              >
                <InputNumber
                  min={0.5}
                  max={24.0}
                  step={0.5}
                  style={{ width: '100%' }}
                  placeholder="8.0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="applicableTo"
            label="Đối tượng áp dụng ca"
            rules={[{ required: true, message: 'Vui lòng chọn đối tượng áp dụng!' }]}
            style={{ marginBottom: 16 }}
          >
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="ALL">Tất cả</Radio.Button>
              <Radio.Button value="FULL_TIME">Toàn thời gian</Radio.Button>
              <Radio.Button value="PART_TIME">Bán thời gian</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Card
            size="small"
            style={{
              marginBottom: 16,
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '8px',
            }}
          >
            <div style={{ marginBottom: 10, fontSize: '13px', fontWeight: 600, color: '#274e13', display: 'flex', alignItems: 'center', gap: 6 }}>
              <UsergroupAddOutlined />
              <span>👥 Số lượng nhân viên tối thiểu theo Chức danh:</span>
            </div>
            <Row gutter={[12, 8]}>
              {SYSTEM_ROLES.map((r) => (
                <Col span={12} key={r.id}>
                  <Form.Item
                    name={['minRoles', r.id]}
                    label={<span style={{ fontSize: '12px', fontWeight: 500 }}>{r.name}</span>}
                    style={{ marginBottom: 6 }}
                  >
                    <InputNumber
                      min={0}
                      max={50}
                      step={1}
                      style={{ width: '100%' }}
                      placeholder="0"
                      addonAfter="người"
                    />
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Card>

          <Form.Item

            name="isNightShift"
            label="Cấu hình Ca Đêm"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Ca đêm"
              unCheckedChildren="Ca ngày"
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.isNightShift !== currentValues.isNightShift}
          >
            {({ getFieldValue }) =>
              getFieldValue('isNightShift') ? (
                <Card
                  size="small"
                  style={{
                    marginBottom: 16,
                    background: '#faf5ff',
                    border: '1px solid #d8b4fe',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ marginBottom: 8, fontSize: '12px', fontWeight: 600, color: '#6b21a8' }}>
                    🌙 Cấu hình Khung giờ ca đêm & Đơn giá:
                  </div>
                  <Row gutter={12} style={{ marginBottom: 8 }}>
                    <Col span={12}>
                      <Form.Item
                        name="nightStartTime"
                        label="Giờ bắt đầu tính ca đêm"
                        tooltip="Ví dụ: 00:00 (hoặc 24h00)"
                      >
                        <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Chọn giờ BĐ ca đêm" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="nightEndTime"
                        label="Giờ kết thúc tính ca đêm"
                        tooltip="Ví dụ: 02:00"
                      >
                        <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Chọn giờ KT ca đêm" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item
                        name="nightBonusRate"
                        label="Hệ số ca đêm"
                        rules={[{ required: true, message: 'Nhập hệ số!' }]}
                        style={{ marginBottom: 8 }}
                      >
                        <InputNumber
                          min={1.0}
                          max={5.0}
                          step={0.1}
                          style={{ width: '100%' }}
                          placeholder="VD: 1.3 (+30%)"
                        />
                      </Form.Item>
                    </Col>

                    <Col span={8}>
                      <Form.Item
                        name="nightAllowance"
                        label="Phụ cấp cố định (đ)"
                        style={{ marginBottom: 8 }}
                      >
                        <InputNumber
                          min={0}
                          step={10000}
                          style={{ width: '100%' }}
                          placeholder="VD: 50000"
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                        />
                      </Form.Item>
                    </Col>

                    <Col span={8}>
                      <Form.Item
                        name="nightHours"
                        label="Nhập cố định giờ"
                        tooltip="Nếu đặt khung giờ ở trên thì để 0. Hệ thống sẽ tự động tính số giờ giao nhau."
                        style={{ marginBottom: 8 }}
                      >
                        <InputNumber
                          min={0}
                          max={24}
                          step={0.5}
                          addonAfter="h"
                          style={{ width: '100%' }}
                          placeholder="Mặc định: 0"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Trạng thái hoạt động"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Hoạt động"
              unCheckedChildren="Ngừng"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ShiftPage;
