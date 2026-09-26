import axiosInstance from './axiosInstance';

/**
 * Lấy tất cả món ăn cần chế biến cho KDS (Kitchen Display System)
 */
export const getKitchenItems = (branchId) => {
  const url = branchId ? `/api/Order/kitchen-items?branchId=${branchId}` : '/api/Order/kitchen-items';
  return axiosInstance.get(url);
};

/**
 * Cập nhật trạng thái chế biến (Waiting -> Accepted -> Cooking -> Ready/Done)
 */
export const updateCookingStatus = (detailId, cookingStatus, quantity = null) =>
  axiosInstance.put(`/api/Order/details/${detailId}/cooking-status`, { cookingStatus, quantity });

/**
 * Cập nhật trạng thái cho nhiều món cùng lúc (hỗ trợ Batch Processing - AF1)
 */
export const batchUpdateCookingStatus = (productId, cookingStatus, branchId = null, quantity = null) =>
  axiosInstance.put('/api/Order/batch-cooking-status', { productId, cookingStatus, branchId, quantity });

/**
 * Hủy món ăn chi tiết từ KDS
 */
export const cancelOrderDetail = (detailId) =>
  axiosInstance.put(`/api/Order/details/${detailId}/cancel`);

/**
 * Dùng lại món thừa (khách trả, bếp đã làm xong, còn trong 30p) cho một món
 * đang chờ chế biến — khớp đúng món + số lượng thì dừng chế biến luôn.
 */
export const reuseLeftoverForOrderDetail = (detailId, leftoverId) =>
  axiosInstance.put(`/api/Order/details/${detailId}/reuse-leftover`, { leftoverId });

/**
 * Gửi yêu cầu bếp (nước chấm, v.v.)
 */
export const requestRestock = (data) =>
  axiosInstance.post('/api/Kitchen/request-restock', data);
