import { Navigate, Outlet } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import Spinner from '../components/Spinner';

const CustomerPrivateRoute = () => {
  const { isAuthenticated, isLoading } = useCustomerAuth();

  if (isLoading) return <Spinner fullScreen />;
  if (!isAuthenticated) return <Navigate to="/customer/login" replace />;

  return <Outlet />;
};

export default CustomerPrivateRoute;
