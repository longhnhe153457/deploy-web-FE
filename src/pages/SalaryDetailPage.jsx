import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Card,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Descriptions,
  Badge,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  DollarCircleOutlined,
  EyeOutlined,
  UserOutlined,
  FileTextOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
  BankOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  getSalaryDetails,
  getSalaryDetailById,
  createSalaryDetail,
  updateSalaryDetail,
  deleteSalaryDetail,
} from '../api/salaryDetailApi';
import { getPayrolls } from '../api/payrollApi';
import { getRoleRange } from '../api/accountApi';
import { useAuth } from '../context/AuthContext';

// Adjustment Type Enum Config
export const ADJUSTMENT_TYPES = {
  Allowance: 1,
  Bonus: 2,
  Deduction: 3,
  Penalty: 4,
};

const TYPE_CONFIG = {
  [ADJUSTMENT_TYPES.Allowance]: {
    label: 'Phụ cấp (+)',
    color: 'green',
    icon: <PlusCircleOutlined />,
    isAddition: true,
  },
  [ADJUSTMENT_TYPES.Bonus]: {
    label: 'Tiền thưởng (+)',
    color: 'purple',
    icon: <TrophyOutlined />,
    isAddition: true,
  },
  [ADJUSTMENT_TYPES.Deduction]: {
    label: 'Khấu trừ (-)',
    color: 'volcano',
    icon: <MinusCircleOutlined />,
    isAddition: false,
  },
  [ADJUSTMENT_TYPES.Penalty]: {
    label: 'Tiền phạt (-)',
    color: 'red',
    icon: <ExclamationCircleOutlined />,
    isAddition: false,
  },
};

const TYPE_OPTIONS = [
  { value: ADJUSTMENT_TYPES.Allowance, label: 'Phụ cấp (+)' },
  { value: ADJUSTMENT_TYPES.Bonus, label: 'Tiền thưởng (+)' },
  { value: ADJUSTMENT_TYPES.Deduction, label: 'Khấu trừ (-)' },
  { value: ADJUSTMENT_TYPES.Penalty, label: 'Tiền phạt (-)' },
];

const ROLES_MAP = {
  3: { label: 'Quản lý', color: 'purple' },
  4: { label: 'Thu ngân', color: 'blue' },
  5: { label: 'Bếp trưởng', color: 'orange' },
  6: { label: 'Phục vụ', color: 'green' },
};

const parseType = (val) => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    switch (val) {
      case 'Allowance':
        return ADJUSTMENT_TYPES.Allowance;
      case 'Bonus':
        return ADJUSTMENT_TYPES.Bonus;
      case 'Deduction':
        return ADJUSTMENT_TYPES.Deduction;
      case 'Penalty':
        return ADJUSTMENT_TYPES.Penalty;
      default:
        return Number(val) || ADJUSTMENT_TYPES.Allowance;
    }
  }
  return ADJUSTMENT_TYPES.Allowance;
};

