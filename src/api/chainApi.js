import axiosInstance from './axiosInstance';

export const getAllChains = () =>
  axiosInstance.get('/api/Chain/all');

export const getMainChain = () =>
  axiosInstance.get('/api/Chain');

export const getChainById = (id) =>
  axiosInstance.get(`/api/Chain/${id}`);

export const createChain = (data) =>
  axiosInstance.post('/api/Chain', data);

export const updateChain = (data) =>
  axiosInstance.put('/api/Chain', data);

export const deleteChain = (id) =>
  axiosInstance.delete(`/api/Chain/${id}`);
