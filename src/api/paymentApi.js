import axiosInstance from './axiosInstance';

export const createPaymentLink = async (orderId, payload = null) => {
    const response = await axiosInstance.post(`/api/Payment/create-payment-link/${orderId}`, payload);
    return response.data;
};

export const checkPaymentStatus = async (orderId) => {
    const response = await axiosInstance.get(`/api/Payment/check-payment/${orderId}`);
    return response.data;
};
