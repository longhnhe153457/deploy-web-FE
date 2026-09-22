import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  DollarCircleOutlined,
  ShopOutlined,
  InfoCircleOutlined,
  TagOutlined,
  PictureOutlined,
  ZoomInOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import { getImportById } from '../api/documentApi';
import { ReferenceLink } from '../utils/documentNavHelper';
import InventoryPrintPortal from '../components/inventory/common/InventoryPrintPortal';

const Import_Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Khởi tạo từ state chuyển trang nếu có
  const initialDoc = location.state?.document || null;
  const [doc, setDoc] = useState(initialDoc);
  const [loading, setLoading] = useState(!initialDoc);
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'cashflows' | 'ledgers' | 'images'
  const [previewImage, setPreviewImage] = useState(null);

  // Tải chi tiết phiếu nhập kho từ backend
  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getImportById(id);
      if (res) {
        setDoc(res);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết phiếu nhập:', err);
      message.error('Không thể tải thông tin chi tiết phiếu nhập kho.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Thông tin danh sách mặt hàng nhập
  const detailsList = useMemo(() => {
    if (!doc) return [];
    const list = doc.details || doc.documentDetails || [];
    return list.map((dt, idx) => {
      const pCode = dt.productCode || dt.snapshotProductCode || dt.currentProductCode || dt.code || `SP${idx + 1}`;
      const pName = dt.productName || dt.snapshotProductName || dt.currentProductName || dt.name || 'Sản phẩm';
      const uName = dt.unitName || dt.snapshotUnitName || dt.currentUnitName || 'Đơn vị';
      const qty = Number(dt.quantity || dt.receivedQuantity || 0);
      const price = Number(dt.unitPrice || dt.snapshotAvgCost || 0);
      const total = Number(dt.totalPrice || (qty * price) || 0);
      const batchCode = dt.batchCode || dt.batchCodeSnapshot || '---';
      const expDate = dt.expiryDate || dt.expiryDateSnapshot ? dayjs(dt.expiryDate || dt.expiryDateSnapshot).format('DD/MM/YYYY') : '---';

      return {
        ...dt,
        pCode,
        pName,
        uName,
        qty,
        price,
        total,
        batchCode,
        expDate
      };
    });
  }, [doc]);

  // Trạng thái phiếu
  const isPending = doc?.status === 0 || doc?.status === 'Pending' || doc?.status === 'PENDING';
  const isCancelled = doc?.status === 2 || doc?.status === 'Cancelled' || doc?.status === 'CANCELLED';

  const renderStatusBadge = () => {
    if (isPending) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', fontSize: 12, fontWeight: 700 }}>
          <ClockCircleOutlined /> Lưu tạm
        </span>
      );
    }
    if (isCancelled) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 12, fontWeight: 700 }}>
          <CloseCircleOutlined /> Đã hủy
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 12, fontWeight: 700 }}>
        <CheckCircleOutlined /> Hoàn thành
      </span>
    );
  };

  const totalAmount = Number(doc?.totalAmount || 0);
  const amountPaid = Number(doc?.amountPaid || 0);
  const amountDue = Number(doc?.amountDue ?? (totalAmount - amountPaid));

  const handlePrint = () => {
    const originalTitle = document.title;
    const docDate = dayjs(doc?.orderDate || doc?.createdAt).format('DDMMYYYY');
    const partnerClean = (doc?.partnerName || doc?.snapshotPartnerName || 'NCC').replace(/[^a-zA-Z0-9À-ỹ]/g, '_');
    document.title = `MenuGO_PhieuNhap_${doc?.code || id}_${docDate}_${partnerClean}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh', background: '#f8fafc', overflow: 'hidden', boxSizing: 'border-box' }}>
      {/* THANH ĐIỀU HƯỚNG VÀ TIÊU ĐỀ */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/inventory-management?tab=Import')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          >
            <ArrowLeftOutlined /> Quay lại danh sách
          </button>

          <div style={{ borderLeft: '1px solid #e2e8f0', height: 24 }} />

          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              Quản lý kho / Nhập hàng / Chi tiết phiếu nhập
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {doc?.code || 'Phiếu nhập kho'}
              </span>
              {renderStatusBadge()}
            </div>
          </div>
        </div>

        {/* CÁC THAO TÁC HÀNH ĐỘNG */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <PrinterOutlined /> In phiếu
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

      {/* NỘI DUNG CUỘN CHÍNH */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* TỔNG QUAN VÀ THỐNG KÊ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* THẺ 1: THÔNG TIN PHIẾU VÀ ĐỐI TÁC */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShopOutlined style={{ color: '#e8442a' }} /> Thông tin Nhà cung cấp & Chi nhánh
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Nhà cung cấp:</span>
                {doc?.partnerId ? (
                  <ReferenceLink id={doc.partnerId} type="Partner" navigate={navigate} style={{ fontWeight: 700 }}>
                    {doc?.partnerName || doc?.snapshotPartnerName || `NCC #${doc.partnerId}`}
                  </ReferenceLink>
                ) : (
                  <strong style={{ color: '#0f172a' }}>{doc?.partnerName || doc?.snapshotPartnerName || 'Nhà cung cấp'}</strong>
                )}
              </div>
              {doc?.parentDocumentId && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Chứng từ tham chiếu:</span>
                  <ReferenceLink
                    code={doc?.parentDocumentCode}
                    id={doc?.parentDocumentId}
                    navigate={navigate}
                    style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Chi nhánh nhập:</span>
                <span style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <EnvironmentOutlined style={{ color: '#e8442a' }} />
                  {doc?.branchName || doc?.snapshotBranchName || 'Chi nhánh trung tâm'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Mã chứng từ:</span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>{doc?.code}</span>
              </div>
            </div>
          </div>

          {/* THẺ 2: NHÂN SỰ & THỜI GIAN */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: '#2563eb' }} /> Nhân sự & Thời gian
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Người lập phiếu:</span>
                <strong style={{ color: '#0f172a' }}>{doc?.creatorName || doc?.snapshotCreatedByName || doc?.creator || 'Quản lý'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Ngày lập:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>
                  <CalendarOutlined style={{ marginRight: 4, color: '#94a3b8' }} />
                  {doc?.orderDate || doc?.createdDate || doc?.createdAt ? dayjs(doc.orderDate || doc.createdDate || doc.createdAt).format('DD/MM/YYYY HH:mm') : '---'}
                </span>
              </div>
              {doc?.snapshotPostedByName && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Người chốt:</span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>
                    {doc.snapshotPostedByName} ({dayjs(doc.postedAt).format('DD/MM/YYYY HH:mm')})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* THẺ 3: TÀI CHÍNH THANH TOÁN */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarCircleOutlined style={{ color: '#059669' }} /> Tình trạng thanh toán
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tổng tiền hàng:</span>
                <strong style={{ color: '#0f172a', fontSize: 13 }}>{Math.round(totalAmount).toLocaleString('vi-VN')} đ</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Đã thanh toán:</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>{Math.round(amountPaid).toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Còn nợ NCC:</span>
                <span style={{ color: amountDue > 0 ? '#dc2626' : '#059669', fontWeight: 800 }}>
                  {Math.round(amountDue).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GHI CHÚ NẾU CÓ */}
        {doc?.note && (
          <div style={{ padding: '10px 16px', borderRadius: 6, background: '#fff7ed', border: '1px solid #ffedd5', color: '#c2410c', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined />
            <span><strong>Ghi chú:</strong> {doc.note}</span>
          </div>
        )}

        {/* BẢNG CHI TIẾT SẢN PHẨM NHẬP KHO */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* TAB HEADER */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 16px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              style={{
                padding: '12px 16px',
                fontSize: 12.5,
                fontWeight: 700,
                color: activeTab === 'products' ? '#e8442a' : '#64748b',
                borderBottom: activeTab === 'products' ? '2px solid #e8442a' : '2px solid transparent',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <AppstoreOutlined /> Chi tiết mặt hàng nhập ({detailsList.length})
            </button>

            {doc?.cashFlows && doc.cashFlows.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('cashflows')}
                style={{
                  padding: '12px 16px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: activeTab === 'cashflows' ? '#e8442a' : '#64748b',
                  borderBottom: activeTab === 'cashflows' ? '2px solid #e8442a' : '2px solid transparent',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <DollarCircleOutlined /> Lịch sử thanh toán ({doc.cashFlows.length})
              </button>
            )}

            {doc?.inventoryLedgers && doc.inventoryLedgers.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('ledgers')}
                style={{
                  padding: '12px 16px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: activeTab === 'ledgers' ? '#e8442a' : '#64748b',
                  borderBottom: activeTab === 'ledgers' ? '2px solid #e8442a' : '2px solid transparent',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <FileTextOutlined /> Lịch sử sổ kho ({doc.inventoryLedgers.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('images')}
              style={{
                padding: '12px 16px',
                fontSize: 12.5,
                fontWeight: 700,
                color: activeTab === 'images' ? '#e8442a' : '#64748b',
                borderBottom: activeTab === 'images' ? '2px solid #e8442a' : '2px solid transparent',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <PictureOutlined /> Hình ảnh {(() => {
                let imgs = doc?.imageUrls || [];
                if (typeof imgs === 'string') {
                  try { imgs = JSON.parse(imgs); } catch(e) { imgs = imgs ? [imgs] : []; }
                }
                return Array.isArray(imgs) && imgs.length > 0 ? `(${imgs.length})` : '';
              })()}
            </button>
          </div>

          {/* TAB 1: DANH SÁCH MẶT HÀNG */}
          {activeTab === 'products' && (
            <div style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                    <th style={{ padding: '10px 12px' }}>Mã SP</th>
                    <th style={{ padding: '10px 12px' }}>Tên sản phẩm</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Số lượng</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Đơn giá nhập (đ)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thành tiền (đ)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Lô hàng</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Hạn sử dụng</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        Chưa có sản phẩm nào trong phiếu nhập
                      </td>
                    </tr>
                  ) : (
                    detailsList.map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            onClick={() => navigate(`/inventory-management?tab=Product&search=${encodeURIComponent(item.pCode || item.code || '')}`)}
                            style={{
                              color: '#2563eb',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                            title="Nhấp để chuyển tới Quản lý tồn kho hàng hóa"
                          >
                            {item.pCode}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{item.pName}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>{item.uName}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {item.qty.toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                          {Math.round(item.price).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#e8442a' }}>
                          {Math.round(item.total).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#334155' }}>
                          <span style={{ fontFamily: 'monospace' }}>{item.batchCode}</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{item.expDate}</td>
                      </tr>
                    ))
                  )}
                  {/* TỔNG KẾT */}
                  <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={5} style={{ padding: '12px 14px', textAlign: 'right', color: '#1e293b', fontSize: 12 }}>
                      TỔNG GIÁ TRỊ NHẬP HÀNG:
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13.5, fontWeight: 900, color: '#e8442a' }}>
                      {Math.round(totalAmount).toLocaleString('vi-VN')} đ
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: LỊCH SỬ THANH TOÁN */}
          {activeTab === 'cashflows' && doc?.cashFlows && (
            <div style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                    <th style={{ padding: '10px 12px' }}>Mã phiếu chi</th>
                    <th style={{ padding: '10px 12px' }}>Thời gian</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Số tiền (đ)</th>
                    <th style={{ padding: '10px 12px' }}>Phương thức</th>
                    <th style={{ padding: '10px 12px' }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.cashFlows.map((cf, idx) => (
                    <tr key={cf.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#e8442a' }}>{cf.code}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        {cf.businessDate ? dayjs(cf.businessDate).format('DD/MM/YYYY HH:mm') : '---'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        {Math.round(Number(cf.totalAmount || 0)).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>
                        {cf.paymentMethod === 'Cash' || cf.paymentMethod === 1 ? 'Tiền mặt' : 'Chuyển khoản'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{cf.note || '---'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: LỊCH SỬ SỔ KHO */}
          {activeTab === 'ledgers' && doc?.inventoryLedgers && (
            <div style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                    <th style={{ padding: '10px 12px' }}>Thời gian ghi sổ</th>
                    <th style={{ padding: '10px 12px' }}>Tên sản phẩm</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Đơn vị</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Số lượng nhập</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tồn kho sau nhập</th>
                    <th style={{ padding: '10px 12px' }}>Người ghi sổ</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.inventoryLedgers.map((lg, idx) => (
                    <tr key={lg.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        {lg.postedAt ? dayjs(lg.postedAt).format('DD/MM/YYYY HH:mm') : '---'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                        {lg.snapshotProductName}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>
                        {lg.snapshotUnitName}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        +{Number(lg.quantityDelta || 0).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {Number(lg.runningQuantity || 0).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155' }}>
                        {lg.snapshotPostedByName || 'Quản lý'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: HÌNH ẢNH */}
          {activeTab === 'images' && (() => {
            let imgs = doc?.imageUrls || [];
            if (typeof imgs === 'string') {
              try {
                imgs = JSON.parse(imgs);
              } catch (e) {
                imgs = imgs ? [imgs] : [];
              }
            }
            if (!Array.isArray(imgs)) imgs = [];

            return (
              <div style={{ padding: '20px 24px' }}>
                {imgs.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                    <PictureOutlined style={{ fontSize: 40, marginBottom: 10, color: '#cbd5e1' }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>Không có ảnh</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Chưa có hình ảnh biên lai hoặc bằng chứng chất lượng hàng nào cho phiếu nhập này.</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 16 }}>
                      Danh sách hình ảnh chứng từ ({imgs.length}):
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 140px))',
                        gap: 16
                      }}
                    >
                      {imgs.map((url, imgIdx) => (
                        <div
                          key={imgIdx}
                          onClick={() => setPreviewImage(url)}
                          style={{
                            width: 140,
                            aspectRatio: '1 / 1',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            position: 'relative',
                            background: '#f1f5f9',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 12px -2px rgba(0,0,0,0.12)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                          }}
                          title="Bấm để phóng to xem chi tiết"
                        >
                          <img
                            src={url}
                            alt={`Hình ảnh ${imgIdx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.25)',
                              opacity: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: 20,
                              transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                          >
                            <ZoomInOutlined />
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 6,
                              left: 6,
                              background: 'rgba(15, 23, 42, 0.75)',
                              color: '#ffffff',
                              fontSize: 10.5,
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 4,
                              pointerEvents: 'none'
                            }}
                          >
                            Ảnh {imgIdx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* KHUNG IN PHIẾU NHẬP KHO CHUẨN A4 */}
      <InventoryPrintPortal
        title="PHIẾU NHẬP KHO NGUYÊN VẬT LIỆU"
        subTitle={`Mã chứng từ: ${doc?.code || '---'} | Ngày lập: ${doc?.orderDate || doc?.createdAt ? dayjs(doc.orderDate || doc.createdAt).format('DD/MM/YYYY HH:mm') : '---'} | Trạng thái: ${doc?.status === 1 ? 'Hoàn thành' : 'Đã hủy'}`}
        docCode={doc?.code}
        branchName={doc?.branchName || doc?.snapshotBranchName}
        metaItems={[
          { label: 'Nhà cung cấp', value: doc?.partnerName || doc?.snapshotPartnerName },
          { label: 'Chứng từ tham chiếu', value: doc?.parentDocumentCode || 'Không có' },
          { label: 'Người lập phiếu', value: doc?.creatorName || doc?.snapshotCreatedByName || doc?.creator },
          { label: 'Chi nhánh nhập', value: doc?.branchName || doc?.snapshotBranchName },
          { label: 'Tổng tiền hàng', value: `${Math.round(totalAmount).toLocaleString('vi-VN')} đ` },
          { label: 'Đã thanh toán', value: `${Math.round(amountPaid).toLocaleString('vi-VN')} đ` },
          { label: 'Còn nợ NCC', value: `${Math.round(amountDue).toLocaleString('vi-VN')} đ` },
          { label: 'Ghi chú', value: doc?.note || 'Không có ghi chú' }
        ]}
        signatures={[
          { title: 'Người lập phiếu', subtitle: '(Ký, ghi rõ họ tên)', name: doc?.creatorName || doc?.snapshotCreatedByName || '' },
          { title: 'Đại diện NCC / Giao hàng', subtitle: '(Ký, ghi rõ họ tên)', name: doc?.partnerName || doc?.snapshotPartnerName || '' },
          { title: 'Thủ kho nhận hàng', subtitle: '(Ký, ghi rõ họ tên)', name: doc?.snapshotPostedByName || '' },
          { title: 'Kế toán / Quản lý duyệt', subtitle: '(Ký, ghi rõ họ tên)', name: '' }
        ]}
      >
        <div className="print-section-heading">I. DANH SÁCH NGUYÊN LIỆU NHẬP KHO ({detailsList.length})</div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '35px' }}>STT</th>
              <th style={{ width: '90px' }}>Mã nguyên liệu</th>
              <th>Tên nguyên liệu</th>
              <th style={{ width: '55px' }}>ĐVT</th>
              <th style={{ width: '65px' }}>Số lượng</th>
              <th style={{ width: '85px' }}>Đơn giá (đ)</th>
              <th style={{ width: '95px' }}>Thành tiền (đ)</th>
              <th style={{ width: '80px' }}>Lô hàng</th>
              <th style={{ width: '85px' }}>Hạn dùng</th>
            </tr>
          </thead>
          <tbody>
            {detailsList.map((item, idx) => (
              <tr key={idx}>
                <td className="print-text-center">{idx + 1}</td>
                <td className="print-font-bold">{item.pCode}</td>
                <td>{item.pName}</td>
                <td className="print-text-center">{item.uName}</td>
                <td className="print-text-right print-font-bold">{item.qty?.toLocaleString('vi-VN')}</td>
                <td className="print-text-right">{Math.round(item.price || 0).toLocaleString('vi-VN')}</td>
                <td className="print-text-right print-font-bold">{Math.round(item.total || 0).toLocaleString('vi-VN')}</td>
                <td className="print-text-center">{item.batchCode || '---'}</td>
                <td className="print-text-center">{item.expiryDate ? dayjs(item.expiryDate).format('DD/MM/YYYY') : '---'}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={6} className="print-text-right print-font-bold">TỔNG TIỀN HÀNG:</td>
              <td className="print-text-right print-font-bold">{Math.round(totalAmount).toLocaleString('vi-VN')} đ</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>

        {doc?.inventoryLedgers && doc.inventoryLedgers.length > 0 && (
          <>
            <div className="print-section-heading">II. LỊCH SỬ BIẾN ĐỘNG SỔ KHO / CỘNG KHO TRUY VẾT ({doc.inventoryLedgers.length})</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>STT</th>
                  <th>Tên nguyên liệu</th>
                  <th style={{ width: '90px' }}>Mã lô</th>
                  <th style={{ width: '50px' }}>ĐVT</th>
                  <th style={{ width: '80px' }}>Biến động</th>
                  <th style={{ width: '85px' }}>Tồn sau nhập</th>
                  <th style={{ width: '110px' }}>Thời điểm chốt</th>
                  <th style={{ width: '90px' }}>Người ghi sổ</th>
                </tr>
              </thead>
              <tbody>
                {doc.inventoryLedgers.map((lg, idx) => (
                  <tr key={idx}>
                    <td className="print-text-center">{idx + 1}</td>
                    <td className="print-font-bold">{lg.snapshotProductName}</td>
                    <td className="print-text-center">{lg.snapshotBatchCode || '---'}</td>
                    <td className="print-text-center">{lg.snapshotUnitName || '---'}</td>
                    <td className="print-text-right print-font-bold">+{Number(lg.quantityDelta || 0).toLocaleString('vi-VN')}</td>
                    <td className="print-text-right">{Number(lg.runningQuantity || 0).toLocaleString('vi-VN')}</td>
                    <td className="print-text-center">{lg.postedAt ? dayjs(lg.postedAt).format('DD/MM/YYYY HH:mm') : '---'}</td>
                    <td>{lg.snapshotPostedByName || 'Quản lý'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {doc?.cashFlows && doc.cashFlows.length > 0 && (
          <>
            <div className="print-section-heading">III. LỊCH SỬ THANH TOÁN TIỀN CHO NHÀ CUNG CẤP ({doc.cashFlows.length})</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>STT</th>
                  <th style={{ width: '110px' }}>Mã phiếu chi</th>
                  <th style={{ width: '110px' }}>Thời gian</th>
                  <th style={{ width: '100px' }}>Số tiền (đ)</th>
                  <th style={{ width: '95px' }}>Phương thức</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {doc.cashFlows.map((cf, idx) => (
                  <tr key={idx}>
                    <td className="print-text-center">{idx + 1}</td>
                    <td className="print-font-bold">{cf.code}</td>
                    <td className="print-text-center">{cf.businessDate ? dayjs(cf.businessDate).format('DD/MM/YYYY HH:mm') : '---'}</td>
                    <td className="print-text-right print-font-bold">{Math.round(Number(cf.totalAmount || 0)).toLocaleString('vi-VN')}</td>
                    <td className="print-text-center">{cf.paymentMethod === 'Cash' || cf.paymentMethod === 1 ? 'Tiền mặt' : 'Chuyển khoản'}</td>
                    <td>{cf.note || '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </InventoryPrintPortal>

      {/* POPUP PHÓNG TO ẢNH (LIGHTBOX) */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            title="Đóng"
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.25)',
              border: 'none',
              color: '#ffffff',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            }}
          >
            <CloseOutlined />
          </button>
          <img
            src={previewImage}
            alt="Phóng to hình ảnh"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 6,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Import_Detail;
