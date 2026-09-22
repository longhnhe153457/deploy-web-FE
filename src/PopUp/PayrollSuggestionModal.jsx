import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Radio,
  Checkbox,
  Button,
  Tabs,
  Table,
  Tag,
  Space,
  Alert,
  message,
  Typography,
  Divider,
  Row,
  Col,
  Popconfirm,
} from 'antd';
import {
  FileTextOutlined,
  HistoryOutlined,
  PlusCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  createPayrollSuggestion,
  getPayrollSuggestions,
  updatePayrollSuggestion,
  deletePayrollSuggestion,
} from '../api/payrollApi';
import { getMyContracts } from '../api/contractApi';

const { Text, Title } = Typography;

const SUGGESTION_TYPES = [
  { value: 1, label: '➕ Phụ cấp / Cộng bù công', type: 'Allowance' },
  { value: 3, label: '🎁 Tiền thưởng / Thưởng nóng', type: 'Bonus' },
  { value: 2, label: '➖ Khấu trừ / Giảm trừ', type: 'Deduction' },
  { value: 4, label: '⚠️ Phạt vi phạm / Tiền phạt', type: 'Penalty' },
];

const STATUS_TAGS = {
  Pending: { color: 'warning', label: '⏳ Chờ duyệt', icon: <ClockCircleOutlined /> },
  Approved: { color: 'success', label: '✅ Đã duyệt', icon: <CheckCircleOutlined /> },
  Rejected: { color: 'error', label: '🚫 Từ chối', icon: <CloseCircleOutlined /> },
  1: { color: 'warning', label: '⏳ Chờ duyệt', icon: <ClockCircleOutlined /> },
  2: { color: 'success', label: '✅ Đã duyệt', icon: <CheckCircleOutlined /> },
  3: { color: 'error', label: '🚫 Từ chối', icon: <CloseCircleOutlined /> },
};

