import axiosInstance from './axiosInstance';

export const createShiftChangeRequest = (data) =>
  axiosInstance.post('/api/ShiftChangeRequest', data);

export const getMyShiftChangeRequests = () =>
  axiosInstance.get('/api/ShiftChangeRequest/mine');

export const getShiftChangeRequestsByBranch = (branchId, status) =>
  axiosInstance.get(`/api/ShiftChangeRequest/branch/${branchId}`, { params: status ? { status } : {} });

export const approveShiftChangeRequest = (id) =>
  axiosInstance.put(`/api/ShiftChangeRequest/${id}/approve`);

export const rejectShiftChangeRequest = (id, reason) =>
  axiosInstance.put(`/api/ShiftChangeRequest/${id}/reject`, { reason });
