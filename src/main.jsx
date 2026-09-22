import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AntdApp } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

import { AuthProvider } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { DeviceProvider } from './context/DeviceContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';

import './index.css';
import App from './App.jsx';

// ─── Ant Design theme: màu thương hiệu MenuGo ─────────────────────────────
const antdTheme = {
  token: {
    colorPrimary: '#E8442A',
    colorLink: '#E8442A',
    borderRadius: 8,
    fontFamily: "'Be Vietnam Pro', 'Inter', sans-serif",
  },
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider theme={antdTheme} locale={viVN}>
      <AntdApp>
        <AuthProvider>
          <BranchProvider>
            <DeviceProvider>
              <CustomerAuthProvider>
                <App />
              </CustomerAuthProvider>
            </DeviceProvider>
          </BranchProvider>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>
);
