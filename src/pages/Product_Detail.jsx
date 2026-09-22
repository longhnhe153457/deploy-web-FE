import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  PrinterOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  BarcodeOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CompassOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import { getProductById } from '../api/productApi';
import { getBInventoryDetail, getBInventoryLedger, getBInventories } from '../api/binventoryApi';
import { getBatchesByBInventoryId } from '../api/batchApi';
import BatchTraceabilityDrawer from '../components/inventory/tabs/Product/BatchTraceabilityDrawer';
import { renderBatchStatusBadge, renderExpiryStatusBadge } from '../components/inventory/utils/batchHelper';
import { ReferenceLink } from '../utils/documentNavHelper';
import InventoryPrintPortal from '../components/inventory/common/InventoryPrintPortal';

const renderMethodBadge = (ldg) => {
  let method = ldg.methodName || ldg.method || ldg.type || '';
  const docType = ldg.documentType || '';
  const docCode = ldg.documentCode || ldg.code || '';

  if (docType === 'Export' || docType === 'ExportDelete' || method.toLowerCase().includes('hủy') || docCode.startsWith('XH')) {
    method = 'Xuất Hủy';
  } else if (docType === 'Sale' || method.toLowerCase().includes('bán') || docCode.startsWith('PXBH') || docCode.startsWith('HD')) {
    method = 'Bán hàng';
  } else if (docType === 'Return' || (method.toLowerCase().includes('trả') && !method.toLowerCase().includes('khách')) || docCode.startsWith('THN') || docCode.startsWith('TH')) {
    method = 'Trả Hàng';
  } else if (docType === 'Transfer' || method.toLowerCase().includes('chuyển') || docCode.startsWith('CK')) {
    method = 'Chuyển Hàng';
  } else if (docType === 'CustomerReturn' || method.toLowerCase().includes('khách')) {
    method = 'Khách trả hàng';
  } else if (docType === 'Import' || method.toLowerCase().includes('nhập') || docCode.startsWith('NH')) {
    method = 'Nhập hàng';
  } else if (docType === 'Check' || method.toLowerCase().includes('kiểm')) {
    method = 'Kiểm kho';
  } else if (docType === 'Production' || method.toLowerCase().includes('sản xuất')) {
    method = 'Sản xuất';
  }

  if (!method) {
    method = docType || 'Biến động kho';
  }

  let bg = '#f1f5f9';
  let color = '#334155';
  let border = '#e2e8f0';

  if (method === 'Bán hàng') {
    bg = '#eff6ff';
    color = '#1d4ed8';
    border = '#bfdbfe';
  } else if (method === 'Xuất Hủy') {
    bg = '#fef2f2';
    color = '#dc2626';
    border = '#fecaca';
  } else if (method === 'Trả Hàng') {
    bg = '#fff7ed';
    color = '#c2410c';
    border = '#ffedd5';
  } else if (method === 'Chuyển Hàng') {
    bg = '#f5f3ff';
    color = '#6d28d9';
    border = '#ddd6fe';
  } else if (method === 'Nhập hàng') {
    bg = '#ecfdf5';
    color = '#047857';
    border = '#a7f3d0';
  } else if (method === 'Khách trả hàng') {
    bg = '#f0fdf4';
    color = '#15803d';
    border = '#bbf7d0';
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2.5px 8px',
        borderRadius: 4,
        fontSize: 10.5,
        fontWeight: 700,
        background: bg,
        color: color,
        border: `1px solid ${border}`
      }}
    >
      {method}
    </span>
  );
};

