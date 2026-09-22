import axiosInstance from './axiosInstance';

export const getTableOrderSummary = (tableId) =>
  axiosInstance.get(`/api/Order/by-table/${tableId}`);

export const confirmOrderItem = (orderDetailId, quantity) =>
  axiosInstance.put(`/api/Order/details/${orderDetailId}/confirm`, { quantity });

export const rejectOrderItem = (orderDetailId, reason) =>
  axiosInstance.put(`/api/Order/details/${orderDetailId}/reject`, { reason });

export const updateCookingStatus = (orderDetailId, status) =>
  axiosInstance.put(`/api/Order/details/${orderDetailId}/cooking-status`, { cookingStatus: status });
