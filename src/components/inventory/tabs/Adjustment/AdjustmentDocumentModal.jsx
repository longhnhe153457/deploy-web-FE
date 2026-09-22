import React, { useState, useEffect, useMemo } from 'react';
import { CloseOutlined, SearchOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import {
  createCostAdjustmentPending,
  createCostAdjustmentCompleted,
  updateCostAdjustmentPending,
  completeCostAdjustmentDocument,
  deleteCostAdjustmentPendingDocument,
  getCostAdjustmentById
} from '../../../../api/documentApi';
import { getBInventories } from '../../../../api/binventoryApi';

const showToast = (text, type = 'success') => {
  const toast = document.createElement('div');
  toast.innerText = text;
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: ${type === 'error' ? '#ef4444' : '#10b981'};
    color: #ffffff;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 700;
    z-index: 99999;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
};

const AdjustmentDocumentModal = ({
  open,
  onClose,
  onSuccess,
  branchId,
  products = [],
  editDocumentId = null
}) => {
  // 1. ALL USESTATE HOOKS
  const [loading, setLoading] = useState(false);
  const [docCode, setDocCode] = useState('');
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [branchInventories, setBranchInventories] = useState([]);

  // 2. ALL USEEFFECT HOOKS
  useEffect(() => {
    if (open && branchId) {
      getBInventories(branchId)
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          setBranchInventories(list);
        })
        .catch((err) => {
          console.error('Lỗi khi tải kho hàng chi nhánh:', err);
        });
    }
  }, [open, branchId]);

  useEffect(() => {
    if (open) {
      if (editDocumentId) {
        setLoading(true);
        getCostAdjustmentById(editDocumentId)
          .then((res) => {
            if (res) {
              setDocCode(res.code || '');
              setNote(res.note || '');
              const mapDetails = (res.details || []).map((d) => {
                const stock = Number(d.currentStockQuantity ?? d.bInventory?.quantity ?? 0);
                const newAvgCost = Number(d.newAvgCost ?? d.snapshotAvgCost ?? d.unitPrice ?? 0);
                let currentCost = Number(d.bInventory?.avg || 0);

                if (d.adjustedCostDelta != null && stock > 0) {
                  currentCost = newAvgCost - (Number(d.adjustedCostDelta) / stock);
                }

                return {
                  id: d.bInventoryId,
                  code: d.productCode || d.snapshotProductCode || d.currentProductCode || `SP${d.bInventoryId}`,
                  name: d.productName || d.snapshotProductName || d.currentProductName || 'Sản phẩm',
                  unitName: d.unitName || d.snapshotUnitName || d.currentUnitName || 'Đơn vị',
                  stock,
                  currentCost: Math.max(0, currentCost),
                  newAvgCost,
                  reason: d.note || ''
                };
              });
              setItems(mapDetails);
            }
          })
          .catch((err) => {
            console.error('Lỗi khi tải chi tiết điều chỉnh giá vốn:', err);
            showToast('Không thể tải chi tiết phiếu điều chỉnh giá vốn', 'error');
          })
          .finally(() => setLoading(false));
      } else {
        setDocCode('');
        setNote('');
        setSearchQuery('');
        setItems([]);
      }
    } else {
      // Dọn dẹp sạch sẽ toàn bộ dữ liệu tạm khi đóng modal
      setDocCode('');
      setNote('');
      setSearchQuery('');
      setItems([]);
      setBranchInventories([]);
      setLoading(false);
    }
  }, [open, editDocumentId]);

  // 3. ALL USEMEMO HOOKS
  const availableProductSuggestions = useMemo(() => {
    const list = [];
    const seen = new Set();

    branchInventories.forEach((inv) => {
      if (!inv) return;
      const bInvId = inv.id || inv.bInventoryId;
      if (!bInvId || seen.has(bInvId)) return;
      seen.add(bInvId);

      const pType = inv.product?.type ?? inv.productType;
      if (pType === 1 || String(pType).toLowerCase() === 'processed') return; // Skip Processed

      list.push({
        bInventoryId: bInvId,
        code: inv.product?.skuCode || inv.productCode || inv.code || `SP${bInvId}`,
        name: inv.product?.name || inv.productName || inv.name || 'Sản phẩm',
        unitName: inv.product?.unitConversions?.find(uc => !uc.baseId)?.unit?.name || inv.unitName || 'Đơn vị',
        stock: Number(inv.quantity ?? 0),
        avgCost: Number(inv.avg ?? 0)
      });
    });

    // Fallback search from props if branchInventories is empty
    if (list.length === 0 && products.length > 0) {
      products.forEach((p) => {
        if (!p) return;
        const bInvId = p.bInventoryId || p.id;
        if (!bInvId || seen.has(bInvId)) return;
        seen.add(bInvId);

        const rawType = p.type ?? p.productType ?? p.product?.type;
        if (rawType === 1 || String(rawType).toLowerCase() === 'processed') return;

        list.push({
          bInventoryId: bInvId,
          code: p.code || p.skuCode || `SP${bInvId}`,
          name: p.name || p.title || 'Sản phẩm',
          unitName: p.unitName || p.unit?.name || 'Đơn vị',
          stock: Number(p.stock ?? p.quantity ?? 0),
          avgCost: Number(p.costPrice ?? p.avgCost ?? p.avg ?? 0)
        });
      });
    }

    return list;
  }, [branchInventories, products]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase().trim();
    return availableProductSuggestions.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [availableProductSuggestions, searchQuery]);

  const totalAdjustmentDelta = useMemo(() => {
    return items.reduce((sum, item) => {
      const delta = (item.newAvgCost - item.currentCost) * item.stock;
      return sum + delta;
    }, 0);
  }, [items]);

  // 4. HELPER HANDLERS
  const handleAddItem = (prod) => {
    if (items.some((i) => i.id === prod.bInventoryId)) {
      showToast(`Sản phẩm '${prod.name}' đã có trong phiếu điều chỉnh.`, 'error');
      return;
    }

    if (prod.stock <= 0) {
      showToast(`Sản phẩm '${prod.name}' có tồn kho bằng 0. Không thể điều chỉnh giá vốn cho sản phẩm không có tồn kho.`, 'error');
    }

    setItems((prev) => [
      ...prev,
      {
        id: prod.bInventoryId,
        code: prod.code,
        name: prod.name,
        unitName: prod.unitName,
        stock: prod.stock,
        currentCost: prod.avgCost,
        newAvgCost: prod.avgCost,
        reason: 'Điều chỉnh giá vốn'
      }
    ]);
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleCostChange = (id, newCost) => {
    const parsed = parseFloat(newCost);
    const val = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, newAvgCost: val } : item))
    );
  };

  const handleSubmit = async (isDraft = false) => {
    if (items.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 mặt hàng để điều chỉnh giá vốn.', 'error');
      return;
    }

    // Validate stock > 0
    const zeroStockItem = items.find((i) => Number(i.stock) <= 0);
    if (zeroStockItem) {
      showToast(`Mặt hàng '${zeroStockItem.name}' có tồn kho = ${zeroStockItem.stock}. Hệ thống chỉ cho phép điều chỉnh giá vốn khi tồn kho > 0.`, 'error');
      return;
    }

    // Validate 0 <= newAvgCost <= 10,000,000,000
    const invalidCostItem = items.find((i) => Number(i.newAvgCost) < 0 || Number(i.newAvgCost) > 10000000000);
    if (invalidCostItem) {
      showToast(`Giá vốn mới của sản phẩm '${invalidCostItem.name}' (${invalidCostItem.newAvgCost}) không hợp lệ. Phải nằm trong khoảng từ 0 đến 10 tỷ VNĐ.`, 'error');
      return;
    }

    setLoading(true);
    try {
      const dto = {
        branchId: Number(branchId),
        code: docCode.trim() || undefined,
        orderDate: new Date().toISOString(),
        note: note || '',
        details: items.map((item) => ({
          bInventoryId: Number(item.id),
          newAvgCost: Number(item.newAvgCost),
          note: item.reason || ''
        }))
      };

      if (editDocumentId) {
        if (isDraft) {
          await updateCostAdjustmentPending(editDocumentId, dto);
          showToast('Cập nhật phiếu điều chỉnh giá vốn nháp thành công!');
        } else {
          await updateCostAdjustmentPending(editDocumentId, dto);
          await completeCostAdjustmentDocument(editDocumentId);
          showToast('Hoàn thành phiếu điều chỉnh giá vốn thành công!');
        }
      } else {
        if (isDraft) {
          await createCostAdjustmentPending(dto);
          showToast('Lưu tạm phiếu điều chỉnh giá vốn thành công!');
        } else {
          await createCostAdjustmentCompleted(dto);
          showToast('Tạo và Hoàn thành phiếu điều chỉnh giá vốn thành công!');
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu phiếu điều chỉnh giá vốn:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.title || err.message || 'Lỗi khi lưu phiếu.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPending = async () => {
    if (!editDocumentId) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy phiếu điều chỉnh giá vốn nháp này?')) return;
    setLoading(true);
    try {
      await deleteCostAdjustmentPendingDocument(editDocumentId, 'Hủy phiếu nháp từ giao diện');
      showToast('Đã chuyển phiếu điều chỉnh giá vốn sang trạng thái Canceled!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Không thể hủy phiếu nháp', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 5. CONDITIONAL EARLY RETURN MUST BE AFTER ALL HOOKS
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          background: '#ffffff',
          borderRadius: 10,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh'
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff'
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {editDocumentId ? `Cập nhật phiếu điều chỉnh giá vốn: ${docCode}` : 'Tạo phiếu điều chỉnh giá vốn mới'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Nhập giá vốn trung bình mới cho từng mặt hàng để hệ thống tính chênh lệch tổng giá trị tài sản kho.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', fontSize: 14 }}
          >
            <CloseOutlined />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={(e) => { e.preventDefault(); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
            {/* FORM META FIELDS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Mã phiếu điều chỉnh
                </label>
                <input
                  type="text"
                  value={docCode}
                  onChange={(e) => setDocCode(e.target.value)}
                  placeholder="Mã tự động (DC...)"
                  style={{
                    width: '100%',
                    height: 34,
                    padding: '0 10px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    background: '#f8fafc',
                    fontWeight: 600
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Ghi chú chứng từ
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập lý do điều chỉnh giá vốn..."
                  style={{
                    width: '100%',
                    height: 34,
                    padding: '0 10px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* PRODUCT SEARCH & SELECTION */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Chọn mặt hàng cần điều chỉnh giá vốn
              </label>
              <div style={{ position: 'relative' }}>
                <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập tên hoặc mã sản phẩm để tìm kiếm..."
                  style={{
                    width: '100%',
                    height: 34,
                    paddingLeft: 30,
                    paddingRight: 10,
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>

              {/* SEARCH DROPDOWN SUGGESTIONS */}
              {searchQuery && (
                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    background: '#ffffff',
                    maxHeight: 160,
                    overflowY: 'auto',
                    marginTop: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    zIndex: 10
                  }}
                >
                  {filteredProducts.length === 0 ? (
                    <div style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                      Không tìm thấy sản phẩm phù hợp
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isZeroStock = p.stock <= 0;
                      return (
                        <div
                          key={p.bInventoryId}
                          onClick={() => {
                            handleAddItem(p);
                            setSearchQuery('');
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid #f1f5f9',
                            background: isZeroStock ? '#fef2f2' : '#ffffff'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{p.name}</span>
                            <span style={{ marginLeft: 6, fontSize: 11, color: '#64748b' }}>({p.code})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
                            <span style={{ color: isZeroStock ? '#ef4444' : '#2563eb', fontWeight: 600 }}>
                              Tồn: {p.stock} {p.unitName} {isZeroStock && '(Cấm điều chỉnh)'}
                            </span>
                            <span style={{ color: '#475569' }}>
                              Giá hiện tại: <strong>{Math.round(p.avgCost).toLocaleString('vi-VN')} đ</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* ADJUSTMENT ITEMS TABLE */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', fontSize: 10 }}>
                    <th style={{ padding: '8px 10px' }}>Mã SP</th>
                    <th style={{ padding: '8px 10px' }}>Tên mặt hàng</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tồn hiện tại</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Giá hiện tại (đ)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 140 }}>Giá mới (đ)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Chênh lệch đ/vị</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tổng thay đổi (đ)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 12 }}>
                        Vui lòng tìm kiếm và chọn ít nhất 1 sản phẩm phía trên để điều chỉnh giá vốn
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const isZeroStock = Number(item.stock) <= 0;
                      const unitDelta = Number(item.newAvgCost) - Number(item.currentCost);
                      const totalDelta = unitDelta * Number(item.stock);

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: isZeroStock ? '#fff5f5' : 'transparent' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2563eb' }}>{item.code}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>
                            {item.name}
                            {isZeroStock && (
                              <div style={{ color: '#ef4444', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                <WarningOutlined /> Tồn kho = 0 (Bị cấm chốt)
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{item.unitName}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: isZeroStock ? '#ef4444' : '#334155' }}>
                            {Number(item.stock).toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>
                            {Math.round(item.currentCost).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min={0}
                              value={item.newAvgCost}
                              onChange={(e) => handleCostChange(item.id, e.target.value)}
                              style={{
                                width: 120,
                                height: 28,
                                padding: '0 8px',
                                fontSize: 12,
                                fontWeight: 700,
                                textAlign: 'right',
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                                outline: 'none',
                                background: '#ffffff',
                                color: '#0f172a'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: unitDelta > 0 ? '#059669' : (unitDelta < 0 ? '#dc2626' : '#64748b') }}>
                            {unitDelta > 0 ? `+${Math.round(unitDelta).toLocaleString('vi-VN')}` : Math.round(unitDelta).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: totalDelta > 0 ? '#059669' : (totalDelta < 0 ? '#dc2626' : '#64748b') }}>
                            {totalDelta > 0 ? `+${Math.round(totalDelta).toLocaleString('vi-VN')}` : Math.round(totalDelta).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}
                            >
                              <DeleteOutlined />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* SUMMARY STATS BAR */}
            {items.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  fontSize: 12
                }}
              >
                <div style={{ color: '#475569', fontWeight: 600 }}>
                  Tổng số mặt hàng: <strong style={{ color: '#0f172a' }}>{items.length}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Tổng giá trị thay đổi tài sản kho:</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: totalAdjustmentDelta > 0 ? '#059669' : (totalAdjustmentDelta < 0 ? '#dc2626' : '#64748b') }}>
                    {totalAdjustmentDelta > 0 ? `+${Math.round(totalAdjustmentDelta).toLocaleString('vi-VN')}` : Math.round(totalAdjustmentDelta).toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              background: '#f8fafc'
            }}
          >
            {editDocumentId && (
              <button
                type="button"
                disabled={loading}
                onClick={handleCancelPending}
                style={{
                  height: 32,
                  padding: '0 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: '1px solid #dc2626',
                  background: '#ffffff',
                  color: '#dc2626',
                  cursor: 'pointer'
                }}
              >
                Hủy phiếu nháp
              </button>
            )}
            <button
              type="button"
              disabled={loading || items.length === 0}
              onClick={() => handleSubmit(true)}
              style={{
                height: 32,
                padding: '0 14px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid #e8442a',
                background: '#ffffff',
                color: '#e8442a',
                cursor: loading || items.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Lưu tạm
            </button>
            <button
              type="button"
              disabled={loading || items.length === 0}
              onClick={() => handleSubmit(false)}
              style={{
                height: 32,
                padding: '0 18px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 6,
                border: 'none',
                background: loading || items.length === 0 ? '#cbd5e1' : '#e8442a',
                color: '#ffffff',
                cursor: loading || items.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              HOÀN THÀNH
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustmentDocumentModal;
