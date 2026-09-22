import axiosInstance from './axiosInstance';

export const getAllProcessed = () =>
  axiosInstance.get('/api/ProcessedProduct');

export const getProcessedById = (id) =>
  axiosInstance.get(`/api/ProcessedProduct/${id}`);

export const createProcessed = (data) =>
  axiosInstance.post('/api/ProcessedProduct', data);

export const updateProcessed = (data) =>
  axiosInstance.put('/api/ProcessedProduct', data);

export const deleteProcessed = (id) =>
  axiosInstance.delete(`/api/ProcessedProduct/${id}`);
