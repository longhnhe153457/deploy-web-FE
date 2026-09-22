import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useDevice } from '../context/DeviceContext';
import Spinner from '../components/Spinner';

/**
 * Route cho Device Mode.
 * Kiểm tra xem thiết bị đã được setup chưa (isDeviceMode).
 * Kiểm tra xem có đúng loại thiết bị (DeviceType) yêu cầu không.
 */
const DeviceRoute = ({ allowedTypes = [] }) => {
  const { isDeviceMode, deviceInfo, isLoading } = useDevice();
  const location = useLocation();

  if (isLoading) return <Spinner fullScreen />;

  // Nếu chưa setup thiết bị -> Redirect về login (Management mode)
  if (!isDeviceMode) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Nếu có truyền allowedTypes, kiểm tra xem loại thiết bị hiện tại có nằm trong allowedTypes không
  if (allowedTypes.length > 0 && deviceInfo && !allowedTypes.includes(deviceInfo.deviceType)) {
    // Nếu sai loại thiết bị, redirect về landing page tương ứng
    switch (deviceInfo.deviceType) {
      case 'POS':
        return <Navigate to="/pos" replace />;
      case 'Waiter':
        return <Navigate to="/station" replace />;
      case 'Kitchen':
        return <Navigate to="/kitchen" replace />;
      case 'Attendance':
        return <Navigate to="/attendance" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
};

export default DeviceRoute;
