import React, { useState } from 'react';
import { CloseOutlined, FolderOutlined } from '@ant-design/icons';

const QuickAddGroupModal = ({ open, onCancel, onSave, loading }) => {
  const [name, setName] = useState('');

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
    setName('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          width: 360,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FolderOutlined style={{ color: '#ea580c' }} /> Tạo nhóm hàng mới
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <CloseOutlined style={{ fontSize: 12 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Tên nhóm hàng <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Nhập tên nhóm hàng (ví dụ: Đồ uống, Khai vị)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: 12,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                outline: 'none',
              }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#475569',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 700,
                color: '#ffffff',
                background: loading ? '#94a3b8' : '#ea580c',
                border: 'none',
                borderRadius: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Đang lưu...' : 'Lưu nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickAddGroupModal;
