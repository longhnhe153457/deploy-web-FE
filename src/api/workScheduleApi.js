import axiosInstance from './axiosInstance';

export const getAllWorkSchedules = () =>
  axiosInstance.get('/api/WorkSchedule');

export const getWorkScheduleById = (id) =>
  axiosInstance.get(`/api/WorkSchedule/${id}`);

export const createWorkSchedule = (data) =>
  axiosInstance.post('/api/WorkSchedule', data);

export const updateWorkSchedule = (data) =>
  axiosInstance.put('/api/WorkSchedule', data);

export const deleteWorkSchedule = (id, reason) =>
  axiosInstance.delete(`/api/WorkSchedule/${id}`, { data: { reason } });

export const assignWorkSchedules = (data) =>
  axiosInstance.post('/api/WorkSchedule/assign', data);

export const getMyWorkSchedules = () =>
  axiosInstance.get('/api/WorkSchedule/mine');

export const requestLeave = (data) =>
  axiosInstance.post('/api/WorkSchedule/leave-request', data);

export const requestShiftSwap = (data) =>
  axiosInstance.post('/api/WorkSchedule/shift-swap', data);

export const rejectShiftSwap = (id, senderAccountId, note) =>
  axiosInstance.put(`/api/WorkSchedule/${id}/reject-transfer`, { senderAccountId, note });

export const approveOT = (data) =>
  axiosInstance.post('/api/WorkSchedule/approve-ot', data);

export const verifyPOSActivity = (id) =>
  axiosInstance.get(`/api/WorkSchedule/${id}/verify-pos-activity`);

export const checkInWithLocation = (data) =>
  axiosInstance.post('/api/WorkSchedule/check-in-with-location', data);

export const autoAssignWorkSchedules = (data) =>
  axiosInstance.post('/api/WorkSchedule/auto-assign', data);

export const getActivityLog = (id) =>
  axiosInstance.get(`/api/WorkSchedule/${id}/activity-log`);

export const getCurrentShiftSession = () =>
  axiosInstance.get('/api/WorkSchedule/current-session');
