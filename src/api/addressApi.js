import axiosInstance from './axiosInstance';

export const getNewProvinces = () =>
  axiosInstance.get('/api/NewProvince');

export const getNewWards = () =>
  axiosInstance.get('/api/NewWard');

export const getOldProvinces = () =>
  axiosInstance.get('/api/OldProvince');

export const getOldDistricts = () =>
  axiosInstance.get('/api/OldDistrict');

export const getOldWards = () =>
  axiosInstance.get('/api/OldWard');
