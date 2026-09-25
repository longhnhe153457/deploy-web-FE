import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Card,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  InputNumber,
  Space,
  Tag,
  Tooltip,
  message,
  Switch,
  Checkbox,
  TimePicker,
  Badge,
  Tabs,
  Divider,
  Calendar,
  Avatar,
  Popover,
  Dropdown,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  SolutionOutlined,
  ReloadOutlined,
  FileDoneOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  LeftOutlined,
  RightOutlined,
  DownloadOutlined,
  FilterOutlined,
  SettingOutlined,
  MobileOutlined,
  InfoCircleOutlined,
  DownOutlined,
  ExportOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);
import {
  getAllWorkSchedules,
  createWorkSchedule,
  updateWorkSchedule,
  deleteWorkSchedule,
  assignWorkSchedules,
  approveOT,
  verifyPOSActivity,
  autoAssignWorkSchedules,
  rejectShiftSwap,
  getActivityLog,
} from '../api/workScheduleApi';
import { getAllBranches } from '../api/branchApi';
import { getRoleRange, getAllAccounts } from '../api/accountApi';
import { getAllShifts } from '../api/shiftApi';
import { getShiftChangeRequestsByBranch, approveShiftChangeRequest, rejectShiftChangeRequest } from '../api/shiftChangeRequestApi';
import { getContracts } from '../api/contractApi';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import MyWorkSchedulePage from './MyWorkSchedulePage';
import AccountDetailModal from '../components/account/AccountDetailModal';

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Chờ thực hiện', color: 'warning' },
  { value: 'Approved', label: 'Đã duyệt', color: 'processing' },
  { value: 'Working', label: 'Đang làm việc', color: 'blue' },
  { value: 'Completed', label: 'Hoàn thành', color: 'success' },
  { value: 'Absent', label: 'Vắng mặt', color: 'error' },
  { value: 'LEAVE_APPROVED', label: 'Đã xin nghỉ', color: 'purple' },
];

const normalizeStatusString = (status) => {
  if (!status) return 'Pending';
  const s = status.toUpperCase();
  if (s === 'PENDING') return 'Pending';
  if (s === 'APPROVED') return 'Approved';
  if (s === 'WORKING' || s === 'ĐANG LÀM VIỆC') return 'Working';
  if (s === 'COMPLETED' || s === 'HOÀN THÀNH' || s === 'ĐÃ HOÀN THÀNH') return 'Completed';
  if (s === 'ABSENT' || s === 'VẮNG MẶT') return 'Absent';
  if (s.startsWith('LEAVE_APPROVED') || s === 'ĐÃ XIN NGHỈ' || s === 'ĐÃ NGHỈ PHÉP') return 'LEAVE_APPROVED';
  return status;
};

// Parse status dạng "LEAVE_REQUEST:<lý do NV>" hoặc "LEAVE_APPROVED:<lý do NV>|<ghi chú QL>"
// — ghi chú quản lý là phần thêm sau dấu '|', tuỳ chọn.
const parseLeaveStatus = (status) => {
  const raw = status || '';
  const upper = raw.toUpperCase();
  const isPending = upper.startsWith('LEAVE_REQUEST');
  const isApproved = upper.startsWith('LEAVE_APPROVED') || upper === 'ĐÃ XIN NGHỈ' || upper === 'ĐÃ NGHỈ PHÉP';
  if (!isPending && !isApproved) return null;

  const body = raw.split(':').slice(1).join(':');
  const [employeeReasonRaw, adminNoteRaw] = body.split('|');
  return {
    isPending,
    isApproved,
    employeeReason: (employeeReasonRaw || '').trim() || 'Xin nghỉ phép',
    adminNote: (adminNoteRaw || '').trim(),
  };
};

// Helper: match status không phân biệt hoa thường (fallback cho dữ liệu cũ)
const getStatusOption = (status) => {
  const norm = normalizeStatusString(status);
  return STATUS_OPTIONS.find((s) => s.value === norm) || { label: status === 'LEAVE_APPROVED' ? 'Đã xin nghỉ' : status, color: status === 'LEAVE_APPROVED' ? 'purple' : 'default' };
};

const isLockApprovalStatus = (status) => {
  if (!status) return false;
  const s = status.toString().trim().toLowerCase();
  return ['working', 'completed', 'absent', 'đang làm việc', 'hoàn thành', 'đã hoàn thành', 'vắng mặt'].includes(s);
};


