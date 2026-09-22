import axiosInstance from './axiosInstance';

export const getCustomers = async (search = '', page = 1, pageSize = 100) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (page) params.append('page', page);
  if (pageSize) params.append('pageSize', pageSize);

  const response = await axiosInstance.get(`/api/CustomerManagement?${params.toString()}`);
  return response.data;
};

export const getCustomerById = async (id) => {
  const response = await axiosInstance.get(`/api/CustomerManagement/${id}`);
  return response.data;
};

export const createCustomer = async (customerData) => {
  const response = await axiosInstance.post('/api/CustomerManagement', customerData);
  return response.data;
};

export const updateCustomerProfile = async (id, customerData) => {
  const response = await axiosInstance.put(`/api/CustomerManagement/${id}`, customerData);
  return response.data;
};

export const deleteCustomer = async (id) => {
  const response = await axiosInstance.delete(`/api/CustomerManagement/${id}`);
  return response.data;
};

export const getCustomerPurchases = async (customerId) => {
  const response = await axiosInstance.get(`/api/CustomerManagement/${customerId}/purchases`);
  return response.data;
};

export const getCustomerPoints = async (customerId) => {
  const response = await axiosInstance.get(`/api/CustomerManagement/${customerId}/points`);
  return response.data;
};

export const adjustCustomerPoints = async (customerId, payload) => {
  const response = await axiosInstance.post(`/api/CustomerManagement/${customerId}/adjust-points`, payload);
  return response.data;
};

export const editManualPointTransaction = async (transactionId, payload) => {
  const response = await axiosInstance.put(`/api/CustomerManagement/point-transactions/${transactionId}`, payload);
  return response.data;
};

export const deleteManualPointTransaction = async (transactionId, reason = '') => {
  const response = await axiosInstance.delete(
    `/api/CustomerManagement/point-transactions/${transactionId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`
  );
  return response.data;
};
