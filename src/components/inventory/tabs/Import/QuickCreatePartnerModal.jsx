import React, { useState, useEffect } from 'react';
import { CloseOutlined, UserAddOutlined } from '@ant-design/icons';
import { createPartner } from '../../../../api/partnerApi';

const QuickCreatePartnerModal = ({ open, onClose, branchId, defaultType = 1, onSuccess }) => {
  const [type, setType] = useState(defaultType);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setName('');
      setPhone('');
      setEmail('');
      setErrorMsg('');
      setLoading(false);
    }
  }, [open, defaultType]);

  if (!open) return null;

  const isSupplier = defaultType === 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên đối tác / nhà cung cấp.');
      return;
    }
    if (!trimmedPhone) {
      setErrorMsg('Vui lòng nhập số điện thoại.');
      return;
    }
    if (!trimmedEmail) {
      setErrorMsg('Vui lòng nhập email.');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Định dạng email không hợp lệ.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        branchId: Number(branchId),
        type: Number(type),
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail
      };

      const result = await createPartner(payload);
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.title || err.message || 'Lỗi khi tạo mới đối tác.';
      setErrorMsg(msg);
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
        zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
            <UserAddOutlined style={{ color: '#e8442a', fontSize: 16 }} />
            <span>{isSupplier ? 'Tạo mới nhà cung cấp' : 'Tạo mới đối tác'}</span>
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
              justifyContent: 'center',
              padding: 4,
              borderRadius: 4
            }}
          >
            <CloseOutlined />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {errorMsg && (
            <div
              style={{
                padding: '8px 12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 6,
                color: '#ef4444',
                fontSize: 11
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Partner Type Selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Loại đối tác <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {isSupplier ? (
              <select
                disabled
                value={1}
                style={{
                  width: '100%',
                  borderRadius: 6,
                  padding: '6px 10px',
                  border: '1px solid #cbd5e1',
                  background: '#f1f5f9',
                  color: '#64748b',
                  fontSize: 11
                }}
              >
                <option value={1}>Nhà cung cấp</option>
              </select>
            ) : (
              <select
                value={type}
                onChange={(e) => setType(Number(e.target.value))}
                style={{
                  width: '100%',
                  borderRadius: 6,
                  padding: '6px 10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: 11,
                  background: '#ffffff'
                }}
              >
                <option value={3}>Đơn vị vận chuyển</option>
                <option value={4}>Đối tác khác</option>
              </select>
            )}
          </div>

          {/* Partner Name */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              {isSupplier ? 'Tên nhà cung cấp' : 'Tên đối tác'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isSupplier ? 'Nhập tên nhà cung cấp' : 'Nhập tên đối tác'}
              style={{
                width: '100%',
                borderRadius: 6,
                padding: '6px 10px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: 11
              }}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Số điện thoại <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại"
              style={{
                width: '100%',
                borderRadius: 6,
                padding: '6px 10px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: 11
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Email <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập địa chỉ email"
              style={{
                width: '100%',
                borderRadius: 6,
                padding: '6px 10px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: 11
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                borderRadius: 6,
                padding: '6px 14px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: 11,
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
                borderRadius: 6,
                padding: '6px 16px',
                border: '1px solid #e8442a',
                background: '#e8442a',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {loading ? 'Đang tạo...' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickCreatePartnerModal;
