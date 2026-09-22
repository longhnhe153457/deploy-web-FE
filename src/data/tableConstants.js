export const TABLE_STATUS = {
  EMPTY: 'Empty',
  RESERVED: 'Reserved',
  OCCUPIED: 'Occupied',
  CLEANING: 'Cleaning',
};

export const TABLE_STATUS_CONFIG = {
  empty: { label: 'Trống', textColor: '#15803d', bg: '#dcfce7', border: '#86efac', dotColor: '#16a34a' },
  reserved: { label: 'Đặt bàn', textColor: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', dotColor: '#3b82f6' },
  occupied: { label: 'Có khách', textColor: '#c2410c', bg: '#ffedd5', border: '#fdba74', dotColor: '#f97316' },
  cleaning: { label: 'Dọn dẹp', textColor: '#b91c1c', bg: '#fee2e2', border: '#fca5a5', dotColor: '#ef4444' },
};

export const getStatusConfig = (status) => {
  const key = (status || '').toLowerCase();
  return TABLE_STATUS_CONFIG[key] || TABLE_STATUS_CONFIG.empty;
};
