import React, { useState, useEffect } from 'react';
import { Result, Button, Spin, Alert, Tabs, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { TableOutlined, ShoppingCartOutlined, ReloadOutlined } from '@ant-design/icons';
import TableMapPage from './TableMapPage';
import OrderPage from './OrderPage';
import { useAuth } from '../context/AuthContext';
import { useSignalR } from '../context/SignalRContext';
import { useShiftSession } from '../hooks/useShiftSession';

const WaiterMobileSessionPage = () => {
  const { user } = useAuth();
  const connection = useSignalR();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tablemap');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDisconnect = () => {
    navigate('/home');
  };

  const { loading, authorized, shiftInfo, denyReason, checkAttendanceAndShift } = useShiftSession(handleDisconnect);

  // Join SignalR groups khi waiter mở phiên làm việc
  useEffect(() => {
    if (!connection || !authorized || !user) return;

    const branchId = user.branchId;
    const accountId = user.id;

    if (branchId) {
      connection.invoke('JoinOnDuty', branchId).catch(console.error);
    }
    if (accountId) {
      connection.invoke('JoinWaiterGroup', accountId).catch(console.error);
    }

    return () => {
      if (branchId) {
        connection.invoke('LeaveOnDuty', branchId).catch(console.error);
      }
      if (accountId) {
        connection.invoke('LeaveWaiterGroup', accountId).catch(console.error);
      }
    };
  }, [connection, authorized, user]);



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
          title="Chưa Thể Kết Nối Phiên Phục Vụ"
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
                <strong> Phiên Phục Vụ Cá Nhân (Mobile)</strong> | Nhân viên: {user?.name} | Ca: {shiftInfo.name} ({shiftInfo.time})
              </span>
              <Button size="small" icon={<ReloadOutlined />} onClick={() => setRefreshKey(prev => prev + 1)}>
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

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '8px' }}
        items={[
          {
            key: 'tablemap',
            label: (
              <span>
                <TableOutlined />
                Sơ Đồ Bàn & Trạng Thái
              </span>
            ),
            children: (
              <div style={{ height: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                <TableMapPage key={`tablemap-${refreshKey}`} isWaiterMode={true} />
              </div>
            )
          },
          {
            key: 'order',
            label: (
              <span>
                <ShoppingCartOutlined />
                Gọi Món Cho Khách (Order)
              </span>
            ),
            children: (
              <div style={{ height: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                <OrderPage key={`order-${refreshKey}`} isWaiterMode={true} />
              </div>
            )
          }
        ]}
      />
    </div>
  );
};

export default WaiterMobileSessionPage;
