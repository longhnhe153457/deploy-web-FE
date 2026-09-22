import axiosInstance from './axiosInstance';

export const configApi = {
    getPointSystemConfig: async () => {
        const response = await axiosInstance.get('/api/Config/point-system');
        return response.data;
    },
    getCatalogPriority: async () => {
        const response = await axiosInstance.get('/api/Config/catalog-priority');
        return response.data;
    },
    saveCatalogPriority: async (dto) => {
        const response = await axiosInstance.post('/api/Config/catalog-priority', dto);
        return response.data;
    }
};

export default configApi;
