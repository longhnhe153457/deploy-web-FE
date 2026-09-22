import React from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

const ProductPagination = ({
  currentPage = 1,
  pageSize = 20,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        fontSize: '12px',
        color: '#475569',
        userSelect: 'none',
      }}
    >
      {/* LEFT: TOTAL INFO & PAGE SIZE SELECT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>
          Hiển thị <strong>{startItem}</strong> - <strong>{endItem}</strong> trên tổng số{' '}
          <strong>{totalItems}</strong> sản phẩm
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Số dòng:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: '3px 6px',
              fontSize: '12px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              background: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
            <option value={100}>100 / trang</option>
          </select>
        </div>
      </div>

      {/* RIGHT: PAGINATION CONTROLS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* PREV BUTTON */}
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            background: currentPage <= 1 ? '#f8fafc' : '#ffffff',
            color: currentPage <= 1 ? '#cbd5e1' : '#475569',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <LeftOutlined style={{ fontSize: '11px' }} />
        </button>

        {/* PAGE NUMBERS */}
        {getPageNumbers().map((page) => {
          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                width: '28px',
                height: '28px',
                border: isActive ? '1px solid #ea580c' : '1px solid #cbd5e1',
                borderRadius: '4px',
                background: isActive ? '#ea580c' : '#ffffff',
                color: isActive ? '#ffffff' : '#475569',
                fontWeight: isActive ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {page}
            </button>
          );
        })}

        {/* NEXT BUTTON */}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            background: currentPage >= totalPages ? '#f8fafc' : '#ffffff',
            color: currentPage >= totalPages ? '#cbd5e1' : '#475569',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <RightOutlined style={{ fontSize: '11px' }} />
        </button>
      </div>
    </div>
  );
};

export default ProductPagination;
