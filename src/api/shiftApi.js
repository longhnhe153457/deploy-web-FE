import axiosInstance from './axiosInstance';

export const getAllShifts = () =>
  axiosInstance.get('/api/Shift');

export const getShiftById = (id) =>
  axiosInstance.get(`/api/Shift/${id}`);

export const createShift = (data) =>
  axiosInstance.post('/api/Shift', data);

export const updateShift = (data) =>
  axiosInstance.put('/api/Shift', data);

export const deleteShift = (id) =>
  axiosInstance.delete(`/api/Shift/${id}`);
