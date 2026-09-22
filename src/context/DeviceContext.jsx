import { createContext, useContext, useState, useEffect } from 'react';
import { validateDevice } from '../api/deviceApi';
import { message } from 'antd';
import { useAuth } from './AuthContext';

const DeviceContext = createContext();

export const useDevice = () => useContext(DeviceContext);

export const DeviceProvider = ({ children }) => {
  const { user } = useAuth();
  const [deviceToken, setDeviceToken] = useState(localStorage.getItem('device_token') || null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [deviceEmployee, setDeviceEmployee] = useState(null);
  const [isDeviceMode, setIsDeviceMode] = useState(!!deviceToken);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initDevice = async () => {
      if (deviceToken) {
        try {
          const res = await validateDevice(deviceToken);
          setDeviceInfo(res.data);
          setIsDeviceMode(true);
        } catch (error) {
          console.error("Device validation failed:", error);
          const isManagerOrAdmin = user?.roles?.some(r => ['Admin', 'Owner', 'Manager'].includes(r)) || 
                                   ['Admin', 'Owner', 'Manager'].includes(user?.role) ||
                                   ['Admin', 'Owner', 'Manager'].includes(user?.roleName);
          
          if (!isManagerOrAdmin) {
            if (error.response?.status === 403) {
              message.error(error.response?.data?.message || "Thiết bị đã bị thu hồi.");
            } else {
              message.error("Thiết bị không hợp lệ.");
            }
          }
          setDeviceInfo({ isActive: false });
        }
      } else {
        setIsDeviceMode(false);
      }
      setIsLoading(false);
    };

    initDevice();
  }, [deviceToken, user]);

  const setupDevice = (token, info) => {
    localStorage.setItem('device_token', token);
    setDeviceToken(token);
    setDeviceInfo(info);
    setIsDeviceMode(true);
  };

  const loginEmployee = (employee) => {
    setDeviceEmployee(employee);
  };

  const logoutEmployee = () => {
    setDeviceEmployee(null);
  };

  const resetDevice = () => {
    localStorage.removeItem('device_token');
    setDeviceToken(null);
    setDeviceInfo(null);
    setDeviceEmployee(null);
    setIsDeviceMode(false);
  };

  return (
    <DeviceContext.Provider
      value={{
        deviceToken,
        deviceInfo,
        deviceEmployee,
        isDeviceMode,
        isLoading,
        setupDevice,
        loginEmployee,
        logoutEmployee,
        resetDevice,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};
