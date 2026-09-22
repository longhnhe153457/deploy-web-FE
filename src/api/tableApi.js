import axiosInstance from './axiosInstance';

export const getAllTables = () =>
  axiosInstance.get('/api/Table');

export const getTablesByBranch = (branchIds, areaId = null, includeInternal = false) => {
  const ids = Array.isArray(branchIds) ? branchIds : [branchIds];
  const params = { branchIds: ids.join(',') };
  if (areaId) {
    params['$filter'] = `areaId eq ${areaId}`;
  }
  if (includeInternal) {
    params['includeInternal'] = true;
  }
  return axiosInstance.get('/api/Table', { params });
};

export const getTableById = (id) =>
  axiosInstance.get(`/api/Table/${id}`);

export const createTable = (data) =>
  axiosInstance.post('/api/Table', data);

export const updateTable = (data) =>
  axiosInstance.put('/api/Table', data);

export const deleteTable = (id) =>
  axiosInstance.delete(`/api/Table/${id}`);
