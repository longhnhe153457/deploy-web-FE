import axiosInstance from './axiosInstance';

// Helper lấy guest token từ localStorage
export const getStoredGuestToken = () => {
  return localStorage.getItem('menugo_guest_token') || '';
};

export const getStoredGuestId = () => {
  return localStorage.getItem('menugo_guest_id') || '';
};

export const setStoredGuestSession = (session) => {
  if (session) {
    if (session.token) localStorage.setItem('menugo_guest_token', session.token);
    if (session.guestId) localStorage.setItem('menugo_guest_id', session.guestId);
    if (session.guestName) localStorage.setItem('menugo_guest_name', session.guestName);
  }
};

// API Khởi tạo hoặc xác thực phiên khách ẩn danh
export const initGuestSession = (data) =>
  axiosInstance.post('/api/GuestChat/session/init', data);

// API Lấy danh sách các cuộc trò chuyện của khách ẩn danh
export const getGuestConversations = () => {
  const token = getStoredGuestToken();
  return axiosInstance.get('/api/GuestChat/conversations', {
    headers: { 'X-Guest-Token': token }
  });
};

// API Lấy chi tiết cuộc trò chuyện của khách ẩn danh
export const getGuestConversationDetails = (id) => {
  const token = getStoredGuestToken();
  return axiosInstance.get(`/api/GuestChat/conversations/${id}`, {
    headers: { 'X-Guest-Token': token }
  });
};

// API Gửi tin nhắn từ phía khách ẩn danh
export const sendGuestChatMessage = (data) => {
  const token = getStoredGuestToken();
  return axiosInstance.post('/api/GuestChat/conversations/messages', data, {
    headers: { 'X-Guest-Token': token }
  });
};

// API Gửi yêu cầu tư vấn món ăn từ Menu (khách ẩn danh)
export const sendGuestProductConsultation = (data) => {
  const token = getStoredGuestToken();
  return axiosInstance.post('/api/GuestChat/consultation', data, {
    headers: { 'X-Guest-Token': token }
  });
};

// API Gửi yêu cầu tư vấn món ăn từ Menu (khách đã đăng nhập)
export const sendCustomerProductConsultation = (data) =>
  axiosInstance.post('/api/CustomerPortal/consultation', data);

// API Cập nhật cấu hình lưu trữ tin nhắn chi nhánh (Quản lý)
export const updateBranchRetentionSettings = (data) =>
  axiosInstance.put('/api/BranchChat/settings/retention', data);

// API Lấy cấu hình lưu trữ tin nhắn chi nhánh (Quản lý)
export const getBranchRetentionSettings = (branchId) =>
  axiosInstance.get(`/api/BranchChat/settings/retention/${branchId}`);
