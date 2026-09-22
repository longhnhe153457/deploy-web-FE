import React, { useState } from 'react';
import PaginationFooter from '../../../shared/PaginationFooter';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { getCostAdjustmentById } from '../../../../api/documentApi';

const AdjustmentTable = ({
  documents = [],
  loading,
  selectedBranchId,
  searchText,
  setSearchText,
  statusFilter = 'ALL',
  setStatusFilter,
  fetchDocuments,
  handleDeleteDocument,
  setModalOpen,
  onEditDocument
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [loadedDoc, setLoadedDoc] = useState(null);
  const [loadingDocId, setLoadingDocId] = useState(null);

  const [pageSize, setPageSize] = useState(15);

  const totalPages = Math.ceil(documents.length / pageSize) || 1;
  const currentData = documents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleRowExpand = async (docId) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
      setLoadedDoc(null);
      return;
    }
    setExpandedDocId(docId);
    setLoadingDocId(docId);
    try {
      const res = await getCostAdjustmentById(docId);
      setLoadedDoc(res || {});
    } catch (err) {
      console.error('Failed to load cost adjustment details:', err);
      setLoadedDoc(null);
    } finally {
      setLoadingDocId(null);
    }
  };

  // Auto-expand matching document from searchText
  React.useEffect(() => {
    if (!searchText || !documents || documents.length === 0) return;
    const cleanSearch = searchText.trim().toLowerCase();
    const matched = documents.find((d) => d.code?.toLowerCase() === cleanSearch);
    if (matched && expandedDocId !== matched.id) {
      toggleRowExpand(matched.id);
    }
  }, [documents, searchText]);

  const getStatusBadge = (status) => {
    if (status === 0 || status === 'Pending' || status === 'PENDING') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', fontSize: 10, fontWeight: 700 }}>
          Lưu tạm
        </span>
      );
    }
    if (status === 2 || status === 'Cancelled' || status === 'CANCELLED') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontSize: 10, fontWeight: 600 }}>
          Đã hủy
        </span>
      );
    }
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 10, fontWeight: 600 }}>
        Hoàn thành
      </span>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', background: '#ffffff', overflow: 'hidden', width: '100%' }}>
      {/* TOP ACTION TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* SEARCH INPUT */}
          {setSearchText && (
            <div style={{ position: 'relative', width: 280 }}>
              <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
              <input
                type="text"
                placeholder="Theo mã phiếu, người tạo, ghi chú..."
                value={searchText || ''}
                onChange={(e) => setSearchText(e.target.value)}
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
          )}

          {/* STATUS FILTER PILLS */}
          {setStatusFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'Pending', label: 'Lưu tạm' },
                { key: 'Completed', label: 'Hoàn thành' },
                { key: 'Cancelled', label: 'Đã hủy' }
              ].map((st) => {
                const active = statusFilter === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setStatusFilter(st.key)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: active ? 700 : 500,
                      color: active ? '#ea580c' : '#475569',
                      background: active ? '#ffffff' : 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* BUTTON 1: TẠO PHIẾU ĐIỀU CHỈNH */}
          <button
            type="button"
            onClick={() => {
              if (onEditDocument) onEditDocument(null);
              else if (setModalOpen) setModalOpen(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #e8442a, #f97316)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '0 14px',
              height: 32,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 4px rgba(232, 68, 42, 0.25)'
            }}
          >
            <PlusOutlined style={{ fontSize: 12 }} /> Tạo phiếu điều chỉnh giá vốn
          </button>

          {/* BUTTON 2: LÀM MỚI / TẢI LẠI */}
          <button
            type="button"
            onClick={() => {
              if (setSearchText) setSearchText('');
              if (setStatusFilter) setStatusFilter('ALL');
              if (fetchDocuments) fetchDocuments(selectedBranchId);
            }}
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
            <ReloadOutlined style={{ fontSize: 12 }} /> Làm mới
          </button>
        </div>
      </div>

      {/* DATA TABLE AREA */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid #cbd5e1', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textWrap: 'nowrap' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textTransform: 'uppercase', color: '#334155', fontWeight: 700, fontSize: 10 }}>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>MÃ PHIẾU</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>NGÀY CHỨNG TỪ</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>NGƯỜI TẠO</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>GHI CHÚ</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>TRẠNG THÁI</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>THAO TÁC</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>CHI TIẾT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                  Đang tải danh sách phiếu điều chỉnh...
                </td>
              </tr>
            ) : currentData.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                  Không tìm thấy phiếu điều chỉnh nào
                </td>
              </tr>
            ) : (
              currentData.map((doc) => {
                const isPending = doc.status === 0 || doc.status === 'Pending' || doc.status === 'PENDING';
                const isExpanded = expandedDocId === doc.id;
                const activeDoc = isExpanded && loadedDoc?.id === doc.id ? loadedDoc : doc;
                const detailsList = activeDoc.details || activeDoc.documentDetails || [];

                return (
                  <React.Fragment key={doc.id}>
                    <tr
                      onClick={() => toggleRowExpand(doc.id)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: isExpanded ? '#eff6ff' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2563eb' }}>{doc.code}</td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>
                        {doc.createdDate || doc.businessDate ? dayjs(doc.createdDate || doc.businessDate).format('DD/MM/YYYY HH:mm') : '---'}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{doc.creator || doc.creatorName || 'Quản lý'}</td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{doc.note || '---'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{getStatusBadge(doc.status)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                          {isPending && onEditDocument && (
                            <button
                              type="button"
                              onClick={() => onEditDocument(doc.id)}
                              style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontWeight: 600, fontSize: 11 }}
                            >
                              Sửa
                            </button>
                          )}
                          {handleDeleteDocument && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Bạn có chắc chắn muốn ${isPending ? 'hủy phiếu nháp' : 'xóa chứng từ'} này?`)) {
                                  handleDeleteDocument(doc.id, doc.type || 11);
                                }
                              }}
                              style={{
                                padding: '2px 8px',
                                fontSize: 10.5,
                                borderRadius: 3,
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#dc2626',
                                cursor: 'pointer'
                              }}
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                      {/* CỘT CHI TIẾT BÊN PHẢI CỘT THAO TÁC */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/adjustment-detail/${doc.id}`, { state: { document: doc } })}
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
                            gap: 4,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <EyeOutlined style={{ fontSize: 11 }} /> Chi tiết
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED DETAIL PANEL (SINGLE TAB: THÔNG TIN CHI TIẾT) */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={7} style={{ padding: '0 12px 14px 12px', borderBottom: '2px solid #cbd5e1' }}>
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
                            {/* SINGLE TAB HEADER */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 12px', alignItems: 'center' }}>
                              <div
                                style={{
                                  padding: '10px 16px',
                                  fontWeight: 700,
                                  color: '#e8442a',
                                  borderBottom: '2px solid #e8442a',
                                  fontSize: 12,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                <InfoCircleOutlined /> Thông tin chi tiết điều chỉnh giá vốn
                              </div>
                              {/* ĐỐI DIỆN KHU VỰC HIỂN THỊ THÔNG TIN CHI TIẾT CÓ NÚT CHI TIẾT */}
                              <button
                                type="button"
                                onClick={() => navigate(`/adjustment-detail/${doc.id}`, { state: { document: activeDoc } })}
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
                                  gap: 5,
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                              >
                                <EyeOutlined style={{ fontSize: 12, color: '#e8442a' }} /> Chi tiết
                              </button>
                            </div>

                            {loadingDocId === doc.id ? (
                              <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                                Đang nạp chi tiết phiếu điều chỉnh giá vốn...
                              </div>
                            ) : (
                              <div style={{ padding: 16 }}>
                                {/* HEADER INFO BOX */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{activeDoc.code || doc.code}</span>
                                      {getStatusBadge(activeDoc.status ?? doc.status)}
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                                      Người tạo: <strong style={{ color: '#334155' }}>{activeDoc.creatorName || activeDoc.snapshotCreatedByName || activeDoc.creator || 'Quản lý'}</strong>
                                      &nbsp;|&nbsp; Ngày lập: <strong style={{ color: '#334155' }}>{dayjs(activeDoc.orderDate || activeDoc.createdDate || activeDoc.createdAt || doc.createdDate).format('DD/MM/YYYY HH:mm')}</strong>
                                      {activeDoc.snapshotPostedByName && (
                                        <> &nbsp;|&nbsp; Người chốt: <strong style={{ color: '#059669' }}>{activeDoc.snapshotPostedByName}</strong> ({dayjs(activeDoc.postedAt).format('DD/MM/YYYY HH:mm')})</>
                                      )}
                                      {activeDoc.snapshotDeletedByName && (
                                        <> &nbsp;|&nbsp; Người hủy: <strong style={{ color: '#dc2626' }}>{activeDoc.snapshotDeletedByName}</strong> ({dayjs(activeDoc.deletedAt).format('DD/MM/YYYY HH:mm')})</>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ color: '#475569', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <EnvironmentOutlined style={{ color: '#e8442a' }} />
                                    <span>{activeDoc.branchName || activeDoc.snapshotBranchName || doc.branchName || 'Chi nhánh trung tâm'}</span>
                                  </div>
                                </div>

                                {activeDoc.note && (
                                  <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 6, background: '#fff7ed', border: '1px solid #ffedd5', color: '#c2410c', fontSize: 11 }}>
                                    <strong>Ghi chú:</strong> {activeDoc.note}
                                  </div>
                                )}

                                {activeDoc.deleteNote && (
                                  <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 11 }}>
                                    <strong>Lý do hủy phiếu:</strong> {activeDoc.deleteNote}
                                  </div>
                                )}

                                {/* IMPACTED PRODUCTS TABLE */}
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                    <thead>
                                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', fontSize: 10 }}>
                                        <th style={{ padding: '8px 10px' }}>Mã SP</th>
                                        <th style={{ padding: '8px 10px' }}>Tên sản phẩm</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>ĐVT</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tồn hiện tại</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Giá vốn cũ (đ)</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Giá vốn mới (đ)</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Chênh lệch đ/vị</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tổng giá trị thay đổi (đ)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detailsList.length === 0 ? (
                                        <tr>
                                          <td colSpan={8} style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>
                                            Chưa có thông tin sản phẩm chi tiết
                                          </td>
                                        </tr>
                                      ) : (
                                        (() => {
                                          let grandTotalDelta = 0;
                                          const rows = detailsList.map((dt, idx) => {
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
                                              unitDelta = stockQty > 0 ? (totalDelta / stockQty) : 0;
                                              oldPrice = newPrice - unitDelta;
                                            } else {
                                              oldPrice = Number(dt.oldCost || dt.bInventory?.avg || 0);
                                              unitDelta = newPrice - oldPrice;
                                              totalDelta = unitDelta * stockQty;
                                            }

                                            grandTotalDelta += totalDelta;

                                            return (
                                              <tr key={dt.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2563eb' }}>{pCode}</td>
                                                <td style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 600 }}>{pName}</td>
                                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{uName}</td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: stockQty <= 0 ? '#ef4444' : '#334155' }}>
                                                  {stockQty.toLocaleString('vi-VN')}
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>
                                                  {Math.round(oldPrice).toLocaleString('vi-VN')} đ
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                  {Math.round(newPrice).toLocaleString('vi-VN')} đ
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: unitDelta > 0 ? '#059669' : (unitDelta < 0 ? '#dc2626' : '#64748b') }}>
                                                  {unitDelta > 0 ? `+${Math.round(unitDelta).toLocaleString('vi-VN')}` : Math.round(unitDelta).toLocaleString('vi-VN')} đ
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: totalDelta > 0 ? '#059669' : (totalDelta < 0 ? '#dc2626' : '#64748b') }}>
                                                  {totalDelta > 0 ? `+${Math.round(totalDelta).toLocaleString('vi-VN')}` : Math.round(totalDelta).toLocaleString('vi-VN')} đ
                                                </td>
                                              </tr>
                                            );
                                          });

                                          return (
                                            <>
                                              {rows}
                                              <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #e2e8f0' }}>
                                                <td colSpan={7} style={{ padding: '8px 10px', textAlign: 'right', color: '#334155' }}>
                                                  TỔNG GIÁ TRỊ THAY ĐỔI TỒN KHO:
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12, fontWeight: 800, color: grandTotalDelta > 0 ? '#059669' : (grandTotalDelta < 0 ? '#dc2626' : '#64748b') }}>
                                                  {grandTotalDelta > 0 ? `+${Math.round(grandTotalDelta).toLocaleString('vi-VN')}` : Math.round(grandTotalDelta).toLocaleString('vi-VN')} đ
                                                </td>
                                              </tr>
                                            </>
                                          );
                                        })()
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                                {/* BOTTOM ACTION BAR FOR PENDING DRAFT STATUS */}
                                {isPending && (
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px border-dashed #cbd5e1' }}>
                                    {onEditDocument && (
                                      <button
                                        type="button"
                                        onClick={() => onEditDocument(doc.id)}
                                        style={{
                                          padding: '6px 14px',
                                          fontSize: 11.5,
                                          fontWeight: 700,
                                          borderRadius: 6,
                                          border: '1px solid #bfdbfe',
                                          background: '#eff6ff',
                                          color: '#2563eb',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 4
                                        }}
                                      >
                                        <EditOutlined /> Chỉnh sửa
                                      </button>
                                    )}
                                    {handleDeleteDocument && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (window.confirm('Bạn có chắc chắn muốn xóa phiếu điều chỉnh giá vốn nháp này?')) {
                                            handleDeleteDocument(doc.id, doc.type || 11);
                                          }
                                        }}
                                        style={{
                                          padding: '6px 14px',
                                          fontSize: 11.5,
                                          fontWeight: 700,
                                          borderRadius: 6,
                                          border: '1px solid #fecaca',
                                          background: '#fef2f2',
                                          color: '#dc2626',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 4
                                        }}
                                      >
                                        <DeleteOutlined /> Xóa
                                      </button>
                                    )}
                                  </div>
                                )}
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
        totalItems={documents.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  );
};

export default AdjustmentTable;
