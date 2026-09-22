import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Card,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Space,
  Row,
  Col,
  Tag,
  Tooltip,
  Popconfirm,
  Avatar,
  message,
  Descriptions,
  Divider,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileProtectOutlined,
  InfoCircleOutlined,
  UserOutlined,
  EyeOutlined,
  CalendarOutlined,
  DollarOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
} from '../api/contractApi';
import { getAllBranches } from '../api/branchApi';
import { getRoleRange } from '../api/accountApi';
import { useAuth } from '../context/AuthContext';

const CONTRACT_TYPES = [
  { value: 'Full-time', label: 'Toàn thời gian' },
  { value: 'Part-time', label: 'Bán thời gian' },
];

const SALARY_TYPES = [
  { value: 'Monthly', label: 'Theo tháng' },
  { value: 'Hourly', label: 'Theo giờ' },
];

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Hiệu lực', color: 'success' },
  { value: 'Expired', label: 'Hết hiệu lực', color: 'warning' },
  { value: 'Terminated', label: 'Đã chấm dứt', color: 'error' },
];

const FORM_STATUS_OPTIONS = [
  { value: 'Active', label: 'Hiệu lực', color: 'success' },
  { value: 'Terminated', label: 'Đã chấm dứt', color: 'error' },
];

const ROLES_LIST = [
  { value: 3, label: 'Quản lý' },
  { value: 4, label: 'Thu ngân' },
  { value: 5, label: 'Bếp trưởng' },
  { value: 6, label: 'Phục vụ' },
];

const STAFF_ROLES_LIST = [
  { value: 4, label: 'Thu ngân' },
  { value: 5, label: 'Bếp trưởng' },
  { value: 6, label: 'Phục vụ' },
];

const ROLES_MAP = {
  3: { label: 'Quản lý', color: 'purple' },
  4: { label: 'Thu ngân', color: 'blue' },
  5: { label: 'Bếp trưởng', color: 'orange' },
  6: { label: 'Phục vụ', color: 'green' },
};

