import axiosInstance from './axiosInstance';

export const getAllGroups = () =>
  axiosInstance.get('/api/Group');

export const getGroupById = (id) =>
  axiosInstance.get(`/api/Group/${id}`);

export const createGroup = (data) =>
  axiosInstance.post('/api/Group', data);

export const updateGroup = (data) =>
  axiosInstance.put('/api/Group', data);

export const deleteGroup = (id) =>
  axiosInstance.delete(`/api/Group/${id}`);
