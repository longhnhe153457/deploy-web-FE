import React, { useState, useEffect, useMemo } from 'react';
import { CloseOutlined, TrophyOutlined, AlertOutlined, HistoryOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import {
  adjustCustomerPoints,
  editManualPointTransaction,
  deleteManualPointTransaction
} from '../../../../api/customerManagementApi';

const CustomerPointModal = ({
  open,
  onClose,
  onSuccess,
  customer,
  // transactionToEdit hoặc transactionToDelete nếu thực hiện sửa / xóa giao dịch
  mode = 'adjust', // 'adjust' | 'edit' | 'delete'
  targetTransaction = null
}) => {
  const [loading, setLoading] = useState(false);
  const [newPoints, setNewPoints] = useState('');
  const [reason, setReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const currentPoints = customer?.point ?? 0;

  useEffect(() => {
    if (open) {
      setErrorMessage('');
      if (mode === 'adjust') {
        setNewPoints(String(currentPoints));
        setReason('');
      } else if (mode === 'edit' && targetTransaction) {
        setNewPoints(String(targetTransaction.pointAfter));
        setReason(targetTransaction.reason || '');
      } else if (mode === 'delete' && targetTransaction) {
        setDeleteReason(`Hoàn tác giao dịch #${targetTransaction.id}: ${targetTransaction.reason}`);
      }
    }
  }, [open, mode, targetTransaction, currentPoints]);

  const parsedNewPoints = parseInt(newPoints, 10);
  const isValidNumber = !isNaN(parsedNewPoints) && parsedNewPoints >= 0;

  // Tính chênh lệch điểm (Delta)
  const delta = useMemo(() => {
    if (!isValidNumber) return 0;
    if (mode === 'adjust') {
      return parsedNewPoints - currentPoints;
    }
    if (mode === 'edit' && targetTransaction) {
      return parsedNewPoints - targetTransaction.pointBefore;
    }
    return 0;
  }, [isValidNumber, parsedNewPoints, currentPoints, mode, targetTransaction]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (mode === 'delete') {
      // Xử lý hoàn tác / xóa giao dịch
      if (!targetTransaction?.id) return;
      setLoading(true);
      try {
        await deleteManualPointTransaction(targetTransaction.id, deleteReason.trim());
        if (onSuccess) onSuccess();
        onClose();
      } catch (err) {
        console.error('Lỗi khi xóa giao dịch điểm:', err);
        const msg = err.response?.data?.message || 'Không thể xóa giao dịch điểm. Vui lòng thử lại.';
        setErrorMessage(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validation cho Adjust và Edit
    if (!isValidNumber) {
      setErrorMessage('Số điểm mới phải là số nguyên dương hợp lệ từ 0 trở lên.');
      return;
    }

    if (mode === 'adjust' && delta === 0) {
      setErrorMessage('Số điểm mới trùng khớp với số điểm hiện tại. Không có thay đổi.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do điều chỉnh điểm.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'adjust') {
        await adjustCustomerPoints(customer.id, {
          newPoints: parsedNewPoints,
          reason: reason.trim()
        });
      } else if (mode === 'edit' && targetTransaction) {
        await editManualPointTransaction(targetTransaction.id, {
          newPoints: parsedNewPoints,
          reason: reason.trim()
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi điều chỉnh điểm:', err);
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi xử lý điểm. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
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
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: mode === 'delete' ? '#fff1f2' : '#fff7ed'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'delete' ? (
              <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 18 }} />
            ) : (
              <TrophyOutlined style={{ color: '#ea580c', fontSize: 18 }} />
            )}
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: mode === 'delete' ? '#991b1b' : '#9a3412' }}>
              {mode === 'delete'
                ? 'Xác nhận xóa giao dịch điểm'
                : mode === 'edit'
                ? 'Chỉnh sửa giao dịch điểm thủ công'
                : 'Điều chỉnh điểm tích lũy'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: 14,
              padding: 4
            }}
          >
            <CloseOutlined />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {errorMessage && (
            <div
              style={{
                marginBottom: 14,
                padding: '10px 14px',
                borderRadius: 6,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* TRƯỜNG HỢP: XÓA / HOÀN TÁC GIAO DỊCH */}
          {mode === 'delete' && targetTransaction && (
            <div>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 16
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 6 }}>
                  Cảnh báo hoàn tác điểm:
                </div>
                <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.5 }}>
                  Giao dịch <strong>{targetTransaction.pointChange > 0 ? `+${targetTransaction.pointChange}` : targetTransaction.pointChange} điểm</strong> (Lý do: <em>{targetTransaction.reason}</em>) sẽ bị đánh dấu hoàn tác.
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#0f172a', fontWeight: 600 }}>
                  Số điểm của khách hàng sẽ được thay đổi từ <strong>{currentPoints} điểm</strong> thành{' '}
                  <strong style={{ color: '#ea580c' }}>
                    {Math.max(0, currentPoints - targetTransaction.pointChange)} điểm
                  </strong>.
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  Lý do hoàn tác
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Nhập lý do hoàn tác giao dịch..."
                  style={{
                    width: '100%',
                    height: 36,
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP: ĐIỀU CHỈNH HOẶC SỬA GIAO DỊCH */}
          {mode !== 'delete' && (
            <div>
              {/* CURRENT POINTS BOX */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Khách hàng: <span style={{ color: '#0f172a' }}>{customer?.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {mode === 'edit' ? 'Điểm trước giao dịch:' : 'Điểm tích lũy hiện tại:'}
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#ea580c' }}>
                  {mode === 'edit' && targetTransaction
                    ? `${targetTransaction.pointBefore.toLocaleString('vi-VN')} điểm`
                    : `${currentPoints.toLocaleString('vi-VN')} điểm`}
                </div>
              </div>

              {/* INPUT: NEW POINTS */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  {mode === 'edit' ? 'Điểm sau giao dịch mới' : 'Số điểm mới'} <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={newPoints}
                  onChange={(e) => setNewPoints(e.target.value)}
                  placeholder="Nhập số điểm mới..."
                  required
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* REAL-TIME DELTA INDICATOR */}
              {isValidNumber && (
                <div
                  style={{
                    background: delta > 0 ? '#ecfdf5' : delta < 0 ? '#fef2f2' : '#f8fafc',
                    border: delta > 0 ? '1px solid #a7f3d0' : delta < 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '8px 12px',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12
                  }}
                >
                  <span style={{ color: '#475569', fontWeight: 600 }}>Biến động điểm (Delta):</span>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 13,
                      color: delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#64748b'
                    }}
                  >
                    {delta > 0 ? `+${delta.toLocaleString('vi-VN')}` : delta.toLocaleString('vi-VN')} điểm
                  </span>
                </div>
              )}

              {/* INPUT: REASON */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  Lý do điều chỉnh <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Bù điểm sự kiện khai trương, điều chỉnh sai sót..."
                  rows={3}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* CONFIRMATION SUMMARY CARD */}
              {isValidNumber && delta !== 0 && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 6,
                    padding: '10px 14px',
                    fontSize: 11.5,
                    color: '#92400e',
                    marginBottom: 16
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertOutlined /> Xác nhận điều chỉnh:
                  </div>
                  <div>• Điểm trước: <strong>{mode === 'edit' ? targetTransaction.pointBefore : currentPoints} điểm</strong></div>
                  <div>• Điểm mới: <strong>{parsedNewPoints} điểm</strong></div>
                  <div>• Thay đổi: <strong>{delta > 0 ? `+${delta}` : delta} điểm</strong></div>
                </div>
              )}
            </div>
          )}

          {/* ACTIONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 20px',
                borderRadius: 6,
                border: 'none',
                background: mode === 'delete' ? '#dc2626' : 'linear-gradient(135deg, #ea580c, #f97316)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: mode === 'delete' ? '0 2px 4px rgba(220, 38, 38, 0.25)' : '0 2px 4px rgba(234, 88, 12, 0.25)'
              }}
            >
              {loading
                ? 'Đang xử lý...'
                : mode === 'delete'
                ? 'Xác nhận xóa'
                : mode === 'edit'
                ? 'Lưu thay đổi'
                : 'Xác nhận điều chỉnh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerPointModal;
