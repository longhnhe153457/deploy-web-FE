import React from 'react';
import { CloseOutlined, PrinterOutlined, RollbackOutlined, EnvironmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

/**
 * ImportReturnDocumentModal — Modal xem chi tiết phiếu Trả hàng nhập đã hoàn thành.
 * Chỉ đọc, không có form nhập liệu.
 */
const ImportReturnDocumentModal = ({
  open,
  onClose,
  document: doc = null
}) => {
  if (!open || !doc) return null;

  const partnerName = doc.partnerName || doc.snapshotPartnerName || 'Nhà cung cấp';
  const branchName = doc.branchName || doc.snapshotBranchName || 'Chi nhánh';
  const creatorName = doc.snapshotCreatedByName || doc.creator || 'Hệ thống';
  const parentCode = doc.parentDocumentCode || (doc.parentDocumentId ? `#${doc.parentDocumentId}` : '---');
  const detailsList = doc.details || [];
  const cashFlows = doc.cashFlows || [];
  const totalReturnAmt = Math.round(Number(doc.totalAmount || 0));
  const paidAmt = Math.round(Number(doc.amountPaid || 0));

  const handlePrint = () => {
    alert(`Đang chuẩn bị in phiếu trả: ${doc.code}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 860,
          background: '#ffffff',
          borderRadius: 10,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #e8442a, #d9381e)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RollbackOutlined style={{ fontSize: 15 }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              Phiếu trả hàng nhập — {doc.code}
            </span>
            <span style={{
              background: 'rgba(255,255,255,0.25)',
              borderRadius: 10,
              padding: '1px 8px',
              fontSize: 10,
              fontWeight: 600
            }}>
              Hoàn thành
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#fff', cursor: 'pointer', fontSize: 13 }}
            >
              <PrinterOutlined />
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#fff', cursor: 'pointer', fontSize: 13 }}
            >
              <CloseOutlined />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, fontSize: 12 }}>
          {/* META INFO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Mã phiếu trả</div>
              <div style={{ fontWeight: 700, color: '#e8442a', fontSize: 14 }}>{doc.code}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Ngày trả hàng</div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {dayjs(doc.orderDate || doc.createdAt).format('DD/MM/YYYY HH:mm')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Người tạo</div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{creatorName}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Nhà cung cấp</div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{partnerName}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Chi nhánh</div>
              <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 4 }}>
                <EnvironmentOutlined style={{ color: '#e8442a' }} /> {branchName}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Phiếu nhập gốc</div>
              <div style={{ fontWeight: 600, color: '#334155' }}>
                {parentCode}
              </div>
            </div>
          </div>

          {doc.note && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', marginBottom: 12, color: '#475569', fontSize: 11 }}>
              <span style={{ fontWeight: 600 }}>Ghi chú:</span> {doc.note}
            </div>
          )}

          {/* DETAILS TABLE */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 36 }}>STT</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>MÃ HÀNG</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>TÊN HÀNG</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>ĐVT</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>SL TRẢ</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>ĐƠN GIÁ TRẢ</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>THÀNH TIỀN</th>
                </tr>
              </thead>
              <tbody>
                {detailsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                      Không có chi tiết hàng hóa
                    </td>
                  </tr>
                ) : (
                  detailsList.map((item, idx) => {
                    const qty = Number(item.quantity || 0);
                    const price = Number(item.unitPrice || 0);
                    const amount = Math.round(qty * price);
                    return (
                      <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#334155' }}>
                          {item.snapshotProductCode || item.productCode || `SP${item.bInventoryId}`}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                          {item.snapshotProductName || item.productName || 'Sản phẩm'}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', fontSize: 10, border: '1px solid #cbd5e1' }}>
                            {item.snapshotUnitName || item.unitName || 'Cái'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#ea580c' }}>
                          {qty.toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          {Math.round(price).toLocaleString('vi-VN')} ₫
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {amount.toLocaleString('vi-VN')} ₫
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* FINANCIAL SUMMARY */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <div style={{ width: 320, background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Tổng tiền hàng trả:</span>
                <strong style={{ color: '#0f172a' }}>{totalReturnAmt.toLocaleString('vi-VN')} ₫</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px dashed #e2e8f0', paddingTop: 6 }}>
                <span style={{ color: '#64748b' }}>NCC đã thanh toán:</span>
                <strong style={{ color: '#16a34a' }}>{paidAmt.toLocaleString('vi-VN')} ₫</strong>
              </div>
            </div>
          </div>

          {/* CASHFLOW HISTORY */}
          {cashFlows.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Lịch sử thu tiền từ NCC</div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>
                      <th style={{ padding: '7px 10px', textAlign: 'left' }}>MÃ PHIẾU THU</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left' }}>THỜI GIAN</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left' }}>PHƯƠNG THỨC</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>SỐ TIỀN</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left' }}>GHI CHÚ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlows.map((cf, idx) => {
                      const pm = cf.paymentMethod === 'BankTransfer' || cf.paymentMethod === 'Chuyển khoản'
                        ? 'Chuyển khoản'
                        : 'Tiền mặt';

                      return (
                        <tr key={cf.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 600, color: '#e8442a' }}>{cf.code || `CF-${cf.id}`}</td>
                          <td style={{ padding: '7px 10px', color: '#334155' }}>
                            {cf.businessDate ? dayjs(cf.businessDate).format('DD/MM/YYYY HH:mm') : '---'}
                          </td>
                          <td style={{ padding: '7px 10px', color: '#334155' }}>{pm}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                            {Number(cf.totalAmount || cf.amount || 0).toLocaleString('vi-VN')} ₫
                          </td>
                          <td style={{ padding: '7px 10px', color: '#64748b' }}>{cf.note || '---'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          background: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              height: 32,
              padding: '0 16px',
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <PrinterOutlined /> In phiếu
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 32,
              padding: '0 16px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              background: '#e8442a',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportReturnDocumentModal;
