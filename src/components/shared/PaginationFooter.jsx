import React, { useState, useRef, useEffect } from 'react';

/**
 * PaginationFooter - Component phân trang dùng chung
 *
 * Props:
 *  - currentPage      : số trang hiện tại (1-indexed)
 *  - totalPages       : tổng số trang
 *  - pageSize         : số item mỗi trang hiện tại
 *  - totalItems       : tổng số item
 *  - onPageChange     : (page: number) => void
 *  - onPageSizeChange : (size: number) => void
 *  - pageSizeOptions  : number[] (mặc định [10, 20, 50, 100])
 */
const PaginationFooter = ({
  currentPage = 1,
  totalPages = 1,
  pageSize = 20,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100]
}) => {
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem   = Math.min(currentPage * pageSize, totalItems);

  const [jumpMode, setJumpMode]   = useState(false);
  const [jumpValue, setJumpValue] = useState('');
  const jumpInputRef = useRef(null);

  useEffect(() => {
    if (jumpMode && jumpInputRef.current) {
      jumpInputRef.current.focus();
      jumpInputRef.current.select();
    }
  }, [jumpMode]);

  const openJump = () => {
    setJumpValue(String(currentPage));
    setJumpMode(true);
  };

  const commitJump = () => {
    const val = parseInt(jumpValue, 10);
    if (!isNaN(val)) {
      const clamped = Math.max(1, Math.min(totalPages, val));
      onPageChange?.(clamped);
    }
    setJumpMode(false);
  };

  const handleJumpKeyDown = (e) => {
    if (e.key === 'Enter') commitJump();
    if (e.key === 'Escape') setJumpMode(false);
  };

  const btnBase = {
    padding: '3px 10px',
    borderRadius: 5,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    fontSize: 11.5,
    fontWeight: 500,
    cursor: 'pointer',
    userSelect: 'none'
  };

  return (
    <div
      style={{
        padding: '8px 12px',
        background: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 11.5,
        color: '#64748b',
        flexWrap: 'wrap',
        gap: 8
      }}
    >
      {/* Trái: Hiển thị X - Y / tổng + dropdown pageSize */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span>
          Hiển thị từ <strong style={{ color: '#0f172a' }}>{startItem}</strong> đến{' '}
          <strong style={{ color: '#0f172a' }}>{endItem}</strong> trên tổng{' '}
          <strong style={{ color: '#0f172a' }}>{totalItems}</strong>
        </span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange?.(Number(e.target.value));
            onPageChange?.(1);
          }}
          style={{
            height: 24,
            padding: '0 4px',
            fontSize: 11,
            borderRadius: 4,
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            color: '#334155',
            cursor: 'pointer',
            outline: 'none'
          }}
          title="Số dòng mỗi trang"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>{opt} / trang</option>
          ))}
        </select>
      </div>

      {/* Phải: Trở lại · Trang X/Y · Tiếp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
          style={{
            ...btnBase,
            color: currentPage <= 1 ? '#cbd5e1' : '#334155',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Trở lại
        </button>

        {jumpMode ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#64748b', fontSize: 11 }}>Trang</span>
            <input
              ref={jumpInputRef}
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onBlur={commitJump}
              onKeyDown={handleJumpKeyDown}
              style={{
                width: 48,
                height: 24,
                textAlign: 'center',
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 4,
                border: '2px solid #2563eb',
                outline: 'none',
                color: '#1e40af'
              }}
            />
            <span style={{ color: '#64748b', fontSize: 11 }}>/ {totalPages}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={openJump}
            title="Nhấn để nhảy tới trang bất kỳ"
            style={{
              ...btnBase,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontWeight: 700,
              minWidth: 70,
              textAlign: 'center'
            }}
          >
            Trang {currentPage} / {totalPages}
          </button>
        )}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
          style={{
            ...btnBase,
            color: currentPage >= totalPages ? '#cbd5e1' : '#334155',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Tiếp
        </button>
      </div>
    </div>
  );
};

export default PaginationFooter;
