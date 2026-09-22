import React, { useState } from 'react';
import { SearchOutlined, SaveOutlined } from '@ant-design/icons';
import { bulkUpdateSellPrice } from '../../api/productApi';

// Chỉ hỗ trợ 3 loại được phép chỉnh giá bán
const ALLOWED_PRICE_TYPES = ['regular', 'manufactured', 'processed'];

const isAllowedPriceType = (p) => {
  const pType = String(p.type || p.productType || '').toLowerCase().trim();
  return ALLOWED_PRICE_TYPES.includes(pType);
};

const TYPE_LABELS = {
  processed: { label: 'Chế biến', bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  manufactured: { label: 'Sản xuất', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  regular: { label: 'Hàng hóa', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
};

const getTypeBadge = (p) => {
  const pType = String(p.type || p.productType || '').toLowerCase().trim();
  const cfg = TYPE_LABELS[pType];
  if (!cfg) return null;
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
};

const PriceManagementTab = ({ products = [], groups = [], onRefreshData, notifySuccess, notifyError }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedType, setSelectedType] = useState(''); // '' = tất cả
  const [editedPrices, setEditedPrices] = useState({}); // { productId: sellPrice }
  const [saving, setSaving] = useState(false);

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  // Lọc sản phẩm: chỉ Regular, Manufactured, Processed
  const filteredProducts = products.filter((p) => {
    if (!isAllowedPriceType(p)) return false;

    const pType = String(p.type || p.productType || '').toLowerCase().trim();

    const matchesType = !selectedType || pType === selectedType;

    const matchesSearch =
      searchTerm.trim() === '' ||
      (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.skuCode && p.skuCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGroup = !selectedGroupId || p.groupId === Number(selectedGroupId);

    return matchesType && matchesSearch && matchesGroup;
  });

  const handlePriceChange = (productId, rawStr) => {
    // Chỉ giữ lại chữ số
    const cleanDigits = String(rawStr ?? '').replace(/\D/g, '');
    const numValue = cleanDigits === '' ? 0 : Number(cleanDigits);
    setEditedPrices((prev) => ({
      ...prev,
      [productId]: numValue,
    }));
  };

  const handleSavePrices = async () => {
    const changedEntries = Object.entries(editedPrices);
    if (changedEntries.length === 0) return;

    setSaving(true);
    try {
      const payload = changedEntries.map(([idStr, sellPrice]) => ({
        id: Number(idStr),
        sellPrice,
      }));

      await bulkUpdateSellPrice(payload);

      if (notifySuccess) notifySuccess(`Cập nhật bảng giá bán thành công (${payload.length} sản phẩm)!`);
      setEditedPrices({});
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Lỗi khi cập nhật giá:', err);
      if (notifyError) notifyError(err?.response?.data?.message || 'Không thể cập nhật bảng giá.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(editedPrices).length > 0;

  // Đếm theo loại trong danh sách đã lọc nhóm+tìm kiếm (chưa lọc loại)
  const allAllowed = products.filter((p) => {
    if (!isAllowedPriceType(p)) return false;
    const matchesSearch =
      searchTerm.trim() === '' ||
      (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.skuCode && p.skuCode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGroup = !selectedGroupId || p.groupId === Number(selectedGroupId);
    return matchesSearch && matchesGroup;
  });

  const countByType = {
    '': allAllowed.length,
    processed: allAllowed.filter((p) => String(p.type || p.productType || '').toLowerCase() === 'processed').length,
    manufactured: allAllowed.filter((p) => String(p.type || p.productType || '').toLowerCase() === 'manufactured').length,
    regular: allAllowed.filter((p) => String(p.type || p.productType || '').toLowerCase() === 'regular').length,
  };

  const typeFilters = [
    { key: '', label: 'Tất cả' },
    { key: 'processed', label: 'Chế biến', color: '#7c3aed' },
    { key: 'manufactured', label: 'Sản xuất', color: '#2563eb' },
    { key: 'regular', label: 'Hàng hóa', color: '#16a34a' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff', overflow: 'hidden' }}>
      {/* FILTER & TOOLBAR */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* SEARCH */}
          <div style={{ position: 'relative', width: 240 }}>
            <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }} />
            <input
              type="text"
              placeholder="Tìm mã hoặc tên sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: 12,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* GROUP FILTER */}
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: 12,
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              outline: 'none',
              background: '#ffffff',
            }}
          >
            <option value="">-- Tất cả nhóm hàng --</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* TYPE FILTER CAPSULE */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '2px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              gap: 2,
            }}
          >
            {typeFilters.map((tf) => {
              const isActive = selectedType === tf.key;
              return (
                <button
                  key={tf.key}
                  onClick={() => setSelectedType(tf.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? (tf.color || '#0f172a') : '#64748b',
                    background: isActive ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.12s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tf.label}
                  <span
                    style={{
                      background: isActive ? (tf.color ? `${tf.color}18` : '#e2e8f0') : '#e2e8f0',
                      color: isActive ? (tf.color || '#475569') : '#64748b',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 8,
                      minWidth: 18,
                      textAlign: 'center',
                    }}
                  >
                    {countByType[tf.key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasChanges && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#ea580c' }}>
              {Object.keys(editedPrices).length} sản phẩm thay đổi giá
            </span>
          )}
          <button
            onClick={handleSavePrices}
            disabled={!hasChanges || saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: 700,
              color: '#ffffff',
              background: !hasChanges || saving ? '#94a3b8' : '#15803d',
              border: 'none',
              borderRadius: 6,
              cursor: !hasChanges || saving ? 'not-allowed' : 'pointer',
              boxShadow: hasChanges ? '0 1px 3px rgba(21, 128, 61, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <SaveOutlined style={{ fontSize: 12 }} />
            {saving ? 'Đang lưu...' : 'Lưu bảng giá'}
          </button>
        </div>
      </div>

      {/* TABLE CONTENT */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr
              style={{
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                color: '#475569',
                fontWeight: 700,
                fontSize: 11,
                textTransform: 'uppercase',
                position: 'sticky',
                top: 0,
                zIndex: 5,
              }}
            >
              <th style={{ padding: '10px 14px', textAlign: 'left', width: 120 }}>Mã hàng</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tên sản phẩm</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: 110 }}>Loại</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', width: 150 }}>Nhóm hàng</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', width: 180 }}>Giá bán niêm yết (₫)</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: 90 }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
                  Không tìm thấy sản phẩm nào
                </td>
              </tr>
            ) : (
              filteredProducts.map((p, idx) => {
                const isEdited = editedPrices[p.id] !== undefined;
                const currentPrice = isEdited ? editedPrices[p.id] : (p.sellPrice || p.basePrice || 0);

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: isEdited ? '#fffbe7' : idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* MÃ HÀNG */}
                    <td style={{ padding: '8px 14px', fontWeight: 600, color: '#0284c7', fontFamily: 'monospace' }}>
                      {p.skuCode || p.code || `SP${String(p.id).padStart(4, '0')}`}
                    </td>

                    {/* TÊN SẢN PHẨM */}
                    <td style={{ padding: '8px 14px', fontWeight: 700, color: '#0f172a' }}>{p.name}</td>

                    {/* LOẠI SẢN PHẨM */}
                    <td style={{ padding: '8px 14px', textAlign: 'center' }}>{getTypeBadge(p)}</td>

                    {/* NHÓM HÀNG */}
                    <td style={{ padding: '8px 14px', color: '#475569' }}>
                      {groupMap.get(p.groupId) || '—'}
                    </td>

                    {/* GIÁ BÁN INPUT */}
                    <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={Number(currentPrice || 0).toLocaleString('vi-VN')}
                        onChange={(e) => handlePriceChange(p.id, e.target.value)}
                        style={{
                          width: 140,
                          padding: '5px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#15803d',
                          border: isEdited ? '1.5px solid #eab308' : '1px solid #cbd5e1',
                          borderRadius: 6,
                          outline: 'none',
                          textAlign: 'right',
                          background: isEdited ? '#fefce8' : '#ffffff',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      />
                    </td>

                    {/* TRẠNG THÁI */}
                    <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                      {isEdited ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#d97706',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}
                        >
                          Đã sửa
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#64748b' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PriceManagementTab;
