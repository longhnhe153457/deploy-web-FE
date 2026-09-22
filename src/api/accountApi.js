import axiosInstance from './axiosInstance';

export const getAllAccounts = (branchId) =>
  axiosInstance.get('/api/Account/role-range', {
    params: branchId ? { branchId } : {},
  });

export const getChefs = (branchId) =>
  axiosInstance.get('/api/Account/chefs', {
    params: branchId ? { branchId } : {},
  });

export const getAccountById = (id) =>
  axiosInstance.get(`/api/Account/${id}`);

export const createAccount = (data) =>
  axiosInstance.post('/api/Account', data);

export const updateAccount = (data) =>
  axiosInstance.put('/api/Account', data);

export const deleteAccount = (id) =>
  axiosInstance.delete(`/api/Account/${id}`);

export const getRoleRange = (branchId) =>
  axiosInstance.get('/api/Account/exclude-roles', {
    params: branchId ? { branchId } : {},
  });

export const getManagerAccounts = () =>
  axiosInstance.get('/api/Account/managers');

/**
 * Lấy / cập nhật thông tin tài khoản của chính người dùng đang đăng nhập
 */
export const getMe = () =>
  axiosInstance.get('/api/Account/me');

export const updateMe = (data) =>
  axiosInstance.put('/api/Account/me', data);

export const changePassword = (data) =>
  axiosInstance.put('/api/Account/change-password', data);
