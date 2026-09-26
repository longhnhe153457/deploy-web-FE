import React, { useState, useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { message } from 'antd';

const PartnerModal = ({
  open,
  onClose,
  onSuccess,
  selectedBranchId,
  editingPartner
}) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('Nhà cung cấp');

  useEffect(() => {
    if (open) {
      if (editingPartner) {
        setName(editingPartner.name || '');
        setPhone(editingPartner.phone || '');
        setEmail(editingPartner.email || '');
        
        // Ánh xạ từ enum backend hoặc chuỗi sang loại hiển thị trên frontend
        let typeStr = 'Nhà cung cấp';
        const pType = editingPartner.type;
        if (pType === 1 || pType === '1' || pType === 'Supplier' || pType === 'Nhà cung cấp') typeStr = 'Nhà cung cấp';
        else if (pType === 3 || pType === '3' || pType === 'Transporter' || pType === 'Vận chuyển') typeStr = 'Vận chuyển';
        else if (pType === 4 || pType === '4' || pType === 'Other' || pType === 'Khác') typeStr = 'Khác';
        else typeStr = 'Nhà cung cấp';
        setType(typeStr);
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setType('Nhà cung cấp');
      }
    }
  }, [open, editingPartner]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      message.error('Vui lòng nhập tên đối tác');
      return;
    }
    if (!phone.trim()) {
      message.error('Vui lòng nhập số điện thoại');
      return;
    }

    setLoading(true);
    try {
      const { createPartner, updatePartner } = await import('../../../../api/partnerApi');
      
      let mappedType = 1; // Supplier = 1
      if (type === 'Vận chuyển') mappedType = 3; // Transporter = 3
      else if (type === 'Khác') mappedType = 4; // Other = 4
      else mappedType = 1; // Supplier = 1

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() ? email.trim() : null,
        type: mappedType
      };

      if (editingPartner) {
        await updatePartner(editingPartner.id, payload);
        message.success('Cập nhật đối tác thành công!');
      } else {
        payload.branchId = selectedBranchId;
        await createPartner(payload);
        message.success('Thêm đối tác thành công!');
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving partner:', error);
      const errorMsg = error?.response?.data?.message || 'Không thể lưu đối tác. Vui lòng kiểm tra lại!';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const isSaveDisabled = loading || !name.trim() || !phone.trim();

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
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
          background: '#ffffff',
          borderRadius: 10,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff'
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            {editingPartner ? 'Cập nhật thông tin đối tác' : 'Thêm nhà cung cấp / đối tác mới'}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', fontSize: 14 }}
          >
            <CloseOutlined />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Tên nhà cung cấp / đối tác *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên công ty / cá nhân đối tác..."
                style={{
                  width: '100%',
                  height: 34,
                  padding: '0 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Số điện thoại *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901..."
                  style={{
                    width: '100%',
                    height: 34,
                    padding: '0 10px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@gmail.com (không bắt buộc)"
                  style={{
                    width: '100%',
                    height: 34,
                    padding: '0 10px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Phân loại đối tác *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={{
                    width: '100%',
                    height: 34,
                    padding: '0 10px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                >
                  <option value="Nhà cung cấp">Nhà cung cấp</option>
                  <option value="Vận chuyển">Vận chuyển</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              background: '#f8fafc'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 32,
                padding: '0 14px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaveDisabled}
              style={{
                height: 32,
                padding: '0 16px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: isSaveDisabled ? '#cbd5e1' : '#e8442a',
                color: '#ffffff',
                cursor: isSaveDisabled ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Đang lưu...' : (editingPartner ? 'Cập nhật đối tác' : 'Lưu đối tác')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PartnerModal;
