import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { getMyWorkSchedules } from '../api/workScheduleApi';
import { getAllShifts } from '../api/shiftApi';

export const useShiftSession = (onDisconnect) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [shiftInfo, setShiftInfo] = useState(null);
  const [denyReason, setDenyReason] = useState('');

  const checkAttendanceAndShift = useCallback(async () => {
    try {
      setLoading(true);

      const isManager = user?.roles?.includes('Manager') || user?.role === 'Manager' || user?.roleName === 'Manager' || 
                        user?.roles?.includes('Admin') || user?.role === 'Admin' || user?.roleName === 'Admin' ||
                        user?.roles?.includes('Owner') || user?.role === 'Owner' || user?.roleName === 'Owner';
      if (isManager) {
        setAuthorized(true);
        setShiftInfo({
          name: 'Phiên Quản Lý',
          time: 'Không giới hạn',
          shiftEndTime: dayjs().add(24, 'hour'),
          disconnectTime: dayjs().add(24, 'hour')
        });
        return;
      }

      const [schedulesRes, shiftsRes] = await Promise.all([
        getMyWorkSchedules(),
        getAllShifts()
      ]);

      const schedules = schedulesRes.data || [];
      const shifts = shiftsRes.data || [];

      const todayStr = dayjs().format('YYYY-MM-DD');
      const todaySchedules = schedules.filter(s => dayjs(s.workDate).format('YYYY-MM-DD') === todayStr);

      const checkedInSchedule = todaySchedules.find(s => s.status === 'Working')
        || todaySchedules.filter(s => s.checkInAt != null).pop();

      if (!checkedInSchedule) {
        setAuthorized(false);
        setDenyReason('Bạn chưa thực hiện điểm danh (Check-in) ca làm việc hôm nay.');
        return;
      }

      const shift = shifts.find(sh => sh.id === checkedInSchedule.shiftId);
      const endStr = shift?.endTime ? shift.endTime.substring(0, 5) : '23:59';
      const shiftEndTime = dayjs(`${todayStr} ${endStr}`);
      const disconnectTime = shiftEndTime.add(30, 'minute');

      const now = dayjs();

      if (now.isAfter(disconnectTime)) {
        setAuthorized(false);
        setDenyReason('Ca làm việc hôm nay của bạn đã kết thúc quá 30 phút.');
        return;
      }

      setShiftInfo({
        name: shift?.name || 'Ca trực',
        time: `${shift?.startTime?.substring(0, 5)} - ${endStr}`,
        shiftEndTime,
        disconnectTime
      });
      setAuthorized(true);
    } catch (err) {
      console.error(err);
      setAuthorized(false);
      setDenyReason('Không thể kiểm tra thông tin điểm danh & ca làm việc.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAttendanceAndShift();
  }, [checkAttendanceAndShift]);

  useEffect(() => {
    if (!shiftInfo || shiftInfo.time === 'Không giới hạn') return;

    const warnTime = shiftInfo.shiftEndTime.valueOf();
    const disconnectTime = shiftInfo.disconnectTime.valueOf();
    const now = Date.now();

    let warnTimer = null;
    let disconnectTimer = null;

    if (warnTime > now) {
      warnTimer = setTimeout(() => {
        message.warning({
          content: 'Ca làm việc của bạn đã hết giờ chuẩn. Bạn có 30 phút gia hạn trước khi hệ thống ngắt kết nối.',
          duration: 10,
        });
      }, warnTime - now);
    }

    if (disconnectTime > now) {
      disconnectTimer = setTimeout(() => {
        message.error('Ca làm việc đã quá 30 phút gia hạn. Đã ngắt kết nối phiên làm việc.');
        if (onDisconnect) onDisconnect();
      }, disconnectTime - now);
    } else {
      message.error('Ca làm việc đã quá 30 phút gia hạn. Đã ngắt kết nối phiên làm việc.');
      if (onDisconnect) onDisconnect();
    }

    return () => {
      if (warnTimer) clearTimeout(warnTimer);
      if (disconnectTimer) clearTimeout(disconnectTimer);
    };
  }, [shiftInfo, onDisconnect]);

  return { loading, authorized, shiftInfo, denyReason, checkAttendanceAndShift };
};
