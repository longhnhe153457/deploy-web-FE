import { createContext, useContext, useState, useEffect } from 'react';
import { getCustomerProfile } from '../api/customerPortalApi';

const CustomerAuthContext = createContext(null);

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(() => {
    const saved = localStorage.getItem('customer');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('customer_access_token'));
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token;

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await getCustomerProfile();
          setCustomer(res.data);
          localStorage.setItem('customer', JSON.stringify(res.data));
        } catch {
          // Token expired or invalid -> log out
          localStorage.removeItem('customer_access_token');
          localStorage.removeItem('customer');
          setToken(null);
          setCustomer(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  const setAuth = (newToken, customerData) => {
    localStorage.setItem('customer_access_token', newToken);
    localStorage.setItem('customer', JSON.stringify(customerData));
    setToken(newToken);
    setCustomer(customerData);
  };

  const updateCustomer = (patch) => {
    setCustomer((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('customer', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('customer_access_token');
    localStorage.removeItem('customer');
    setToken(null);
    setCustomer(null);
  };

  const value = {
    customer,
    token,
    isAuthenticated,
    isLoading,
    setAuth,
    updateCustomer,
    logout,
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth phải được dùng bên trong <CustomerAuthProvider>');
  }
  return context;
};
