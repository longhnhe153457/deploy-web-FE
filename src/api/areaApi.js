import axiosInstance from './axiosInstance';

export const getAllAreas = () =>
  axiosInstance.get('/api/Area');

export const getAreasByBranchId = (branchId) =>
  axiosInstance.get(`/api/Area/branch/${branchId}`);

export const getTablesByAreaId = (areaId) =>
  axiosInstance.get(`/api/Area/${areaId}/tables`);

export const getAreaById = (id) =>
  axiosInstance.get(`/api/Area/${id}`);

export const createArea = (data) =>
  axiosInstance.post('/api/Area', data);

export const updateArea = (data) =>
  axiosInstance.put('/api/Area', data);

export const deleteArea = (id) =>
  axiosInstance.delete(`/api/Area/${id}`);
