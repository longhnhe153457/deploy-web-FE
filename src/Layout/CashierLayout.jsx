import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { LoginOutlined } from '@ant-design/icons';

/**
 * Layout full-screen cho màn thu ngân & đặt bàn
 * Không có Sidebar - có nút quay về nếu cần
 */
const CashierLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="cashier-layout">
      {/* Mini header chỉ có logo và nút thoát */}
      <div className="cashier-header">
        <div className="cashier-header-logo">
          <span>🍜</span>
          <span className="cashier-header-title">MenuGo — Thu Ngân</span>
        </div>
        <Button
          type="text"
          icon={<LoginOutlined />}
          className="cashier-exit-btn"
          onClick={() => navigate('/login')}
        >
          Đăng nhập
        </Button>
      </div>

      <main className="cashier-content">
        <Outlet />
      </main>
    </div>
  );
};

export default CashierLayout;
