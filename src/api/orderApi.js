import axiosInstance from './axiosInstance';

// ─── Order ────────────────────────────────────────────────────────────────
export const getAllOrders = (branchId, startDate = null, endDate = null) =>
  axiosInstance.get('/api/Order', { params: { branchId, startDate, endDate } });

export const getReturnableOrders = (branchId) =>
  axiosInstance.get('/api/Order/returnable', { params: { branchId } });

export const getPaidInvoices = (branchId, startDate = null, endDate = null) =>
  axiosInstance.get('/api/Order/invoices', { params: { branchId, startDate, endDate } });

// Lịch sử huỷ món: đơn đã hoàn thành (bếp làm chậm) vs đơn chờ xác nhận
export const getCancelledHistory = (branchId, params = {}) =>
  axiosInstance.get('/api/Order/cancelled-history', { params: { branchId, ...params } });

export const getOrderById = (id) =>
  axiosInstance.get(`/api/Order/${id}`);

export const createOrder = (data) =>
  axiosInstance.post('/api/Order', data);

export const updateOrder = (data) =>
  axiosInstance.put('/api/Order', data);

export const deleteOrder = (id) =>
  axiosInstance.delete(`/api/Order/${id}`);

export const payOrder = (id, data) =>
  axiosInstance.post(`/api/Order/${id}/pay`, data);

export const mergeOrder = (data) =>
  axiosInstance.post('/api/Order/merge', data);

export const unmergeOrder = (id) =>
  axiosInstance.delete(`/api/Order/${id}/unmerge`);

export const moveOrder = (id, data) =>
  axiosInstance.post(`/api/Order/${id}/move`, data);

// ─── Order Details ────────────────────────────────────────────────────────
export const getOrderDetails = (orderId) =>
  axiosInstance.get(`/api/Order/${orderId}/details`);

export const getOrderDetailById = (orderId, id) =>
  axiosInstance.get(`/api/Order/${orderId}/details/${id}`);

export const createOrderDetail = (orderId, data) =>
  axiosInstance.post(`/api/Order/${orderId}/details`, data);

export const createBulkOrderDetail = (orderId, data) =>
  axiosInstance.post(`/api/Order/${orderId}/details/bulk`, data);

export const updateOrderDetail = (orderId, id, data) =>
  axiosInstance.put(`/api/Order/${orderId}/details/${id}`, data);

export const updateCookingStatus = (orderDetailId, data) =>
  axiosInstance.put(`/api/Order/details/${orderDetailId}/cooking-status`, data);

export const deleteOrderDetail = (orderId, id) =>
  axiosInstance.delete(`/api/Order/${orderId}/details/${id}`);

export const cancelOrder = (id) =>
  axiosInstance.put(`/api/Order/${id}/cancel`);

export const cancelOrderDetail = (id) =>
  axiosInstance.put(`/api/Order/details/${id}/cancel`);

export const requestReturnItem = (orderDetailId, data) =>
  axiosInstance.put(`/api/Order/details/${orderDetailId}/request-return`, data);

export const getAvailableQuantities = (branchId, productIds) =>
  axiosInstance.post(`/api/Order/available-quantities/${branchId}`, productIds);

export const getMenuAvailableQuantities = (branchId) =>
  axiosInstance.get(`/api/Order/menu-available-quantities/${branchId}`);

// ─── Order Assignment ─────────────────────────────────────────────────────
export const getMyAssignments = () =>
  axiosInstance.get('/api/Order/my-assignments');

export const assignSelf = (orderId) =>
  axiosInstance.post(`/api/Order/${orderId}/assign`);

export const unassignOrder = (orderId) =>
  axiosInstance.delete(`/api/Order/${orderId}/unassign`);

export const forceAssignOrder = (orderId, accountId) =>
  axiosInstance.post(`/api/Order/${orderId}/force-assign`, { accountId });

export const getOnDutyStaff = (branchId) =>
  axiosInstance.get(`/api/Order/on-duty-staff/${branchId}`);