const ContractPage = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create' or 'edit'
  const [editingRecord, setEditingRecord] = useState(null);

  // Detail Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleOpenDetail = async (record) => {
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await getContractById(record.id);
      setDetailRecord(res.data || record);
    } catch (err) {
      console.error(err);
      setDetailRecord(record);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailRecord(null);
  };
  
  const [form] = Form.useForm();
  const watchRoleId = Form.useWatch('roleId', form);
  const watchType = Form.useWatch('type', form);
  const hideBaseWorkDay = watchRoleId === 3 || watchType === 'Part-time';

  // Load lists
  const loadData = useCallback(async (branchIdFilter = selectedBranch) => {
    setLoading(true);
    try {
      const [contractsRes, branchesRes, accountsRes] = await Promise.all([
        getContracts(branchIdFilter),
        getAllBranches(),
        getRoleRange(),
      ]);
      setContracts(contractsRes.data || []);
      setBranches(branchesRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải dữ liệu hợp đồng/chi nhánh/nhân viên!');
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isOwnerOrAdmin =
    user?.roles?.some((r) => ['Admin', 'Owner', 'ADMIN', 'OWNER', 'Quản trị viên'].includes(r)) ||
    user?.roleIds?.some((id) => id === 1 || id === 2);

  // Group accounts by role for cleaner dropdown UX
  const groupedAccounts = useCallback(() => {
    const groups = {
      3: { label: '👑 QUẢN LÝ', items: [] },
      4: { label: '💳 THU NGÂN', items: [] },
      5: { label: '👨‍🍳 BẾP TRƯỞNG', items: [] },
      6: { label: '🤵 PHỤC VỤ', items: [] },
      other: { label: '👤 NHÂN VIÊN KHÁC', items: [] },
    };

    accounts.forEach((a) => {
      const primaryRoleId = a.roleIds && a.roleIds.length > 0 ? a.roleIds[0] : (a.roleId || 'other');
      if (groups[primaryRoleId]) {
        groups[primaryRoleId].items.push(a);
      } else {
        groups.other.items.push(a);
      }
    });

    return Object.entries(groups).filter(([_, grp]) => grp.items.length > 0);
  }, [accounts])();

  // Handle Type Change to auto set salaryType
  const handleTypeChange = (val) => {
    const salaryTypeVal = val === 'Full-time' ? 'Monthly' : 'Hourly';
    form.setFieldsValue({
      type: val,
      salaryType: salaryTypeVal,
    });
  };

  // Handle Create / Edit Open
  const handleOpenModal = (type, record = null) => {
    setModalType(type);
    setEditingRecord(record);
    setIsModalOpen(true);
    
    if (type === 'edit' && record) {
      const targetSalaryType = (record.salaryType === 'Fixed' || record.type === 'Full-time') ? 'Monthly' : (record.salaryType || 'Hourly');
      form.setFieldsValue({
        accountId: record.accountId,
        accountName: record.accountName || getAccountName(record.accountId),
        roleId: record.roleId,
        branchId: record.branchId,
        type: record.type,
        salaryType: targetSalaryType,
        baseSalary: record.baseSalary,
        baseWorkDay: record.baseWorkDay,
        status: record.status,
        note: record.note,
        startDate: record.startDate ? dayjs(record.startDate) : null,
        endDate: record.endDate ? dayjs(record.endDate) : null,
      });
    } else {
      form.resetFields();
      const defaultBranchId = branches.length > 0 ? branches[0].id : undefined;
      form.setFieldsValue({
        status: 'Active',
        type: 'Full-time',
        salaryType: 'Monthly',
        baseWorkDay: 26,
        branchId: defaultBranchId,
        roleId: isOwnerOrAdmin ? 3 : undefined,
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
      const isHideWorkDay = values.roleId === 3 || values.type === 'Part-time';
      const dataPayload = {
        ...values,
        baseWorkDay: isHideWorkDay ? null : values.baseWorkDay,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
      };

      if (modalType === 'create') {
        const payload = {
          ...dataPayload,
          createdBy: user?.id || 1, // Default fallback if no user id
        };
        await createContract(payload);
        message.success('Thêm mới hợp đồng thành công!');
      } else {
        const payload = {
          ...dataPayload,
          id: editingRecord.id,
        };
        await updateContract(payload);
        message.success('Cập nhật hợp đồng thành công!');
      }
      handleCloseModal();
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu hợp đồng!';
      message.error(errorMsg);
    }
  };

  // Delete Handler
  const handleDelete = async (id) => {
    try {
      await deleteContract(id);
      message.success('Xóa hợp đồng thành công!');
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi xóa hợp đồng!';
      message.error(errorMsg);
    }
  };

  // Helper mappings
  const getAccountName = (id) => {
    const acc = accounts.find((a) => a.id === id);
    return acc ? acc.name : `Nhân viên #${id}`;
  };

  const getBranchName = (id) => {
    const br = branches.find((b) => b.id === id);
    return br ? br.name : `Chi nhánh #${id}`;
  };

  const getRoleName = (id) => {
    const r = ROLES_LIST.find((item) => item.value === id);
    return r ? r.label : `Chức vụ #${id}`;
  };

  // Auto set RoleId based on Account selected (UX enhancement)
  const handleAccountChange = (accountId) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (acc && acc.roleId) {
      form.setFieldsValue({ roleId: acc.roleId });
    }
  };

  // Filter Table Data
  const filteredContracts = contracts.filter((c) => {
    if (searchText) {
      const accName = (c.accountName || getAccountName(c.accountId)).toLowerCase();
      const branchName = getBranchName(c.branchId).toLowerCase();
      const typeLabel = c.type?.toLowerCase() || '';
      const noteText = c.note?.toLowerCase() || '';
      const search = searchText.toLowerCase();
      const matchText =
        accName.includes(search) ||
        branchName.includes(search) ||
        typeLabel.includes(search) ||
        noteText.includes(search);
      if (!matchText) return false;
    }
    if (selectedRole && c.roleId !== selectedRole) return false;
    if (selectedType && c.type !== selectedType) return false;
    if (selectedStatus && c.status !== selectedStatus) return false;
    return true;
  });

  // Columns definition
  const columns = [
    {
      title: 'Nhân viên',
      dataIndex: 'accountId',
      key: 'accountId',
      render: (id, record) => (
        <Tooltip title="Bấm để xem chi tiết hợp đồng">
          <div
            onClick={() => handleOpenDetail(record)}
            style={{ cursor: 'pointer', display: 'inline-block' }}
          >
            <strong
              style={{
                color: '#e8442a',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              {record.accountName || getAccountName(id)}
              <EyeOutlined style={{ fontSize: '13px', color: '#e8442a' }} />
            </strong>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>ID: {id}</div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Chức danh',
      dataIndex: 'roleId',
      key: 'roleId',
      width: 140,
      sorter: (a, b) => (a.roleId || 99) - (b.roleId || 99),
      render: (id) => getRoleName(id),
    },
    ...(isOwnerOrAdmin
      ? [
          {
            title: 'Chi nhánh',
            dataIndex: 'branchId',
            key: 'branchId',
            width: 170,
            render: (id, record) => {
              const fullName = record.branchName || getBranchName(id);
              const displayName = fullName.includes(',') ? fullName.split(',')[0].trim() : fullName;
              return (
                <Tooltip title={fullName}>
                  <span>{displayName}</span>
                </Tooltip>
              );
            },
          },
        ]
      : []),
    {
      title: 'Loại HĐ',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const found = CONTRACT_TYPES.find((t) => t.value === type);
        return found ? found.label.split(' (')[0] : type;
      },
    },
    {
      title: 'Mức lương cơ bản',
      dataIndex: 'baseSalary',
      key: 'baseSalary',
      render: (val) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`,
      sorter: (a, b) => a.baseSalary - b.baseSalary,
    },


    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const opt = STATUS_OPTIONS.find((s) => s.value === status) || { label: status, color: 'default' };
        return <Tag color={opt.color}>{opt.label}</Tag>;
      },
    },
    {
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
          <Tooltip title="Xóa hợp đồng">
            <Popconfirm
              title="Bạn chắc chắn muốn xóa hợp đồng này?"
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
    },
  ];

  return (
    <div className="contracts-page animate-fade-in" style={{ padding: '4px 0' }}>
      {/* Header section with styling */}
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
              <FileProtectOutlined />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#e8442a', fontWeight: 700 }}>
                {isOwnerOrAdmin ? 'Quản Lý Hợp Đồng Quản Lý' : 'Quản Lý Hợp Đồng Nhân Viên'}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                {isOwnerOrAdmin
                  ? 'Danh sách, trạng thái và chế độ đãi ngộ trong hợp đồng của các Quản lý chi nhánh'
                  : 'Danh sách, trạng thái và chế độ đãi ngộ trong hợp đồng của các nhân viên trong chi nhánh'}
              </p>
            </div>
          </div>

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
            {isOwnerOrAdmin ? 'Tạo hợp đồng Quản lý' : 'Tạo hợp đồng Nhân viên'}
          </Button>
        </div>
      </Card>

      {/* Filter and Table view */}
      <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="Tìm kiếm theo nhân viên, chi nhánh, ghi chú..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 320, borderRadius: '8px' }}
          />
          {isOwnerOrAdmin ? (
            <Select
              placeholder="Lọc chi nhánh"
              style={{ width: 180 }}
              allowClear
              value={selectedBranch}
              onChange={(val) => {
                setSelectedBranch(val);
                loadData(val);
              }}
            >
              {branches.map((b) => (
                <Select.Option key={b.id} value={b.id}>
                  {b.name}
                </Select.Option>
              ))}
            </Select>
          ) : (
            <Select
              placeholder="Lọc vai trò"
              style={{ width: 160 }}
              allowClear
              value={selectedRole}
              onChange={(val) => setSelectedRole(val)}
            >
              {STAFF_ROLES_LIST.map((r) => (
                <Select.Option key={r.value} value={r.value}>
                  {r.label}
                </Select.Option>
              ))}
            </Select>
          )}
          <Select
            placeholder="Lọc loại hợp đồng"
            style={{ width: 180 }}
            allowClear
            value={selectedType}
            onChange={(val) => setSelectedType(val)}
          >
            {CONTRACT_TYPES.map((t) => (
              <Select.Option key={t.value} value={t.value}>
                {t.label}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Lọc trạng thái"
            style={{ width: 180 }}
            allowClear
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
          >
            {STATUS_OPTIONS.map((st) => (
              <Select.Option key={st.value} value={st.value}>
                {st.label}
              </Select.Option>
            ))}
          </Select>
          {(searchText || selectedRole || selectedType || selectedStatus || selectedBranch) && (
            <Button
              type="link"
              danger
              onClick={() => {
                setSearchText('');
                setSelectedBranch(null);
                setSelectedRole(null);
                setSelectedType(null);
                setSelectedStatus(null);
                loadData(null);
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredContracts}
          rowKey="id"
          loading={loading}
          pagination={{ defaultPageSize: 10, pageSizeOptions: ['5', '10', '25'], showSizeChanger: true }}
          scroll={{ x: 1000 }}
          bordered
        />
      </Card>

      {/* Add / Edit Modal Form */}
      <Modal
        maskClosable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: '#e8442a' }}>
            <FileProtectOutlined />
            <span>
              {isOwnerOrAdmin
                ? modalType === 'create'
                  ? 'TẠO MỚI HỢP ĐỒNG QUẢN LÝ'
                  : 'CẬP NHẬT HỢP ĐỒNG QUẢN LÝ'
                : modalType === 'create'
                ? 'TẠO MỚI HỢP ĐỒNG NHÂN VIÊN'
                : 'CẬP NHẬT HỢP ĐỒNG NHÂN VIÊN'}
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        width={720}
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
          {/* Row 1: Account Selection & Role Selection */}
          <Row gutter={24}>
            <Col span={12}>
              {modalType === 'edit' ? (
                <>
                  <Form.Item
                    name="accountName"
                    label="Nhân viên hợp đồng"
                  >
                    <Input disabled style={{ color: 'rgba(0, 0, 0, 0.85)' }} />
                  </Form.Item>
                  <Form.Item name="accountId" noStyle>
                    <Input type="hidden" />
                  </Form.Item>
                </>
              ) : (
                <Form.Item
                  name="accountId"
                  label="Nhân viên hợp đồng"
                  rules={[{ required: true, message: 'Vui lòng chọn nhân viên!' }]}
                >
                  <Select
                    placeholder="Tìm kiếm theo tên, ID, SĐT, chức danh..."
                    showSearch
                    filterOption={(input, option) => {
                      if (!input) return true;
                      const searchValue = option?.searchValue || '';
                      return searchValue.toLowerCase().includes(input.toLowerCase());
                    }}
                    onChange={handleAccountChange}
                    optionLabelProp="label"
                    dropdownStyle={{ maxHeight: 360 }}
                  >
                    {groupedAccounts.map(([roleKey, group]) => (
                      <Select.OptGroup
                        key={roleKey}
                        label={
                          <div style={{ color: '#e8442a', fontWeight: 700, fontSize: '12px', letterSpacing: '0.5px', padding: '2px 0' }}>
                            {group.label} ({group.items.length})
                          </div>
                        }
                      >
                        {group.items.map((a) => {
                          const primaryRoleId = a.roleIds && a.roleIds.length > 0 ? a.roleIds[0] : a.roleId;
                          const roleInfo = primaryRoleId && ROLES_MAP[primaryRoleId]
                            ? ROLES_MAP[primaryRoleId]
                            : { label: 'Chưa phân vai trò', color: 'default' };
                          const searchValue = `${a.name} ${a.phone || ''} ${a.email || ''} ${roleInfo.label}`;

                          return (
                            <Select.Option
                              key={a.id}
                              value={a.id}
                              label={a.name}
                              searchValue={searchValue}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Avatar
                                    size={30}
                                    src={a.avatarImage || undefined}
                                    icon={!a.avatarImage ? <UserOutlined /> : undefined}
                                    style={{ backgroundColor: a.avatarImage ? undefined : '#e8442a', flexShrink: 0 }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937', lineHeight: '1.2' }}>
                                      {a.name}
                                    </div>
                                    {a.phone && (
                                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                        SĐT: {a.phone}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Tag color={roleInfo.color} style={{ margin: 0, fontSize: '11px', borderRadius: '4px' }}>
                                  {roleInfo.label}
                                </Tag>
                              </div>
                            </Select.Option>
                          );
                        })}
                      </Select.OptGroup>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Col>
            <Col span={12}>
              {isOwnerOrAdmin ? (
                <>
                  <Form.Item label="Chức danh" required>
                    <Input disabled value="Quản lý" style={{ color: 'rgba(0, 0, 0, 0.85)' }} />
                  </Form.Item>
                  <Form.Item name="roleId" noStyle>
                    <Input type="hidden" />
                  </Form.Item>
                </>
              ) : (
                <Form.Item
                  name="roleId"
                  label="Chức danh"
                  rules={[{ required: true, message: 'Vui lòng chọn chức danh!' }]}
                >
                  <Select placeholder="Chọn chức danh/vai trò...">
                    {STAFF_ROLES_LIST.map((r) => (
                      <Select.Option key={r.value} value={r.value}>
                        {r.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Col>
          </Row>

          {/* Row 2: Branch Selection & Status Selection */}
          <Row gutter={24}>
            <Col span={12}>
              {isOwnerOrAdmin ? (
                <Form.Item
                  name="branchId"
                  label="Chi nhánh áp dụng"
                  rules={[{ required: true, message: 'Vui lòng chọn chi nhánh!' }]}
                >
                  <Select placeholder="Chọn chi nhánh...">
                    {branches
                      .filter((b) => !b.isDeleted && b.status !== 'Ngừng kinh doanh')
                      .map((b) => (
                        <Select.Option key={b.id} value={b.id}>
                          {b.name}
                        </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : (
                <>
                  <Form.Item
                    label="Chi nhánh áp dụng"
                    required
                  >
                    <Input
                      disabled
                      value={branches.length > 0 ? branches[0].name : 'Chi nhánh của quản lý'}
                      style={{ color: 'rgba(0, 0, 0, 0.85)' }}
                    />
                  </Form.Item>
                  <Form.Item name="branchId" noStyle>
                    <Input type="hidden" />
                  </Form.Item>
                </>
              )}
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Trạng thái hợp đồng"
                rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
              >
                <Select placeholder="Chọn trạng thái...">
                  {FORM_STATUS_OPTIONS.map((s) => (
                    <Select.Option key={s.value} value={s.value}>
                      {s.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Row 3: Contract Type & Salary Type */}
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Loại hợp đồng"
                rules={[{ required: true, message: 'Vui lòng chọn loại hợp đồng!' }]}
              >
                <Select placeholder="Chọn loại hợp đồng..." onChange={handleTypeChange}>
                  {CONTRACT_TYPES.map((t) => (
                    <Select.Option key={t.value} value={t.value}>
                      {t.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="salaryType"
                label="Hình thức lương"
                rules={[{ required: true, message: 'Vui lòng chọn hình thức lương!' }]}
              >
                <Select disabled placeholder="Chọn hình thức lương...">
                  {SALARY_TYPES.map((st) => (
                    <Select.Option key={st.value} value={st.value}>
                      {st.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Row 4: Base Salary & Base Work Day */}
          <Row gutter={24}>
            <Col span={hideBaseWorkDay ? 24 : 12}>
              <Form.Item
                name="baseSalary"
                label="Lương cơ bản (VND)"
                rules={[{ required: true, message: 'Vui lòng nhập lương cơ bản!' }]}
              >
                <InputNumber
                  addonAfter="đ"
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                  min={0}
                />
              </Form.Item>
            </Col>
            {!hideBaseWorkDay && (
              <Col span={12}>
                <Form.Item
                  name="baseWorkDay"
                  label="Số ngày công chuẩn / tháng"
                  rules={[{ required: true, message: 'Vui lòng nhập ngày công chuẩn!' }]}
                >
                  <InputNumber style={{ width: '100%' }} min={1} max={31} />
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* Row 5: Start Date & End Date */}
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="Ngày bắt đầu hiệu lực"
                rules={[
                  { required: true, message: 'Vui lòng chọn ngày bắt đầu!' },
                  modalType === 'create' && {
                    validator: (_, value) => {
                      if (value && value.isBefore(dayjs().startOf('day'))) {
                        return Promise.reject(new Error('Ngày bắt đầu phải từ ngày hôm nay trở đi!'));
                      }
                      return Promise.resolve();
                    },
                  },
                ].filter(Boolean)}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày bắt đầu"
                  disabledDate={(current) =>
                    modalType === 'create' && current && current < dayjs().startOf('day')
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="Ngày kết thúc hiệu lực"
                rules={[
                  { required: true, message: 'Vui lòng chọn ngày kết thúc!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const startDate = getFieldValue('startDate');
                      if (!value || !startDate || value.isAfter(startDate) || value.isSame(startDate, 'day')) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!'));
                    },
                  }),
                ]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày kết thúc"
                  disabledDate={(current) => {
                    const startDate = form.getFieldValue('startDate');
                    if (modalType === 'create' && current && current < dayjs().startOf('day')) {
                      return true;
                    }
                    if (startDate && current && current < startDate.startOf('day')) {
                      return true;
                    }
                    return false;
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 6: Note */}
          <Form.Item name="note" label="Ghi chú thêm">
            <Input.TextArea placeholder="Nhập ghi chú chi tiết hoặc thỏa thuận riêng..." rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Contract Detail Modal */}
      <Modal
        maskClosable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: '#e8442a' }}>
            <FileProtectOutlined />
            <span>CHI TIẾT HỢP ĐỒNG LAO ĐỘNG</span>
          </div>
        }
        open={isDetailModalOpen}
        onCancel={handleCloseDetailModal}
        width={720}
        footer={[
          <Button key="close" onClick={handleCloseDetailModal} style={{ borderRadius: '6px' }}>
            Đóng
          </Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            style={{
              background: 'linear-gradient(135deg, #e8442a, #ff8c42)',
              border: 'none',
              borderRadius: '6px',
            }}
            onClick={() => {
              const currentDetail = detailRecord;
              handleCloseDetailModal();
              if (currentDetail) {
                handleOpenModal('edit', currentDetail);
              }
            }}
          >
            Chỉnh sửa hợp đồng
          </Button>,
        ]}
      >
        <Spin spinning={detailLoading}>
          {detailRecord && (
            <div style={{ marginTop: 12 }}>
              {/* Header Status Card */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #fffbfb 0%, #fff6f5 100%)',
                  border: '1px solid #ffdeda',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e8442a' }}>
                    Hợp Đồng Lao Động
                  </div>
                  {detailRecord.createdAt && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 2 }}>
                      Ngày tạo hệ thống: {dayjs(detailRecord.createdAt).format('DD/MM/YYYY HH:mm')}
                    </div>
                  )}
                </div>
                <div>
                  {(() => {
                    const opt = STATUS_OPTIONS.find((s) => s.value === detailRecord.status) || {
                      label: detailRecord.status,
                      color: 'default',
                    };
                    return (
                      <Tag
                        color={opt.color}
                        style={{ padding: '4px 12px', fontSize: '14px', borderRadius: '20px', fontWeight: 600 }}
                      >
                        {opt.label}
                      </Tag>
                    );
                  })()}
                </div>
              </div>

              {/* Account & Role & Branch info */}
              <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col span={12}>
                  <Card size="small" style={{ borderRadius: '8px', background: '#fafafa' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UserOutlined />
                      <span>Nhân viên hợp đồng</span>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>
                      {detailRecord.accountName || getAccountName(detailRecord.accountId)}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      {(() => {
                        const roleInfo = ROLES_MAP[detailRecord.roleId] || { label: getRoleName(detailRecord.roleId), color: 'default' };
                        return <Tag color={roleInfo.color}>{roleInfo.label}</Tag>;
                      })()}
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" style={{ borderRadius: '8px', background: '#fafafa' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BankOutlined />
                      <span>Chi nhánh áp dụng</span>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>
                      {detailRecord.branchName || getBranchName(detailRecord.branchId)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 4 }}>
                      Mã chi nhánh: #{detailRecord.branchId}
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Salary & Work Days Info */}
              <Card
                size="small"
                title={
                  <Space style={{ color: '#e8442a', fontWeight: 'bold', fontSize: '14px' }}>
                    <DollarOutlined />
                    <span>Chế Độ Lương & Ngày Công</span>
                  </Space>
                }
                style={{ borderRadius: '8px', marginBottom: 16 }}
              >
                <Row gutter={[16, 16]}>
                  {(() => {
                    const hideDay = detailRecord.type === 'Part-time' || detailRecord.salaryType === 'Hourly' || detailRecord.roleId === 3 || !detailRecord.baseWorkDay;
                    const colSpan = hideDay ? 12 : 8;
                    return (
                      <>
                        <Col span={colSpan}>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>Mức lương cơ bản</div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a', marginTop: 4 }}>
                            {new Intl.NumberFormat('vi-VN').format(detailRecord.baseSalary || 0)} đ
                          </div>
                        </Col>
                        <Col span={colSpan}>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>Hình thức lương</div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', marginTop: 4 }}>
                            {SALARY_TYPES.find((st) => st.value === detailRecord.salaryType)?.label || (detailRecord.salaryType === 'Fixed' ? 'Theo tháng' : detailRecord.salaryType)}
                          </div>
                        </Col>
                        {!hideDay && (
                          <Col span={colSpan}>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>Số ngày công chuẩn / tháng</div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', marginTop: 4 }}>
                              {detailRecord.baseWorkDay} ngày
                            </div>
                          </Col>
                        )}
                      </>
                    );
                  })()}
                </Row>
              </Card>

              {/* Validity & Type Info */}
              <Card
                size="small"
                title={
                  <Space style={{ color: '#1890ff', fontWeight: 'bold', fontSize: '14px' }}>
                    <CalendarOutlined />
                    <span>Thời Gian & Loại Hợp Đồng</span>
                  </Space>
                }
                style={{ borderRadius: '8px', marginBottom: 16 }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Loại hợp đồng</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', marginTop: 4 }}>
                      {CONTRACT_TYPES.find((ct) => ct.value === detailRecord.type)?.label || detailRecord.type}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Thời hạn hiệu lực</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', marginTop: 4 }}>
                      {detailRecord.startDate ? dayjs(detailRecord.startDate).format('DD/MM/YYYY') : 'N/A'}
                      {'  ➔  '}
                      {detailRecord.endDate ? dayjs(detailRecord.endDate).format('DD/MM/YYYY') : 'Không thời hạn'}
                    </div>
                  </Col>
                </Row>
                {detailRecord.note && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e5e7eb' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Ghi chú bổ sung:</div>
                    <div style={{ fontSize: '13px', color: '#4b5563', fontStyle: 'italic', marginTop: 2 }}>
                      "{detailRecord.note}"
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default ContractPage;