const WorkSchedulePage = () => {
  const { user, role } = useAuth();
  const isManager = user?.roleId === 3 || role === 'Manager';
  const isOwner = user?.roleId === 2 || role === 'Owner';
  const isOwnerOrAdmin = user?.roleId === 1 || user?.roleId === 2 || ['Owner', 'Admin'].includes(role);
  const managerBranchId = user?.branchId || user?.contracts?.find((c) => (c.status === 'Active' || c.status === 1) && c.branchId)?.branchId;

  const [schedules, setSchedules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [accounts, setAccounts] = useState([]);
  // Danh sách tên đầy đủ (không giới hạn theo role) — chỉ dùng để hiển thị tên
  // nhân viên (VD: người gửi/nhận trong yêu cầu đổi ca), vì "accounts" ở trên
  // bị giới hạn chỉ còn tài khoản Quản lý khi người xem là Admin/Owner.
  const [allAccountNames, setAllAccountNames] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shiftChangeRequests, setShiftChangeRequests] = useState([]);

  const allowedBranches = useMemo(() => {
    if (isManager && managerBranchId) {
      return branches.filter((b) => b.id === managerBranchId);
    }
    return branches;
  }, [branches, isManager, managerBranchId]);

  const defaultBranchId = allowedBranches.length > 0 ? allowedBranches[0].id : null;

  const ROLES_MAP = {
    3: { label: 'Quản lý', color: 'purple' },
    4: { label: 'Thu ngân', color: 'blue' },
    5: { label: 'Bếp trưởng', color: 'orange' },
    6: { label: 'Phục vụ', color: 'green' },
  };

  const contractedAccounts = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];
    if (!contracts || contracts.length === 0) return accounts;
    const contractedAccountIds = new Set(contracts.map((c) => c.accountId));
    const filtered = accounts.filter((a) => contractedAccountIds.has(a.id));
    return filtered.length > 0 ? filtered : accounts;
  }, [accounts, contracts]);

  // Filtering & View states
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedManagerApproved, setSelectedManagerApproved] = useState(null);
  const [selectedContractType, setSelectedContractType] = useState(null);
  const [searchDate, setSearchDate] = useState(null);
  const [searchEmpText, setSearchEmpText] = useState('');

  const isAccountPartTime = useCallback(
    (accountId) => {
      const contract = contracts.find((c) => c.accountId === accountId);
      if (!contract) return false;
      return (
        contract.type === 'Part-time' ||
        contract.salaryType === 'Hourly' ||
        contract.type === 'Bán thời gian'
      );
    },
    [contracts]
  );

  const groupedStaffAccounts = useMemo(() => {
    const groups = {
      4: { label: '💳 THU NGÂN', items: [] },
      5: { label: '👨‍🍳 BẾP TRƯỞNG', items: [] },
      6: { label: '🤵 PHỤC VỤ', items: [] },
      other: { label: '👤 NHÂN VIÊN KHÁC', items: [] },
    };

    contractedAccounts
      .filter((a) => {
        if (!a.roleIds || a.roleIds.length === 0) return false;
        if (a.roleIds.some((rId) => [1, 2, 3].includes(rId))) return false;
        if (selectedContractType) {
          const isPart = isAccountPartTime(a.id);
          if (selectedContractType === 'FULL_TIME' && isPart) return false;
          if (selectedContractType === 'PART_TIME' && !isPart) return false;
        }
        return true;
      })
      .forEach((a) => {
        const primaryRoleId = a.roleIds && a.roleIds.length > 0 ? a.roleIds[0] : (a.roleId || 'other');
        if (groups[primaryRoleId]) {
          groups[primaryRoleId].items.push(a);
        } else {
          groups.other.items.push(a);
        }
      });

    return Object.entries(groups).filter(([_, grp]) => grp.items.length > 0);
  }, [contractedAccounts, selectedContractType, isAccountPartTime]);

  const [searchParams] = useSearchParams();

  // Modal states - Employee Detail
  const [detailAccount, setDetailAccount] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Tự động nhận diện và lọc theo nhân viên khi điều hướng từ thông báo chấm công
  useEffect(() => {
    const accIdParam = searchParams.get('accountId');
    const searchParam = searchParams.get('search');
    const dateParam = searchParams.get('date');
    const openDetailParam = searchParams.get('openDetail') === 'true' || searchParams.get('openDetail') === '1';

    if (accIdParam) {
      setSelectedAccount(Number(accIdParam));
    }
    if (searchParam) {
      setSearchEmpText(searchParam);
    }
    if (dateParam && dayjs(dateParam).isValid()) {
      const d = dayjs(dateParam);
      setSearchDate(d);
      setCurrentWeekStart(d.startOf('isoWeek'));
    }

    if (openDetailParam && accounts && accounts.length > 0) {
      let matched = null;
      if (accIdParam) {
        matched = accounts.find((a) => a.id === Number(accIdParam));
      }
      if (!matched && searchParam) {
        const lower = searchParam.toLowerCase().trim();
        matched = accounts.find((a) => (a.name || '').toLowerCase().includes(lower));
      }
      if (matched) {
        setDetailAccount(matched);
        setIsDetailModalOpen(true);
      }
    }
  }, [searchParams, accounts]);

  // Weekly Matrix Grid Navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => dayjs().startOf('isoWeek'));
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => currentWeekStart.add(i, 'day'));
  }, [currentWeekStart]);

  // Modal states - Single Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create' or 'edit'
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  // Modal states - Bulk Assign
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkAssignSubmitting, setBulkAssignSubmitting] = useState(false);
  const [bulkForm] = Form.useForm();

  // Modal states - Auto Assign
  const [isAutoAssignModalOpen, setIsAutoAssignModalOpen] = useState(false);
  const [autoAssignSubmitting, setAutoAssignSubmitting] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState(null);
  const [autoAssignForm] = Form.useForm();

  // OT Approval Modal state
  const [isOTModalOpen, setIsOTModalOpen] = useState(false);
  const [selectedOTRecord, setSelectedOTRecord] = useState(null);
  const [posVerificationData, setPosVerificationData] = useState(null);
  const [loadingPOS, setLoadingPOS] = useState(false);
  const [otForm] = Form.useForm();

  // Cancel (Delete) Work Schedule Modal state — bắt buộc nhập lý do hủy ca
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelForm] = Form.useForm();

  // Approve Leave Request Modal state — quản lý có thể thêm ghi chú riêng khi duyệt nghỉ
  const [isApproveLeaveModalOpen, setIsApproveLeaveModalOpen] = useState(false);
  const [approveLeaveTarget, setApproveLeaveTarget] = useState(null);
  const [approveLeaveSubmitting, setApproveLeaveSubmitting] = useState(false);
  const [approveLeaveForm] = Form.useForm();

  // Leave Request Detail Modal state — bấm vào note trên Lịch tuần để xem chi tiết
  const [isLeaveDetailModalOpen, setIsLeaveDetailModalOpen] = useState(false);
  const [leaveDetailTarget, setLeaveDetailTarget] = useState(null);

  // Reject/Cancel Shift-Change Request Modal state — bắt buộc nhập lý do trước khi
  // từ chối/hủy yêu cầu đổi ca (dùng chung cho cả "Đổi ca làm" và "Đổi giờ ca").
  const [isRejectShiftChangeModalOpen, setIsRejectShiftChangeModalOpen] = useState(false);
  const [rejectShiftChangeTarget, setRejectShiftChangeTarget] = useState(null);
  const [rejectShiftChangeSubmitting, setRejectShiftChangeSubmitting] = useState(false);
  const [rejectShiftChangeForm] = Form.useForm();

  // Activity Log Modal state
  const [isActivityLogModalOpen, setIsActivityLogModalOpen] = useState(false);
  const [activityLogData, setActivityLogData] = useState([]);
  const [loadingActivityLog, setLoadingActivityLog] = useState(false);
  const [selectedLogRecord, setSelectedLogRecord] = useState(null);

  const handleOpenActivityLog = async (record) => {
    setSelectedLogRecord(record);
    setIsActivityLogModalOpen(true);
    setLoadingActivityLog(true);
    try {
      const res = await getActivityLog(record.id);
      setActivityLogData(res.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải nhật ký hoạt động!');
    } finally {
      setLoadingActivityLog(false);
    }
  };

  const handleOpenOTModal = async (record) => {
    setSelectedOTRecord(record);
    setIsOTModalOpen(true);
    setLoadingPOS(true);
    setPosVerificationData(null);
    otForm.setFieldsValue({
      approvedOTHours: record.approvedOTHours ?? 0,
      otNotes: record.otNotes || '',
      otStatus: record.otStatus || 'Approved',
    });

    try {
      const res = await verifyPOSActivity(record.id);
      setPosVerificationData(res.data);
    } catch (err) {
      console.error(err);
      message.error('Không thể kiểm tra hoạt động POS!');
    } finally {
      setLoadingPOS(false);
    }
  };

  const handleOTSubmit = async (values) => {
    try {
      await approveOT({
        workScheduleId: selectedOTRecord.id,
        approvedOTHours: values.approvedOTHours,
        otNotes: values.otNotes,
        otStatus: values.otStatus || 'Approved',
      });
      message.success('Đã duyệt giờ làm thêm (OT) thành công!');
      setIsOTModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi duyệt OT!';
      message.error(errorMsg);
    }
  };

  const selectedFormBranchId = Form.useWatch('branchId', form);
  const selectedBulkBranchId = Form.useWatch('branchId', bulkForm);

  // Active view tab ('grid' = Tanca Weekly Roster Grid, 'table' = Table list, 'calendar' = Monthly calendar)
  const [activeTab, setActiveTab] = useState('grid');

  // Excel Export Handler
  const handleExportExcel = () => {
    try {
      let csv = '\uFEFF';
      csv += 'Mã NV,Tên Nhân viên,Chi nhánh,Ca làm,Ngày làm việc,Giờ Check-in,Giờ Check-out,Số giờ thực tế,Trạng thái,Quản lý duyệt\n';
      filteredSchedules.forEach((s) => {
        const empName = getAccountName(s.accountId);
        const brName = getBranchName(s.branchId);
        const shiftInfo = getShiftDetails(s.shiftId);
        const dateStr = dayjs(s.workDate).format('DD/MM/YYYY');
        const inTime = s.checkInAt ? dayjs(s.checkInAt).format('HH:mm') : '--';
        const outTime = s.checkOutAt ? dayjs(s.checkOutAt).format('HH:mm') : '--';
        const hours = s.actualHours ?? 0;
        const stLabel = getStatusOption(s.status)?.label || s.status;
        const approved = s.managerApproved ? 'Đã duyệt' : 'Chờ duyệt';
        csv += `"${s.accountId}","${empName}","${brName}","${shiftInfo.name}","${dateStr}","${inTime}","${outTime}",${hours},"${stLabel}","${approved}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Lich_Lam_Viec_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Đã xuất báo cáo lịch làm việc ra tập tin Excel (CSV) thành công!');
    } catch (err) {
      console.error(err);
      message.error('Có lỗi xảy ra khi xuất file Excel!');
    }
  };

  // Load all lists
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesRes, branchesRes, accountsRes, allAccountsRes, shiftsRes, contractsRes] = await Promise.all([
        getAllWorkSchedules(),
        getAllBranches(),
        getRoleRange(),
        getAllAccounts().catch(() => ({ data: [] })),
        getAllShifts(),
        getContracts().catch(() => ({ data: [] })),
      ]);
      setSchedules(schedulesRes.data || []);
      setBranches(branchesRes.data || []);
      setAccounts(accountsRes.data || []);
      setAllAccountNames(allAccountsRes.data || []);
      setContracts(contractsRes.data || []);
      const rawShifts = shiftsRes.data || [];
      const sortedShifts = [...rawShifts].sort((a, b) => (a.id ?? 0) - (b.id ?? 0) || (a.startTime || '').localeCompare(b.startTime || ''));
      setShifts(sortedShifts);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải dữ liệu lịch làm việc / chi nhánh / nhân viên / ca trực!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Yêu cầu đổi giờ ca (4.4) đang chờ duyệt — nạp riêng vì nằm ở API khác WorkSchedule
  const loadShiftChangeRequests = useCallback(async () => {
    if (!(isManager || isOwnerOrAdmin)) return;
    const branchIds = isManager && managerBranchId ? [managerBranchId] : allowedBranches.map((b) => b.id);
    if (branchIds.length === 0) {
      setShiftChangeRequests([]);
      return;
    }
    try {
      const results = await Promise.all(
        branchIds.map((id) => getShiftChangeRequestsByBranch(id, 'Pending').catch(() => ({ data: [] })))
      );
      setShiftChangeRequests(results.flatMap((r) => r.data || []));
    } catch {
      setShiftChangeRequests([]);
    }
  }, [isManager, isOwnerOrAdmin, managerBranchId, allowedBranches]);

  useEffect(() => {
    loadShiftChangeRequests();
  }, [loadShiftChangeRequests]);

  // Helper mappings
  const getAccountName = (id) => {
    const acc = accounts.find((a) => a.id === id) || allAccountNames.find((a) => a.id === id);
    return acc ? acc.name : `Nhân viên #${id}`;
  };

  const getBranchName = (id) => {
    const br = branches.find((b) => b.id === id);
    return br ? br.name : `Chi nhánh #${id}`;
  };

  // Tìm tên Quản lý phụ trách 1 chi nhánh — dựa vào hợp đồng còn hiệu lực + role Quản lý (roleId 3).
  const getBranchManagerName = (branchId) => {
    const nameSource = allAccountNames.length > 0 ? allAccountNames : accounts;
    const managerContract = contracts.find((c) => {
      if (c.branchId !== branchId) return false;
      if (!(c.status === 'Active' || c.status === 1 || c.status === 'Hiệu lực')) return false;
      const acc = nameSource.find((a) => a.id === c.accountId);
      const primaryRoleId = acc?.roleIds && acc.roleIds.length > 0 ? acc.roleIds[0] : acc?.roleId;
      return primaryRoleId === 3;
    });
    return managerContract ? getAccountName(managerContract.accountId) : null;
  };

  const getShiftDetails = (id) => {
    const sh = shifts.find((s) => s.id === id);
    if (!sh) return { name: `Ca #${id}`, time: '' };
    const start = sh.startTime ? sh.startTime.substring(0, 5) : '--:--';
    const end = sh.endTime ? sh.endTime.substring(0, 5) : '--:--';
    return { name: sh.name, time: `${start} - ${end}` };
  };

  const isOverShiftEndTime = (item) => {
    if (!item) return false;
    if ((item.approvedOTHours || 0) > 0) return true;
    if (!item.checkInAt || !item.checkOutAt) return false;

    const shift = shifts.find((s) => s.id === item.shiftId);
    const shHours = item.standardHours || 8.0;
    const actualH = item.actualHours || 0;

    if (actualH > shHours) return true;

    if (shift && shift.endTime && item.workDate) {
      const workDateStr = dayjs(item.workDate).format('YYYY-MM-DD');
      const shiftEnd = dayjs(`${workDateStr} ${shift.endTime}`);
      const checkOut = dayjs(item.checkOutAt);
      if (checkOut.isAfter(shiftEnd)) return true;
    }

    return false;
  };

  // Filter schedules
  const filteredSchedules = schedules.filter((item) => {
    if (selectedBranch && item.branchId !== selectedBranch) return false;
    if (selectedAccount && item.accountId !== selectedAccount) return false;
    if (selectedShift && item.shiftId !== selectedShift) return false;
    if (selectedStatus && (item.status || '').toLowerCase() !== selectedStatus.toLowerCase()) return false;
    if (selectedManagerApproved !== null && selectedManagerApproved !== undefined && item.managerApproved !== selectedManagerApproved) return false;
    if (selectedContractType) {
      const accContract = contracts.find((c) => c.accountId === item.accountId && (c.branchId === item.branchId || !c.branchId));
      const isPartTime = accContract?.type === 'Part-time' || accContract?.salaryType === 'Hourly' || accContract?.type === 'Bán thời gian';
      if (selectedContractType === 'FULL_TIME' && isPartTime) return false;
      if (selectedContractType === 'PART_TIME' && !isPartTime) return false;
    }
    if (searchDate) {
      const itemDate = dayjs(item.workDate).format('YYYY-MM-DD');
      const filterDate = dayjs(searchDate).format('YYYY-MM-DD');
      if (itemDate !== filterDate) return false;
    }
    return true;
  });

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedBranch(null);
    setSelectedAccount(null);
    setSelectedShift(null);
    setSelectedStatus(null);
    setSelectedManagerApproved(null);
    setSelectedContractType(null);
    setSearchDate(null);
    message.info('Đã xóa tất cả bộ lọc');
  };

  // Open Modal logic - Single Add/Edit
  const handleOpenModal = (type, record = null) => {
    setModalType(type);
    setEditingRecord(record);
    setIsModalOpen(true);

    if (type === 'edit' && record) {
      // Parse inputs
      const checkInVal = record.checkInAt ? dayjs(record.checkInAt) : null;
      const checkOutVal = record.checkOutAt ? dayjs(record.checkOutAt) : null;
      const baseHours = record.actualHours || 0;
      const otHours = record.approvedOTHours || 0;
      const totalActualHours = baseHours + otHours;

      form.setFieldsValue({
        accountId: record.accountId,
        branchId: record.branchId,
        shiftId: record.shiftId,
        code: record.code,
        workDate: record.workDate ? dayjs(record.workDate) : null,
        checkInTime: checkInVal,
        checkOutTime: checkOutVal,
        actualHours: totalActualHours > 0 ? totalActualHours : record.actualHours,
        status: normalizeStatusString(record.status),
        managerApproved: record.managerApproved,
        isHeadChef: record.isHeadChef || false,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: 'Pending',
        managerApproved: true,
        isHeadChef: false,
        workDate: dayjs(),
        branchId: defaultBranchId,
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
  };

  // Submit Handler - Single
  const handleSubmit = async (values) => {
    try {
      const workDateStr = values.workDate.format('YYYY-MM-DD');

      // Combine date and time
      let checkInAt = null;
      if (values.checkInTime) {
        checkInAt = dayjs(`${workDateStr} ${values.checkInTime.format('HH:mm:ss')}`).toISOString();
      }

      let checkOutAt = null;
      if (values.checkOutTime) {
        let outDt = dayjs(`${workDateStr} ${values.checkOutTime.format('HH:mm:ss')}`);
        if (values.checkInTime) {
          const inMins = values.checkInTime.hour() * 60 + values.checkInTime.minute();
          const outMins = values.checkOutTime.hour() * 60 + values.checkOutTime.minute();
          if (outMins <= inMins) {
            outDt = outDt.add(1, 'day');
          }
        }
        checkOutAt = outDt.toISOString();
      }

      // Validations
      const currentStatusNorm = (values.status || '').toLowerCase();
      if (['working', 'đang làm việc'].includes(currentStatusNorm)) {
        if (!values.checkInTime && !checkInAt) {
          message.error('Vui lòng chọn giờ Check-in để chuyển trạng thái sang "Đang làm việc"!');
          return;
        }
      }

      if (['completed', 'hoàn thành', 'đã hoàn thành'].includes(currentStatusNorm)) {
        if (!values.checkInTime && !checkInAt) {
          message.error('Vui lòng chọn giờ Check-in để chuyển trạng thái sang "Hoàn thành"!');
          return;
        }
        if (!values.checkOutTime && !checkOutAt) {
          message.error('Vui lòng chọn giờ Check-out để chuyển trạng thái sang "Hoàn thành"!');
          return;
        }
      }

      if (checkInAt && checkOutAt && dayjs(checkOutAt).isBefore(dayjs(checkInAt))) {
        message.error('Giờ check-out không thể trước giờ check-in!');
        return;
      }

      // Check if workDate exceeds contract validity period
      const activeContract = contracts.find(
        (c) => c.accountId === values.accountId &&
          (c.branchId === values.branchId || !c.branchId) &&
          (['active', 'hiệu lực'].includes((c.status || '').toLowerCase()))
      );

      if (activeContract) {
        const workDate = values.workDate;
        if (activeContract.startDate && workDate.isBefore(dayjs(activeContract.startDate), 'day')) {
          const accName = getAccountName(values.accountId);
          message.error(`Ngày làm việc (${workDate.format('DD/MM/YYYY')}) trước ngày bắt đầu hợp đồng (${dayjs(activeContract.startDate).format('DD/MM/YYYY')}) của nhân viên ${accName}!`);
          return;
        }
        if (activeContract.endDate && workDate.isAfter(dayjs(activeContract.endDate), 'day')) {
          const accName = getAccountName(values.accountId);
          message.error(`Ngày làm việc (${workDate.format('DD/MM/YYYY')}) vượt quá ngày hết hạn hợp đồng (${dayjs(activeContract.endDate).format('DD/MM/YYYY')}) của nhân viên ${accName}! Không thể tạo lịch làm việc.`);
          return;
        }

        // Validate shift applicability for employee salary type
        const selectedShiftObj = shifts.find((s) => s.id === values.shiftId);
        if (selectedShiftObj && selectedShiftObj.applicableTo && selectedShiftObj.applicableTo !== 'ALL') {
          const appTo = selectedShiftObj.applicableTo.toUpperCase();
          const isHourly = (activeContract.salaryType || '').toLowerCase() === 'hourly';
          if (appTo === 'FULL_TIME' && isHourly) {
            const accName = getAccountName(values.accountId);
            message.error(`Ca '${selectedShiftObj.name}' chỉ áp dụng cho nhân viên Toàn thời gian. Nhân viên '${accName}' là Bán thời gian!`);
            return;
          }
          if (appTo === 'PART_TIME' && !isHourly) {
            const accName = getAccountName(values.accountId);
            message.error(`Ca '${selectedShiftObj.name}' chỉ áp dụng cho nhân viên Bán thời gian. Nhân viên '${accName}' là Toàn thời gian!`);
            return;
          }
        }
      }

      // Check if employee already has a schedule for this shift on this date
      const duplicateExists = schedules.some((s) => {
        if (modalType === 'edit' && editingRecord && s.id === editingRecord.id) return false;
        const sameAccount = s.accountId === values.accountId;
        const sameShift = s.shiftId === values.shiftId;
        const sameDate = dayjs(s.workDate).format('YYYY-MM-DD') === workDateStr;
        return sameAccount && sameShift && sameDate;
      });

      if (duplicateExists) {
        const accName = getAccountName(values.accountId);
        const shiftDetails = getShiftDetails(values.shiftId);
        message.error(`Nhân viên ${accName} đã được phân công ca ${shiftDetails.name || ''} vào ngày ${values.workDate.format('DD/MM/YYYY')}! Không thể tạo trùng lịch làm việc.`);
        return;
      }

      const baseActualHours = (values.actualHours || 0) > (editingRecord?.approvedOTHours || 0)
        ? (values.actualHours || 0) - (editingRecord?.approvedOTHours || 0)
        : (values.actualHours || 0);

      const payload = {
        accountId: values.accountId,
        branchId: values.branchId,
        shiftId: values.shiftId,
        code: values.code || '',
        workDate: workDateStr,
        checkInAt,
        checkOutAt,
        actualHours: baseActualHours,
        status: values.status,
        managerApproved: values.managerApproved,
        isHeadChef: values.isHeadChef || false,
      };

      if (modalType === 'create') {
        const createPayload = {
          ...payload,
          createdBy: user?.id || 1,
        };
        await createWorkSchedule(createPayload);
        message.success('Tạo lịch làm việc thành công!');
      } else {
        const updatePayload = {
          ...payload,
          id: editingRecord.id,
          approvedOTHours: editingRecord?.approvedOTHours,
          otStatus: editingRecord?.otStatus,
          otNotes: editingRecord?.otNotes,
        };
        await updateWorkSchedule(updatePayload);
        message.success('Cập nhật lịch làm việc thành công!');
      }

      handleCloseModal();
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu lịch làm việc!';
      message.error(errorMsg);
    }
  };

  // Quick Inline Approve Switch
  const handleToggleApprove = async (record, checked) => {
    if (isLockApprovalStatus(record.status)) {
      message.error("Không thể sửa trạng thái Quản lý duyệt khi ca làm việc ở trạng thái 'Đang làm việc', 'Hoàn thành' hoặc 'Vắng mặt'!");
      return;
    }
    try {
      const updatePayload = {
        id: record.id,
        accountId: record.accountId,
        branchId: record.branchId,
        shiftId: record.shiftId,
        code: record.code,
        workDate: record.workDate,
        checkInAt: record.checkInAt,
        checkOutAt: record.checkOutAt,
        actualHours: record.actualHours,
        approvedOTHours: record.approvedOTHours,
        otStatus: record.otStatus,
        otNotes: record.otNotes,
        status: checked ? 'Approved' : record.status === 'Approved' ? 'Pending' : record.status,
        managerApproved: checked,
      };
      await updateWorkSchedule(updatePayload);
      message.success(checked ? 'Đã phê duyệt ca trực!' : 'Đã hủy phê duyệt ca trực!');
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Không thể thay đổi trạng thái phê duyệt!';
      message.error(errorMsg);
    }
  };

  // Delete Handler
  const handleDelete = async (id, reason) => {
    try {
      await deleteWorkSchedule(id, reason);
      message.success('Đã hủy ca làm việc và thông báo lý do cho nhân viên!');
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi xóa lịch làm việc!';
      message.error(errorMsg);
    }
  };

  const handleOpenCancelModal = (record) => {
    setCancelTarget(record);
    cancelForm.resetFields();
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async () => {
    try {
      const values = await cancelForm.validateFields();
      if (!cancelTarget) return;
      setCancelSubmitting(true);
      await handleDelete(cancelTarget.id, values.reason);
      setIsCancelModalOpen(false);
      setCancelTarget(null);
    } catch (err) {
      if (err?.errorFields) return; // validation error — antd đã tự hiển thị
      console.error(err);
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleOpenApproveLeaveModal = (item, employeeReason, empName) => {
    setApproveLeaveTarget({ item, employeeReason, empName });
    approveLeaveForm.resetFields();
    setIsApproveLeaveModalOpen(true);
  };

  const handleApproveLeaveSubmit = async () => {
    try {
      const values = await approveLeaveForm.validateFields();
      if (!approveLeaveTarget) return;
      setApproveLeaveSubmitting(true);
      const { item, employeeReason, empName } = approveLeaveTarget;
      const adminNote = (values.adminNote || '').trim();
      const newStatus = adminNote ? `LEAVE_APPROVED:${employeeReason}|${adminNote}` : `LEAVE_APPROVED:${employeeReason}`;
      await updateWorkSchedule({ ...item, status: newStatus, managerApproved: true });
      message.success(`🟢 Đã duyệt cho nhân viên ${empName} nghỉ làm ca này!`);
      setIsApproveLeaveModalOpen(false);
      setApproveLeaveTarget(null);
      loadData();
    } catch (err) {
      if (err?.errorFields) return; // validation error — antd đã tự hiển thị
      console.error(err);
      message.error('Lỗi khi duyệt nghỉ!');
    } finally {
      setApproveLeaveSubmitting(false);
    }
  };

  const handleOpenRejectShiftChangeModal = (target) => {
    setRejectShiftChangeTarget(target);
    rejectShiftChangeForm.resetFields();
    setIsRejectShiftChangeModalOpen(true);
  };

  const handleRejectShiftChangeSubmit = async () => {
    try {
      const values = await rejectShiftChangeForm.validateFields();
      if (!rejectShiftChangeTarget) return;
      setRejectShiftChangeSubmitting(true);
      const note = values.note.trim();

      if (rejectShiftChangeTarget.type === 'transfer') {
        const { item, senderId } = rejectShiftChangeTarget;
        await rejectShiftSwap(item.id, senderId, note);
      } else {
        const { item } = rejectShiftChangeTarget;
        await rejectShiftChangeRequest(item.id, note);
      }

      message.info('❌ Đã từ chối/hủy yêu cầu đổi ca.');
      setIsRejectShiftChangeModalOpen(false);
      setRejectShiftChangeTarget(null);
      loadData();
      loadShiftChangeRequests();
    } catch (err) {
      if (err?.errorFields) return; // validation error — antd đã tự hiển thị
      console.error(err);
      message.error(err?.response?.data?.message || 'Lỗi khi từ chối/hủy yêu cầu đổi ca!');
    } finally {
      setRejectShiftChangeSubmitting(false);
    }
  };

  // Submit Handler - Auto Assign
  const handleAutoAssignSubmit = async (values) => {
    if (autoAssignSubmitting) return;
    setAutoAssignSubmitting(true);
    setAutoAssignResult(null);
    try {
      const { branchId, shiftIds, dateRange, overwriteExisting } = values;
      if (!dateRange || dateRange.length < 2) {
        message.error('Vui lòng chọn khoảng thời gian phân ca!');
        return;
      }

      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const payload = {
        branchId,
        startDate,
        endDate,
        shiftIds: shiftIds && shiftIds.length > 0 ? shiftIds : null,
        overwriteExisting: !!overwriteExisting,
        createdBy: user?.id || 0,
      };

      const res = await autoAssignWorkSchedules(payload);
      const data = res.data;
      setAutoAssignResult(data);
      if (data.totalCreated > 0) {
        message.success(`Tự động phân ca thành công! Đã tạo mới ${data.totalCreated} ca làm việc.`);
        loadData();
      } else {
        message.warning('Không có ca làm việc nào được phân mới.');
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi phân ca tự động!');
    } finally {
      setAutoAssignSubmitting(false);
    }
  };

  // Submit Handler - Bulk Assign
  const handleBulkAssignSubmit = async (values) => {
    if (bulkAssignSubmitting) return;
    setBulkAssignSubmitting(true);
    try {
      const { accountIds, branchId, shiftId, dateRange } = values;
      if (!dateRange || dateRange.length < 2) {
        message.error('Vui lòng chọn khoảng ngày phân ca!');
        return;
      }

      const start = dateRange[0];
      const end = dateRange[1];

      // Check contract validity for bulk assign
      for (const accId of accountIds) {
        const activeContract = contracts.find(
          (c) => c.accountId === accId &&
            (c.branchId === branchId || !c.branchId) &&
            (['active', 'hiệu lực'].includes((c.status || '').toLowerCase()))
        );

        const accName = getAccountName(accId);

        if (!activeContract) {
          message.error(`Nhân viên ${accName} chưa có hợp đồng còn hiệu lực tại chi nhánh này!`);
          return;
        }

        const startDay = dayjs(start);
        const endDay = dayjs(end);

        if (activeContract.endDate) {
          const contractEndDate = dayjs(activeContract.endDate);
          if (startDay.isAfter(contractEndDate, 'day')) {
            message.error(`Khoảng ngày phân ca (${startDay.format('DD/MM/YYYY')} - ${endDay.format('DD/MM/YYYY')}) nằm ngoài thời hạn hợp đồng (hết hạn ngày ${contractEndDate.format('DD/MM/YYYY')}) của nhân viên ${accName}! Chỉ được phân ca trong thời hạn hợp đồng.`);
            return;
          }
        }

        if (activeContract.startDate) {
          const contractStartDate = dayjs(activeContract.startDate);
          if (endDay.isBefore(contractStartDate, 'day')) {
            message.error(`Khoảng ngày phân ca (${startDay.format('DD/MM/YYYY')} - ${endDay.format('DD/MM/YYYY')}) nằm trước ngày bắt đầu hợp đồng (${contractStartDate.format('DD/MM/YYYY')}) của nhân viên ${accName}! Chỉ được phân ca trong thời hạn hợp đồng.`);
            return;
          }
        }

        // Validate shift applicability
        const selectedShiftObj = shifts.find((s) => s.id === shiftId);
        if (selectedShiftObj && selectedShiftObj.applicableTo && selectedShiftObj.applicableTo !== 'ALL') {
          const appTo = selectedShiftObj.applicableTo.toUpperCase();
          const isHourly = (activeContract.salaryType || '').toLowerCase() === 'hourly';
          if (appTo === 'FULL_TIME' && isHourly) {
            message.error(`Ca '${selectedShiftObj.name}' chỉ áp dụng cho nhân viên Toàn thời gian. Nhân viên '${accName}' là Bán thời gian!`);
            return;
          }
          if (appTo === 'PART_TIME' && !isHourly) {
            message.error(`Ca '${selectedShiftObj.name}' chỉ áp dụng cho nhân viên Bán thời gian. Nhân viên '${accName}' là Toàn thời gian!`);
            return;
          }
        }
      }

      const workDates = [];
      let current = dayjs(start);
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        workDates.push(current.format('YYYY-MM-DD'));
        current = current.add(1, 'day');
      }

      const payload = {
        accountIds,
        branchId,
        shiftId,
        workDates,
        createdBy: user?.id || 1,
      };

      const res = await assignWorkSchedules(payload);
      const assignedCount = res.data?.length || 0;
      if (assignedCount === 0) {
        message.warning('Tất cả lịch làm việc trong thời hạn hợp đồng của nhân viên đã được phân công hoặc nằm ngoài thời hạn hợp đồng!');
      } else {
        message.success(`Đã phân ca thành công: tạo mới ${assignedCount} lịch làm việc trong thời hạn hợp đồng!`);
      }

      setIsBulkModalOpen(false);
      bulkForm.resetFields();
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi phân ca hàng loạt!';
      message.error(errorMsg);
    } finally {
      setBulkAssignSubmitting(false);
    }
  };



  // Columns for Table
  const baseColumns = [
    {
      title: 'Nhân viên',
      dataIndex: 'accountId',
      key: 'accountId',
      render: (id) => (
        <div>
          <strong style={{ color: '#e8442a' }}>{getAccountName(id)}</strong>
          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>ID: {id}</div>
        </div>
      ),
      sorter: (a, b) => getAccountName(a.accountId).localeCompare(getAccountName(b.accountId)),
    },
    ...(isOwnerOrAdmin
      ? [
        {
          title: 'Chi nhánh',
          dataIndex: 'branchId',
          key: 'branchId',
          width: 170,
          render: (id) => {
            const fullName = getBranchName(id);
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
      title: 'Ca trực',
      dataIndex: 'shiftId',
      key: 'shiftId',
      render: (id) => {
        const info = getShiftDetails(id);
        return (
          <div>
            <strong>{info.name}</strong>
            <div style={{ fontSize: '11px', color: '#1890ff' }}>
              <ClockCircleOutlined /> {info.time}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Ngày làm việc',
      dataIndex: 'workDate',
      key: 'workDate',
      render: (val) => dayjs(val).format('DD/MM/YYYY dddd'),
      sorter: (a, b) => dayjs(a.workDate).unix() - dayjs(b.workDate).unix(),
    },
    {
      title: 'Thời gian thực tế',
      key: 'actualTime',
      render: (_, record) => {
        const inTime = record.checkInAt ? dayjs(record.checkInAt).format('HH:mm') : '--';
        const outTime = record.checkOutAt ? dayjs(record.checkOutAt).format('HH:mm') : '--';
        return (
          <div>
            <div>Vào: {inTime} - Ra: {outTime}</div>
            {record.actualHours !== null && (
              <div style={{ fontSize: '11px', color: '#52c41a' }}>
                Tổng giờ: {record.actualHours} giờ
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const opt = getStatusOption(status);
        return <Tag color={opt.color}>{opt.label}</Tag>;
      },
    },
    {
      title: 'Quản lý duyệt',
      dataIndex: 'managerApproved',
      key: 'managerApproved',
      width: 140,
      render: (approved, record) => {
        const isLocked = isLockApprovalStatus(record.status);
        return (
          <Tooltip title={isLocked ? "Không thể đổi duyệt công khi ca đang làm việc, hoàn thành hoặc vắng mặt" : (approved ? "Bấm để bỏ duyệt công" : "Bấm để duyệt công")}>
            <Switch
              checked={approved}
              disabled={isLocked}
              onChange={(checked) => handleToggleApprove(record, checked)}
              checkedChildren="Đã duyệt"
              unCheckedChildren="Chờ duyệt"
              style={{ backgroundColor: approved && !isLocked ? '#52c41a' : undefined }}
            />
          </Tooltip>
        );
      },
    },
  ];

  const actionColumn = {
    title: 'Thao tác',
    key: 'actions',
    fixed: 'right',
    width: 110,
    render: (_, record) => {
      const canApproveOT = isOverShiftEndTime(record);
      return (
        <Space size="middle">
          {canApproveOT && (
            <Tooltip title="Duyệt OT & Kiểm tra POS">
              <Button
                type="text"
                icon={<SafetyCertificateOutlined style={{ color: '#fa8c16' }} />}
                onClick={() => handleOpenOTModal(record)}
              />
            </Tooltip>
          )}
          {record.checkInAt && accounts.some(a => a.id === record.accountId && (a.roleId === 6 || a.roleIds?.includes(6))) && (
            <Tooltip title="Xem nhật ký hoạt động">
              <Button
                type="text"
                icon={<SolutionOutlined style={{ color: '#13c2c2' }} />}
                onClick={() => handleOpenActivityLog(record)}
              />
            </Tooltip>
          )}
        <Tooltip title="Chỉnh sửa ca trực">
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#1890ff' }} />}
            onClick={() => handleOpenModal('edit', record)}
          />
        </Tooltip>
        <Tooltip title="Hủy ca làm việc">
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleOpenCancelModal(record)} />
        </Tooltip>
      </Space>
    );
  },
};

  const columns = isManager ? [...baseColumns, actionColumn] : baseColumns;

  // Calendar render helper
  const dateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const daySchedules = filteredSchedules.filter((item) => item.workDate === dateStr);

    // Group by shiftId
    const shiftGroups = {};
    daySchedules.forEach((item) => {
      const shiftId = item.shiftId;
      if (!shiftGroups[shiftId]) {
        shiftGroups[shiftId] = {
          shiftId,
          count: 0,
          pendingCount: 0,
          approvedCount: 0,
        };
      }
      shiftGroups[shiftId].count += 1;
      if (item.managerApproved) {
        shiftGroups[shiftId].approvedCount += 1;
      } else {
        shiftGroups[shiftId].pendingCount += 1;
      }
    });

    // Convert to array and sort by shift startTime/name
    const sortedShifts = Object.values(shiftGroups).map((group) => {
      const details = getShiftDetails(group.shiftId);
      return {
        ...group,
        name: details.name,
        startTime: details.startTime || '',
      };
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflow: 'hidden' }}>
        {sortedShifts.map((group) => {
          // If any schedule in this shift is pending, badge is warning (yellow), else success (green)
          const badgeStatus = group.pendingCount > 0 ? 'warning' : 'success';
          return (
            <li
              key={group.shiftId}
              style={{
                margin: '2px 0',
                padding: '2px 4px',
                borderRadius: '4px',
                background: '#fff2e8',
                borderLeft: '3px solid #ff7a45',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <Tooltip
                title={
                  <div>
                    <strong>Danh sách ca trực:</strong>
                    <ul style={{ paddingLeft: 16, margin: '4px 0 0 0' }}>
                      {daySchedules
                        .filter((item) => item.shiftId === group.shiftId)
                        .map((item) => (
                          <li key={item.id}>
                            {getAccountName(item.accountId)}
                          </li>
                        ))}
                    </ul>
                  </div>
                }
              >
                <div>
                  <Badge status={badgeStatus} />
                  <strong>{group.name}:</strong> {group.count} người
                </div>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    );
  };

  // Quick Add Shift from Grid Cell
  const handleQuickAddShift = (accountId, date) => {
    setModalType('create');
    setEditingRecord(null);
    setIsModalOpen(true);
    form.resetFields();
    form.setFieldsValue({
      accountId,
      workDate: dayjs(date),
      branchId: defaultBranchId,
      status: 'Pending',
      managerApproved: true,
    });
  };

  // Render individual Shift Card inside Weekly Grid
  const renderShiftCard = (item, isCompact = false) => {
    const shiftInfo = getShiftDetails(item.shiftId);
    const normSt = (item.status || '').toUpperCase();
    const leaveParsed = parseLeaveStatus(item.status);
    const isLeaveRequest = !!leaveParsed?.isPending;
    const isLeaveApproved = !!leaveParsed?.isApproved;

    let bgColor = '#fffbe6';
    let borderColor = '#ffe58f';
    let textColor = '#873800';

    if (normSt === 'COMPLETED' || normSt === 'HOÀN THÀNH') {
      bgColor = '#f6ffed';
      borderColor = '#b7eb8f';
      textColor = '#274e13';
    } else if (normSt === 'WORKING' || normSt === 'ĐANG LÀM VIỆC') {
      bgColor = '#e6f7ff';
      borderColor = '#91d5ff';
      textColor = '#003a8c';
    } else if (normSt === 'ABSENT' || normSt === 'VẮNG MẮT' || (item.checkInAt && !item.checkOutAt)) {
      bgColor = '#fff2f0';
      borderColor = '#ffccc7';
      textColor = '#a8071a';
    } else if (isLeaveApproved) {
      bgColor = '#f9f0ff';
      borderColor = '#d3adf7';
      textColor = '#531dab';
    } else if (isLeaveRequest) {
      bgColor = '#fff0f6';
      borderColor = '#ffadd2';
      textColor = '#9e1068';
    }

    const checkInStr = item.checkInAt ? dayjs(item.checkInAt).format('HH:mm') : null;
    const checkOutStr = item.checkOutAt ? dayjs(item.checkOutAt).format('HH:mm') : null;
    let timeText = shiftInfo.time;
    if (checkInStr || checkOutStr) {
      timeText = `${checkInStr || '--'} 📲 - ${checkOutStr || '--'} 📲`;
    }

    const shHours = item.standardHours || 8.0;
    const actualH = item.actualHours || 0;
    const excessH = Math.max(0, actualH - shHours);
    const hasApprovedOT = (item.approvedOTHours || 0) > 0;
    const isOverEnd = isOverShiftEndTime(item);
    const isUnapprovedExcess = isOverEnd && !hasApprovedOT;

    return (
      <div
        key={item.id}
        onClick={(e) => {
          e.stopPropagation();
          handleOpenModal('edit', item);
        }}
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          color: textColor,
          borderRadius: '6px',
          padding: isCompact ? '4px 6px' : '6px 8px',
          marginBottom: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {shiftInfo.name}
            {item.isHeadChef && (
              <Tooltip title="Bếp trưởng phụ trách ca này">
                <span style={{ marginLeft: 4 }}>👑</span>
              </Tooltip>
            )}
          </span>
          {(hasApprovedOT || isUnapprovedExcess) && (
            <Tooltip title="Bấm để mở Modal duyệt OT">
              <SafetyCertificateOutlined
                style={{ color: '#fa8c16', fontSize: '13px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenOTModal(item);
                }}
              />
            </Tooltip>
          )}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          ({timeText})
        </div>

        {leaveParsed && (
          <Tooltip title="Bấm để xem chi tiết đơn xin nghỉ">
            <div
              onClick={(e) => {
                e.stopPropagation();
                setLeaveDetailTarget({ item, parsed: leaveParsed });
                setIsLeaveDetailModalOpen(true);
              }}
              style={{
                marginTop: 2, fontSize: '10px', fontStyle: 'italic', opacity: 0.9,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'pointer',
              }}
            >
              💬 {isLeaveRequest ? 'Chờ duyệt: ' : 'Lý do: '}{leaveParsed.employeeReason}{leaveParsed.adminNote ? ' 📝' : ''}
            </div>
          </Tooltip>
        )}

        {hasApprovedOT && (
          <div style={{ marginTop: 2 }}>
            <Tag color="orange" style={{ margin: 0, padding: '0 4px', fontSize: '10px', lineHeight: '16px' }}>
              +{item.approvedOTHours}h OT
            </Tag>
          </div>
        )}

        {isUnapprovedExcess && (
          <div style={{ marginTop: 2 }}>
            <Tag
              color="volcano"
              style={{ margin: 0, padding: '0 4px', fontSize: '10px', lineHeight: '16px', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenOTModal(item);
              }}
            >
              ⚠️ Duyệt OT (+{excessH.toFixed(1)}h)
            </Tag>
          </div>
        )}

        {/* Activity Log Button (Waiter + Checked In) */}
        {item.checkInAt && accounts.some(a => a.id === item.accountId && (a.roleId === 6 || a.roleIds?.includes(6))) && (
          <div style={{ marginTop: 2 }}>
            <Tag
              color="blue"
              icon={<SolutionOutlined />}
              style={{ margin: 0, padding: '0 4px', fontSize: '10px', lineHeight: '16px', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenActivityLog(item);
              }}
            >
              Xem nhật ký
            </Tag>
          </div>
        )}
      </div>
    );
  };

  // Render Matrix Weekly Roster Grid
  const renderWeeklyGrid = () => {
    const isCurrentWeek = currentWeekStart.isSame(dayjs().startOf('isoWeek'), 'week');

    const displayAccounts = contractedAccounts.filter((acc) => {
      if (selectedAccount && acc.id !== selectedAccount) return false;
      if (selectedContractType) {
        const accContract = contracts.find(
          (c) => c.accountId === acc.id && (c.branchId === selectedBranch || !c.branchId)
        );
        const isPartTime =
          accContract?.type === 'Part-time' ||
          accContract?.salaryType === 'Hourly' ||
          accContract?.type === 'Bán thời gian';
        if (selectedContractType === 'FULL_TIME' && isPartTime) return false;
        if (selectedContractType === 'PART_TIME' && !isPartTime) return false;
      }
      if (searchEmpText) {
        const q = searchEmpText.toLowerCase();
        const matchName = acc.name?.toLowerCase().includes(q);
        const matchId = String(acc.id).includes(q);
        const matchPhone = acc.phone?.includes(q);
        if (!matchName && !matchId && !matchPhone) return false;
      }
      return true;
    });

    return (
      <div className="weekly-roster-container" style={{ background: '#fff', borderRadius: '12px', padding: '16px' }}>
        {/* Top Control Bar matching reference image */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          {/* Left Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Button icon={<FilterOutlined />} style={{ borderRadius: '6px' }} title="Bộ lọc" />

            <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', borderRadius: '6px', padding: '2px 4px' }}>
              <Button type="text" size="small" icon={<LeftOutlined />} onClick={() => setCurrentWeekStart((prev) => prev.subtract(1, 'week'))} />
              <div style={{ padding: '0 8px', fontWeight: 600, fontSize: '13px', color: '#1f2937' }}>
                Tuần {currentWeekStart.format('WW')}-{currentWeekStart.format('YYYY')} ({currentWeekStart.format('DD/MM')} - {currentWeekStart.add(6, 'day').format('DD/MM')})
              </div>
              <Button type="text" size="small" icon={<RightOutlined />} onClick={() => setCurrentWeekStart((prev) => prev.add(1, 'week'))} />
            </div>

            <Button
              size="middle"
              style={{ borderRadius: '6px', color: isCurrentWeek ? '#1890ff' : undefined, borderColor: isCurrentWeek ? '#91d5ff' : undefined }}
              onClick={() => setCurrentWeekStart(dayjs().startOf('isoWeek'))}
            >
              Hôm nay
            </Button>

            <Select
              placeholder="Ca làm ∨"
              allowClear
              style={{ width: 130 }}
              value={selectedShift}
              onChange={(val) => setSelectedShift(val)}
            >
              {shifts.map((s) => (
                <Select.Option key={s.id} value={s.id}>
                  {s.name}
                </Select.Option>
              ))}
            </Select>

            <Select
              placeholder="Loại nhân viên ∨"
              allowClear
              style={{ width: 155 }}
              value={selectedContractType}
              onChange={(val) => setSelectedContractType(val)}
            >
              <Select.Option value="FULL_TIME">Toàn thời gian</Select.Option>
              <Select.Option value="PART_TIME">Bán thời gian</Select.Option>
            </Select>

            <Input
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Q Tìm kiếm nhân viên..."
              allowClear
              value={searchEmpText}
              onChange={(e) => setSearchEmpText(e.target.value)}
              style={{ width: 190, borderRadius: '6px' }}
            />
          </div>


        </div>

        {/* Matrix Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#fff' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '210px', borderRight: '1px solid #f0f0f0', color: '#595959', fontWeight: 700 }}>
                  Nhân viên ({displayAccounts.length})
                </th>
                {weekDays.map((day, idx) => {
                  const isToday = day.isSame(dayjs(), 'day');
                  const dayName = idx === 6 ? 'CN' : `T${idx + 2}`;
                  const formattedDate = day.format('DD/MM');
                  return (
                    <th
                      key={day.format('YYYY-MM-DD')}
                      style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        minWidth: '125px',
                        borderRight: idx === 6 ? 'none' : '1px solid #f0f0f0',
                        background: isToday ? '#e6f7ff' : undefined,
                        color: isToday ? '#1890ff' : '#262626',
                        fontWeight: isToday ? 800 : 600,
                      }}
                    >
                      <div>{dayName} {formattedDate}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#8c8c8c' }}>
                    Không tìm thấy nhân viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                displayAccounts.map((acc) => {
                  const primaryRoleId = acc.roleIds && acc.roleIds.length > 0 ? acc.roleIds[0] : (acc.roleId || 6);
                  const roleInfo = ROLES_MAP[primaryRoleId] || { label: 'Nhân viên', color: 'default' };

                  return (
                    <tr key={acc.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 12px', borderRight: '1px solid #f0f0f0', background: '#fafafa', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar
                            size={34}
                            src={acc.avatarImage || undefined}
                            icon={!acc.avatarImage ? <UserOutlined /> : undefined}
                            style={{ backgroundColor: acc.avatarImage ? undefined : '#1890ff', flexShrink: 0 }}
                          />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 700, color: '#1f2937', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {acc.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Tag color={roleInfo.color} style={{ margin: 0, padding: '0 4px', fontSize: '10px', lineHeight: '16px' }}>
                                {roleInfo.label}
                              </Tag>
                            </div>
                          </div>
                        </div>
                      </td>

                      {weekDays.map((day) => {
                        const dateStr = day.format('YYYY-MM-DD');
                        const empDaySchedules = filteredSchedules.filter(
                          (s) => s.accountId === acc.id && dayjs(s.workDate).format('YYYY-MM-DD') === dateStr
                        );
                        const isToday = day.isSame(dayjs(), 'day');

                        return (
                          <td
                            key={dateStr}
                            style={{
                              padding: '6px',
                              verticalAlign: 'top',
                              borderRight: '1px solid #f0f0f0',
                              background: isToday ? '#fafafa' : '#fff',
                              minHeight: '65px',
                            }}
                          >
                            {empDaySchedules.length === 0 ? (
                              <div
                                onClick={() => handleQuickAddShift(acc.id, dateStr)}
                                style={{
                                  height: '52px',
                                  borderRadius: '6px',
                                  border: '1px dashed transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: '#bfbfbf',
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = '#1890ff';
                                  e.currentTarget.style.color = '#1890ff';
                                  e.currentTarget.style.backgroundColor = '#e6f7ff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = 'transparent';
                                  e.currentTarget.style.color = '#bfbfbf';
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title="Bấm để phân ca trực"
                              >
                                <PlusOutlined style={{ fontSize: '14px' }} />
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {[...empDaySchedules]
                                  .sort((a, b) => (a.shiftId ?? 0) - (b.shiftId ?? 0))
                                  .map((s) => renderShiftCard(s))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Legend Bar matching system STATUS_OPTIONS */}
        <div
          style={{
            marginTop: '16px',
            padding: '10px 14px',
            background: '#fafafa',
            borderRadius: '8px',
            border: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '20px',
            fontSize: '12px',
            color: '#595959',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#faad14' }} />
            <span>Chờ thực hiện</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#1890ff' }} />
            <span>Đã duyệt ca</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#13c2c2' }} />
            <span>Đang làm việc</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#52c41a' }} />
            <span>Hoàn thành</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#ff4d4f' }} />
            <span>Vắng mặt</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#722ed1' }} />
            <span>Đã xin nghỉ</span>
          </div>
        </div>
      </div>
    );
  };

  // Tách riêng "Đơn xin nghỉ" và "Đổi ca" thành 2 tab thay vì 1 khối luôn hiện
  // và phình to vô hạn phía trên lịch — dễ theo dõi hơn, giống cách trang Trả món tách tab.
  const pendingLeaveRequests = schedules.filter((s) => s.status?.startsWith('LEAVE_REQUEST'));
  const pendingTransferRequests = schedules.filter((s) => s.status?.startsWith('TRANSFER_PENDING'));
  const totalShiftChangeCount = pendingTransferRequests.length + shiftChangeRequests.length;

  const leaveRequestsTab = (
    <Card style={{ borderRadius: 12 }}>
      {pendingLeaveRequests.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '24px 0' }}>
          Không có đơn xin nghỉ nào đang chờ duyệt.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pendingLeaveRequests.map((item) => {
            const parts = (item.status || '').split(':');
            const reason = parts.slice(1).join(':') || 'Xin nghỉ phép';
            const empName = getAccountName(item.accountId);
            const shiftInfo = getShiftDetails(item.shiftId);
            return (
              <div key={item.id} style={{
                background: '#fff', border: '1px solid #ffccc7', borderRadius: '6px', padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
              }}>
                <div>
                  <Tag color="purple">🕒 XIN NGHỈ</Tag>
                  <strong>{empName}</strong> xin nghỉ ca <strong>{shiftInfo.name} ({shiftInfo.time})</strong> ngày <strong>{dayjs(item.workDate).format('DD/MM/YYYY')}</strong>.
                  <div style={{ fontSize: '13px', color: '#595959', marginTop: 4 }}>💬 Lý do: <em>{reason}</em></div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    type="primary"
                    size="small"
                    style={{ background: '#722ed1', borderColor: '#722ed1', fontWeight: 'bold' }}
                    onClick={() => handleOpenApproveLeaveModal(item, reason, empName)}
                  >
                    Duyệt nghỉ
                  </Button>
                  <Button danger size="small" onClick={async () => {
                    try {
                      await updateWorkSchedule({ ...item, status: 'APPROVED', managerApproved: true });
                      message.info(`❌ Đã từ chối đơn xin nghỉ của ${empName}.`);
                      loadData();
                    } catch (e) { message.error('Lỗi từ chối!'); }
                  }}>
                    Từ chối
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  const shiftChangeApprovalTab = (
    <Card style={{ borderRadius: 12 }}>
      {totalShiftChangeCount === 0 ? (
        <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '24px 0' }}>
          Không có yêu cầu đổi ca nào đang chờ duyệt.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pendingTransferRequests.map((item) => {
            const parts = (item.status || '').split(':');
            const isPendingEmp = item.status.startsWith('TRANSFER_PENDING_EMP');
            const senderId = Number(parts[1]) || (isPendingEmp ? undefined : item.accountId);
            const senderName = getAccountName(senderId);
            const receiverName = getAccountName(item.accountId);
            const shiftInfo = getShiftDetails(item.shiftId);
            return (
              <div key={item.id} style={{
                background: '#fff', border: '1px solid #ffe58f', borderRadius: '6px', padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
              }}>
                <div>
                  <Tag color="gold">🔄 ĐỔI CA LÀM</Tag>
                  <strong>{senderName}</strong> ➔ <strong>{receiverName}</strong>
                  {isPendingEmp ? (
                    <span style={{ color: '#fa8c16', marginLeft: 8 }}>(Đang chờ {receiverName} xác nhận)</span>
                  ) : (
                    <span style={{ color: '#52c41a', marginLeft: 8 }}>(2 NV đã đồng ý)</span>
                  )}
                  <div style={{ fontSize: '13px', color: '#595959', marginTop: 4 }}>
                    📅 Ca: <strong>{shiftInfo.name} ({shiftInfo.time})</strong> - Ngày: <strong>{dayjs(item.workDate).format('DD/MM/YYYY')}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button type="primary" size="small" style={{ background: '#fa8c16', borderColor: '#fa8c16', fontWeight: 'bold' }}
                    disabled={isPendingEmp}
                    onClick={async () => {
                      try {
                        await updateWorkSchedule({ ...item, status: 'APPROVED', managerApproved: true });
                        message.success(`🟢 Đã duyệt đổi ca chính thức cho ${receiverName}!`);
                        loadData();
                      } catch (e) { message.error('Lỗi khi duyệt đổi ca!'); }
                    }}>
                    Duyệt đổi ca
                  </Button>
                  <Button
                    danger
                    size="small"
                    onClick={() => handleOpenRejectShiftChangeModal({ type: 'transfer', item, senderId, senderName, receiverName })}
                  >
                    {isPendingEmp ? 'Hủy yêu cầu' : 'Từ chối'}
                  </Button>
                </div>
              </div>
            );
          })}

          {shiftChangeRequests.map((item) => (
            <div key={`shift-change-${item.id}`} style={{
              background: '#fff', border: '1px solid #87e8de', borderRadius: '6px', padding: '10px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
            }}>
              <div>
                <Tag color="cyan">🕘 ĐỔI GIỜ CA</Tag>
                <strong>{item.accountName}</strong> muốn đổi ca ngày <strong>{dayjs(item.workDate).format('DD/MM/YYYY')}</strong> từ{' '}
                <strong>{item.oldShiftName} ({item.oldStartTime?.slice(0, 5)}-{item.oldEndTime?.slice(0, 5)})</strong> sang{' '}
                <strong>{item.newShiftName} ({item.newStartTime?.slice(0, 5)}-{item.newEndTime?.slice(0, 5)})</strong>
                {item.isNightShift && <Tag color="purple" style={{ marginLeft: 6 }}>Ca đêm</Tag>}
                {item.reason && (
                  <div style={{ fontSize: '13px', color: '#595959', marginTop: 4 }}>💬 Lý do: <em>{item.reason}</em></div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button type="primary" size="small" style={{ background: '#13c2c2', borderColor: '#13c2c2', fontWeight: 'bold' }} onClick={async () => {
                  try {
                    await approveShiftChangeRequest(item.id);
                    message.success(`🟢 Đã duyệt đổi giờ ca cho ${item.accountName}!`);
                    loadData();
                    loadShiftChangeRequests();
                  } catch (e) { message.error(e.response?.data?.message || 'Lỗi khi duyệt đổi ca!'); }
                }}>
                  Duyệt
                </Button>
                <Button
                  danger
                  size="small"
                  onClick={() => handleOpenRejectShiftChangeModal({ type: 'change', item, empName: item.accountName })}
                >
                  Từ chối
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <div className="work-schedule-page animate-fade-in" style={{ padding: '0px 0' }}>
      {/* Page Header */}
      <Card
        style={{
          marginBottom: 16,
          background: 'linear-gradient(135deg, #fffbfb 0%, #fff7f6 100%)',
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
              <CalendarOutlined />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#e8442a', fontWeight: 700 }}>
                Quản Lý Phân Ca & Lịch Làm Việc
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                Thiết lập ca trực, duyệt giờ công thực tế và phân lịch làm việc cho từng nhân viên theo chi nhánh
              </p>
            </div>
          </div>

          <Space size="middle">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadData();
                message.success('Đã làm mới dữ liệu!');
              }}
            >
              Làm mới
            </Button>
            {isManager && (
              <>
                <Button
                  type="default"
                  icon={<ThunderboltOutlined />}
                  size="large"
                  style={{
                    borderRadius: '8px',
                    borderColor: '#722ed1',
                    color: '#722ed1',
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    setIsAutoAssignModalOpen(true);
                    setAutoAssignResult(null);
                    autoAssignForm.resetFields();
                    autoAssignForm.setFieldsValue({
                      branchId: managerBranchId || defaultBranchId,
                      dateRange: [currentWeekStart, currentWeekStart.add(6, 'day')],
                    });
                  }}
                >
                  Tự động phân ca
                </Button>
                <Button
                  type="default"
                  icon={<TeamOutlined />}
                  size="large"
                  style={{
                    borderRadius: '8px',
                    borderColor: '#e8442a',
                    color: '#e8442a',
                  }}
                  onClick={() => {
                    setIsBulkModalOpen(true);
                    bulkForm.resetFields();
                    bulkForm.setFieldsValue({ branchId: defaultBranchId });
                  }}
                >
                  Phân ca hàng loạt
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
                  onClick={() => handleOpenModal('create')}
                >
                  Thêm ca trực lẻ
                </Button>
              </>
            )}
          </Space>
        </div>
      </Card>

      {/* Main Container Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        items={[
          {
            key: 'grid',
            label: (
              <span>
                <CalendarOutlined /> Lịch tuần
              </span>
            ),
            children: renderWeeklyGrid(),
          },
          ...((isManager || isOwnerOrAdmin) ? [
            {
              key: 'leave-requests',
              label: (
                <span>
                  <SafetyCertificateOutlined /> Duyệt đơn xin nghỉ{pendingLeaveRequests.length > 0 && <Badge count={pendingLeaveRequests.length} style={{ marginLeft: 6 }} />}
                </span>
              ),
              children: leaveRequestsTab,
            },
            {
              key: 'shift-change-requests',
              label: (
                <span>
                  <SafetyCertificateOutlined /> Duyệt đổi ca{totalShiftChangeCount > 0 && <Badge count={totalShiftChangeCount} style={{ marginLeft: 6 }} />}
                </span>
              ),
              children: shiftChangeApprovalTab,
            },
          ] : []),
        ]}
      />

      {/* SINGLE Create / Edit Modal Form */}
      <Modal
        maskClosable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: '#e8442a' }}>
            <CalendarOutlined />
            <span>{modalType === 'create' ? 'TẠO MỚI LỊCH PHÂN CA' : 'CHỈNH SỬA CA LÀM VIỆC'}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        width={680}
        okText={modalType === 'create' ? 'Tạo ca' : 'Cập nhật'}
        cancelText="Hủy bỏ"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #e8442a, #ff8c42)',
            border: 'none',
            borderRadius: '6px',
          },
        }}
        cancelButtonProps={{ style: { borderRadius: '6px' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
          onValuesChange={(changedValues, allValues) => {
            if (changedValues.checkInTime || changedValues.checkOutTime) {
              if (allValues.checkInTime && allValues.checkOutTime) {
                let diff = allValues.checkOutTime.diff(allValues.checkInTime, 'hour', true);
                if (diff <= 0) {
                  diff += 24; // Ca vắt qua đêm (VD: 16:00 đến 00:00 = 8h)
                }
                if (diff > 0) {
                  const otH = editingRecord?.approvedOTHours || 0;
                  form.setFieldsValue({ actualHours: parseFloat((diff + otH).toFixed(2)) });
                }
              }
            }
          }}
        >
          {/* Row 1: Employee & Branch */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="accountId"
              label="Nhân viên (Có hợp đồng)"
              rules={[{ required: true, message: 'Vui lòng chọn nhân viên!' }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="Tìm kiếm theo tên, ID, SĐT, chức danh..."
                showSearch
                filterOption={(input, option) => {
                  if (!input) return true;
                  if (option?.children || option?.value === undefined) return true;
                  const searchValue = option?.searchValue || '';
                  return searchValue.toLowerCase().includes(input.toLowerCase());
                }}
                optionLabelProp="label"
                dropdownStyle={{ maxHeight: 360 }}
              >
                {groupedStaffAccounts.map(([roleKey, group]) => (
                  <Select.OptGroup
                    key={roleKey}
                    label={
                      <div style={{ color: '#e8442a', fontWeight: 700, fontSize: '12px', letterSpacing: '0.5px', padding: '2px 0' }}>
                        {group.label} ({group.items.length})
                      </div>
                    }
                  >
                    {group.items.map((a) => {
                      const primaryRoleId = a.roleIds && a.roleIds.length > 0 ? a.roleIds[0] : (a.roleId || 6);
                      const roleInfo = ROLES_MAP[primaryRoleId] || { label: 'Nhân viên', color: 'default' };
                      const searchValue = `${a.name} ${a.id} ${a.phone || ''} ${a.email || ''} ${roleInfo.label}`;

                      return (
                        <Select.Option
                          key={a.id}
                          value={a.id}
                          label={`${a.name} (Mã: #${a.id})`}
                          searchValue={searchValue}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Avatar
                                size={28}
                                src={a.avatarImage || undefined}
                                icon={!a.avatarImage ? <UserOutlined /> : undefined}
                                style={{ backgroundColor: a.avatarImage ? undefined : '#e8442a', flexShrink: 0 }}
                              />
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937', lineHeight: '1.2' }}>
                                  {a.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                  Mã: #{a.id} {a.phone ? `• SĐT: ${a.phone}` : ''}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {isAccountPartTime(a.id) ? (
                                <Tag color="purple" style={{ margin: 0, fontSize: '10px', borderRadius: '4px' }}>Bán thời gian</Tag>
                              ) : (
                                <Tag color="blue" style={{ margin: 0, fontSize: '10px', borderRadius: '4px' }}>Toàn thời gian</Tag>
                              )}
                              <Tag color={roleInfo.color} style={{ margin: 0, fontSize: '11px', borderRadius: '4px' }}>
                                {roleInfo.label}
                              </Tag>
                            </div>
                          </div>
                        </Select.Option>
                      );
                    })}
                  </Select.OptGroup>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="branchId"
              label="Chi nhánh làm việc"
              rules={[{ required: true, message: 'Vui lòng chọn chi nhánh!' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Chọn chi nhánh..." disabled={isManager}>
                {allowedBranches.map((b) => (
                  <Select.Option key={b.id} value={b.id}>
                    {b.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* Row 2: Shift & WorkDate */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="shiftId"
              label="Ca làm việc"
              rules={[{ required: true, message: 'Vui lòng chọn ca!' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Chọn ca trực...">
                {shifts.map((s) => (
                  <Select.Option key={s.id} value={s.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{s.name} ({s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)})</span>
                      {s.applicableTo === 'FULL_TIME' && <Tag color="blue" style={{ marginLeft: 6 }}>Toàn thời gian</Tag>}
                      {s.applicableTo === 'PART_TIME' && <Tag color="purple" style={{ marginLeft: 6 }}>Bán thời gian</Tag>}
                      {(!s.applicableTo || s.applicableTo === 'ALL') && <Tag color="default" style={{ marginLeft: 6 }}>Tất cả</Tag>}
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="workDate"
              label="Ngày làm việc"
              rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </div>

          <Divider orientation="left" style={{ margin: '12px 0 16px 0', fontSize: '14px', color: '#8c8c8c' }}>
            Thời gian Check-in / Out thực tế (Tùy chọn)
          </Divider>

          {/* Row 3: Checkin & Checkout */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="checkInTime" label="Giờ Check-in" style={{ flex: 1 }}>
              <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Chọn giờ vào" />
            </Form.Item>

            <Form.Item name="checkOutTime" label="Giờ Check-out" style={{ flex: 1 }}>
              <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Chọn giờ ra" />
            </Form.Item>
          </div>

          {/* Row 4: Actual Hours, Status & Manager Approved */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="actualHours"
              label={
                editingRecord?.approvedOTHours > 0
                  ? `Tổng giờ làm việc thực tế (Đã cộng ${editingRecord.approvedOTHours}h OT)`
                  : "Tổng giờ làm việc thực tế"
              }
              style={{ flex: 1 }}
            >
              <InputNumber min={0} max={24} step={0.5} style={{ width: '100%' }} placeholder="Tự động tính từ Check-in/out" disabled />
            </Form.Item>

            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Đổi trạng thái...">
                {STATUS_OPTIONS.map((st) => (
                  <Select.Option key={st.value} value={st.value}>
                    {st.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="managerApproved"
              label="Quản lý duyệt công"
              valuePropName="checked"
              style={{ flex: 1 }}
            >
              <Switch
                checkedChildren="Đã duyệt công"
                unCheckedChildren="Chờ duyệt công"
                disabled={isLockApprovalStatus(editingRecord?.status)}
                style={{ marginTop: 4 }}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="isHeadChef"
            valuePropName="checked"
            tooltip="Mỗi ca chỉ có 1 bếp trưởng — chọn người mới sẽ tự bỏ đánh dấu của người trước đó trong cùng ca."
          >
            <Checkbox>Bếp trưởng phụ trách ca này</Checkbox>
          </Form.Item>

          {modalType === 'edit' && editingRecord && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #ffd591', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbe6', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ffe58f' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#d4380d', fontSize: '13px' }}>
                  <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                  Phê duyệt làm thêm giờ (OT) & Đơn hàng POS:
                </div>
                <div style={{ fontSize: '12px', color: '#595959', marginTop: 2 }}>
                  Số giờ OT được duyệt: <Tag color="orange">{editingRecord.approvedOTHours || 0} giờ</Tag>
                  {editingRecord.otStatus && <Tag color="blue">{editingRecord.otStatus}</Tag>}
                </div>
              </div>
              <Button
                type="primary"
                icon={<SafetyCertificateOutlined />}
                style={{ background: 'linear-gradient(135deg, #fa8c16, #ffa940)', border: 'none', borderRadius: '6px' }}
                onClick={() => {
                  setIsModalOpen(false);
                  handleOpenOTModal(editingRecord);
                }}
              >
                Mở Duyệt OT & POS
              </Button>
            </div>
          )}
        </Form>
      </Modal>

      {/* BULK Assign Modal Form */}
      <Modal
        maskClosable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: '#e8442a' }}>
            <TeamOutlined />
            <span>PHÂN CA HÀNG LOẠT</span>
          </div>
        }
        open={isBulkModalOpen}
        onCancel={() => {
          if (bulkAssignSubmitting) return;
          setIsBulkModalOpen(false);
          bulkForm.resetFields();
        }}
        onOk={() => bulkForm.submit()}
        confirmLoading={bulkAssignSubmitting}
        width={720}
        okText="Tiến hành lập lịch"
        cancelText="Hủy"
        okButtonProps={{
          disabled: bulkAssignSubmitting,
          style: {
            background: 'linear-gradient(135deg, #e8442a, #ff8c42)',
            border: 'none',
            borderRadius: '6px',
          },
        }}
        cancelButtonProps={{ disabled: bulkAssignSubmitting, style: { borderRadius: '6px' } }}
      >
        <Form bulkForm={bulkForm} form={bulkForm} layout="vertical" onFinish={handleBulkAssignSubmit} style={{ marginTop: 16 }}>
          {/* Employees picker (multiselect) */}
          <Form.Item
            name="accountIds"
            label="Chọn danh sách nhân viên tham gia ca trực"
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất một nhân viên!' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn các nhân viên (hoặc gõ tên, ID, SĐT)..."
              showSearch
              filterOption={(input, option) => {
                if (!input) return true;
                const searchValue = option?.searchValue || '';
                return searchValue.toLowerCase().includes(input.toLowerCase());
              }}
              optionLabelProp="label"
              style={{ width: '100%' }}
              dropdownStyle={{ maxHeight: 360 }}
            >
              {groupedStaffAccounts.map(([roleKey, group]) => (
                <Select.OptGroup
                  key={roleKey}
                  label={
                    <div style={{ color: '#e8442a', fontWeight: 700, fontSize: '12px', letterSpacing: '0.5px', padding: '2px 0' }}>
                      {group.label} ({group.items.length})
                    </div>
                  }
                >
                  {group.items.map((a) => {
                    const primaryRoleId = a.roleIds && a.roleIds.length > 0 ? a.roleIds[0] : (a.roleId || 6);
                    const roleInfo = ROLES_MAP[primaryRoleId] || { label: 'Nhân viên', color: 'default' };
                    const searchValue = `${a.name} ${a.id} ${a.phone || ''} ${a.email || ''} ${roleInfo.label}`;

                    return (
                      <Select.Option
                        key={a.id}
                        value={a.id}
                        label={`${a.name} (#${a.id})`}
                        searchValue={searchValue}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar
                              size={28}
                              src={a.avatarImage || undefined}
                              icon={!a.avatarImage ? <UserOutlined /> : undefined}
                              style={{ backgroundColor: a.avatarImage ? undefined : '#e8442a', flexShrink: 0 }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937', lineHeight: '1.2' }}>
                                {a.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                Mã: #{a.id} {a.phone ? `• SĐT: ${a.phone}` : ''}
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

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="branchId"
              label="Chọn chi nhánh làm việc"
              rules={[{ required: true, message: 'Vui lòng chọn chi nhánh!' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Chọn chi nhánh..." disabled={isManager}>
                {allowedBranches.map((b) => (
                  <Select.Option key={b.id} value={b.id}>
                    {b.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="shiftId"
              label="Chọn ca làm việc"
              rules={[{ required: true, message: 'Vui lòng chọn ca!' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Chọn ca trực...">
                {shifts.map((s) => (
                  <Select.Option key={s.id} value={s.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{s.name} ({s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)})</span>
                      {s.applicableTo === 'FULL_TIME' && <Tag color="blue" style={{ marginLeft: 6 }}>Toàn thời gian</Tag>}
                      {s.applicableTo === 'PART_TIME' && <Tag color="purple" style={{ marginLeft: 6 }}>Bán thời gian</Tag>}
                      {(!s.applicableTo || s.applicableTo === 'ALL') && <Tag color="default" style={{ marginLeft: 6 }}>Tất cả</Tag>}
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* Date range picker */}
          <Form.Item
            name="dateRange"
            label="Chọn thời gian lập lịch (Lập lịch cho toàn bộ các ngày trong khoảng này)"
            rules={[{ required: true, message: 'Vui lòng chọn khoảng thời gian!' }]}
          >
            <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ padding: '8px 12px', background: '#e6f7ff', borderRadius: '4px', border: '1px solid #91d5ff', display: 'flex', gap: 8, alignItems: 'center' }}>
            <FileDoneOutlined style={{ color: '#1890ff', fontSize: 16 }} />
            <span style={{ fontSize: '13px', color: '#1890ff' }}>
              <strong>Lưu ý:</strong> Hệ thống sẽ tự động bỏ qua nếu nhân viên đã được phân trong cùng ca và ngày được chọn.
            </span>
          </div>
        </Form>
      </Modal>

      {/* Modal Duyệt OT & Kiểm tra POS */}
      <Modal
        maskClosable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: '#fa8c16' }}>
            <SafetyCertificateOutlined />
            <span>PHÊ DUYỆT TĂNG CA (OT) & XÁC MINH POS</span>
          </div>
        }
        open={isOTModalOpen}
        onCancel={() => setIsOTModalOpen(false)}
        onOk={() => otForm.submit()}
        width={560}
        okText="Lưu phê duyệt OT"
        cancelText="Hủy bỏ"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #fa8c16, #ffa940)',
            border: 'none',
          },
        }}
      >
        {selectedOTRecord && (
          <div>
            <div style={{ padding: 12, background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
              <div><strong>Nhân viên:</strong> {getAccountName(selectedOTRecord.accountId)}</div>
              <div><strong>Ngày làm việc:</strong> {dayjs(selectedOTRecord.workDate).format('DD/MM/YYYY')}</div>
              <div><strong>Check-in / Check-out:</strong> {selectedOTRecord.checkInAt ? dayjs(selectedOTRecord.checkInAt).format('HH:mm') : '--'} - {selectedOTRecord.checkOutAt ? dayjs(selectedOTRecord.checkOutAt).format('HH:mm') : '--'}</div>
              <div><strong>Tổng giờ thực tế:</strong> <Tag color="blue">{selectedOTRecord.actualHours || 0} giờ</Tag></div>
            </div>

            {/* POS Verification Result Alert */}
            <div style={{ marginBottom: 16 }}>
              {loadingPOS ? (
                <Card loading size="small" title="Đang kiểm tra hoạt động POS..." />
              ) : posVerificationData ? (
                <Card
                  size="small"
                  style={{
                    border: posVerificationData.isSuspicious ? '1px solid #ffbb96' : '1px solid #b7eb8f',
                    background: posVerificationData.isSuspicious ? '#fff2e8' : '#f6ffed',
                  }}
                >
                  <div style={{ fontWeight: 600, color: posVerificationData.isSuspicious ? '#d4380d' : '#389e0d', marginBottom: 4 }}>
                    {posVerificationData.isSuspicious ? '⚠️ CẢNH BÁO KHÔNG CÓ HOẠT ĐỘNG POS' : '✅ ĐÃ XÁC MINH CÓ ĐƠN HÀNG POS'}
                  </div>
                  <div style={{ fontSize: 13 }}>{posVerificationData.message}</div>
                  <div style={{ fontSize: 12, marginTop: 4, color: '#595959' }}>
                    Số đơn hàng ghi nhận trong giờ dư: <strong>{posVerificationData.orderCount || 0} đơn</strong>
                  </div>
                </Card>
              ) : null}
            </div>

            <Form form={otForm} layout="vertical" onFinish={handleOTSubmit}>
              <Form.Item
                name="approvedOTHours"
                label="Số giờ OT được Quản lý duyệt tính lương"
                rules={[{ required: true, message: 'Vui lòng nhập số giờ OT!' }]}
                help="Lưu ý: Chỉ số giờ OT được duyệt tại đây mới được cộng vào tiền tăng ca cuối tháng."
              >
                <InputNumber min={0} max={12} step={0.5} style={{ width: '100%' }} suffix="giờ" />
              </Form.Item>

              <Form.Item name="otNotes" label="Ghi chú duyệt OT (Lý do duyệt / Từ chối)">
                <Input.TextArea rows={2} placeholder="Nhập ghi chú cho nhân viên..." />
              </Form.Item>

              <Form.Item name="otStatus" label="Trạng thái phê duyệt OT">
                <Select>
                  <Select.Option value="Approved">Chấp nhận OT (Approved)</Select.Option>
                  <Select.Option value="Rejected">Từ chối OT (Rejected - Nghi ngờ quên check-out)</Select.Option>
                  <Select.Option value="Pending">Chờ xem xét (Pending)</Select.Option>
                </Select>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
      {/* Modal Tự Động Phân Ca */}
      <Modal
        maskClosable={false}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: '#722ed1' }}>
            <ThunderboltOutlined />
            <span>TỰ ĐỘNG PHÂN CA THÔNG MINH</span>
          </div>
        }
        open={isAutoAssignModalOpen}
        onCancel={() => {
          if (autoAssignSubmitting) return;
          setIsAutoAssignModalOpen(false);
          autoAssignForm.resetFields();
          setAutoAssignResult(null);
        }}
        onOk={() => autoAssignForm.submit()}
        confirmLoading={autoAssignSubmitting}
        width={680}
        okText="Chạy tự động phân ca"
        cancelText="Đóng"
        okButtonProps={{
          disabled: autoAssignSubmitting,
          style: {
            background: 'linear-gradient(135deg, #722ed1, #9254de)',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
          },
        }}
        cancelButtonProps={{ disabled: autoAssignSubmitting, style: { borderRadius: '6px' } }}
      >
        <Form form={autoAssignForm} layout="vertical" onFinish={handleAutoAssignSubmit} style={{ marginTop: 16 }}>
          <div style={{ background: '#f9f0ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d3ade6', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, color: '#722ed1', marginBottom: 4 }}>⚡ Thuật toán phân ca thông minh:</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#595959' }}>
              <li><strong>Toàn thời gian:</strong> Ưu tiên giao ca cho nhân viên toàn thời gian thiếu ngày công để bù đủ mục tiêu công chuẩn tháng.</li>
              <li><strong>Bán thời gian:</strong> Phân bổ số lượng ca làm việc dàn đều giữa các nhân viên bán thời gian để đảm bảo công bằng.</li>
              <li>Tự động tuân thủ quy tắc <strong>ca phù hợp</strong> (Toàn thời gian / Bán thời gian), <strong>thời hạn hợp đồng</strong> và <strong>đơn xin nghỉ đã duyệt</strong>.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="branchId"
              label="Chi nhánh thực hiện phân ca"
              rules={[{ required: true, message: 'Vui lòng chọn chi nhánh!' }]}
              initialValue={managerBranchId || defaultBranchId}
              style={{ flex: 1 }}
            >
              <Select placeholder="Chọn chi nhánh..." disabled={isManager || allowedBranches.length <= 1}>
                {allowedBranches.map((b) => (
                  <Select.Option key={b.id} value={b.id}>
                    {b.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="shiftIds"
              label="Chọn các ca làm việc áp dụng (Để trống = tất cả ca)"
              style={{ flex: 1 }}
            >
              <Select mode="multiple" placeholder="Tất cả ca trực chi nhánh" allowClear>
                {shifts.map((s) => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.name} ({s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="dateRange"
            label="Khoảng thời gian tự động xếp lịch"
            rules={[{ required: true, message: 'Vui lòng chọn khoảng ngày!' }]}
          >
            <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>

          {/* Result Alert display if auto-assign has run */}
          {autoAssignResult && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <div style={{ fontWeight: 600, color: '#389e0d', marginBottom: 6 }}>
                ✅ Đã hoàn tất phân ca tự động!
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
                <Tag color="blue">Tổng ca đã tạo: <strong>{autoAssignResult.totalCreated}</strong></Tag>
                <Tag color="cyan">Ca Toàn thời gian: <strong>{autoAssignResult.fullTimeSchedulesCreated}</strong></Tag>
                <Tag color="purple">Ca Bán thời gian: <strong>{autoAssignResult.partTimeSchedulesCreated}</strong></Tag>
                <Tag color="default">Vị trí đã có lịch/bỏ qua: <strong>{autoAssignResult.skippedSlotsCount}</strong></Tag>
              </div>
              {autoAssignResult.warnings && autoAssignResult.warnings.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#fa8c16' }}>
                  {autoAssignResult.warnings.map((w, idx) => (
                    <div key={idx}>⚠️ {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Form>
      </Modal>

      {/* Cancel Work Schedule Modal — bắt buộc nhập lý do hủy ca */}
      <Modal
        title="Hủy ca làm việc"
        open={isCancelModalOpen}
        onCancel={() => { setIsCancelModalOpen(false); setCancelTarget(null); }}
        onOk={handleCancelSubmit}
        okText="Xác nhận hủy ca"
        cancelText="Đóng"
        okButtonProps={{ danger: true, loading: cancelSubmitting }}
        destroyOnClose
      >
        {cancelTarget && (
          <div style={{ marginBottom: 12, padding: 12, background: '#fff1f0', borderRadius: 8 }}>
            <div><strong>Nhân viên:</strong> {getAccountName(cancelTarget.accountId)}</div>
            <div><strong>Ngày làm việc:</strong> {dayjs(cancelTarget.workDate).format('DD/MM/YYYY')}</div>
          </div>
        )}
        <Form form={cancelForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do hủy ca"
            rules={[{ required: true, whitespace: true, message: 'Phải nhập lý do hủy ca.' }]}
          >
            <Input.TextArea rows={3} placeholder="VD: nhân viên xin nghỉ đột xuất, sắp xếp lại nhân sự..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Approve Leave Request Modal — quản lý thêm ghi chú riêng khi duyệt nghỉ */}
      <Modal
        title="Duyệt đơn xin nghỉ"
        open={isApproveLeaveModalOpen}
        onCancel={() => { setIsApproveLeaveModalOpen(false); setApproveLeaveTarget(null); }}
        onOk={handleApproveLeaveSubmit}
        okText="Xác nhận duyệt nghỉ"
        cancelText="Đóng"
        okButtonProps={{ style: { background: '#722ed1', borderColor: '#722ed1' }, loading: approveLeaveSubmitting }}
        destroyOnClose
      >
        {approveLeaveTarget && (
          <div style={{ marginBottom: 12, padding: 12, background: '#f9f0ff', borderRadius: 8 }}>
            <div><strong>Nhân viên:</strong> {approveLeaveTarget.empName}</div>
            <div><strong>Lý do xin nghỉ:</strong> {approveLeaveTarget.employeeReason}</div>
          </div>
        )}
        <Form form={approveLeaveForm} layout="vertical">
          <Form.Item name="adminNote" label="Ghi chú của quản lý (tuỳ chọn)">
            <Input.TextArea rows={3} placeholder="VD: đã sắp xếp người thay ca, nhớ báo lại khi đi làm lại..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Leave Request Detail Modal — bấm vào note trên Lịch tuần để xem chi tiết */}
      <Modal
        title="Chi tiết đơn xin nghỉ"
        open={isLeaveDetailModalOpen}
        onCancel={() => { setIsLeaveDetailModalOpen(false); setLeaveDetailTarget(null); }}
        footer={null}
      >
        {leaveDetailTarget && (() => {
          const { item, parsed } = leaveDetailTarget;
          const shiftInfo = getShiftDetails(item.shiftId);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><strong>Nhân viên:</strong> {getAccountName(item.accountId)}</div>
              <div><strong>Ca:</strong> {shiftInfo.name} ({shiftInfo.time})</div>
              <div><strong>Ngày:</strong> {dayjs(item.workDate).format('DD/MM/YYYY')}</div>
              <div>
                <strong>Trạng thái:</strong>{' '}
                {parsed.isPending ? (
                  <Tag color="magenta">Đang chờ duyệt</Tag>
                ) : (
                  <Tag color="purple">Đã duyệt nghỉ</Tag>
                )}
              </div>
              <div>
                <strong>Lý do của nhân viên:</strong>
                <div style={{ marginTop: 4, padding: 10, background: '#fafafa', borderRadius: 6 }}>{parsed.employeeReason}</div>
              </div>
              {parsed.adminNote && (
                <div>
                  <strong>Ghi chú của quản lý:</strong>
                  <div style={{ marginTop: 4, padding: 10, background: '#f9f0ff', borderRadius: 6 }}>{parsed.adminNote}</div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Reject/Cancel Shift-Change Request Modal — bắt buộc nhập lý do trước khi hủy */}
      <Modal
        title="Từ chối / Hủy yêu cầu đổi ca"
        open={isRejectShiftChangeModalOpen}
        onCancel={() => { setIsRejectShiftChangeModalOpen(false); setRejectShiftChangeTarget(null); }}
        onOk={handleRejectShiftChangeSubmit}
        okText="Xác nhận từ chối/hủy"
        cancelText="Đóng"
        okButtonProps={{ danger: true, loading: rejectShiftChangeSubmitting }}
        width={640}
        destroyOnClose
      >
        {rejectShiftChangeTarget && (() => {
          const { type, item } = rejectShiftChangeTarget;
          const branchName = getBranchName(item.branchId);
          const managerName = getBranchManagerName(item.branchId);

          if (type === 'transfer') {
            const shiftInfo = getShiftDetails(item.shiftId);
            const employeeNote = (item.status || '').split(':').slice(2).join(':').trim() || 'Đổi ca';
            return (
              <div style={{ marginBottom: 16, padding: 14, background: '#fff7e6', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div><strong>Yêu cầu đổi ca:</strong> {rejectShiftChangeTarget.senderName} ➔ {rejectShiftChangeTarget.receiverName}</div>
                <div><strong>Chi nhánh:</strong> {branchName}</div>
                <div><strong>Ca:</strong> {shiftInfo.name} ({shiftInfo.time})</div>
                <div><strong>Ngày:</strong> {dayjs(item.workDate).format('DD/MM/YYYY')}</div>
                {managerName && <div><strong>Quản lý chi nhánh:</strong> {managerName}</div>}
                <div><strong>Lý do đổi ca (nhân viên):</strong> {employeeNote}</div>
              </div>
            );
          }

          return (
            <div style={{ marginBottom: 16, padding: 14, background: '#fff7e6', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div><strong>Nhân viên:</strong> {rejectShiftChangeTarget.empName}</div>
              <div><strong>Chi nhánh:</strong> {branchName}</div>
              <div><strong>Đổi ca:</strong> {item.oldShiftName} ({item.oldStartTime?.slice(0, 5)}-{item.oldEndTime?.slice(0, 5)}) ➔ {item.newShiftName} ({item.newStartTime?.slice(0, 5)}-{item.newEndTime?.slice(0, 5)})</div>
              <div><strong>Ngày:</strong> {dayjs(item.workDate).format('DD/MM/YYYY')}</div>
              {managerName && <div><strong>Quản lý chi nhánh:</strong> {managerName}</div>}
              <div><strong>Lý do đổi ca (nhân viên):</strong> {item.reason || 'Không có lý do'}</div>
            </div>
          );
        })()}
        <Form form={rejectShiftChangeForm} layout="vertical">
          <Form.Item
            name="note"
            label="Lý do từ chối/hủy (của quản lý)"
            rules={[{ required: true, whitespace: true, message: 'Phải nhập lý do từ chối/hủy yêu cầu đổi ca.' }]}
          >
            <Input.TextArea rows={3} placeholder="VD: không đủ nhân sự thay thế, ca không phù hợp..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Activity Log Modal */}
      <Modal
        title={
          <div>
            <SolutionOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Nhật ký hoạt động (Timeline)
          </div>
        }
        open={isActivityLogModalOpen}
        onCancel={() => { setIsActivityLogModalOpen(false); setSelectedLogRecord(null); setActivityLogData([]); }}
        footer={[
          <Button key="close" onClick={() => setIsActivityLogModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={700}
        destroyOnClose
      >
        {selectedLogRecord && (
          <div style={{ marginBottom: 16, padding: '12px', background: '#e6f7ff', borderRadius: '8px', border: '1px solid #91d5ff' }}>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Nhân viên: {getAccountName(selectedLogRecord.accountId)}</div>
            <div>Ca: {getShiftDetails(selectedLogRecord.shiftId).name} ({getShiftDetails(selectedLogRecord.shiftId).time})</div>
            <div>Giờ vào làm (Check-in): {selectedLogRecord.checkInAt ? dayjs(selectedLogRecord.checkInAt).format('HH:mm - DD/MM/YYYY') : '--'}</div>
          </div>
        )}
        <Table
          dataSource={activityLogData}
          rowKey={(r, idx) => idx}
          loading={loadingActivityLog}
          pagination={{ pageSize: 10 }}
          size="small"
          columns={[
            {
              title: 'Thời gian',
              dataIndex: 'timestamp',
              key: 'timestamp',
              width: 140,
              render: (t) => dayjs(t).format('HH:mm - DD/MM'),
            },
            {
              title: 'Hành động',
              dataIndex: 'action',
              key: 'action',
              width: 150,
              render: (act) => {
                const isPrimary = act === 'Nhận bàn chính';
                return <Tag color={isPrimary ? 'blue' : 'green'}>{act}</Tag>;
              }
            },
            {
              title: 'Mã đơn',
              dataIndex: 'orderCode',
              key: 'orderCode',
              width: 100,
            },
            {
              title: 'Bàn',
              dataIndex: 'tableName',
              key: 'tableName',
              width: 120,
            },
            {
              title: 'Chi tiết',
              dataIndex: 'details',
              key: 'details',
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default WorkSchedulePage;
