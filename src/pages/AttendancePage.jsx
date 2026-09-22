import React, { useState, useEffect } from 'react';
import { message, Result } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import DeviceQrCode from '../components/DeviceQrCode';
import { useSignalR } from '../context/SignalRContext';
import dayjs from 'dayjs';

const AttendancePage = () => {
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [attendanceEvent, setAttendanceEvent] = useState(null);
  const { hubConnection } = useSignalR();

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for CustomEvent AttendanceSuccessEvent dispatched by DeviceLayout
  useEffect(() => {
    const handleAttendanceSuccess = (e) => {
      const data = e.detail;
      setAttendanceEvent({
        ...data,
        timestamp: dayjs()
      });
      
      message.success({
        content: data.message || `Đã ${data.action === 'checkin' ? 'Vào ca' : 'Ra ca'} thành công!`,
        duration: 5,
        style: { fontSize: '18px', marginTop: '20vh' }
      });

      // Clear the prominent message after 5 seconds
      setTimeout(() => setAttendanceEvent(null), 5000);
    };

    window.addEventListener('AttendanceSuccessEvent', handleAttendanceSuccess);

    return () => {
      window.removeEventListener('AttendanceSuccessEvent', handleAttendanceSuccess);
    };
  }, []);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f0f2f5',
      position: 'relative'
    }}>
      {/* Clock Section */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ fontSize: '24px', color: '#8c8c8c', marginBottom: 8 }}>
          {currentTime.format('dddd, DD/MM/YYYY')}
        </div>
        <div style={{ fontSize: '80px', fontWeight: 'bold', color: '#1890ff', lineHeight: 1 }}>
          {currentTime.format('HH:mm:ss')}
        </div>
      </div>

      {/* QR Code Section */}
      {!attendanceEvent ? (
        <div style={{
          background: 'white',
          padding: 40,
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h2 style={{ marginBottom: 24, color: '#262626' }}>Quét Mã QR Để Điểm Danh</h2>
          <DeviceQrCode />
          <p style={{ marginTop: 24, color: '#8c8c8c', fontSize: '16px' }}>
            Sử dụng ứng dụng nhân viên để quét
          </p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          padding: 40,
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'fadeIn 0.5s'
        }}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title={<span style={{ fontSize: '32px' }}>{attendanceEvent.name}</span>}
            subTitle={<span style={{ fontSize: '24px', color: attendanceEvent.action === 'checkin' ? '#1890ff' : '#fa8c16' }}>
              {attendanceEvent.action === 'checkin' ? '👋 Đã Vào Ca' : '🏃 Đã Ra Ca'}
            </span>}
          />
          <div style={{ fontSize: '20px', marginTop: 16, fontWeight: 'bold' }}>
            Lúc: {attendanceEvent.timestamp.format('HH:mm:ss')}
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AttendancePage;
