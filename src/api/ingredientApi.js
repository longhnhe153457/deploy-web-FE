import axiosInstance from './axiosInstance';

export const getAllIngredients = () =>
  axiosInstance.get('/api/IngredientProduct');

export const getAllRegularProducts = () =>
  axiosInstance.get('/api/RegularProduct');
