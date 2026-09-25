import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { getCurrentShiftSession } from '../api/workScheduleApi';

export const useShiftSession = (onDisconnect) => {
  const { user } = useAuth();
  const branchContext = useBranch();
  const updateCurrentBranchFromShift = branchContext?.updateCurrentBranchFromShift;
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

      // Gọi 1 API duy nhất — backend đã xử lý toàn bộ logic lọc ca
      const res = await getCurrentShiftSession();
      const session = res.data;

      if (!session.authorized) {
        setAuthorized(false);
        setDenyReason(session.denyReason || 'Bạn chưa thực hiện điểm danh (Check-in) ca làm việc hôm nay.');
        return;
      }

      if (session.branchId) {
        localStorage.setItem('activeShiftBranchId', session.branchId.toString());
        if (updateCurrentBranchFromShift) {
          updateCurrentBranchFromShift(session.branchId);
        }
      }

      setShiftInfo({
        name: session.shiftName || 'Ca trực',
        time: session.shiftTime || '',
        shiftEndTime: dayjs(session.shiftEndTime),
        disconnectTime: dayjs(session.disconnectTime),
        branchId: session.branchId
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
    const now = Date.now();

    let warnTimer = null;

    if (warnTime > now) {
      warnTimer = setTimeout(() => {
        message.warning({
          content: 'Ca làm việc đã hết giờ chuẩn. Vui lòng check-out sau khi hoàn tất công việc (OT).',
          duration: 10,
        });
      }, warnTime - now);
    }

    return () => {
      if (warnTimer) clearTimeout(warnTimer);
    };
  }, [shiftInfo]);

  return { loading, authorized, shiftInfo, denyReason, checkAttendanceAndShift };
};
