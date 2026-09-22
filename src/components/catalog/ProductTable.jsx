import React, { useState } from 'react';
import {
  EditOutlined,
  DeleteOutlined,
  PictureOutlined,
  ExperimentOutlined,
  BuildOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  GiftOutlined,
} from '@ant-design/icons';

const TYPE_CONFIG = {
  Processed: { label: 'Chế biến', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', icon: <ExperimentOutlined /> },
  Manufactured: { label: 'Sản xuất', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: <BuildOutlined /> },
  Regular: { label: 'Món thường', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: <ShoppingOutlined /> },
  Ingredient: { label: 'Nguyên liệu', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5', icon: <AppstoreOutlined /> },
  Tool: { label: 'Công cụ', color: '#0891b2', bg: '#ecfeff', border: '#cff4fc', icon: <SettingOutlined /> },
};

const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const ProductTable = ({
  products = [],
  groups = [],
  units = [],
  promotions = [],
  loading = false,
  selectedRowKeys = [],
  setSelectedRowKeys,
  onEditProduct,
  onDeleteProduct,
}) => {
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState(null);

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));
  const unitMap = new Map(units.map((u) => [u.id, u.name]));

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRowKeys(products.map((p) => p.id));
    } else {
      setSelectedRowKeys([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedRowKeys.includes(id)) {
      setSelectedRowKeys(selectedRowKeys.filter((k) => k !== id));
    } else {
      setSelectedRowKeys([...selectedRowKeys, id]);
    }
  };

  const isAllSelected = products.length > 0 && selectedRowKeys.length === products.length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* LOADING OVERLAY */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            fontSize: 13,
            fontWeight: 600,
            color: '#ea580c',
          }}
        >
          Đang tải dữ liệu...
        </div>
      )}

      {/* TABLE SCROLL CONTAINER */}
      <div style={{ flex: 1, overflow: 'auto', background: '#ffffff' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
            textAlign: 'left',
            color: '#1e293b',
          }}
        >
          <thead>
            <tr
              style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                color: '#475569',
                fontWeight: 700,
                fontSize: '11px',
                textTransform: 'uppercase',
                position: 'sticky',
                top: 0,
                zIndex: 5,
              }}
            >
              <th style={{ padding: '10px 12px', width: 40, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer', accentColor: '#ea580c' }}
                />
              </th>
              <th style={{ padding: '10px 12px', width: 100 }}>Mã hàng</th>
              <th style={{ padding: '10px 12px', width: 50, textAlign: 'center' }}>Ảnh</th>
              <th style={{ padding: '10px 12px', minWidth: 260 }}>Tên sản phẩm</th>
              <th style={{ padding: '10px 12px', width: 130 }}>Nhóm hàng</th>
              <th style={{ padding: '10px 12px', width: 110, textAlign: 'right' }}>Giá bán</th>
              <th style={{ padding: '10px 12px', width: 100, textAlign: 'right' }}>Giá vốn</th>
              <th style={{ padding: '10px 12px', width: 90 }}>Đơn vị</th>
              <th style={{ padding: '10px 12px', width: 120 }}>Loại SP</th>
              <th style={{ padding: '10px 12px', width: 120 }}>Trạng thái</th>
              <th style={{ padding: '10px 12px', width: 90, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Không tìm thấy sản phẩm nào</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Thử thay đổi bộ lọc hoặc thêm mới sản phẩm</div>
                </td>
              </tr>
            ) : (
              products.map((item, index) => {
                const isSelected = selectedRowKeys.includes(item.id);
                const pType = item.type || item.productType || 'Regular';
                const typeCfg = TYPE_CONFIG[pType] || TYPE_CONFIG.Regular;
                const groupName = item.groupName || groupMap.get(item.groupId) || '—';
                const baseUnitObj = item.unitConversions?.find(u => u.isBase || u.baseId === null);
                const unitName = baseUnitObj?.unitName || (baseUnitObj ? unitMap.get(baseUnitObj.unitId) : null) || unitMap.get(item.baseUnitId) || item.baseUnitName || '—';

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelected ? '#fff7ed' : index % 2 === 0 ? '#ffffff' : '#fafafa',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#fafafa';
                    }}
                  >
                    {/* CHECKBOX */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(item.id)}
                        style={{ cursor: 'pointer', accentColor: '#ea580c' }}
                      />
                    </td>

                    {/* CODE */}
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#ea580c' }}>
                      {item.skuCode || item.code || `SP${String(item.id).padStart(4, '0')}`}
                    </td>

                    {/* THUMBNAIL */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{
                            width: 34,
                            height: 34,
                            objectFit: 'cover',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            background: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            margin: '0 auto',
                          }}
                        >
                          <PictureOutlined style={{ fontSize: 16 }} />
                        </div>
                      )}
                    </td>

                    {/* NAME */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                          {item.name}
                        </div>
                        {(() => {
                          const activePromo = promotions?.find(p => 
                            p.isActive && p.status === 'Active' && 
                            (p.products?.length === 0 || p.products?.some(prod => prod.productId === item.id))
                          );
                          if (activePromo) {
                            return (
                              <span style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: 4, 
                                fontSize: 10, fontWeight: 700, color: '#ffffff', 
                                background: '#ea580c', padding: '2px 6px', borderRadius: 4,
                                whiteSpace: 'nowrap', flexShrink: 0, lineHeight: 1.2
                              }} title={activePromo.name}>
                                <AppstoreOutlined style={{ fontSize: 10 }} /> Khuyến mãi
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {item.description && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 300,
                            marginTop: 2,
                          }}
                        >
                          {item.description}
                        </div>
                      )}
                    </td>

                    {/* GROUP */}
                    <td style={{ padding: '8px 12px', color: '#475569', fontWeight: 500 }}>
                      {groupName}
                    </td>

                    {/* BASE PRICE */}
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                      {formatCurrency(item.sellPrice ?? item.basePrice ?? 0)}
                    </td>

                    {/* COST PRICE */}
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>
                      {formatCurrency(item.costPrice || 0)}
                    </td>

                    {/* BASE UNIT */}
                    <td style={{ padding: '8px 12px', color: '#334155' }}>
                      {unitName}
                    </td>

                    {/* PRODUCT TYPE BADGE */}
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 12,
                          color: typeCfg.color,
                          background: typeCfg.bg,
                          border: `1px solid ${typeCfg.border}`,
                        }}
                      >
                        {typeCfg.icon}
                        {typeCfg.label}
                      </span>
                    </td>

                    {/* SELLABLE BADGE */}
                    <td style={{ padding: '8px 12px' }}>
                      {item.isSellable !== false ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#166534',
                            background: '#f0fdf4',
                            padding: '2px 8px',
                            borderRadius: 12,
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          <CheckCircleOutlined style={{ fontSize: 11 }} /> Đang bán
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#991b1b',
                            background: '#fef2f2',
                            padding: '2px 8px',
                            borderRadius: 12,
                            border: '1px solid #fecaca',
                          }}
                        >
                          <CloseCircleOutlined style={{ fontSize: 11 }} /> Không bán
                        </span>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>

                        <button
                          onClick={() => onEditProduct(item)}
                          title="Sửa sản phẩm"
                          style={{
                            background: '#fff7ed',
                            border: '1px solid #ffedd5',
                            borderRadius: 4,
                            width: 26,
                            height: 26,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ea580c',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#ffedd5')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff7ed')}
                        >
                          <EditOutlined style={{ fontSize: 12 }} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmProduct(item)}
                          title="Xóa sản phẩm"
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 4,
                            width: 26,
                            height: 26,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#fef2f2')}
                        >
                          <DeleteOutlined style={{ fontSize: 12 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 20,
              width: 380,
              maxWidth: '90vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                <ExclamationCircleOutlined />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  Xác nhận xóa sản phẩm?
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Bạn có chắc chắn muốn xóa sản phẩm <strong>"{deleteConfirmProduct.name}"</strong>?
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                style={{
                  padding: '6px 14px',
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
                onClick={() => {
                  onDeleteProduct(deleteConfirmProduct.id);
                  setDeleteConfirmProduct(null);
                }}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#ffffff',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTable;
