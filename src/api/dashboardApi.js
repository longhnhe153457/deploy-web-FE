import axiosInstance from './axiosInstance';

export const getBranchDashboardStats = (range, startDateStr, endDateStr, branchId) =>
  axiosInstance.get('/api/Dashboard/branch-stats', {
    params: {
      range,
      startDateStr,
      endDateStr,
      branchId,
    },
  });
