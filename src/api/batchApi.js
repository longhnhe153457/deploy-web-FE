import axiosInstance from './axiosInstance';

/**
 * Lấy danh sách Lô hàng với bộ lọc chi nhánh, sản phẩm, trạng thái và hạn sử dụng
 */
export const getBatches = async ({
  branchId,
  productId,
  binventoryId,
  search,
  status,
  expiryStatus,
  nearExpiryDays = 7,
  page = 1,
  pageSize = 20
} = {}) => {
  const response = await axiosInstance.get('/api/BInventory/batches', {
    params: {
      branchId: branchId || undefined,
      productId: productId || undefined,
      binventoryId: binventoryId || undefined,
      search: search || undefined,
      status: status !== null && status !== undefined ? status : undefined,
      expiryStatus: expiryStatus || undefined,
      nearExpiryDays,
      page,
      pageSize
    }
  });
  return response.data;
};

/**
 * Lấy danh sách tất cả các Lô của một BInventory cụ thể
 */
export const getBatchesByBInventoryId = async (binventoryId) => {
  if (!binventoryId || binventoryId <= 0) return [];
  const response = await axiosInstance.get(`/api/BInventory/${binventoryId}/batches`);
  return response.data;
};

/**
 * Lấy thông tin chi tiết một Lô hàng theo ID
 */
export const getBatchById = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/BInventory/batches/${id}`);
  return response.data;
};

/**
 * Lấy lịch sử phân bổ/tiêu hao của Lô hàng
 */
export const getBatchAllocations = async (id, page = 1, pageSize = 20) => {
  if (!id || id <= 0) return { totalCount: 0, items: [] };
  const response = await axiosInstance.get(`/api/BInventory/batches/${id}/allocations`, {
    params: { page, pageSize }
  });
  return response.data;
};

/**
 * Lấy hồ sơ truy vết toàn diện vòng đời của Lô hàng
 */
export const getBatchTraceability = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/BInventory/batches/${id}/traceability`);
  return response.data;
};

/**
 * Lấy thống kê tổng hợp hạn sử dụng theo chi nhánh
 */
export const getBatchExpirySummary = async (branchId, nearExpiryDays = 7) => {
  const response = await axiosInstance.get('/api/BInventory/batches/expiry-summary', {
    params: {
      branchId: branchId || undefined,
      nearExpiryDays
    }
  });
  return response.data;
};

/**
 * Lấy cấu hình ngưỡng cảnh báo hạn sử dụng của chi nhánh
 */
export const getBatchAlertSettings = async (branchId) => {
  const response = await axiosInstance.get('/api/BInventory/batches/alert-settings', {
    params: { branchId: branchId || undefined }
  });
  return response.data;
};

/**
 * Cập nhật cấu hình ngưỡng cảnh báo hạn sử dụng của chi nhánh
 */
export const updateBatchAlertSettings = async (data) => {
  const response = await axiosInstance.put('/api/BInventory/batches/alert-settings', data);
  return response.data;
};

/**
 * Bật/Tắt chuông thông báo hạn sử dụng cho một Lô hàng cụ thể
 */
export const toggleBatchNotificationMute = async (batchId) => {
  const response = await axiosInstance.put(`/api/BInventory/batches/${batchId}/toggle-mute`);
  return response.data;
};

/**
 * Cập nhật Ngày sản xuất và Hạn sử dụng của Lô hàng
 */
export const updateBatchDates = async (batchId, { manufactureDate, expiryDate }) => {
  const response = await axiosInstance.put(`/api/BInventory/batches/${batchId}/dates`, {
    manufactureDate: manufactureDate ? new Date(manufactureDate).toISOString() : null,
    expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null
  });
  return response.data;
};


