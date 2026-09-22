import React from 'react';

const PartnerSidebar = ({ partnerType, setPartnerType }) => {
  return (
    <div
      style={{
        width: 190,
        minWidth: 190,
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        color: '#475569',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 11,
        padding: '14px 12px',
        userSelect: 'none'
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: '#1e293b' }}>Phân loại:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { key: 'ALL', label: 'Tất cả đối tác' },
            { key: 'NCC', label: 'Nhà cung cấp' },
            { key: 'VC', label: 'Vận chuyển' },
            { key: 'OTHER', label: 'Đối tác dịch vụ' }
          ].map((item) => (
            <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 10.5 }}>
              <input
                type="radio"
                name="partnerType"
                checked={partnerType === item.key}
                onChange={() => setPartnerType(item.key)}
                style={{ accentColor: '#e8442a' }}
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 6, fontSize: 9.5, color: '#94a3b8', borderTop: '1px solid #f1f5f9' }}>
        MenuGo ERP v2.5
      </div>
    </div>
  );
};

export default PartnerSidebar;
