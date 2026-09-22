import axiosInstance from './axiosInstance';

export const getAllVouchers = async () => {
    const response = await axiosInstance.get('/api/Voucher');
    return response.data;
};

export const getVoucherById = async (id) => {
    const response = await axiosInstance.get(`/api/Voucher/${id}`);
    return response.data;
};

export const createVoucher = async (data) => {
    const response = await axiosInstance.post('/api/Voucher', data);
    return response.data;
};

export const updateVoucher = async (data) => {
    const response = await axiosInstance.put('/api/Voucher', data);
    return response.data;
};

export const deleteVoucher = async (id) => {
    const response = await axiosInstance.delete(`/api/Voucher/${id}`);
    return response.data;
};

export const checkVoucher = async (code, branchId, totalAmount, customerId = null) => {
    const params = { code, branchId, totalAmount };
    if (customerId) params.customerId = customerId;

    const response = await axiosInstance.get(`/api/Voucher/check`, { params });
    return response.data;
};

export const getAvailableVouchers = async () => {
    const response = await axiosInstance.get('/api/Voucher/available');
    return response.data;
};
