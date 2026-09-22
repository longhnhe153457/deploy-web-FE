import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Modal,
  Tag,
  Tooltip,
  message,
  Spin,
  Select,
  Form,
  Input,
  DatePicker,
  Radio,
  TimePicker,
  List,
  Space,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  SwapOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  FieldTimeOutlined,
  AimOutlined,
  SyncOutlined,
  MessageOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import ShiftFeedbackModal from '../components/workSchedule/ShiftFeedbackModal';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getMyWorkSchedules, getAllWorkSchedules, updateWorkSchedule, requestLeave, requestShiftSwap, checkInWithLocation } from '../api/workScheduleApi';
import { createShiftChangeRequest } from '../api/shiftChangeRequestApi';
import { getAllBranches } from '../api/branchApi';
import { getAllShifts } from '../api/shiftApi';
import { getAllAccounts } from '../api/accountApi';
import { useAuth } from '../context/AuthContext';

const MyWorkSchedulePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDayDate, setSelectedDayDate] = useState(dayjs().format('YYYY-MM-DD'));

  const isManagerOrAdmin =
    user?.roles?.some((r) => ['Admin', 'Owner', 'ADMIN', 'OWNER', 'Quản trị viên', 'Quản lý', 'Manager'].includes(r)) ||
    user?.roleIds?.some((id) => [1, 2, 3].includes(id));

  // Modal detail states
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Transfer modal states
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferForm] = Form.useForm();

  // Leave modal states
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveForm] = Form.useForm();

  // Change-shift-hours modal states (4.4 Đổi ca / làm ca khác)
  const [changeShiftModalOpen, setChangeShiftModalOpen] = useState(false);
  const [changeShiftLoading, setChangeShiftLoading] = useState(false);
  const [changeShiftForm] = Form.useForm();
  const changeShiftMode = Form.useWatch('mode', changeShiftForm);

  // Check-in with location states
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinBranchModalOpen, setCheckinBranchModalOpen] = useState(false);
  const [checkinBranchId, setCheckinBranchId] = useState(null);
  const [checkinShiftModalOpen, setCheckinShiftModalOpen] = useState(false);
  const [todayShiftSchedules, setTodayShiftSchedules] = useState([]);
  // Shift Feedback modal states
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackSchedule, setFeedbackSchedule] = useState(null);

  const handleOpenFeedback = (schedule = null) => {
    setDetailModalOpen(false);
    setFeedbackSchedule(schedule);
    setFeedbackModalOpen(true);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let scheds = [];
      try {
        const resAll = await getAllWorkSchedules();
        scheds = resAll.data || [];
      } catch (e) {
        const resMine = await getMyWorkSchedules();
        scheds = resMine.data || [];
      }
      const [branchesRes, shiftsRes, accountsRes] = await Promise.all([
        getAllBranches(),
        getAllShifts(),
        getAllAccounts(),
      ]);
      // Hiển thị tất cả ca làm việc bao gồm cả các ca Quản lý chưa duyệt
      setSchedules(scheds || []);
      setBranches(branchesRes.data || []);
      const rawShifts = shiftsRes.data || [];
      setShifts([...rawShifts].sort((a, b) => (a.id ?? 0) - (b.id ?? 0) || (a.startTime || '').localeCompare(b.startTime || '')));
      setAccounts(accountsRes.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải lịch làm việc hoặc thông tin ca trực!');
    } finally {
      setLoading(false);
    }
  }, []);

  const getAccountName = (id) => {
    const acc = accounts.find((a) => a.id === id);
    return acc ? acc.name : `Nhân viên #${id}`;
  };

  const getBranchName = (id) => {
    const br = branches.find((b) => b.id === id);
    return br ? br.name : `Chi nhánh #${id}`;
  };

  const getShiftDetails = (id) => {
    const sh = shifts.find((s) => s.id === id);
    if (!sh) return { name: `Ca #${id}`, time: '', startTime: '00:00', endTime: '23:59' };
    const start = sh.startTime ? sh.startTime.substring(0, 5) : '--:--';
    const end = sh.endTime ? sh.endTime.substring(0, 5) : '--:--';
    return { name: sh.name, time: `${start} - ${end}`, startTime: sh.startTime, endTime: sh.endTime };
  };

  // Determine period (Sáng / Chiều / Tối) from shift start time or name
  const getShiftPeriod = (shiftInfo) => {
    if (!shiftInfo || !shiftInfo.startTime) {
      return { type: 'MORNING', label: 'Ca Sáng', icon: '☀️', color: '#d97706', bg: '#fffbe6', border: '#ffe58f' };
    }
    const startHour = parseInt(shiftInfo.startTime.substring(0, 2), 10);
    const nameLower = (shiftInfo.name || '').toLowerCase();

    if (nameLower.includes('sáng') || (startHour >= 5 && startHour < 12)) {
      return { type: 'MORNING', label: 'Ca Sáng', icon: '☀️', color: '#d97706', bg: '#fffbe6', border: '#ffe58f' };
    }
    if (nameLower.includes('chiều') || (startHour >= 12 && startHour < 18)) {
      return { type: 'AFTERNOON', label: 'Ca Chiều', icon: '🌤️', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' };
    }
    return { type: 'EVENING', label: 'Ca Tối', icon: '🌙', color: '#7c3aed', bg: '#f3e8ff', border: '#e9d5ff' };
  };

  const handleOpenTransfer = () => {
    setDetailModalOpen(false);
    transferForm.resetFields();
    setTransferModalOpen(true);
  };

  const handleOpenChangeShift = () => {
    setDetailModalOpen(false);
    changeShiftForm.resetFields();
    changeShiftForm.setFieldsValue({ mode: 'template' });
    setChangeShiftModalOpen(true);
  };

  const handleChangeShiftSubmit = async (values) => {
    if (!selectedSchedule) return;
    setChangeShiftLoading(true);
    try {
      const payload = {
        workScheduleId: selectedSchedule.id,
        reason: values.reason || undefined,
      };
      if (values.mode === 'template') {
        payload.newShiftId = values.newShiftId;
      } else {
        payload.newStartTime = values.newStartTime.format('HH:mm:ss');
        payload.newEndTime = values.newEndTime.format('HH:mm:ss');
      }

      await createShiftChangeRequest(payload);
      message.success('🟢 Đã gửi yêu cầu đổi ca! Chờ quản lý duyệt.');
      setChangeShiftModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu đổi ca!';
      message.error(errorMsg);
    } finally {
      setChangeShiftLoading(false);
    }
  };

  // ---- GPS Check-in handler ----
  const doCheckInWithShift = (branchId, workScheduleId = null) => {
    setCheckinLoading(true);
    if (!navigator.geolocation) {
      message.error('Trình duyệt của bạn không hỗ trợ GPS. Vui lòng dùng thiết bị khác.');
      setCheckinLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await checkInWithLocation({ branchId, latitude, longitude, workScheduleId });
          const data = res.data;
          if (data.success) {
            if (data.action === 'checkin') {
              message.success({ content: `✅ ${data.message || 'Check-in thành công!'}`, duration: 4 });
            } else if (data.action === 'checkout') {
              message.success({ content: `✅ ${data.message || 'Check-out thành công!'}`, duration: 4 });
            } else {
              message.success({ content: data.message, duration: 4 });
            }
            setCheckinShiftModalOpen(false);
            loadData();
          } else {
            message.error({ content: data.message, duration: 6 });
          }
        } catch (err) {
          const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi điểm danh!';
          message.error({ content: errMsg, duration: 6 });
        } finally {
          setCheckinLoading(false);
        }
      },
      (geoErr) => {
        setCheckinLoading(false);
        if (geoErr.code === 1) {
          message.error('Bạn đã từ chối cấp quyền vị trí. Vui lòng bật quyền GPS trong cài đặt trình duyệt và thử lại.');
        } else {
          message.error('Không lấy được vị trí. Vui lòng kiểm tra GPS và thử lại.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCheckIn = () => {
    const today = dayjs().format('YYYY-MM-DD');
    const myUserId = user?.id;
    const todaySchedules = schedules.filter(
      (s) => dayjs(s.workDate).format('YYYY-MM-DD') === today
        && (!myUserId || s.accountId === myUserId)
    );

    if (todaySchedules.length === 0) {
      message.warning('Bạn không có ca làm việc nào hôm nay.');
      return;
    }

    setTodayShiftSchedules(todaySchedules);
    setCheckinShiftModalOpen(true);
  };

  const handleOpenLeaveModal = (type = 'day', schedule = null) => {
    setDetailModalOpen(false);
    leaveForm.resetFields();
    leaveForm.setFieldsValue({
      type,
      workDate: schedule ? dayjs(schedule.workDate) : dayjs(),
      shiftScheduleId: schedule ? schedule.id : undefined,
    });
    setLeaveModalOpen(true);
  };

  const handleLeaveSubmit = async (values) => {
    setLeaveLoading(true);
    try {
      if (values.type === 'shift') {
        const targetShift = selectedSchedule || schedules.find(s => s.id === values.shiftScheduleId);
        if (!targetShift) {
          message.warning('Vui lòng chọn ca cần xin nghỉ!');
          setLeaveLoading(false);
          return;
        }
        const payload = {
          workScheduleId: targetShift.id,
          reason: values.reason || 'Xin nghỉ ca'
        };
        await requestLeave(payload);
        message.success('🟢 Đã gửi đơn xin nghỉ ca làm việc! Chờ Quản lý / Admin duyệt.');
      } else {
        const targetDateStr = dayjs(values.workDate).format('YYYY-MM-DD');
        const mySchedulesOnDay = schedules.filter(s => dayjs(s.workDate).format('YYYY-MM-DD') === targetDateStr && s.accountId === (user?.id || s.accountId));
        if (mySchedulesOnDay.length === 0) {
          message.warning('Ngày bạn chọn không có ca làm việc nào!');
          setLeaveLoading(false);
          return;
        }
        await Promise.all(mySchedulesOnDay.map(s => requestLeave({
          workScheduleId: s.id,
          reason: values.reason || 'Xin nghỉ phép ngày'
        })));
        message.success(`🟢 Đã gửi đơn xin nghỉ ngày ${targetDateStr} (${mySchedulesOnDay.length} ca)! Chờ Admin duyệt.`);
      }
      setLeaveModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi đơn xin nghỉ!';
      message.error(errorMsg);
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleTransferSubmit = async (values) => {
    if (!selectedSchedule) return;
    setTransferLoading(true);
    try {
      const targetAccount = accounts.find((a) => a.id === values.targetAccountId);
      const payload = {
        workScheduleId: selectedSchedule.id,
        targetAccountId: values.targetAccountId,
        note: values.note || 'Đổi ca'
      };

      await requestShiftSwap(payload);
      message.success(`🟢 Đã gửi yêu cầu đổi ca cho nhân viên ${targetAccount ? targetAccount.name : values.targetAccountId}! Chờ nhân viên đồng ý.`);
      setTransferModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi chuyển ca!';
      message.error(errorMsg);
    } finally {
      setTransferLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('work-schedule-updated', handleUpdate);
    return () => {
      window.removeEventListener('work-schedule-updated', handleUpdate);
    };
  }, [loadData]);

  // ISO Standard Week Calculation (Monday is first day)
  const day = currentDate.day();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = currentDate.add(diffToMonday, 'day').startOf('day');
  const sunday = monday.add(6, 'day').endOf('day');

  const handlePrevWeek = () => {
    setCurrentDate(currentDate.subtract(1, 'week'));
  };

  const handleNextWeek = () => {
    setCurrentDate(currentDate.add(1, 'week'));
  };

  // Precise status logic:
  // - Check in + Check out (or PRESENT status / actualHours > 0) -> 'ĐÃ HOÀN THÀNH'
  // - Check in only -> 'ĐANG LÀM VIỆC'
  // - Before shift start -> 'CHƯA ĐẾN GIỜ'
  // - Past shift start/end without check in -> 'VẮNG MẶT'
  const getShiftStatusDetails = (record, shift) => {
    if (!shift) return { text: 'CHƯA ĐẾN GIỜ', color: '#64748b', bg: '#94a3b8' };

    const now = dayjs();
    const workDateStr = dayjs(record.workDate).format('YYYY-MM-DD');
    const startStr = shift.startTime ? shift.startTime.substring(0, 5) : '00:00';
    const endStr = shift.endTime ? shift.endTime.substring(0, 5) : '23:59';

    const shiftStart = dayjs(`${workDateStr} ${startStr}`);
    const shiftEnd = dayjs(`${workDateStr} ${endStr}`);

    if (record.status?.startsWith('LEAVE_REQUEST')) {
      return { text: 'ĐANG XIN NGHỈ', color: '#ef4444', bg: '#ef4444' };
    }
    if (record.status === 'LEAVE_APPROVED') {
      return { text: 'ĐÃ XIN NGHỈ', color: '#9333ea', bg: '#9333ea' };
    }
    if (record.status?.startsWith('TRANSFER_PENDING')) {
      return { text: 'CHỜ ĐỔI CA', color: '#f59e0b', bg: '#f59e0b' };
    }

    const hasCheckedIn = !!record.checkInAt;
    const hasCheckedOut = !!record.checkOutAt;
    const hasHours = record.actualHours !== null && record.actualHours !== undefined && Number(record.actualHours) > 0;
    const isCompletedStatus = ['PRESENT', 'PRESENT_APPROVED', 'COMPLETED', 'HOAN_THANH', 'CÓ MẶT', 'ĐÃ HOÀN THÀNH', 'HOÀN THÀNH'].includes(record.status?.toUpperCase());

    // 1. Completed Shift (Check in + Check out OR has worked hours OR PRESENT/COMPLETED status)
    if ((hasCheckedIn && hasCheckedOut) || (hasCheckedIn && isCompletedStatus) || hasHours || isCompletedStatus) {
      return { text: 'ĐÃ HOÀN THÀNH', color: '#22c55e', bg: '#22c55e' };
    }

    // 2. Check in only -> 'ĐANG LÀM VIỆC'
    if (hasCheckedIn && !hasCheckedOut) {
      return { text: 'ĐANG LÀM VIỆC', color: '#3b82f6', bg: '#3b82f6' };
    }

    if (record.status?.toUpperCase() === 'ABSENT' || record.status?.toUpperCase() === 'VẮNG MẶT') {
      return { text: 'VẮNG MẶT', color: '#ef4444', bg: '#ef4444' };
    }

    // 3. Dynamic Time Checks:
    // If current time is past shift start or shift end without check in -> 'VẮNG MẶT'
    if (now.isAfter(shiftEnd) || (now.isAfter(shiftStart) && !hasCheckedIn)) {
      return { text: 'VẮNG MẶT', color: '#ef4444', bg: '#ef4444' };
    }

    // 4. Before shift start -> 'CHƯA ĐẾN GIỜ'
    return { text: 'CHƯA ĐẾN GIỜ', color: '#64748b', bg: '#94a3b8' };
  };

  // 7 Days of current week
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(monday.add(i, 'day'));
  }

  // Days in Vietnamese: T2, T3, T4, T5, T6, T7, CN
  const getDayShortNameVN = (date) => {
    const d = date.day();
    if (d === 0) return 'CN';
    return `T${d + 1}`;
  };

  const handleSelectAndScrollToDay = (dateStr) => {
    setSelectedDayDate(dateStr);
    const element = document.getElementById(`day-timeline-${dateStr}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleShiftClick = (record) => {
    setSelectedSchedule(record);
    setDetailModalOpen(true);
  };

  // Accent vertical line colors for timetable days
  const timelineLineColors = ['#f97316', '#6366f1', '#3b82f6', '#10b981', '#d97706', '#ec4899', '#8b5cf6'];

  return (
    <div className="timetable-page-container">
      <style>{`
        .timetable-page-container {
          max-width: 1200px;
          margin: 0 auto;
          background: #ffffff;
          min-height: 100vh;
          font-family: 'Be Vietnam Pro', 'Inter', -apple-system, sans-serif;
          color: #1e293b;
        }

        /* Top Header Navbar */
        .timetable-header {
          background: linear-gradient(180deg, #132238 0%, #1b2a47 100%);
          padding: 18px 24px;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }

        .timetable-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .timetable-nav-back {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .timetable-nav-back:hover {
          opacity: 0.85;
        }

        .timetable-title {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.3px;
          color: #ffffff;
          margin: 0;
        }

        /* Current Week & Date Strip */
        .week-strip-container {
          padding: 16px 24px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          text-align: center;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .current-week-text {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
          margin-bottom: 10px;
        }

        .month-selector-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 16px;
        }

        .month-nav-btn {
          background: none;
          border: none;
          font-size: 14px;
          color: #1e293b;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .month-nav-btn:hover {
          background: #f1f5f9;
        }

        .month-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }

        .week-days-header-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          max-width: 700px;
          margin: 0 auto;
        }

        .day-column-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }

        .day-name-lbl {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
        }

        .day-num-badge {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 700;
          color: #1e293b;
          transition: all 0.2s ease;
        }

        .day-column-item.selected .day-num-badge {
          background: #132238;
          color: #ffffff;
          box-shadow: 0 4px 10px rgba(19, 34, 56, 0.3);
        }

        .day-dot-indicator {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #132238;
          margin-top: 2px;
        }

        .day-dot-indicator.hidden {
          opacity: 0;
        }

        /* Timeline Main Body */
        .timeline-body {
          padding: 24px;
          background: #fafafa;
        }

        .day-timeline-group {
          display: flex;
          margin-bottom: 24px;
          min-height: 80px;
          scroll-margin-top: 180px;
        }

        .day-left-column {
          width: 80px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-top: 4px;
        }

        .day-left-date {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
        }

        .day-left-shortname {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
          margin-top: 2px;
        }

        .day-timeline-border {
          width: 4px;
          border-radius: 2px;
          margin-right: 20px;
          flex-shrink: 0;
          min-height: 80px;
        }

        .day-shifts-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Shift Card Design */
        .shift-item-wrapper {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .slot-time-block {
          width: 65px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .slot-time-text {
          font-size: 13px;
          color: #64748b;
          font-weight: 700;
          line-height: 1.4;
          text-align: center;
        }

        .shift-card-content {
          flex: 1;
          background: #f4f6f9;
          border-radius: 14px;
          padding: 14px 18px;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .shift-card-content:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
        }

        .room-label {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }

        .room-title {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
          line-height: 1.2;
        }

        .shift-detail-line {
          font-size: 13px;
          color: #475569;
          font-weight: 500;
          line-height: 1.4;
        }

        .shift-badges-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
        }

        .badge-present {
          background: #22c55e;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 14px;
          letter-spacing: 0.4px;
        }

        .badge-materials {
          background: #f97316;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 14px;
          letter-spacing: 0.4px;
          cursor: pointer;
          border: none;
        }

        .badge-materials:hover {
          background: #ea580c;
        }

        .period-tag {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 10px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>

      {/* Top Header Navbar */}
      <div className="timetable-header">
        <div className="timetable-header-top">
          <div className="timetable-nav-back" onClick={() => navigate('/home')}>
            <ArrowLeftOutlined style={{ fontSize: '18px' }} />
            <span>Trang chủ</span>
          </div>
          <h1 className="timetable-title">Lịch làm việc tuần</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isManagerOrAdmin && (
              <Button
                type="primary"
                size="small"
                style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 'bold', borderRadius: '14px' }}
                icon={<AimOutlined />}
                onClick={handleCheckIn}
                loading={checkinLoading}
              >
                Điểm danh
              </Button>
            )}
            <Button
              type="primary"
              size="small"
              style={{ background: '#f97316', borderColor: '#f97316', fontWeight: 'bold', borderRadius: '14px' }}
              icon={<FileTextOutlined />}
              onClick={() => handleOpenLeaveModal('day')}
            >
              Xin nghỉ
            </Button>
            <Button
              type="primary"
              size="small"
              style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 'bold', borderRadius: '14px' }}
              icon={<MessageOutlined />}
              onClick={() => handleOpenFeedback()}
            >
              Phản hồi ca
            </Button>
            <Button
              type="default"
              size="small"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'transparent', fontWeight: 'bold', borderRadius: '14px' }}
              icon={<HistoryOutlined />}
              onClick={() => navigate('/my-shift-feedbacks')}
            >
              Lịch sử phản hồi
            </Button>
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<ReloadOutlined style={{ color: '#fff', fontSize: '16px' }} />}
              onClick={loadData}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Current Week Subtitle & Day Selector Strip */}
      <div className="week-strip-container">
        <div className="current-week-text">
          Tuần hiện tại: {monday.format('DD/MM/YYYY')} – {sunday.format('DD/MM/YYYY')}
        </div>

        <div className="month-selector-row">
          <button className="month-nav-btn" onClick={handlePrevWeek}>
            ◄
          </button>
          <span className="month-title">Tháng {currentDate.format('M/YYYY')}</span>
          <button className="month-nav-btn" onClick={handleNextWeek}>
            ►
          </button>
        </div>

        <div className="week-days-header-grid">
          {weekDays.map((dayItem) => {
            const dateStr = dayItem.format('YYYY-MM-DD');
            const hasSchedules = schedules.some((s) => dayjs(s.workDate).format('YYYY-MM-DD') === dateStr);
            const isSelected = selectedDayDate === dateStr;

            return (
              <div
                key={dateStr}
                className={`day-column-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectAndScrollToDay(dateStr)}
              >
                <span className="day-name-lbl">{getDayShortNameVN(dayItem)}</span>
                <div className="day-num-badge">{dayItem.format('D')}</div>
                <div className={`day-dot-indicator ${hasSchedules ? '' : 'hidden'}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 🔔 Notifications / Manager Approval Banner */}
      {isManagerOrAdmin && (schedules.some((s) => s.status?.startsWith('LEAVE_REQUEST') || s.status?.startsWith('TRANSFER_PENDING'))) && (
        <div style={{ padding: '16px 24px 0 24px' }}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cf1322', fontSize: '14px', fontWeight: 'bold' }}>
                <SafetyCertificateOutlined />
                <span>DUYỆT ĐƠN XIN NGHỈ & ĐỔI CA (QUẢN LÝ)</span>
              </div>
            }
            style={{ border: '2px solid #cf1322', borderRadius: '12px', background: '#fff1f0' }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {schedules.filter((s) => s.status?.startsWith('LEAVE_REQUEST')).map((item) => {
                const parts = (item.status || '').split(':');
                const reason = parts.slice(1).join(':') || 'Xin nghỉ phép';
                const empName = getAccountName(item.accountId);
                const shiftInfo = getShiftDetails(item.shiftId);
                return (
                  <div key={item.id} style={{
                    background: '#fff', border: '1px solid #ffccc7', borderRadius: '8px', padding: '8px 12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'
                  }}>
                    <div style={{ fontSize: '13px' }}>
                      <Tag color="purple">XIN NGHỈ</Tag>
                      <strong>{empName}</strong> xin nghỉ ca <strong>{shiftInfo.name}</strong> ngày <strong>{dayjs(item.workDate).format('DD/MM/YYYY')}</strong>. (Lý do: <em>{reason}</em>)
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button type="primary" size="small" style={{ background: '#722ed1', borderColor: '#722ed1', fontWeight: 'bold' }} onClick={async () => {
                        try {
                          await updateWorkSchedule({ ...item, status: 'LEAVE_APPROVED', managerApproved: true });
                          message.success(`🟢 Đã duyệt cho ${empName} nghỉ ca này!`);
                          loadData();
                        } catch (e) { message.error('Lỗi khi duyệt nghỉ!'); }
                      }}>
                        Duyệt
                      </Button>
                      <Button danger size="small" onClick={async () => {
                        try {
                          await updateWorkSchedule({ ...item, status: 'Approved', managerApproved: true });
                          message.info(`❌ Đã từ chối đơn của ${empName}.`);
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
          </Card>
        </div>
      )}

      {/* Main Timetable Body (Always Displays ALL Days of the Week) */}
      <Spin spinning={loading}>
        <div className="timeline-body">
          {weekDays.map((dayItem, dayIdx) => {
            const dateStr = dayItem.format('YYYY-MM-DD');

            // Filter schedules by date and sort chronologically (Morning -> Afternoon -> Evening)
            const daySchedules = schedules
              .filter((item) => dayjs(item.workDate).format('YYYY-MM-DD') === dateStr)
              .sort((a, b) => {
                const shiftA = getShiftDetails(a.shiftId);
                const shiftB = getShiftDetails(b.shiftId);
                const timeA = shiftA.startTime || '00:00';
                const timeB = shiftB.startTime || '00:00';
                return timeA.localeCompare(timeB);
              });

            const lineColor = timelineLineColors[dayIdx % timelineLineColors.length];

            return (
              <div key={dateStr} id={`day-timeline-${dateStr}`} className="day-timeline-group">
                {/* Left Column: Date & Vietnamese Day Name */}
                <div className="day-left-column">
                  <div className="day-left-date">{dayItem.format('D/M')}</div>
                  <div className="day-left-shortname">{getDayShortNameVN(dayItem)}</div>
                </div>

                {/* Vertical Timeline Accent Bar */}
                <div
                  className="day-timeline-border"
                  style={{ background: lineColor }}
                />

                {/* Right Column: Shift Cards List (Sorted Chronologically Sáng -> Chiều -> Tối) */}
                <div className="day-shifts-container">
                  {daySchedules.length > 0 ? (
                    daySchedules.map((item) => {
                      const shiftInfo = getShiftDetails(item.shiftId);
                      const statusDetails = getShiftStatusDetails(item, shiftInfo);
                      const period = getShiftPeriod(shiftInfo);

                      const startTime = shiftInfo.startTime ? shiftInfo.startTime.substring(0, 5) : '07:00';
                      const endTime = shiftInfo.endTime ? shiftInfo.endTime.substring(0, 5) : '11:30';

                      return (
                        <div key={item.id} className="shift-item-wrapper">
                          {/* Time Block */}
                          <div className="slot-time-block">
                            <div className="slot-time-text">
                              <div>{startTime}</div>
                              <div>|</div>
                              <div>{endTime}</div>
                            </div>
                          </div>

                          {/* Card Content Box */}
                          <div
                            className="shift-card-content"
                            onClick={() => handleShiftClick(item)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <div className="room-label">Chi nhánh / Ca trực</div>
                              <div
                                className="period-tag"
                                style={{ background: period.bg, color: period.color, border: `1px solid ${period.border}` }}
                              >
                                <span>{period.icon}</span> {period.label}
                              </div>
                            </div>

                            <div className="room-title">
                              {getBranchName(item.branchId) || `Chi nhánh #${item.branchId}`}
                            </div>

                            <div className="shift-detail-line">
                              Ca: {shiftInfo.name} ({shiftInfo.time})
                            </div>
                            <div className="shift-detail-line">
                              Nhân viên: {getAccountName(item.accountId)}
                            </div>


                            {/* Badges Row */}
                            <div className="shift-badges-row">
                              <span
                                className="badge-present"
                                style={{ background: statusDetails.bg }}
                              >
                                {statusDetails.text}
                              </span>
                              <span
                                className="badge-present"
                                style={{
                                  background: item.managerApproved ? '#16a34a' : '#d97706',
                                  fontWeight: '600',
                                }}
                              >
                                {item.managerApproved ? '✓ Đã duyệt' : '⏱ Chờ duyệt'}
                              </span>
                              <button
                                className="badge-materials"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShiftClick(item);
                                }}
                              >
                                Chi tiết
                              </button>
                              {(!item.checkInAt && item.status !== 'ABSENT') && (
                                <Tooltip title="Đổi ca nhanh">
                                  <Button
                                    size="small"
                                    type="text"
                                    icon={<SwapOutlined style={{ color: '#f97316' }} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSchedule(item);
                                      handleOpenTransfer();
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      style={{
                        height: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#cbd5e1',
                        fontSize: '13px',
                        fontStyle: 'italic',
                      }}
                    >
                      Chưa có lịch phân ca trong ngày này
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Spin>

      {/* Details Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px', color: '#132238' }}>
            <CalendarOutlined />
            <span>CHI TIẾT CA LÀM VIỆC</span>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={(() => {
          const shiftInfo = selectedSchedule ? getShiftDetails(selectedSchedule.shiftId) : null;
          let isShiftPast = false;
          let isAlreadyLeave = false;
          let isLeaveApproved = false;
          
          if (selectedSchedule && shiftInfo && shiftInfo.endTime) {
            const dateStr = dayjs(selectedSchedule.workDate).format('YYYY-MM-DD');
            const endStr = shiftInfo.endTime.length > 5 ? shiftInfo.endTime : `${shiftInfo.endTime}:00`;
            isShiftPast = dayjs(`${dateStr} ${endStr}`).isBefore(dayjs());
            
            const currentStatus = (selectedSchedule.status || '').toUpperCase();
            if (currentStatus.startsWith('LEAVE_REQUEST')) isAlreadyLeave = true;
            if (currentStatus === 'ABSENT' || currentStatus === 'VẮNG MẶT' || currentStatus === 'VẮNG') isLeaveApproved = true;
          }
          
          let disableReason = "";
          if (isShiftPast) disableReason = "Ca làm việc đã kết thúc.";
          else if (isLeaveApproved) disableReason = "Ca làm việc này đã được duyệt nghỉ.";
          else if (isAlreadyLeave) disableReason = "Bạn đã gửi đơn xin nghỉ cho ca này.";
          
          const isDisabled = isShiftPast || isAlreadyLeave || isLeaveApproved;
          
          return [
            <Tooltip title={disableReason} key="leave-tooltip">
              <Button
                key="leave"
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => handleOpenLeaveModal('shift', selectedSchedule)}
                disabled={isDisabled}
                style={{ 
                  background: isDisabled ? '#d9d9d9' : '#722ed1', 
                  borderColor: isDisabled ? '#d9d9d9' : '#722ed1', 
                  fontWeight: 'bold',
                  color: isDisabled ? '#8c8c8c' : '#fff'
                }}
              >
                Xin nghỉ ca này
              </Button>
            </Tooltip>,
            <Tooltip title={disableReason} key="transfer-tooltip">
              <Button
                key="transfer"
                type="primary"
                icon={<SwapOutlined />}
                onClick={handleOpenTransfer}
                disabled={isDisabled}
                style={{
                  background: isDisabled ? '#d9d9d9' : '#f97316',
                  borderColor: isDisabled ? '#d9d9d9' : '#f97316',
                  fontWeight: 'bold',
                  color: isDisabled ? '#8c8c8c' : '#fff'
                }}
              >
                Đổi ca
              </Button>
            </Tooltip>,
            <Tooltip title={disableReason} key="change-shift-tooltip">
              <Button
                key="change-shift"
                type="primary"
                icon={<FieldTimeOutlined />}
                onClick={handleOpenChangeShift}
                disabled={isDisabled}
                style={{
                  background: isDisabled ? '#d9d9d9' : '#13c2c2',
                  borderColor: isDisabled ? '#d9d9d9' : '#13c2c2',
                  fontWeight: 'bold',
                  color: isDisabled ? '#8c8c8c' : '#fff'
                }}
              >
                Đổi giờ ca
              </Button>
            </Tooltip>,
            <Button
              key="feedback"
              type="primary"
              icon={<MessageOutlined />}
              onClick={() => handleOpenFeedback(selectedSchedule)}
              style={{
                background: '#ea580c',
                borderColor: '#ea580c',
                fontWeight: 'bold',
                color: '#fff',
              }}
            >
              Phản hồi ca
            </Button>,
            <Button key="close" type="primary" onClick={() => setDetailModalOpen(false)} style={{ background: '#132238', borderColor: '#132238' }}>
              Đóng
            </Button>
          ];
        })()}
        width={420}
      >
        {selectedSchedule && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div><strong>Chi nhánh:</strong> {getBranchName(selectedSchedule.branchId)}</div>
            <div><strong>Ca trực:</strong> {getShiftDetails(selectedSchedule.shiftId).name} ({getShiftDetails(selectedSchedule.shiftId).time})</div>
            <div><strong>Thời điểm ca:</strong> <Tag color="blue">{getShiftPeriod(getShiftDetails(selectedSchedule.shiftId)).label}</Tag></div>
            <div><strong>Ngày làm việc:</strong> {dayjs(selectedSchedule.workDate).format('DD/MM/YYYY dddd')}</div>
            <div><strong>Nhân viên trực:</strong> {getAccountName(selectedSchedule.accountId)}</div>
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
              <strong>Thời gian ghi nhận thực tế:</strong>
              <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                <div>Vào ca: {selectedSchedule.checkInAt ? dayjs(selectedSchedule.checkInAt).format('HH:mm:ss DD/MM') : '—'}</div>
                <div>Ra ca: {selectedSchedule.checkOutAt ? dayjs(selectedSchedule.checkOutAt).format('HH:mm:ss DD/MM') : '—'}</div>
                {selectedSchedule.actualHours !== null && (
                  <div style={{ color: '#22c55e', fontWeight: 'bold', marginTop: '4px' }}>
                    Tổng giờ công: {selectedSchedule.actualHours} giờ
                  </div>
                )}
              </div>
            </div>
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Trạng thái:</strong>
              {(() => {
                const shiftDetails = getShiftDetails(selectedSchedule.shiftId);
                const statusInfo = getShiftStatusDetails(selectedSchedule, shiftDetails);
                
                if (statusInfo.text === 'VẮNG MẶT' || statusInfo.text === 'Trễ/Vắng mặt') {
                  return <Tag color="error">Vắng mặt</Tag>;
                }
                if (statusInfo.text === 'CHƯA ĐẾN GIỜ') {
                  return <Tag color="default">Chưa đến giờ</Tag>;
                }
                
                if (selectedSchedule.managerApproved) {
                  return <Tag icon={<CheckCircleOutlined />} color="success">Đã duyệt công</Tag>;
                }
                return <Tag icon={<CloseCircleOutlined />} color="warning">Chờ duyệt công</Tag>;
              })()}
            </div>
          </div>
        )}
      </Modal>

      {/* Transfer Shift Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px', color: '#f97316' }}>
            <SwapOutlined />
            <span>CHUYỂN CA LÀM VIỆC</span>
          </div>
        }
        open={transferModalOpen}
        onCancel={() => setTransferModalOpen(false)}
        footer={null}
        width={450}
        destroyOnClose
      >
        {selectedSchedule && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              background: '#fffbe6',
              border: '1px solid #ffe58f',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#595959'
            }}>
              <div style={{ fontWeight: 'bold', color: '#d46b08', marginBottom: '6px', fontSize: '15px' }}>
                Thông tin ca cần chuyển:
              </div>
              <div><strong>Chi nhánh:</strong> {getBranchName(selectedSchedule.branchId)}</div>
              <div><strong>Ca trực:</strong> {getShiftDetails(selectedSchedule.shiftId).name} ({getShiftDetails(selectedSchedule.shiftId).time})</div>
              <div><strong>Ngày làm việc:</strong> {dayjs(selectedSchedule.workDate).format('DD/MM/YYYY (dddd)')}</div>
              <div><strong>Nhân viên hiện tại:</strong> {getAccountName(selectedSchedule.accountId)}</div>
            </div>

            <Form
              form={transferForm}
              layout="vertical"
              onFinish={handleTransferSubmit}
            >
              <Form.Item
                name="targetAccountId"
                label={<span style={{ fontWeight: '600', fontSize: '14px', color: '#000' }}>Chọn nhân viên nhận ca:</span>}
                rules={[{ required: true, message: 'Vui lòng chọn nhân viên muốn chuyển ca!' }]}
              >
                <Select
                  showSearch
                  placeholder="Tìm kiếm theo tên nhân viên..."
                  optionFilterProp="children"
                  size="large"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={accounts
                    .filter((acc) => {
                      if (!selectedSchedule || acc.id === selectedSchedule.accountId) return false;
                      const currentAccount = accounts.find(a => a.id === selectedSchedule.accountId);
                      const currentRoles = currentAccount?.roleIds || [];
                      const accRoles = acc.roleIds || [];
                      const isAdminOrManager = accRoles.some(r => [1, 2, 3].includes(r));
                      if (isAdminOrManager) return false;
                      if (currentRoles.length === 0) return true;
                      const hasSharedRole = currentRoles.some(r => accRoles.includes(r));
                      return hasSharedRole;
                    })
                    .map((acc) => ({
                      value: acc.id,
                      label: `${acc.name} ${acc.phone ? `(${acc.phone})` : ''}`,
                    }))}
                />
              </Form.Item>

              <Form.Item
                name="note"
                label={<span style={{ fontWeight: '600', fontSize: '14px', color: '#000' }}>Ghi chú / Lý do chuyển ca:</span>}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Nhập lý do chuyển ca..."
                  style={{ borderRadius: '6px' }}
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <Button size="large" onClick={() => setTransferModalOpen(false)} style={{ borderRadius: '6px' }}>
                  Hủy
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={transferLoading}
                  icon={<SwapOutlined />}
                  style={{ background: '#f97316', borderColor: '#f97316', fontWeight: 'bold', borderRadius: '6px', color: '#fff' }}
                >
                  Xác nhận chuyển ca
                </Button>
              </div>
            </Form>
          </div>
        )}
      </Modal>

      {/* Change Shift Hours Modal (4.4 Đổi ca / làm ca khác) */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px', color: '#13c2c2' }}>
            <FieldTimeOutlined />
            <span>YÊU CẦU ĐỔI GIỜ CA</span>
          </div>
        }
        open={changeShiftModalOpen}
        onCancel={() => setChangeShiftModalOpen(false)}
        footer={null}
        width={450}
        destroyOnClose
      >
        {selectedSchedule && (
          <div style={{ marginTop: '16px' }}>
            <div style={{
              background: '#e6fffb',
              border: '1px solid #87e8de',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#595959'
            }}>
              <div style={{ fontWeight: 'bold', color: '#08979c', marginBottom: '6px', fontSize: '15px' }}>
                Ca hiện tại:
              </div>
              <div><strong>Ca trực:</strong> {getShiftDetails(selectedSchedule.shiftId).name} ({getShiftDetails(selectedSchedule.shiftId).time})</div>
              <div><strong>Ngày làm việc:</strong> {dayjs(selectedSchedule.workDate).format('DD/MM/YYYY (dddd)')}</div>
            </div>

            <Form
              form={changeShiftForm}
              layout="vertical"
              onFinish={handleChangeShiftSubmit}
            >
              <Form.Item
                name="mode"
                label={<span style={{ fontWeight: '600', fontSize: '14px', color: '#000' }}>Chọn cách đổi ca:</span>}
              >
                <Radio.Group>
                  <Radio value="template">Chọn ca mẫu có sẵn</Radio>
                  <Radio value="custom">Nhập giờ tùy chỉnh</Radio>
                </Radio.Group>
              </Form.Item>

              {changeShiftMode === 'custom' ? (
                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item
                    name="newStartTime"
                    label="Giờ bắt đầu"
                    rules={[{ required: true, message: 'Chọn giờ bắt đầu' }]}
                    style={{ flex: 1 }}
                  >
                    <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={15} />
                  </Form.Item>
                  <Form.Item
                    name="newEndTime"
                    label="Giờ kết thúc"
                    rules={[{ required: true, message: 'Chọn giờ kết thúc' }]}
                    style={{ flex: 1 }}
                  >
                    <TimePicker format="HH:mm" style={{ width: '100%' }} minuteStep={15} />
                  </Form.Item>
                </div>
              ) : (
                <Form.Item
                  name="newShiftId"
                  label={<span style={{ fontWeight: '600', fontSize: '14px', color: '#000' }}>Ca mẫu mới:</span>}
                  rules={[{ required: true, message: 'Vui lòng chọn ca mẫu!' }]}
                >
                  <Select
                    placeholder="Chọn ca mẫu"
                    size="large"
                    options={shifts
                      .filter((s) => s.isActive && s.id !== selectedSchedule.shiftId)
                      .map((s) => ({
                        value: s.id,
                        label: `${s.name} (${(s.startTime || '').slice(0, 5)} - ${(s.endTime || '').slice(0, 5)})`,
                      }))}
                  />
                </Form.Item>
              )}

              <Form.Item
                name="reason"
                label={<span style={{ fontWeight: '600', fontSize: '14px', color: '#000' }}>Lý do đổi ca:</span>}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Nhập lý do muốn đổi giờ ca..."
                  style={{ borderRadius: '6px' }}
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <Button size="large" onClick={() => setChangeShiftModalOpen(false)} style={{ borderRadius: '6px' }}>
                  Hủy
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={changeShiftLoading}
                  icon={<FieldTimeOutlined />}
                  style={{ background: '#13c2c2', borderColor: '#13c2c2', fontWeight: 'bold', borderRadius: '6px', color: '#fff' }}
                >
                  Gửi yêu cầu đổi ca
                </Button>
              </div>
            </Form>
          </div>
        )}
      </Modal>

      {/* Leave Request Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px', color: '#722ed1' }}>
            <FileTextOutlined />
            <span>TẠO ĐƠN XIN NGHỈ PHÉP</span>
          </div>
        }
        open={leaveModalOpen}
        onCancel={() => setLeaveModalOpen(false)}
        footer={null}
        width={450}
        destroyOnClose
      >
        <Form
          form={leaveForm}
          layout="vertical"
          onFinish={handleLeaveSubmit}
          initialValues={{ type: 'day', workDate: dayjs() }}
        >
          <Form.Item name="type" label={<span style={{ fontWeight: 600 }}>Hình thức nghỉ:</span>}>
            <Radio.Group buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
              <Radio.Button value="day" style={{ flex: 1, textAlign: 'center' }}>Nghỉ theo ngày</Radio.Button>
              <Radio.Button value="shift" style={{ flex: 1, textAlign: 'center' }}>Nghỉ theo ca</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.type !== cur.type}>
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              if (type === 'day') {
                return (
                  <Form.Item
                    name="workDate"
                    label={<span style={{ fontWeight: 600 }}>Chọn ngày xin nghỉ:</span>}
                    rules={[{ required: true, message: 'Vui lòng chọn ngày xin nghỉ!' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format="DD/MM/YYYY"
                      size="large"
                      disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))}
                    />
                  </Form.Item>
                );
              }
              return (
                <Form.Item
                  name="shiftScheduleId"
                  label={<span style={{ fontWeight: 600 }}>Chọn ca trực muốn xin nghỉ:</span>}
                  rules={[{ required: true, message: 'Vui lòng chọn ca!' }]}
                >
                  <Select
                    size="large"
                    placeholder="Chọn ca trực..."
                    options={schedules
                      .filter(s => (s.accountId === (user?.id || s.accountId)) && s.status !== 'ABSENT' && s.status !== 'LEAVE_APPROVED')
                      .map(s => {
                        const sh = getShiftDetails(s.shiftId);
                        return {
                          value: s.id,
                          label: `${dayjs(s.workDate).format('DD/MM')} - ${sh.name} (${sh.time})`,
                        };
                      })}
                    onChange={(val) => {
                      const found = schedules.find(s => s.id === val);
                      if (found) setSelectedSchedule(found);
                    }}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item
            name="reason"
            label={<span style={{ fontWeight: 600 }}>Lý do xin nghỉ:</span>}
            rules={[{ required: true, message: 'Vui lòng nhập lý do xin nghỉ!' }]}
          >
            <Input.TextArea rows={3} placeholder="Ví dụ: Bận việc cá nhân, ốm đau..." style={{ borderRadius: '6px' }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <Button size="large" onClick={() => setLeaveModalOpen(false)} style={{ borderRadius: '6px' }}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={leaveLoading}
              icon={<FileTextOutlined />}
              style={{ background: '#722ed1', borderColor: '#722ed1', fontWeight: 'bold', borderRadius: '6px', color: '#fff' }}
            >
              Gửi đơn xin nghỉ
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Branch Selection Modal - when employee has shifts at multiple branches today */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '17px', color: '#16a34a' }}>
            <AimOutlined />
            <span>CHỌN CHI NHÁNH ĐIỂM DANH</span>
          </div>
        }
        open={checkinBranchModalOpen}
        onCancel={() => setCheckinBranchModalOpen(false)}
        footer={null}
        width={380}
        destroyOnClose
      >
        <div style={{ marginTop: '12px', marginBottom: '8px', color: '#475569', fontSize: '14px' }}>
          Bạn có ca làm việc tại nhiều chi nhánh hôm nay. Vui lòng chọn chi nhánh cần điểm danh:
        </div>
        {(() => {
          const today = dayjs().format('YYYY-MM-DD');
          const myUserId = user?.id;
          const todaySchedules = schedules.filter(
            (s) => dayjs(s.workDate).format('YYYY-MM-DD') === today
              && (!myUserId || s.accountId === myUserId)
          );
          const uniqueBranchIds = [...new Set(todaySchedules.map((s) => s.branchId))];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              {uniqueBranchIds.map((bId) => (
                <Button
                  key={bId}
                  type={checkinBranchId === bId ? 'primary' : 'default'}
                  size="large"
                  style={{
                    background: checkinBranchId === bId ? '#16a34a' : '#fff',
                    borderColor: '#16a34a',
                    color: checkinBranchId === bId ? '#fff' : '#16a34a',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    textAlign: 'left',
                  }}
                  onClick={() => setCheckinBranchId(bId)}
                >
                  {getBranchName(bId)}
                </Button>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <Button size="large" onClick={() => setCheckinBranchModalOpen(false)}>Hủy</Button>
                <Button
                  type="primary"
                  size="large"
                  loading={checkinLoading}
                  icon={<AimOutlined />}
                  style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 'bold' }}
                  onClick={() => {
                    if (checkinBranchId) {
                      setCheckinBranchModalOpen(false);
                      doCheckInWithShift(checkinBranchId);
                    }
                  }}
                >
                  Điểm danh
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal chọn ca làm việc điểm danh */}
      <Modal
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#16a34a' }} />
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>Chọn ca làm việc để điểm danh</span>
          </Space>
        }
        open={checkinShiftModalOpen}
        onCancel={() => setCheckinShiftModalOpen(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        <div style={{ marginBottom: 14, color: '#4b5563', fontSize: 14 }}>
          Danh sách ca làm việc của bạn hôm nay (<strong>{dayjs().format('DD/MM/YYYY')}</strong>):
        </div>

        <List
          dataSource={todayShiftSchedules}
          renderItem={(item) => {
            const shiftObj = shifts.find((s) => s.id === item.shiftId);
            const shiftName = shiftObj?.name || `Ca #${item.shiftId}`;
            const startTime = shiftObj?.startTime ? shiftObj.startTime.substring(0, 5) : '--:--';
            const endTime = shiftObj?.endTime ? shiftObj.endTime.substring(0, 5) : '--:--';
            const branchName = getBranchName(item.branchId);
            const status = item.status;

            let statusTag = null;
            let actionButton = null;

            if (status === 'Working') {
              statusTag = <Tag color="processing" icon={<SyncOutlined spin />}>Đang làm việc</Tag>;
              actionButton = (
                <Button
                  type="primary"
                  danger
                  size="large"
                  loading={checkinLoading}
                  onClick={() => doCheckInWithShift(item.branchId, item.id)}
                >
                  Check-out
                </Button>
              );
            } else if (status === 'Completed') {
              statusTag = <Tag color="success">Đã hoàn thành</Tag>;
              actionButton = (
                <Button
                  disabled
                  style={{
                    backgroundColor: '#f6ffed',
                    borderColor: '#b7eb8f',
                    color: '#52c41a',
                    fontWeight: 'bold',
                  }}
                >
                  Đã hoàn thành
                </Button>
              );
            } else if (status === 'Absent') {
              statusTag = <Tag color="error">Vắng mặt</Tag>;
              actionButton = <Button disabled>Đã vắng mặt</Button>;
            } else {
              // Scheduled, Approved, Pending
              statusTag = <Tag color="warning">Chưa điểm danh</Tag>;
              actionButton = (
                <Button
                  type="primary"
                  size="large"
                  style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', fontWeight: 'bold' }}
                  loading={checkinLoading}
                  onClick={() => doCheckInWithShift(item.branchId, item.id)}
                >
                  Check-in
                </Button>
              );
            }

            return (
              <List.Item
                style={{
                  padding: '14px 18px',
                  borderRadius: 10,
                  marginBottom: 10,
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <strong style={{ fontSize: 15, color: '#111827' }}>{shiftName}</strong>
                    {statusTag}
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: '1.6' }}>
                    <div>🕒 Giờ ca: <strong>{startTime} - {endTime}</strong></div>
                    <div>🏢 Chi nhánh: <strong>{branchName}</strong></div>
                    {item.checkInAt && (
                      <div style={{ color: '#16a34a', fontSize: 12, marginTop: 2 }}>
                        ✅ Check-in: {dayjs(item.checkInAt).format('HH:mm:ss')}
                      </div>
                    )}
                    {item.checkOutAt && (
                      <div style={{ color: '#2563eb', fontSize: 12, marginTop: 2 }}>
                        🏁 Check-out: {dayjs(item.checkOutAt).format('HH:mm:ss')}
                      </div>
                    )}
                  </div>
                </div>
                <div>{actionButton}</div>
              </List.Item>
            );
          }}
        />
      </Modal>

      {/* Shift Feedback Modal */}
      <ShiftFeedbackModal
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        schedule={feedbackSchedule}
        allSchedules={schedules}
        shifts={shifts}
        branches={branches}
        onSuccess={loadData}
      />
    </div>
  );
};

export default MyWorkSchedulePage;
