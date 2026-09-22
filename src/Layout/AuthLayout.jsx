import { Outlet } from 'react-router-dom';

/**
 * Layout cho trang đăng nhập / đăng ký
 * Không có Sidebar, không có gì cả - chỉ render nội dung trang
 */
const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
