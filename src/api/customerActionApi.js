import axiosInstance from './axiosInstance';

export const callStaff = (tableId) => {
  return axiosInstance.post(`/api/CustomerAction/${tableId}/call-staff`);
};

export const requestBill = (tableId) => {
  return axiosInstance.post(`/api/CustomerAction/${tableId}/request-bill`);
};
