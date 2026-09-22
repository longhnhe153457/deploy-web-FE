import React from 'react';
import { AppstoreOutlined } from '@ant-design/icons';
import { SIDEBAR_HEADER_TITLES } from './constants/inventoryConstants';

const INVENTORY_OPTIONS = [
  { key: 'Adjustment', label: 'Điều chỉnh giá vốn' },
  { key: 'Import', label: 'Nhập hàng' },
  { key: 'ImportReturn', label: 'Trả hàng nhập' },
  { key: 'ExportDelete', label: 'Xuất hủy' },
  { key: 'Transfer', label: 'Chuyển hàng' },
  { key: 'Check', label: 'Kiểm kho' },
  { key: 'Partner', label: 'Đối tác' },
  { key: 'Customer', label: 'Khách hàng' },
  { key: 'Invoice', label: 'Hóa đơn' },
  { key: 'Production', label: 'Đồ chuẩn bị sẵn' },
  { key: 'Product', label: 'Danh sách nguyên liệu' },
  { key: 'BatchExpiry', label: 'Lô hàng & Hạn sử dụng' }
];

const InventoryHeaderNav = ({ activeTab }) => {
  const currentOption = INVENTORY_OPTIONS.find((opt) => opt.key === activeTab);
  const currentTitle = SIDEBAR_HEADER_TITLES[activeTab] || currentOption?.label || 'NHẬP HÀNG';

  return (
    <div
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 46,
        position: 'relative',
        zIndex: 10,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}
    >
      {/* LEFT: BREADCRUMB / SECTION TITLE BADGE (NO DUPLICATE DROPDOWN) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #e8442a, #f97316)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 14
          }}
        >
          <AppstoreOutlined />
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: '#0f172a',
            letterSpacing: '0.3px',
            textTransform: 'uppercase'
          }}
        >
          {currentTitle}
        </h2>
      </div>

      {/* RIGHT: LIVE SYNC STATUS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
        Live Synced
      </div>
    </div>
  );
};

export default InventoryHeaderNav;

