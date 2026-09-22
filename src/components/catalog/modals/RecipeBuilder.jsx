import React, { useState, useMemo } from 'react';
import {
  SearchOutlined,
  DeleteOutlined,
  PlusOutlined,
  CloseOutlined,
  CheckOutlined,
  FilterOutlined,
} from '@ant-design/icons';

const TYPE_CONFIG = {
  Processed: { label: 'Chế biến', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  Manufactured: { label: 'Sản xuất', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  Regular: { label: 'Món thường', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  Ingredient: { label: 'Nguyên liệu', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
  Tool: { label: 'Công cụ', color: '#0891b2', bg: '#ecfeff', border: '#cff4fc' },
};

const RecipeBuilder = ({
  recipe = [],
  setRecipe,
  products = [],
  units = [],
  groups = [],
  currentProductId = null,
  allowedProductTypes = null, // Array of allowed types (e.g. ['Regular', 'Ingredient', 'Processed', 'Manufactured'])
  notifyError,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerType, setPickerType] = useState('ALL');
  const [pickerGroup, setPickerGroup] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState([]);

  // Đảm bảo recipe luôn là một mảng
  const safeRecipe = Array.isArray(recipe) ? recipe : [];

  // Bản đồ tra cứu đơn vị và nhóm hàng
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const groupMap = useMemo(() => new Map(groups.map(g => [g.id, g.name])), [groups]);

  // Lấy tên đơn vị cơ bản của nguyên liệu / sản phẩm
  const getProductBaseUnitName = (p) => {
    if (!p) return '—';
    const baseConversion = p.unitConversions?.find(u => u.isBase || u.baseId === null);
    if (baseConversion) {
      return baseConversion.unitName || unitMap.get(baseConversion.unitId) || '—';
    }
    return p.baseUnitName || unitMap.get(p.baseUnitId) || '—';
  };

  // Tập hợp các ID đã có trong công thức hiện tại
  const existingProductIds = useMemo(() => {
    return new Set(safeRecipe.map(r => r.productId));
  }, [safeRecipe]);

  // Danh sách các loại sản phẩm hợp lệ để hiển thị trong bộ lọc
  const availableTypeOptions = useMemo(() => {
    const types = allowedProductTypes && allowedProductTypes.length > 0
      ? allowedProductTypes.filter(t => t !== 'Tool')
      : ['Ingredient', 'Manufactured', 'Regular', 'Processed'];
    return types.map(t => ({
      key: t,
      label: TYPE_CONFIG[t]?.label || t,
    }));
  }, [allowedProductTypes]);

  // Lọc danh sách vật phẩm trong popup chọn nguyên liệu
  const candidateList = useMemo(() => {
    return products.filter(p => {
      // Loại trừ chính sản phẩm đang mở để chống lặp vòng lặp đệ quy
      if (currentProductId && p.id === currentProductId) return false;

      // Lọc theo các loại sản phẩm được phép làm thành phần
      const pType = p.productType || p.type;
      if (allowedProductTypes && allowedProductTypes.length > 0) {
        if (!allowedProductTypes.includes(pType)) return false;
      }
      if (pType === 'Tool') return false;

      // Lọc theo loại sản phẩm được chọn trên dropdown bộ lọc
      if (pickerType !== 'ALL' && pType !== pickerType) return false;

      // Lọc theo nhóm hàng
      if (pickerGroup !== 'ALL' && String(p.groupId) !== String(pickerGroup)) return false;

      // Lọc theo từ khóa tìm kiếm
      if (pickerSearch.trim()) {
        const q = pickerSearch.trim().toLowerCase();
        const nameMatch = p.name && p.name.toLowerCase().includes(q);
        const codeMatch = p.skuCode && p.skuCode.toLowerCase().includes(q);
        if (!nameMatch && !codeMatch) return false;
      }

      return true;
    });
  }, [products, currentProductId, allowedProductTypes, pickerType, pickerGroup, pickerSearch]);

  // Những vật phẩm chưa có trong công thức để chọn
  const selectableCandidates = useMemo(() => {
    return candidateList.filter(c => !existingProductIds.has(c.id));
  }, [candidateList, existingProductIds]);

  // Kiểm tra chọn tất cả
  const isAllSelectableChecked = selectableCandidates.length > 0 &&
    selectableCandidates.every(c => selectedIds.includes(c.id));

  const handleToggleSelectAll = () => {
    if (isAllSelectableChecked) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableCandidates.map(c => c.id));
    }
  };

  const handleToggleItemSelection = (id) => {
    if (existingProductIds.has(id)) return;
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Thêm nhanh 1 nguyên liệu
  const handleQuickAdd = (pId) => {
    if (existingProductIds.has(pId)) return;
    const updated = [
      ...safeRecipe,
      { productId: pId, quantity: 1 }
    ];
    if (typeof setRecipe === 'function') {
      setRecipe(updated);
    }
  };

  // Thêm tất cả các nguyên liệu đã tích chọn
  const handleConfirmAddSelected = () => {
    if (selectedIds.length === 0) return;
    const newItems = selectedIds.map(id => ({ productId: id, quantity: 1 }));
    const updated = [...safeRecipe, ...newItems];
    if (typeof setRecipe === 'function') {
      setRecipe(updated);
    }
    setSelectedIds([]);
    setIsPickerOpen(false);
  };

  // Chỉnh sửa số lượng định lượng
  const handleQuantityChange = (index, val) => {
    const updated = [...safeRecipe];
    updated[index] = { ...updated[index], quantity: val };
    if (typeof setRecipe === 'function') {
      setRecipe(updated);
    }
  };

  // Xóa nguyên liệu khỏi bảng
  const handleRemoveItem = (index) => {
    const updated = safeRecipe.filter((_, i) => i !== index);
    if (typeof setRecipe === 'function') {
      setRecipe(updated);
    }
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
      {/* HEADER TITLE VÀ NÚT + NGUYÊN LIỆU */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Thành phần nguyên liệu
          </h4>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>Thêm công thức để tự động trừ tồn và tính giá vốn dựa trên nguyên liệu</span>
            <button
              type="button"
              onClick={() => {
                setSelectedIds([]);
                setPickerSearch('');
                setPickerType('ALL');
                setPickerGroup('ALL');
                setIsPickerOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 12px',
                borderRadius: 6,
                background: '#8b5cf6',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#7c3aed')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#8b5cf6')}
            >
              <PlusOutlined /> Nguyên liệu
            </button>
          </div>
        </div>
      </div>

      {/* BẢNG CÔNG THỨC */}
      {safeRecipe.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: 13,
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px dashed #cbd5e1',
          }}
        >
          Chưa có thành phần nào trong công thức. Nhấn <strong style={{ color: '#8b5cf6' }}>"+ Nguyên liệu"</strong> ở trên để chọn thành phần.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '8px 12px', width: 50, textAlign: 'center' }}>STT</th>
                <th style={{ padding: '8px 12px' }}>Tên món thành phần</th>
                <th style={{ padding: '8px 12px', width: 140, textAlign: 'center' }}>Số lượng</th>
                <th style={{ padding: '8px 12px', width: 110, textAlign: 'center' }}>Đơn vị</th>
                <th style={{ padding: '8px 12px', width: 60, textAlign: 'center' }}>Xóa</th>
              </tr>
            </thead>
            <tbody>
              {safeRecipe.map((item, idx) => {
                const prod = products.find(p => p.id === item.productId);
                const prodName = prod?.name || `Sản phẩm #${item.productId}`;
                const baseUnitName = getProductBaseUnitName(prod);

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* 1. STT */}
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                      {idx + 1}
                    </td>

                    {/* 2. TÊN */}
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                      {prodName}
                    </td>

                    {/* 3. SỐ LƯỢNG */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max="1000000"
                        value={item.quantity}
                        onChange={e => handleQuantityChange(idx, e.target.value)}
                        style={{
                          width: 100,
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          textAlign: 'center',
                        }}
                      />
                    </td>

                    {/* 4. ĐƠN VỊ BASE UNIT */}
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontWeight: 500 }}>
                      {baseUnitName}
                    </td>

                    {/* 5. NÚT XÓA */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: 15,
                        }}
                        title="Xóa thành phần này"
                      >
                        <DeleteOutlined />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL POPUP CHỌN THÀNH PHẦN NGUYÊN LIỆU */}
      {isPickerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 16,
          }}
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: 820,
              maxWidth: '100%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* TIÊU ĐỀ POPUP */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#faf5ff',
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#581c87' }}>
                  Chọn thành phần nguyên liệu
                </div>
                <div style={{ fontSize: 12, color: '#7e22ce', marginTop: 2 }}>
                  Tìm kiếm và lọc các nguyên vật liệu hoặc thành phẩm đưa vào công thức món
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                <CloseOutlined style={{ fontSize: 12 }} />
              </button>
            </div>

            {/* THANH TÌM KIẾM VÀ BỘ LỌC */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid #f1f5f9',
                background: '#ffffff',
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {/* Ô TÌM KIẾM */}
              <div
                style={{
                  flex: 1,
                  minWidth: 220,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  padding: '6px 12px',
                }}
              >
                <SearchOutlined style={{ color: '#94a3b8', fontSize: 14 }} />
                <input
                  type="text"
                  placeholder="Tìm theo tên nguyên liệu, mã SKU..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    fontSize: 13,
                    color: '#0f172a',
                  }}
                  autoFocus
                />
                {pickerSearch && (
                  <button
                    type="button"
                    onClick={() => setPickerSearch('')}
                    style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 0, fontSize: 12 }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* LỌC THEO LOẠI SẢN PHẨM */}
              <select
                value={pickerType}
                onChange={(e) => setPickerType(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: 13,
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">-- Tất cả loại hàng --</option>
                {availableTypeOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>

              {/* LỌC THEO NHÓM HÀNG */}
              {groups.length > 0 && (
                <select
                  value={pickerGroup}
                  onChange={(e) => setPickerGroup(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: 13,
                    color: '#334155',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">-- Tất cả nhóm hàng --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* DANH SÁCH BẢNG VẬT PHẨM */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', minHeight: '260px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '10px 14px', width: 45, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isAllSelectableChecked}
                        onChange={handleToggleSelectAll}
                        disabled={selectableCandidates.length === 0}
                        style={{ cursor: 'pointer', accentColor: '#8b5cf6' }}
                      />
                    </th>
                    <th style={{ padding: '10px 12px', width: 110 }}>Mã hàng</th>
                    <th style={{ padding: '10px 12px' }}>Tên nguyên liệu / vật phẩm</th>
                    <th style={{ padding: '10px 12px', width: 110 }}>Phân loại</th>
                    <th style={{ padding: '10px 12px', width: 130 }}>Nhóm hàng</th>
                    <th style={{ padding: '10px 12px', width: 90, textAlign: 'center' }}>Đơn vị</th>
                    <th style={{ padding: '10px 14px', width: 85, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Không tìm thấy vật phẩm nào phù hợp</div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>Thử thay đổi từ khóa hoặc bộ lọc ở trên</div>
                      </td>
                    </tr>
                  ) : (
                    candidateList.map((item, index) => {
                      const isAlreadyInRecipe = existingProductIds.has(item.id);
                      const isChecked = selectedIds.includes(item.id);
                      const pType = item.productType || item.type || 'Regular';
                      const typeCfg = TYPE_CONFIG[pType] || TYPE_CONFIG.Regular;
                      const groupName = item.groupName || groupMap.get(item.groupId) || '—';
                      const baseUnitName = getProductBaseUnitName(item);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => !isAlreadyInRecipe && handleToggleItemSelection(item.id)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isAlreadyInRecipe
                              ? '#f8fafc'
                              : isChecked
                              ? '#faf5ff'
                              : index % 2 === 0
                              ? '#ffffff'
                              : '#fafafa',
                            cursor: isAlreadyInRecipe ? 'default' : 'pointer',
                            opacity: isAlreadyInRecipe ? 0.6 : 1,
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isAlreadyInRecipe && !isChecked) e.currentTarget.style.background = '#f3e8ff';
                          }}
                          onMouseLeave={(e) => {
                            if (!isAlreadyInRecipe && !isChecked) {
                              e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : '#fafafa';
                            }
                          }}
                        >
                          {/* CHECKBOX */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked || isAlreadyInRecipe}
                              disabled={isAlreadyInRecipe}
                              onChange={() => handleToggleItemSelection(item.id)}
                              style={{ cursor: isAlreadyInRecipe ? 'not-allowed' : 'pointer', accentColor: '#8b5cf6' }}
                            />
                          </td>

                          {/* MÃ HÀNG */}
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#7e22ce' }}>
                            {item.skuCode || `SP${String(item.id).padStart(4, '0')}`}
                          </td>

                          {/* TÊN VẬT PHẨM */}
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                            {item.name}
                          </td>

                          {/* PHÂN LOẠI */}
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: typeCfg.bg,
                                color: typeCfg.color,
                                border: `1px solid ${typeCfg.border}`,
                                fontSize: 10,
                                fontWeight: 600,
                              }}
                            >
                              {typeCfg.label}
                            </span>
                          </td>

                          {/* NHÓM HÀNG */}
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            {groupName}
                          </td>

                          {/* ĐƠN VỊ TÍNH */}
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#334155', fontWeight: 600 }}>
                            {baseUnitName}
                          </td>

                          {/* THAO TÁC */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            {isAlreadyInRecipe ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  background: '#e2e8f0',
                                  color: '#64748b',
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                <CheckOutlined /> Đã thêm
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickAdd(item.id)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  border: '1px solid #ddd6fe',
                                  background: '#f5f3ff',
                                  color: '#7e22ce',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                title="Thêm ngay vào công thức"
                              >
                                + Thêm
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* MODAL FOOTER */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Đã chọn: <strong style={{ color: '#8b5cf6' }}>{selectedIds.length}</strong> nguyên liệu
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddSelected}
                  disabled={selectedIds.length === 0}
                  style={{
                    padding: '7px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: selectedIds.length === 0 ? '#cbd5e1' : '#8b5cf6',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: selectedIds.length === 0 ? 'none' : '0 2px 4px rgba(139, 92, 246, 0.3)',
                  }}
                >
                  Thêm vào công thức ({selectedIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeBuilder;
