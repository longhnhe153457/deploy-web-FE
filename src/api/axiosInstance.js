import axios from 'axios';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  || (import.meta.env.DEV ? 'http://localhost:5067' : 'https://deploy-web-production.up.railway.app');

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

// ─── Request Interceptor ───────────────────────────────────────────────────
// Tự động đính kèm JWT token vào mỗi request
axiosInstance.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem('access_token');
    const isCustomerPortalRoute = config.url && !config.url.includes('/api/CustomerManagement') && (config.url.includes('/api/CustomerPortal') || config.url.includes('/api/CustomerAuth') || config.url.includes('/api/Customer/'));
    if (isCustomerPortalRoute) {
      const customerToken = localStorage.getItem('customer_access_token');
      if (customerToken) {
        token = customerToken;
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Block write operations if the selected branch is inactive (except updating the branch itself to active)
    const currentBranchStatus = localStorage.getItem('currentBranchStatus');
    if (token && currentBranchStatus === 'Ngừng kinh doanh') {
      const method = (config.method || 'GET').toUpperCase();
      const isWriteMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
      if (isWriteMethod) {
        const urlLower = (config.url || '').toLowerCase();
        const isBranchUpdate = urlLower.includes('/api/branch') || urlLower.includes('/api/Branch');
        const isAuthRequest = urlLower.includes('/api/auth') || urlLower.includes('/api/Auth');
        if (!isBranchUpdate && !isAuthRequest) {
          const error = new Error('Thao tác bị từ chối: Chi nhánh này đã ngừng kinh doanh. Không thể thực hiện các thao tác thay đổi dữ liệu.');
          error.response = {
            status: 400,
            data: { message: error.message }
          };
          return Promise.reject(error);
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ──────────────────────────────────────────────────
// Xử lý lỗi toàn cục và chuẩn hóa thông điệp lỗi
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    let detailedMessage = '';

    if (error.response?.data) {
      const data = error.response.data;
      // 1. Khớp chuẩn ProblemDetails (trường detail)
      if (data.detail) {
        detailedMessage = data.detail;
      }
      // 2. Khớp lỗi custom cũ (trường message hoặc title)
      else if (data.message) {
        detailedMessage = data.message;
      } else if (data.title) {
        detailedMessage = data.title;
      }
      // 3. Khớp lỗi ModelState validation (trường errors)
      else if (data.errors && typeof data.errors === 'object') {
        const firstErrorList = Object.values(data.errors)[0];
        detailedMessage = Array.isArray(firstErrorList) ? firstErrorList[0] : String(firstErrorList);
      }
    }

    if (detailedMessage) {
      error.message = detailedMessage;
      // Gán vào error.response.data.message để các catch block cũ nhận diện được ngay
      if (error.response.data && typeof error.response.data === 'object') {
        error.response.data.message = detailedMessage;
      }
    } else if (error.response) {
      // 4. Nếu không có thông điệp chi tiết từ Backend, dịch các mã lỗi HTTP phổ biến sang tiếng Việt
      const status = error.response.status;
      let fallbackMsg = '';
      if (status === 400) {
        fallbackMsg = 'Yêu cầu không hợp lệ hoặc dữ liệu sai định dạng (400).';
      } else if (status === 404) {
        fallbackMsg = 'Không tìm thấy tài nguyên hoặc đường dẫn yêu cầu (404).';
      } else if (status === 409) {
        fallbackMsg = 'Dữ liệu bị trùng lặp hoặc xung đột với dữ liệu hiện có (409).';
      } else if (status === 500) {
        fallbackMsg = 'Máy chủ gặp sự cố nội bộ. Vui lòng thử lại sau (500).';
      } else if (status >= 502 && status <= 504) {
        fallbackMsg = 'Không thể kết nối tới máy chủ hoặc máy chủ đang bảo trì (Gateway Error).';
      }

      if (fallbackMsg) {
        error.message = fallbackMsg;
        if (!error.response.data) error.response.data = {};
        if (typeof error.response.data === 'object') {
          error.response.data.message = fallbackMsg;
        }
      }
    } else {
      // 5. Nếu hoàn toàn không nhận được response (ví dụ: máy chủ bị tắt, rớt mạng Wi-Fi)
      error.message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc máy chủ.';
    }

    // Xử lý lỗi toàn cục
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isCustomerRoute = !url.includes('/api/CustomerManagement') && (url.includes('/api/CustomerPortal') || url.includes('/api/CustomerAuth') || url.includes('/api/Customer/'));
      if (isCustomerRoute) {
        localStorage.removeItem('customer_access_token');
        localStorage.removeItem('customer');
        window.location.href = '/customer/login';
      } else {
        const token = localStorage.getItem('access_token');
        const isLoginOrAuth = url.includes('/api/auth') || url.includes('/api/Auth');
        if (token && !isLoginOrAuth) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    } else if (error.response?.status === 403) {
      // 403 Forbidden: không xóa session và không redirect về login/unauthorized, chỉ từ chối promise
      error.message = 'Bạn không có quyền thực hiện thao tác này (403).';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
