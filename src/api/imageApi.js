import axiosInstance from './axiosInstance';

export const getAllImages = () =>
  axiosInstance.get('/api/Image');

export const createImage = (data) =>
  axiosInstance.post('/api/Image', data);

export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosInstance.post('/api/Image/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
