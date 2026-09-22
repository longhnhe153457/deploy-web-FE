import axiosInstance from './axiosInstance';

export const getAllUnits = () =>
  axiosInstance.get('/api/Unit');

export const getUnitById = (id) =>
  axiosInstance.get(`/api/Unit/${id}`);

export const createUnit = (data) =>
  axiosInstance.post('/api/Unit', data);

export const updateUnit = (data) =>
  axiosInstance.put('/api/Unit', data);

export const deleteUnit = (id) =>
  axiosInstance.delete(`/api/Unit/${id}`);
