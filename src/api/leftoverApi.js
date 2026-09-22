import axiosInstance from './axiosInstance';

export const getLeftoverRecordsByBranch = (branchId, params = {}) =>
  axiosInstance.get(`/api/LeftoverRecord/branch/${branchId}`, { params });

// Món thừa (khách trả, bếp đã làm xong) còn trong 30p, chưa dùng lại — gợi ý khi có đơn khác cần đúng món đó
export const getReusableLeftovers = (branchId, productId) =>
  axiosInstance.get(`/api/LeftoverRecord/branch/${branchId}/reusable`, { params: productId ? { productId } : {} });

export const createLeftoverRecord = (data) =>
  axiosInstance.post('/api/LeftoverRecord', data);

export const deleteLeftoverRecord = (id) =>
  axiosInstance.delete(`/api/LeftoverRecord/${id}`);
