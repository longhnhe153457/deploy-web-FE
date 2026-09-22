import React from 'react';
import { SearchOutlined } from '@ant-design/icons';

const AdjustmentSidebar = ({
  searchText,
  setSearchText,
  statusFilter,
  setStatusFilter
}) => {
  return (
    <div
      style={{
        width: 210,
        minWidth: 210,
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        color: '#475569',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12,
        padding: '14px 12px',
        userSelect: 'none'
      }}
    >
      {/* SEARCH BOX (NO HEADER TITLE AS REQUESTED) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <SearchOutlined
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: 13
            }}
          />
          <input
            type="text"
            placeholder="Tìm kiếm phiếu..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%',
              height: 32,
              paddingLeft: 30,
              paddingRight: 8,
              fontSize: 11.5,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              outline: 'none',
              background: '#ffffff',
              color: '#1e293b'
            }}
          />
        </div>
      </div>

      {/* STATUS FILTER */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e293b', fontSize: 12 }}>
          Trạng thái
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { key: 'ALL', label: 'Tất cả trạng thái' },
            { key: 'COMPLETED', label: 'Hoàn thành' },
            { key: 'PENDING', label: 'Phiếu tạm' },
            { key: 'CANCELLED', label: 'Đã hủy' }
          ].map((item) => (
            <label
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 11.5,
                color: statusFilter === item.key ? '#e8442a' : '#475569',
                fontWeight: statusFilter === item.key ? 600 : 400
              }}
            >
              <input
                type="radio"
                name="adjStatus"
                checked={statusFilter === item.key}
                onChange={() => setStatusFilter(item.key)}
                style={{ accentColor: '#e8442a', cursor: 'pointer' }}
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 10,
          fontSize: 10,
          color: '#94a3b8',
          borderTop: '1px solid #f1f5f9'
        }}
      >
        MenuGo ERP v2.5
      </div>
    </div>
  );
};

export default AdjustmentSidebar;
