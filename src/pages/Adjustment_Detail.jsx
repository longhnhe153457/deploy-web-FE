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
  RiseOutlined,
  FallOutlined,
  CheckOutlined,
  DeleteOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import {
  getCostAdjustmentById,
  completeCostAdjustmentDocument,
  deleteCostAdjustmentPendingDocument
} from '../api/documentApi';
import { ReferenceLink } from '../utils/documentNavHelper';
import InventoryPrintPortal from '../components/inventory/common/InventoryPrintPortal';

const Adjustment_Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Khởi tạo state từ dữ liệu chuyển trang nếu có
  const initialDoc = location.state?.document || null;
  const [doc, setDoc] = useState(initialDoc);
  const [loading, setLoading] = useState(!initialDoc);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'ledger'

  // Tải chi tiết phiếu điều chỉnh giá vốn từ backend
  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getCostAdjustmentById(id);
      if (res) {
        setDoc(res);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết phiếu điều chỉnh giá vốn:', err);
      message.error('Không thể tải thông tin chi tiết phiếu điều chỉnh giá vốn.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Xử lý chốt phiếu điều chỉnh giá vốn (nếu là phiếu lưu tạm)
  const handleComplete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn chốt và áp dụng giá vốn mới cho phiếu này?')) {
      return;
    }
    try {
      setActionLoading(true);
      await completeCostAdjustmentDocument(id);
      message.success('Chốt phiếu điều chỉnh giá vốn thành công.');
      await fetchDetail();
    } catch (err) {
      console.error('Lỗi khi chốt phiếu điều chỉnh:', err);
      message.error(err?.response?.data?.message || 'Không thể chốt phiếu điều chỉnh.');
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý hủy phiếu lưu tạm
  const handleDelete = async () => {
    const reason = window.prompt('Nhập lý do hủy phiếu điều chỉnh:');
    if (reason === null) return;
    try {
      setActionLoading(true);
      await deleteCostAdjustmentPendingDocument(id, reason || 'Hủy phiếu từ chi tiết');
      message.success('Đã hủy phiếu điều chỉnh giá vốn.');
      navigate('/inventory-management?tab=Adjustment');
    } catch (err) {
      console.error('Lỗi khi hủy phiếu điều chỉnh:', err);
      message.error(err?.response?.data?.message || 'Không thể hủy phiếu điều chỉnh.');
    } finally {
      setActionLoading(false);
    }
  };

  // Tính toán số liệu chênh lệch và tổng giá trị điều chỉnh
  const { detailsList, grandTotalDelta, totalItemCount } = useMemo(() => {
    if (!doc) return { detailsList: [], grandTotalDelta: 0, totalItemCount: 0 };
    const list = doc.details || doc.documentDetails || [];
    let sumDelta = 0;

    const computed = list.map((dt, idx) => {
      const pCode = dt.productCode || dt.snapshotProductCode || dt.currentProductCode || dt.code || `SP${idx + 1}`;
      const pName = dt.productName || dt.snapshotProductName || dt.currentProductName || dt.name || 'Sản phẩm';
      const uName = dt.unitName || dt.snapshotUnitName || dt.currentUnitName || 'Đơn vị';

      const stockQty = Number(dt.currentStockQuantity ?? dt.bInventory?.quantity ?? dt.systemQuantity ?? 0);
      const newPrice = Number(dt.newAvgCost ?? dt.snapshotAvgCost ?? dt.unitPrice ?? 0);

      let totalDelta = 0;
      let oldPrice = 0;
      let unitDelta = 0;

      if (dt.adjustedCostDelta != null && dt.adjustedCostDelta !== undefined) {
        totalDelta = Number(dt.adjustedCostDelta);
        unitDelta = stockQty > 0 ? totalDelta / stockQty : 0;
        oldPrice = newPrice - unitDelta;
      } else {
        oldPrice = Number(dt.oldCost || dt.bInventory?.avg || 0);
        unitDelta = newPrice - oldPrice;
        totalDelta = unitDelta * stockQty;
      }

      sumDelta += totalDelta;

      return {
        ...dt,
        pCode,
        pName,
        uName,
        stockQty,
        oldPrice,
        newPrice,
        unitDelta,
        totalDelta
      };
    });

    return {
      detailsList: computed,
      grandTotalDelta: sumDelta,
      totalItemCount: computed.length
    };
  }, [doc]);

  // Trạng thái phiếu
  const isPending = doc?.status === 0 || doc?.status === 'Pending' || doc?.status === 'PENDING';
  const isCancelled = doc?.status === 2 || doc?.status === 'Cancelled' || doc?.status === 'CANCELLED';
  const isCompleted = !isPending && !isCancelled;

  const renderStatusBadge = () => {
    if (isPending) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 6,
            background: '#ffedd5',
            color: '#c2410c',
            border: '1px solid #fed7aa',
            fontSize: 12,
            fontWeight: 700
          }}
        >
          <ClockCircleOutlined /> Lưu tạm
        </span>
      );
    }
    if (isCancelled) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 6,
            background: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            fontSize: 12,
            fontWeight: 700
          }}
        >
          <CloseCircleOutlined /> Đã hủy
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 6,
          background: '#ecfdf5',
          color: '#059669',
          border: '1px solid #a7f3d0',
          fontSize: 12,
          fontWeight: 700
        }}
      >
        <CheckCircleOutlined /> Hoàn thành
      </span>
    );
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const docDate = dayjs(doc?.orderDate || doc?.createdDate || doc?.createdAt).format('DDMMYYYY');
    document.title = `MenuGO_DieuChinhGiaVon_${doc?.code || id}_${docDate}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxHeight: '100vh',
        background: '#f8fafc',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* THANH ĐIỀU HƯỚNG VÀ TIÊU ĐỀ TRANG */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/inventory-management?tab=Adjustment')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            <ArrowLeftOutlined /> Quay lại danh sách
          </button>

          <div style={{ borderLeft: '1px solid #e2e8f0', height: 24 }} />

          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              Quản lý kho / Điều chỉnh giá vốn / Chi tiết phiếu
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '0.2px' }}>
                {doc?.code || 'Phiếu điều chỉnh giá vốn'}
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <PrinterOutlined /> In phiếu
          </button>

          <button
            type="button"
            onClick={fetchDetail}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#334155',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <ReloadOutlined spin={loading} /> Làm mới
          </button>

          {isPending && (
            <>
              <button
                type="button"
                onClick={handleComplete}
                disabled={actionLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 16px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                }}
              >
                <CheckOutlined /> Chốt phiếu điều chỉnh
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#dc2626',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                <DeleteOutlined /> Hủy phiếu
              </button>
            </>
          )}
        </div>
      </div>

      {/* NỘI DUNG CUỘN CHÍNH */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        {/* KHỐI THÔNG TIN TỔNG QUAN VÀ THỐNG KÊ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* THẺ 1: THÔNG TIN CHỨNG TỪ */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileTextOutlined style={{ color: '#e8442a' }} /> Thông tin phiếu điều chỉnh
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Mã phiếu:</span>
                <strong style={{ color: '#0f172a' }}>{doc?.code || '---'}</strong>
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
                <span style={{ color: '#64748b' }}>Trạng thái:</span>
                <div>{renderStatusBadge()}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Chi nhánh áp dụng:</span>
                <span style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <EnvironmentOutlined style={{ color: '#e8442a' }} />
                  {doc?.branchName || doc?.snapshotBranchName || 'MenuGo Hà Nội'}
                </span>
              </div>
            </div>
          </div>

          {/* THẺ 2: NHÂN SỰ & THỜI GIAN GHI NHẬN */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: '#2563eb' }} /> Nhân sự & Thời gian
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Người tạo:</span>
                <strong style={{ color: '#0f172a' }}>
                  {doc?.creatorName || doc?.snapshotCreatedByName || doc?.creator || 'Duy'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Ngày lập chứng từ:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>
                  <CalendarOutlined style={{ marginRight: 4, color: '#94a3b8' }} />
                  {doc?.orderDate || doc?.createdDate || doc?.createdAt
                    ? dayjs(doc.orderDate || doc.createdDate || doc.createdAt).format('DD/MM/YYYY HH:mm')
                    : '---'}
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
              {doc?.snapshotDeletedByName && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Người hủy:</span>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>
                    {doc.snapshotDeletedByName} ({dayjs(doc.deletedAt).format('DD/MM/YYYY HH:mm')})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* THẺ 3: BIẾN ĐỘNG GIÁ TRỊ TỒN KHO */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              {grandTotalDelta >= 0 ? (
                <RiseOutlined style={{ color: '#059669' }} />
              ) : (
                <FallOutlined style={{ color: '#dc2626' }} />
              )}
              Tổng biến động giá vốn tồn kho
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Số lượng mặt hàng:</span>
                <strong style={{ color: '#0f172a' }}>{totalItemCount} sản phẩm</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Tổng giá trị thay đổi:</span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: grandTotalDelta > 0 ? '#059669' : grandTotalDelta < 0 ? '#dc2626' : '#64748b'
                  }}
                >
                  {grandTotalDelta > 0
                    ? `+${Math.round(grandTotalDelta).toLocaleString('vi-VN')} đ`
                    : `${Math.round(grandTotalDelta).toLocaleString('vi-VN')} đ`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Trạng thái sổ kho:</span>
                <span style={{ fontWeight: 600, color: isCompleted ? '#059669' : '#64748b' }}>
                  {isCompleted ? 'Đã cập nhật giá vốn & sổ kho' : isPending ? 'Chưa áp dụng vào sổ kho' : 'Đã hủy'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GHI CHÚ CHỨNG TỪ NẾU CÓ */}
        {doc?.note && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 6,
              background: '#fff7ed',
              border: '1px solid #ffedd5',
              color: '#c2410c',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <InfoCircleOutlined />
            <span>
              <strong>Ghi chú:</strong> {doc.note}
            </span>
          </div>
        )}

        {/* LÝ DO HỦY PHIẾU NẾU CÓ */}
        {doc?.deleteNote && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 6,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <CloseCircleOutlined />
            <span>
              <strong>Lý do hủy phiếu:</strong> {doc.deleteNote}
            </span>
          </div>
        )}

        {/* BẢNG CHI TIẾT SẢN PHẨM ĐIỀU CHỈNH */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* TAB HEADER NỘI DUNG */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              padding: '0 16px'
            }}
          >
            <div style={{ display: 'flex', gap: 16 }}>
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                style={{
                  padding: '12px 14px',
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
                <AppstoreOutlined /> Chi tiết mặt hàng điều chỉnh ({totalItemCount})
              </button>

              {doc?.inventoryLedgers && doc.inventoryLedgers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('ledger')}
                  style={{
                    padding: '12px 14px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: activeTab === 'ledger' ? '#e8442a' : '#64748b',
                    borderBottom: activeTab === 'ledger' ? '2px solid #e8442a' : '2px solid transparent',
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
            </div>
          </div>

          {/* NỘI DUNG TAB: DANH SÁCH SẢN PHẨM */}
          {activeTab === 'products' && (
            <div style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                  <tr
                    style={{
                      background: '#f1f5f9',
                      borderBottom: '1px solid #cbd5e1',
                      color: '#334155',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: 10.5
                    }}
                  >
                    <th style={{ padding: '10px 12px' }}>Mã SP</th>
                    <th style={{ padding: '10px 12px' }}>Tên sản phẩm</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tồn hiện tại</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Giá vốn cũ (đ)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Giá vốn mới (đ)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Chênh lệch đ/vị</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tổng giá trị thay đổi (đ)</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        Chưa có thông tin sản phẩm trong phiếu điều chỉnh
                      </td>
                    </tr>
                  ) : (
                    detailsList.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 1 ? '#fafafa' : '#ffffff',
                          transition: 'background 0.15s ease'
                        }}
                      >
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
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                          {item.pName}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                          {item.uName}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: item.stockQty <= 0 ? '#ef4444' : '#334155'
                          }}
                        >
                          {item.stockQty.toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                          {Math.round(item.oldPrice).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {Math.round(item.newPrice).toLocaleString('vi-VN')} đ
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: item.unitDelta > 0 ? '#059669' : item.unitDelta < 0 ? '#dc2626' : '#64748b'
                          }}
                        >
                          {item.unitDelta > 0
                            ? `+${Math.round(item.unitDelta).toLocaleString('vi-VN')}`
                            : Math.round(item.unitDelta).toLocaleString('vi-VN')}{' '}
                          đ
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            fontWeight: 800,
                            color: item.totalDelta > 0 ? '#059669' : item.totalDelta < 0 ? '#dc2626' : '#64748b'
                          }}
                        >
                          {item.totalDelta > 0
                            ? `+${Math.round(item.totalDelta).toLocaleString('vi-VN')}`
                            : Math.round(item.totalDelta).toLocaleString('vi-VN')}{' '}
                          đ
                        </td>
                      </tr>
                    ))
                  )}

                  {/* DÒNG TỔNG KẾT TỔNG GIÁ TRỊ THAY ĐỔI TỒN KHO */}
                  <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={7} style={{ padding: '12px 14px', textAlign: 'right', color: '#1e293b', fontSize: 12 }}>
                      TỔNG GIÁ TRỊ THAY ĐỔI TỒN KHO:
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        textAlign: 'right',
                        fontSize: 13.5,
                        fontWeight: 900,
                        color: grandTotalDelta > 0 ? '#059669' : grandTotalDelta < 0 ? '#dc2626' : '#64748b'
                      }}
                    >
                      {grandTotalDelta > 0
                        ? `+${Math.round(grandTotalDelta).toLocaleString('vi-VN')}`
                        : Math.round(grandTotalDelta).toLocaleString('vi-VN')}{' '}
                      đ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* NỘI DUNG TAB: LỊCH SỬ SỔ KHO */}
          {activeTab === 'ledger' && doc?.inventoryLedgers && (
            <div style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                  <tr
                    style={{
                      background: '#f1f5f9',
                      borderBottom: '1px solid #cbd5e1',
                      color: '#334155',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: 10.5
                    }}
                  >
                    <th style={{ padding: '10px 12px' }}>Thời gian</th>
                    <th style={{ padding: '10px 12px' }}>Sản phẩm</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Đơn vị</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tồn kho lúc chốt</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Giá vốn mới ghi nhận</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Biến động giá trị tồn</th>
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
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {Number(lg.runningQuantity || 0).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {Math.round(Number(lg.runningAverageCost || lg.unitCost || 0)).toLocaleString('vi-VN')} đ
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: 800,
                          color: Number(lg.inventoryValueDelta) > 0 ? '#059669' : Number(lg.inventoryValueDelta) < 0 ? '#dc2626' : '#64748b'
                        }}
                      >
                        {Number(lg.inventoryValueDelta) > 0
                          ? `+${Math.round(Number(lg.inventoryValueDelta)).toLocaleString('vi-VN')}`
                          : Math.round(Number(lg.inventoryValueDelta)).toLocaleString('vi-VN')}{' '}
                        đ
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
        </div>
      </div>

      {/* KHUNG IN PHIẾU ĐIỀU CHỈNH GIÁ VỐN CHUẨN A4 */}
      <InventoryPrintPortal
        title="PHIẾU ĐIỀU CHỈNH GIÁ VỐN NGUYÊN VẬT LIỆU"
        subTitle={`Mã phiếu: ${doc?.code || '---'} | Ngày lập: ${doc?.orderDate || doc?.createdDate || doc?.createdAt ? dayjs(doc.orderDate || doc.createdDate || doc.createdAt).format('DD/MM/YYYY HH:mm') : '---'} | Trạng thái: ${doc?.status === 1 ? 'Hoàn thành' : (isPending ? 'Lưu tạm' : 'Đã hủy')}`}
        docCode={doc?.code}
        branchName={doc?.branchName || doc?.snapshotBranchName}
        metaItems={[
          { label: 'Mã phiếu', value: doc?.code },
          { label: 'Chứng từ tham chiếu', value: doc?.parentDocumentCode || 'Không có' },
          { label: 'Chi nhánh áp dụng', value: doc?.branchName || doc?.snapshotBranchName },
          { label: 'Người tạo phiếu', value: doc?.creatorName || doc?.snapshotCreatedByName || doc?.creator },
          { label: 'Người duyệt áp dụng', value: doc?.snapshotPostedByName || (isCompleted ? 'Quản lý' : 'Chưa duyệt') },
          { label: 'Thời gian áp dụng', value: doc?.postedDate || doc?.postedAt ? dayjs(doc.postedDate || doc.postedAt).format('DD/MM/YYYY HH:mm') : '---' },
          { label: 'Tổng số mặt hàng', value: `${totalItemCount} mặt hàng` },
          { label: 'Tổng giá trị điều chỉnh', value: `${grandTotalDelta > 0 ? '+' : ''}${Math.round(grandTotalDelta).toLocaleString('vi-VN')} đ` },
          { label: 'Ghi chú', value: doc?.note || 'Không có ghi chú' }
        ]}
        signatures={[
          { title: 'Người lập phiếu', subtitle: '(Ký, ghi rõ họ tên)', name: doc?.creatorName || doc?.snapshotCreatedByName || '' },
          { title: 'Kế toán kho', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Thủ kho', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Quản lý / Giám đốc duyệt', subtitle: '(Ký, ghi rõ họ tên)', name: doc?.snapshotPostedByName || '' }
        ]}
      >
        <div className="print-section-heading">I. DANH SÁCH MẶT HÀNG ĐIỀU CHỈNH GIÁ VỐN TRUY VẾT ({totalItemCount})</div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '35px' }}>STT</th>
              <th style={{ width: '90px' }}>Mã nguyên liệu</th>
              <th>Tên nguyên liệu</th>
              <th style={{ width: '55px' }}>ĐVT</th>
              <th style={{ width: '75px' }}>Tồn kho</th>
              <th style={{ width: '90px' }}>Giá cũ (đ)</th>
              <th style={{ width: '90px' }}>Giá mới (đ)</th>
              <th style={{ width: '85px' }}>Lệch đ/vị</th>
              <th style={{ width: '105px' }}>Lệch tổng (đ)</th>
            </tr>
          </thead>
          <tbody>
            {detailsList.length === 0 ? (
              <tr>
                <td colSpan={9} className="print-text-center">Chưa có thông tin sản phẩm trong phiếu điều chỉnh</td>
              </tr>
            ) : (
              detailsList.map((item, idx) => (
                <tr key={idx}>
                  <td className="print-text-center">{idx + 1}</td>
                  <td className="print-font-bold">{item.pCode}</td>
                  <td>{item.pName}</td>
                  <td className="print-text-center">{item.uName}</td>
                  <td className="print-text-right">{item.stockQty?.toLocaleString('vi-VN')}</td>
                  <td className="print-text-right">{Math.round(item.oldPrice || 0).toLocaleString('vi-VN')}</td>
                  <td className="print-text-right print-font-bold">{Math.round(item.newPrice || 0).toLocaleString('vi-VN')}</td>
                  <td className="print-text-right print-font-bold" style={{ color: item.unitDelta > 0 ? '#15803d' : (item.unitDelta < 0 ? '#b91c1c' : '#000') }}>
                    {item.unitDelta > 0 ? `+${Math.round(item.unitDelta).toLocaleString('vi-VN')}` : Math.round(item.unitDelta || 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="print-text-right print-font-bold" style={{ color: item.totalDelta > 0 ? '#15803d' : (item.totalDelta < 0 ? '#b91c1c' : '#000') }}>
                    {item.totalDelta > 0 ? `+${Math.round(item.totalDelta).toLocaleString('vi-VN')}` : Math.round(item.totalDelta || 0).toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))
            )}
            <tr>
              <td colSpan={8} className="print-text-right print-font-bold">TỔNG GIÁ TRỊ ĐIỀU CHỈNH KHO:</td>
              <td className="print-text-right print-font-bold" style={{ color: grandTotalDelta > 0 ? '#15803d' : (grandTotalDelta < 0 ? '#b91c1c' : '#000') }}>
                {grandTotalDelta > 0 ? `+${Math.round(grandTotalDelta).toLocaleString('vi-VN')}` : Math.round(grandTotalDelta).toLocaleString('vi-VN')} đ
              </td>
            </tr>
          </tbody>
        </table>

        {doc?.inventoryLedgers && doc.inventoryLedgers.length > 0 && (
          <>
            <div className="print-section-heading">II. LỊCH SỬ SỔ KHO / BIẾN ĐỘNG GIÁ VỐN ({doc.inventoryLedgers.length})</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>STT</th>
                  <th>Tên nguyên liệu</th>
                  <th style={{ width: '120px' }}>Thời điểm chốt</th>
                  <th style={{ width: '100px' }}>Giá vốn cũ</th>
                  <th style={{ width: '100px' }}>Giá vốn mới</th>
                  <th style={{ width: '110px' }}>Biến động tồn (đ)</th>
                  <th style={{ width: '90px' }}>Người ghi sổ</th>
                </tr>
              </thead>
              <tbody>
                {doc.inventoryLedgers.map((lg, idx) => (
                  <tr key={idx}>
                    <td className="print-text-center">{idx + 1}</td>
                    <td className="print-font-bold">{lg.snapshotProductName}</td>
                    <td className="print-text-center">{lg.postedAt ? dayjs(lg.postedAt).format('DD/MM/YYYY HH:mm') : '---'}</td>
                    <td className="print-text-right">{Math.round(Number(lg.oldCost || 0)).toLocaleString('vi-VN')}</td>
                    <td className="print-text-right print-font-bold">{Math.round(Number(lg.newCost || 0)).toLocaleString('vi-VN')}</td>
                    <td className="print-text-right print-font-bold" style={{ color: Number(lg.inventoryValueDelta) > 0 ? '#15803d' : '#b91c1c' }}>
                      {Number(lg.inventoryValueDelta) > 0
                        ? `+${Math.round(Number(lg.inventoryValueDelta)).toLocaleString('vi-VN')}`
                        : Math.round(Number(lg.inventoryValueDelta)).toLocaleString('vi-VN')}
                    </td>
                    <td>{lg.snapshotPostedByName || 'Quản lý'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </InventoryPrintPortal>
    </div>
  );
};

export default Adjustment_Detail;
