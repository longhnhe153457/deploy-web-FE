import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { notification } from 'antd';
import { useSignalR } from '../context/SignalRContext';
import { useAuth } from '../context/AuthContext';
import SideBar from '../components/SideBar';
import ToTop from '../components/ToTop';
import { useBranch } from '../context/BranchContext';

/**
 * Layout chính của app sau khi đăng nhập
 * Bao gồm: SideBar cố định bên trái (có thể thu gọn/mở rộng) + nội dung trang tự điều chỉnh kích thước + nút ToTop
 */
const MainLayout = () => {
  const connection = useSignalR();
  const location = useLocation();
  const { user } = useAuth();
  const { isBranchInactive } = useBranch();
  const isFluid =
    location.pathname.startsWith('/product-catalog') ||
    location.pathname.startsWith('/inventory-management') ||
    location.pathname.includes('-detail') ||
    location.pathname.startsWith('/chat');

  // Sidebar collapse state initialized from localStorage
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem('sidebar_collapsed', String(nextState));
      // Dispatch resize event so Recharts & responsive containers auto-reflow cleanly
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 200);
      return nextState;
    });
  };

  useEffect(() => {
    if (connection && user) {
      // Tham gia group cá nhân
      if (user.id) connection.invoke('JoinUserGroup', user.id).catch(console.error);

      // CHỈ Manager/Admin join branch group → họ LUÔN nhận mọi thông báo
      const isManagerOrAdmin = user.role === 'Admin' || user.role === 'Owner' || user.role === 'Manager';
      if (isManagerOrAdmin && user.branchId) {
        connection.invoke('JoinBranchGroup', user.branchId).catch(console.error);
      }
    }
  }, [connection, user]);

  useEffect(() => {
    if (connection) {
      const handleNotification = (data) => {
        if (data.type === 'cooking-status-changed' && data.cookingStatus !== 'Ready') {
          return;
        }

        let title = 'Thông báo hệ thống';
        if (data.type === 'cooking-status-changed') {
          title = 'Thông báo từ Bếp';
        } else if (data.type === 'new-order') {
          title = 'Đơn hàng mới';
        } else if (data.type === 'call-staff') {
          title = 'Khách gọi phục vụ';
        }

        notification.info({
          message: title,
          description: data.message,
          placement: 'topRight',
          duration: 5,
        });
      };

      const handleWorkScheduleNotification = (data) => {
        notification.info({
          message: 'Thông báo Lịch làm việc',
          description: data.message,
          placement: 'topRight',
          duration: 5,
        });
        
        // Dispatch event so MyWorkSchedulePage can refresh data
        window.dispatchEvent(new Event('work-schedule-updated'));
      };

      connection.on('ReceiveNotification', handleNotification);
      connection.on('ReceiveWorkScheduleNotification', handleWorkScheduleNotification);

      return () => {
        connection.off('ReceiveNotification', handleNotification);
        connection.off('ReceiveWorkScheduleNotification', handleWorkScheduleNotification);
      };
    }
  }, [connection]);

  return (
    <div className={`main-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <SideBar collapsed={collapsed} onToggleCollapse={handleToggleCollapse} />
      <div className="main-content-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
        {isBranchInactive && (
          <div style={{
            background: '#fff2f0',
            borderBottom: '1px solid #ffccc7',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#ff4d4f',
            fontWeight: 600,
            fontSize: '13px',
            zIndex: 100,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <span role="img" aria-label="warning" style={{ fontSize: '15px' }}>⚠️</span>
            <span>
              <strong>Chi nhánh này đã ngừng kinh doanh.</strong> Hệ thống đang hiển thị ở chế độ xem lịch sử. Toàn bộ các chức năng thêm mới, chỉnh sửa, và xóa đều bị khóa.
            </span>
          </div>
        )}
        <main className={`main-content ${isFluid ? 'fluid' : ''}`}>
          <Outlet />
        </main>
      </div>
      <ToTop />
    </div>
  );
};

export default MainLayout;
