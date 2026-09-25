import React, { useState } from 'react';
import { Result, Button, Spin, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useShiftSession } from '../hooks/useShiftSession';
import CashierPage from './CashierPage';

const CashierSessionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDisconnect = () => {
    navigate('/home');
  };

  const { loading, authorized, shiftInfo, denyReason, checkAttendanceAndShift } = useShiftSession(handleDisconnect);

  const handleRefresh = () => {
    checkAttendanceAndShift();
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" tip="Đang kiểm tra dữ liệu điểm danh..." />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <Result
          status="403"
          title="Chưa Thể Kết Nối Phiên Thu Ngân"
          subTitle={denyReason || "Bạn chưa thực hiện điểm danh ca làm việc hôm nay."}
          extra={[
            <Button type="primary" key="schedule" onClick={() => navigate('/work-schedule')}>
              Vào Lịch Làm Việc & Điểm Danh
            </Button>,
            <Button key="home" onClick={() => navigate('/home')}>
              Trang Chủ
            </Button>
          ]}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {shiftInfo && (
        <Alert
          message={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <strong> Phiên Thu Ngân Cá Nhân (Mobile/Web)</strong> | Nhân viên: {user?.name} | Ca: {shiftInfo.name} ({shiftInfo.time})
              </span>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh}>
                Làm mới
              </Button>
            </div>
          }
          type="info"
          showIcon
          banner
          style={{ marginBottom: 0 }}
        />
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <CashierPage key={`cashier-page-${refreshKey}`} />
      </div>
    </div>
  );
};

export default CashierSessionPage;
