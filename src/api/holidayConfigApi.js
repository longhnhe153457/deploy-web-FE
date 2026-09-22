import axiosInstance from './axiosInstance';

export const getHolidayConfigs = (params) =>
  axiosInstance.get('/api/HolidayConfig', { params });

export const getHolidayConfigById = (id) =>
  axiosInstance.get(`/api/HolidayConfig/${id}`);

export const createHolidayConfig = (data) =>
  axiosInstance.post('/api/HolidayConfig', data);

export const updateHolidayConfig = (id, data) =>
  axiosInstance.put(`/api/HolidayConfig/${id}`, data);

export const deleteHolidayConfig = (id) =>
  axiosInstance.delete(`/api/HolidayConfig/${id}`);
