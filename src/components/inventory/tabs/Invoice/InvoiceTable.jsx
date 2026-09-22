import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { SearchOutlined, PlusOutlined, ReloadOutlined, InfoCircleOutlined, UserOutlined, ShoppingCartOutlined, EyeOutlined } from '@ant-design/icons';
import PaginationFooter from '../../../shared/PaginationFooter';
import { getOrderById } from '../../../../api/orderApi';
import { getDocumentById, getSaleById } from '../../../../api/documentApi';

const InvoiceTable = ({ invoices = [], loading = false, onRefresh }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get('search') || '';
  const [searchText, setSearchText] = useState(searchFromUrl);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [loadedInvoiceMap, setLoadedInvoiceMap] = useState({});
  const [loadingInvoiceId, setLoadingInvoiceId] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [pageSize, setPageSize] = useState(20);

  const handlePrint = (doc, items, sub, disc, pts, total) => {
    const dateVal = doc?.date || doc?.createdAt || doc?.orderDate || new Date();
    const formattedDate = dayjs(dateVal).isValid() ? dayjs(dateVal).format('DD-MM-YYYY') : dayjs().format('DD-MM-YYYY');
    const rawCustomer = doc?.customer || doc?.customerName || 'Khách lẻ';
    const cleanCustomer = String(rawCustomer).trim().replace(/[\\/:*?"<>|]/g, '_');
    const printFileName = `MenuGO_HoaDon_${formattedDate}_${cleanCustomer}`;

    const originalTitle = document.title;
    document.title = printFileName;

    const handleAfterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);

    setPrintData({ doc, items, sub, disc, pts, total });
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
    }, 180);
  };

  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (currentSearch !== searchText) {
      setSearchText(currentSearch);
    }

    // Tự động mở rộng chi tiết hóa đơn nếu tìm kiếm khớp mã hóa đơn
    if (currentSearch && invoices.length > 0) {
      const lower = currentSearch.toLowerCase().trim();
      const numMatch = lower.match(/^hd0*(\d+)$/) || lower.match(/^0*(\d+)$/);
      const searchNum = numMatch ? numMatch[1] : null;

      const matched = invoices.find((i) => {
        const invLower = i.code?.toLowerCase() || '';
        return (
          invLower === lower ||
          String(i.id) === lower ||
          `hd${i.id}` === lower ||
          (searchNum && (String(i.id) === searchNum || invLower === `hd${searchNum}`))
        );
      });
      if (matched && expandedInvoiceId !== matched.id) {
        toggleExpand(matched.id);
      }
    }
  }, [searchParams, invoices]);

  const handleSearchChange = (newVal) => {
    setSearchText(newVal);
    const newParams = new URLSearchParams(searchParams);
    if (newVal) {
      newParams.set('search', newVal);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const toggleExpand = async (invId) => {
    if (expandedInvoiceId === invId) {
      setExpandedInvoiceId(null);
    } else {
      setExpandedInvoiceId(invId);
      const existing = invoices.find(i => i.id === invId);
      if (!loadedInvoiceMap[invId] && (!existing?.details || existing.details.length === 0)) {
        setLoadingInvoiceId(invId);
        try {
          // Attempt fetching full order details first
          let fullDoc = null;
          try {
            const res = await getOrderById(invId);
            fullDoc = res.data;
          } catch (e) {
            try {
              fullDoc = await getSaleById(invId);
            } catch (err2) {
              fullDoc = await getDocumentById(invId);
            }
          }
          if (fullDoc) {
            setLoadedInvoiceMap((prev) => ({ ...prev, [invId]: fullDoc }));
          }
        } catch (err) {
          console.error('Failed to load invoice details:', err);
        } finally {
          setLoadingInvoiceId(null);
        }
      }
    }
  };

  // Helper: Filter Confirmed/Completed & Served items, exclude Ingredients, consolidate duplicate items
  const getConsolidatedServedItems = (details = []) => {
    if (!Array.isArray(details) || details.length === 0) return [];

    const servedDetails = details.filter((d) => {
      // 1. Exclude cancelled/rejected items
      if (d.status === 'Cancelled' || d.status === 'Rejected' || d.cookingStatus === 'Cancelled') {
        return false;
      }

      // 2. Exclude raw ingredients (IngredientProduct)
      const pType = String(d.productType || d.type || '').toLowerCase();
      if (pType === 'ingredient' || pType === '4') {
        return false;
      }

      // 3. Match Confirmed/Completed/Served status
      const isValidStatus = !d.status || d.status === 'Confirmed' || d.status === 'Completed' || d.status === 'Served' || d.status === 1 || d.status === 'Paid';
      const isValidCooking = !d.cookingStatus || d.cookingStatus === 'Served' || d.cookingStatus === 'Ready';

      return isValidStatus && isValidCooking;
    });

    const map = new Map();
    servedDetails.forEach((d) => {
      const productId = d.productId || d.bInventoryId || d.id;
      const name = d.productName || d.snapshotProductName || d.product?.name || d.name || 'Món ăn';
      const unitPrice = Number(d.price ?? d.unitPrice ?? (d.quantity > 0 ? (d.totalPrice || 0) / d.quantity : 0) ?? 0);
      const key = `${productId}_${name}_${unitPrice}`;

      const rawQuantity = Number(d.quantity || 0);
      const returnedQuantity = Number(d.returnedQuantity || 0);
      const netQuantity = Math.max(0, rawQuantity - returnedQuantity);
      if (netQuantity <= 0) return;

      if (!map.has(key)) {
        map.set(key, {
          id: d.id,
          productId,
          productName: name,
          productType: d.productType || 'Processed',
          unitName: d.unitName || d.snapshotUnitName || 'Phần',
          unitPrice,
          quantity: netQuantity,
          totalPrice: netQuantity * unitPrice,
          notes: d.note ? [d.note] : []
        });
      } else {
        const existing = map.get(key);
        existing.quantity += netQuantity;
        existing.totalPrice += netQuantity * unitPrice;
        if (d.note && !existing.notes.includes(d.note)) {
          existing.notes.push(d.note);
        }
      }
    });

    return Array.from(map.values());
  };

  const filtered = invoices.filter((inv) => {
    if (searchText) {
      const lower = searchText.trim().toLowerCase();
      if (lower.startsWith('pxbh-') || lower.startsWith('ptbh-') || lower.startsWith('pth-')) {
        const parts = lower.split('-');
        if (parts.length > 1 && parts[1]) {
          const searchOrderId = parts[1];
          return inv.id.toString() === searchOrderId || inv.code?.toLowerCase().includes(searchOrderId);
        }
      }
      const numMatch = lower.match(/^hd0*(\d+)$/) || lower.match(/^0*(\d+)$/);
      const searchNum = numMatch ? numMatch[1] : null;
      const codeLower = inv.code?.toLowerCase() || '';
      const isCodeMatch =
        codeLower.includes(lower) ||
        (searchNum && (String(inv.id) === searchNum || codeLower.includes(`hd${searchNum}`)));

      return (
        isCodeMatch ||
        inv.customer?.toLowerCase().includes(lower) ||
        inv.tableName?.toLowerCase().includes(lower) ||
        inv.createdByName?.toLowerCase().includes(lower)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const currentData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', background: '#ffffff', overflow: 'hidden', width: '100%' }}>
      {/* TOP ACTION TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* SEARCH INPUT */}
          <div style={{ position: 'relative', width: 280 }}>
            <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
            <input
              type="text"
              placeholder="Theo mã hóa đơn, bàn, khách hàng..."
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: '100%',
                height: 32,
                padding: '4px 10px 4px 30px',
                fontSize: 12,
                fontWeight: 500,
                color: '#1e293b',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                outline: 'none',
                transition: 'border 0.2s ease'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => onRefresh ? onRefresh() : alert('Đã làm mới danh sách hóa đơn')}
            style={{
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '0 12px',
              height: 32,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <ReloadOutlined spin={loading} /> Làm mới
          </button>
        </div>
      </div>

      {/* DATA TABLE AREA */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid #cbd5e1', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textWrap: 'nowrap' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textTransform: 'uppercase', color: '#334155', fontWeight: 700, fontSize: 10 }}>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>MÃ HÓA ĐƠN</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>NGÀY LẬP</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>BÀN / KHU VỰC</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>KHÁCH HÀNG</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>THU NGÂN</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>TỔNG TIỀN (VNĐ)</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>TRẠNG THÁI</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>CHI TIẾT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Đang tải danh sách hóa đơn...</td>
              </tr>
            ) : currentData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Không tìm thấy hóa đơn nào</td>
              </tr>
            ) : (
              currentData.map((inv) => {
                const isExpanded = expandedInvoiceId === inv.id;
                const loadedDoc = loadedInvoiceMap[inv.id] || inv;
                const detailsList = loadedDoc.orderDetails || loadedDoc.details || loadedDoc.documentDetails || [];
                const consolidatedItems = getConsolidatedServedItems(detailsList);

                // Financial calculations
                const subtotal = consolidatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
                const discountAmount = Number(loadedDoc.discountAmount || 0);
                const pointsUsed = Number(loadedDoc.pointsUsed || 0);
                const pointsDiscount = pointsUsed * 1000;
                const taxableAmount = Math.max(0, subtotal - discountAmount - pointsDiscount);
                const vatAmount = Math.round(taxableAmount * 0.08);
                const totalAmount = Number(loadedDoc.totalAmount ?? loadedDoc.total ?? (taxableAmount + vatAmount));

                return (
                  <React.Fragment key={inv.id}>
                    {/* MAIN ROW */}
                    <tr
                      onClick={() => toggleExpand(inv.id)}
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                        background: isExpanded ? '#fff7ed' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2563eb' }}>{inv.code}</td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{dayjs(inv.date).format('DD/MM/YYYY HH:mm')}</td>
                      <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: 600 }}>{inv.tableName || 'Mang về'}</td>
                      <td style={{ padding: '8px 10px', color: '#0f172a' }}>{inv.customer}</td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>{inv.createdByName || 'Thu ngân'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {totalAmount ? Math.round(totalAmount).toLocaleString('vi-VN') : 0} đ
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 6px', borderRadius: 4, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 10, fontWeight: 600 }}>
                          Đã thanh toán
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/invoice-detail/${inv.id}`)}
                          style={{
                            padding: '3px 10px',
                            fontSize: 11,
                            borderRadius: 4,
                            border: '1px solid #bfdbfe',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <EyeOutlined /> Chi tiết
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED DETAIL CONTAINER */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={8} style={{ padding: '0 12px 14px 12px', borderBottom: '2px solid #cbd5e1' }}>
                          <div
                            style={{
                              background: '#ffffff',
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                              overflow: 'hidden',
                              marginTop: 4,
                              fontSize: 11
                            }}
                          >
                            {/* HEADER BAR */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{loadedDoc.code || inv.code}</span>
                                <span style={{ padding: '2px 8px', borderRadius: 4, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 10.5, fontWeight: 600 }}>
                                  Hóa đơn bán hàng
                                </span>
                                <span style={{ color: '#475569', fontWeight: 600 }}>
                                  {loadedDoc.tableName || 'Mang về'} {loadedDoc.areaName ? `(${loadedDoc.areaName})` : ''}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ color: '#64748b', fontSize: 11 }}>
                                  Thu ngân / Người lập: <strong style={{ color: '#0f172a' }}>{loadedDoc.createdByName || 'Thu ngân'}</strong> &nbsp;|&nbsp; 
                                  Thời gian: <strong style={{ color: '#334155' }}>{dayjs(loadedDoc.date || loadedDoc.createdAt).format('DD/MM/YYYY HH:mm')}</strong>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/invoice-detail/${inv.id}`)}
                                  style={{
                                    padding: '4px 12px',
                                    fontSize: 11.5,
                                    borderRadius: 5,
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                  }}
                                >
                                  <EyeOutlined style={{ fontSize: 12, color: '#e8442a' }} /> Chi tiết hóa đơn
                                </button>
                              </div>
                            </div>

                            {loadingInvoiceId === inv.id ? (
                              <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                                Đang tải thông tin chi tiết hóa đơn...
                              </div>
                            ) : (
                              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                                {/* LEFT COLUMN: CONSOLIDATED SERVED ITEMS (PROCESSED, REGULAR, MANUFACTURED) */}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#1e293b', marginBottom: 8, fontSize: 11.5 }}>
                                    <ShoppingCartOutlined style={{ color: '#e8442a' }} /> DANH SÁCH MÓN ĂN ĐÃ PHỤC VỤ (SERVED)
                                  </div>

                                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                      <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                                          <th style={{ padding: '6px 8px', textAlign: 'center', width: 40 }}>STT</th>
                                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Tên món ăn</th>
                                          <th style={{ padding: '6px 8px', textAlign: 'right', width: 90 }}>Đơn giá</th>
                                          <th style={{ padding: '6px 8px', textAlign: 'center', width: 70 }}>Số lượng</th>
                                          <th style={{ padding: '6px 8px', textAlign: 'right', width: 100 }}>Thành tiền</th>
                                          <th style={{ padding: '6px 8px', textAlign: 'left', width: 120 }}>Ghi chú</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {consolidatedItems.length === 0 ? (
                                          <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>
                                              {detailsList.length > 0 ? 'Chưa có món nào ở trạng thái phục vụ thành công' : 'Không có chi tiết món ăn'}
                                            </td>
                                          </tr>
                                        ) : (
                                          consolidatedItems.map((item, idx) => (
                                            <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                              <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                                              <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>{item.productName}</td>
                                              <td style={{ padding: '6px 8px', textAlign: 'right', color: '#334155' }}>
                                                {item.unitPrice.toLocaleString('vi-VN')} đ
                                              </td>
                                              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                                                {item.quantity} {item.unitName}
                                              </td>
                                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                {item.totalPrice.toLocaleString('vi-VN')} đ
                                              </td>
                                              <td style={{ padding: '6px 8px', color: '#64748b', fontSize: 10 }}>
                                                {item.notes && item.notes.length > 0 ? item.notes.join(', ') : '---'}
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* RIGHT COLUMN: FINANCIAL BREAKDOWN (DISCOUNTS, POINTS, TOTAL) */}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#1e293b', marginBottom: 8, fontSize: 11.5 }}>
                                    <InfoCircleOutlined style={{ color: '#2563eb' }} /> CHI TIẾT THANH TOÁN
                                  </div>

                                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#475569' }}>
                                      <span>Tạm tính tiền món:</span>
                                      <strong>{subtotal > 0 ? subtotal.toLocaleString('vi-VN') : totalAmount.toLocaleString('vi-VN')} đ</strong>
                                    </div>

                                    {discountAmount > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#dc2626' }}>
                                        <span>(-) Giảm giá Voucher {loadedDoc.voucherCode ? `(${loadedDoc.voucherCode})` : ''}:</span>
                                        <strong>-{discountAmount.toLocaleString('vi-VN')} đ</strong>
                                      </div>
                                    )}

                                    {pointsUsed > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#d97706' }}>
                                        <span>(-) Trừ điểm tích lũy ({pointsUsed} đ):</span>
                                        <strong>-{pointsDiscount.toLocaleString('vi-VN')} đ</strong>
                                      </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#475569' }}>
                                      <span>(+) Phí VAT (8%):</span>
                                      <strong>{vatAmount > 0 ? `+${vatAmount.toLocaleString('vi-VN')} đ` : '0 đ'}</strong>
                                    </div>

                                    <div style={{ height: 1, background: '#cbd5e1', margin: '10px 0' }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>TỔNG THANH TOÁN:</span>
                                      <span style={{ fontSize: 16, fontWeight: 800, color: '#ea580c' }}>
                                        {totalAmount ? Math.round(totalAmount).toLocaleString('vi-VN') : 0} đ
                                      </span>
                                    </div>

                                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, fontSize: 10.5, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <div>Khách hàng: <strong style={{ color: '#1e293b' }}>{loadedDoc.customer || 'Khách lẻ'}</strong> {loadedDoc.customerPhone ? `(${loadedDoc.customerPhone})` : ''}</div>
                                      <div>Phương thức: <strong style={{ color: '#1e293b' }}>{loadedDoc.paymentMethod || 'Tiền mặt'}</strong></div>
                                      <div>Thu ngân: <strong style={{ color: '#1e293b' }}>{loadedDoc.createdByName || 'Thu ngân'}</strong></div>
                                      {loadedDoc.note && <div>Ghi chú: <em>{loadedDoc.note}</em></div>}
                                      <button
                                        type="button"
                                        onClick={() => handlePrint(loadedDoc, consolidatedItems, subtotal, discountAmount, pointsDiscount, totalAmount)}
                                        style={{
                                          marginTop: 12,
                                          width: '100%',
                                          height: 32,
                                          background: '#2563eb',
                                          color: '#ffffff',
                                          border: 'none',
                                          borderRadius: 6,
                                          fontSize: 12,
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 6,
                                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                          transition: 'background-color 0.15s ease'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                        In hóa đơn
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER PAGINATION */}
      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filtered.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />

      {printData && createPortal(
        <div className="invoice-print-only">
          <style dangerouslySetInnerHTML={{__html: `
            @media screen {
              .invoice-print-only {
                display: none !important;
              }
            }
            @media print {
              #root {
                display: none !important;
              }
              body {
                background: #fff !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .invoice-print-only {
                display: block !important;
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 auto !important;
                padding: 4mm 2mm !important;
                color: #000 !important;
                font-family: 'Courier New', Courier, monospace !important;
                font-size: 11px !important;
                line-height: 1.4 !important;
              }
              .text-center {
                text-align: center !important;
              }
              .text-right {
                text-align: right !important;
              }
              .text-left {
                text-align: left !important;
              }
              .font-bold {
                font-weight: bold !important;
              }
            }
          `}} />
          
          <div className="text-center font-bold" style={{ fontSize: 13, textTransform: 'uppercase', marginBottom: 2 }}>
            {printData.doc.branchName || 'Chi nhánh MenuGo'}
          </div>
          {printData.doc.branchAddress && (
            <div className="text-center" style={{ fontSize: 10, marginBottom: 8, whiteSpace: 'normal', wordBreak: 'break-word' }}>
              {printData.doc.branchAddress}
            </div>
          )}
          
          <div className="text-center font-bold" style={{ fontSize: 14, margin: '10px 0 15px 0', letterSpacing: '0.5px' }}>
            HÓA ĐƠN BÁN HÀNG
          </div>

          <div style={{ marginBottom: 10, fontSize: 10.5 }}>
            <div>Mã HD: <span className="font-bold">{printData.doc.orderCode || printData.doc.code}</span></div>
            <div>Thời gian: {dayjs(printData.doc.date || printData.doc.createdAt).format('DD/MM/YYYY HH:mm')}</div>
            <div>Bàn: {printData.doc.tableName || 'Mang về'}</div>
            <div style={{ height: 4 }} />
            <div>Khách Hàng: {printData.doc.customer || 'Khách lẻ'}</div>
            {printData.doc.customerPhone && <div>SDT: {printData.doc.customerPhone}</div>}
            <div>NVBH: {printData.doc.createdByName || 'Thu ngân'}</div>
          </div>

          {/* ITEM TABLE */}
          <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '5px 0', marginBottom: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr className="font-bold" style={{ borderBottom: '1px dashed #000' }}>
                  <th className="text-left" style={{ width: '45%', paddingBottom: 4 }}>Tên món</th>
                  <th className="text-right" style={{ width: '20%', paddingBottom: 4 }}>Giá</th>
                  <th className="text-center" style={{ width: '15%', paddingBottom: 4 }}>SL</th>
                  <th className="text-right" style={{ width: '20%', paddingBottom: 4 }}>T.Tiền</th>
                </tr>
              </thead>
              <tbody>
                {printData.items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="text-left" style={{ padding: '4px 0', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {item.productName}
                    </td>
                    <td className="text-right" style={{ padding: '4px 0', verticalAlign: 'top' }}>
                      {Math.round(item.unitPrice).toLocaleString('vi-VN')}
                    </td>
                    <td className="text-center" style={{ padding: '4px 0', verticalAlign: 'top' }}>
                      {item.quantity}
                    </td>
                    <td className="text-right" style={{ padding: '4px 0', verticalAlign: 'top', fontWeight: 'bold' }}>
                      {Math.round(item.totalPrice).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER SECTION: QR & TOTALS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', marginTop: 12 }}>
            {/* Left: QR Code SVG */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: 8 }}>
              <QRCodeSVG value={printData.doc.orderCode || printData.doc.code} size={85} />
            </div>
            
            {/* Right: Totals list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 10, paddingLeft: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Tổng tiền hàng</span>
                <span className="font-bold">{Math.round(printData.sub > 0 ? printData.sub : printData.total).toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Trừ tiền</span>
                <span>-{Math.round(printData.disc + printData.pts).toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #000', paddingTop: 4 }}>
                <span className="font-bold">Tổng thanh toán</span>
                <span className="font-bold" style={{ fontSize: 12 }}>{Math.round(printData.total).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>
          
          <div className="text-center" style={{ marginTop: 25, fontSize: 9, fontStyle: 'italic', borderTop: '1px dashed #000', paddingTop: 8 }}>
            Cảm ơn quý khách. Hẹn gặp lại!
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default InvoiceTable;
