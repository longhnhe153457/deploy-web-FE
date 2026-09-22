import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  SearchOutlined,
  DeleteOutlined,
  CloseOutlined,
  FullscreenOutlined,
  PrinterOutlined,
  RightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { getProductsByDate, getPreviousLedgerSnapshots } from '../../../../api/binventoryApi';
import { getAllBranches } from '../../../../api/branchApi';
import {
  createTransferPending,
  createTransferCompleted,
  updateTransferPending,
  completeTransferDocument,
  deleteTransferPendingDocument,
  getTransferById
} from '../../../../api/documentApi';
import { extractErrorMessage } from '../../utils/errorHelper';
import { removeVietnameseTones } from '../../../../utils/stringHelper';
import KiotDateTimePicker from '../Import/KiotDateTimePicker';
import { useAuth } from '../../../../context/AuthContext';

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
  setTimeout(() => toast.remove(), 2200);
};

const TransferDocumentModal = ({
  open,
  onClose,
  onSuccess,
  branchId,
  products = [],
  editDocumentId = null
}) => {
  const auth = useAuth ? useAuth() : {};
  const user = auth?.user;
  const creatorName = user?.name || user?.email || 'Mno';

  const [loading, setLoading] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(dayjs());
  const [openTimeFormatted, setOpenTimeFormatted] = useState('');
  const [openTimeISO, setOpenTimeISO] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [branches, setBranches] = useState([]);
  const [targetBranchId, setTargetBranchId] = useState('');

  const [bInventoryList, setBInventoryList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  const [formData, setFormData] = useState({
    docCode: '',
    note: ''
  });
  const [items, setItems] = useState([]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut F1/F3 to focus search, ESC to close dropdown
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;
      if (e.key === 'F1' || e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowDropdown(true);
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Fetch branches excluding current branch and inactive branches
  useEffect(() => {
    if (open) {
      getAllBranches()
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          setBranches(list);
          const validOtherBranches = list.filter(
            (b) => Number(b.id) !== Number(branchId) && !b.isDeleted && b.status !== 'Ngừng kinh doanh'
          );
          if (validOtherBranches.length > 0) {
            setTargetBranchId(validOtherBranches[0].id);
          } else {
            setTargetBranchId('');
          }
        })
        .catch((err) => {
          console.error('Failed to load branches:', err);
          setBranches([]);
        });
    }
  }, [open, branchId]);

  // Fetch products by date & searchQuery as user types (EXCLUDING Processed - Mode 2)
  const fetchBInventories = useCallback((bId, date, query = '') => {
    if (!bId) return;
    getProductsByDate(bId, date, query, null, 2)
      .then((res) => {
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (data.length > 0 || !query) {
          setBInventoryList((prev) => {
            if (!query) return data;
            const prevMap = new Map(prev.map((item) => [item.id ?? item.bInventoryId, item]));
            data.forEach((item) => {
              prevMap.set(item.id ?? item.bInventoryId, item);
            });
            return Array.from(prevMap.values());
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load BInventories:', err);
      });
  }, []);

  useEffect(() => {
    if (open) {
      if (editDocumentId) {
        setLoading(true);
        getTransferById(editDocumentId)
          .then((res) => {
            if (res) {
              const dt = res.businessDate ? dayjs(res.businessDate) : dayjs();
              setSelectedDateTime(dt);
              setOpenTimeFormatted(dt.format('DD/MM/YYYY HH:mm'));
              setOpenTimeISO(dt.toISOString());
              setTargetBranchId(res.toBranchId || res.targetBranchId || '');
              setFormData({
                docCode: res.code || '',
                note: res.note || ''
              });
              const mapDetails = (res.details || []).map((d) => {
                const bInvId = Number(d.bInventoryId || d.fromBInventoryId);
                const matchP = (bInventoryList || []).find((b) => Number(b.id) === bInvId) ||
                               (products || []).find((p) => Number(p.id) === bInvId || Number(p.bInventoryId) === bInvId);

                const conversions = matchP?.unitConversions || d.unitConversions || d.conversions || [];
                const selectedUc = d.unitConversionId ? conversions.find((c) => Number(c.id) === Number(d.unitConversionId)) : (conversions.length > 0 ? conversions[0] : null);
                const conversionPoint = selectedUc?.conversionPoint > 0 ? selectedUc.conversionPoint : (d.conversionRate > 0 ? d.conversionRate : 1);
                const baseStock = d.currentStockQuantity ?? d.systemQuantity ?? d.currentStock ?? matchP?.stock ?? matchP?.quantity ?? 0;
                const baseAvgCost = d.snapshotAvgCost || d.unitPrice || matchP?.runningAverageCost || matchP?.avg || 0;

                return {
                  id: d.id ? Number(d.id) : null,
                  rowId: `${bInvId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  bInventoryId: bInvId,
                  code: d.snapshotProductCode || d.currentProductCode || d.code || matchP?.code || `SP${bInvId}`,
                  name: d.snapshotProductName || d.currentProductName || d.productName || matchP?.name || 'Sản phẩm',
                  baseStock: baseStock,
                  baseAvgCost: baseAvgCost,
                  stock: baseStock / conversionPoint,
                  costPrice: baseAvgCost,
                  baseUnitName: d.currentBaseUnitName || matchP?.baseUnitName || 'Đơn vị',
                  unitConversionId: selectedUc ? Number(selectedUc.id) : (d.unitConversionId ? Number(d.unitConversionId) : null),
                  unitName: selectedUc ? (selectedUc.unitName || selectedUc.name) : (d.currentUnitName || d.unitName || matchP?.unitName || 'Đơn vị'),
                  unitConversions: conversions,
                  conversionPoint: conversionPoint,
                  transferQuantity: d.quantity || 1,
                  transferPrice: d.unitPrice || (conversionPoint * baseAvgCost),
                  note: d.note || ''
                };
              });
              setItems(mapDetails);
            }
          })
          .catch((err) => {
            console.error('Lỗi khi tải chi tiết chuyển kho:', err);
            showToast('Không thể tải chi tiết phiếu chuyển kho', 'error');
          })
          .finally(() => setLoading(false));
      } else {
        const now = dayjs();
        setSelectedDateTime(now);
        setOpenTimeFormatted(now.format('DD/MM/YYYY HH:mm'));
        setOpenTimeISO(now.toISOString());
        setShowDatePicker(false);
        setSearchQuery('');
        setShowDropdown(false);

        setFormData({
          docCode: '',
          note: ''
        });
        setItems([]);

        if (branchId) {
          fetchBInventories(branchId, now.toISOString(), '');
        }
      }
    } else {
      setItems([]);
      setFormData({ docCode: '', note: '' });
      setSearchQuery('');
      setShowDropdown(false);
      setLoading(false);
    }
  }, [open, editDocumentId, branchId, fetchBInventories]);

  // Trigger search on user typing
  useEffect(() => {
    if (!open || !branchId) return;
    const timer = setTimeout(() => {
      fetchBInventories(branchId, openTimeISO || new Date().toISOString(), searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, open, branchId, openTimeISO, fetchBInventories]);

  const handleDateChange = async (newDate) => {
    setSelectedDateTime(newDate);
    const formattedStr = newDate.format('DD/MM/YYYY HH:mm');
    const isoStr = newDate.toISOString();
    setOpenTimeFormatted(formattedStr);
    setOpenTimeISO(isoStr);

    if (branchId) {
      fetchBInventories(branchId, isoStr, searchQuery);
    }
  };

  const searchOptions = useMemo(() => {
    const rawList = bInventoryList.length > 0 ? bInventoryList : products;
    return rawList
      .filter((b) => {
        if (!b || (b.id == null && b.bInventoryId == null && b.productId == null)) return false;
        const pType = b.product?.type ?? b.type ?? b.productType;
        const typeStr = String(pType ?? '').toLowerCase();
        if (typeStr === 'processed' || pType === 1) return false;
        return true;
      })
      .map((b) => {
        const conversions = b.unitConversions || b.product?.unitConversions || [];
        const baseUnitName = b.baseUnit?.unitName || b.product?.baseUnit?.unitName || conversions[0]?.unitName || 'Đơn vị';
        const stockVal = b.runningQuantity ?? b.quantity ?? b.stockQuantity ?? 0;
        const avgVal = b.runningAverageCost ?? b.purchasePrice ?? b.avg ?? b.sellPrice ?? 0;
        return {
          id: b.id ?? b.bInventoryId ?? b.productId,
          code: b.code || b.skuCode || b.product?.skuCode || `SP${b.id ?? b.productId}`,
          name: b.name || b.product?.name || 'Sản phẩm',
          baseStock: stockVal,
          baseAvgCost: avgVal,
          stock: stockVal,
          costPrice: avgVal,
          baseUnitName: baseUnitName,
          unitName: baseUnitName,
          unitConversions: conversions
        };
      });
  }, [bInventoryList, products]);

  // Exclude items already in table
  const filteredOptions = useMemo(() => {
    const existingIds = new Set(items.map((i) => Number(i.bInventoryId)));
    const unselected = searchOptions.filter((opt) => !existingIds.has(Number(opt.id)));

    if (!searchQuery.trim()) return unselected;
    const qRaw = searchQuery.toLowerCase().trim();
    const qNorm = removeVietnameseTones(searchQuery).trim();
    return unselected.filter((opt) => {
      const nameRaw = (opt.name || '').toLowerCase();
      const nameNorm = removeVietnameseTones(opt.name);
      const codeRaw = (opt.code || '').toLowerCase();
      return (
        nameRaw.includes(qRaw) ||
        nameNorm.includes(qNorm) ||
        codeRaw.includes(qRaw)
      );
    });
  }, [searchOptions, searchQuery, items]);

  const handleSelectProduct = (opt) => {
    const existingIndex = items.findIndex((i) => Number(i.bInventoryId) === Number(opt.id));
    if (existingIndex >= 0) {
      showToast(`${opt.name} đã có trong danh sách chuyển hàng.`, 'warning');
      setShowDropdown(false);
      setSearchQuery('');
      return;
    }

    const conversions = opt.unitConversions || [];
    const defaultUc = conversions.length > 0 ? conversions[0] : null;
    const conversionPoint = defaultUc?.conversionPoint > 0 ? defaultUc.conversionPoint : 1;
    const defaultPrice = conversionPoint * (opt.baseAvgCost || 0);

    setItems((prev) => [
      ...prev,
      {
        rowId: `${opt.id}-${Date.now()}`,
        bInventoryId: opt.id,
        code: opt.code,
        name: opt.name,
        baseStock: opt.baseStock,
        baseAvgCost: opt.baseAvgCost,
        baseUnitName: opt.baseUnitName,
        unitConversionId: defaultUc ? defaultUc.id : null,
        unitName: defaultUc ? defaultUc.unitName : opt.unitName,
        unitConversions: conversions,
        conversionPoint: conversionPoint,
        transferQuantity: 1,
        transferPrice: defaultPrice
      }
    ]);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleUnitChange = (index, ucId) => {
    const updated = [...items];
    const item = updated[index];
    const conversions = item.unitConversions || [];
    const selectedUc = conversions.find((c) => Number(c.id) === Number(ucId));
    const conversionPoint = selectedUc?.conversionPoint > 0 ? selectedUc.conversionPoint : 1;
    const unitName = selectedUc ? selectedUc.unitName : item.baseUnitName || item.unitName;
    const defaultPrice = conversionPoint * (item.baseAvgCost || 0);

    updated[index] = {
      ...item,
      unitConversionId: selectedUc ? Number(selectedUc.id) : null,
      unitName: unitName,
      conversionPoint: conversionPoint,
      transferPrice: defaultPrice
    };
    setItems(updated);
  };

  const handleQtyChange = (index, val) => {
    const qty = val !== '' && val != null ? Math.max(0.001, Number(val) || 1) : 1;
    const updated = [...items];
    updated[index] = { ...updated[index], transferQuantity: qty };
    setItems(updated);
  };

  const totalTransferQty = useMemo(() => {
    return items.reduce((sum, i) => sum + (Number(i.transferQuantity) || 0), 0);
  }, [items]);

  const otherBranches = useMemo(() => {
    return branches.filter(
      (b) => Number(b.id) !== Number(branchId) && !b.isDeleted && b.status !== 'Ngừng kinh doanh'
    );
  }, [branches, branchId]);

  const currentBranch = useMemo(() => {
    return branches.find((b) => Number(b.id) === Number(branchId));
  }, [branches, branchId]);

  const isSenderInactive = currentBranch ? (currentBranch.isDeleted || currentBranch.status === 'Ngừng kinh doanh') : false;

  const handleSubmit = async (isDraft = false) => {
    if (isSenderInactive) {
      showToast('Chi nhánh gửi hiện tại đã ngừng kinh doanh, không thể tạo hoặc chuyển hàng.', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm để chuyển hàng.', 'error');
      return;
    }
    if (!targetBranchId) {
      showToast('Vui lòng chọn chi nhánh nhận hợp lệ.', 'error');
      return;
    }
    const targetBranch = branches.find((b) => Number(b.id) === Number(targetBranchId));
    if (!targetBranch || targetBranch.isDeleted || targetBranch.status === 'Ngừng kinh doanh') {
      showToast('Chi nhánh nhận đã ngừng kinh doanh. Không thể chuyển hàng tới chi nhánh này.', 'error');
      return;
    }

    for (const item of items) {
      const q = Number(item.transferQuantity || 0);
      const p = Number(item.transferPrice || 0);
      if (q < 0.001 || q > 10000000000) {
        showToast(`Số lượng chuyển mặt hàng '${item.name}' (${q}) không hợp lệ. Phải từ 0.001 đến 10 tỷ.`, 'error');
        return;
      }
      if (p < 0 || p > 10000000000) {
        showToast(`Đơn giá chuyển mặt hàng '${item.name}' (${p}) không hợp lệ. Phải từ 0 đến 10 tỷ VNĐ.`, 'error');
        return;
      }
    }

    setLoading(true);
    try {
      if (editDocumentId) {
        // Edit mode: TransferDocumentUpdateDto
        const updateDto = {
          toBranchId: Number(targetBranchId),
          orderDate: openTimeISO || selectedDateTime.toISOString(),
          note: formData.note || '',
          details: items.map((i) => ({
            id: i.id ? Number(i.id) : null,
            bInventoryId: Number(i.bInventoryId),
            unitConversionId: i.unitConversionId ? Number(i.unitConversionId) : null,
            quantity: Number(i.transferQuantity) || 1,
            unitPrice: Number(i.transferPrice) || 0,
            note: i.note || ''
          }))
        };

        if (isDraft) {
          await updateTransferPending(editDocumentId, updateDto);
          showToast('Cập nhật phiếu chuyển kho nháp thành công!');
        } else {
          await updateTransferPending(editDocumentId, updateDto);
          await completeTransferDocument(editDocumentId);
          showToast('Cập nhật và Hoàn thành phiếu chuyển kho thành công!');
        }
      } else {
        // Create mode: TransferDocumentCreateDto
        const createDto = {
          branchId: Number(branchId),
      code: formData.docCode ? formData.docCode.trim() : undefined,
          toBranchId: Number(targetBranchId),
          orderDate: openTimeISO || selectedDateTime.toISOString(),
          note: formData.note || '',
          details: items.map((i) => ({
            bInventoryId: Number(i.bInventoryId),
            unitConversionId: i.unitConversionId ? Number(i.unitConversionId) : null,
            quantity: Number(i.transferQuantity) || 1,
            unitPrice: Number(i.transferPrice) || 0,
            note: i.note || ''
          }))
        };

        if (isDraft) {
          await createTransferPending(createDto);
          showToast('Lưu tạm phiếu chuyển kho thành công!');
        } else {
          await createTransferCompleted(createDto);
          showToast('Tạo và Hoàn thành phiếu chuyển kho thành công!');
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      const errMsg = extractErrorMessage(err, 'Lỗi khi lưu phiếu chuyển kho.');
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPending = async () => {
    if (!editDocumentId) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy phiếu chuyển kho nháp này?')) return;
    setLoading(true);
    try {
      await deleteTransferPendingDocument(editDocumentId, 'Hủy phiếu nháp từ giao diện');
      showToast('Đã chuyển phiếu chuyển kho sang trạng thái Canceled!');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      showToast(extractErrorMessage(err, 'Không thể hủy phiếu nháp.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12
      }}
    >
      {/* HEADER BAR - ORANGE GRADIENT */}
      <div
        style={{
          height: 48,
          background: 'linear-gradient(135deg, #e8442a 0%, #d9381e 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxShadow: '0 2px 8px rgba(232, 68, 42, 0.25)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#ffffff', letterSpacing: '0.3px' }}>
            {editDocumentId ? `Chỉnh sửa phiếu chuyển hàng (${formData.docCode || ''})` : 'Tạo phiếu chuyển hàng'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <button
            type="button"
            title="Toàn màn hình"
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              borderRadius: 6,
              padding: '5px 8px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FullscreenOutlined />
          </button>
          <button
            type="button"
            title="In phiếu"
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              borderRadius: 6,
              padding: '5px 8px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <PrinterOutlined />
          </button>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              border: 'none',
              borderRadius: 6,
              padding: '5px 8px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 15,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <CloseOutlined />
          </button>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT AREA: SEARCH & ITEMS TABLE */}
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* SEARCH INPUT WITH DROPDOWN */}
          <div ref={searchContainerRef} style={{ marginBottom: 10, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <SearchOutlined style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                placeholder="Tìm sản phẩm theo mã hoặc tên (F1)..."
                style={{
                  width: '100%',
                  height: 36,
                  paddingLeft: 34,
                  paddingRight: searchQuery ? 30 : 12,
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  background: '#ffffff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
              {searchQuery && (
                <CloseOutlined
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  title="Xóa tìm kiếm"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    fontSize: 11,
                    cursor: 'pointer'
                  }}
                />
              )}
            </div>

            {/* LIVE SEARCH DROPDOWN */}
            {showDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  background: '#ffffff',
                  maxHeight: 240,
                  overflowY: 'auto',
                  marginTop: 4,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 100
                }}
              >
                {filteredOptions.length === 0 ? (
                  <div style={{ padding: 12, color: '#94a3b8', textAlign: 'center', fontSize: 12 }}>
                    {searchQuery.trim() ? 'Không tìm thấy hàng hóa' : 'Tất cả hàng hóa hợp lệ đã được thêm vào danh sách'}
                  </div>
                ) : (
                  filteredOptions.map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectProduct(opt)}
                      style={{
                        padding: '9px 14px',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fff7ed')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{opt.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {opt.code} {opt.unitName ? `(${opt.unitName})` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>
                          Tồn: {Number(opt.stock ?? opt.baseStock ?? 0).toLocaleString('vi-VN')} {opt.unitName}
                        </div>
                        <div style={{ fontSize: 11, color: '#e8442a', fontWeight: 600 }}>
                          Giá vốn: {Number(opt.costPrice ?? opt.baseAvgCost ?? 0).toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 8px', width: 30, textAlign: 'center' }}></th>
                  <th style={{ padding: '8px 8px', width: 35, textAlign: 'center' }}>STT</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', width: 110 }}>MÃ HÀNG</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left' }}>TÊN HÀNG</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center', width: 110 }}>ĐƠN VỊ TÍNH</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', width: 90 }}>TỒN KHO</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center', width: 110 }}>SL CHUYỂN</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', width: 130 }}>GIÁ CHUYỂN (Đ/ĐVT)</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', width: 120 }}>THÀNH TIỀN</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      Chưa có sản phẩm nào được chọn. Hãy tìm kiếm để thêm sản phẩm chuyển kho.
                    </td>
                  </tr>
                ) : (
                  items.map((record, index) => {
                    const conversionPoint = record.conversionPoint || 1;
                    const convertedStock = (record.baseStock ?? record.stock ?? 0) / conversionPoint;
                    const total = (Number(record.transferQuantity) || 0) * (Number(record.transferPrice) || 0);

                    return (
                      <tr key={record.rowId || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...items];
                              updated.splice(index, 1);
                              setItems(updated);
                            }}
                            title="Xóa dòng"
                            style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                          >
                            <DeleteOutlined style={{ fontSize: 14 }} />
                          </button>
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                        <td style={{ fontWeight: 600, color: '#334155', padding: '6px 8px' }}>{record.code}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{record.name}</span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                          {record.unitConversions && record.unitConversions.length > 0 ? (
                            <select
                              value={record.unitConversionId || ''}
                              onChange={(e) => handleUnitChange(index, e.target.value)}
                              style={{
                                fontSize: 11,
                                padding: '2px 6px',
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                                outline: 'none',
                                background: '#fff'
                              }}
                            >
                              {record.unitConversions.map((uc) => (
                                <option key={uc.id} value={uc.id}>
                                  {uc.unitName || uc.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ fontSize: 11, color: '#334155' }}>{record.unitName || 'Đơn vị'}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b' }}>
                          {convertedStock.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 10px' }}>
                          <input
                            type="number"
                            min={0.001}
                            step="any"
                            value={record.transferQuantity ?? 1}
                            onChange={(e) => handleQtyChange(index, e.target.value)}
                            style={{
                              width: 75,
                              textAlign: 'center',
                              borderRadius: 16,
                              border: '1px solid #cbd5e1',
                              padding: '3px 6px',
                              fontSize: 11,
                              outline: 'none'
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 10px' }}>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={record.transferPrice ?? 0}
                            onChange={(e) => {
                              const val = e.target.value !== '' ? Math.max(0, Number(e.target.value)) : 0;
                              const updated = [...items];
                              updated[index] = { ...updated[index], transferPrice: val };
                              setItems(updated);
                            }}
                            style={{
                              width: 100,
                              textAlign: 'right',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              padding: '3px 6px',
                              fontSize: 11,
                              outline: 'none'
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 600, color: '#0f172a' }}>
                          {total.toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: SUMMARY SIDEBAR */}
        <div
          style={{
            width: 340,
            background: '#ffffff',
            borderLeft: '1px solid #cbd5e1',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 100
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            {/* KIOTVIET TIME & CREATOR HEADER */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#334155',
                fontSize: 11
              }}
            >
              <div
                onClick={() => setShowDatePicker(!showDatePicker)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: 4,
                  background: showDatePicker ? '#f1f5f9' : 'transparent',
                  transition: 'background 0.15s ease'
                }}
              >
                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                  {creatorName} {openTimeFormatted || dayjs().format('DD/MM/YYYY HH:mm')}
                </span>
                <RightOutlined style={{ fontSize: 10, color: '#64748b' }} />
              </div>

              <span
                style={{
                  background: '#fff7ed',
                  color: '#ea580c',
                  border: '1px solid #ffedd5',
                  borderRadius: 12,
                  padding: '1px 8px',
                  fontSize: 10,
                  fontWeight: 600
                }}
              >
                Phiếu tạm
              </span>

              {/* DATE-TIME PICKER POPOVER */}
              {showDatePicker && (
                <KiotDateTimePicker
                  value={selectedDateTime}
                  onChange={handleDateChange}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>

            <div>
              <div style={{ marginBottom: 4, color: '#64748b', fontSize: 11 }}>Mã phiếu chuyển</div>
              <input
                type="text"
                value={formData.docCode}
                onChange={(e) => setFormData({ ...formData, docCode: e.target.value })}
                placeholder="Mã phiếu tự động"
                style={{
                  width: '100%',
                  borderRadius: 6,
                  padding: '6px 10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: 11
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <span style={{ color: '#475569', fontSize: 11, fontWeight: 600 }}>Tổng số lượng chuyển:</span>
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                {totalTransferQty.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0f9ff', padding: 10, borderRadius: 6, border: '1px solid #bae6fd' }}>
              <span style={{ color: '#0369a1', fontSize: 11.5, fontWeight: 700 }}>Tổng giá trị chuyển:</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#0284c7' }}>
                {Math.round(items.reduce((sum, i) => sum + (Number(i.transferQuantity) || 0) * (Number(i.transferPrice) || 0), 0)).toLocaleString('vi-VN')} đ
              </span>
            </div>

            {isSenderInactive && (
              <div style={{ padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: 6, color: '#b91c1c', fontSize: 11, fontWeight: 600, lineHeight: 1.4 }}>
                Chi nhánh hiện tại đã ngừng kinh doanh. Không thể tạo hoặc chuyển hàng.
              </div>
            )}

            {!isSenderInactive && otherBranches.length === 0 && (
              <div style={{ padding: '8px 10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 6, color: '#b45309', fontSize: 11, fontWeight: 600, lineHeight: 1.4 }}>
                Hiện không có chi nhánh nào khác đang hoạt động để nhận hàng.
              </div>
            )}

            <div>
              <div style={{ marginBottom: 4, color: '#64748b', fontSize: 11 }}>Tới chi nhánh</div>
              <select
                value={targetBranchId}
                disabled={isSenderInactive || otherBranches.length === 0}
                onChange={(e) => setTargetBranchId(e.target.value)}
                style={{
                  width: '100%',
                  borderRadius: 6,
                  padding: '6px 10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: 11,
                  background: isSenderInactive || otherBranches.length === 0 ? '#f1f5f9' : '#ffffff',
                  color: isSenderInactive || otherBranches.length === 0 ? '#94a3b8' : '#0f172a',
                  cursor: isSenderInactive || otherBranches.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {otherBranches.length === 0 ? (
                  <option value="">-- Không có chi nhánh đang hoạt động --</option>
                ) : (
                  otherBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={4}
                placeholder="Ghi chú"
                style={{
                  width: '100%',
                  borderRadius: 6,
                  padding: '8px 10px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: 11,
                  resize: 'none'
                }}
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              disabled={loading || isSenderInactive || otherBranches.length === 0 || !targetBranchId}
              onClick={() => handleSubmit(true)}
              style={{
                flex: 1,
                background: '#ffffff',
                border: '1px solid #0066ff',
                color: '#0066ff',
                fontWeight: 600,
                borderRadius: 6,
                padding: '8px 0',
                cursor: (loading || isSenderInactive || otherBranches.length === 0 || !targetBranchId) ? 'not-allowed' : 'pointer',
                opacity: (loading || isSenderInactive || otherBranches.length === 0 || !targetBranchId) ? 0.5 : 1
              }}
            >
              Lưu tạm
            </button>
            <button
              type="button"
              disabled={loading || isSenderInactive || otherBranches.length === 0 || !targetBranchId}
              onClick={() => handleSubmit(false)}
              style={{
                flex: 1,
                background: '#0066ff',
                border: '1px solid #0066ff',
                color: '#ffffff',
                fontWeight: 700,
                borderRadius: 6,
                padding: '8px 0',
                cursor: (loading || isSenderInactive || otherBranches.length === 0 || !targetBranchId) ? 'not-allowed' : 'pointer',
                opacity: (loading || isSenderInactive || otherBranches.length === 0 || !targetBranchId) ? 0.5 : 1
              }}
            >
              Hoàn thành
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferDocumentModal;
