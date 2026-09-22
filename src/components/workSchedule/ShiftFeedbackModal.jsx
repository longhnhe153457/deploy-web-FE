import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Input, Select, Button, message, Tag, Row, Col, DatePicker } from 'antd';
import { MessageOutlined, ClockCircleOutlined, CalendarOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useNavigate } from 'react-router-dom';
import { createShiftFeedback } from '../../api/shiftFeedbackApi';

dayjs.extend(isoWeek);

const formatOtStatus = (status) => {
  switch (status) {
    case 'Approved':
      return 'Đã duyệt';
    case 'Pending':
      return 'Chờ duyệt';
    case 'Rejected':
      return 'Từ chối';
    case 'None':
    default:
      return 'Không có';
  }
};

const getDayName = (dateStr) => {
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const d = dayjs(dateStr).day();
  return days[d] || '';
};

const ShiftFeedbackModal = ({ open, onClose, schedule, allSchedules = [], shifts = [], branches = [], onSuccess }) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);

  // Set of dates that have work schedules
  const availableDateSet = useMemo(() => {
    const set = new Set();
    (allSchedules || []).forEach((s) => {
      if (s.workDate) {
        set.add(dayjs(s.workDate).format('YYYY-MM-DD'));
      }
    });
    return set;
  }, [allSchedules]);

  const disabledDate = (current) => {
    if (!current) return false;
    const dateStr = current.format('YYYY-MM-DD');
    const todayStr = dayjs().format('YYYY-MM-DD');
    if (dateStr === todayStr) return false;
    return !availableDateSet.has(dateStr);
  };

  // Filter schedules for the selected date
  const schedulesInSelectedDate = useMemo(() => {
    if (!selectedDateKey) return allSchedules;
    return allSchedules
      .filter((s) => dayjs(s.workDate).format('YYYY-MM-DD') === selectedDateKey)
      .sort((a, b) => new Date(b.workDate) - new Date(a.workDate));
  }, [allSchedules, selectedDateKey]);

  // Active schedule details
  const activeSchedule = useMemo(() => {
    if (selectedScheduleId) {
      const found = allSchedules.find((s) => s.id === selectedScheduleId);
      if (found) return found;
    }
    if (schedulesInSelectedDate.length > 0) return schedulesInSelectedDate[0];
    if (schedule) return schedule;
    return allSchedules.length > 0 ? allSchedules[0] : null;
  }, [selectedScheduleId, schedule, allSchedules, schedulesInSelectedDate]);

  const activeShiftInfo = useMemo(() => {
    if (!activeSchedule) return null;
    const shift = shifts.find((s) => s.id === activeSchedule.shiftId);
    if (!shift) return { name: `Ca #${activeSchedule.shiftId}`, time: '' };
    return {
      name: shift.name,
      time: `${shift.startTime ? shift.startTime.substring(0, 5) : ''} - ${shift.endTime ? shift.endTime.substring(0, 5) : ''}`,
    };
  }, [activeSchedule, shifts]);

  const activeBranchName = useMemo(() => {
    if (!activeSchedule) return '';
    const b = branches.find((br) => br.id === activeSchedule.branchId);
    return b ? b.name : `Chi nhánh #${activeSchedule.branchId}`;
  }, [activeSchedule, branches]);

  // Initialize date & schedule selection when modal opens or schedule prop changes
  useEffect(() => {
    if (open) {
      const todayObj = dayjs();
      const todayStr = todayObj.format('YYYY-MM-DD');

      let targetDateObj = todayObj;
      let initialId = null;

      if (schedule) {
        targetDateObj = dayjs(schedule.workDate);
        initialId = schedule.id;
      } else if (allSchedules && allSchedules.length > 0) {
        const todaySched = allSchedules.find((s) => dayjs(s.workDate).format('YYYY-MM-DD') === todayStr);
        if (todaySched) {
          initialId = todaySched.id;
        }
      }

      const targetDateKey = targetDateObj.format('YYYY-MM-DD');

      setSelectedDateKey(targetDateKey);
      setSelectedScheduleId(initialId);

      form.resetFields();
      form.setFieldsValue({
        dateKey: targetDateObj,
        workScheduleId: initialId,
        feedbackType: 'OTDispute',
        title: 'Khiếu nại về OT ca làm',
      });
    }
  }, [open, schedule, allSchedules, form]);

  // When date selection changes, auto-pick first shift in that date
  const handleDateChange = (date) => {
    const dateStr = date ? date.format('YYYY-MM-DD') : null;
    setSelectedDateKey(dateStr);
    const shiftsInDate = dateStr
      ? allSchedules.filter((s) => dayjs(s.workDate).format('YYYY-MM-DD') === dateStr)
      : [];

    const firstId = shiftsInDate.length > 0 ? shiftsInDate[0].id : null;
    setSelectedScheduleId(firstId);
    form.setFieldsValue({
      dateKey: date,
      workScheduleId: firstId,
    });
  };

  const handleSubmit = async (values) => {
    const targetScheduleId = values.workScheduleId || activeSchedule?.id;
    if (!targetScheduleId) {
      message.warning('Vui lòng chọn ca làm việc cần phản hồi!');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        workScheduleId: targetScheduleId,
        feedbackType: values.feedbackType,
        title: values.title,
        content: values.content,
      };
      await createShiftFeedback(payload);
      message.success('🟢 Đã gửi phản hồi thành công! Chờ quản lý kiểm tra và trả lời.');
      form.resetFields();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Không thể gửi phản hồi ca làm!';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Format options for the filtered schedules dropdown (shifts in selected date)
  const scheduleSelectOptions = useMemo(() => {
    return schedulesInSelectedDate.map((item) => {
      const shift = shifts.find((s) => s.id === item.shiftId);
      const shiftName = shift?.name || `Ca #${item.shiftId}`;
      const timeStr = shift?.startTime && shift?.endTime
        ? `${shift.startTime.substring(0, 5)} - ${shift.endTime.substring(0, 5)}`
        : '';
      const branchName = branches.find((b) => b.id === item.branchId)?.name || '';

      const searchStr = `${shiftName} ${timeStr} ${branchName}`.toLowerCase();

      return {
        value: item.id,
        searchValue: searchStr,
        label: (
          <div style={{ padding: '4px 0', borderBottom: '1px dashed #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '13px' }}>
                🕒 {shiftName} ({timeStr})
              </span>
              {item.approvedOTHours > 0 ? (
                <Tag color="orange" style={{ margin: 0, fontSize: '11px', padding: '0 6px' }}>
                  OT: {item.approvedOTHours}h
                </Tag>
              ) : (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.status || ''}</span>
              )}
            </div>
            {branchName && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                📍 {branchName}
              </div>
            )}
          </div>
        ),
      };
    });
  }, [schedulesInSelectedDate, shifts, branches]);

  const handleOpenHistoryPage = () => {
    onClose();
    navigate('/my-shift-feedbacks');
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f97316', fontSize: '17px' }}>
            <MessageOutlined />
            <span>PHẢN HỒI / KHIẾU NẠI CA LÀM VIỆC</span>
          </div>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={handleOpenHistoryPage}
            style={{ color: '#0284c7', fontWeight: '600', padding: 0 }}
          >
            Xem lịch sử phản hồi
          </Button>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={580}
      destroyOnClose
    >
      <div style={{ paddingTop: '8px' }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col span={11}>
              {/* Step 1: Select Date */}
              <Form.Item
                name="dateKey"
                label={
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>
                    <CalendarOutlined style={{ color: '#ea580c', marginRight: 4 }} />
                    1. Chọn ngày:
                  </span>
                }
                rules={[{ required: true, message: 'Chọn ngày!' }]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày làm việc..."
                  defaultPickerValue={dayjs()}
                  style={{ width: '100%' }}
                  onChange={handleDateChange}
                  disabledDate={disabledDate}
                  cellRender={(current, info) => {
                    if (info.type !== 'date') return info.originNode;
                    const dateStr = dayjs(current).format('YYYY-MM-DD');
                    const hasShift = availableDateSet.has(dateStr);
                    if (hasShift) {
                      return (
                        <div className="ant-picker-cell-inner" style={{ fontWeight: 'bold', color: '#ea580c' }}>
                          {dayjs(current).date()}
                        </div>
                      );
                    }
                    return info.originNode;
                  }}
                />
              </Form.Item>
            </Col>

            <Col span={13}>
              {/* Step 2: Select Shift in Day */}
              <Form.Item
                name="workScheduleId"
                label={
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>
                    <ClockCircleOutlined style={{ color: '#ea580c', marginRight: 4 }} />
                    2. Chọn ca làm việc trong ngày:
                  </span>
                }
                rules={[{ required: true, message: 'Chọn ca làm việc!' }]}
              >
                <Select
                  showSearch
                  filterOption={(input, option) =>
                    (option?.searchValue || '').includes(input.toLowerCase())
                  }
                  placeholder={schedulesInSelectedDate.length === 0 ? 'Không có ca trong ngày này' : 'Chọn ca...'}
                  options={scheduleSelectOptions}
                  onChange={(val) => setSelectedScheduleId(val)}
                  notFoundContent="Không tìm thấy ca làm việc nào trong ngày này"
                  style={{ width: '100%' }}
                  popupMatchSelectWidth={false}
                  dropdownStyle={{ minWidth: '380px', maxWidth: '520px', padding: '6px' }}
                />
              </Form.Item>
            </Col>
          </Row>

          {activeSchedule && (
            <div
              style={{
                background: '#fff7ed',
                border: '1px solid #ffedd5',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#475569',
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#ea580c', marginBottom: '6px', fontSize: '14px' }}>
                Thông tin ca làm việc được chọn:
              </div>
              <div><strong>Chi nhánh:</strong> {activeBranchName}</div>
              <div><strong>Ca:</strong> {activeShiftInfo?.name} ({activeShiftInfo?.time})</div>
              <div><strong>Ngày:</strong> {dayjs(activeSchedule.workDate).format('DD/MM/YYYY')} ({getDayName(activeSchedule.workDate)})</div>
              <div>
                <strong>Giờ thực tế:</strong>{' '}
                {activeSchedule.actualHours !== null && activeSchedule.actualHours !== undefined
                  ? `${activeSchedule.actualHours} giờ`
                  : 'Chưa tính'}
              </div>
              <div>
                <strong>OT hiện tại:</strong>{' '}
                <Tag color={activeSchedule.approvedOTHours > 0 ? 'orange' : 'default'}>
                  {activeSchedule.approvedOTHours || 0} giờ ({formatOtStatus(activeSchedule.otStatus)})
                </Tag>
              </div>
            </div>
          )}

          <Form.Item
            name="feedbackType"
            label={<span style={{ fontWeight: '600' }}>Loại phản hồi:</span>}
            rules={[{ required: true, message: 'Vui lòng chọn loại phản hồi!' }]}
          >
            <Select
              options={[
                { value: 'OTDispute', label: 'Quản lý duyệt sai OT / Thiếu OT' },
                { value: 'HoursDispute', label: 'Sai tổng giờ công' },
                { value: 'AttendanceDispute', label: 'Nhầm lẫn điểm danh vào/ra' },
                { value: 'Other', label: 'Ý kiến / Khác' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="title"
            label={<span style={{ fontWeight: '600' }}>Tiêu đề:</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề phản hồi!' }]}
          >
            <Input placeholder="Ví dụ: Quản lý duyệt thiếu 1 tiếng OT" />
          </Form.Item>

          <Form.Item
            name="content"
            label={<span style={{ fontWeight: '600' }}>Nội dung chi tiết:</span>}
            rules={[{ required: true, message: 'Vui lòng nhập nội dung chi tiết!' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Mô tả cụ thể vấn đề (ví dụ: Ca tối qua em làm tăng ca từ 18h đến 20h20, nhờ Quản lý duyệt lại 2 tiếng OT giúp em)..."
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <Button type="text" icon={<HistoryOutlined />} onClick={handleOpenHistoryPage} style={{ color: '#0284c7' }}>
              Lịch sử phản hồi
            </Button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={onClose}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 'bold' }}
              >
                Gửi phản hồi cho Quản lý
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default ShiftFeedbackModal;
