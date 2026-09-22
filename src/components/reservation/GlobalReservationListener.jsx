import React, { useEffect } from 'react';
import { notification, Button, message } from 'antd';
import { useSignalR } from '../../context/SignalRContext';
import axiosInstance from '../../api/axiosInstance';

const GlobalReservationListener = () => {
  const connection = useSignalR();

  useEffect(() => {
    if (!connection) return;

    const handleConflict = (data) => {
      // data: { ReservationId, TableId, TableName, BranchId, ReservationTime, Message }
      // Play a simple alert sound
      const audio = new Audio('/sounds/alert.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));

      // Show notification
      const key = `conflict-${data.ReservationId}`;
      notification.warning({
        key,
        message: 'Cảnh Báo Xung Đột Bàn',
        description: data.Message,
        duration: 0, // Don't auto close
        placement: 'topRight',
      });
    };

    const handleLateWarning = (data) => {
      const audio = new Audio('/sounds/alert.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));

      const key = `late-${data.ReservationId}`;
      notification.warning({
        key,
        message: 'Cảnh Báo Đơn Quá Hạn',
        description: data.Message,
        duration: 0,
        placement: 'topRight',
        btn: (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="primary"
              size="small"
              onClick={async () => {
                try {
                  await axiosInstance.put(`/api/Reservation/${data.ReservationId}/extend?minutes=30`);
                  message.success('Đã gia hạn thêm 30 phút thành công!');
                  notification.destroy(key);
                } catch (error) {
                  message.error('Lỗi khi gia hạn!');
                }
              }}
            >
              Gia hạn 30 phút
            </Button>
            <Button
              size="small"
              onClick={() => {
                notification.destroy(key);
              }}
            >
              Bỏ qua
            </Button>
          </div>
        ),
      });
    };

    connection.on('TableConflictWarning', handleConflict);
    connection.on('ReservationLateWarning', handleLateWarning);

    return () => {
      connection.off('TableConflictWarning', handleConflict);
      connection.off('ReservationLateWarning', handleLateWarning);
    };
  }, [connection]);

  return null;
};

export default GlobalReservationListener;