const Product_Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDocumentCodeClick = (code, docType) => {
    const upper = String(code || '').toUpperCase().trim();
    const typeStr = String(docType || '');
    const searchParam = code ? `&search=${encodeURIComponent(code)}` : '';

    if (upper.startsWith('NH') || typeStr === 'Import') {
      navigate(`/inventory-management?tab=Import${searchParam}`);
    } else if (upper.startsWith('CK') || typeStr === 'Transfer') {
      navigate(`/inventory-management?tab=Transfer${searchParam}`);
    } else if (upper.startsWith('THN') || upper.startsWith('TH') || typeStr === 'Return') {
      navigate(`/inventory-management?tab=ImportReturn${searchParam}`);
    } else if (upper.startsWith('XH') || typeStr === 'ExportDelete' || typeStr === 'Export') {
      navigate(`/inventory-management?tab=ExportDelete${searchParam}`);
    } else if (upper.startsWith('KK') || typeStr === 'Check') {
      navigate(`/inventory-management?tab=Check${searchParam}`);
    } else if (upper.startsWith('SX') || typeStr === 'Production') {
      navigate(`/inventory-management?tab=Production${searchParam}`);
    } else if (upper.startsWith('HD') || upper.startsWith('PXBH') || typeStr === 'Sale' || typeStr === 'Invoice') {
      navigate(`/inventory-management?tab=Invoice${searchParam}`);
    } else if (upper.startsWith('DC') || typeStr === 'CostAdjustment') {
      navigate(`/inventory-management?tab=Adjustment${searchParam}`);
    } else {
      navigate(`/inventory-management?tab=Import${searchParam}`);
    }
  };

  const initialProduct = location.state?.product || location.state?.item || location.state?.document || null;
  const [product, setProduct] = useState(initialProduct);
  const [ledger, setLedger] = useState([]);
  const [batches, setBatches] = useState([]);
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'batches'
  const [loading, setLoading] = useState(!initialProduct);

  const [selectedTraceBatchId, setSelectedTraceBatchId] = useState(null);
  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      let prodData = null;

      // 1. Lấy từ BInventory detail API
      try {
        const binvRes = await getBInventoryDetail(id);
        if (binvRes) {
          prodData = binvRes;
        }
      } catch (e) {}

      // 2. Tìm trong danh sách BInventories của chi nhánh nếu chưa có
      if (!prodData) {
        try {
          const branchId = localStorage.getItem('branchId') || 1;
          const list = await getBInventories(branchId);
          if (Array.isArray(list)) {
            const found = list.find(
              (it) => it.id === Number(id) || it.bInventoryId === Number(id) || it.productId === Number(id)
            );
            if (found) {
              prodData = found;
            }
          }
        } catch (e) {}
      }

      // 3. Fallback getProductById
      if (!prodData) {
        try {
          const pRes = await getProductById(id);
          if (pRes) {
            prodData = pRes?.data || pRes;
          }
        } catch (e) {}
      }

      if (prodData) {
        setProduct(prodData);
      }

      // 4. Lấy lịch sử biến động thẻ kho
      try {
        const ledgRes = await getBInventoryLedger(id, 1, 50);
        const items = Array.isArray(ledgRes?.items) ? ledgRes.items : (Array.isArray(ledgRes) ? ledgRes : []);
        setLedger(items);
      } catch (e) {}

      // 5. Lấy danh sách Lô hàng & HSD
      try {
        const batchRes = await getBatchesByBInventoryId(id);
        const bList = Array.isArray(batchRes) ? batchRes : (batchRes?.items || []);
        setBatches(bList);
      } catch (e) {}
    } catch (err) {
      console.error('Lỗi khi tải chi tiết sản phẩm:', err);
      message.error('Không thể tải thông tin chi tiết mặt hàng.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const pCode = product?.code || product?.productCode || product?.barcode || product?.product?.code || `SP${id}`;
  const pName = product?.name || product?.productName || product?.product?.name || 'Mặt hàng';
  const uName = product?.unitName || product?.unit?.name || 'Đơn vị';
  const stockQty = Number(product?.quantity ?? product?.stockQuantity ?? product?.currentStock ?? 0);
  const avgCost = Number(product?.purchasePrice ?? product?.avg ?? product?.avgCost ?? product?.costPrice ?? 0);
  const stockValue = stockQty * avgCost;
  const minStock = Number(product?.minStorage ?? product?.minQuantity ?? 0);
  const maxStock = Number(product?.maxStorage ?? product?.maxQuantity ?? 0);
  const groupName = product?.groupName || product?.categoryName || 'Mặc định';
  const description = product?.description || '';

  const imgSrc =
    product?.imageUrl ||
    product?.imageLink ||
    product?.avatar ||
    product?.avatarImage ||
    product?.product?.imageUrl ||
    product?.product?.imageLink ||
    (typeof product?.image === 'string' ? product?.image : product?.image?.imageLink);

  const getProductTypeBadge = (typeVal) => {
    const rawType = String(typeVal || product?.type || product?.productType || '').toLowerCase();
    if (rawType === 'ingredient' || rawType === '0') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: 11, fontWeight: 600 }}>
          Nguyên liệu
        </span>
      );
    }
    if (rawType === 'manufactured' || rawType === '1') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: 11, fontWeight: 600 }}>
          Bán thành phẩm
        </span>
      );
    }
    if (rawType === 'processed' || rawType === '2') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#faf5ff', color: '#9333ea', border: '1px solid #e9d5ff', fontSize: 11, fontWeight: 600 }}>
          Món chế biến
        </span>
      );
    }
    if (rawType === 'regular' || rawType === '3') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: 11, fontWeight: 600 }}>
          Hàng hóa thường
        </span>
      );
    }
    if (rawType === 'tool' || rawType === '4') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', fontSize: 11, fontWeight: 600 }}>
          Dụng cụ
        </span>
      );
    }
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600 }}>
        {product?.type || 'Hàng hóa'}
      </span>
    );
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanName = pName.replace(/[^a-zA-Z0-9À-ỹ]/g, '_');
    document.title = `MenuGO_TheKho_${pCode}_${cleanName}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh', background: '#f8fafc', overflow: 'hidden', boxSizing: 'border-box' }}>
      {/* HEADER */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/inventory-management?tab=Product')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <ArrowLeftOutlined /> Quay lại danh sách
          </button>

          <div style={{ borderLeft: '1px solid #e2e8f0', height: 24 }} />

          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              Quản lý kho / Tồn kho hàng hóa / Chi tiết mặt hàng
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {pName}
              </span>
              <span
                onClick={() => navigate(`/inventory-management?tab=Product&search=${encodeURIComponent(pCode)}`)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
                title="Nhấp để quay về Quản lý tồn kho hàng hóa"
              >
                <BarcodeOutlined /> {pCode}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <PrinterOutlined /> In thẻ hàng
          </button>
          <button
            type="button"
            onClick={fetchDetail}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            <ReloadOutlined spin={loading} /> Làm mới
          </button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* CARD TỔNG QUAN THÔNG TIN: ẢNH BÊN TRÁI - THÔNG TIN BÊN PHẢI */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            padding: '20px 24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            display: 'flex',
            gap: 24,
            alignItems: 'stretch'
          }}
        >
          {/* KHỐI ẢNH NGUYÊN LIỆU (BÊN TRÁI) */}
          <div
            style={{
              width: 170,
              minWidth: 170,
              height: 170,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={pName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <AppstoreOutlined style={{ fontSize: 44, color: '#cbd5e1', marginBottom: 6 }} />
                <div style={{ fontSize: 11, fontWeight: 500 }}>Chưa có hình ảnh</div>
              </div>
            )}
          </div>

          {/* KHỐI THÔNG TIN CHI TIẾT (BÊN PHẢI) */}
          <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {/* TIÊU ĐỀ & HUY HIỆU */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                    {pName}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 11, fontWeight: 700 }}>
                    {pCode}
                  </span>
                  {getProductTypeBadge()}
                </div>

                <div>
                  {stockQty > 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 11, fontWeight: 700 }}>
                      <CheckCircleOutlined /> Còn hàng
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 11, fontWeight: 700 }}>
                      <WarningOutlined /> Hết hàng
                    </span>
                  )}
                </div>
              </div>

              {/* LƯỚI THÔNG TIN CHI TIẾT */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '10px 20px',
                  fontSize: 12,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '14px 18px'
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Nhóm hàng:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{groupName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Tồn kho hiện tại:</span>{' '}
                  <strong style={{ color: stockQty <= 0 ? '#dc2626' : (stockQty <= minStock ? '#ea580c' : '#059669'), fontSize: 13 }}>
                    {stockQty.toLocaleString('vi-VN')} {uName}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Giá vốn bình quân:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {Math.round(avgCost).toLocaleString('vi-VN')} đ / {uName}
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b' }}>Đơn vị tính chính:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{uName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Định mức an toàn:</span>{' '}
                  <span style={{ color: '#334155', fontWeight: 600 }}>
                    Tối thiểu: {minStock} {uName} | Tối đa: {maxStock > 0 ? `${maxStock} ${uName}` : '---'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Tổng giá trị tồn kho:</span>{' '}
                  <strong style={{ color: '#2563eb', fontSize: 13 }}>
                    {Math.round(stockValue).toLocaleString('vi-VN')} đ
                  </strong>
                </div>

                {product?.sellPrice > 0 && (
                  <div>
                    <span style={{ color: '#64748b' }}>Giá bán:</span>{' '}
                    <strong style={{ color: '#059669' }}>
                      {Math.round(product.sellPrice).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* MÔ TẢ NGUYÊN LIỆU NẾU CÓ */}
            {description && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
                <strong style={{ color: '#334155' }}>Mô tả:</strong> {description}
              </div>
            )}
          </div>
        </div>

        {/* TABS: THẺ KHO & LÔ HÀNG & HSD */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          {/* TAB HEADERS */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 16px', gap: 8 }}>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              style={{
                padding: '12px 18px',
                fontSize: 13,
                fontWeight: 700,
                color: activeTab === 'ledger' ? '#e8442a' : '#64748b',
                borderBottom: activeTab === 'ledger' ? '2px solid #e8442a' : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <HistoryOutlined /> Thẻ kho ({ledger.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batches')}
              style={{
                padding: '12px 18px',
                fontSize: 13,
                fontWeight: 700,
                color: activeTab === 'batches' ? '#e8442a' : '#64748b',
                borderBottom: activeTab === 'batches' ? '2px solid #e8442a' : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <BarcodeOutlined /> Lô hàng & HSD ({batches.length})
            </button>
          </div>

          {/* TAB 1: THẺ KHO */}
          {activeTab === 'ledger' && (
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '450px', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                    <th style={{ padding: '10px 12px' }}>Mã chứng từ</th>
                    <th style={{ padding: '10px 12px' }}>Nghiệp vụ</th>
                    <th style={{ padding: '10px 12px' }}>Thời gian</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Giá vốn BQ</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thay đổi tồn</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tồn tích lũy</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        Chưa có lịch sử giao dịch thẻ kho cho mặt hàng này
                      </td>
                    </tr>
                  ) : (
                    ledger.map((lg, idx) => {
                      const qDelta = Number(lg.quantityDelta || lg.delta || 0);
                      const qBalance = Number(lg.runningQuantity || lg.balance || 0);
                      const unitCost = Number(lg.runningAverageCost || lg.unitCost || 0);
                      const timeStr = lg.businessDate || lg.postedAt || lg.createdAt;

                      return (
                        <tr key={lg.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              onClick={() => handleDocumentCodeClick(lg.documentCode || lg.code, lg.documentType)}
                              style={{
                                color: '#2563eb',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                              title="Nhấp để chuyển tới tab quản lý chứng từ"
                            >
                              {lg.documentCode || lg.code || '---'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {renderMethodBadge(lg)}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            {timeStr ? dayjs(timeStr).format('DD/MM/YYYY HH:mm') : '---'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                            {Math.round(unitCost).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: qDelta > 0 ? '#059669' : (qDelta < 0 ? '#dc2626' : '#64748b') }}>
                            {qDelta > 0 ? `+${qDelta.toLocaleString('vi-VN')}` : qDelta.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {qBalance.toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: LÔ HÀNG & HSD */}
          {activeTab === 'batches' && (
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '450px', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                    <th style={{ padding: '10px 12px' }}>Mã Lô</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>SL ban đầu</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tồn hiện tại</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Giá vốn riêng Lô</th>
                    <th style={{ padding: '10px 12px' }}>Ngày sản xuất</th>
                    <th style={{ padding: '10px 12px' }}>Hạn sử dụng</th>
                    <th style={{ padding: '10px 12px' }}>Ngày nhập</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Trạng thái Lô</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Hạn Dùng</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        Chưa có dữ liệu Lô hàng & HSD cho mặt hàng này
                      </td>
                    </tr>
                  ) : (
                    batches.map((b, idx) => {
                      const qOrig = Number(b.quantityOriginal ?? 0);
                      const qRem = Number(b.quantityRemaining ?? 0);
                      const uCost = Number(b.unitCost ?? 0);

                      return (
                        <tr key={b.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                          <td style={{ padding: '10px 12px' }}>
                            {b.batchCode ? (
                              <span
                                onClick={() => navigate(`/inventory-management?tab=BatchExpiry&search=${encodeURIComponent(b.batchCode)}`)}
                                style={{
                                  color: '#2563eb',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  textDecoration: 'underline'
                                }}
                                title="Nhấp để chuyển tới Quản lý Lô & Hạn sử dụng"
                              >
                                {b.batchCode}
                              </span>
                            ) : (
                              '---'
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>
                            {qOrig.toLocaleString('vi-VN')} {uName}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: qRem > 0 ? '#059669' : '#dc2626' }}>
                            {qRem.toLocaleString('vi-VN')} {uName}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#ea580c' }}>
                            {Math.round(uCost).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            {b.manufactureDate ? dayjs(b.manufactureDate).format('DD/MM/YYYY') : '---'}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            {b.expiryDate ? dayjs(b.expiryDate).format('DD/MM/YYYY') : 'Không có'}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            {b.receivedDate ? dayjs(b.receivedDate).format('DD/MM/YYYY') : '---'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {renderBatchStatusBadge(b.status)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {renderExpiryStatusBadge(b.expiryDate, b.daysUntilExpiry, b.quantityRemaining, b.status)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTraceBatchId(b.id);
                                setTraceDrawerOpen(true);
                              }}
                              style={{
                                background: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                borderRadius: 4,
                                padding: '3px 8px',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <CompassOutlined /> Truy vết
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* KHUNG IN THẺ KHO NGUYÊN LIỆU CHUẨN A4 */}
      <InventoryPrintPortal
        title="THẺ KHO NGUYÊN LIỆU & LỊCH SỬ BIẾN ĐỘNG TỒN"
        subTitle={`Mã nguyên liệu: ${pCode} | Tên: ${pName} | Đơn vị: ${uName} | In lúc: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
        docCode={pCode}
        branchName={product?.branchName || localStorage.getItem('currentBranchName')}
        metaItems={[
          { label: 'Mã nguyên liệu', value: pCode },
          { label: 'Tên nguyên liệu', value: pName },
          { label: 'Nhóm mặt hàng', value: groupName },
          { label: 'Đơn vị tính cơ bản', value: uName },
          { label: 'Tồn kho hiện tại', value: `${stockQty.toLocaleString('vi-VN')} ${uName}` },
          { label: 'Giá vốn bình quân', value: `${Math.round(avgCost).toLocaleString('vi-VN')} đ` },
          { label: 'Định mức tồn tối thiểu', value: minStock > 0 ? `${minStock} ${uName}` : 'Không cài đặt' },
          { label: 'Tổng số bút toán thẻ kho', value: `${ledger.length} giao dịch` }
        ]}
        signatures={[
          { title: 'Người lập thẻ kho', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Thủ kho phụ trách', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Kế toán kho', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Quản lý duyệt', subtitle: '(Ký, ghi rõ họ tên)', name: '' }
        ]}
      >
        <div className="print-section-heading">I. LỊCH SỬ BIẾN ĐỘNG CỘNG TRỪ KHO (THẺ KHO TRUY VẾT) ({ledger.length})</div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '35px' }}>STT</th>
              <th style={{ width: '100px' }}>Mã chứng từ</th>
              <th style={{ width: '100px' }}>Nghiệp vụ</th>
              <th style={{ width: '120px' }}>Thời gian</th>
              <th style={{ width: '95px' }}>Giá vốn BQ (đ)</th>
              <th style={{ width: '90px' }}>Biến động tồn</th>
              <th style={{ width: '90px' }}>Tồn tích lũy</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr>
                <td colSpan={7} className="print-text-center">Chưa có lịch sử giao dịch thẻ kho cho mặt hàng này</td>
              </tr>
            ) : (
              ledger.map((lg, idx) => {
                const qDelta = Number(lg.quantityDelta || lg.delta || 0);
                const qBalance = Number(lg.runningQuantity || lg.balance || 0);
                const unitCost = Number(lg.runningAverageCost || lg.unitCost || 0);
                const timeStr = lg.businessDate || lg.postedAt || lg.createdAt;
                let methodStr = lg.methodName || lg.method || lg.type || 'Giao dịch';
                const docCode = lg.documentCode || lg.code || '';
                if (docCode.startsWith('NH')) methodStr = 'Nhập hàng';
                else if (docCode.startsWith('XH')) methodStr = 'Xuất hủy';
                else if (docCode.startsWith('THN') || docCode.startsWith('TH')) methodStr = 'Trả hàng NCC';
                else if (docCode.startsWith('CK')) methodStr = 'Chuyển hàng';
                else if (docCode.startsWith('KK')) methodStr = 'Kiểm kê';
                else if (docCode.startsWith('SX')) methodStr = 'Sản xuất';
                else if (docCode.startsWith('HD') || docCode.startsWith('PXBH')) methodStr = 'Bán hàng';

                return (
                  <tr key={idx}>
                    <td className="print-text-center">{idx + 1}</td>
                    <td className="print-font-bold">{lg.documentCode || lg.code || '---'}</td>
                    <td className="print-text-center">{methodStr}</td>
                    <td className="print-text-center">{timeStr ? dayjs(timeStr).format('DD/MM/YYYY HH:mm') : '---'}</td>
                    <td className="print-text-right">{Math.round(unitCost).toLocaleString('vi-VN')}</td>
                    <td className="print-text-right print-font-bold">
                      {qDelta > 0 ? `+${qDelta.toLocaleString('vi-VN')}` : qDelta.toLocaleString('vi-VN')}
                    </td>
                    <td className="print-text-right print-font-bold">{qBalance.toLocaleString('vi-VN')}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {batches.length > 0 && (
          <>
            <div className="print-section-heading">II. DANH SÁCH LÔ HÀNG VÀ HẠN SỬ DỤNG ({batches.length})</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>STT</th>
                  <th style={{ width: '110px' }}>Mã Lô</th>
                  <th style={{ width: '110px' }}>Ngày nhập</th>
                  <th style={{ width: '110px' }}>Hạn sử dụng</th>
                  <th style={{ width: '110px' }}>Tồn hiện tại</th>
                  <th>Ghi chú / Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b, idx) => (
                  <tr key={idx}>
                    <td className="print-text-center">{idx + 1}</td>
                    <td className="print-font-bold">{b.batchCode}</td>
                    <td className="print-text-center">{b.createdAt ? dayjs(b.createdAt).format('DD/MM/YYYY') : '---'}</td>
                    <td className="print-text-center">{b.expiryDate ? dayjs(b.expiryDate).format('DD/MM/YYYY') : '---'}</td>
                    <td className="print-text-right print-font-bold">
                      {Number(b.quantity || b.currentStock || 0).toLocaleString('vi-VN')} {uName}
                    </td>
                    <td>{b.statusText || 'Còn hạn'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </InventoryPrintPortal>

      {/* DRAWER TRUY VẾT LÔ HÀNG */}
      <BatchTraceabilityDrawer
        batchId={selectedTraceBatchId}
        open={traceDrawerOpen}
        onClose={() => {
          setTraceDrawerOpen(false);
          setSelectedTraceBatchId(null);
        }}
      />
    </div>
  );
};

export default Product_Detail;
