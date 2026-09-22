import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tag,
  Spin,
  Button,
  Select,
  Empty,
  Typography,
  Divider,
  Space,
  Row,
  Col,
  Table,
  Badge,
  Statistic,
  message,
  Alert,
} from 'antd';
import {
  DollarOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  RiseOutlined,
  FallOutlined,
  BankOutlined,
  UserOutlined,
  GiftOutlined,
  WarningOutlined,
  LockOutlined,
  DownOutlined,
  UpOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getMyPayrolls } from '../api/payrollApi';
import { useAuth } from '../context/AuthContext';
import PayrollSuggestionModal from '../PopUp/PayrollSuggestionModal';

const { Title, Text } = Typography;

const STATUS_CONFIG = {
  1: { label: 'Bản nháp', color: 'default', icon: <ClockCircleOutlined /> },
  2: { label: 'Chờ chốt', color: 'warning', icon: <ClockCircleOutlined /> },
  3: { label: 'Đã duyệt', color: 'processing', icon: <CheckCircleOutlined /> },
  4: { label: 'Đã thanh toán', color: 'success', icon: <CheckCircleOutlined /> },
  5: { label: 'Đã hủy', color: 'error', icon: <WarningOutlined /> },
  6: { label: 'Đã chốt', color: 'purple', icon: <LockOutlined /> },
  7: { label: 'Từ chối (Cần tính lại)', color: 'error', icon: <WarningOutlined /> },

  Draft: { label: 'Bản nháp', color: 'default', icon: <ClockCircleOutlined /> },
  Pending: { label: 'Chờ chốt', color: 'warning', icon: <ClockCircleOutlined /> },
  Approved: { label: 'Đã duyệt', color: 'processing', icon: <CheckCircleOutlined /> },
  Paid: { label: 'Đã thanh toán', color: 'success', icon: <CheckCircleOutlined /> },
  Cancelled: { label: 'Đã hủy', color: 'error', icon: <WarningOutlined /> },
  Locked: { label: 'Đã chốt', color: 'purple', icon: <LockOutlined /> },
  Rejected: { label: 'Từ chối (Cần tính lại)', color: 'error', icon: <WarningOutlined /> },
};

const SALARY_TYPE_LABELS = {
  Fixed: 'Lương cố định (Tháng)',
  Hourly: 'Lương theo giờ',
};

const TYPE_TAGS = {
  Allowance: { label: 'Phụ cấp', color: 'blue', icon: <GiftOutlined /> },
  Bonus: { label: 'Khen thưởng', color: 'green', icon: <RiseOutlined /> },
  Deduction: { label: 'Khấu trừ', color: 'orange', icon: <FallOutlined /> },
  Penalty: { label: 'Xử phạt', color: 'magenta', icon: <WarningOutlined /> },
};

const MyPayrollPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [payrolls, setPayrolls] = useState([]);
  const [selectedPayrollId, setSelectedPayrollId] = useState(null);
  const [showShiftTable, setShowShiftTable] = useState(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [suggestionModalTab, setSuggestionModalTab] = useState('history');

  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1);
  const [filterYear, setFilterYear] = useState(dayjs().year());

  const fetchMyPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyPayrolls({ month: filterMonth, year: filterYear });
      const rawData = res.data || [];
      const allowedStatuses = [2, 3, 4, 6, 'Pending', 'Approved', 'Paid', 'Locked'];
      const data = rawData.filter((p) => allowedStatuses.includes(p.status));
      setPayrolls(data);
      if (data.length > 0) {
        setSelectedPayrollId(data[0].id);
      } else {
        setSelectedPayrollId(null);
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải thông tin bảng lương của bạn!');
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => {
    fetchMyPayrolls();
  }, [fetchMyPayrolls]);

  const selectedPayroll = payrolls.find((p) => p.id === selectedPayrollId) || (payrolls.length > 0 ? payrolls[0] : null);

  // Month options (1-12)
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `Tháng ${i + 1}`,
  }));

  // Year options (current - 2 to current + 1)
  const currentY = dayjs().year();
  const yearOptions = [currentY - 1, currentY, currentY + 1].map((y) => ({
    value: y,
    label: `Năm ${y}`,
  }));

  const detailColumns = [
    {
      title: 'Khoản mục',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Phân loại',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const config = TYPE_TAGS[type] || { label: type, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val, record) => {
        const isNegative = record.type === 'Deduction' || record.type === 'Penalty';
        return (
          <Text strong style={{ color: isNegative ? '#ff4d4f' : '#52c41a' }}>
            {isNegative ? '-' : '+'}{new Intl.NumberFormat('vi-VN').format(val)} đ
          </Text>
        );
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (note) => note || '-',
    },
  ];

  return (
    <div className="my-payroll-page animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: '20px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined style={{ fontSize: '18px' }} />}
          onClick={() => navigate('/home')}
          style={{ position: 'absolute', left: 0 }}
        />
        <h2 style={{ width: '100%', textAlign: 'center', margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#000' }}>
          Phiếu Lương Của Tôi
        </h2>
        <Button
          type="text"
          icon={<ReloadOutlined style={{ fontSize: '16px' }} />}
          onClick={fetchMyPayrolls}
          loading={loading}
          style={{ position: 'absolute', right: 0 }}
        />
      </div>

      {/* Month / Year Filters */}
      <Card style={{ borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', flexWrap: 'wrap', gap: '16px' }}>
          <Space size="middle">
            <span style={{ fontWeight: '600' }}><CalendarOutlined /> Kỳ lương:</span>
            <Select
              value={filterMonth}
              onChange={setFilterMonth}
              options={monthOptions}
              style={{ width: 120 }}
            />
            <Select
              value={filterYear}
              onChange={setFilterYear}
              options={yearOptions}
              style={{ width: 110 }}
            />
          </Space>

          {payrolls.length > 1 && (
            <Space style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: '13px', color: '#8c8c8c' }}>Chọn phiếu lương:</span>
              <Select
                value={selectedPayrollId}
                onChange={setSelectedPayrollId}
                style={{ width: 220 }}
                options={payrolls.map((p) => ({
                  value: p.id,
                  label: `Bảng lương #${p.id} (${p.branchName || 'Chi nhánh'})`,
                }))}
              />
            </Space>
          )}

          <Space style={{ marginLeft: payrolls.length <= 1 ? 'auto' : 0 }}>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => {
                setSuggestionModalTab('history');
                setIsSuggestionModalOpen(true);
              }}
            >
              Lịch sử kiến nghị
            </Button>

            <Button
              type="primary"
              ghost
              icon={<QuestionCircleOutlined />}
              onClick={() => {
                setSuggestionModalTab('create');
                setIsSuggestionModalOpen(true);
              }}
            >
              Gửi kiến nghị / khiếu nại
            </Button>
          </Space>
        </div>
      </Card>

      <Spin spinning={loading}>
        {!selectedPayroll ? (
          <Card style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '12px' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text strong style={{ fontSize: '16px', color: '#595959' }}>
                    Chưa có dữ liệu bảng lương Tháng {filterMonth}/{filterYear}
                  </Text>
                  <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '6px' }}>
                    Bảng lương tháng này có thể chưa được chốt hoặc tạo bởi Quản lý.
                  </div>
                </div>
              }
            />
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Main Payslip Card */}
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #d9f7be',
                background: 'linear-gradient(135deg, #ffffff 0%, #f6ffed 100%)',
                boxShadow: '0 4px 16px rgba(82, 196, 26, 0.08)',
                overflow: 'hidden',
              }}
              bodyStyle={{ padding: '24px' }}
            >
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: '#e6f7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1890ff',
                      fontSize: '24px',
                    }}
                  >
                    <DollarOutlined />
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#262626' }}>
                      Phiếu Lương Tháng {selectedPayroll.month}/{selectedPayroll.year}
                    </div>
                    <Text type="secondary" style={{ fontSize: '13px' }}>
                      {selectedPayroll.branchName} • Mã phiếu: #{selectedPayroll.id}
                    </Text>
                  </div>
                </div>

                <div>
                  {STATUS_CONFIG[selectedPayroll.status] ? (
                    <Tag
                      icon={STATUS_CONFIG[selectedPayroll.status].icon}
                      color={STATUS_CONFIG[selectedPayroll.status].color}
                      style={{ padding: '4px 12px', fontSize: '14px', borderRadius: '20px', fontWeight: '600' }}
                    >
                      {STATUS_CONFIG[selectedPayroll.status].label}
                    </Tag>
                  ) : (
                    <Tag style={{ padding: '4px 12px', fontSize: '14px', borderRadius: '20px' }}>
                      {selectedPayroll.status}
                    </Tag>
                  )}
                </div>
              </div>

              {/* NET SALARY HIGHLIGHT */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '20px',
                  textAlign: 'center',
                  border: '1px solid #b7eb8f',
                  boxShadow: '0 2px 8px rgba(82, 196, 26, 0.12)',
                  marginBottom: '20px',
                }}
              >
                <Text type="secondary" style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                  THỰC LĨNH
                </Text>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a', margin: '6px 0' }}>
                  {new Intl.NumberFormat('vi-VN').format(selectedPayroll.netSalary)} đ
                </div>
                {selectedPayroll.paymentDate && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '4px' }} />
                    Ngày thanh toán: {dayjs(selectedPayroll.paymentDate).format('DD/MM/YYYY')}
                  </Text>
                )}
              </div>

              {/* Key Metrics Grid */}
              {(() => {
                const isManagerUser = user?.roleId === 3 || user?.role === 'Manager' || user?.role === 'Quản lý' || selectedPayroll?.roleId === 3 || selectedPayroll?.roleName === 'Manager' || selectedPayroll?.roleName === 'Quản lý';
                return (
                  <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
                    <Col xs={12} sm={isManagerUser ? 12 : 8}>
                      <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Lương cơ bản</Text>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#262626', marginTop: '2px' }}>
                          {new Intl.NumberFormat('vi-VN').format(selectedPayroll.baseSalary)} đ
                        </div>
                      </div>
                    </Col>

                    {!isManagerUser && (
                      <Col xs={12} sm={8}>
                        <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>Công / Giờ làm thực tế</Text>
                          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1890ff', marginTop: '2px' }}>
                            {selectedPayroll.salaryType === 'Hourly' || selectedPayroll.salaryType === 'Theo giờ' || selectedPayroll.salaryType === 'TheoGio'
                              ? `${selectedPayroll.actualWorkHours || 0} giờ làm`
                              : `${selectedPayroll.actualWorkDays} / ${selectedPayroll.baseWorkDays || 26} ngày (${selectedPayroll.actualWorkHours || 0}h)`}
                          </div>
                        </div>
                      </Col>
                    )}

                    <Col xs={12} sm={isManagerUser ? 12 : 8}>
                      <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{isManagerUser ? 'Lương theo hợp đồng' : 'Lương theo công'}</Text>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#262626', marginTop: '2px' }}>
                          {new Intl.NumberFormat('vi-VN').format(selectedPayroll.calculatedSalary)} đ
                        </div>
                      </div>
                    </Col>

                    <Col xs={12} sm={6}>
                      <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Tổng Phụ cấp</Text>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1890ff', marginTop: '2px' }}>
                          +{new Intl.NumberFormat('vi-VN').format(selectedPayroll.totalAllowance)} đ
                        </div>
                      </div>
                    </Col>

                    <Col xs={12} sm={6}>
                      <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Tổng Khen thưởng</Text>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#52c41a', marginTop: '2px' }}>
                          +{new Intl.NumberFormat('vi-VN').format(selectedPayroll.bonusAmount)} đ
                        </div>
                      </div>
                    </Col>

                    <Col xs={12} sm={6}>
                      <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Khấu trừ</Text>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fa8c16', marginTop: '2px' }}>
                          -{new Intl.NumberFormat('vi-VN').format(selectedPayroll.totalDeduction)} đ
                        </div>
                      </div>
                    </Col>

                    <Col xs={12} sm={6}>
                      <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Xử phạt</Text>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#ff4d4f', marginTop: '2px' }}>
                          -{new Intl.NumberFormat('vi-VN').format(selectedPayroll.penaltyAmount)} đ
                        </div>
                      </div>
                    </Col>
                  </Row>
                );
              })()}

              {/* Chi tiết ca làm việc trong tháng */}
              {(() => {
                const allShifts = selectedPayroll.payrollShiftDetails || selectedPayroll.shiftDetails || [];
                const completedShifts = allShifts.filter((s) => {
                  if (s.isCompleted === false) return false;
                  if (s.status) {
                    const st = String(s.status).toUpperCase();
                    if (st === 'ABSENT' || st === 'CANCELLED' || st === 'VẮNG MẶT' || st === 'ĐÃ HỦY') return false;
                  }
                  return (s.actualHours ?? s.regularHours ?? s.actualWorkHours ?? 0) > 0 || s.isNightShift || (s.approvedOTHours && s.approvedOTHours > 0);
                });

                if (completedShifts.length === 0) return null;

                return (
                  <div style={{ marginBottom: '20px' }}>
                    <Divider style={{ margin: '16px 0 12px 0' }}>
                      Tổng Hợp Theo Ca Làm Việc ({completedShifts.length} ca đã hoàn thành)
                    </Divider>
                    <Card size="small" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                      <Row gutter={[16, 12]} align="middle">
                        <Col xs={12} sm={6}>
                          <Statistic
                            title={<span style={{ fontSize: 12, color: '#595959' }}>Tiền ca gốc</span>}
                            value={selectedPayroll.totalBaseShiftPay ?? 0}
                            formatter={(val) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`}
                            valueStyle={{ fontSize: 14, fontWeight: 600, color: '#262626' }}
                          />
                        </Col>
                        <Col xs={12} sm={6}>
                          <Statistic
                            title={<span style={{ fontSize: 12, color: '#722ed1' }}>Phụ cấp ca đêm</span>}
                            value={selectedPayroll.totalNightPay ?? 0}
                            formatter={(val) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`}
                            valueStyle={{ fontSize: 14, fontWeight: 600, color: '#722ed1' }}
                          />
                        </Col>
                        <Col xs={12} sm={6}>
                          <Statistic
                            title={<span style={{ fontSize: 12, color: '#fa8c16' }}>Phụ cấp OT</span>}
                            value={selectedPayroll.totalOTPay ?? 0}
                            formatter={(val) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`}
                            valueStyle={{ fontSize: 14, fontWeight: 600, color: '#fa8c16' }}
                          />
                        </Col>
                        <Col xs={12} sm={6}>
                          <Statistic
                            title={<span style={{ fontSize: 12, color: '#ff4d4f' }}>Thưởng Lễ/Tết</span>}
                            value={selectedPayroll.totalHolidayBonus ?? 0}
                            formatter={(val) => `${new Intl.NumberFormat('vi-VN').format(val)} đ`}
                            valueStyle={{ fontSize: 14, fontWeight: 600, color: '#ff4d4f' }}
                          />
                        </Col>
                      </Row>
                      <div style={{ textAlign: 'center', marginTop: 12, paddingTop: 8, borderTop: '1px dashed #e8e8e8' }}>
                        <Button
                          type="default"
                          icon={showShiftTable ? <UpOutlined /> : <DownOutlined />}
                          onClick={() => setShowShiftTable(!showShiftTable)}
                          style={{ borderRadius: '6px' }}
                        >
                          {showShiftTable ? 'Ẩn chi tiết từng ca làm' : 'Xem chi tiết từng ca làm'}
                        </Button>
                      </div>
                    </Card>

                    {showShiftTable && (
                      <Table
                        style={{ marginTop: 12 }}
                        dataSource={completedShifts}
                        rowKey={(r, idx) => r.id || idx}
                        pagination={{ pageSize: 5 }}
                        size="small"
                        bordered
                        scroll={{ x: 650 }}
                        columns={[
                          {
                            title: 'Ngày làm',
                            dataIndex: 'workDate',
                            key: 'workDate',
                            width: 105,
                            render: (d) => dayjs(d).format('DD/MM/YYYY'),
                          },
                          {
                            title: 'Số giờ làm',
                            key: 'hours',
                            align: 'center',
                            width: 90,
                            render: (_, r) => (
                              <span>{r.actualHours ?? r.regularHours ?? 0}h{r.standardHours ? `/${r.standardHours}h` : ''}</span>
                            ),
                          },
                          {
                            title: 'Hệ số ngày',
                            dataIndex: 'dateCoefficient',
                            key: 'dateCoefficient',
                            align: 'center',
                            width: 90,
                            render: (coeff, r) => {
                              const val = coeff ?? r.dateMultiplier ?? 1.0;
                              return <Tag color={val > 1.0 ? 'volcano' : 'default'}>{val}x</Tag>;
                            },
                          },
                          {
                            title: 'Loại ca',
                            dataIndex: 'isNightShift',
                            key: 'isNightShift',
                            align: 'center',
                            width: 85,
                            render: (isNight) => isNight ? <Tag color="purple">Ca đêm</Tag> : <Tag color="default">Ca ngày</Tag>,
                          },
                          {
                            title: 'OT duyệt',
                            dataIndex: 'approvedOTHours',
                            key: 'approvedOTHours',
                            align: 'center',
                            width: 85,
                            render: (ot) => (ot > 0 ? <Tag color="orange">+{ot}h OT</Tag> : '0h'),
                          },
                          {
                            title: 'Tiền ca gốc',
                            dataIndex: 'baseShiftPay',
                            key: 'baseShiftPay',
                            align: 'right',
                            render: (amt, r) => `${new Intl.NumberFormat('vi-VN').format(amt ?? r.shiftTotal ?? 0)} đ`,
                          },
                          {
                            title: 'Thưởng Ca đêm / OT',
                            key: 'bonusPay',
                            align: 'right',
                            render: (_, r) => {
                              const night = r.nightShiftPay || 0;
                              const ot = r.oTPay || 0;
                              if (night === 0 && ot === 0) return '0 đ';
                              return (
                                <div style={{ fontSize: 11 }}>
                                  {night > 0 && <span style={{ color: '#722ed1', display: 'block' }}>Đêm: +{new Intl.NumberFormat('vi-VN').format(night)} đ</span>}
                                  {ot > 0 && <span style={{ color: '#fa8c16', display: 'block' }}>OT: +{new Intl.NumberFormat('vi-VN').format(ot)} đ</span>}
                                </div>
                              );
                            },
                          },
                          {
                            title: 'Tổng tiền ca',
                            dataIndex: 'totalShiftPay',
                            key: 'totalShiftPay',
                            align: 'right',
                            render: (amt, r) => <strong style={{ color: '#e8442a' }}>{new Intl.NumberFormat('vi-VN').format(amt ?? r.shiftTotal ?? 0)} đ</strong>,
                          },
                        ]}
                      />
                    )}
                  </div>
                );
              })()}

              {/* Salary Breakdown Details */}
              <Card
                type="inner"
                title={
                  <Space style={{ fontSize: '15px', fontWeight: 'bold' }}>
                    <FileTextOutlined />
                    <span>Chi Tiết Các Khoản Lương / Phụ Cấp / Phạt</span>
                  </Space>
                }
                style={{ borderRadius: '12px', background: '#ffffff' }}
              >
                {selectedPayroll.salaryDetails && selectedPayroll.salaryDetails.length > 0 ? (
                  <Table
                    columns={detailColumns}
                    dataSource={selectedPayroll.salaryDetails}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Không có khoản bổ sung hoặc khấu trừ chi tiết nào"
                  />
                )}
              </Card>

              {selectedPayroll.note && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Ghi chú từ quản lý:</Text>
                  <div style={{ fontSize: '14px', color: '#595959', fontStyle: 'italic', marginTop: '2px' }}>
                    "{selectedPayroll.note}"
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </Spin>

      <PayrollSuggestionModal
        open={isSuggestionModalOpen}
        onClose={() => setIsSuggestionModalOpen(false)}
        branchId={selectedPayroll?.branchId || user?.branchId}
        accountId={user?.id}
        month={filterMonth}
        year={filterYear}
        selectedPayroll={selectedPayroll}
        defaultTab={suggestionModalTab}
        onSuccess={fetchMyPayrolls}
      />
    </div>
  );
};

export default MyPayrollPage;
