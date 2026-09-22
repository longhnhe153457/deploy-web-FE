import axiosInstance from './axiosInstance';

export const getAllBranches = () =>
  axiosInstance.get('/api/Branch');

export const getBranchById = (id) =>
  axiosInstance.get(`/api/Branch/${id}`);

export const searchBranches = (dto) =>
  axiosInstance.get('/api/Branch/search', { params: dto });

export const createBranch = (data) =>
  axiosInstance.post('/api/Branch', data);

export const updateBranch = (data) =>
  axiosInstance.put('/api/Branch', data);

export const deleteBranch = (id) =>
  axiosInstance.delete(`/api/Branch/${id}`);
