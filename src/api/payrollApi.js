import axiosInstance from './axiosInstance';

export const getPayrolls = (params) =>
  axiosInstance.get('/api/Payroll', { params });

export const getMyPayrolls = (params) =>
  axiosInstance.get('/api/Payroll/my-payroll', { params });

export const getPayrollById = (id) =>
  axiosInstance.get(`/api/Payroll/${id}`);

export const createPayroll = (data) =>
  axiosInstance.post('/api/Payroll', data);

export const generatePayroll = (data) =>
  axiosInstance.post('/api/Payroll/generate', data);

export const generateBatchPayroll = (data) =>
  axiosInstance.post('/api/Payroll/generate-batch', data);

export const updatePayroll = (data) =>
  axiosInstance.put('/api/Payroll', data);

export const updatePayrollStatus = (id, status, paymentDate) =>
  axiosInstance.patch(`/api/Payroll/${id}/status`, null, {
    params: { status, paymentDate },
  });

export const deletePayroll = (id) =>
  axiosInstance.delete(`/api/Payroll/${id}`);

export const lockPayroll = (id) =>
  axiosInstance.post(`/api/Payroll/${id}/lock`);

export const unlockPayroll = (id) =>
  axiosInstance.post(`/api/Payroll/${id}/unlock`);

export const approvePayroll = (id) =>
  axiosInstance.post(`/api/Payroll/${id}/approve`);

// Payroll Suggestions API
export const getPayrollSuggestions = (params) =>
  axiosInstance.get('/api/Payroll/suggestions', { params });

export const getPayrollSuggestionById = (id) =>
  axiosInstance.get(`/api/Payroll/suggestions/${id}`);

export const createPayrollSuggestion = (data) =>
  axiosInstance.post('/api/Payroll/suggestions', data);

export const processPayrollSuggestion = (id, data) =>
  axiosInstance.put(`/api/Payroll/suggestions/${id}/process`, data);

export const updatePayrollSuggestion = (id, data) =>
  axiosInstance.put(`/api/Payroll/suggestions/${id}`, data);

export const deletePayrollSuggestion = (id) =>
  axiosInstance.delete(`/api/Payroll/suggestions/${id}`);


