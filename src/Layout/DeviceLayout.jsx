import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDevice } from '../context/DeviceContext';
import { Button, Tooltip, message } from 'antd';
import { LogoutOutlined, LockOutlined, DesktopOutlined, LoginOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import DeviceEmployeeLoginModal from '../components/DeviceEmployeeLoginModal';
import '../styles/devicelayout.css';

const DeviceLayout = () => {
  const { deviceInfo, deviceEmployee, loginEmployee, logoutEmployee, resetDevice } = useDevice();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginVisible, setLoginVisible] = useState(false);
  const [scannedEmail, setScannedEmail] = useState('');
  const pressTimerRef = useRef(null);
  const connectionRef = useRef(null);

  useEffect(() => {
    if (!deviceEmployee && deviceInfo && deviceInfo.deviceType === 'POS') {
      if (!loginVisible) setLoginVisible(true);
    }
  }, [deviceEmployee, deviceInfo, loginVisible]);

  useEffect(() => {
    if (!deviceEmployee || !deviceEmployee.disconnectTime) return;

    const warnTime = deviceEmployee.shiftEndTime ? new Date(deviceEmployee.shiftEndTime).getTime() : null;
    const disconnectTime = new Date(deviceEmployee.disconnectTime).getTime();

    let warnTimer = null;
    let disconnectTimer = null;

    const now = Date.now();

    if (warnTime && warnTime > now) {
      warnTimer = setTimeout(() => {
        message.warning({
          content: 'Ca làm việc của bạn đã hết giờ chuẩn. Bạn có 30 phút gia hạn trước khi hệ thống ngắt kết nối.',
          duration: 10,
        });
      }, warnTime - now);
    }

    if (disconnectTime > now) {
      disconnectTimer = setTimeout(() => {
        message.error('Ca làm việc đã quá 30 phút gia hạn. Đã tự động ngắt kết nối.');
        logoutEmployee();
      }, disconnectTime - now);
    } else {
      message.error('Ca làm việc đã quá 30 phút gia hạn. Đã tự động ngắt kết nối.');
      logoutEmployee();
    }

    return () => {
      if (warnTimer) clearTimeout(warnTimer);
      if (disconnectTimer) clearTimeout(disconnectTimer);
    };
  }, [deviceEmployee, logoutEmployee]);

  useEffect(() => {
    const { deviceToken } = useDevice.getState ? useDevice.getState() : { deviceToken: localStorage.getItem('device_token') };
    const tokenToUse = deviceToken || localStorage.getItem('device_token');

    if (!tokenToUse || !deviceInfo?.isActive) return;

    const hubUrl = import.meta.env.DEV
      ? 'http://localhost:5067/notificationHub'
      : 'https://deploy-web-qms0pg.fly.dev/notificationHub';

    const setupSignalR = async () => {
      const conn = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect()
        .build();

      conn.on('DeviceAuthScanned', (data) => {
        const storedInfo = localStorage.getItem('device_info');
        let dType = 'POS';
        if (storedInfo) {
          try {
            dType = JSON.parse(storedInfo).deviceType;
          } catch (e) { }
        }

        if (dType === 'POS') {
          if (data && data.success && data.employee) {
            loginEmployee(data.employee);
            message.success(`Đăng nhập thành công: ${data.employee.name}`);
            setLoginVisible(false);
          } else {
            setScannedEmail(data.email);
            setLoginVisible(true);
          }
        } else {
          message.success(`Nhân viên ${data.email || data.employee?.email} vừa kết nối thành công!`);
        }
      });

      conn.on('AttendanceSuccess', (data) => {
        window.dispatchEvent(new CustomEvent('AttendanceSuccessEvent', { detail: data }));
      });

      try {
        await conn.start();
        await conn.invoke('JoinDeviceGroup', tokenToUse);
        connectionRef.current = conn;
      } catch (e) {
        console.error('SignalR Connection Error: ', e);
      }
    };

    setupSignalR();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, [deviceInfo?.isActive]);

  const handleLoginSuccess = (employee) => {
    setLoginVisible(false);
  };

  const startPress = () => {
    pressTimerRef.current = setTimeout(() => {
      const pin = prompt("Nhập mã PIN để reset thiết bị:");
      if (pin === "123456") {
        resetDevice();
        navigate('/login');
      }
    }, 5000);
  };
  const endPress = () => clearTimeout(pressTimerRef.current);

  return (
    <div className="device-layout">
      {/* Device Header */}
      <header className="device-header">
        <div
          className="device-header-left"
          onMouseDown={startPress}
          onMouseUp={endPress}
          onMouseLeave={endPress}
          onTouchStart={startPress}
          onTouchEnd={endPress}
        >
          <DesktopOutlined className="device-icon" />
          <div className="device-info">
            <span className="device-name">{deviceInfo?.name || 'Thiết bị quán'}</span>
            <span className="device-type">
              {deviceInfo?.deviceType === 'POS' && 'Máy Thu Ngân'}
              {deviceInfo?.deviceType === 'Waiter' && 'Máy Phục Vụ'}
              {deviceInfo?.deviceType === 'Kitchen' && 'Màn Hình Bếp'}
              {deviceInfo?.deviceType === 'Attendance' && 'Máy Điểm Danh'}
            </span>
          </div>
        </div>

        <div className="device-header-right">
          {deviceEmployee ? (
            <div className="device-employee">
              <span className="employee-name">👤 {deviceEmployee.name}</span>
              {deviceInfo?.deviceType === 'Waiter' || deviceInfo?.deviceType === 'Station' ? (
                <Tooltip title="Khóa màn hình (Quay về sơ đồ bàn)">
                  <Button type="text" icon={<LockOutlined />} onClick={logoutEmployee} danger>
                    Khóa
                  </Button>
                </Tooltip>
              ) : (
                <Button type="text" icon={<LogoutOutlined />} onClick={logoutEmployee} danger>
                  Đăng xuất
                </Button>
              )}
            </div>
          ) : deviceInfo?.deviceType === 'POS' ? (
            <div className="device-status-container" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="device-status">Trạng thái: Sẵn sàng</span>
              <Button type="primary" icon={<LoginOutlined />} onClick={() => setLoginVisible(true)}>
                Đăng nhập
              </Button>
            </div>
          ) : (
            <div className="device-status-container">
              <span className="device-status" style={{ color: '#52c41a', fontWeight: 'bold' }}>● Đang vận hành</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="device-content">
        {deviceInfo?.isActive === false ? (
          <div className="device-revoked">
            <h2>⛔ THIẾT BỊ ĐÃ BỊ THU HỒI QUYỀN</h2>
            <p>Vui lòng liên hệ quản lý để biết thêm chi tiết.</p>
            <p className="hint">Nhấn giữ logo góc trái 5 giây để cài đặt lại.</p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <DeviceEmployeeLoginModal
        open={loginVisible && deviceInfo?.deviceType === 'POS'}
        prefillEmail={scannedEmail}
        onCancel={() => {
          // Ngăn không cho tắt modal nếu là POS
          if (deviceInfo?.deviceType === 'POS') {
            return;
          }
          setLoginVisible(false);
          setScannedEmail('');
        }}
        onSuccess={(emp) => {
          handleLoginSuccess(emp);
          setScannedEmail('');
        }}
      />
    </div>
  );
};

export default DeviceLayout;