const PayrollSuggestionModal = ({
  open,
  onClose,
  branchId,
  accountId,
  month,
  year,
  selectedPayroll,
  defaultTab = 'history',
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [contractInfo, setContractInfo] = useState(null);
  const [form] = Form.useForm();

  // Fetch active employee contract when modal opens
  useEffect(() => {
    if (open) {
      getMyContracts()
        .then((res) => {
          if (res.data && res.data.length > 0) {
            const active = res.data.find((c) => c.status === 'Active') || res.data[0];
            setContractInfo(active);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [open]);

  // Determine salary type & rates directly from contract / payroll
  const isHourlySalary = React.useMemo(() => {
    if (contractInfo) {
      return contractInfo.salaryType === 'Hourly' || contractInfo.salaryType === 2;
    }
    if (selectedPayroll) {
      return selectedPayroll.salaryType === 'Hourly' || selectedPayroll.salaryType === 2;
    }
    return false;
  }, [contractInfo, selectedPayroll]);

  const contractHourlyRate = React.useMemo(() => {
    if (contractInfo && (contractInfo.salaryType === 'Hourly' || contractInfo.salaryType === 2)) {
      return contractInfo.baseSalary || 25000;
    }
    if (selectedPayroll && (selectedPayroll.salaryType === 'Hourly' || selectedPayroll.salaryType === 2)) {
      return selectedPayroll.baseSalary || 25000;
    }
    // Salaried fallback
    const base = contractInfo?.baseSalary || selectedPayroll?.baseSalary || 5000000;
    const stdDays = contractInfo?.standardWorkDays || selectedPayroll?.standardWorkDays || 26;
    return Math.round(base / stdDays / 8);
  }, [contractInfo, selectedPayroll]);

  const contractMonthlyRate = React.useMemo(() => {
    return contractInfo?.baseSalary || selectedPayroll?.baseSalary || 5000000;
  }, [contractInfo, selectedPayroll]);

  const standardWorkDays = React.useMemo(() => {
    return contractInfo?.standardWorkDays || selectedPayroll?.standardWorkDays || 26;
  }, [contractInfo, selectedPayroll]);

  // Auto-Calculator inputs & conversion formula
  const [calcQuantity, setCalcQuantity] = useState(null);

  const calculatedTotal = React.useMemo(() => {
    if (!calcQuantity || calcQuantity <= 0) return 0;
    if (isHourlySalary) {
      return Math.round(calcQuantity * contractHourlyRate);
    } else {
      return Math.round((calcQuantity * contractMonthlyRate) / standardWorkDays);
    }
  }, [calcQuantity, isHourlySalary, contractHourlyRate, contractMonthlyRate, standardWorkDays]);

  const handleApplyCalculatedAmount = () => {
    if (calculatedTotal <= 0) {
      message.warning('Vui lòng nhập số lượng giờ/ngày công làm thiếu hợp lệ!');
      return;
    }
    form.setFieldsValue({ amount: calculatedTotal });
    message.success(`⚡ Đã quy đổi ${calcQuantity} ${isHourlySalary ? 'giờ' : 'ngày công'} = ${calculatedTotal.toLocaleString()} đ và điền vào ô Số tiền đề xuất!`);
  };

  const [filterMonth, setFilterMonth] = useState(month || dayjs().month() + 1);
  const [filterYear, setFilterYear] = useState(year || dayjs().year());

  useEffect(() => {
    if (open) {
      const targetTab = defaultTab === 'create' || defaultTab === 'new' ? 'create' : 'history';
      setActiveTab(targetTab);
      setEditingId(null);
      if (month) setFilterMonth(month);
      if (year) setFilterYear(year);
      form.resetFields();
    }
  }, [open, defaultTab, month, year, form]);

  const fetchSuggestions = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await getPayrollSuggestions({
        branchId,
        accountId,
        month: filterMonth === 'ALL' ? undefined : filterMonth,
        year: filterYear,
      });
      setSuggestions(res.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải lịch sử kiến nghị bảng lương!');
    } finally {
      setLoading(false);
    }
  }, [open, branchId, accountId, filterMonth, filterYear]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleStartEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      title: record.title,
      type: record.type,
      amount: record.amount,
      reason: record.reason,
      applyOption: record.applyOption || 'NextMonth',
      isResigned: !!record.isResigned,
    });
    setActiveTab('create');
  };

  const handleDelete = async (id) => {
    try {
      await deletePayrollSuggestion(id);
      message.success('Xóa kiến nghị thành công!');
      fetchSuggestions();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể xóa kiến nghị này');
    }
  };

  const handleSubmit = async (values) => {
    if (!branchId || !accountId) {
      message.error('Thiếu thông tin chi nhánh hoặc tài khoản!');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await updatePayrollSuggestion(editingId, {
          title: values.title,
          type: values.type,
          amount: values.amount,
          reason: values.reason,
          applyOption: values.applyOption,
          isResigned: !!values.isResigned,
        });
        message.success('Cập nhật kiến nghị thành công!');
      } else {
        await createPayrollSuggestion({
          branchId,
          accountId,
          month: month || dayjs().month() + 1,
          year: year || dayjs().year(),
          title: values.title,
          type: values.type,
          amount: values.amount,
          reason: values.reason,
          applyOption: values.applyOption || 'NextMonth',
          isResigned: !!values.isResigned,
        });
        message.success('Gửi kiến nghị bảng lương thành công!');
      }
      form.resetFields();
      setEditingId(null);
      setActiveTab('history');
      fetchSuggestions();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Gửi kiến nghị thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Tiêu đề kiến nghị',
      dataIndex: 'title',
      key: 'title',
      width: 180,
      render: (text, r) => (
        <div>
          <strong style={{ color: '#1890ff' }}>{text}</strong>
          {r.isResigned && (
            <div>
              <Tag color="red" style={{ fontSize: 10, marginTop: 2 }}>
                ⚠️ Nhân sự nghỉ việc
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Loại điều chỉnh',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type) => {
        const found = SUGGESTION_TYPES.find((t) => t.value === type || t.type === type);
        return <Tag color={type === 1 || type === 'Allowance' || type === 3 || type === 'Bonus' ? 'green' : 'orange'}>{found?.label || type}</Tag>;
      },
    },
    {
      title: 'Số tiền đề xuất',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right',
      render: (val) => <strong style={{ color: '#d97706' }}>{val ? `${val.toLocaleString()} đ` : '0 đ'}</strong>,
    },
    {
      title: 'Giải trình / Lý do',
      dataIndex: 'reason',
      key: 'reason',
      width: 220,
      render: (text) => <span style={{ color: '#595959', fontSize: 13 }}>{text || '-'}</span>,
    },
    {
      title: 'Kỳ áp dụng',
      key: 'period',
      width: 120,
      render: (_, r) => (
        <div>
          <div>Tháng {r.month}/{r.year}</div>
          <span style={{ fontSize: 11, color: '#8c8c8c' }}>
            {r.applyOption === 'CurrentMonth' || r.isResigned ? 'Áp dụng tháng này' : 'Áp dụng tháng sau'}
          </span>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (st, r) => {
        const conf = STATUS_TAGS[st] || { color: 'default', label: st };
        return (
          <div>
            <Tag color={conf.color} icon={conf.icon}>
              {conf.label}
            </Tag>
            {r.managerNote && (
              <div style={{ fontSize: 11, color: '#8c8c8c', fontStyle: 'italic', marginTop: 2 }}>
                Ghi chú: {r.managerNote}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, r) => {
        const isPending = r.status === 'Pending' || r.status === 1;
        if (!isPending) return <span style={{ color: '#bfbfbf' }}>-</span>;
        return (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: '#fa8c16' }} />}
              onClick={() => handleStartEdit(r)}
            />
            <Popconfirm
              title="Bạn chắc chắn muốn xóa kiến nghị này?"
              onConfirm={() => handleDelete(r.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <span style={{ fontSize: 17, fontWeight: 700 }}>Kiến Nghị Bảng Lương Nhân Viên</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => {
          setActiveTab(k);
          if (k === 'new' && !editingId) {
            form.resetFields();
          }
        }}
        items={[
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined /> Lịch sử kiến nghị ({suggestions.length})
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '8px 12px', background: '#fafafa', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                  <Space>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#595959' }}>Lọc theo tháng:</span>
                    <Select
                      value={filterMonth}
                      onChange={setFilterMonth}
                      style={{ width: 150 }}
                      options={[
                        { value: 'ALL', label: '🌐 Tất cả tháng' },
                        ...Array.from({ length: 12 }, (_, i) => ({
                          value: i + 1,
                          label: `Tháng ${i + 1}/${filterYear}`,
                        })),
                      ]}
                    />
                  </Space>
                  <Button type="default" size="small" onClick={fetchSuggestions} loading={loading}>
                    Tải lại
                  </Button>
                </div>
                <Table
                  columns={columns}
                  dataSource={suggestions}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    defaultPageSize: 5,
                    pageSizeOptions: ['5', '10', '25'],
                    showSizeChanger: true,
                  }}
                  size="small"
                  bordered
                  locale={{ emptyText: 'Chưa có kiến nghị nào trong kỳ lương này' }}
                />
              </div>
            ),
          },
          {
            key: 'create',
            label: (
              <span>
                <PlusCircleOutlined /> {editingId ? 'Chỉnh sửa kiến nghị' : 'Tạo kiến nghị mới'}
              </span>
            ),
            children: (
              <div>
                <Alert
                  message={editingId ? 'Đang chỉnh sửa kiến nghị chờ duyệt' : 'Gửi kiến nghị sai sót lương, thiếu công hoặc thưởng cho Quản lý'}
                  description="Quản lý chi nhánh sẽ xem xét giải trình và duyệt cộng/trừ bổ sung vào bảng lương chính thức."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  initialValues={{
                    type: 1,
                    applyOption: 'NextMonth',
                    isResigned: false,
                  }}
                >
                  <Row gutter={16}>
                    <Col span={14}>
                      <Form.Item
                        name="title"
                        label="Tiêu đề kiến nghị"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề kiến nghị!' }]}
                      >
                        <Input placeholder="Ví dụ: Thiếu công ca sáng ngày 05/09, Thưởng ca đêm..." />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item
                        name="type"
                        label="Loại điều chỉnh"
                        rules={[{ required: true, message: 'Vui lòng chọn loại điều chỉnh!' }]}
                      >
                        <Select options={SUGGESTION_TYPES} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="amount"
                        label="Số tiền đề xuất (VND)"
                        rules={[{ required: true, message: 'Vui lòng nhập số tiền đề xuất!' }]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          addonAfter="đ"
                          formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                          parser={(val) => (val ? val.replace(/\$\s?|(,*)/g, '') : '')}
                          min={1}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="applyOption" label="Kỳ lương dự kiến áp dụng">
                        <Radio.Group>
                          <Radio value="NextMonth">Tính vào Tháng Sau</Radio>
                          <Radio value="CurrentMonth">Tính vào Tháng Này</Radio>
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                  </Row>


                  {/* Auto-Calculator Card (Placed BEFORE Reason) */}
                  <Card
                    size="small"
                    style={{
                      background: 'linear-gradient(135deg, #f6ffed 0%, #e6f7ff 100%)',
                      borderRadius: '8px',
                      border: '1px solid #b7eb8f',
                      marginBottom: 16,
                    }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#276749' }}>
                          ⚡ Tự động quy đổi ngày công ra tiền (Lấy từ hợp đồng)
                        </span>
                        <Tag color={isHourlySalary ? 'blue' : 'green'} style={{ fontWeight: 600 }}>
                          {isHourlySalary
                            ? `Lương hợp đồng: ${contractHourlyRate.toLocaleString()} đ/giờ`
                            : `Lương hợp đồng: ${contractMonthlyRate.toLocaleString()} đ/tháng (${standardWorkDays} ngày công)`}
                        </Tag>
                      </div>

                      <Row gutter={12} align="middle">
                        <Col span={14}>
                          <div style={{ fontSize: 11, color: '#595959', marginBottom: 2 }}>
                            {isHourlySalary
                              ? 'Nhập số giờ làm bị thiếu (h):'
                              : `Nhập số ngày công làm thiếu (ví dụ: 1 công, 0.5 ca):`}
                          </div>
                          <InputNumber
                            placeholder={isHourlySalary ? 'Ví dụ: 4.5 giờ' : 'Ví dụ: 1 ngày công'}
                            style={{ width: '100%' }}
                            value={calcQuantity}
                            onChange={setCalcQuantity}
                            min={0.1}
                            step={isHourlySalary ? 0.5 : 0.5}
                          />
                        </Col>
                        <Col span={10} style={{ textAlign: 'right' }}>
                          <Button
                            type="primary"
                            style={{ background: '#52c41a', borderColor: '#52c41a', width: '100%', marginTop: 16 }}
                            onClick={handleApplyCalculatedAmount}
                          >
                            ⚡ Quy đổi & Điền tiền
                          </Button>
                        </Col>
                      </Row>

                      {calculatedTotal > 0 && (
                        <div
                          style={{
                            fontSize: 12,
                            color: '#276749',
                            fontWeight: 600,
                            background: '#ffffff',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px dashed #b7eb8f',
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>
                            💡 Quy đổi: {calcQuantity} {isHourlySalary ? 'giờ' : 'ngày công'}{' '}
                            {isHourlySalary
                              ? `× ${contractHourlyRate.toLocaleString()} đ`
                              : `× (${contractMonthlyRate.toLocaleString()} đ ÷ ${standardWorkDays} công)`}
                          </span>
                          <span style={{ fontSize: 13, color: '#389e0d', fontWeight: 700 }}>
                            = <strong>{calculatedTotal.toLocaleString()} đ</strong>
                          </span>
                        </div>
                      )}
                    </Space>
                  </Card>

                  <Form.Item
                    name="reason"
                    label="Giải trình / Lý do chi tiết"
                    rules={[{ required: true, message: 'Vui lòng điền nội dung giải trình chi tiết!' }]}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Mô tả rõ lý do, ngày giờ xảy ra sai sót, số giờ làm thiếu để Quản lý dễ kiểm tra..."
                    />
                  </Form.Item>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <Button onClick={() => setActiveTab('history')}>Hủy</Button>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                      {editingId ? 'Cập nhật kiến nghị' : 'Gửi kiến nghị'}
                    </Button>
                  </div>
                </Form>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default PayrollSuggestionModal;
