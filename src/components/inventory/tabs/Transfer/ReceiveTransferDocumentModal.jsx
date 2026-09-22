import React, { useState, useEffect, useMemo } from 'react';
import {
  CloseOutlined,
  FullscreenOutlined,
  PrinterOutlined,
  AlertOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../../../context/AuthContext';
import { useBranch } from '../../../../context/BranchContext';
import { receiveTransferDocument, rejectTransferDocument, getTransferById } from '../../../../api/documentApi';
import { extractErrorMessage } from '../../utils/errorHelper';

const ReceiveTransferDocumentModal = ({
  open,
  onClose,
  onSuccess,
  documentData = null
}) => {
  const auth = useAuth ? useAuth() : {};
  const user = auth?.user;
  const creatorName = user?.name || user?.email || 'Mno';

  const branchContext = useBranch ? useBranch() : {};
  const { branches = [], currentBranch } = branchContext;

  const [loading, setLoading] = useState(false);
  const [fullDoc, setFullDoc] = useState(null);
  const [items, setItems] = useState([]);
  const [receivingNote, setReceivingNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (open && documentData?.id) {
      setReceivingNote('');
      setErrorMessage('');
      setSuccessMessage('');
      setLoading(true);

      getTransferById(documentData.id)
        .then((res) => {
          const doc = res || documentData;
          setFullDoc(doc);
          const rawDetails = doc?.details || doc?.documentDetails || [];
          if (Array.isArray(rawDetails) && rawDetails.length > 0) {
            setItems(
              rawDetails.map((detail) => {
                const pCode = detail.productCode || detail.snapshotProductCode || detail.currentProductCode || detail.code || `SP${detail.bInventoryId || detail.id}`;
                const pName = detail.productName || detail.snapshotProductName || detail.currentProductName || detail.name || 'Sản phẩm';
                const uName = detail.unitName || detail.snapshotUnitName || detail.currentUnitName || detail.baseUnitName || 'Đơn vị';
                const stock = detail.currentStockQuantity ?? detail.stock ?? 0;
                const qty = Number(detail.quantity || detail.baseQuantity || 1);
                const price = Number(detail.snapshotAvgCost || detail.unitPrice || 0);

                return {
                  id: detail.id,
                  bInventoryId: detail.bInventoryId,
                  code: pCode,
                  name: pName,
                  unitName: uName,
                  stock: stock,
                  transferQty: qty,
                  receiveQty: qty, // Hạch toán tập trung: Nhận đủ 100% số lượng gửi
                  unitPrice: price,
                  note: detail.note || ''
                };
              })
            );
          } else {
            setItems([]);
          }
        })
        .catch((err) => {
          console.error('Lỗi khi nạp chi tiết phiếu chuyển kho:', err);
          setErrorMessage('Không thể tải chi tiết danh sách sản phẩm chuyển kho.');
          setItems([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setFullDoc(null);
      setItems([]);
      setReceivingNote('');
      setErrorMessage('');
      setSuccessMessage('');
      setLoading(false);
    }
  }, [open, documentData]);

  const totalTransferQty = useMemo(() => {
    return items.reduce((sum, i) => sum + (Number(i.transferQty) || 0), 0);
  }, [items]);

  const totalTransferValue = useMemo(() => {
    return items.reduce((sum, i) => sum + (Number(i.transferQty) || 0) * (Number(i.unitPrice) || 0), 0);
  }, [items]);

  // Xử lý Chấp nhận toàn bộ (Nhận 100%)
  const handleAcceptAll = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (items.length === 0) {
      setErrorMessage('Phiếu chuyển không có sản phẩm nào.');
      return;
    }
    if (!documentData?.id) {
      setErrorMessage('Không tìm thấy thông tin phiếu chuyển kho.');
      return;
    }
    if (isReceiverInactive) {
      setErrorMessage('Chi nhánh nhận đã ngừng kinh doanh. Không thể nhận hàng vào kho chi nhánh này.');
      return;
    }
    if (!receivingNote || !receivingNote.trim()) {
      setErrorMessage('Bắt buộc phải nhập Ghi chú xác nhận khi chấp nhận nhận hàng.');
      return;
    }

    setLoading(true);
    try {
      const dto = {
        transferDocumentId: documentData.id,
        status: 'Received',
        note: receivingNote.trim(),
        details: items.map((i) => ({
          detailId: i.id,
          receivedQuantity: Number(i.transferQty) || 0
        }))
      };
      await receiveTransferDocument(dto);
      setSuccessMessage('Đã chấp nhận toàn bộ hàng chuyển kho vào tồn kho chi nhánh thành công!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } catch (err) {
      console.error(err);
      const errMsg = extractErrorMessage(err, 'Lỗi khi xử lý chấp nhận nhận hàng.');
      setErrorMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý Từ chối toàn bộ (Hoàn trả 100% về kho gửi)
  const handleRejectAll = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!documentData?.id) return;
    if (!receivingNote || !receivingNote.trim()) {
      setErrorMessage('Bắt buộc phải nhập Lý do từ chối vào ô Ghi chú.');
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn từ chối toàn bộ phiếu chuyển kho này? Toàn bộ 100% hàng hóa sẽ được hoàn trả lại kho chi nhánh gửi.')) {
      return;
    }

    setLoading(true);
    try {
      await rejectTransferDocument({
        transferDocumentId: documentData.id,
        reason: receivingNote.trim()
      });
      setSuccessMessage('Đã từ chối nhận hàng. Toàn bộ hàng hóa đã được hoàn trả về kho gửi thành công!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 500);
    } catch (err) {
      console.error(err);
      const errMsg = extractErrorMessage(err, 'Lỗi khi từ chối nhận hàng.');
      setErrorMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const activeDoc = fullDoc || documentData;
  const docCode = activeDoc?.code || '---';
  const senderBranch = activeDoc?.branchName || activeDoc?.snapshotBranchName || activeDoc?.branch?.name || activeDoc?.currentBranchName || 'Chi nhánh gửi';
  const transferDate = (activeDoc?.orderDate || activeDoc?.businessDate || activeDoc?.createdAt)
    ? dayjs(activeDoc.orderDate || activeDoc.businessDate || activeDoc.createdAt).format('DD/MM/YYYY HH:mm')
    : dayjs().format('DD/MM/YYYY HH:mm');
  const docCreatorName = activeDoc?.createdByName || activeDoc?.snapshotCreatedByName || activeDoc?.creator?.name || activeDoc?.creator?.email || creatorName;
  const receiverBranchId = activeDoc?.toBranchId || activeDoc?.targetBranchId || activeDoc?.toBranch?.id;
  const receiverBranch = (branches || []).find((b) => Number(b.id) === Number(receiverBranchId)) || currentBranch;
  const isReceiverInactive = receiverBranch ? (receiverBranch.isDeleted || receiverBranch.status === 'Ngừng kinh doanh') : false;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: '100vh',
        maxHeight: '100vh',
        zIndex: 1000,
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12,
        overflow: 'hidden'
      }}
    >
      {/* THANH TIÊU ĐỀ (HEADER) */}
      <div
        style={{
          height: 48,
          background: '#ffffff',
          color: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid #cbd5e1',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
            Xác nhận chuyển kho nội bộ
          </span>
          <span
            style={{
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              borderRadius: 12,
              padding: '2px 10px',
              fontSize: 11,
              fontWeight: 600
            }}
          >
            Đang vận chuyển
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: 6,
              padding: '5px 8px',
              color: '#475569',
              cursor: 'pointer',
              fontSize: 15,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <CloseOutlined />
          </button>
        </div>
      </div>

      {/* THÔNG BÁO LỖI / THÀNH CÔNG */}
      {errorMessage && (
        <div style={{ background: '#fef2f2', color: '#dc2626', borderBottom: '1px solid #fecdd3', padding: '8px 16px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <AlertOutlined /> {errorMessage}
        </div>
      )}
      {successMessage && (
        <div style={{ background: '#ecfdf5', color: '#059669', borderBottom: '1px solid #a7f3d0', padding: '8px 16px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <CheckCircleOutlined /> {successMessage}
        </div>
      )}

      {/* NỘI DUNG CHÍNH (BODY) - KHÓA CHIỀU CAO VỪA VẶN */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: 'calc(100vh - 48px)' }}>
        {/* KHU VỰC TRÁI: BẢNG DANH SÁCH MẶT HÀNG */}
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
          <div
            style={{
              flex: 1,
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 72px)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 8px', width: 40, textAlign: 'center' }}>STT</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: 130 }}>MÃ HÀNG</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>TÊN HÀNG</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 90 }}>TỒN KHO B</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 110 }}>SL CHUYỂN</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 130 }}>SL NHẬN (100%)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 120 }}>ĐƠN GIÁ VỐN</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 130 }}>GIÁ TRỊ XUẤT</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                      Không có sản phẩm nào trong phiếu chuyển hàng này.
                    </td>
                  </tr>
                ) : (
                  items.map((record, index) => {
                    const total = (Number(record.transferQty) || 0) * (Number(record.unitPrice) || 0);

                    return (
                      <tr key={record.id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                        <td style={{ fontWeight: 600, color: '#334155', padding: '6px 10px' }}>{record.code}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{record.name}</span>
                            {record.unitName && (
                              <span style={{ fontSize: 10, color: '#64748b', marginLeft: 6 }}>
                                ({record.unitName})
                              </span>
                            )}
                          </div>
                          {record.note && (
                            <div style={{ marginTop: 2, fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                              Ghi chú: {record.note}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 10px', color: '#64748b' }}>
                          {(record.stock != null ? record.stock : 0).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 600, color: '#334155' }}>
                          {(record.transferQty != null ? record.transferQty : 0).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 10px' }}>
                          <span
                            title="Số lượng nhận cố định 100% theo quy trình hạch toán tập trung"
                            style={{
                              fontWeight: 700,
                              color: '#15803d',
                              display: 'inline-block',
                              padding: '3px 12px',
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              borderRadius: 4,
                              fontSize: 11
                            }}
                          >
                            {(record.transferQty ?? 0).toLocaleString('vi-VN')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 10px', color: '#475569' }}>
                          {(record.unitPrice != null ? record.unitPrice : 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 600, color: '#0f172a' }}>
                          {total.toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* KHU VỰC PHẢI: THÔNG TIN TỔNG QUAN & NÚT THAO TÁC */}
        <div
          style={{
            width: 340,
            background: '#ffffff',
            borderLeft: '1px solid #cbd5e1',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            height: '100%',
            overflowY: 'auto',
            zIndex: 100
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {/* THÔNG TIN NGƯỜI TẠO VÀ TRẠNG THÁI */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                {docCreatorName} {dayjs().format('DD/MM/YYYY HH:mm')}
              </span>
              <span
                style={{
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  borderRadius: 12,
                  padding: '1px 8px',
                  fontSize: 10,
                  fontWeight: 600
                }}
              >
                Đang vận chuyển
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#64748b' }}>Mã phiếu chuyển</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{docCode}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#64748b' }}>Chi nhánh gửi</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{senderBranch}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#64748b' }}>Ngày chuyển</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{transferDate}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
              <span style={{ color: '#475569' }}>Tổng số lượng chuyển</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{totalTransferQty.toLocaleString('vi-VN')}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#475569' }}>Tổng số lượng nhận (100%)</span>
              <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 13 }}>{totalTransferQty.toLocaleString('vi-VN')}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, background: '#f8fafc', padding: '6px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#475569', fontWeight: 600 }}>Tổng giá trị chuyển</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{totalTransferValue.toLocaleString('vi-VN')} đ</span>
            </div>

            {isReceiverInactive && (
              <div style={{ padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: 6, color: '#b91c1c', fontSize: 11, fontWeight: 600, lineHeight: 1.4 }}>
                Chi nhánh nhận đã ngừng kinh doanh. Không thể nhận hàng vào kho (chỉ có thể Từ chối nhận để hoàn trả hàng về kho gửi).
              </div>
            )}

            <div style={{ marginTop: 4 }}>
              <div style={{ marginBottom: 4, color: '#475569', fontSize: 11, fontWeight: 600 }}>
                Ghi chú / Lý do thao tác:
              </div>
              <textarea
                value={receivingNote}
                onChange={(e) => setReceivingNote(e.target.value)}
                rows={4}
                placeholder="Nhập ghi chú xác nhận hoặc lý do từ chối (bắt buộc)..."
                style={{
                  width: '100%',
                  borderRadius: 6,
                  padding: '8px 10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: 11,
                  resize: 'none'
                }}
              />
            </div>
          </div>

          {/* 2 NÚT HÀNH ĐỘNG DUY NHẤT: TỪ CHỐI TOÀN BỘ & CHẤP NHẬN TOÀN BỘ */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 14, borderTop: '1px solid #f1f5f9', marginTop: 12 }}>
            <button
              type="button"
              disabled={loading}
              onClick={handleRejectAll}
              style={{
                flex: 1,
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                fontWeight: 700,
                borderRadius: 6,
                padding: '10px 0',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 12,
                transition: 'all 0.15s ease'
              }}
            >
              Từ chối toàn bộ
            </button>
            <button
              type="button"
              disabled={loading || isReceiverInactive}
              onClick={handleAcceptAll}
              style={{
                flex: 1,
                background: '#0066ff',
                border: '1px solid #0066ff',
                color: '#ffffff',
                fontWeight: 700,
                borderRadius: 6,
                padding: '10px 0',
                cursor: (loading || isReceiverInactive) ? 'not-allowed' : 'pointer',
                opacity: (loading || isReceiverInactive) ? 0.5 : 1,
                fontSize: 12,
                transition: 'all 0.15s ease'
              }}
            >
              Chấp nhận toàn bộ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveTransferDocumentModal;
