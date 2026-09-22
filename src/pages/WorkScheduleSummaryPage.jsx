import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Card,
  Select,
  DatePicker,
  Tag,
  Tooltip,
  Modal,
  Badge,
  Statistic,
  Space,
  Button,
  message,
  Spin,
  Avatar,
  Typography,
  Row,
  Col,
  Progress,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined,
  ReloadOutlined,
  WarningOutlined,
  BarChartOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAllWorkSchedules } from '../api/workScheduleApi';
import { getAllBranches } from '../api/branchApi';
import { getRoleRange } from '../api/accountApi';
import { getAllShifts } from '../api/shiftApi';
import { getContracts } from '../api/contractApi';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

// Ngưỡng (phút) để xác định đi muộn / về sớm
const LATE_THRESHOLD_MINUTES = 15;
const EARLY_LEAVE_THRESHOLD_MINUTES = 15;

// Status values considered as ABSENT
const ABSENT_STATUSES = ['ABSENT', 'Vắng mặt', 'LEAVE_APPROVED'];

const isAbsent = (status) => {
  if (!status) return false;
  const s = status.toUpperCase();
  return ABSENT_STATUSES.some((a) => a.toUpperCase() === s) || s.startsWith('LEAVE_APPROVED');
};

const WorkScheduleSummaryPage = () => {
  const { user, role } = useAuth();
  const isOwnerOrAdmin = user?.roleId === 1 || user?.roleId === 2 || ['Owner', 'Admin'].includes(role);

  const [schedules, setSchedules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedContractType, setSelectedContractType] = useState(null);

  // Detail modal
  const [detailAccount, setDetailAccount] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesRes, branchesRes, accountsRes, shiftsRes, contractsRes] = await Promise.all([
        getAllWorkSchedules(),
        getAllBranches(),
        getRoleRange(),
        getAllShifts(),
        getContracts(),
      ]);
      setSchedules(schedulesRes.data || []);
      setBranches(branchesRes.data || []);
      setAccounts(accountsRes.data || []);
      const rawShifts = shiftsRes.data || [];
      setShifts([...rawShifts].sort((a, b) => (a.id ?? 0) - (b.id ?? 0) || (a.startTime || '').localeCompare(b.startTime || '')));
      setContracts(contractsRes.data || []);
    } catch {
      message.error('Không thể tải dữ liệu!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getAccountInfo = (id) => accounts.find((a) => a.id === id);
  const getShift = (id) => shifts.find((s) => s.id === id);
  const getBranchName = (id) => {
    const br = branches.find((b) => b.id === id);
    return br ? br.name : `Chi nhánh #${id}`;
  };

  // Đi muộn: check-in sau giờ bắt đầu ca + 15 phút
  const isLate = (schedule) => {
    if (!schedule.checkInAt) return false;
    const shift = getShift(schedule.shiftId);
    if (!shift || !shift.startTime) return false;
    const workDateStr = dayjs(schedule.workDate).format('YYYY-MM-DD');
    const shiftStart = dayjs(`${workDateStr} ${shift.startTime.substring(0, 5)}`);
    return dayjs(schedule.checkInAt).isAfter(shiftStart.add(LATE_THRESHOLD_MINUTES, 'minute'));
  };

  // Về sớm: check-out trước giờ kết thúc ca - 15 phút
  const isEarlyLeave = (schedule) => {
    if (!schedule.checkOutAt) return false;
    const shift = getShift(schedule.shiftId);
    if (!shift || !shift.endTime) return false;
    const workDateStr = dayjs(schedule.workDate).format('YYYY-MM-DD');
    const shiftEnd = dayjs(`${workDateStr} ${shift.endTime.substring(0, 5)}`);
    return dayjs(schedule.checkOutAt).isBefore(shiftEnd.subtract(EARLY_LEAVE_THRESHOLD_MINUTES, 'minute'));
  };

  // Filter schedules for the selected month
  const monthStart = selectedMonth.startOf('month');
  const monthEnd = selectedMonth.endOf('month');

  const monthSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const d = dayjs(s.workDate);
      if (d.isBefore(monthStart, 'day') || d.isAfter(monthEnd, 'day')) return false;
      if (selectedBranchId && s.branchId !== selectedBranchId) return false;
      return true;
    });
  }, [schedules, selectedMonth, selectedBranchId]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Tập accountId có hợp đồng Active
  const activeAccountIds = useMemo(
    () => new Set(contracts.filter((c) => c.status === 'Active').map((c) => c.accountId)),
    [contracts]
  );

  // Build per-account summary
  const summaryData = useMemo(() => {
    const accountMap = {};

    monthSchedules.forEach((s) => {
      const aId = s.accountId;
      if (!accountMap[aId]) {
        accountMap[aId] = {
          accountId: aId,
          totalScheduled: 0,
          worked: 0,
          absent: 0,
          onTime: 0,
          late: 0,
          earlyLeave: 0,
          totalHours: 0,
          schedules: [],
        };
      }
      const entry = accountMap[aId];
      entry.totalScheduled += 1;
      entry.schedules.push(s);

      if (isAbsent(s.status)) {
        entry.absent += 1;
      } else if (s.checkInAt) {
        entry.worked += 1;
        entry.totalHours += (s.actualHours || 0) + (s.approvedOTHours || 0);
        if (isLate(s)) entry.late += 1;
        else entry.onTime += 1;
        if (isEarlyLeave(s)) entry.earlyLeave += 1;
      }
    });

    return Object.values(accountMap)
      .filter((r) => activeAccountIds.has(r.accountId))  // chỉ nhân viên có hợp đồng Active
      .filter((r) => !selectedAccountId || r.accountId === selectedAccountId)
      .filter((r) => {
        if (!selectedContractType) return true;
        const accContract = contracts.find((c) => c.accountId === r.accountId && (c.branchId === selectedBranchId || !c.branchId));
        const isPartTime = accContract?.type === 'Part-time' || accContract?.salaryType === 'Hourly' || accContract?.type === 'Bán thời gian';
        if (selectedContractType === 'FULL_TIME' && isPartTime) return false;
        if (selectedContractType === 'PART_TIME' && !isPartTime) return false;
        return true;
      })
      .sort((a, b) => {
        const nameA = getAccountInfo(a.accountId)?.name || '';
        const nameB = getAccountInfo(b.accountId)?.name || '';
        return nameA.localeCompare(nameB, 'vi');
      });
  }, [monthSchedules, selectedAccountId, accounts, shifts, activeAccountIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Overall totals
  const totals = useMemo(() => {
    return summaryData.reduce(
      (acc, r) => {
        acc.totalScheduled += r.totalScheduled;
        acc.worked += r.worked;
        acc.absent += r.absent;
        acc.onTime += r.onTime;
        acc.late += r.late;
        acc.earlyLeave += r.earlyLeave;
        acc.totalHours += r.totalHours;
        return acc;
      },
      { totalScheduled: 0, worked: 0, absent: 0, onTime: 0, late: 0, earlyLeave: 0, totalHours: 0 }
    );
  }, [summaryData]);

  // Detail schedules for selected account
  const detailSchedules = useMemo(() => {
    if (!detailAccount) return [];
    return monthSchedules
      .filter((s) => s.accountId === detailAccount.accountId)
      .sort((a, b) => dayjs(a.workDate).unix() - dayjs(b.workDate).unix());
  }, [detailAccount, monthSchedules]);

  const handleRowClick = (record) => {
    setDetailAccount(record);
    setDetailModalOpen(true);
  };

  const columns = [
    {
      title: 'Nhân viên',
      key: 'accountId',
      render: (_, record) => {
        const acc = getAccountInfo(record.accountId);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              src={acc?.avatarImage}
              icon={<UserOutlined />}
              style={{ backgroundColor: acc?.avatarImage ? undefined : '#e8442a', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 600, color: '#1f2937' }}>{acc?.name || `NV #${record.accountId}`}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>ID: #{record.accountId}</div>
            </div>
          </div>
        );
      },
      sorter: (a, b) =>
        (getAccountInfo(a.accountId)?.name || '').localeCompare(
          getAccountInfo(b.accountId)?.name || '',
          'vi'
        ),
    },
    {
      title: 'Số ca phân',
      dataIndex: 'totalScheduled',
      key: 'totalScheduled',
      align: 'center',
      sorter: (a, b) => a.totalScheduled - b.totalScheduled,
      render: (val) => (
        <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }}>
          {val} ca
        </Tag>
      ),
    },
    {
      title: 'Đi làm',
      dataIndex: 'worked',
      key: 'worked',
      align: 'center',
      sorter: (a, b) => a.worked - b.worked,
      render: (val, record) => (
        <div style={{ textAlign: 'center' }}>
          <Tag color="green" style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }}>
            {val} ngày
          </Tag>
          {record.totalScheduled > 0 && (
            <div style={{ marginTop: 4 }}>
              <Progress
                percent={Math.round((val / record.totalScheduled) * 100)}
                size="small"
                showInfo={false}
                strokeColor="#52c41a"
              />
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Vắng mặt',
      dataIndex: 'absent',
      key: 'absent',
      align: 'center',
      sorter: (a, b) => a.absent - b.absent,
      render: (val) => (
        <Tag
          color={val > 0 ? 'red' : 'default'}
          icon={val > 0 ? <CloseCircleOutlined /> : undefined}
          style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }}
        >
          {val} ngày
        </Tag>
      ),
    },
    {
      title: (
        <span>
          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
          Đúng giờ
        </span>
      ),
      dataIndex: 'onTime',
      key: 'onTime',
      align: 'center',
      sorter: (a, b) => a.onTime - b.onTime,
      render: (val) => (
        <Tag
          color={val > 0 ? 'success' : 'default'}
          style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }}
        >
          {val} lần
        </Tag>
      ),
    },
    {
      title: (
        <span>
          <WarningOutlined style={{ color: '#faad14', marginRight: 4 }} />
          Muộn (&gt;15p)
        </span>
      ),
      dataIndex: 'late',
      key: 'late',
      align: 'center',
      sorter: (a, b) => a.late - b.late,
      render: (val) => (
        <Tag
          color={val > 0 ? 'warning' : 'default'}
          icon={val > 0 ? <WarningOutlined /> : undefined}
          style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }}
        >
          {val} lần
        </Tag>
      ),
    },
    {
      title: (
        <span>
          <ClockCircleOutlined style={{ color: '#ef4444', marginRight: 4 }} />
          Về sớm (&lt;15p)
        </span>
      ),
      dataIndex: 'earlyLeave',
      key: 'earlyLeave',
      align: 'center',
      sorter: (a, b) => a.earlyLeave - b.earlyLeave,
      render: (val) => (
        <Tag
          color={val > 0 ? 'volcano' : 'default'}
          icon={val > 0 ? <ClockCircleOutlined /> : undefined}
          style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }}
        >
          {val} lần
        </Tag>
      ),
    },
    {
      title: 'Tổng giờ công',
      dataIndex: 'totalHours',
      key: 'totalHours',
      align: 'center',
      sorter: (a, b) => a.totalHours - b.totalHours,
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#4f46e5' }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {Number(val).toFixed(1)} giờ
        </span>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_, record) => (
        <Tooltip title="Xem chi tiết từng ngày">
          <Button
            type="text"
            icon={<ArrowRightOutlined style={{ color: '#e8442a' }} />}
            onClick={() => handleRowClick(record)}
          />
        </Tooltip>
      ),
    },
  ];

  // Row style highlighting
  const rowClassName = (record) => {
    if (record.late > 2) return 'summary-row-warn';
    if (record.absent > 0) return 'summary-row-absent';
    return '';
  };

  /* ─── Detail Modal ─── */
  const detailColumns = [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      key: 'workDate',
      render: (val) => dayjs(val).format('DD/MM/YYYY (dddd)'),
      sorter: (a, b) => dayjs(a.workDate).unix() - dayjs(b.workDate).unix(),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Ca trực',
      dataIndex: 'shiftId',
      key: 'shiftId',
      render: (id) => {
        const sh = getShift(id);
        if (!sh) return `Ca #${id}`;
        return `${sh.name} (${sh.startTime?.substring(0, 5)} - ${sh.endTime?.substring(0, 5)})`;
      },
    },
    {
      title: 'Giờ vào',
      key: 'checkIn',
      render: (_, record) => {
        if (!record.checkInAt) return <Text type="secondary">—</Text>;
        const late = isLate(record);
        return (
          <span style={{ color: late ? '#fa8c16' : '#52c41a', fontWeight: 600 }}>
            {dayjs(record.checkInAt).format('HH:mm')}
            {late && (
              <Tag color="warning" style={{ marginLeft: 6, fontSize: 11 }}>
                Muộn
              </Tag>
            )}
          </span>
        );
      },
    },
    {
      title: 'Giờ ra',
      key: 'checkOut',
      render: (_, record) => {
        if (!record.checkOutAt) return <Text type="secondary">—</Text>;
        const early = isEarlyLeave(record);
        return (
          <span style={{ color: early ? '#ef4444' : '#1f2937', fontWeight: 600 }}>
            {dayjs(record.checkOutAt).format('HH:mm')}
            {early && (
              <Tag color="volcano" style={{ marginLeft: 6, fontSize: 11 }}>Về sớm</Tag>
            )}
          </span>
        );
      },
    },
    {
      title: 'Giờ công',
      key: 'actualHours',
      align: 'center',
      render: (_, record) => {
        const baseH = record.actualHours || 0;
        const otH = record.approvedOTHours || 0;
        const totalH = baseH + otH;
        if (totalH <= 0 && record.actualHours == null) return <Text type="secondary">—</Text>;
        return (
          <span style={{ color: '#4f46e5', fontWeight: 600 }}>
            {Number(totalH).toFixed(1)}h
            {otH > 0 && <span style={{ fontSize: 11, color: '#f59e0b', marginLeft: 4 }}>(+{Number(otH).toFixed(1)}h OT)</span>}
          </span>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (!status) return <Tag>Chưa rõ</Tag>;
        if (isAbsent(status)) return <Tag color="red">Vắng mặt</Tag>;
        if (status.toUpperCase().startsWith('LEAVE_REQUEST')) return <Tag color="purple">Xin nghỉ</Tag>;
        if (status.toUpperCase() === 'PENDING') return <Tag color="warning">Chờ thực hiện</Tag>;
        if (status.toUpperCase() === 'APPROVED') return <Tag color="processing">Đã duyệt</Tag>;
        if (status.toUpperCase() === 'COMPLETED' || status === 'Hoàn thành') return <Tag color="success">Hoàn thành</Tag>;
        if (status.toUpperCase() === 'WORKING' || status === 'Đang làm việc') return <Tag color="blue">Đang làm việc</Tag>;
        return <Tag>{status}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* ── Header ── */}
      <Card
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #fffbfb 0%, #fff5f3 100%)',
          border: '1px solid #ffdeda',
          borderRadius: 14,
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #e8442a, #ff8c42)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 22,
                boxShadow: '0 4px 12px rgba(232,68,42,0.3)',
              }}
            >
              <BarChartOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#e8442a' }}>
                Tổng Hợp Lịch Làm Việc Tháng
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Thống kê ngày đi làm, vắng mặt, đúng giờ và muộn giờ của từng nhân viên
              </Text>
            </div>
          </div>
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            Làm mới
          </Button>
        </div>
      </Card>

      {/* ── Filters ── */}
      <Card
        style={{ marginBottom: 20, borderRadius: 12, border: '1px solid #f0f0f0' }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Space size="middle" wrap>
          <div>
            <Text strong style={{ marginRight: 8 }}>Tháng:</Text>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(val) => val && setSelectedMonth(val)}
              format="MM/YYYY"
              allowClear={false}
              style={{ width: 140 }}
            />
          </div>
          {isOwnerOrAdmin && (
            <div>
              <Text strong style={{ marginRight: 8 }}>Chi nhánh:</Text>
              <Select
                placeholder="Tất cả chi nhánh"
                allowClear
                value={selectedBranchId}
                onChange={(val) => setSelectedBranchId(val)}
                style={{ width: 220 }}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
              />
            </div>
          )}
          <div>
            <Text strong style={{ marginRight: 8 }}>Nhân viên:</Text>
            <Select
              placeholder="Tất cả nhân viên"
              allowClear
              showSearch
              optionFilterProp="label"
              value={selectedAccountId}
              onChange={(val) => setSelectedAccountId(val)}
              style={{ width: 220 }}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </div>
          <div>
            <Text strong style={{ marginRight: 8 }}>Loại nhân viên:</Text>
            <Select
              placeholder="Tất cả loại nhân viên"
              allowClear
              value={selectedContractType}
              onChange={(val) => setSelectedContractType(val)}
              style={{ width: 180 }}
            >
              <Select.Option value="FULL_TIME">Toàn thời gian</Select.Option>
              <Select.Option value="PART_TIME">Bán thời gian</Select.Option>
            </Select>
          </div>
        </Space>
      </Card>

      {/* ── Overview Stats ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          {
            title: 'Tổng ca phân',
            value: totals.totalScheduled,
            suffix: 'ca',
            color: '#4f46e5',
            bg: 'linear-gradient(135deg,#ede9fe,#f5f3ff)',
            border: '#c4b5fd',
            icon: <TeamOutlined style={{ fontSize: 22 }} />,
          },
          {
            title: 'Tổng ngày đi làm',
            value: totals.worked,
            suffix: 'ngày',
            color: '#16a34a',
            bg: 'linear-gradient(135deg,#dcfce7,#f0fdf4)',
            border: '#86efac',
            icon: <CheckCircleOutlined style={{ fontSize: 22 }} />,
          },
          {
            title: 'Tổng ngày vắng',
            value: totals.absent,
            suffix: 'ngày',
            color: '#dc2626',
            bg: 'linear-gradient(135deg,#fee2e2,#fff1f1)',
            border: '#fca5a5',
            icon: <CloseCircleOutlined style={{ fontSize: 22 }} />,
          },
          {
            title: 'Đúng giờ',
            value: totals.onTime,
            suffix: 'lần',
            color: '#0284c7',
            bg: 'linear-gradient(135deg,#e0f2fe,#f0f9ff)',
            border: '#7dd3fc',
            icon: <CheckCircleOutlined style={{ fontSize: 22 }} />,
          },
          {
            title: 'Muộn giờ (>15p)',
            value: totals.late,
            suffix: 'lần',
            color: '#d97706',
            bg: 'linear-gradient(135deg,#fef3c7,#fffbeb)',
            border: '#fcd34d',
            icon: <WarningOutlined style={{ fontSize: 22 }} />,
          },
          {
            title: 'Về sớm (<15p)',
            value: totals.earlyLeave,
            suffix: 'lần',
            color: '#ef4444',
            bg: 'linear-gradient(135deg,#fee2e2,#fff1f0)',
            border: '#fca5a5',
            icon: <ClockCircleOutlined style={{ fontSize: 22 }} />,
          },
          {
            title: 'Tổng giờ công',
            value: Number(totals.totalHours).toFixed(1),
            suffix: 'giờ',
            color: '#7c3aed',
            bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
            border: '#c4b5fd',
            icon: <ClockCircleOutlined style={{ fontSize: 22 }} />,
          },
        ].map((stat) => (
          <Col key={stat.title} xs={12} sm={8} md={8} lg={4}>
            <Card
              style={{
                background: stat.bg,
                border: `1px solid ${stat.border}`,
                borderRadius: 12,
                textAlign: 'center',
                transition: 'transform 0.2s',
              }}
              bodyStyle={{ padding: '16px 12px' }}
              hoverable
            >
              <div style={{ color: stat.color, marginBottom: 6 }}>{stat.icon}</div>
              <Statistic
                value={stat.value}
                suffix={stat.suffix}
                valueStyle={{ fontSize: 22, fontWeight: 700, color: stat.color }}
              />
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{stat.title}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Main Table ── */}
      <Card
        style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
        bodyStyle={{ padding: 0 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <TeamOutlined style={{ color: '#e8442a' }} />
            <span style={{ fontWeight: 700 }}>
              Bảng thống kê — Tháng {selectedMonth.format('MM/YYYY')}
            </span>
            <Tag color="orange" style={{ marginLeft: 4 }}>
              {summaryData.length} nhân viên
            </Tag>
          </div>
        }
      >
        <Spin spinning={loading}>
          <Table
            dataSource={summaryData}
            columns={columns}
            rowKey="accountId"
            rowClassName={rowClassName}
            pagination={{ pageSize: 15, showSizeChanger: true }}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' },
            })}
            scroll={{ x: 900 }}
            locale={{ emptyText: 'Không có dữ liệu lịch làm việc cho tháng này' }}
          />
        </Spin>
      </Card>

      {/* ── Detail Modal ── */}
      <Modal
        maskClosable={false}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={820}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e8442a' }}>
            <CalendarOutlined />
            <span style={{ fontWeight: 700 }}>
              Chi tiết — {getAccountInfo(detailAccount?.accountId)?.name || `NV #${detailAccount?.accountId}`} — Tháng{' '}
              {selectedMonth.format('MM/YYYY')}
            </span>
          </div>
        }
      >
        {detailAccount && (
          <>
            {/* Mini stats in modal */}
            <Row gutter={12} style={{ marginBottom: 16 }}>
              {[
                { label: 'Ca phân', value: detailAccount.totalScheduled, color: '#4f46e5' },
                { label: 'Đi làm', value: detailAccount.worked, color: '#16a34a' },
                { label: 'Vắng', value: detailAccount.absent, color: '#dc2626' },
                { label: 'Đúng giờ', value: detailAccount.onTime, color: '#0284c7' },
                { label: 'Muộn', value: detailAccount.late, color: '#d97706' },
                { label: 'Về sớm', value: detailAccount.earlyLeave, color: '#ef4444' },
                {
                  label: 'Tổng giờ',
                  value: `${Number(detailAccount.totalHours).toFixed(1)}h`,
                  color: '#7c3aed',
                },
              ].map((s) => (
                <Col key={s.label} xs={8} sm={4}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '10px 4px',
                      borderRadius: 8,
                      background: '#fafafa',
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
                  </div>
                </Col>
              ))}
            </Row>
            <Table
              dataSource={detailSchedules}
              columns={detailColumns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 680 }}
            />
          </>
        )}
      </Modal>

      {/* Inline styles for row highlighting */}
      <style>{`
        .summary-row-warn td { background: #fffbe6 !important; }
        .summary-row-absent td { background: #fff1f0 !important; }
        .ant-table-row:hover .summary-row-warn td,
        .ant-table-row:hover .summary-row-absent td { opacity: 0.9; }
      `}</style>
    </div>
  );
};

export default WorkScheduleSummaryPage;
