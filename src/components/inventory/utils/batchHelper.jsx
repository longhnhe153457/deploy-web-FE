import React from 'react';
import dayjs from 'dayjs';

/**
 * Trả về thông tin hiển thị trạng thái Lô hàng (Label & Style)
 * Status: 1 = Active, 2 = Depleted, 3 = Expired, 4 = Locked
 */
export const getBatchStatusInfo = (status) => {
  const statusStr = String(status).toLowerCase();
  if (statusStr === '1' || statusStr === 'active') {
    return {
      label: 'Đang hoạt động',
      color: '#059669',
      bg: '#d1fae5',
      border: '#a7f3d0'
    };
  }
  if (statusStr === '2' || statusStr === 'depleted') {
    return {
      label: 'Đã hết hàng',
      color: '#64748b',
      bg: '#f1f5f9',
      border: '#cbd5e1'
    };
  }
  if (statusStr === '3' || statusStr === 'expired') {
    return {
      label: 'Đã hết hạn',
      color: '#dc2626',
      bg: '#fee2e2',
      border: '#fecaca'
    };
  }
  if (statusStr === '4' || statusStr === 'locked') {
    return {
      label: 'Đã khóa',
      color: '#d97706',
      bg: '#fef3c7',
      border: '#fde68a'
    };
  }
  return {
    label: 'Không xác định',
    color: '#64748b',
    bg: '#f1f5f9',
    border: '#cbd5e1'
  };
};

/**
 * Render thẻ Badge trạng thái Lô
 */
export const renderBatchStatusBadge = (status) => {
  const info = getBatchStatusInfo(status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 10.5,
        fontWeight: 600,
        color: info.color,
        background: info.bg,
        border: `1px solid ${info.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {info.label}
    </span>
  );
};

/**
 * Trả về thông tin hạn sử dụng và cảnh báo
 */
export const getExpiryStatusInfo = (expiryDate, daysUntilExpiry, quantityRemaining, status) => {
  // Nếu Lô đã hết hàng (tồn <= 0 hoặc trạng thái Depleted) thì không báo hết hạn nữa
  const isDepleted =
    (quantityRemaining !== undefined && quantityRemaining !== null && Number(quantityRemaining) <= 0) ||
    status === 2 ||
    String(status).toLowerCase() === 'depleted';

  if (isDepleted) {
    return {
      status: 'Depleted',
      label: 'Đã hết hàng',
      color: '#64748b',
      bg: '#f1f5f9',
      border: '#cbd5e1',
      isWarning: false
    };
  }

  if (!expiryDate) {
    return {
      status: 'NoExpiry',
      label: 'Không có HSD',
      color: '#64748b',
      bg: '#f8fafc',
      border: '#e2e8f0',
      isWarning: false
    };
  }

  const days = daysUntilExpiry !== undefined && daysUntilExpiry !== null
    ? daysUntilExpiry
    : Math.ceil(dayjs(expiryDate).diff(dayjs(), 'day', true));

  if (days < 0) {
    return {
      status: 'Expired',
      label: `Hết hạn (${Math.abs(days)} ngày trước)`,
      color: '#ef4444',
      bg: '#fee2e2',
      border: '#fca5a5',
      isWarning: true
    };
  }

  if (days === 0) {
    return {
      status: 'ExpiredToday',
      label: 'Hết hạn hôm nay',
      color: '#ea580c',
      bg: '#ffedd5',
      border: '#fdba74',
      isWarning: true
    };
  }

  if (days <= 3) {
    return {
      status: 'Critical',
      label: `Khẩn cấp: Còn ${days} ngày`,
      color: '#dc2626',
      bg: '#fee2e2',
      border: '#f87171',
      isWarning: true
    };
  }

  if (days <= 7) {
    return {
      status: 'NearExpiry',
      label: `Sắp hết hạn (${days} ngày)`,
      color: '#d97706',
      bg: '#fef3c7',
      border: '#fde68a',
      isWarning: true
    };
  }

  return {
    status: 'Valid',
    label: `Còn ${days} ngày`,
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    isWarning: false
  };
};

/**
 * Render thẻ Badge Hạn sử dụng
 */
export const renderExpiryStatusBadge = (expiryDate, daysUntilExpiry, quantityRemaining, status) => {
  const info = getExpiryStatusInfo(expiryDate, daysUntilExpiry, quantityRemaining, status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 10.5,
        fontWeight: 600,
        color: info.color,
        background: info.bg,
        border: `1px solid ${info.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {info.label}
    </span>
  );
};
