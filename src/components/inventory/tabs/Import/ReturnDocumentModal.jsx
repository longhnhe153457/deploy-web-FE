import React, { useState, useEffect, useMemo } from 'react';
import {
  DeleteOutlined,
  CloseOutlined,
  FullscreenOutlined,
  PrinterOutlined,
  UserOutlined,
  InfoCircleOutlined,
  RightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { createReturnDocument, getImportReturnDetails } from '../../../../api/documentApi';
import { getPartnerFinancialSummary } from '../../../../api/partnerApi';
import { getDebtDisplayInfo } from '../../../../utils/debtHelper';
import KiotDateTimePicker from './KiotDateTimePicker';
import { useAuth } from '../../../../context/AuthContext';

const ReturnDocumentModal = ({
  open,
  onClose,
  onSuccess,
  branchId,
  importDocument = null,
  presetBatch = null
}) => {
  const auth = useAuth ? useAuth() : {};
  const user = auth?.user;
  const creatorName = user?.name || user?.email || 'Hệ thống';

  const [loading, setLoading] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(dayjs());
  const [openTimeFormatted, setOpenTimeFormatted] = useState('');
  const [openTimeISO, setOpenTimeISO] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [supplierInfo, setSupplierInfo] = useState({ partnerName: '', partnerId: undefined });
  const [parentAmountPaid, setParentAmountPaid] = useState(0);
  const [supplierDebt, setSupplierDebt] = useState(null);
  const [loadingSupplierDebt, setLoadingSupplierDebt] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    paidAmount: 0,
    note: ''
  });

  // items = dòng sản phẩm dựa vào snapshot phiếu nhập
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (open) {
      const now = dayjs();
      setSelectedDateTime(now);
      setOpenTimeFormatted(now.format('DD/MM/YYYY HH:mm:ss'));
      setOpenTimeISO(now.toISOString());
      setShowDatePicker(false);
      setErrorMsg('');
      setSuccessMsg('');

      if (importDocument) {
        setFormData({
          paidAmount: 0,
          note: presetBatch?.batchCode
            ? `Trả hàng Lô ${presetBatch.batchCode} - phiếu nhập ${importDocument.code}`
            : `Trả hàng nhập theo phiếu ${importDocument.code}`
        });

        const loadReturnDetails = async () => {
          try {
            // Gọi API lấy snapshot + số lượng đã trả tích lũy
            const apiRes = await getImportReturnDetails(importDocument.id);
            if (apiRes && apiRes.details && apiRes.details.length > 0) {
              // Lấy thông tin NCC từ response (snapshot phiếu nhập)
              setSupplierInfo({
                partnerName: apiRes.partnerName || 'Nhà cung cấp',
                partnerId: apiRes.partnerId ? Number(apiRes.partnerId) : undefined
              });
              const actualPaid = Number(apiRes?.amountPaid ?? importDocument?.amountPaid ?? 0);
              setParentAmountPaid(actualPaid);

              let mappedItems = apiRes.details.map((it) => {
                const importQtyDisplay = Number(it.quantity ?? 0);
                const alreadyReturnedBase = Number(it.alreadyReturnedBaseQuantity ?? 0);
                const maxReturnInUnit = Number(it.maxReturnQuantity ?? 0);
                const importPrice = Math.round(Number(it.unitPrice ?? 0));

                let defaultQty = 0;
                if (presetBatch) {
                  if (Number(it.bInventoryId) === Number(presetBatch.bInventoryId)) {
                    defaultQty = Math.min(maxReturnInUnit, Number(presetBatch.quantityRemaining));
                  } else {
                    defaultQty = 0;
                  }
                } else {
                  defaultQty = maxReturnInUnit > 0 ? maxReturnInUnit : 0;
                }

                return {
                  // ID dòng chi tiết phiếu Nhập → dùng làm fatherId khi submit
                  fatherId: it.id,
                  bInventoryId: it.bInventoryId,
                  unitConversionId: it.unitConversionId,
                  code: it.productCode || `SP${it.bInventoryId}`,
                  name: it.productName || 'Sản phẩm',
                  unitName: it.unitName || 'Cái',
                  // Hiển thị
                  importQuantity: importQtyDisplay,
                  alreadyReturnedBase: alreadyReturnedBase,
                  maxQuantity: maxReturnInUnit,
                  // Nhập liệu
                  quantity: defaultQty,
                  importPrice: importPrice,
                  returnPrice: importPrice // Mặc định = giá nhập, user có thể điều chỉnh
                };
              });

              if (presetBatch) {
                const matched = mappedItems.filter((it) => Number(it.bInventoryId) === Number(presetBatch.bInventoryId));
                if (matched.length > 0) {
                  mappedItems = matched;
                }
              }
              setItems(mappedItems);
              return;
            }
          } catch (err) {
            console.warn('Lỗi lấy return details từ API:', err);
          }

          // Fallback: dùng dữ liệu local từ importDocument
          const supplierPartner =
            (importDocument.partners || []).find(
              (p) => p.partnerType === 1 || p.partnerType === 'Supplier'
            ) || importDocument.partners?.[0];
          const suppId = supplierPartner?.partnerId || supplierPartner?.id;

          setSupplierInfo({
            partnerName: supplierPartner?.partnerName || 'Nhà cung cấp',
            partnerId: suppId ? Number(suppId) : undefined
          });
          const actualPaid = Number(importDocument?.amountPaid ?? 0);
          setParentAmountPaid(actualPaid);

          let fallbackItems = (importDocument.details || []).map((d) => {
            const qty = Number(d.quantity || 1);
            const price = Math.round(Number(d.unitPrice || 0));
            let defaultQty = qty;
            if (presetBatch) {
              if (Number(d.bInventoryId) === Number(presetBatch.bInventoryId)) {
                defaultQty = Math.min(qty, Number(presetBatch.quantityRemaining));
              } else {
                defaultQty = 0;
              }
            }
            return {
              fatherId: d.id,
              bInventoryId: d.bInventoryId,
              unitConversionId: d.unitConversionId,
              code: d.productCode || d.code || `SP${d.bInventoryId}`,
              name: d.productName || d.name || 'Sản phẩm',
              unitName: d.unitName || 'Cái',
              importQuantity: qty,
              alreadyReturnedBase: 0,
              maxQuantity: qty,
              quantity: defaultQty,
              importPrice: price,
              returnPrice: price
            };
          });

          if (presetBatch) {
            const matched = fallbackItems.filter((it) => Number(it.bInventoryId) === Number(presetBatch.bInventoryId));
            if (matched.length > 0) {
              fallbackItems = matched;
            }
          }
          setItems(fallbackItems);
        };

        loadReturnDetails();
      } else {
        setSupplierInfo({ partnerName: '', partnerId: undefined });
        setParentAmountPaid(0);
        setSupplierDebt(null);
        setFormData({ paidAmount: 0, note: '' });
        setItems([]);
      }
    }
  }, [open, importDocument]);

  useEffect(() => {
    if (!supplierInfo?.partnerId) {
      setSupplierDebt(null);
      return;
    }
    let isMounted = true;
    setLoadingSupplierDebt(true);
    getPartnerFinancialSummary(supplierInfo.partnerId)
      .then((res) => {
        if (isMounted) setSupplierDebt(res);
      })
      .catch(() => {
        if (isMounted) setSupplierDebt(null);
      })
      .finally(() => {
        if (isMounted) setLoadingSupplierDebt(false);
      });
    return () => {
      isMounted = false;
    };
  }, [supplierInfo?.partnerId]);

  const handleDateChange = (dateObj) => {
    setSelectedDateTime(dateObj);
    setOpenTimeFormatted(dateObj.format('DD/MM/YYYY HH:mm:ss'));
    setOpenTimeISO(dateObj.toISOString());
    setShowDatePicker(false);
  };

  const handleItemQuantityChange = (idx, val) => {
    const item = items[idx];
    const maxQ = item.maxQuantity > 0 ? item.maxQuantity : 0;
    const newQty = Math.max(0, Math.min(maxQ, Number(val) || 0));
    const updated = [...items];
    updated[idx] = { ...updated[idx], quantity: newQty };
    setItems(updated);
  };

  const handleItemReturnPriceChange = (idx, val) => {
    const newPrice = Math.max(0, Number(val) || 0);
    const updated = [...items];
    updated[idx] = { ...updated[idx], returnPrice: newPrice };
    setItems(updated);
  };

  const handleRemoveItem = (idx) => {
    const updated = [...items];
    updated.splice(idx, 1);
    setItems(updated);
  };

  const totalGoodsAmount = useMemo(() => {
    return items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.returnPrice) || 0), 0);
  }, [items]);

  const remainder = totalGoodsAmount - Math.floor(totalGoodsAmount);
  const netAmount = remainder < 0.5 ? Math.floor(totalGoodsAmount) : Math.floor(totalGoodsAmount) + 1;
  const roundingValue = totalGoodsAmount - netAmount;
  const paidAmount = Number(formData.paidAmount) || 0;
  const debtAmount = Math.max(0, netAmount - paidAmount);
  const paidAmountExceedsParentPaid = paidAmount > parentAmountPaid;
  const paidAmountExceedsTotal = paidAmount > netAmount && netAmount > 0;
  const hasPaidAmountError = paidAmountExceedsParentPaid || paidAmountExceedsTotal;

  // Tự động giới hạn số tiền NCC đã trả không vượt quá Cần thu NCC (Đã làm tròn)
  useEffect(() => {
    if (formData.paidAmount > netAmount) {
      setFormData((prev) => ({ ...prev, paidAmount: netAmount }));
    }
  }, [netAmount, formData.paidAmount]);

  const handleSubmit = async () => {
    if (!importDocument || !importDocument.id) {
      setErrorMsg('Không tìm thấy thông tin phiếu nhập kho gốc.');
      return;
    }

    const activeItems = items.filter((item) => Number(item.quantity) > 0);
    if (activeItems.length === 0) {
      setErrorMsg('Vui lòng chọn số lượng trả lớn hơn 0 cho ít nhất 1 sản phẩm.');
      return;
    }

    for (let i = 0; i < activeItems.length; i++) {
      const item = activeItems[i];
      if (item.quantity > item.maxQuantity) {
        setErrorMsg(`Số lượng trả "${item.name}" không được vượt quá số lượng tối đa còn trả được (${item.maxQuantity} ${item.unitName}).`);
        return;
      }
      if (Number(item.returnPrice) < 0) {
        setErrorMsg(`Đơn giá hoàn tiền của "${item.name}" không được âm.`);
        return;
      }
    }

    // Validate: NCC không hoàn tiền nếu mình chưa thanh toán phiếu nhập
    if (parentAmountPaid <= 0 && paidAmount > 0) {
      setErrorMsg('Số tiền NCC hoàn trả không được vượt quá số tiền bạn đã thanh toán cho phiếu nhập này.');
      return;
    }

    if (paidAmount > parentAmountPaid) {
      setErrorMsg('Số tiền NCC hoàn trả không được vượt quá số tiền bạn đã thanh toán cho phiếu nhập này.');
      return;
    }

    // Validate: tiền NCC đã trả không được vượt quá tổng tiền cần thu
    if (paidAmount > netAmount) {
      setErrorMsg(`Số tiền NCC đã trả (${paidAmount.toLocaleString('vi-VN')} ₫) không được vượt quá tổng tiền cần thu (${netAmount.toLocaleString('vi-VN')} ₫). Vui lòng kiểm tra lại.`);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      // DTO đúng mapping với ReturnDocumentCreateDto của backend
      const dto = {
        branchId: Number(branchId),
        // PartnerId & BranchId sẽ được service override từ phiếu Nhập gốc,
        // nhưng vẫn truyền để controller không báo lỗi validation
        partnerId: supplierInfo.partnerId || null,
        parentDocumentId: Number(importDocument.id),  // Liên kết phiếu Nhập gốc
        orderDate: openTimeISO || new Date().toISOString(),
        note: formData.note || `Trả hàng nhập theo phiếu ${importDocument.code}`,
        amountPaid: Math.round(Number(formData.paidAmount || 0)),
        paymentMethod: 'Cash',
        details: activeItems.map((i) => ({
          bInventoryId: Number(i.bInventoryId),
          unitConversionId: i.unitConversionId || null,
          fatherId: Number(i.fatherId),    // Quan trọng: trỏ về dòng chi tiết phiếu Nhập gốc
          quantity: Number(i.quantity),
          unitPrice: Math.round(Number(i.returnPrice || 0)),
          note: ''
        }))
      };

      await createReturnDocument(dto);
      setSuccessMsg('Tạo phiếu trả hàng thành công!');
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      console.error('Lỗi khi tạo phiếu trả hàng nhập:', err);
      let errMsg = err.response?.data?.message;
      if (!errMsg && err.response?.data?.errors) {
        const errs = err.response.data.errors;
        if (typeof errs === 'string') errMsg = errs;
        else if (Array.isArray(errs)) errMsg = errs.join('; ');
        else if (typeof errs === 'object') {
          const msgs = [];
          Object.values(errs).forEach((val) => {
            if (Array.isArray(val)) msgs.push(...val);
            else if (typeof val === 'string') msgs.push(val);
          });
          if (msgs.length > 0) errMsg = msgs.join('; ');
        }
      }
      if (!errMsg) errMsg = err.response?.data?.title || err.message || 'Đã xảy ra lỗi khi tạo phiếu trả hàng nhập.';
      setErrorMsg(errMsg);
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
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* HEADER BAR */}
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
            Trả hàng nhập {importDocument ? `(Phiếu nhập: ${importDocument.code})` : ''}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
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

      {/* BODY (LEFT TABLE + RIGHT SIDEBAR) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT SECTION */}
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* INFO BAR */}
          <div
            style={{
              marginBottom: 10,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontWeight: 600 }}>
              <InfoCircleOutlined style={{ color: '#3b82f6', fontSize: 13 }} />
              <span>Sản phẩm hoàn trả từ phiếu nhập: </span>
              <strong style={{ color: '#e8442a' }}>{importDocument?.code || '---'}</strong>
            </div>
            <span style={{ color: '#64748b', fontSize: 10 }}>
              (Điều chỉnh số lượng trả ≤ tối đa trả. Có thể đặt giá trả riêng.)
            </span>
          </div>

          {/* ERROR / SUCCESS MESSAGE */}
          {errorMsg && (
            <div style={{
              marginBottom: 8,
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 6,
              padding: '8px 12px',
              color: '#dc2626',
              fontSize: 11,
              fontWeight: 600
            }}>
              ⚠ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{
              marginBottom: 8,
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 6,
              padding: '8px 12px',
              color: '#16a34a',
              fontSize: 11,
              fontWeight: 600
            }}>
              ✓ {successMsg}
            </div>
          )}

          {/* PRODUCT RETURN TABLE */}
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
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textTransform: 'uppercase', color: '#334155', fontWeight: 700, fontSize: 10 }}>
                  <th style={{ width: 40, padding: '8px 6px', textAlign: 'center' }}>STT</th>
                  <th style={{ width: 100, padding: '8px 8px', textAlign: 'left' }}>MÃ HÀNG</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left' }}>TÊN HÀNG</th>
                  <th style={{ width: 60, padding: '8px 8px', textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: 80, padding: '8px 8px', textAlign: 'center' }}>SL NHẬP</th>
                  <th style={{ width: 80, padding: '8px 8px', textAlign: 'center' }}>TỐI ĐA TRẢ</th>
                  <th style={{ width: 100, padding: '8px 8px', textAlign: 'center' }}>SL TRẢ</th>
                  <th style={{ width: 110, padding: '8px 8px', textAlign: 'right' }}>GIÁ NHẬP</th>
                  <th style={{ width: 120, padding: '8px 8px', textAlign: 'right' }}>GIÁ TRẢ HÀNG</th>
                  <th style={{ width: 110, padding: '8px 8px', textAlign: 'right' }}>THÀNH TIỀN</th>
                  <th style={{ width: 36, padding: '8px 6px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      Đang tải danh sách sản phẩm...
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const amount = Math.round((Number(item.quantity) || 0) * (Number(item.returnPrice) || 0));
                    const isFullyReturned = (item.maxQuantity || 0) <= 0;

                    return (
                      <tr key={item.fatherId || idx} style={{ borderBottom: '1px solid #f1f5f9', opacity: isFullyReturned ? 0.55 : 1 }}>
                        <td style={{ textAlign: 'center', color: '#64748b', padding: '6px' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: '#334155', padding: '6px 8px' }}>{item.code}</td>
                        <td style={{ fontWeight: 600, color: '#0f172a', padding: '6px 8px' }}>{item.name}</td>
                        <td style={{ textAlign: 'center', color: '#475569', padding: '6px 8px' }}>
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', fontSize: 10 }}>
                            {item.unitName || 'Cái'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#475569', padding: '6px 8px' }}>
                          {(item.importQuantity ?? 0).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: isFullyReturned ? '#dc2626' : '#16a34a', padding: '6px 8px' }}>
                          {(item.maxQuantity ?? 0).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                          {isFullyReturned ? (
                            <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 600 }}>
                              Đã trả hết
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={item.maxQuantity}
                              value={item.quantity}
                              onChange={(e) => handleItemQuantityChange(idx, e.target.value)}
                              style={{
                                width: 70,
                                textAlign: 'center',
                                borderRadius: 4,
                                padding: '3px 6px',
                                border: item.quantity > item.maxQuantity ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#0f172a',
                                outline: 'none'
                              }}
                            />
                          )}
                        </td>
                        <td style={{ textAlign: 'right', color: '#64748b', padding: '6px 8px' }}>
                          {Math.round(item.importPrice).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                          <input
                            type="number"
                            min={0}
                            value={item.returnPrice}
                            onChange={(e) => handleItemReturnPriceChange(idx, e.target.value)}
                            disabled={isFullyReturned}
                            style={{
                              width: 100,
                              textAlign: 'right',
                              borderRadius: 4,
                              padding: '3px 6px',
                              border: '1px solid #cbd5e1',
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#0f172a',
                              outline: 'none',
                              background: isFullyReturned ? '#f8fafc' : '#ffffff'
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', padding: '6px 8px' }}>
                          {amount.toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                          >
                            <DeleteOutlined style={{ fontSize: 12 }} />
                          </button>
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
            width: 360,
            background: '#ffffff',
            borderLeft: '1px solid #cbd5e1',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
              {/* KIOTVIET TIME & CREATOR HEADER */}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#334155', fontSize: 11 }}>
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
                    {creatorName} · {openTimeFormatted || dayjs().format('DD/MM/YYYY HH:mm:ss')}
                  </span>
                  <RightOutlined style={{ fontSize: 10, color: '#64748b' }} />
                </div>

                <span style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', borderRadius: 12, padding: '1px 8px', fontSize: 10, fontWeight: 600 }}>
                  Phiếu trả NCC
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

              {/* SUPPLIER DISPLAY */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <UserOutlined style={{ color: '#e8442a', fontSize: 16 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 10, color: '#64748b' }}>Nhà cung cấp (từ phiếu nhập gốc)</span>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                      {supplierInfo.partnerName || 'Đang tải...'}
                    </span>
                  </div>
                </div>
                {supplierInfo.partnerId && (
                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 6 }}>
                    {loadingSupplierDebt ? (
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>Đang nạp công nợ NCC...</span>
                    ) : supplierDebt ? (() => {
                      const info = getDebtDisplayInfo(supplierDebt.remainingDebt);
                      return (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: info.bgColor,
                            color: info.color,
                            border: `1px solid ${info.borderColor}`
                          }}
                        >
                          <span>Công nợ hiện tại:</span>
                          <strong>{info.text}</strong>
                        </div>
                      );
                    })() : null}
                  </div>
                )}
              </div>

              {/* TOTALS & PAYMENT */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569' }}>Tổng tiền hàng gốc ({items.filter(i => i.quantity > 0).length} sp)</span>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                    {totalGoodsAmount.toLocaleString('vi-VN')} ₫
                  </span>
                </div>

                {roundingValue !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#d97706', fontSize: 11.5 }}>
                    <span>ĐC Làm tròn (Rounding)</span>
                    <span style={{ fontWeight: 600 }}>
                      {roundingValue > 0 ? `-${roundingValue.toLocaleString('vi-VN')}` : `+${Math.abs(roundingValue).toLocaleString('vi-VN')}`} ₫
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Cần thu NCC (Đã làm tròn)</span>
                  <span style={{ fontWeight: 700, color: '#059669', fontSize: 13 }}>
                    {netAmount.toLocaleString('vi-VN')} ₫
                  </span>
                </div>

                {/* SỐ TIỀN NHÀ CUNG CẤP ĐÃ TRẢ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <span style={{ color: '#475569', fontWeight: 600, flexShrink: 0 }}>NCC đã trả tiền</span>
                      <div style={{ fontSize: 10, color: '#64748b' }}>
                        Đã trả phiếu nhập: <strong style={{ color: '#0f172a' }}>{parentAmountPaid.toLocaleString('vi-VN')} ₫</strong>
                      </div>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={parentAmountPaid <= 0}
                      value={
                        parentAmountPaid <= 0
                          ? '0'
                          : formData.paidAmount === '' || formData.paidAmount == null
                          ? ''
                          : Number(formData.paidAmount).toLocaleString('vi-VN')
                      }
                      onChange={(e) => {
                        const rawDigits = e.target.value.replace(/\D/g, '');
                        if (!rawDigits) {
                          setFormData((prev) => ({ ...prev, paidAmount: 0 }));
                          return;
                        }
                        let val = Number(rawDigits);
                        if (val > netAmount) {
                          val = netAmount;
                        }
                        setFormData((prev) => ({ ...prev, paidAmount: val }));
                      }}
                      onFocus={(e) => {
                        if (formData.paidAmount === 0) {
                          e.target.select();
                        }
                      }}
                      style={{
                        width: 120, textAlign: 'right', borderRadius: 6, padding: '4px 8px',
                        border: hasPaidAmountError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        fontSize: 11, fontWeight: 700,
                        color: hasPaidAmountError ? '#ef4444' : (parentAmountPaid <= 0 ? '#94a3b8' : '#16a34a'),
                        outline: 'none',
                        background: hasPaidAmountError ? '#fef2f2' : (parentAmountPaid <= 0 ? '#f1f5f9' : '#ffffff'),
                        cursor: parentAmountPaid <= 0 ? 'not-allowed' : 'text'
                      }}
                      placeholder={parentAmountPaid <= 0 ? '0' : '0'}
                    />
                  </div>
                  {parentAmountPaid <= 0 && (
                    <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', textAlign: 'right' }}>
                      * Chưa thanh toán phiếu nhập nên không hoàn tiền mặt
                    </div>
                  )}
                  {paidAmountExceedsParentPaid && parentAmountPaid > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 600, textAlign: 'right' }}>
                        ⚠ Không được vượt quá số tiền đã thanh toán ({parentAmountPaid.toLocaleString('vi-VN')} ₫)
                      </span>
                    </div>
                  )}
                  {paidAmountExceedsTotal && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 600, textAlign: 'right' }}>
                        ⚠ Vượt quá tổng cần thu ({netAmount.toLocaleString('vi-VN')} ₫)
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Tính vào công nợ</span>
                  <span style={{ fontWeight: 700, color: debtAmount > 0 ? '#ef4444' : '#16a34a', fontSize: 13 }}>
                    {debtAmount.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* NOTE INPUT */}
              <div>
                <input
                  type="text"
                  maxLength={250}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Ghi chú phiếu trả hàng..."
                  style={{
                    width: '100%',
                    borderRadius: 6,
                    padding: '6px 10px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    fontSize: 11,
                    height: 32
                  }}
                />
              </div>
            </div>

            {/* ACTION BUTTONS — chỉ "Hoàn thành" (không có Lưu tạm) */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                style={{
                  flex: 1,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 600,
                  borderRadius: 6,
                  padding: '8px 0',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={loading || items.filter(i => i.quantity > 0).length === 0 || hasPaidAmountError}
                onClick={handleSubmit}
                style={{
                  flex: 2,
                  background: (loading || hasPaidAmountError) ? '#cbd5e1' : 'linear-gradient(135deg, #e8442a, #d9381e)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  borderRadius: 6,
                  padding: '8px 0',
                  cursor: (loading || hasPaidAmountError) ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  boxShadow: (loading || hasPaidAmountError) ? 'none' : '0 2px 6px rgba(232,68,42,0.3)'
                }}
              >
                {loading ? 'Đang lưu...' : 'Hoàn thành phiếu trả'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnDocumentModal;
