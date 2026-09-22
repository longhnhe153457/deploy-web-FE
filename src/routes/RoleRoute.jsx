import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { message } from 'antd';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

/**
 * Bảo vệ route: yêu cầu role cụ thể
 * @param {{ allowedRoles: string[] }} props
 */
const RoleRoute = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  const isAllowed = hasRole ? hasRole(...allowedRoles) : false;

  useEffect(() => {
    if (isAuthenticated && !isAllowed && !isLoading) {
      message.warning('Bạn không có quyền truy cập vào trang này.');
    }
  }, [isAuthenticated, isAllowed, isLoading]);

  if (isLoading) return <Spinner fullScreen />;

  // Nếu chưa đăng nhập -> về trang /login
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;

  // Nếu đã đăng nhập nhưng không có quyền -> về lại trang trước đó (hoặc /home)
  if (!isAllowed) {
    const referrer = location.state?.from?.pathname || '/home';
    const fallbackTarget = referrer === location.pathname ? '/home' : referrer;
    return <Navigate to={fallbackTarget} replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
