import axiosInstance from './axiosInstance';

export const createShiftFeedback = (data) =>
  axiosInstance.post('/api/ShiftFeedback', data);

export const getMyShiftFeedbacks = () =>
  axiosInstance.get('/api/ShiftFeedback/mine');

export const getBranchShiftFeedbacks = (branchId, status) =>
  axiosInstance.get(`/api/ShiftFeedback/branch/${branchId}`, {
    params: status ? { status } : {}
  });

export const processShiftFeedback = (id, data) =>
  axiosInstance.put(`/api/ShiftFeedback/${id}/process`, data);
