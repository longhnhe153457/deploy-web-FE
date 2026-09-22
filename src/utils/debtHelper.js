/**
 * Tiện ích chuẩn hóa hiển thị Công nợ / Dư nợ đối tác (Nhà cung cấp)
 * Tuân thủ quy tắc hiển thị 3 trạng thái:
 * 1. RemainingDebt > 0 : "Mình nợ NCC: [Số tiền]" (Màu đỏ/cam)
 * 2. RemainingDebt < 0 : "NCC nợ mình: [Số tiền]" (Số dương, màu xanh lá)
 * 3. RemainingDebt == 0: "Hết nợ" (Màu xám/đen)
 */
export const getDebtDisplayInfo = (remainingDebt) => {
  let debt = Number(remainingDebt) || 0;
  // Sai số lẻ dưới 1 đồng được xem là hết nợ
  if (Math.abs(debt) < 1) {
    debt = 0;
  } else {
    debt = Math.round(debt);
  }

  if (debt > 0) {
    return {
      status: 'OWE_SUPPLIER',
      label: 'Mình nợ NCC',
      text: `Mình nợ NCC: ${debt.toLocaleString('vi-VN')} VNĐ`,
      shortText: `Mình nợ: ${debt.toLocaleString('vi-VN')} đ`,
      formattedAmount: `${debt.toLocaleString('vi-VN')} VNĐ`,
      rawAmount: debt,
      color: '#dc2626',      // Đỏ/cam
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      badgeClass: 'debt-owe-supplier'
    };
  } else if (debt < 0) {
    const positiveVal = Math.abs(debt);
    return {
      status: 'SUPPLIER_OWES',
      label: 'NCC nợ mình',
      text: `NCC nợ mình: ${positiveVal.toLocaleString('vi-VN')} VNĐ`,
      shortText: `NCC nợ: ${positiveVal.toLocaleString('vi-VN')} đ`,
      formattedAmount: `${positiveVal.toLocaleString('vi-VN')} VNĐ`,
      rawAmount: positiveVal,
      color: '#16a34a',      // Xanh lá
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      badgeClass: 'debt-supplier-owes'
    };
  } else {
    return {
      status: 'SETTLED',
      label: 'Công nợ',
      text: 'Hết nợ',
      shortText: 'Hết nợ',
      formattedAmount: 'Hết nợ',
      rawAmount: 0,
      color: '#64748b',      // Xám
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0',
      badgeClass: 'debt-settled'
    };
  }
};
