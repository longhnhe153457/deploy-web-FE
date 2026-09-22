import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Table,
  Button,
  Card,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  Avatar,
  message,
  Upload,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  BankOutlined,
  UploadOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getRoleRange,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../api/accountApi';
import { getAllBranches } from '../api/branchApi';
import { uploadImage } from '../api/imageApi';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import AccountDetailModal from '../components/account/AccountDetailModal';

const GENDER_OPTIONS = [
  { value: 'Nam', label: 'Nam' },
  { value: 'Nữ', label: 'Nữ' },
  { value: 'Khác', label: 'Khác' },
];

const ROLES_MAP = {
  3: { label: 'Quản lý', color: 'purple' },
  4: { label: 'Thu ngân', color: 'blue' },
  5: { label: 'Bếp trưởng', color: 'orange' },
  6: { label: 'Phục vụ', color: 'green' },
};

const STAFF_ROLES_MAP = {
  4: { label: 'Thu ngân', color: 'blue' },
  5: { label: 'Bếp trưởng', color: 'orange' },
  6: { label: 'Phục vụ', color: 'green' },
};

const AccountPage = () => {
  const { user } = useAuth();
  const { currentBranchId } = useBranch();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const isOwnerOrAdmin =
    user?.roles?.some((r) => ['Admin', 'Owner', 'ADMIN', 'OWNER', 'Quản trị viên'].includes(r)) ||
    user?.roleIds?.some((id) => id === 1 || id === 2);

  const titleText = isOwnerOrAdmin ? 'Quản Lý Tài Khoản Quản Lý' : 'Quản Lý Nhân Viên Chi Nhánh';
  const subtitleText = isOwnerOrAdmin
    ? 'Quản lý danh sách tài khoản Quản lý các chi nhánh'
    : 'Quản lý thông tin tài khoản, trạng thái và vai trò của nhân viên';
  const buttonText = isOwnerOrAdmin ? 'Thêm quản lý mới' : 'Thêm nhân viên mới';

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [editingRecord, setEditingRecord] = useState(null);

  // Detail Modal states
  const [detailRecord, setDetailRecord] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleOpenDetailModal = (record) => {
    setDetailRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailRecord(null);
  };

  const [form] = Form.useForm();
  const avatarImageValue = Form.useWatch('avatarImage', form);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const beforeAvatarUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg';
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isValidExt = ['jpg', 'jpeg', 'png'].includes(ext);

    if (!isJpgOrPng || !isValidExt) {
      message.error('Chỉ chấp nhận file ảnh định dạng JPG, JPEG, PNG!');
      return Upload.LIST_IGNORE;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Dung lượng file ảnh không được vượt quá 5MB!');
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  const handleAvatarUpload = async ({ file, onSuccess, onError }) => {
    setUploadingAvatar(true);
    try {
      const res = await uploadImage(file);
      if (res.data) {
        const imgUrl = res.data.imageLink || res.data.ImageLink;
        form.setFieldsValue({ avatarImage: imgUrl });
        form.validateFields(['avatarImage']);
        message.success('Tải ảnh đại diện thành công!');
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      console.error('Upload avatar error:', err);
      message.error('Không thể tải ảnh đại diện lên!');
      if (onError) onError(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const targetBranchId = selectedBranch || (!isOwnerOrAdmin && currentBranchId ? Number(currentBranchId) : undefined);
      const [accRes, branchRes] = await Promise.all([
        getRoleRange(targetBranchId),
        getAllBranches().catch(() => ({ data: [] })),
      ]);
      setAccounts(accRes.data || []);
      setBranches(branchRes.data || []);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Không thể tải danh sách tài khoản!';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, isOwnerOrAdmin, currentBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tự động nhận diện và bật Modal chi tiết nhân viên khi điều hướng từ thông báo
  useEffect(() => {
    if (!accounts || accounts.length === 0) return;
    const accIdParam = searchParams.get('accountId') ? Number(searchParams.get('accountId')) : null;
    const searchParam = searchParams.get('search');
    const openDetailParam = searchParams.get('openDetail') === 'true' || searchParams.get('openDetail') === '1';

    if (searchParam && !searchText) {
      setSearchText(searchParam);
    }

    if (openDetailParam || accIdParam || searchParam) {
      let matched = null;
      if (accIdParam) {
        matched = accounts.find((a) => a.id === accIdParam);
      }
      if (!matched && searchParam) {
        const lower = searchParam.toLowerCase().trim();
        matched = accounts.find((a) => {
          const name = (a.name || '').toLowerCase();
          const email = (a.email || '').toLowerCase();
          const phone = (a.phone || '').toLowerCase();
          return name === lower || name.includes(lower) || email.includes(lower) || phone.includes(lower);
        });
      }

      if (matched) {
        handleOpenDetailModal(matched);
      }
    }
  }, [accounts, searchParams]);

  // Open modal
  const handleOpenModal = (type, record = null) => {
    setModalType(type);
    setEditingRecord(record);
    setIsModalOpen(true);

    if (type === 'edit' && record) {
      form.setFieldsValue({
        name: record.name,
        email: record.email,
        phone: record.phone,
        gender: record.gender || undefined,
        dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
        citizenIdCode: record.citizenIdCode,
        avatarImage: record.avatarImage,
        isActive: record.isActive,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        isActive: true,
        gender: 'Nam',
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
  };

  // Submit handler
  const handleSubmit = async (values) => {
    try {
      const dataPayload = {
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
      };

      if (modalType === 'create') {
        const payload = {
          ...dataPayload,
          createdBy: user?.id || 1,
        };
        await createAccount(payload);
        message.success('Thêm mới nhân viên thành công!');
      } else {
        const payload = {
          ...dataPayload,
          id: editingRecord.id,
        };
        // Remove password field on update (API doesn't accept it)
        delete payload.password;
        await updateAccount(payload);
        message.success('Cập nhật nhân viên thành công!');
      }
      handleCloseModal();
      loadData();
    } catch (err) {
      console.error('Submit Account Error:', err);
      const responseData = err.response?.data;
      let fieldErrorSet = false;

      // Handle ASP.NET Core / FluentValidation problem details object
      if (responseData?.errors && typeof responseData.errors === 'object') {
        const fieldsToSet = [];
        const unmappedMessages = [];

        Object.entries(responseData.errors).forEach(([fieldKey, messages]) => {
          const fieldName = fieldKey.charAt(0).toLowerCase() + fieldKey.slice(1);
          const rawErrorList = Array.isArray(messages) ? messages : [messages];
          // Filter out standard English validation error messages
          const errorTextList = rawErrorList.filter(
            (msg) => typeof msg === 'string' && !/^The\s+.*\s+field\b/i.test(msg) && !/field is required/i.test(msg)
          );

          if (errorTextList.length > 0) {
            if (['name', 'email', 'phone', 'password', 'gender', 'dateOfBirth', 'citizenIdCode', 'avatarImage'].includes(fieldName)) {
              fieldsToSet.push({ name: fieldName, errors: errorTextList });
              fieldErrorSet = true;
            } else {
              unmappedMessages.push(...errorTextList);
            }
          }
        });

        if (fieldsToSet.length > 0) {
          form.setFields(fieldsToSet);
        }
        if (unmappedMessages.length > 0) {
          unmappedMessages.forEach((msg) => message.error(msg));
        }
      }

      if (!fieldErrorSet) {
        const errorMsg = responseData?.message || (typeof responseData === 'string' ? responseData : null);
        if (errorMsg && errorMsg !== 'One or more validation errors occurred.') {
          message.error(errorMsg);
        } else if (!responseData?.errors) {
          message.error('Có lỗi xảy ra khi lưu thông tin nhân viên!');
        }
      }
    }
  };

  // Delete handler
  const handleDelete = async (id) => {
    try {
      await deleteAccount(id);
      message.success('Xóa nhân viên thành công!');
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi xóa nhân viên!';
      message.error(errorMsg);
    }
  };

  // Filter
  const effectiveBranchId = selectedBranch || (!isOwnerOrAdmin && currentBranchId ? Number(currentBranchId) : null);

  const filteredAccounts = accounts.filter((a) => {
    if (effectiveBranchId) {
      const activeContract = (a.contracts || []).find(
        (c) => c.status === 'Active' || c.status === 1 || (c.status || '').toLowerCase() === 'active'
      );
      const accBranchId = activeContract?.branchId || a.branchId;
      if (accBranchId && Number(accBranchId) !== Number(effectiveBranchId)) {
        return false;
      }
    }

    const search = searchText.toLowerCase();
    const matchText =
      (a.name || '').toLowerCase().includes(search) ||
      (a.email || '').toLowerCase().includes(search) ||
      (a.phone || '').toLowerCase().includes(search) ||
      (a.citizenIdCode || '').toLowerCase().includes(search);
    if (!matchText) return false;
    if (selectedRole && !(a.roleIds || []).includes(selectedRole)) return false;
    if (selectedStatus !== null && selectedStatus !== undefined && a.isActive !== selectedStatus) return false;
    if (selectedGender) {
      if (!a.gender) return false;
      const gLower = a.gender.toLowerCase();
      if (selectedGender === 'Nam' && gLower !== 'nam' && gLower !== 'male') return false;
      if (selectedGender === 'Nữ' && gLower !== 'nữ' && gLower !== 'nu' && gLower !== 'female') return false;
      if (selectedGender === 'Khác' && (gLower === 'nam' || gLower === 'male' || gLower === 'nữ' || gLower === 'nu' || gLower === 'female')) return false;
    }
    return true;
  });

  // Columns
  const columns = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_, record) => (
        <Tooltip title="Bấm để xem chi tiết nhân viên">
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => handleOpenDetailModal(record)}
          >
            <Avatar
              size={38}
              src={record.avatarImage || undefined}
              icon={!record.avatarImage ? <UserOutlined /> : undefined}
              style={{
                backgroundColor: record.avatarImage ? undefined : '#e8442a',
                flexShrink: 0,
              }}
            />
            <div>
              <strong style={{ color: '#e8442a', transition: 'color 0.2s' }}>{record.name}</strong>
            </div>
          </div>
        </Tooltip>
      ),
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => (
        <span>
          <MailOutlined style={{ marginRight: 6, color: '#8c8c8c' }} />
          {email}
        </span>
      ),
    },

    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      width: 100,
      align: 'center',
      render: (val) => {
        if (!val) return '—';
        const lower = val.toLowerCase();
        if (lower === 'male' || lower === 'nam') return 'Nam';
        if (lower === 'female' || lower === 'nữ' || lower === 'nu') return 'Nữ';
        return val;
      }
    },

    {
      title: 'Vai trò',
      dataIndex: 'roleIds',
      key: 'roleIds',
      width: 140,
      sorter: (a, b) => {
        const roleA = a.roleIds && a.roleIds.length > 0 ? a.roleIds[0] : 99;
        const roleB = b.roleIds && b.roleIds.length > 0 ? b.roleIds[0] : 99;
        return roleA - roleB;
      },
      render: (roleIds) => (
        <Space size={4} wrap>
          {(roleIds || []).map((rid) => {
            const info = ROLES_MAP[rid] || { label: `Role #${rid}`, color: 'default' };
            return <Tag key={rid} color={info.color}>{info.label}</Tag>;
          })}
          {(!roleIds || roleIds.length === 0) && <span style={{ color: '#bfbfbf' }}>—</span>}
        </Space>
      ),
    },
    ...(isOwnerOrAdmin
      ? [
          {
            title: 'Chi nhánh',
            key: 'branch',
            width: 170,
            render: (_, record) => {
              const activeContract = record.contracts?.find((c) => c.status === 'Active' || c.status === 1);
              const branchId = activeContract?.branchId || record.branchId;
              const branch = branches.find((b) => b.id === branchId);
              const fullName = branch ? branch.name : branchId ? `Chi nhánh #${branchId}` : '—';
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
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      align: 'center',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Hoạt động' : 'Vô hiệu'}
        </Tag>
      ),
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
          <Tooltip title="Xóa nhân viên">
            <Popconfirm
              title="Bạn chắc chắn muốn xóa nhân viên này?"
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
    <div className="accounts-page animate-fade-in" style={{ padding: '4px 0' }}>
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
              <TeamOutlined />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#e8442a', fontWeight: 700 }}>
                {titleText}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                {subtitleText}
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
            {buttonText}
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="Tìm kiếm theo tên, email, SĐT, CCCD..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 320, borderRadius: '8px' }}
          />

          <Select
            placeholder="Lọc theo giới tính"
            style={{ width: 160 }}
            allowClear
            value={selectedGender}
            onChange={(val) => setSelectedGender(val)}
          >
            {GENDER_OPTIONS.map((g) => (
              <Select.Option key={g.value} value={g.value}>
                {g.label}
              </Select.Option>
            ))}
          </Select>

          <Select
            placeholder="Lọc theo trạng thái"
            style={{ width: 160 }}
            allowClear
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
          >
            <Select.Option value={true}>Hoạt động</Select.Option>
            <Select.Option value={false}>Vô hiệu</Select.Option>
          </Select>

          {isOwnerOrAdmin ? (
            <Select
              placeholder="Lọc theo chi nhánh"
              style={{ width: 180 }}
              allowClear
              value={selectedBranch}
              onChange={(val) => setSelectedBranch(val)}
            >
              {branches.map((b) => (
                <Select.Option key={b.id} value={b.id}>
                  <Tooltip title={b.name}>
                    <span style={{ display: 'inline-block', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      {b.name}
                    </span>
                  </Tooltip>
                </Select.Option>
              ))}
            </Select>
          ) : (
            <Select
              placeholder="Lọc theo vai trò"
              style={{ width: 160 }}
              allowClear
              value={selectedRole}
              onChange={(val) => setSelectedRole(val)}
            >
              {Object.entries(STAFF_ROLES_MAP).map(([id, info]) => (
                <Select.Option key={id} value={Number(id)}>
                  {info.label}
                </Select.Option>
              ))}
            </Select>
          )}

          {(searchText || selectedRole || selectedStatus !== null || selectedGender || selectedBranch) && (
            <Button
              type="link"
              danger
              onClick={() => {
                setSearchText('');
                setSelectedRole(null);
                setSelectedStatus(null);
                setSelectedGender(null);
                setSelectedBranch(null);
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredAccounts}
          rowKey="id"
          loading={loading}
          pagination={{ defaultPageSize: 10, pageSizeOptions: ['5', '10', '25'], showSizeChanger: true }}
          scroll={{ x: 'max-content' }}
          bordered
        />
      </Card>

      {/* Modal */}
      <Modal
        maskClosable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: '#e8442a' }}>
            <TeamOutlined />
            <span>{modalType === 'create' ? 'THÊM NHÂN VIÊN MỚI' : 'CẬP NHẬT THÔNG TIN NHÂN VIÊN'}</span>
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
          style: { borderRadius: '6px' },
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          {/* Row 1: Name & Email */}
          <Space style={{ display: 'flex', width: '100%' }} size="large" align="start">
            <Form.Item
              name="name"
              label="Họ và tên"
              rules={[
                { required: true, message: 'Vui lòng nhập họ tên!' },
                { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự!' },
                { max: 100, message: 'Họ tên không được vượt quá 100 ký tự!' },
                {
                  pattern: /^[a-zA-ZàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ\s]+$/,
                  message: 'Họ tên chỉ được chứa chữ cái và khoảng trắng!',
                },
              ]}
              style={{ width: 330 }}
            >
              <Input prefix={<UserOutlined />} placeholder="Nhập họ và tên..." />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email!' },
                { type: 'email', message: 'Email không hợp lệ!' },
              ]}
              style={{ width: 330 }}
            >
              <Input prefix={<MailOutlined />} placeholder="Nhập email..." />
            </Form.Item>
          </Space>

          {/* Row 2: Phone & Password */}
          <Space style={{ display: 'flex', width: '100%' }} size="large" align="start">
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
              style={{ width: 330 }}
            >
              <Input prefix={<PhoneOutlined />} placeholder="Nhập SĐT..." />
            </Form.Item>

            {modalType === 'create' && (
              <Form.Item
                name="password"
                label="Mật khẩu"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                style={{ width: 330 }}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu..." />
              </Form.Item>
            )}

            {modalType === 'edit' && (
              <Form.Item
                name="isActive"
                label="Trạng thái hoạt động"
                valuePropName="checked"
                style={{ width: 330 }}
              >
                <Switch
                  checkedChildren="Hoạt động"
                  unCheckedChildren="Vô hiệu"
                />
              </Form.Item>
            )}
          </Space>

          {/* Row 3: Gender & Date of Birth */}
          <Space style={{ display: 'flex', width: '100%' }} size="large" align="start">
            <Form.Item
              name="gender"
              label="Giới tính"
              style={{ width: 330 }}
            >
              <Select placeholder="Chọn giới tính...">
                {GENDER_OPTIONS.map((g) => (
                  <Select.Option key={g.value} value={g.value}>
                    {g.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="dateOfBirth"
              label="Ngày sinh"
              rules={[{ required: true, message: 'Vui lòng chọn ngày sinh!' }]}
              style={{ width: 330 }}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
            </Form.Item>
          </Space>

          {/* Row 4: CCCD & Avatar */}
          <Space style={{ display: 'flex', width: '100%' }} size="large" align="start">
            <Form.Item
              name="citizenIdCode"
              label="Số CMND/CCCD"
              rules={[
                { required: true, message: 'Vui lòng nhập số CMND/CCCD!' },
                { pattern: /^\d{12}$/, message: 'Số CMND/CCCD phải bao gồm đúng 12 chữ số!' },
              ]}
              style={{ width: 330 }}
            >
              <Input placeholder="Nhập số CMND/CCCD..." />
            </Form.Item>

            <Form.Item
              name="avatarImage"
              label="Ảnh đại diện"
              rules={[{ required: true, message: 'Vui lòng chọn ảnh đại diện!' }]}
              style={{ width: 330 }}
            >
              <Input style={{ display: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <Avatar
                  size={46}
                  src={avatarImageValue || undefined}
                  icon={!avatarImageValue ? <UserOutlined /> : undefined}
                  style={{ backgroundColor: avatarImageValue ? undefined : '#e8442a', flexShrink: 0, border: '1px solid #d9d9d9' }}
                />
                <Upload
                  name="avatarFile"
                  showUploadList={false}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  beforeUpload={beforeAvatarUpload}
                  customRequest={handleAvatarUpload}
                >
                  <Button
                    icon={uploadingAvatar ? <LoadingOutlined /> : <UploadOutlined />}
                    loading={uploadingAvatar}
                    style={{ borderRadius: '6px' }}
                  >
                    {avatarImageValue ? 'Thay đổi ảnh' : 'Chọn ảnh JPG/PNG'}
                  </Button>
                </Upload>
              </div>
              {avatarImageValue && (
                <div style={{ fontSize: '12px', color: '#52c41a', marginTop: 4 }}>
                  ✓ Đã chọn ảnh đại diện
                </div>
              )}
            </Form.Item>
          </Space>

          {/* Switch for Create mode */}
          {modalType === 'create' && (
            <Form.Item
              name="isActive"
              label="Trạng thái hoạt động"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="Hoạt động"
                unCheckedChildren="Vô hiệu"
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Employee Detail Modal */}
      <AccountDetailModal
        open={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        account={detailRecord}
        branches={branches}
        onEdit={(rec) => handleOpenModal('edit', rec)}
      />
    </div>
  );
};

export default AccountPage;
