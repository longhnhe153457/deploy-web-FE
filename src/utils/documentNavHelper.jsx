import React from 'react';
import axiosInstance from '../api/axiosInstance';

/**
 * Phân giải URL chi tiết dựa trên mã tham chiếu (Mã chứng từ / Hóa đơn / Đối tác / Khách hàng / Sản phẩm)
 */
export const resolveDocumentUrl = (code, fallbackId = null, fallbackType = null) => {
  if (!code && !fallbackId) return null;
  const str = String(code || '').trim();
  const upper = str.toUpperCase();

  // 1. Phiếu nhập kho (NH...)
  if (upper.startsWith('NH') || fallbackType === 'Import') {
    const num = fallbackId || upper.replace(/\D/g, '');
    if (num) return `/import-detail/${num}`;
  }

  // 2. Phiếu trả hàng nhập (TH..., THN...)
  if (upper.startsWith('THN') || upper.startsWith('TH') || fallbackType === 'Return') {
    const num = fallbackId || upper.replace(/\D/g, '');
    if (num) return `/import-return-detail/${num}`;
  }

  // 3. Phiếu xuất hủy (XH...)
  if (upper.startsWith('XH') || fallbackType === 'ExportDelete') {
    const num = fallbackId || upper.replace(/\D/g, '');
    if (num) return `/export-delete-detail/${num}`;
  }

  // 4. Phiếu chuyển kho (CK...)
  if (upper.startsWith('CK') || fallbackType === 'Transfer') {
    const num = fallbackId || upper.replace(/\D/g, '');
    if (num) return `/transfer-detail/${num}`;
  }

  // 5. Phiếu kiểm kho (KK...)
  if (upper.startsWith('KK') || fallbackType === 'Check') {
    const num = fallbackId || upper.replace(/\D/g, '');
    if (num) return `/check-detail/${num}`;
  }

  // 6. Phiếu điều chỉnh giá vốn (DC... nếu độ dài >= 6 hoặc type CostAdjustment)
  if ((upper.startsWith('DC') && upper.length >= 6) || fallbackType === 'CostAdjustment') {
    const num = fallbackId || upper.replace(/\D/g, '');
    if (num) return `/adjustment-detail/${num}`;
  }

  // 7. Phiếu sản xuất (SX...)
  if (upper.startsWith('SX') || fallbackType === 'Production') {
    const num = fallbackId || upper.replace(/\D/g, '');
    if (num) return `/production-detail/${num}`;
  }

  // 8. Hóa đơn bán hàng (HD...)
  if (upper.startsWith('HD') || fallbackType === 'Sale' || fallbackType === 'Invoice') {
    const num = fallbackId || upper.replace(/\D/g, '');
    if (num) return `/invoice-detail/${num}`;
  }

  // 9. Đối tác / Nhà cung cấp (DT..., NCC...)
  if (upper.startsWith('DT') || upper.startsWith('NCC') || fallbackType === 'Partner') {
    const num = fallbackId || upper.replace(/\D/g, '');
    if (num) return `/partner-detail/${num}`;
  }

  // 10. Khách hàng (KH...)
  if (upper.startsWith('KH') || fallbackType === 'Customer') {
    const num = fallbackId || upper.replace(/\D/g, '');
    if (num) return `/customer-detail/${num}`;
  }

  // 11. Mặt hàng tồn kho / Sản phẩm (SP...)
  if (upper.startsWith('SP') || fallbackType === 'Product') {
    return `/inventory-management?tab=Product${code ? `&search=${encodeURIComponent(code)}` : ''}`;
  }

  return null;
};

/**
 * Điều hướng tới chứng từ hoặc thực thể được tham chiếu
 */
export const navigateToDocumentOrRef = async (navigate, code, fallbackId = null, fallbackType = null) => {
  if (!code && !fallbackId && fallbackType !== 'Product') return;

  const directUrl = resolveDocumentUrl(code, fallbackId, fallbackType);
  if (directUrl) {
    navigate(directUrl);
    return;
  }

  // Nếu mã phức tạp hoặc không khớp regex, gọi API lookup
  try {
    const res = await axiosInstance.get('/api/Document/lookup', {
      params: { code: String(code || '').trim() }
    });
    if (res?.data?.found && res?.data?.url) {
      navigate(res.data.url);
      return;
    }
  } catch (err) {
    console.warn('Lỗi khi tra cứu mã chứng từ tham chiếu:', err);
  }

  // Dự phòng dựa trên fallbackId và fallbackType
  if (fallbackId || fallbackType === 'Product') {
    if (fallbackType === 'Partner') navigate(`/partner-detail/${fallbackId}`);
    else if (fallbackType === 'Customer') navigate(`/customer-detail/${fallbackId}`);
    else if (fallbackType === 'Product') navigate(`/inventory-management?tab=Product${code ? `&search=${encodeURIComponent(code)}` : ''}`);
    else if (fallbackType === 'Invoice') navigate(`/invoice-detail/${fallbackId}`);
    else navigate(`/import-detail/${fallbackId}`);
  }
};

/**
 * Component hiển thị mã chứng từ có thể bấm để điều hướng tới phiếu được tham chiếu
 */
export const ReferenceLink = ({
  code,
  id,
  type,
  children,
  style = {},
  navigate,
  title = 'Nhấp để xem chi tiết phiếu được tham chiếu'
}) => {
  const displayText = children || code || (id ? `#${id}` : '---');

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        navigateToDocumentOrRef(navigate, code, id, type);
      }}
      style={{
        color: '#2563eb',
        fontWeight: 700,
        cursor: 'pointer',
        textDecoration: 'underline',
        ...style
      }}
      title={title}
    >
      {displayText}
    </span>
  );
};
