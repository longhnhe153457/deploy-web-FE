import React, { useState, useEffect } from 'react';
import { Switch } from 'antd';
import {
  CloseOutlined,
  HistoryOutlined,
  BranchesOutlined,
  CalendarOutlined,
  DollarOutlined,
  ArrowRightOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  ReloadOutlined,
  DeleteOutlined,
  RollbackOutlined,
  BellOutlined,
  BellFilled
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getBatchTraceability, toggleBatchNotificationMute } from '../../../../api/batchApi';
import { getImportById } from '../../../../api/documentApi';
import { renderBatchStatusBadge, renderExpiryStatusBadge } from '../../utils/batchHelper';
import DisposalDocumentModal from '../ExportDelete/DisposalDocumentModal';
import ReturnDocumentModal from '../Import/ReturnDocumentModal';

const showToast = (text, type = 'success') => {
  const toast = document.createElement('div');
  toast.innerText = text;
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : type === 'info' ? '#3b82f6' : '#10b981'};
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

const BatchTraceabilityDrawer = ({ open, batchId, onClose, onActionSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [traceData, setTraceData] = useState(null);

  // States quản lý Modal Xuất hủy và Modal Trả hàng
  const [disposalModalOpen, setDisposalModalOpen] = useState(false);
  const [disposalInitialData, setDisposalInitialData] = useState(null);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnImportDoc, setReturnImportDoc] = useState(null);
  const [presetBatchForReturn, setPresetBatchForReturn] = useState(null);

  const fetchTraceability = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getBatchTraceability(id);
      setTraceData(res);
    } catch (err) {
      console.error('Lỗi khi tải thông tin truy vết Lô:', err);
      setTraceData(null);
    } finally {
      setLoading(false);
    }
  };

  const [togglingMute, setTogglingMute] = useState(false);

  const handleToggleMuteNotification = async () => {
    if (!currentBatch?.id || togglingMute) return;
    setTogglingMute(true);
    try {
      const res = await toggleBatchNotificationMute(currentBatch.id);
      showToast(res?.message || (res?.isNotificationMuted ? 'Đã tắt nhận thông báo cho Lô này.' : 'Đã bật nhận thông báo cho Lô này.'), 'success');
      // Cập nhật state nội bộ ngay lập tức
      setTraceData(prev => {
        if (!prev || !prev.currentBatch) return prev;
        return {
          ...prev,
          currentBatch: {
            ...prev.currentBatch,
            isNotificationMuted: res?.isNotificationMuted ?? !prev.currentBatch.isNotificationMuted
          }
        };
      });
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      console.error('Lỗi khi bật/tắt thông báo Lô:', err);
      showToast(err.response?.data?.message || 'Không thể thay đổi trạng thái nhận thông báo của Lô.', 'error');
    } finally {
      setTogglingMute(false);
    }
  };

  useEffect(() => {
    if (open && batchId) {
      fetchTraceability(batchId);
    } else {
      setTraceData(null);
    }
  }, [open, batchId]);

  if (!open) return null;

  const currentBatch = traceData?.currentBatch;
  const sourceBatch = traceData?.sourceBatch;
  const allocations = traceData?.allocations || [];

  const handleOpenDisposal = () => {
    if (!currentBatch || Number(currentBatch.quantityRemaining) <= 0) {
      showToast('Lô hàng này đã hết tồn kho để xuất hủy.', 'warning');
      return;
    }

    const itemToDispose = {
      rowId: `batch-disposal-${currentBatch.id}-${Date.now()}`,
      bInventoryId: currentBatch.bInventoryId,
      code: currentBatch.productCode,
      name: currentBatch.productName,
      baseStock: currentBatch.quantityRemaining,
      stock: currentBatch.quantityRemaining,
      baseAvgCost: currentBatch.unitCost,
      costPrice: currentBatch.unitCost,
      unitConversionId: null,
      unitName: currentBatch.unitName,
      unitConversions: [],
      conversionPoint: 1,
      quantity: Number(currentBatch.quantityRemaining),
      note: `Xuất hủy Lô: ${currentBatch.batchCode}`
    };

    setDisposalInitialData({
      note: `Xuất hủy Lô ${currentBatch.batchCode} - ${currentBatch.productName}`,
      items: [itemToDispose]
    });
    setDisposalModalOpen(true);
  };

  const handleOpenReturn = async () => {
    if (!currentBatch || Number(currentBatch.quantityRemaining) <= 0) {
      showToast('Lô hàng này đã hết tồn kho để trả hàng.', 'warning');
      return;
    }

    const importDocId =
      traceData?.initialImportDocumentId ||
      allocations.find(
        (a) =>
          (a.documentType === 1 ||
            a.documentType === 'Import' ||
            a.allocationType === 0 ||
            a.allocationType === 'ImportReceipt' ||
            (a.documentCode && a.documentCode.startsWith('PNK'))) &&
          a.documentId
      )?.documentId;

    if (!importDocId) {
      const isProduction = allocations.some(
        (a) =>
          a.allocationType === 9 ||
          a.allocationType === 'ProductionReceipt' ||
          (a.documentCode && a.documentCode.startsWith('LSX'))
      );
      if (isProduction) {
        showToast(
          'Lô hàng này là thành phẩm sản xuất nội bộ, không có phiếu nhập Nhà cung cấp để trả hàng. Vui lòng sử dụng chức năng Xuất hủy.',
          'warning'
        );
      } else {
        showToast(
          'Không tìm thấy phiếu nhập Nhà cung cấp liên kết với Lô hàng này để thực hiện trả hàng.',
          'warning'
        );
      }
      return;
    }

    try {
      setLoading(true);
      const doc = await getImportById(importDocId);
      if (!doc) {
        showToast('Không thể tải thông tin phiếu nhập kho gốc.', 'error');
        return;
      }

      setReturnImportDoc(doc);
      setPresetBatchForReturn({
        bInventoryId: currentBatch.bInventoryId,
        quantityRemaining: currentBatch.quantityRemaining,
        batchCode: currentBatch.batchCode
      });
      setReturnModalOpen(true);
    } catch (err) {
      console.error('Lỗi khi tải phiếu nhập để trả hàng:', err);
      showToast('Lỗi khi tải thông tin phiếu nhập kho để trả hàng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderAllocationTypeBadge = (a) => {
    let label = a.allocationTypeName || '';
    const docCode = a.documentCode || '';
    const orderId = a.orderId;

    // Xử lý loại bỏ nhãn cũ "Xuất bán món / hàng hóa" và phân định rõ ràng Bán hàng vs Xuất hàng
    if (label === 'Xuất bán món / hàng hóa' || label.includes('Xuất bán') || a.allocationType === 'Sale' || a.allocationType === 1) {
      if ((orderId && orderId > 0) || docCode.startsWith('PXBH') || docCode.startsWith('HD')) {
        label = 'Bán hàng';
      } else {
        label = 'Xuất hàng';
      }
    }

    let bg = '#f1f5f9';
    let color = '#334155';
    let border = '#e2e8f0';

    if (label === 'Bán hàng') {
      bg = '#eff6ff';
      color = '#1d4ed8';
      border = '#bfdbfe';
    } else if (label === 'Xuất hàng') {
      bg = '#fef3c7';
      color = '#b45309';
      border = '#fde68a';
    } else if (label.toLowerCase().includes('hủy') || label.toLowerCase().includes('hao hụt')) {
      label = 'Xuất Hủy';
      bg = '#fef2f2';
      color = '#dc2626';
      border = '#fecaca';
    } else if (label.toLowerCase().includes('chuyển')) {
      label = 'Chuyển Hàng';
      bg = '#f5f3ff';
      color = '#6d28d9';
      border = '#ddd6fe';
    } else if (label.toLowerCase().includes('chuẩn bị') || label === 'Sản xuất chuẩn bị sẵn') {
      label = 'Sản xuất chuẩn bị sẵn';
      bg = '#f0fdf4';
      color = '#15803d';
      border = '#bbf7d0';
    } else if (label.toLowerCase().includes('tiêu hao') || label.toLowerCase().includes('sản xuất')) {
      label = 'Tiêu hao sản xuất';
      bg = '#fffbeb';
      color = '#b45309';
      border = '#fef3c7';
    } else if (label.toLowerCase().includes('trả') && !label.toLowerCase().includes('khách')) {
      label = 'Trả Hàng';
      bg = '#fff7ed';
      color = '#c2410c';
      border = '#ffedd5';
    } else if (label.toLowerCase().includes('khách')) {
      label = 'Khách trả hàng';
      bg = '#f0fdf4';
      color = '#15803d';
      border = '#bbf7d0';
    } else if (label.toLowerCase().includes('kiểm')) {
      bg = '#f8fafc';
      color = '#475569';
      border = '#cbd5e1';
    } else if (label === 'Nhập hàng' || label.toLowerCase().includes('nhập kho') || a.allocationType === 0 || a.allocationType === 'ImportReceipt') {
      label = 'Nhập hàng';
      bg = '#ecfdf5';
      color = '#059669';
      border = '#a7f3d0';
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
        {label}
      </span>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        justifyContent: 'flex-end',
        backdropFilter: 'blur(2px)',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          background: '#ffffff',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          animation: 'slideLeft 0.25s ease'
        }}
      >
        {/* DRAWER HEADER */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16
              }}
            >
              <HistoryOutlined />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Hồ Sơ Truy Vết Vòng Đời Lô Hàng
              </h3>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Mã Lô: <strong style={{ color: '#2563eb' }}>{currentBatch?.batchCode || '---'}</strong>
                {currentBatch?.productName && ` | ${currentBatch.productName}`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => fetchTraceability(batchId)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <ReloadOutlined /> Làm mới
            </button>

            {/* NÚT CHUÔNG BẬT / TẮT THÔNG BÁO CHO RIÊNG LÔ NÀY */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, color: currentBatch?.isNotificationMuted ? '#94a3b8' : '#f59e0b', display: 'flex', transition: 'color 0.2s' }}>
                {currentBatch?.isNotificationMuted ? <BellOutlined /> : <BellFilled />}
              </span>
              <Switch
                checked={!currentBatch?.isNotificationMuted}
                onChange={handleToggleMuteNotification}
                disabled={togglingMute || !currentBatch}
                checkedChildren="Bật"
                unCheckedChildren="Tắt"
                style={{ background: !currentBatch?.isNotificationMuted ? '#10b981' : undefined }}
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: 16,
                padding: 6,
                borderRadius: 6
              }}
            >
              <CloseOutlined />
            </button>
          </div>
        </div>

        {/* DRAWER BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f8fafc' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              <div>Đang tải hồ sơ truy vết Lô hàng...</div>
            </div>
          ) : !currentBatch ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <InboxOutlined style={{ fontSize: 36, marginBottom: 8 }} />
              <div>Không tìm thấy thông tin Lô hàng</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* SECTION 1: MASTER BATCH SUMMARY CARD */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                {/* Dòng 1: Tên sản phẩm (Mã sản phẩm) */}
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                    {currentBatch.productName} ({currentBatch.productCode})
                  </span>
                </div>

                {/* Dòng 2: [Đang hoạt động] [Khẩn cấp: Còn 1 ngày] phía đối diện sẽ có [xuất hủy] [trả hàng] */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                    flexWrap: 'wrap',
                    gap: 8
                  }}
                >
                  {/* Bên trái dòng 2: Badge trạng thái hoạt động & Badge HSD */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {renderBatchStatusBadge(currentBatch.status)}
                    {renderExpiryStatusBadge(
                      currentBatch.expiryDate,
                      currentBatch.daysUntilExpiry,
                      currentBatch.quantityRemaining,
                      currentBatch.status
                    )}
                  </div>

                  {/* Phía đối diện dòng 2: Nút [Xuất hủy] và [Trả hàng] */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleOpenDisposal}
                      disabled={Number(currentBatch.quantityRemaining) <= 0}
                      title={
                        Number(currentBatch.quantityRemaining) <= 0
                          ? 'Lô hàng đã hết tồn kho để xuất hủy'
                          : 'Xuất hủy toàn bộ số lượng còn lại của Lô này'
                      }
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: Number(currentBatch.quantityRemaining) <= 0 ? '#94a3b8' : '#dc2626',
                        background: Number(currentBatch.quantityRemaining) <= 0 ? '#f1f5f9' : '#fef2f2',
                        border: `1px solid ${Number(currentBatch.quantityRemaining) <= 0 ? '#e2e8f0' : '#fca5a5'}`,
                        borderRadius: 6,
                        cursor: Number(currentBatch.quantityRemaining) <= 0 ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <DeleteOutlined /> Xuất hủy
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenReturn}
                      disabled={Number(currentBatch.quantityRemaining) <= 0}
                      title={
                        Number(currentBatch.quantityRemaining) <= 0
                          ? 'Lô hàng đã hết tồn kho để trả hàng'
                          : 'Trả hàng Lô này lại cho Nhà cung cấp'
                      }
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: Number(currentBatch.quantityRemaining) <= 0 ? '#94a3b8' : '#ea580c',
                        background: Number(currentBatch.quantityRemaining) <= 0 ? '#f1f5f9' : '#fff7ed',
                        border: `1px solid ${Number(currentBatch.quantityRemaining) <= 0 ? '#e2e8f0' : '#fed7aa'}`,
                        borderRadius: 6,
                        cursor: Number(currentBatch.quantityRemaining) <= 0 ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <RollbackOutlined /> Trả hàng
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 12,
                    background: '#f8fafc',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 11.5
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Số lượng ban đầu:</span>
                    <strong style={{ color: '#0f172a', fontSize: 13 }}>
                      {Number(currentBatch.quantityOriginal).toLocaleString('vi-VN')} {currentBatch.unitName}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Tồn hiện tại:</span>
                    <strong style={{ color: Number(currentBatch.quantityRemaining) > 0 ? '#059669' : '#dc2626', fontSize: 13 }}>
                      {Number(currentBatch.quantityRemaining).toLocaleString('vi-VN')} {currentBatch.unitName}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Giá vốn riêng Lô:</span>
                    <strong style={{ color: '#ea580c', fontSize: 13 }}>
                      {Number(currentBatch.unitCost).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Chi nhánh quản lý:</span>
                    <strong style={{ color: '#1e293b' }}>
                      {currentBatch.branchName || 'Chi nhánh'}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12, fontSize: 11.5, color: '#475569' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Ngày nhập kho:</span>{' '}
                    <strong>{currentBatch.receivedDate ? dayjs(currentBatch.receivedDate).format('DD/MM/YYYY') : '---'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Ngày sản xuất:</span>{' '}
                    <strong>{currentBatch.manufactureDate ? dayjs(currentBatch.manufactureDate).format('DD/MM/YYYY') : '---'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Hạn sử dụng:</span>{' '}
                    <strong>{currentBatch.expiryDate ? dayjs(currentBatch.expiryDate).format('DD/MM/YYYY') : 'Không có'}</strong>
                  </div>
                </div>
              </div>

              {/* SECTION 2: SOURCE BATCH LINKAGE (IF ANY) */}
              {sourceBatch && (
                <div
                  style={{
                    background: '#eff6ff',
                    borderRadius: 10,
                    border: '1px solid #bfdbfe',
                    padding: 14,
                    fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#1d4ed8', marginBottom: 8 }}>
                    <BranchesOutlined /> Nguồn Gốc Chuyển Kho / Sản Xuất
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155' }}>
                    <div>
                      Chi nhánh gốc: <strong>{sourceBatch.branchName}</strong>
                    </div>
                    <ArrowRightOutlined style={{ color: '#2563eb' }} />
                    <div>
                      Mã Lô gốc: <strong style={{ color: '#1d4ed8' }}>{sourceBatch.batchCode}</strong>
                    </div>
                    <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: 11 }}>
                      Ngày nhập gốc: {sourceBatch.receivedDate ? dayjs(sourceBatch.receivedDate).format('DD/MM/YYYY') : '---'}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: ALLOCATIONS & CONSUMPTION HISTORY */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                    Nhật Ký Phân Bổ & Sử Dụng Lô ({allocations.length} lượt)
                  </h4>
                </div>

                {allocations.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                    Chưa có lượt phân bổ hoặc tiêu hao nào từ Lô hàng này.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px' }}>Thời gian</th>
                          <th style={{ padding: '8px 10px' }}>Nghiệp vụ</th>
                          <th style={{ padding: '8px 10px' }}>Mã chứng từ</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Số lượng</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Giá vốn Lô</th>
                          <th style={{ padding: '8px 10px' }}>Chi nhánh / Đối tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocations.map((a, idx) => {
                          const isReceipt = a.allocationType === 0 ||
                            a.allocationType === 'ImportReceipt' ||
                            a.allocationType === 9 ||
                            a.allocationType === 'ProductionReceipt' ||
                            (a.allocationTypeName && (a.allocationTypeName.includes('chuẩn bị') || a.allocationTypeName.includes('Sản xuất chuẩn bị sẵn') || a.allocationTypeName.includes('Nhập hàng')));
                          const isNegative = !isReceipt && a.quantityAllocated > 0;
                          return (
                            <tr key={a.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 10px', color: '#475569' }}>
                                {dayjs(a.documentPostedAt || a.createdAt).format('DD/MM/YYYY HH:mm')}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                {renderAllocationTypeBadge(a)}
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2563eb' }}>
                                {a.documentCode || '---'}
                              </td>
                              <td
                                style={{
                                  padding: '8px 10px',
                                  textAlign: 'right',
                                  fontWeight: 700,
                                  color: isReceipt ? '#059669' : (isNegative ? '#dc2626' : '#059669')
                                }}
                              >
                                {isReceipt ? `+${Number(a.quantityAllocated).toLocaleString('vi-VN')}` : (isNegative ? `-${Number(a.quantityAllocated).toLocaleString('vi-VN')}` : `+${Number(a.quantityAllocated).toLocaleString('vi-VN')}`)}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>
                                {Number(a.unitCost).toLocaleString('vi-VN')} đ
                              </td>
                              <td style={{ padding: '8px 10px', color: '#334155' }}>
                                {a.partnerName || a.branchName || '---'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL XUẤT HỦY LÔ HÀNG */}
      {disposalModalOpen && (
        <DisposalDocumentModal
          open={disposalModalOpen}
          branchId={currentBatch?.branchId}
          initialData={disposalInitialData}
          onClose={() => {
            setDisposalModalOpen(false);
            setDisposalInitialData(null);
          }}
          onSuccess={() => {
            setDisposalModalOpen(false);
            setDisposalInitialData(null);
            fetchTraceability(batchId);
            onActionSuccess?.();
          }}
        />
      )}

      {/* MODAL TRẢ HÀNG NHẬP LÔ HÀNG */}
      {returnModalOpen && (
        <ReturnDocumentModal
          open={returnModalOpen}
          branchId={currentBatch?.branchId}
          importDocument={returnImportDoc}
          presetBatch={presetBatchForReturn}
          onClose={() => {
            setReturnModalOpen(false);
            setReturnImportDoc(null);
            setPresetBatchForReturn(null);
          }}
          onSuccess={() => {
            setReturnModalOpen(false);
            setReturnImportDoc(null);
            setPresetBatchForReturn(null);
            fetchTraceability(batchId);
            onActionSuccess?.();
          }}
        />
      )}
    </div>
  );
};

export default BatchTraceabilityDrawer;
