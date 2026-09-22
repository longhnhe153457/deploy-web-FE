import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Tooltip } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
  ReloadOutlined,
  FolderOutlined,
  BookOutlined,
  AppstoreOutlined,
  ExperimentOutlined,
  BuildOutlined,
  ShoppingOutlined,
  SettingOutlined,
  CloseOutlined,
  CloseCircleFilled,
} from '@ant-design/icons';

const PRODUCT_TYPES_LIST = [
  { value: 'Processed', label: 'Chế biến', color: '#8b5cf6', icon: <ExperimentOutlined /> },
  { value: 'Manufactured', label: 'Sản xuất', color: '#2563eb', icon: <BuildOutlined /> },
  { value: 'Regular', label: 'Món thường', color: '#16a34a', icon: <ShoppingOutlined /> },
  { value: 'Ingredient', label: 'Nguyên liệu', color: '#ea580c', icon: <AppstoreOutlined /> },
  { value: 'Tool', label: 'Công cụ', color: '#0891b2', icon: <SettingOutlined /> },
];

/**
 * Reusable Searchable Multi-Select Component with Dropdown popup.
 * Limits dropdown height (maxHeight: 180) to prevent overflow.
 */
const SearchableMultiSelect = ({
  placeholder,
  items = [],
  selectedIds = [],
  setSelectedIds,
  emptyText = 'Không tìm thấy kết quả',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item) => item.name?.toLowerCase().includes(term));
  }, [items, searchTerm]);

  const toggleItem = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.includes(item.id));
  }, [items, selectedIds]);

  const isAllSelected =
    items.length > 0 && items.every((item) => selectedIds.includes(item.id));

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* SEARCH INPUT BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: isOpen ? '1px solid #ea580c' : '1px solid #cbd5e1',
          borderRadius: 6,
          background: '#f8fafc',
          padding: '6px 10px',
          gap: 6,
          boxShadow: isOpen ? '0 0 0 2px rgba(234, 88, 12, 0.15)' : 'none',
          transition: 'all 0.15s ease',
          cursor: 'text',
        }}
        onClick={() => setIsOpen(true)}
      >
        <SearchOutlined style={{ color: '#94a3b8', fontSize: 13 }} />
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 12,
            color: '#0f172a',
            width: '100%',
          }}
        />
        {searchTerm && (
          <CloseCircleFilled
            onClick={(e) => {
              e.stopPropagation();
              setSearchTerm('');
            }}
            style={{ color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
          />
        )}
        {selectedIds.length > 0 && !searchTerm && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: '#ea580c',
              color: '#ffffff',
              borderRadius: 10,
              padding: '1px 6px',
            }}
          >
            {selectedIds.length}
          </span>
        )}
      </div>

      {/* DROPDOWN POPUP MENU (RESTRICTED HEIGHT TO PREVENT OVERFLOW) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow:
              '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1050,
            overflow: 'hidden',
          }}
        >
          {/* Header Select All / Clear */}
          {items.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderBottom: '1px solid #f1f5f9',
                background: '#fafafa',
                fontSize: 11,
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#334155',
                }}
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleAll}
                  style={{ accentColor: '#ea580c', cursor: 'pointer' }}
                />
                <span>{isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
              </label>
              {selectedIds.length > 0 && (
                <span
                  onClick={() => setSelectedIds([])}
                  style={{
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 10.5,
                  }}
                >
                  Xóa chọn ({selectedIds.length})
                </span>
              )}
            </div>
          )}

          {/* DROPDOWN LIST WITH FIXED HEIGHT */}
          <div
            style={{
              maxHeight: 180,
              overflowY: 'auto',
              padding: '4px 0',
            }}
          >
            {filteredItems.length === 0 ? (
              <div
                style={{
                  fontSize: 11,
                  color: '#94a3b8',
                  padding: '12px 10px',
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}
              >
                {emptyText}
              </div>
            ) : (
              filteredItems.map((item) => {
                const isChecked = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      fontSize: 12,
                      color: isChecked ? '#0f172a' : '#475569',
                      fontWeight: isChecked ? 600 : 400,
                      background: isChecked ? '#fff7ed' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ cursor: 'pointer', accentColor: '#ea580c' }}
                    />
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                      }}
                    >
                      {item.name}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SELECTED ITEMS TAGS CHIPS */}
      {selectedItems.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 6,
            maxHeight: 80,
            overflowY: 'auto',
          }}
        >
          {selectedItems.map((item) => (
            <span
              key={item.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
                background: '#fff7ed',
                color: '#ea580c',
                border: '1px solid #ffedd5',
                borderRadius: 4,
                padding: '2px 6px',
                maxWidth: '100%',
              }}
            >
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 150,
                }}
              >
                {item.name}
              </span>
              <CloseOutlined
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
                style={{ fontSize: 9, cursor: 'pointer', color: '#ea580c' }}
              />
            </span>
          ))}
          {selectedItems.length > 1 && (
            <button
              onClick={() => setSelectedIds([])}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 10.5,
                color: '#94a3b8',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '2px 4px',
              }}
            >
              Xóa tất cả
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const CatalogSidebar = ({
  searchText,
  setSearchText,
  groups = [],
  selectedGroupIds = [],
  setSelectedGroupIds,
  selectedTypes = [],
  setSelectedTypes,
  menus = [],
  selectedMenuIds = [],
  setSelectedMenuIds,
  selectedSellableFilter = 'all',
  setSelectedSellableFilter,
  onResetFilters,
  onOpenAddGroupModal,
  onOpenAddMenuModal,
  onOpenGroupPriorityModal,
  onOpenMenuPriorityModal,
}) => {
  const toggleArrayItem = (array, setArray, item) => {
    if (array.includes(item)) {
      setArray(array.filter((x) => x !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const hasActiveFilters =
    searchText.trim() !== '' ||
    selectedGroupIds.length > 0 ||
    selectedTypes.length > 0 ||
    selectedMenuIds.length > 0 ||
    selectedSellableFilter !== 'all';

  return (
    <aside
      style={{
        width: 260,
        minWidth: 260,
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        userSelect: 'none',
      }}
    >
      {/* SIDEBAR HEADER & SEARCH */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
            <FilterOutlined style={{ color: '#ea580c' }} />
            Bộ lọc tìm kiếm
          </div>
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              title="Xóa bộ lọc"
              style={{
                background: 'none',
                border: 'none',
                fontSize: 11,
                fontWeight: 600,
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ReloadOutlined style={{ fontSize: 10 }} /> Đặt lại
            </button>
          )}
        </div>

        {/* SEARCH INPUT */}
        <div style={{ position: 'relative' }}>
          <SearchOutlined
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: 13,
            }}
          />
          <input
            type="text"
            placeholder="Tìm mã, tên sản phẩm..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              fontSize: 12,
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              outline: 'none',
              background: '#f8fafc',
              color: '#0f172a',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#ea580c')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>
      </div>

      {/* FILTER SECTIONS CONTAINER */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {/* 1. LOẠI HÀNG HÓA / SẢN PHẨM */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            Loại sản phẩm
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PRODUCT_TYPES_LIST.map((type) => {
              const isChecked = selectedTypes.includes(type.value);
              return (
                <label
                  key={type.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: isChecked ? '#0f172a' : '#475569',
                    fontWeight: isChecked ? 600 : 400,
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: 4,
                    background: isChecked ? '#fff7ed' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayItem(selectedTypes, setSelectedTypes, type.value)}
                      style={{ cursor: 'pointer', accentColor: '#ea580c' }}
                    />
                    <span style={{ color: type.color, fontSize: 13 }}>{type.icon}</span>
                    <span>{type.label}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '12px 0' }} />

        {/* 2. NHÓM HÀNG */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
              {onOpenGroupPriorityModal && (
                <Tooltip title="Tùy chỉnh thứ tự ưu tiên nhóm hàng">
                  <span
                    onClick={onOpenGroupPriorityModal}
                    role="button"
                    tabIndex={0}
                    style={{
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      color: '#64748b',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ea580c';
                      e.currentTarget.style.backgroundColor = '#fff7ed';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#64748b';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <SettingOutlined style={{ fontSize: 13 }} />
                  </span>
                </Tooltip>
              )}
              <FolderOutlined style={{ color: '#ea580c' }} />
              Nhóm hàng
            </div>
            {onOpenAddGroupModal && (
              <button
                onClick={onOpenAddGroupModal}
                title="Tạo nhóm hàng mới"
                style={{
                  background: '#fff7ed',
                  border: '1px solid #ffedd5',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#ea580c',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <PlusOutlined style={{ fontSize: 10 }} /> Tạo nhóm
              </button>
            )}
          </div>

          <SearchableMultiSelect
            placeholder="Tìm & chọn nhóm hàng..."
            items={groups}
            selectedIds={selectedGroupIds}
            setSelectedIds={setSelectedGroupIds}
            emptyText="Chưa có hoặc không tìm thấy nhóm hàng"
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '12px 0' }} />

        {/* 3. THỰC ĐƠN / MENUS */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
              {onOpenMenuPriorityModal && (
                <Tooltip title="Tùy chỉnh thứ tự ưu tiên thực đơn">
                  <span
                    onClick={onOpenMenuPriorityModal}
                    role="button"
                    tabIndex={0}
                    style={{
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      color: '#64748b',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ea580c';
                      e.currentTarget.style.backgroundColor = '#fff7ed';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#64748b';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <SettingOutlined style={{ fontSize: 13 }} />
                  </span>
                </Tooltip>
              )}
              <BookOutlined style={{ color: '#ea580c' }} />
              Thực đơn
            </div>
            {onOpenAddMenuModal && (
              <button
                onClick={onOpenAddMenuModal}
                title="Tạo thực đơn mới"
                style={{
                  background: '#fff7ed',
                  border: '1px solid #ffedd5',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#ea580c',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <PlusOutlined style={{ fontSize: 10 }} /> Tạo thực đơn
              </button>
            )}
          </div>

          <SearchableMultiSelect
            placeholder="Tìm & chọn thực đơn..."
            items={menus}
            selectedIds={selectedMenuIds}
            setSelectedIds={setSelectedMenuIds}
            emptyText="Chưa có hoặc không tìm thấy thực đơn"
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '12px 0' }} />

        {/* 4. TRẠNG THÁI BÁN */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            Trạng thái bán
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { value: 'all', label: 'Tất cả' },
              { value: 'sellable', label: 'Đang bán' },
              { value: 'notSellable', label: 'Không bán' },
            ].map((option) => (
              <label
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: selectedSellableFilter === option.value ? '#0f172a' : '#475569',
                  fontWeight: selectedSellableFilter === option.value ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="sellableFilter"
                  value={option.value}
                  checked={selectedSellableFilter === option.value}
                  onChange={(e) => setSelectedSellableFilter(e.target.value)}
                  style={{ cursor: 'pointer', accentColor: '#ea580c' }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CatalogSidebar;
