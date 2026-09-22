import axiosInstance from './axiosInstance';

export const setupDevice = (data) => axiosInstance.post('/api/Device/setup', data);

export const validateDevice = (token) => axiosInstance.post('/api/Device/validate', { token });

export const getDevicesByBranch = (branchId) => axiosInstance.get(`/api/Device/branch/${branchId}`);

export const updateDevice = (data) => axiosInstance.put('/api/Device', data);

export const deleteDevice = (id) => axiosInstance.delete(`/api/Device/${id}`);

export const revokeDevice = (id) => axiosInstance.post(`/api/Device/${id}/revoke`);

export const employeeLogin = (data) => axiosInstance.post('/api/Device/employee-login', data);
