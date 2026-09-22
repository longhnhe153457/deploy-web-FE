/**
 * TablePanel — Panel danh sách bàn (cột trái)
 * Hiển thị grid bàn với 4 trạng thái màu sắc rõ ràng:
 *   🟢 Trống | 🔵 Đặt bàn | 🟠 Có khách | 🔴 Dọn dẹp
 *
 * Tính năng lọc theo Khu vực (Area):
 *  - Tab "Tất cả" hiển thị toàn bộ bàn
 *  - Tab theo tên khu vực: chỉ hiển thị bàn thuộc khu vực đó
 */
import { useMemo, useState } from 'react';
import { Spin } from 'antd';
import { getStatusConfig, TABLE_STATUS_CONFIG } from '../../data/tableConstants';

const TablePanel = ({ tables, selectedTable, onSelectTable, loading }) => {
  const [selectedArea, setSelectedArea] = useState('all');

  // Trích xuất danh sách các khu vực duy nhất từ danh sách bàn
  const areas = useMemo(() => {
    const areaMap = new Map();
    tables.forEach((t) => {
      if (t.areaId && t.areaName && !areaMap.has(t.areaId)) {
        areaMap.set(t.areaId, { id: t.areaId, name: t.areaName });
      }
    });
    return Array.from(areaMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tables]);

  // Lọc bàn theo khu vực đang chọn
  const filteredTables = useMemo(() => {
    if (selectedArea === 'all') return tables;
    return tables.filter((t) => t.areaId === selectedArea);
  }, [tables, selectedArea]);

  return (
    <aside className="pos-table-panel">
      {/* Header */}
      <div className="pos-table-panel-header">
        <div className="pos-table-panel-title">
          <span className="pos-table-panel-icon"></span>
          <span>Sơ đồ bàn</span>
        </div>
        <span className="pos-table-count">{filteredTables.length}/{tables.length} bàn</span>
      </div>

      {/* Area Filter Tabs */}
      {areas.length > 0 && (
        <div className="pos-area-tabs">
          <button
            className={`pos-area-tab ${selectedArea === 'all' ? 'pos-area-tab--active' : ''}`}
            onClick={() => setSelectedArea('all')}
          >
            Tất cả
          </button>
          {areas.map((area) => (
            <button
              key={area.id}
              className={`pos-area-tab ${selectedArea === area.id ? 'pos-area-tab--active' : ''}`}
              onClick={() => setSelectedArea(area.id)}
            >
              {area.name}
            </button>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="pos-table-legend">
        {Object.entries(TABLE_STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="pos-legend-item">
            <span className="pos-legend-dot" style={{ background: cfg.dotColor }} />
            <span className="pos-legend-label">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Table Grid */}
      {loading ? (
        <div className="pos-table-loading">
          <Spin size="small" />
          <span>Đang tải...</span>
        </div>
      ) : (
        <div className="pos-table-grid">
          {filteredTables.map((table) => {
            const cfg = getStatusConfig(table.status);
            const isSelected = selectedTable?.id === table.id;
            return (
              <button
                key={table.id}
                className={`pos-table-card ${isSelected ? 'pos-table-card--selected' : ''}`}
                style={{
                  '--t-color': cfg.textColor,
                  '--t-bg': cfg.bg,
                  '--t-border': cfg.border,
                  '--t-dot': cfg.dotColor,
                }}
                onClick={() => onSelectTable(table)}
                title={`${table.name} — ${cfg.label}${table.areaName ? ` (${table.areaName})` : ''}`}
              >
                <div className="pos-table-card-name">{table.name}</div>
                {table.areaName && (
                  <div className="pos-table-card-area">{table.areaName}</div>
                )}
                <div
                  className="pos-table-card-badge"
                  style={{ color: cfg.textColor, background: cfg.bg, borderColor: cfg.border }}
                >
                  <span className="pos-table-card-dot" style={{ background: cfg.dotColor }} />
                  {cfg.label}
                </div>
              </button>
            );
          })}

          {filteredTables.length === 0 && (
            <div className="pos-table-empty">
              <span></span>
              <p>{selectedArea === 'all' ? 'Chưa có bàn nào' : 'Không có bàn trong khu vực này'}</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default TablePanel;
