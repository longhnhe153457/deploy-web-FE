import axiosInstance from './axiosInstance';

export const getContracts = (branchId) =>
  axiosInstance.get('/api/Contract', { params: { branchId } });

export const getMyContracts = () =>
  axiosInstance.get('/api/Contract/my-contract');

export const getContractById = (id) =>
  axiosInstance.get(`/api/Contract/${id}`);

export const createContract = (data) =>
  axiosInstance.post('/api/Contract', data);

export const updateContract = (data) =>
  axiosInstance.put('/api/Contract', data);

export const deleteContract = (id) =>
  axiosInstance.delete(`/api/Contract/${id}`);
