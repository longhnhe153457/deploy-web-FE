import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Input,
  Form,
  Popconfirm,
  message,
  Typography,
  Tooltip,
  Badge,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  FilterOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GiftOutlined,
  RiseOutlined,
  FallOutlined,
  WarningOutlined,
  UserOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getPayrollSuggestions,
  processPayrollSuggestion,
} from '../api/payrollApi';

const { Text } = Typography;

const TYPE_CONFIG = {
  Allowance: { label: 'Phụ cấp (+)', color: 'blue', icon: <GiftOutlined /> },
  Bonus: { label: 'Khen thưởng (+)', color: 'green', icon: <RiseOutlined /> },
  Deduction: { label: 'Khấu trừ (-)', color: 'orange', icon: <FallOutlined /> },
  Penalty: { label: 'Xử phạt (-)', color: 'magenta', icon: <WarningOutlined /> },
  1: { label: 'Phụ cấp (+)', color: 'blue', icon: <GiftOutlined /> },
  2: { label: 'Khen thưởng (+)', color: 'green', icon: <RiseOutlined /> },
  3: { label: 'Khấu trừ (-)', color: 'orange', icon: <FallOutlined /> },
  4: { label: 'Xử phạt (-)', color: 'magenta', icon: <WarningOutlined /> },
};

const STATUS_CONFIG = {
  Pending: { label: 'Chờ duyệt', color: 'warning', icon: <ClockCircleOutlined /> },
  Approved: { label: 'Đã duyệt', color: 'success', icon: <CheckCircleOutlined /> },
  Rejected: { label: 'Từ chối', color: 'error', icon: <CloseCircleOutlined /> },
  1: { label: 'Chờ duyệt', color: 'warning', icon: <ClockCircleOutlined /> },
  2: { label: 'Đã duyệt', color: 'success', icon: <CheckCircleOutlined /> },
  3: { label: 'Từ chối', color: 'error', icon: <CloseCircleOutlined /> },
};