const SalaryDetailPage = () => {
  const { user } = useAuth();
  const [salaryDetails, setSalaryDetails] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  // Role permissions
  const isOwner = user?.roleId === 1 || user?.roleId === 2;
  const isManager = user?.roleId === 3;
  const managerBranchId = user?.branchId;

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formModalType, setFormModalType] = useState('create'); // 'create' | 'edit'
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [form] = Form.useForm();

  // Currency Formatter
  const formatVND = (val) => {
    if (val === undefined || val === null) return '0 đ';
    return `${new Intl.NumberFormat('vi-VN').format(val)} đ`;
  };

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [detailsRes, payrollsRes, accountsRes] = await Promise.all([
        getSalaryDetails({
          payrollId: selectedPayroll || undefined,
          accountId: selectedAccount || undefined,
        }),
        getPayrolls(),
        getRoleRange(),
      ]);

      setSalaryDetails(detailsRes.data || []);
      setPayrolls(payrollsRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách chi tiết điều chỉnh lương!');
    } finally {
      setLoading(false);
    }
  }, [selectedPayroll, selectedAccount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Account & Payroll Name helpers
  const getAccountName = (id) => {
    const acc = accounts.find((a) => a.id === id);
    return acc ? acc.name : `Nhân viên #${id}`;
  };

  const getPayrollLabel = (payrollId) => {
    const pr = payrolls.find((p) => p.id === payrollId);
    if (pr) {
      const accName = pr.accountName || getAccountName(pr.accountId);
      return `${accName} (T${pr.Month || pr.month}/${pr.Year || pr.year})`;
    }
    return `Bảng lương #${payrollId}`;
  };

  // Allowed Accounts filtered by Role & Branch
  const allowedAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const roleIds = a.roleIds || (a.roles ? a.roles.map((r) => r.id) : []);
      const hasActiveContract = a.contracts && a.contracts.some((c) => c.status === 1 || c.status === 'Active');
      if (!hasActiveContract) return false;

      if (isOwner) {
        return roleIds.includes(3);
      }

      if (isManager) {
        const isStaff = roleIds.some((r) => [4, 5, 6].includes(r));
        if (!isStaff) return false;

        if (managerBranchId && a.branchId) {
          return a.branchId === managerBranchId;
        }
        if (managerBranchId && a.contracts) {
          return a.contracts.some(
            (c) => (c.status === 1 || c.status === 'Active') && c.branchId === managerBranchId
          );
        }
        return true;
      }

      return true;
    });
  }, [accounts, isOwner, isManager, managerBranchId]);

  // Filter payrolls to only include Draft status & role/branch permission
  const draftPayrolls = useMemo(() => {
    return payrolls.filter((p) => {
      const isDraft = p.status === 1 || p.status === 'Draft';
      if (!isDraft) return false;

      const acc = accounts.find((a) => a.id === p.accountId);
      const roleIds = acc?.roleIds || (acc?.roles ? acc.roles.map((r) => r.id) : []);

      if (isOwner) {
        return roleIds.length > 0 ? roleIds.includes(3) : true;
      }

      if (isManager) {
        if (managerBranchId && p.branchId && p.branchId !== managerBranchId) {
          return false;
        }
        if (roleIds.length > 0 && !roleIds.some((r) => [4, 5, 6].includes(r))) {
          return false;
        }
      }

      return true;
    });
  }, [payrolls, accounts, isOwner, isManager, managerBranchId]);

  // Group draft payrolls by role for cleaner dropdown UX
  const groupedDraftPayrolls = useMemo(() => {
    const groups = {
      3: { label: '👑 QUẢN LÝ', items: [] },
      4: { label: '💳 THU NGÂN', items: [] },
      5: { label: '👨‍🍳 BẾP TRƯỞNG', items: [] },
      6: { label: '🤵 PHỤC VỤ', items: [] },
      other: { label: '👤 NHÂN VIÊN KHÁC', items: [] },
    };

    draftPayrolls.forEach((p) => {
      const acc = accounts.find((a) => a.id === p.accountId);
      const primaryRoleId = acc?.roleIds && acc.roleIds.length > 0 ? acc.roleIds[0] : (acc?.roleId || 'other');
      if (groups[primaryRoleId]) {
        groups[primaryRoleId].items.push(p);
      } else {
        groups.other.items.push(p);
      }
    });

    return Object.entries(groups).filter(([_, grp]) => grp.items.length > 0);
  }, [draftPayrolls, accounts]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalAllowance = 0;
    let totalBonus = 0;
    let totalDeduction = 0;
    let totalPenalty = 0;

    salaryDetails.forEach((item) => {
      const typeNum = parseType(item.type);
      const amt = Number(item.amount) || 0;
      if (typeNum === ADJUSTMENT_TYPES.Allowance) totalAllowance += amt;
      else if (typeNum === ADJUSTMENT_TYPES.Bonus) totalBonus += amt;
      else if (typeNum === ADJUSTMENT_TYPES.Deduction) totalDeduction += amt;
      else if (typeNum === ADJUSTMENT_TYPES.Penalty) totalPenalty += amt;
    });

    return {
      totalAllowance,
      totalBonus,
      totalDeduction,
      totalPenalty,
      totalCount: salaryDetails.length,
    };
  }, [salaryDetails]);

  // Filter Table Data
  const filteredData = useMemo(() => {
    return salaryDetails.filter((item) => {
      const typeNum = parseType(item.type);

      if (selectedType && typeNum !== selectedType) return false;

      if (searchText) {
        const search = searchText.toLowerCase();
        const titleMatch = (item.title || '').toLowerCase().includes(search);
        const noteMatch = (item.note || '').toLowerCase().includes(search);
        const accNameMatch = (item.accountName || getAccountName(item.accountId))
          .toLowerCase()
          .includes(search);
        if (!titleMatch && !noteMatch && !accNameMatch) return false;
      }

      return true;
    });
  }, [salaryDetails, selectedType, searchText, accounts]);

  // Open Form Modal
  const handleOpenFormModal = (type, record = null) => {
    setFormModalType(type);
    setEditingRecord(record);
    setIsFormModalOpen(true);

    if (type === 'edit' && record) {
      const pr = payrolls.find((p) => p.id === record.payrollId);
      const accName = record.accountName || (pr ? pr.accountName : getAccountName(record.accountId));
      form.setFieldsValue({
        payrollId: record.payrollId,
        accountId: record.accountId,
        employeeNameDisplay: accName,
        title: record.title,
        type: parseType(record.type),
        amount: record.amount,
        note: record.note || '',
      });
    } else {
      form.resetFields();
      const firstPayrollId = selectedPayroll || (draftPayrolls[0]?.id ?? undefined);
      const pr = payrolls.find((p) => p.id === firstPayrollId);
      const accId = pr ? pr.accountId : (selectedAccount || allowedAccounts[0]?.id);
      const accName = pr ? (pr.accountName || getAccountName(pr.accountId)) : (accId ? getAccountName(accId) : '');

      form.setFieldsValue({
        payrollId: firstPayrollId,
        accountId: accId,
        employeeNameDisplay: accName,
        type: ADJUSTMENT_TYPES.Allowance,
        amount: 100000,
      });
    }
  };

  // Sync accountId when payrollId selected in Form
  const handlePayrollChangeInForm = (payrollId) => {
    const pr = payrolls.find((p) => p.id === payrollId);
    if (pr) {
      const accName = pr.accountName || getAccountName(pr.accountId);
      form.setFieldsValue({
        accountId: pr.accountId,
        employeeNameDisplay: accName,
      });
    }
  };

  // Submit Create/Edit
  const handleFormSubmit = async (values) => {
    setSubmitLoading(true);
    try {
      if (formModalType === 'create') {
        const payload = {
          payrollId: values.payrollId,
          accountId: values.accountId,
          title: values.title,
          type: values.type,
          amount: values.amount,
          note: values.note || '',
          createdBy: user?.id || 1,
        };
        await createSalaryDetail(payload);
        message.success('Thêm chi tiết điều chỉnh lương thành công!');
      } else {
        const payload = {
          id: editingRecord.id,
          title: values.title,
          type: values.type,
          amount: values.amount,
          note: values.note || '',
        };
        await updateSalaryDetail(payload);
        message.success('Cập nhật chi tiết điều chỉnh lương thành công!');
      }

      setIsFormModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dữ liệu!');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Open Detail View
  const handleOpenDetail = async (record) => {
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await getSalaryDetailById(record.id);
      setDetailRecord(res.data || record);
    } catch (err) {
      console.error(err);
      setDetailRecord(record);
    } finally {
      setDetailLoading(false);
    }
  };

  // Delete Detail
  const handleDelete = async (id) => {
    try {
      await deleteSalaryDetail(id);
      message.success('Xóa chi tiết điều chỉnh lương thành công!');
      loadData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể xóa chi tiết điều chỉnh lương!');
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'Mã',
      dataIndex: 'id',
      key: 'id',
      width: 75,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Nhân viên',
      dataIndex: 'accountId',
      key: 'accountId',
      render: (id, record) => (
        <Tooltip title="Bấm để xem chi tiết chi tiết lương">
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
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
              <UserOutlined style={{ marginRight: 4 }} />
              ID: {id}
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Kỳ lương',
      dataIndex: 'payrollId',
      key: 'payrollId',
      render: (payrollId) => {
        const pr = payrolls.find((p) => p.id === payrollId);
        if (pr) {
          return (
            <Tag color="blue" style={{ fontWeight: 600 }}>
              Tháng {(pr.Month || pr.month)}/{(pr.Year || pr.year)}
            </Tag>
          );
        }
        return (
          <Tag color="blue">
            #{payrollId}
          </Tag>
        );
      },
    },
    {
      title: 'Tiêu đề / Khoản mục',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1f2937' }}>{title}</div>
          {record.note && (
            <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
              {record.note}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Loại khoản',
      dataIndex: 'type',
      key: 'type',
      filters: TYPE_OPTIONS.map((t) => ({ text: t.label, value: t.value })),
      onFilter: (value, record) => parseType(record.type) === value,
      render: (typeVal) => {
        const tNum = parseType(typeVal);
        const conf = TYPE_CONFIG[tNum] || { label: 'Khác', color: 'default', icon: null };
        return (
          <Tag color={conf.color} icon={conf.icon} style={{ padding: '2px 8px', fontWeight: 500 }}>
            {conf.label}
          </Tag>
        );
      },
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a, b) => a.amount - b.amount,
      render: (val, record) => {
        const tNum = parseType(record.type);
        const conf = TYPE_CONFIG[tNum] || { isAddition: true };
        const prefix = conf.isAddition ? '+' : '-';
        const color = conf.isAddition ? '#3f8600' : '#cf1322';

        return (
          <strong style={{ fontSize: '15px', color }}>
            {prefix} {formatVND(val)}
          </strong>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Sửa chi tiết lương">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#fa8c16' }} />}
              onClick={() => handleOpenFormModal('edit', record)}
            />
          </Tooltip>

          <Tooltip title="Xóa khoản này">
            <Popconfirm
              title="Bạn chắc chắn muốn xóa khoản điều chỉnh lương này?"
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="salary-detail-page animate-fade-in" style={{ padding: '4px 0' }}>
      {/* Header Card */}
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
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#ffefed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e8442a',
                fontSize: 24,
              }}
            >
              <FileTextOutlined />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#e8442a', fontWeight: 700 }}>
                Quản Lý Chi Tiết Lương (Phụ Cấp & Khấu Trừ)
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                Quản lý các khoản phụ cấp, tiền thưởng, khấu trừ và tiền phạt riêng lẻ thuộc bảng lương
              </p>
            </div>
          </div>

          <Space wrap>
            <Button
              type="default"
              icon={<ReloadOutlined />}
              style={{ borderRadius: '8px' }}
              onClick={loadData}
              loading={loading}
            >
              Làm mới
            </Button>
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
              onClick={() => handleOpenFormModal('create')}
            >
              Thêm chi tiết mới
            </Button>
          </Space>
        </div>
      </Card>



      {/* Filter and Table Card */}
      <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="Tìm theo tiêu đề, ghi chú, nhân viên..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ maxWidth: 280, borderRadius: '8px' }}
          />

          <Select
            placeholder="Lọc theo bảng lương"
            style={{ width: 260 }}
            allowClear
            showSearch
            filterOption={(input, option) => {
              if (!input) return true;
              if (option?.children || option?.value === undefined) return true;
              const targetText = option?.searchValue || (typeof option?.label === 'string' ? option.label : '');
              return targetText.toLowerCase().includes(input.toLowerCase());
            }}
            optionLabelProp="label"
            dropdownStyle={{ maxHeight: 360 }}
            value={selectedPayroll}
            onChange={(val) => setSelectedPayroll(val)}
          >
            {groupedDraftPayrolls.map(([roleKey, group]) => (
              <Select.OptGroup
                key={roleKey}
                label={
                  <div style={{ color: '#e8442a', fontWeight: 700, fontSize: '12px', letterSpacing: '0.5px', padding: '2px 0' }}>
                    {group.label} ({group.items.length})
                  </div>
                }
              >
                {group.items.map((p) => {
                  const acc = accounts.find((a) => a.id === p.accountId);
                  const accName = p.accountName || (acc ? acc.name : getAccountName(p.accountId));
                  const primaryRoleId = acc?.roleIds && acc.roleIds.length > 0 ? acc.roleIds[0] : (acc?.roleId || 6);
                  const roleInfo = ROLES_MAP[primaryRoleId] || { label: 'Nhân viên', color: 'default' };
                  const periodStr = `Tháng ${p.Month || p.month}/${p.Year || p.year}`;
                  const searchValue = `${accName} ${p.accountId} ${periodStr} ${roleInfo.label}`;

                  return (
                    <Select.Option
                      key={p.id}
                      value={p.id}
                      label={`${accName} (${periodStr})`}
                      searchValue={searchValue}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar
                            size={28}
                            src={acc?.avatarImage || undefined}
                            icon={!acc?.avatarImage ? <UserOutlined /> : undefined}
                            style={{ backgroundColor: acc?.avatarImage ? undefined : '#e8442a', flexShrink: 0 }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937', lineHeight: '1.2' }}>
                              {accName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                              Kỳ: {periodStr} • Mã BL: #{p.id}
                            </div>
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

          <Select
            placeholder="Lọc theo nhân viên"
            style={{ width: 200 }}
            allowClear
            showSearch
            optionFilterProp="label"
            value={selectedAccount}
            onChange={(val) => setSelectedAccount(val)}
          >
            {allowedAccounts.map((a) => (
              <Select.Option key={a.id} value={a.id} label={a.name}>
                {a.name} (ID: {a.id})
              </Select.Option>
            ))}
          </Select>

          <Select
            placeholder="Loại điều chỉnh"
            style={{ width: 170 }}
            allowClear
            value={selectedType}
            onChange={(val) => setSelectedType(val)}
          >
            {TYPE_OPTIONS.map((t) => (
              <Select.Option key={t.value} value={t.value}>
                {t.label}
              </Select.Option>
            ))}
          </Select>

          {(searchText || selectedPayroll || selectedAccount || selectedType) && (
            <Button
              type="link"
              danger
              onClick={() => {
                setSearchText('');
                setSelectedPayroll(null);
                setSelectedAccount(null);
                setSelectedType(null);
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ defaultPageSize: 10, pageSizeOptions: ['5', '10', '25'], showSizeChanger: true }}
          scroll={{ x: 950 }}
          bordered
        />
      </Card>

      {/* ========================================================================= */}
      {/* Create / Edit Form Modal */}
      {/* ========================================================================= */}
      <Modal
        maskClosable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, color: '#e8442a' }}>
            <DollarCircleOutlined />
            <span>{formModalType === 'create' ? 'THÊM MỚI CHI TIẾT LƯƠNG' : 'CẬP NHẬT CHI TIẾT LƯƠNG'}</span>
          </div>
        }
        open={isFormModalOpen}
        onCancel={() => setIsFormModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitLoading}
        okText={formModalType === 'create' ? 'Tạo mới' : 'Cập nhật'}
        cancelText="Hủy bỏ"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #e8442a, #ff8c42)',
            border: 'none',
          },
        }}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: 16 }}>
          {formModalType === 'create' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="payrollId"
                  label="Bảng Lương Phụ Thuộc"
                  rules={[{ required: true, message: 'Vui lòng chọn bảng lương!' }]}
                >
                  <Select
                    placeholder="Chọn bảng lương..."
                    showSearch
                    filterOption={(input, option) =>
                      (option?.searchValue || option?.label || '').toLowerCase().includes(input.toLowerCase())
                    }
                    optionLabelProp="label"
                    dropdownStyle={{ maxHeight: 360 }}
                    onChange={handlePayrollChangeInForm}
                  >
                    {groupedDraftPayrolls.map(([roleKey, group]) => (
                      <Select.OptGroup
                        key={roleKey}
                        label={
                          <div style={{ color: '#e8442a', fontWeight: 700, fontSize: '12px', letterSpacing: '0.5px', padding: '2px 0' }}>
                            {group.label} ({group.items.length})
                          </div>
                        }
                      >
                        {group.items.map((p) => {
                          const acc = accounts.find((a) => a.id === p.accountId);
                          const accName = p.accountName || (acc ? acc.name : getAccountName(p.accountId));
                          const primaryRoleId = acc?.roleIds && acc.roleIds.length > 0 ? acc.roleIds[0] : (acc?.roleId || 6);
                          const roleInfo = ROLES_MAP[primaryRoleId] || { label: 'Nhân viên', color: 'default' };
                          const periodStr = `Tháng ${p.Month || p.month}/${p.Year || p.year}`;
                          const searchValue = `${accName} ${p.accountId} ${periodStr} ${roleInfo.label}`;

                          return (
                            <Select.Option
                              key={p.id}
                              value={p.id}
                              label={`${accName} (${periodStr})`}
                              searchValue={searchValue}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Avatar
                                    size={28}
                                    src={acc?.avatarImage || undefined}
                                    icon={!acc?.avatarImage ? <UserOutlined /> : undefined}
                                    style={{ backgroundColor: acc?.avatarImage ? undefined : '#e8442a', flexShrink: 0 }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937', lineHeight: '1.2' }}>
                                      {accName}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                      Kỳ: {periodStr} • Mã BL: #{p.id}
                                    </div>
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
              </Col>
              <Col span={12}>
                <Form.Item name="accountId" hidden rules={[{ required: true, message: 'Vui lòng chọn bảng lương!' }]}>
                  <Input />
                </Form.Item>
                <Form.Item
                  name="employeeNameDisplay"
                  label="Nhân Viên (Theo Bảng Lương)"
                >
                  <Input
                    disabled
                    placeholder="Tự động theo bảng lương"
                    style={{
                      color: '#111827',
                      fontWeight: 600,
                      backgroundColor: '#f3f4f6',
                      cursor: 'not-allowed',
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item
            name="title"
            label="Tiêu đề / Khoản mục"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề (VD: Phụ cấp ăn trưa, Phạt muộn...)' }]}
          >
            <Input placeholder="Ví dụ: Phụ cấp ăn trưa, Tiền thưởng doanh số, Phạt đi muộn..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Loại điều chỉnh"
                rules={[{ required: true, message: 'Vui lòng chọn loại điều chỉnh!' }]}
              >
                <Select placeholder="Chọn loại">
                  {TYPE_OPTIONS.map((t) => (
                    <Select.Option key={t.value} value={t.value}>
                      {t.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Số tiền (VND)"
                rules={[{ required: true, message: 'Vui lòng nhập số tiền lớn hơn 0!' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(val) => (val != null && val !== '' ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                  parser={(val) => (val ? val.replace(/\$\s?|(,*)/g, '') : '')}
                  min={0}
                  step={50000}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Ghi chú thêm">
            <Input.TextArea rows={3} placeholder="Ghi chú lý do hoặc chi tiết thêm..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* Detail View Modal */}
      {/* ========================================================================= */}
      <Modal
        maskClosable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e8442a' }}>
            <EyeOutlined />
            <span>CHI TIẾT KHOẢN ĐIỀU CHỈNH LƯƠNG #{detailRecord?.id}</span>
          </div>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={560}
      >
        {detailRecord && (
          <Descriptions bordered column={1} size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label="Mã khoản">{detailRecord.id}</Descriptions.Item>
            <Descriptions.Item label="Bảng Lương Phụ Thuộc">
              {getPayrollLabel(detailRecord.payrollId)}
            </Descriptions.Item>
            <Descriptions.Item label="Nhân viên">
              <strong>{detailRecord.accountName || getAccountName(detailRecord.accountId)}</strong> (ID: {detailRecord.accountId})
            </Descriptions.Item>
            <Descriptions.Item label="Tiêu đề khoản">{detailRecord.title}</Descriptions.Item>
            <Descriptions.Item label="Loại điều chỉnh">
              {(() => {
                const tNum = parseType(detailRecord.type);
                const conf = TYPE_CONFIG[tNum] || { label: 'Khác', color: 'default' };
                return <Tag color={conf.color}>{conf.label}</Tag>;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="Số tiền">
              {(() => {
                const tNum = parseType(detailRecord.type);
                const conf = TYPE_CONFIG[tNum] || { isAddition: true };
                const prefix = conf.isAddition ? '+' : '-';
                const color = conf.isAddition ? '#3f8600' : '#cf1322';
                return <span style={{ fontWeight: 700, fontSize: 16, color }}>{prefix} {formatVND(detailRecord.amount)}</span>;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="Ghi chú">{detailRecord.note || '—'}</Descriptions.Item>
            <Descriptions.Item label="Người tạo">
              {detailRecord.createdByName || (detailRecord.createdBy ? `Tài khoản #${detailRecord.createdBy}` : '—')}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian tạo">
              {detailRecord.createdAt ? new Date(detailRecord.createdAt).toLocaleString('vi-VN') : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default SalaryDetailPage;
