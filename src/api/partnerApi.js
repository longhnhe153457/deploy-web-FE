import axiosInstance from './axiosInstance';

export const getSuppliers = async (branchId) => {
  const response = await axiosInstance.get(`/api/Partner/suppliers?branchId=${branchId}`);
  return response.data;
};

export const getExtraPartners = async (branchId) => {
  const response = await axiosInstance.get(`/api/Partner/extra-partners?branchId=${branchId}`);
  return response.data;
};

export const getPartnersByBranch = async (branchId, mode = null) => {
  const url = mode != null 
    ? `/api/Partner/branch/${branchId}/mode/${mode}` 
    : `/api/Partner/branch/${branchId}`;
  const response = await axiosInstance.get(url);
  return response.data;
};

export const createPartner = async (partnerData) => {
  const response = await axiosInstance.post('/api/Partner', partnerData);
  return response.data;
};

export const updatePartner = async (id, partnerData) => {
  const response = await axiosInstance.put(`/api/Partner/${id}`, partnerData);
  return response.data;
};

export const deletePartner = async (id) => {
  const response = await axiosInstance.delete(`/api/Partner/${id}`);
  return response.data;
};

export const getPartnerById = async (partnerId) => {
  const response = await axiosInstance.get(`/api/Partner/${partnerId}`);
  return response.data;
};

export const getPartnerFinancialSummary = async (partnerId) => {
  const response = await axiosInstance.get(`/api/Partner/${partnerId}/financial-summary`);
  return response.data;
};

export const getPartnerImportDocuments = async (partnerId) => {
  const response = await axiosInstance.get(`/api/Partner/${partnerId}/import-documents`);
  return response.data;
};

export const getPartnerCashFlows = async (partnerId) => {
  const response = await axiosInstance.get(`/api/Partner/${partnerId}/cash-flows`);
  return response.data;
};

export const getCustomerPurchases = async (customerId) => {
  const response = await axiosInstance.get(`/api/Partner/customer/${customerId}/purchases`);
  return response.data;
};

export const getCustomerPoints = async (customerId) => {
  const response = await axiosInstance.get(`/api/Partner/customer/${customerId}/points`);
  return response.data;
};

export const payPartnerImportDocument = async (partnerId, documentId, paymentData) => {
  const response = await axiosInstance.post(`/api/Partner/${partnerId}/import-documents/${documentId}/pay`, paymentData);
  return response.data;
};

export const updatePartnerImages = async (partnerId, imageUrls) => {
  const response = await axiosInstance.put(`/api/Partner/${partnerId}/images`, { imageUrls });
  return response.data;
};

