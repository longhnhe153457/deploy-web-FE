import React, { useState, useEffect } from 'react';
import { CloseOutlined, UserOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { createCustomer, updateCustomerProfile } from '../../../../api/customerManagementApi';

const CustomerProfileModal = ({
  open,
  onClose,
  onSuccess,
  customer = null
}) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [initialPoint, setInitialPoint] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const isEdit = Boolean(customer?.id);

  useEffect(() => {
    if (open) {
      setErrorMessage('');
      if (customer) {
        setName(customer.name || '');
        setPhone(customer.phone || '');
        setEmail(customer.email || '');
        setInitialPoint(customer.point || 0);
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setInitialPoint(0);
      }
    }
  }, [open, customer]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên khách hàng.');
      return;
    }

    if (!phone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        // Cập nhật thông tin profile (Tuyệt đối không gửi password)
        await updateCustomerProfile(customer.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null
        });
      } else {
        // Thêm khách hàng mới
        await createCustomer({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          initialPoint: Number(initialPoint) || 0
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu thông tin khách hàng:', err);
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin khách hàng. Vui lòng thử lại.';
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
        zIndex: 1000,
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
          maxWidth: 460,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafafa'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined style={{ color: '#ea580c', fontSize: 16 }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {isEdit ? 'Chỉnh sửa thông tin khách hàng' : 'Thêm khách hàng mới'}
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

        {/* MODAL BODY */}
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

          {/* TÊN KHÁCH HÀNG */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
              Tên khách hàng <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <UserOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên khách hàng"
                required
                style={{
                  width: '100%',
                  height: 36,
                  padding: '4px 12px 4px 32px',
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

          {/* SỐ ĐIỆN THOẠI */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
              Số điện thoại <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <PhoneOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại (vd: 0987654321)"
                required
                style={{
                  width: '100%',
                  height: 36,
                  padding: '4px 12px 4px 32px',
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

          {/* EMAIL */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <MailOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập địa chỉ email (không bắt buộc)"
                style={{
                  width: '100%',
                  height: 36,
                  padding: '4px 12px 4px 32px',
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

          {/* ĐIỂM KHỞI TẠO (CHỈ KHI TẠO MỚI) */}
          {!isEdit && (
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                Điểm tích lũy ban đầu
              </label>
              <input
                type="number"
                min="0"
                value={initialPoint}
                onChange={(e) => setInitialPoint(Math.max(0, parseInt(e.target.value, 10) || 0))}
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
              <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                Mặc định là 0 điểm nếu không nhập.
              </span>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
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
                background: 'linear-gradient(135deg, #ea580c, #f97316)',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(234, 88, 12, 0.25)'
              }}
            >
              {loading ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm khách hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerProfileModal;
