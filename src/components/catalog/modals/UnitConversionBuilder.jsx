import React from 'react';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';

const UnitConversionBuilder = ({
  unitConversions = [],
  setUnitConversions,
  units = [],
  onOpenAddUnit,
  notifyError,
}) => {
  // Ensure unitConversions is always an array
  const conversionsList = Array.isArray(unitConversions) ? unitConversions : [];

  // Find current base unit in unitConversions list
  const baseConversion = conversionsList.find(u => u.isBase);
  const baseUnitId = baseConversion ? Number(baseConversion.unitId) : null;
  const baseUnitObj = units.find(u => u.id === baseUnitId);
  const baseUnitName = baseUnitObj ? baseUnitObj.name : '—';

  // Selected unit IDs array
  const selectedUnitIds = conversionsList.map(u => Number(u.unitId));

  // Helper to safely invoke setUnitConversions
  const updateConversions = (newArray) => {
    if (typeof setUnitConversions === 'function') {
      setUnitConversions(newArray);
    }
  };

  // Toggle unit pill selection
  const handleToggleUnitPill = (unitId) => {
    const isSelected = selectedUnitIds.includes(unitId);

    if (isSelected) {
      // Remove unit
      const updated = conversionsList.filter(u => Number(u.unitId) !== unitId);
      if (updated.length > 0 && !updated.some(u => u.isBase)) {
        // If base unit was removed, make the first remaining unit the new base
        updated[0] = { ...updated[0], isBase: true, conversionPoint: 1 };
      }
      updateConversions(updated);
    } else {
      // Add unit
      const isFirst = conversionsList.length === 0;
      updateConversions([
        ...conversionsList,
        {
          unitId: unitId,
          conversionPoint: isFirst ? 1 : 10,
          isBase: isFirst,
        }
      ]);
    }
  };

  // Change Base Unit from Dropdown
  const handleSelectBaseUnit = (newBaseUnitId) => {
    const updated = conversionsList.map(u => {
      const isCurrentBase = Number(u.unitId) === newBaseUnitId;
      return {
        ...u,
        isBase: isCurrentBase,
        conversionPoint: isCurrentBase ? 1 : (u.conversionPoint === 1 ? 10 : u.conversionPoint),
      };
    });
    updateConversions(updated);
  };

  // Change Conversion Point for a non-base unit
  const handleConversionPointChange = (unitId, val) => {
    const numericVal = Number(val) || 1;
    const updated = conversionsList.map(u => {
      if (Number(u.unitId) === unitId) {
        return { ...u, conversionPoint: numericVal };
      }
      return u;
    });
    updateConversions(updated);
  };

  // Remove unit conversion item from table
  const handleRemoveUnit = (unitId) => {
    handleToggleUnitPill(unitId);
  };

  // Non-base conversions to show in table
  const nonBaseConversions = conversionsList.filter(u => !u.isBase);

  return (
    <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
      {/* SECTION HEADER */}
      <div style={{ marginBottom: 14 }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          QUY ĐỔI ĐƠN VỊ CHO HÀNG HOÁ NÀY
        </h4>
      </div>

      {/* 1. UNIT PILLS SELECTOR */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
          Chọn các đơn vị bạn muốn sử dụng cho sản phẩm này:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {units.map((u) => {
            const isSelected = selectedUnitIds.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => handleToggleUnitPill(u.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  background: isSelected ? '#2563eb' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {u.name}
              </button>
            );
          })}
          {onOpenAddUnit && (
            <button
              type="button"
              onClick={onOpenAddUnit}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                border: '1px dashed #2563eb',
                background: '#eff6ff',
                color: '#2563eb',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <PlusOutlined /> Tạo mới
            </button>
          )}
        </div>
      </div>

      {/* 2. BASE UNIT DROPDOWN */}
      {selectedUnitIds.length > 0 && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
            Đơn vị cơ bản <InfoCircleOutlined style={{ fontSize: 13, color: '#94a3b8' }} />
          </span>
          <select
            value={baseUnitId || ''}
            onChange={e => handleSelectBaseUnit(Number(e.target.value))}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              color: '#1e293b',
              cursor: 'pointer',
            }}
          >
            {conversionsList.map(uc => {
              const uObj = units.find(u => u.id === Number(uc.unitId));
              return (
                <option key={uc.unitId} value={uc.unitId}>
                  {uObj ? uObj.name : `Đơn vị #${uc.unitId}`}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* 3. NON-BASE CONVERSIONS TABLE */}
      {selectedUnitIds.length === 0 ? (
        <div
          style={{
            padding: '20px 16px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: 13,
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px dashed #cbd5e1',
          }}
        >
          Chưa chọn đơn vị tính nào. Vui lòng bấm vào các nút đơn vị ở phía trên để chọn.
        </div>
      ) : nonBaseConversions.length === 0 ? (
        <div
          style={{
            padding: '12px 16px',
            color: '#475569',
            fontSize: 12,
            background: '#f0fdf4',
            borderRadius: 8,
            border: '1px solid #bbf7d0',
          }}
        >
          Hiện tại chỉ có 1 đơn vị cơ bản là <strong>{baseUnitName}</strong>. Chọn thêm các đơn vị khác ở trên để thiết lập quy đổi.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '8px 12px', width: 50, textAlign: 'center' }}>STT</th>
                <th style={{ padding: '8px 12px' }}>Đơn vị được chọn</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Giá trị quy đổi</th>
                <th style={{ padding: '8px 12px', width: 60, textAlign: 'center' }}>Xóa</th>
              </tr>
            </thead>
            <tbody>
              {nonBaseConversions.map((uc, idx) => {
                const uObj = units.find(u => u.id === Number(uc.unitId));
                const unitName = uObj ? uObj.name : `Đơn vị #${uc.unitId}`;

                return (
                  <tr key={uc.unitId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* 1. STT */}
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                      {idx + 1}
                    </td>

                    {/* 2. ĐƠN VỊ ĐƯỢC CHỌN */}
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                      {unitName}
                    </td>

                    {/* 3. GIÁ TRỊ QUY ĐỔI (1 [UnitName] = [Input] [BaseUnitName]) */}
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>1 {unitName} =</span>
                        <input
                          type="number"
                          step="1"
                          min="2"
                          max="1000000"
                          value={uc.conversionPoint}
                          onChange={e => handleConversionPointChange(Number(uc.unitId), e.target.value)}
                          style={{
                            width: 80,
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            fontSize: 13,
                            textAlign: 'center',
                            fontWeight: 600,
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                          {baseUnitName}
                        </span>
                      </div>
                    </td>

                    {/* 4. THÙNG RÁC ICON */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveUnit(Number(uc.unitId))}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: 15,
                        }}
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
    </div>
  );
};

export default UnitConversionBuilder;
