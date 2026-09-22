import React, { useState } from 'react';
import PaginationFooter from '../../../shared/PaginationFooter';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { getTransferById } from '../../../../api/documentApi';

const TransferTable = ({
  documents = [],
  selectedBranchId,
  searchText,
  setSearchText,
  statusFilter = 'ALL',
  setStatusFilter,
  loading,
  branches = [],
  setModalTransferOpen,
  onEditDocument,
  handleReceiveTransfer,
  handleDeleteDocument,
  onRefresh
}) => {
  const navigate = useNavigate();
  const currentBranch = (branches || []).find((b) => Number(b.id) === Number(selectedBranchId));
  const isBranchInactive = currentBranch ? (currentBranch.isDeleted || currentBranch.status === 'Ngừng kinh doanh') : false;

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [loadedDoc, setLoadedDoc] = useState(null);
  const [loadingDocId, setLoadingDocId] = useState(null);

  const [pageSize, setPageSize] = useState(20);

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
      const res = await getTransferById(docId);
      setLoadedDoc(res || {});
    } catch (err) {
      console.error('Failed to load transfer document details:', err);
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', background: '#ffffff', overflow: 'hidden' }}>
      {/* TOP ACTION TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* SEARCH INPUT */}
          <div style={{ position: 'relative', width: 280 }}>
            <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
            <input
              type="text"
              placeholder="Theo mã phiếu chuyển hàng, người tạo..."
              value={searchText}
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

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isBranchInactive && (
            <span style={{ padding: '4px 8px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecdd3', fontSize: 11, fontWeight: 600 }}>
              Ngừng kinh doanh
            </span>
          )}
          <button
            type="button"
            disabled={isBranchInactive}
            title={isBranchInactive ? 'Chi nhánh này đã ngừng kinh doanh, không thể tạo phiếu chuyển hàng' : 'Tạo phiếu chuyển hàng'}
            onClick={() => {
              if (isBranchInactive) return;
              if (onEditDocument) onEditDocument(null);
              else if (setModalTransferOpen) setModalTransferOpen(true);
            }}
            style={{
              background: isBranchInactive ? '#cbd5e1' : 'linear-gradient(135deg, #e8442a, #f97316)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '0 14px',
              height: 32,
              fontSize: 12,
              fontWeight: 600,
              cursor: isBranchInactive ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: isBranchInactive ? 'none' : '0 2px 4px rgba(232, 68, 42, 0.25)',
              opacity: isBranchInactive ? 0.65 : 1
            }}
          >
            <PlusOutlined /> Chuyển hàng
          </button>
          <button
            type="button"
            onClick={() => {
              if (setSearchText) setSearchText('');
              if (setStatusFilter) setStatusFilter('ALL');
              if (onRefresh) onRefresh();
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
            <ReloadOutlined /> Làm mới
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', border: '1px solid #cbd5e1', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textWrap: 'nowrap' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textTransform: 'uppercase', color: '#334155', fontWeight: 700, fontSize: 10 }}>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>MÃ PHIẾU</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>LOẠI PHIẾU</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>CHI NHÁNH</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>NGÀY CHỨNG TỪ</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>GIÁ TRỊ (VNĐ)</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>TRẠNG THÁI</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>NGƯỜI TẠO</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>THAO TÁC</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>CHI TIẾT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>Đang tải dữ liệu...</td>
              </tr>
            ) : currentData.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Không tìm thấy phiếu chuyển hàng nào</td>
              </tr>
            ) : (
              currentData.map((doc) => {
                const isCancelled = doc.status === 'Cancelled' || doc.status === 2 || doc.status === 3;
                const isDraft = doc.status === 'Pending' || doc.status === 1 || doc.status === 0;
                const transferStatus = doc.transferStatus;
                const isInTransit = transferStatus === 'InTransit' || transferStatus === 2 || transferStatus === 'Pending';
                const isReceived = transferStatus === 'Received' || transferStatus === 3;
                const isPartial = transferStatus === 'PartialReceived' || transferStatus === 4;
                const isRejected = transferStatus === 'Rejected' || transferStatus === 5;

                const isExpanded = expandedDocId === doc.id;
                const activeDoc = isExpanded && loadedDoc?.id === doc.id ? loadedDoc : doc;
                const detailsList = activeDoc.details || activeDoc.documentDetails || [];

                const isReceiver = !selectedBranchId || Number(selectedBranchId) === Number(doc.toBranchId || doc.targetBranchId || doc.toBranch?.id);

                return (
                  <React.Fragment key={doc.id}>
                    <tr
                      onClick={() => toggleRowExpand(doc.id)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: isExpanded ? '#ecfeff' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0891b2' }}>{doc.code}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: 4, background: doc.type === 7 ? '#f0fdf4' : '#ecfeff', color: doc.type === 7 ? '#15803d' : '#0891b2', border: doc.type === 7 ? '1px solid #bbf7d0' : '1px solid #a5f3fc', fontSize: 10, fontWeight: 600 }}>
                          {doc.type === 7 ? 'Nhận chuyển hàng' : 'Chuyển hàng'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155', fontWeight: 500 }}>
                        {doc.branchName || doc.snapshotBranchName || 'Chi nhánh gửi'}
                        {doc.toBranchName || doc.snapshotToBranchName ? ` → ${doc.toBranchName || doc.snapshotToBranchName}` : ''}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{dayjs(doc.businessDate || doc.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {doc.totalAmount ? doc.totalAmount.toLocaleString('vi-VN') : 0} đ
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {isCancelled ? (
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecdd3', fontSize: 10, fontWeight: 600 }}>
                            Đã hủy
                          </span>
                        ) : isDraft ? (
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', fontSize: 10, fontWeight: 700 }}>
                            Lưu tạm
                          </span>
                        ) : isReceived ? (
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 10, fontWeight: 600 }}>
                            Đã nhận đủ
                          </span>
                        ) : isRejected ? (
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', fontSize: 10, fontWeight: 600 }}>
                            Bị từ chối
                          </span>
                        ) : (
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7', fontSize: 10, fontWeight: 600 }}>
                            Đang vận chuyển
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{doc.creator?.name || doc.creator?.email || doc.creator || 'Admin'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                          {isDraft && onEditDocument && (
                            <button
                              type="button"
                              onClick={() => onEditDocument(doc.id)}
                              style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >
                              Sửa
                            </button>
                          )}
                          {!isCancelled && !isDraft && isInTransit && isReceiver && handleReceiveTransfer && (
                            <button
                              type="button"
                              onClick={() => handleReceiveTransfer(doc)}
                              style={{ background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                            >
                              Nhận / Từ chối
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc chắn muốn ${isDraft ? 'hủy phiếu nháp' : 'xóa chứng từ'} chuyển hàng này?`)) {
                                handleDeleteDocument(doc.id, doc.type || 5, doc.status);
                              }
                            }}
                            style={{ background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 11 }}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/transfer-detail/${doc.id}`)}
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

                    {/* EXPANDED DETAIL PANEL (SINGLE TAB: THÔNG TIN CHI TIẾT) */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={9} style={{ padding: '0 12px 14px 12px', borderBottom: '2px solid #cbd5e1' }}>
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
                            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 12px', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                <InfoCircleOutlined /> Thông tin chi tiết phiếu chuyển kho
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/transfer-detail/${doc.id}`)}
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
                                <EyeOutlined style={{ fontSize: 12, color: '#e8442a' }} /> Chi tiết phiếu
                              </button>
                            </div>

                            {loadingDocId === doc.id ? (
                              <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                                Đang nạp chi tiết phiếu chuyển kho...
                              </div>
                            ) : (
                              <div style={{ padding: 16 }}>
                                {/* HEADER INFO BOX */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{activeDoc.code || doc.code}</span>
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                                      Người tạo: <strong style={{ color: '#334155' }}>{activeDoc.creator?.name || activeDoc.creatorName || 'Admin'}</strong> &nbsp;|&nbsp; Thời gian: <strong style={{ color: '#334155' }}>{dayjs(activeDoc.businessDate || activeDoc.createdAt || doc.createdAt).format('DD/MM/YYYY HH:mm')}</strong>
                                    </div>
                                  </div>

                                  <div style={{ color: '#475569', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <EnvironmentOutlined style={{ color: '#e8442a' }} />
                                    <span>{activeDoc.branchName || activeDoc.fromBranch?.name || 'Chi nhánh gửi'} &rarr; {activeDoc.targetBranchName || activeDoc.toBranch?.name || 'Chi nhánh nhận'}</span>
                                  </div>
                                </div>

                                {activeDoc.note && (
                                  <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: '#fff7ed', border: '1px solid #ffedd5', color: '#c2410c', fontSize: 11 }}>
                                    <strong>Ghi chú:</strong> {activeDoc.note}
                                  </div>
                                )}

                                {/* IMPACTED PRODUCTS TABLE */}
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                    <thead>
                                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, textAlign: 'left' }}>
                                        <th style={{ padding: '8px 10px' }}>Mã sản phẩm</th>
                                        <th style={{ padding: '8px 10px' }}>Tên sản phẩm</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Đơn vị tính</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Số lượng chuyển</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Đơn giá (đ)</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thành tiền (đ)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detailsList.length === 0 ? (
                                        <tr>
                                          <td colSpan={6} style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>
                                            Chưa có thông tin sản phẩm chi tiết
                                          </td>
                                        </tr>
                                      ) : (
                                        detailsList.map((dt, idx) => {
                                          const pCode = dt.productCode || dt.snapshotProductCode || dt.currentProductCode || dt.code || `SP${idx + 1}`;
                                          const pName = dt.productName || dt.snapshotProductName || dt.currentProductName || dt.name || 'Sản phẩm';
                                          const uName = dt.unitName || dt.snapshotUnitName || dt.currentUnitName || 'Đơn vị';
                                          const qty = Number(dt.quantity || dt.transferQuantity || 0);
                                          const price = Number(dt.unitPrice || dt.transferPrice || 0);
                                          const total = qty * price;

                                          return (
                                            <tr key={dt.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                              <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0891b2' }}>{pCode}</td>
                                              <td style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 600 }}>{pName}</td>
                                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{uName}</td>
                                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{qty.toLocaleString('vi-VN')}</td>
                                              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>{Math.round(price).toLocaleString('vi-VN')} đ</td>
                                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0891b2' }}>{Math.round(total).toLocaleString('vi-VN')} đ</td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                                {/* BOTTOM ACTION BAR FOR PENDING DRAFT STATUS */}
                                {isDraft && (
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
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm('Bạn có chắc chắn muốn xóa phiếu chuyển hàng nháp này?')) {
                                          handleDeleteDocument(doc.id, doc.type || 5, doc.status);
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

export default TransferTable;
