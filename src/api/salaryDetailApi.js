import axiosInstance from './axiosInstance';

export const getSalaryDetails = (params) =>
  axiosInstance.get('/api/SalaryDetail', { params });

export const getSalaryDetailById = (id) =>
  axiosInstance.get(`/api/SalaryDetail/${id}`);

export const createSalaryDetail = (data) =>
  axiosInstance.post('/api/SalaryDetail', data);

export const updateSalaryDetail = (data) =>
  axiosInstance.put('/api/SalaryDetail', data);

export const deleteSalaryDetail = (id) =>
  axiosInstance.delete(`/api/SalaryDetail/${id}`);
