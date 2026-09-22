import axiosInstance from './axiosInstance';

const validateBranchId = (branchId) => {
  if (!branchId || branchId <= 0) {
    console.warn('[cashFlowApi] Thiếu branchId hợp lệ.', branchId);
    return false;
  }
  return true;
};

/**
 * Lấy danh sách phiếu thu chi của chi nhánh (hoặc tất cả chi nhánh nếu branchId rỗng).
 */
export const getCashFlows = async (branchId) => {
  const params = {};
  if (branchId && branchId > 0) {
    params.branchId = branchId;
  }
  const response = await axiosInstance.get('/api/CashFlow', { params });
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Lấy chi tiết 1 phiếu thu chi.
 */
export const getCashFlowById = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/CashFlow/${id}`);
  return response.data;
};

/**
 * Tạo phiếu thu hoặc phiếu chi thủ công.
 * @param {Object} dto - { branchId, direction (1=Thu/2=Chi), totalAmount, partnerId, paymentMethod, businessDate, note }
 */
export const createCashFlow = async (dto) => {
  const response = await axiosInstance.post('/api/CashFlow', dto);
  return response.data;
};

/**
 * Xóa mềm phiếu thu chi.
 */
export const deleteCashFlow = async (id, deleteNote = '') => {
  const response = await axiosInstance.delete(`/api/CashFlow/${id}/soft-delete`, {
    params: { deleteNote },
  });
  return response.data;
};