const PayrollSuggestionManagerModal = ({
  open,
  onClose,
  branchId,
  branches = [],
  onProcessSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(branchId || null);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [filterYear, setFilterYear] = useState(dayjs().year());

  // Process Modal State
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [processAction, setProcessAction] = useState('Approved'); // 'Approved' | 'Rejected'
  const [submitting, setSubmitting] = useState(false);
  const [processForm] = Form.useForm();

  const fetchSuggestions = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await getPayrollSuggestions({
        branchId: selectedBranchId || undefined,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        month: filterMonth,
        year: filterYear,
      });
      setSuggestions(res.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách kiến nghị!');
    } finally {
      setLoading(false);
    }
  }, [open, selectedBranchId, selectedStatus, filterMonth, filterYear]);

  useEffect(() => {
    if (branchId) setSelectedBranchId(branchId);
  }, [branchId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const filteredSuggestions = React.useMemo(() => {
    if (!searchText.trim()) return suggestions;
    const term = searchText.trim().toLowerCase();
    return suggestions.filter((s) => {
      const name = (s.employeeName || '').toLowerCase();
      const code = (s.employeeCode || '').toLowerCase();
      const title = (s.title || '').toLowerCase();
      return name.includes(term) || code.includes(term) || title.includes(term);
    });
  }, [suggestions, searchText]);

  const handleOpenProcess = (record, action) => {
    setSelectedSuggestion(record);
    setProcessAction(action);
    processForm.setFieldsValue({
      managerNote: '',
      forceApplyOption: record.applyOption || 'NextMonth',
    });
    setProcessModalOpen(true);
  };

  const handleProcessSubmit = async (values) => {
    if (!selectedSuggestion) return;
    setSubmitting(true);
    try {
      await processPayrollSuggestion(selectedSuggestion.id, {
        status: processAction,
        managerNote: values.managerNote?.trim(),
        forceApplyOption: values.forceApplyOption,
      });

      const actionText = processAction === 'Approved' ? 'Duyệt' : 'Từ chối';
      message.success(`Đã ${actionText} kiến nghị #${selectedSuggestion.id} thành công!`);
      setProcessModalOpen(false);
      fetchSuggestions();
      if (onProcessSuccess) onProcessSuccess();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể xử lý kiến nghị!');
    } finally {
      setSubmitting(false);
    }
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `Tháng ${i + 1}`,
  }));

  const columns = [
    {
      title: 'Nhân viên',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 200,
      render: (name, record) => (
        <div>
          <Text strong style={{ color: '#1890ff', fontSize: '13px' }}>
            <UserOutlined /> {name || `Nhân viên #${record.accountId}`}
          </Text>
          {record.employeeCode && (
            <Tag style={{ marginLeft: '6px', fontSize: '11px' }}>{record.employeeCode}</Tag>
          )}
          <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
            Chi nhánh: {record.branchName || `CN #${record.branchId}`}
          </div>
        </div>
      ),
    },
    {
      title: 'Tiêu đề kiến nghị',
      dataIndex: 'title',
      key: 'title',
      width: 220,
      render: (title, record) => (
        <div>
          <Text strong style={{ fontSize: '13px', color: '#262626' }}>{title}</Text>
          <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '2px' }}>
            Tạo lúc: {dayjs(record.createdAt).format('HH:mm DD/MM/YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Giải trình / Lý do',
      dataIndex: 'reason',
      key: 'reason',
      width: 300,
      render: (reason) => (
        reason ? (
          <div style={{ fontSize: '12px', color: '#595959', fontStyle: 'italic', background: '#fafafa', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #1890ff' }}>
            "{reason}"
          </div>
        ) : (
          <Text type="secondary" style={{ fontSize: '12px' }}>Không có giải trình</Text>
        )
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type) => {
        const cfg = TYPE_CONFIG[type] || { label: type, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 140,
      render: (amt, record) => {
        const typeStr = String(record.type);
        const isNegative = typeStr === 'Deduction' || typeStr === 'Penalty' || typeStr === '3' || typeStr === '4';
        return (
          <Text strong style={{ color: isNegative ? '#ff4d4f' : '#52c41a', fontSize: '14px' }}>
            {isNegative ? '-' : '+'}{new Intl.NumberFormat('vi-VN').format(amt)} đ
          </Text>
        );
      },
    },
    {
      title: 'Áp dụng',
      dataIndex: 'applyOption',
      key: 'applyOption',
      width: 140,
      render: (opt, record) => {
        if (record.isResigned) {
          return <Tag color="volcano">Nghỉ việc ngay</Tag>;
        }
        return opt === 'CurrentMonth' ? (
          <Tag color="cyan">Tháng này ({record.month})</Tag>
        ) : (
          <Tag color="geekblue">Tháng sau ({record.month})</Tag>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (status, record) => {
        const cfg = STATUS_CONFIG[status] || { label: status, color: 'default' };
        return (
          <div>
            <Tag icon={cfg.icon} color={cfg.color}>
              {cfg.label}
            </Tag>
            {record.isApplied && (
              <Tag color="purple" style={{ marginTop: '4px' }}>
                Đã cộng vào phiếu lương
              </Tag>
            )}
            {record.managerNote && (
              <div style={{ fontSize: '11px', color: '#595959', marginTop: '4px', fontStyle: 'italic' }}>
                QL: "{record.managerNote}"
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 160,
      align: 'center',
      render: (_, record) => {
        const isPending = record.status === 'Pending' || record.status === 1;
        if (!isPending) {
          return (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Đã xử lý bởi {record.processorName || record.processedBy || 'Quản lý'}
            </Text>
          );
        }

        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleOpenProcess(record, 'Approved')}
              style={{ backgroundColor: '#52c41a' }}
            >
              Duyệt
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => handleOpenProcess(record, 'Rejected')}
            >
              Từ chối
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <SolutionOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Duyệt Kiến Nghị Bảng Lương Nhân Viên
            </span>
          </Space>
        }
        open={open}
        onCancel={onClose}
        footer={null}
        width={1300}
        destroyOnClose
      >
        {/* Filters bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
            padding: '12px 16px',
            background: '#fafafa',
            borderRadius: '8px',
            border: '1px solid #f0f0f0',
          }}
        >
          <Space size="middle" wrap>
            <Input
              placeholder="🔍 Tìm theo tên nhân viên..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: 220 }}
            />

            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: 140 }}
              options={[
                { value: 'ALL', label: '🌐 Tất cả' },
                { value: 'Pending', label: '⏳ Chờ duyệt' },
                { value: 'Approved', label: '✅ Đã duyệt' },
                { value: 'Rejected', label: '❌ Từ chối' },
              ]}
            />

            <Select
              value={filterMonth}
              onChange={setFilterMonth}
              options={monthOptions}
              style={{ width: 110 }}
            />
          </Space>

          <Button type="default" onClick={fetchSuggestions} loading={loading}>
            Tải lại
          </Button>
        </div>

        {/* Suggestions Table */}
        <Table
          columns={columns}
          dataSource={filteredSuggestions}
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 5,
            pageSizeOptions: ['5', '10', '25'],
            showSizeChanger: true,
          }}
          size="small"
          bordered
          locale={{ emptyText: 'Không tìm thấy kiến nghị lương nào phù hợp' }}
        />
      </Modal>

      {/* Process Modal */}
      <Modal
        title={
          processAction === 'Approved' ? (
            <Text type="success" strong style={{ fontSize: '16px' }}>
              <CheckCircleOutlined /> Duyệt Kiến Nghị Bảng Lương #{selectedSuggestion?.id}
            </Text>
          ) : (
            <Text type="danger" strong style={{ fontSize: '16px' }}>
              <CloseCircleOutlined /> Từ Chối Kiến Nghị Bảng Lương #{selectedSuggestion?.id}
            </Text>
          )
        }
        open={processModalOpen}
        onCancel={() => setProcessModalOpen(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        {selectedSuggestion && (
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
            <div>
              <Text type="secondary">Nhân viên: </Text>
              <Text strong>{selectedSuggestion.employeeName || selectedSuggestion.accountId}</Text>
            </div>
            <div>
              <Text type="secondary">Kiến nghị: </Text>
              <Text strong>{selectedSuggestion.title}</Text>
            </div>
            <div>
              <Text type="secondary">Số tiền: </Text>
              <Text strong style={{ color: '#52c41a' }}>
                {new Intl.NumberFormat('vi-VN').format(selectedSuggestion.amount)} đ
              </Text>
            </div>
          </div>
        )}

        <Form form={processForm} layout="vertical" onFinish={handleProcessSubmit}>
          {processAction === 'Approved' && (
            <Form.Item
              name="forceApplyOption"
              label="Phương án áp dụng tháng"
              help="Chọn tháng để tự động cộng/trừ số tiền này vào bảng lương."
            >
              <Select
                options={[
                  { value: 'NextMonth', label: '🗓️ Áp dụng vào bảng lương Tháng Sau' },
                  { value: 'CurrentMonth', label: '⚡ Áp dụng ngay vào bảng lương Tháng Hiện Tại' },
                ]}
              />
            </Form.Item>
          )}

          <Form.Item
            name="managerNote"
            label="Ghi chú của Quản lý (Giải thích cho nhân viên)"
            rules={[
              {
                required: processAction === 'Rejected',
                message: 'Vui lòng nhập lý do từ chối!',
              },
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder={
                processAction === 'Approved'
                  ? 'VD: Đã xác minh ca làm ngày 10/09, đồng ý bổ sung phụ cấp.'
                  : 'VD: Dữ liệu quẹt thẻ hợp lệ, không phát hiện thiếu công.'
              }
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => setProcessModalOpen(false)}>Hủy</Button>
            <Button
              type={processAction === 'Approved' ? 'primary' : 'primary'}
              danger={processAction === 'Rejected'}
              htmlType="submit"
              loading={submitting}
              style={processAction === 'Approved' ? { backgroundColor: '#52c41a' } : {}}
            >
              Xác nhận {processAction === 'Approved' ? 'Duyệt' : 'Từ chối'}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default PayrollSuggestionManagerModal;
