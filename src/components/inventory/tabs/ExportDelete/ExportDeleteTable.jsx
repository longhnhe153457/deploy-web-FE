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
  WarningOutlined,
  CloseOutlined,
  EyeOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { getExportDeleteById } from '../../../../api/documentApi';

const ExportDeleteTable = ({
  documents = [],
  searchText,
  setSearchText,
  statusFilter = 'ALL',
  setStatusFilter,
  loading,
  setModalExportOpen,
  onEditDocument,
  handleDeleteDocument,
  onRefresh,
  expiredCount = 0,
  onOpenExpiredModal,
  loadingExpired = false
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [loadedDoc, setLoadedDoc] = useState(null);
  const [loadingDocId, setLoadingDocId] = useState(null);
  const [expandedSubTab, setExpandedSubTab] = useState({});
  const [previewImage, setPreviewImage] = useState(null);

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
      const res = await getExportDeleteById(docId);
      setLoadedDoc(res || {});
    } catch (err) {
      console.error('Failed to load export delete details:', err);
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
    if (status === 0 || status === 'Pending') {
      return (
        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', fontSize: 10, fontWeight: 700 }}>
          Lưu tạm
        </span>
      );
    }
    if (status === 2 || status === 'Cancelled') {
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
      {/* ACTION TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
          {/* NÚT XUẤT HỎNG */}
          <button
            type="button"
            onClick={onOpenExpiredModal}
            disabled={loadingExpired}
            style={{
              background: '#fff1f2',
              color: '#e11d48',
              border: '1px solid #fecdd3',
              borderRadius: 6,
              padding: '0 14px',
              height: 32,
              fontSize: 12,
              fontWeight: 600,
              cursor: loadingExpired ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 2px rgba(225, 29, 72, 0.1)'
            }}
          >
            <WarningOutlined style={{ color: '#e11d48', fontSize: 13 }} />
            <span>{loadingExpired ? 'Đang tìm...' : 'Xuất hỏng'}</span>
            {expiredCount > 0 && (
              <span
                style={{
                  background: '#e11d48',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 10,
                  padding: '1px 6px',
                  lineHeight: '14px',
                  marginLeft: 2
                }}
              >
                {expiredCount}
              </span>
            )}
          </button>

          {/* NÚT XUẤT HỦY */}
          <button
            type="button"
            onClick={() => {
              if (onEditDocument) onEditDocument(null);
              else if (setModalExportOpen) setModalExportOpen(true);
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
            <PlusOutlined /> Xuất hủy
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
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>GIÁ TRỊ HỦY (VNĐ)</th>
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
                <td colSpan={9} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Không tìm thấy phiếu xuất hủy nào</td>
              </tr>
            ) : (
              currentData.map((doc) => {
                const isPending = doc.status === 0 || doc.status === 'Pending';
                const isExpanded = expandedDocId === doc.id;
                const activeDoc = isExpanded && loadedDoc?.id === doc.id ? loadedDoc : doc;
                const detailsList = activeDoc.details || activeDoc.documentDetails || doc.details || doc.documentDetails || [];
                const computedTotal = detailsList.reduce((sum, dt) => {
                  const qty = Number(dt.quantity || 0);
                  const rate = Number(dt.conversionRate || dt.conversionPoint || 1);
                  const avgCost = Number(dt.snapshotAvgCost || dt.unitPrice || 0);
                  return sum + (qty * rate * avgCost);
                }, 0);
                const displayTotal = Math.round(doc.totalAmount > 0 ? doc.totalAmount : (activeDoc.totalAmount > 0 ? activeDoc.totalAmount : computedTotal));

                return (
                  <React.Fragment key={doc.id}>
                    <tr
                      onClick={() => toggleRowExpand(doc.id)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: isExpanded ? '#fef2f2' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#dc2626' }}>{doc.code}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 10, fontWeight: 600 }}>
                          Xuất hủy
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{doc.branchName || 'Chi nhánh'}</td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{dayjs(doc.businessDate || doc.orderDate || doc.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                        {displayTotal.toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {getStatusBadge(doc.status)}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{doc.creatorName || doc.creator || doc.snapshotCreatedByName || '---'}</td>
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
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc chắn muốn ${isPending ? 'hủy phiếu nháp' : 'xóa chứng từ'} này?`)) {
                                handleDeleteDocument(doc.id, doc.type || 8, doc.status);
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
                          onClick={() => navigate(`/export-delete-detail/${doc.id}`, { state: { document: doc } })}
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
                            {/* TAB HEADERS */}
                            {(() => {
                              const currentTab = expandedSubTab[doc.id] || 'detail';
                              let imgs = loadedDoc?.id === doc.id ? (loadedDoc?.imageUrls || doc.imageUrls || []) : (doc.imageUrls || []);
                              if (typeof imgs === 'string') {
                                try { imgs = JSON.parse(imgs); } catch (e) { imgs = imgs ? [imgs] : []; }
                              }
                              if (!Array.isArray(imgs)) imgs = [];

                              return (
                                <>
                                  <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 12px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedSubTab((prev) => ({ ...prev, [doc.id]: 'detail' }))}
                                      style={{
                                        padding: '10px 16px',
                                        border: 'none',
                                        background: 'transparent',
                                        fontWeight: currentTab === 'detail' ? 700 : 500,
                                        color: currentTab === 'detail' ? '#e8442a' : '#64748b',
                                        borderBottom: currentTab === 'detail' ? '2px solid #e8442a' : '2px solid transparent',
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                      }}
                                    >
                                      <InfoCircleOutlined /> Thông tin chi tiết phiếu xuất hủy
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setExpandedSubTab((prev) => ({ ...prev, [doc.id]: 'image' }))}
                                      style={{
                                        padding: '10px 16px',
                                        border: 'none',
                                        background: 'transparent',
                                        fontWeight: currentTab === 'image' ? 700 : 500,
                                        color: currentTab === 'image' ? '#e8442a' : '#64748b',
                                        borderBottom: currentTab === 'image' ? '2px solid #e8442a' : '2px solid transparent',
                                        cursor: 'pointer',
                                        fontSize: 12,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6
                                      }}
                                    >
                                      <PictureOutlined /> Hình ảnh {imgs.length > 0 ? `(${imgs.length})` : ''}
                                    </button>

                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <button
                                        type="button"
                                        onClick={() => navigate(`/export-delete-detail/${doc.id}`, { state: { document: activeDoc } })}
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
                                        <EyeOutlined style={{ fontSize: 12, color: '#e8442a' }} /> Chi tiết phiếu
                                      </button>
                                    </div>
                                  </div>

                                  {loadingDocId === doc.id ? (
                                    <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                                      Đang nạp chi tiết phiếu xuất hủy...
                                    </div>
                                  ) : currentTab === 'image' ? (
                                    <div style={{ padding: 16 }}>
                                      {imgs.length === 0 ? (
                                        <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                                          <PictureOutlined style={{ fontSize: 36, marginBottom: 8, color: '#cbd5e1' }} />
                                          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Không có ảnh</div>
                                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Chưa có hình ảnh biên bản hoặc bằng chứng hàng hỏng nào cho phiếu xuất hủy này.</div>
                                        </div>
                                      ) : (
                                        <div>
                                          <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
                                            Danh sách hình ảnh biên bản / hàng hỏng ({imgs.length}):
                                          </div>
                                          <div
                                            style={{
                                              display: 'grid',
                                              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 130px))',
                                              gap: 12
                                            }}
                                          >
                                            {imgs.map((url, imgIdx) => (
                                              <div
                                                key={imgIdx}
                                                onClick={() => setPreviewImage(url)}
                                                style={{
                                                  width: 130,
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
                                                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.12)';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.transform = 'translateY(0)';
                                                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                                                }}
                                              >
                                                <img
                                                  src={url}
                                                  alt={`Hình ${imgIdx + 1}`}
                                                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                />
                                                <div
                                                  style={{
                                                    position: 'absolute',
                                                    bottom: 4,
                                                    left: 4,
                                                    background: 'rgba(15, 23, 42, 0.75)',
                                                    color: '#ffffff',
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    padding: '2px 6px',
                                                    borderRadius: 4
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
                                            Người tạo: <strong style={{ color: '#334155' }}>{activeDoc.creatorName || activeDoc.creator || doc.creatorName || 'Hệ thống'}</strong> &nbsp;|&nbsp; Thời gian: <strong style={{ color: '#334155' }}>{dayjs(activeDoc.businessDate || activeDoc.orderDate || activeDoc.createdAt || doc.createdAt).format('DD/MM/YYYY HH:mm')}</strong>
                                          </div>
                                        </div>

                                        <div style={{ color: '#475569', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <EnvironmentOutlined style={{ color: '#e8442a' }} />
                                          <span>{activeDoc.branchName || doc.branchName || 'Chi nhánh trung tâm'}</span>
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
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Số lượng hủy</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Giá vốn hủy</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thành tiền hủy</th>
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
                                          const pCode = dt.snapshotProductCode || dt.currentProductCode || dt.code || `SP${idx + 1}`;
                                          const pName = dt.snapshotProductName || dt.currentProductName || dt.productName || dt.name || 'Sản phẩm';
                                          const uName = dt.unitName || dt.snapshotUnitName || dt.currentUnitName || 'Đơn vị';
                                          const qty = Number(dt.quantity || 0);
                                          const rate = Number(dt.conversionRate || dt.conversionPoint || 1);
                                          const avgCost = Number(dt.snapshotAvgCost || dt.unitPrice || 0);
                                          const price = rate * avgCost;
                                          const total = qty * price;

                                          return (
                                            <tr key={dt.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                              <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2563eb' }}>{pCode}</td>
                                              <td style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 600 }}>{pName}</td>
                                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{uName}</td>
                                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{qty.toLocaleString('vi-VN')}</td>
                                              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>{Math.round(price).toLocaleString('vi-VN')} đ</td>
                                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{Math.round(total).toLocaleString('vi-VN')} đ</td>
                                            </tr>
                                          );
                                        })
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
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (window.confirm('Bạn có chắc chắn muốn xóa phiếu xuất hủy nháp này?')) {
                                                handleDeleteDocument(doc.id, doc.type || 8, doc.status);
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
                                </>
                              );
                            })()}
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

      {/* LIGHTBOX XEM ẢNH TOÀN MÀN HÌNH */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
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

export default ExportDeleteTable;
