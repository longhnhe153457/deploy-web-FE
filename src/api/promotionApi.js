import axiosInstance from './axiosInstance';

export const getAllPromotions = async () => {
    const response = await axiosInstance.get('/api/Promotion');
    return response.data;
};

export const getPromotionById = async (id) => {
    const response = await axiosInstance.get(`/api/Promotion/${id}`);
    return response.data;
};

export const createPromotion = async (data) => {
    const response = await axiosInstance.post('/api/Promotion', data);
    return response.data;
};

export const updatePromotion = async (data) => {
    const response = await axiosInstance.put(`/api/Promotion/${data.id}`, data);
    return response.data;
};

export const deletePromotion = async (id) => {
    const response = await axiosInstance.delete(`/api/Promotion/${id}`);
    return response.data;
};

export const removeProductFromPromotion = async (promoId, productId) => {
    const response = await axiosInstance.put(`/api/Promotion/${promoId}/remove-product/${productId}`);
    return response.data;
};
