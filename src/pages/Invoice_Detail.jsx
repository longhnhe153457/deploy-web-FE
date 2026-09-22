import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  DollarCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  CoffeeOutlined,
  AppstoreOutlined,
  TagOutlined,
  CreditCardOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import { getDocumentById, getSaleById } from '../api/documentApi';
import { getOrderById } from '../api/orderApi';
import { ReferenceLink } from '../utils/documentNavHelper';

const Invoice_Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialInvoice = location.state?.invoice || location.state?.document || null;
  const [invoice, setInvoice] = useState(initialInvoice);
  const [loading, setLoading] = useState(!initialInvoice);
  const [printData, setPrintData] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const cleanId = String(id).replace(/^HD0*/i, '');
    try {
      setLoading(true);
      let data = null;

      // 1. Thử lấy từ Order API trước
      try {
        const orderRes = await getOrderById(cleanId);
        data = orderRes?.data || orderRes;
      } catch (err1) {
        // Tiếp tục thử nguồn tài liệu
      }

      // 2. Thử lấy từ SaleDocument API
      if (!data) {
        try {
          const saleRes = await getSaleById(cleanId);
          data = saleRes?.data || saleRes;
        } catch (err2) {}
      }

      // 3. Thử lấy từ Document API
      if (!data) {
        try {
          const docRes = await getDocumentById(cleanId);
          data = docRes?.data || docRes;
        } catch (err3) {}
      }

      if (data) {
        setInvoice(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết hóa đơn:', err);
      message.error('Không thể tải thông tin chi tiết hóa đơn.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const itemsList = useMemo(() => {
    if (!invoice) return [];
    const list = invoice.orderDetails || invoice.details || invoice.documentDetails || [];
    if (!Array.isArray(list)) return [];

    const validItems = list.filter((it) => {
      if (it.status === 'Cancelled' || it.status === 'Rejected' || it.cookingStatus === 'Cancelled') {
        return false;
      }
      return true;
    });

    return validItems.map((it, idx) => {
      const code = it.productCode || it.snapshotProductCode || it.code || (it.productId ? `SP${it.productId}` : `M${idx + 1}`);
      const name = it.productName || it.snapshotProductName || it.name || 'Món ăn';
      const unit = it.unitName || it.snapshotUnitName || 'Phần';
      const rawQty = Number(it.quantity || 1);
      const retQty = Number(it.returnedQuantity || 0);
      const qty = Math.max(1, rawQty - retQty);
      const price = Number(it.unitPrice ?? it.price ?? 0);
      const total = Number(it.totalPrice ?? (qty * price) ?? 0);
      const note = it.note || (it.notes && it.notes.join(', ')) || '';

      return {
        ...it,
        code,
        name,
        unit,
        qty,
        price,
        total,
        note
      };
    });
  }, [invoice]);

  const subtotal = itemsList.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = Number(invoice?.discountAmount || 0);
  const pointsUsed = Number(invoice?.pointsUsed || 0);
  const pointsDiscount = pointsUsed * 1000;
  const taxableAmount = Math.max(0, subtotal - discountAmount - pointsDiscount);
  const vatAmount = invoice?.vatAmount != null
    ? Number(invoice.vatAmount)
    : (invoice?.totalAmount ? Math.max(0, Math.round(Number(invoice.totalAmount) - taxableAmount)) : 0);
  const totalAmount = Number(invoice?.totalAmount ?? invoice?.total ?? (taxableAmount + vatAmount));

  const invoiceCode = invoice?.orderCode || invoice?.code || (invoice?.id ? `HD${invoice.id}` : (id ? (String(id).startsWith('HD') ? id : `HD${id}`) : ''));

  const handlePrint = () => {
    if (!invoice) return;
    const dateVal = invoice.orderDate || invoice.createdAt || invoice.date || new Date();
    const formattedDate = dayjs(dateVal).isValid() ? dayjs(dateVal).format('DD-MM-YYYY') : dayjs().format('DD-MM-YYYY');
    const rawCustomer = invoice.customerName || invoice.customer?.name || invoice.customer || 'Khách lẻ';
    const cleanCustomer = String(rawCustomer).trim().replace(/[\\/:*?"<>|]/g, '_');
    const printFileName = `MenuGO_HoaDon_${formattedDate}_${cleanCustomer}`;

    const originalTitle = document.title;
    document.title = printFileName;

    const handleAfterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);

    const docData = {
      orderCode: invoice.orderCode || invoice.code || invoiceCode,
      code: invoice.orderCode || invoice.code || invoiceCode,
      date: dateVal,
      createdAt: invoice.createdAt || invoice.orderDate,
      tableName: invoice.tableName || invoice.table?.name || 'Mang về',
      customer: rawCustomer,
      customerPhone: invoice.customerPhone || invoice.customer?.phone || '',
      createdByName: invoice.createdByName || invoice.cashierName || invoice.creatorName || 'Thu ngân',
      branchName: invoice.branchName || invoice.branch?.name || invoice.snapshotBranchName || 'Chi nhánh MenuGo',
      branchAddress: invoice.branchAddress || invoice.branch?.address || invoice.snapshotBranchAddress || ''
    };

    const items = itemsList.map((item, idx) => ({
      id: item.id || idx,
      productName: item.name || item.productName,
      unitPrice: item.price || item.unitPrice || 0,
      quantity: item.qty || item.quantity || 1,
      totalPrice: item.total || item.totalPrice || 0
    }));

    setPrintData({
      doc: docData,
      items,
      sub: subtotal,
      disc: discountAmount,
      pts: pointsDiscount,
      total: totalAmount
    });

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
    }, 180);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100vh', background: '#f8fafc', overflow: 'hidden', boxSizing: 'border-box' }}>
      {/* HEADER */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/inventory-management?tab=Invoice')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <ArrowLeftOutlined /> Quay lại danh sách
          </button>

          <div style={{ borderLeft: '1px solid #e2e8f0', height: 24 }} />

          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              Quản lý kho / Hóa đơn bán hàng / Chi tiết hóa đơn
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {invoiceCode}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 12, fontWeight: 700 }}>
                <CheckCircleOutlined /> Đã thanh toán
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
            <PrinterOutlined /> In hóa đơn
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* THẺ 1: BÀN & THỜI GIAN */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CoffeeOutlined style={{ color: '#ea580c' }} /> Bàn phục vụ & Thời gian
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Bàn / Khu vực:</span>
                <strong style={{ color: '#ea580c' }}>
                  {invoice?.tableName || invoice?.table?.name || 'Bàn mang về'}
                  {(invoice?.areaName || invoice?.table?.area?.name) ? ` (${invoice?.areaName || invoice?.table?.area?.name})` : ''}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Thời gian lập:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>
                  <CalendarOutlined style={{ marginRight: 4, color: '#94a3b8' }} />
                  {invoice?.orderDate || invoice?.createdAt || invoice?.date ? dayjs(invoice.orderDate || invoice.createdAt || invoice.date).format('DD/MM/YYYY HH:mm') : '---'}
                </span>
              </div>
            </div>
          </div>

          {/* THẺ 2: NHÂN SỰ & KHÁCH HÀNG */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: '#2563eb' }} /> Thu ngân & Khách hàng
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Thu ngân:</span>
                <strong style={{ color: '#0f172a' }}>{invoice?.createdByName || invoice?.cashierName || invoice?.creatorName || 'Thu ngân'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Khách hàng:</span>
                {invoice?.customerId || invoice?.customer?.id ? (
                  <ReferenceLink
                    id={invoice?.customerId || invoice?.customer?.id}
                    type="Customer"
                    navigate={navigate}
                    style={{ fontWeight: 600, color: '#2563eb' }}
                  >
                    {invoice?.customerName || invoice?.customer?.name || `KH #${invoice?.customerId || invoice?.customer?.id}`}
                    {(invoice?.customerPhone || invoice?.customer?.phone) ? ` (${invoice?.customerPhone || invoice?.customer?.phone})` : ''}
                  </ReferenceLink>
                ) : (
                  <span style={{ color: '#334155', fontWeight: 600 }}>
                    {invoice?.customerName || invoice?.partnerName || 'Khách lẻ'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Phương thức:</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>
                  <CreditCardOutlined style={{ marginRight: 4 }} />
                  {invoice?.paymentMethod === 'Transfer' || invoice?.paymentMethod === 2 || invoice?.paymentMethod === 'Chuyển khoản' ? 'Chuyển khoản' : 'Tiền mặt'}
                </span>
              </div>
            </div>
          </div>

          {/* THẺ 3: TỔNG TIỀN */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarCircleOutlined style={{ color: '#059669' }} /> Thanh toán hóa đơn
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tạm tính:</span>
                <span style={{ color: '#334155' }}>{Math.round(subtotal).toLocaleString('vi-VN')} đ</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>
                    Giảm giá {invoice?.voucherCode ? `(${invoice.voucherCode})` : ''}:
                  </span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>-{Math.round(discountAmount).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              {pointsUsed > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Trừ điểm tích lũy ({pointsUsed} đ):</span>
                  <span style={{ color: '#d97706', fontWeight: 600 }}>-{Math.round(pointsDiscount).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              {vatAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Thuế VAT (8%):</span>
                  <span style={{ color: '#334155', fontWeight: 600 }}>+{Math.round(vatAmount).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: 6 }}>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Tổng thanh toán:</span>
                <strong style={{ fontSize: 16, color: '#059669' }}>{Math.round(totalAmount).toLocaleString('vi-VN')} đ</strong>
              </div>
            </div>
          </div>
        </div>

        {/* BẢNG MÓN ĂN TRONG HÓA ĐƠN */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 12.5, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AppstoreOutlined /> Chi tiết món ăn / đồ uống ({itemsList.length})
          </div>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                  <th style={{ padding: '10px 12px' }}>Mã món</th>
                  <th style={{ padding: '10px 12px' }}>Tên món</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>ĐVT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Số lượng</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Đơn giá (đ)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thành tiền (đ)</th>
                  <th style={{ padding: '10px 12px' }}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {itemsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      Chưa có chi tiết món ăn trong hóa đơn
                    </td>
                  </tr>
                ) : (
                  itemsList.map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            onClick={() => navigate(`/product-catalog?search=${encodeURIComponent(item.code || item.name || '')}`)}
                            style={{
                              color: '#2563eb',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                            title="Nhấp để chuyển tới Danh mục món ăn"
                          >
                            {item.code}
                          </span>
                        </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{item.name}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>{item.unit}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{item.qty}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                        {Math.round(item.price).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        {Math.round(item.total).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.note}</td>
                    </tr>
                  ))
                )}
                <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={5} style={{ padding: '12px 14px', textAlign: 'right', color: '#1e293b', fontSize: 12 }}>
                    TỔNG CỘNG HÓA ĐƠN:
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 14, fontWeight: 900, color: '#059669' }}>
                    {Math.round(totalAmount).toLocaleString('vi-VN')} đ
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FORM IN HÓA ĐƠN CHUẨN INVOICE TABLE (POS 80MM) */}
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

export default Invoice_Detail;
