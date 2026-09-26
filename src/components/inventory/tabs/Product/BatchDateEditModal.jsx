import React, { useState, useEffect } from 'react';
import { EditOutlined, CloseOutlined, CalendarOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { updateBatchDates } from '../../../../api/batchApi';

const showToast = (text, type = 'success') => {
  const toast = document.createElement('div');
  toast.innerText = text;
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
    color: #ffffff;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 700;
    z-index: 999999;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
};

const BatchDateEditModal = ({ open, batch, initialFocusField = 'expiryDate', onClose, onSuccess }) => {
  const [manufactureDate, setManufactureDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (open && batch) {
      setManufactureDate(batch.manufactureDate ? dayjs(batch.manufactureDate).format('YYYY-MM-DD') : '');
      setExpiryDate(batch.expiryDate ? dayjs(batch.expiryDate).format('YYYY-MM-DD') : '');
      setErrorMessage('');
    }
  }, [open, batch]);

  if (!open || !batch) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage('');

    if (manufactureDate && expiryDate) {
      if (dayjs(expiryDate).isBefore(dayjs(manufactureDate), 'day')) {
        setErrorMessage('Hạn sử dụng không được nhỏ hơn Ngày sản xuất.');
        return;
      }
    }

    setLoading(true);
    try {
      await updateBatchDates(batch.id, {
        manufactureDate: manufactureDate || null,
        expiryDate: expiryDate || null
      });

      showToast('Cập nhật ngày sản xuất và hạn sử dụng thành công!');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Không thể cập nhật ngày của Lô hàng.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ fontSize: 16, color: '#38bdf8' }} />
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
              Cập nhật Hạn dùng & Ngày sản xuất
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              padding: 4
            }}
          >
            <CloseOutlined />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Lô info banner */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Mã Lô:</span>
              <strong style={{ color: '#2563eb' }}>{batch.batchCode}</strong>
            </div>
            {batch.productName && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Mặt hàng:</span>
                <strong style={{ color: '#0f172a' }}>
                  {batch.productName} {batch.productCode ? `(${batch.productCode})` : ''}
                </strong>
              </div>
            )}
          </div>

          {errorMessage && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Ngày sản xuất */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              Ngày sản xuất:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                autoFocus={initialFocusField === 'manufactureDate'}
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Để trống nếu mặt hàng không có thông tin ngày sản xuất.
            </div>
          </div>

          {/* Hạn sử dụng */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                Hạn sử dụng:
              </label>
              {expiryDate && (
                <button
                  type="button"
                  onClick={() => setExpiryDate('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Xóa hạn sử dụng
                </button>
              )}
            </div>
            <input
              type="date"
              autoFocus={initialFocusField === 'expiryDate'}
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              style={{
                width: '100%',
                height: 36,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Để trống nếu mặt hàng không có hạn sử dụng (vô thời hạn).
            </div>
          </div>

          {/* FOOTER BUTTONS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 10,
              marginTop: 10,
              borderTop: '1px solid #f1f5f9',
              paddingTop: 14
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                height: 34,
                padding: '0 16px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
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
                height: 34,
                padding: '0 18px',
                borderRadius: 6,
                border: 'none',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
              }}
            >
              <CheckOutlined /> {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchDateEditModal;
