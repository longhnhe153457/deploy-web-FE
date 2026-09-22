import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

/**
 * Bảo vệ route: yêu cầu đăng nhập
 * Nếu chưa đăng nhập → redirect về /login
 */
const PrivateRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner fullScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
};

export default PrivateRoute;
