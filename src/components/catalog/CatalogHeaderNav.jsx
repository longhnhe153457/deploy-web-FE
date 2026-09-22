import React from 'react';
import {
  AppstoreOutlined,
  DollarOutlined,
  PlusOutlined,
  ReloadOutlined,
  GiftOutlined,
} from '@ant-design/icons';

const CatalogHeaderNav = ({
  activeTab = 'ProductCatalog',
  setActiveTab,
  onOpenCreateTypeModal,
  onRefreshData,
  totalProducts = 0,
}) => {
  const tabs = [
    { key: 'ProductCatalog', label: 'Danh mục & Sản phẩm', icon: <AppstoreOutlined /> },
    { key: 'PricePromo', label: 'Quản lý giá', icon: <DollarOutlined /> },
  ];

  return (
    <div
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        zIndex: 10,
      }}
    >
      {/* LEFT SIDE: CAPSULE TABS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#0f172a' : '#64748b',
                  background: isActive ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '13px', color: isActive ? '#ea580c' : '#94a3b8' }}>
                  {tab.icon}
                </span>
                {tab.label}
                {tab.key === 'ProductCatalog' && totalProducts > 0 && (
                  <span
                    style={{
                      background: isActive ? '#fff7ed' : '#e2e8f0',
                      color: isActive ? '#ea580c' : '#475569',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      border: isActive ? '1px solid #ffedd5' : 'none',
                    }}
                  >
                    {totalProducts}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDE: ACTION BUTTONS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            title="Làm mới dữ liệu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ea580c')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
          >
            <ReloadOutlined style={{ fontSize: '12px' }} />
            Tải lại
          </button>
        )}

        {activeTab === 'ProductCatalog' && onOpenCreateTypeModal && (
          <button
            onClick={onOpenCreateTypeModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#ffffff',
              background: '#ea580c',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(234, 88, 12, 0.35)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#c2410c')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ea580c')}
          >
            <PlusOutlined style={{ fontSize: '12px' }} />
            Thêm mới sản phẩm
          </button>
        )}
      </div>
    </div>
  );
};

export default CatalogHeaderNav;
