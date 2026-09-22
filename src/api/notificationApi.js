import axiosInstance from './axiosInstance';

/**
 * Lấy danh sách lịch sử thông báo (có phân trang và lọc)
 * @param {object} params - { branchId, fromDate, toDate, type, isRead, search, page, pageSize }
 */
export const getNotifications = async (params) => {
  const res = await axiosInstance.get('/api/notification', { params });
  return res.data;
};

/**
 * Lấy 5 thông báo gần nhất (dùng cho chuông thông báo)
 * @param {number} branchId - ID chi nhánh (tùy chọn)
 */
export const getRecentNotifications = async (branchId) => {
  const params = branchId ? { branchId } : {};
  const res = await axiosInstance.get('/api/notification/recent', { params });
  return res.data;
};

/**
 * Lấy số lượng thông báo chưa đọc
 * @param {number} branchId - ID chi nhánh (tùy chọn)
 */
export const getUnreadCount = async (branchId) => {
  const params = branchId ? { branchId } : {};
  const res = await axiosInstance.get('/api/notification/unread-count', { params });
  return res.data;
};

/**
 * Đánh dấu một thông báo đã đọc
 * @param {number} id - ID thông báo
 */
export const markAsRead = async (id) => {
  const res = await axiosInstance.put(`/api/notification/${id}/read`);
  return res.data;
};

/**
 * Đánh dấu tất cả thông báo đã đọc
 * @param {number} branchId - ID chi nhánh (tùy chọn)
 */
export const markAllAsRead = async (branchId = null) => {
  const params = branchId ? { branchId } : {};
  const res = await axiosInstance.put('/api/notification/read-all', null, { params });
  return res.data;
};


