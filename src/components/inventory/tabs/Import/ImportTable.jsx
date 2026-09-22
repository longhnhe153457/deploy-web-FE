import React, { useState } from 'react';
import PaginationFooter from '../../../shared/PaginationFooter';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  EnvironmentOutlined,
  DeleteOutlined,
  PrinterOutlined,
  RollbackOutlined,
  EditOutlined,
  InfoCircleOutlined,
  CreditCardOutlined,
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  PictureOutlined,
  CloseOutlined,
  ZoomInOutlined
} from '@ant-design/icons';
import { deleteImportPendingDocument, getImportById } from '../../../../api/documentApi';

const ImportTable = ({
  documents = [],
  allDocuments = [],
  searchText,
  setSearchText,
  statusFilter = 'ALL',
  setStatusFilter,
  loading,
  onRefresh,
  setModalImportOpen,
  onOpenCreateModal,
  handleDeleteDocument,
  onOpenReturnModal,
  onEditDocument
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [activeTabMap, setActiveTabMap] = useState({}); // { [docId]: 'info' | 'payment' | 'image' }
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null);
  const [loadedDocMap, setLoadedDocMap] = useState({}); // Cache full document details
  const [loadingDocId, setLoadingDocId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.ceil(documents.length / pageSize) || 1;
  const currentData = documents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Fetch full detail when row is expanded
  const toggleExpand = async (docId) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
    } else {
      setExpandedDocId(docId);
      if (!activeTabMap[docId]) {
        setActiveTabMap((prev) => ({ ...prev, [docId]: 'info' }));
      }

      // Fetch full document details if not cached yet
      if (!loadedDocMap[docId]) {
        setLoadingDocId(docId);
        try {
          const fullDoc = await getImportById(docId);
          if (fullDoc) {
            setLoadedDocMap((prev) => ({ ...prev, [docId]: fullDoc }));
          }
        } catch (err) {
          console.error('Failed to load document details:', err);
        } finally {
          setLoadingDocId(null);
        }
      }
    }
  };

  // Auto-expand matching document from searchText
  React.useEffect(() => {
    if (!searchText || !documents || documents.length === 0) return;
    const cleanSearch = searchText.trim().toLowerCase();
    const matched = documents.find((d) => d.code?.toLowerCase() === cleanSearch);
    if (matched && expandedDocId !== matched.id) {
      toggleExpand(matched.id);
    }
  }, [documents, searchText]);

  const handleTabChange = (docId, tabKey) => {
    setActiveTabMap((prev) => ({ ...prev, [docId]: tabKey }));
  };

  // Handle Edit Pending Document (Synchronous trigger to immediately open modal in edit mode)
  const handleEditPending = (doc) => {
    const fullDoc = loadedDocMap[doc.id] || doc;
    if (onEditDocument) {
      onEditDocument(fullDoc);
    }
  };

  const executeDelete = async (doc) => {
    if (!doc) return;
    const isPending = doc.status === 0 || doc.status === 'Pending';
    try {
      if (isPending) {
        await deleteImportPendingDocument(doc.id);
      }
      if (handleDeleteDocument) {
        handleDeleteDocument(doc.id, doc.type || 1);
      }
      setLoadedDocMap((prev) => {
        const copy = { ...prev };
        delete copy[doc.id];
        return copy;
      });
    } catch (err) {
      console.error('Lỗi khi xóa chứng từ:', err);
      if (handleDeleteDocument) {
        handleDeleteDocument(doc.id, doc.type || 1);
      }
    } finally {
      setConfirmDeleteDoc(null);
    }
  };

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
              placeholder="Theo mã phiếu, người tạo..."
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
          <button
            type="button"
            onClick={() => {
              if (onOpenCreateModal) {
                onOpenCreateModal();
              } else if (onEditDocument) {
                onEditDocument(null);
              }
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
            <PlusOutlined /> Nhập kho
          </button>
          <button
            type="button"
            onClick={() => {
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

      {/* TABLE CONTAINER */}
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
                <td colSpan={9} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Không tìm thấy phiếu nhập nào</td>
              </tr>
            ) : (
              currentData.map((doc) => {
                const isExpanded = expandedDocId === doc.id;
                const currentTab = activeTabMap[doc.id] || 'info';
                const isPending = doc.status === 0 || doc.status === 'Pending';
                const isCompleted = doc.status === 1 || doc.status === 'Completed';

                const loadedDoc = loadedDocMap[doc.id] || doc;
                const detailsList = loadedDoc.details || loadedDoc.documentDetails || [];
                const cashFlowsList = loadedDoc.cashFlows || [];

                const supplierPartner = (loadedDoc.partners || []).find((p) => p.partnerType === 1 || p.partnerType === 'Supplier') || loadedDoc.partner || loadedDoc.partners?.[0];
                const supplierName = loadedDoc.partnerName || supplierPartner?.partnerName || loadedDoc.partner?.name || '---';

                const totalInvoiceAmount = Number(loadedDoc.totalAmount || 0);
                const matchDebt = (loadedDoc.note || '').match(/Trừ tiền NCC nợ:\s*([0-9.,]+)/);
                const deductedDebt = matchDebt ? Number(matchDebt[1].replace(/\./g, '').replace(',', '.')) : 0;
                const roundingCF = cashFlowsList.find((cf) => cf.type === 5 || cf.type === 'Rounding');
                const roundingAmount = Number(roundingCF?.totalAmount || 0);
                const effectivePayableAmount = Math.max(0, totalInvoiceAmount - roundingAmount - deductedDebt);
                const paymentCashFlows = cashFlowsList.filter((cf) => cf.type !== 5 && cf.type !== 'Rounding');
                const supplierAmountPaid = Math.round(Number(loadedDoc.amountPaid ?? supplierPartner?.amountPaid ?? paymentCashFlows.reduce((sum, cf) => sum + Number(cf.totalAmount || 0), 0)));
                const remainingDebt = Math.max(0, effectivePayableAmount - supplierAmountPaid);

                return (
                  <React.Fragment key={doc.id}>
                    {/* MAIN ROW */}
                    <tr
                      onClick={() => toggleExpand(doc.id)}
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                        background: isExpanded ? '#fff7ed' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#e8442a' }}>{doc.code}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: 4, background: '#fff1ec', color: '#e8442a', border: '1px solid #fed7aa', fontSize: 10, fontWeight: 600 }}>
                          Nhập kho
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{doc.branchName || 'Chi nhánh trung tâm'}</td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{dayjs(doc.orderDate || doc.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {doc.totalAmount ? Math.round(Number(doc.totalAmount)).toLocaleString('vi-VN') : 0} đ
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {doc.status === 2 || doc.status === 'Cancelled' ? (
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', fontSize: 10, fontWeight: 600 }}>
                            Đã hủy
                          </span>
                        ) : isPending ? (
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontSize: 10, fontWeight: 600 }}>
                            Lưu tạm
                          </span>
                        ) : (
                          <span style={{ padding: '2px 6px', borderRadius: 4, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 10, fontWeight: 600 }}>
                            Hoàn thành
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{doc.creator || doc.createdByName || 'Hệ thống'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleEditPending(doc)}
                              style={{
                                padding: '3px 8px',
                                fontSize: 10.5,
                                fontWeight: 600,
                                borderRadius: 4,
                                border: '1px solid #bfdbfe',
                                background: '#eff6ff',
                                color: '#2563eb',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                            >
                              <EditOutlined /> Chỉnh sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteDoc(doc)}
                              style={{
                                padding: '3px 8px',
                                fontSize: 10.5,
                                fontWeight: 600,
                                borderRadius: 4,
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                            >
                              <DeleteOutlined /> Xóa
                            </button>
                          </div>
                        ) : isCompleted ? (
                          <button
                            type="button"
                            onClick={() => onOpenReturnModal && onOpenReturnModal(loadedDoc)}
                            style={{
                              padding: '3px 8px',
                              fontSize: 10.5,
                              fontWeight: 600,
                              borderRadius: 4,
                              border: '1px solid #fed7aa',
                              background: '#fff7ed',
                              color: '#ea580c',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                          >
                            <RollbackOutlined /> Trả hàng
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>---</span>
                        )}
                      </td>
                      {/* CỘT CHI TIẾT BÊN PHẢI CỘT THAO TÁC */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/import-detail/${doc.id}`, { state: { document: doc } })}
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

                    {/* EXPANDED DETAIL DRAWER CONTAINER */}
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
                            {/* TOP TAB NAVIGATION */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 12px', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleTabChange(doc.id, 'info')}
                                style={{
                                  padding: '10px 16px',
                                  border: 'none',
                                  background: 'transparent',
                                  fontWeight: currentTab === 'info' ? 700 : 500,
                                  color: currentTab === 'info' ? '#e8442a' : '#64748b',
                                  borderBottom: currentTab === 'info' ? '2px solid #e8442a' : '2px solid transparent',
                                  cursor: 'pointer',
                                  fontSize: 12
                                }}
                              >
                                <InfoCircleOutlined /> Thông tin chi tiết
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTabChange(doc.id, 'payment')}
                                style={{
                                  padding: '10px 16px',
                                  border: 'none',
                                  background: 'transparent',
                                  fontWeight: currentTab === 'payment' ? 700 : 500,
                                  color: currentTab === 'payment' ? '#e8442a' : '#64748b',
                                  borderBottom: currentTab === 'payment' ? '2px solid #e8442a' : '2px solid transparent',
                                  cursor: 'pointer',
                                  fontSize: 12
                                }}
                              >
                                <CreditCardOutlined /> Lịch sử thanh toán
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTabChange(doc.id, 'image')}
                                style={{
                                  padding: '10px 16px',
                                  border: 'none',
                                  background: 'transparent',
                                  fontWeight: currentTab === 'image' ? 700 : 500,
                                  color: currentTab === 'image' ? '#e8442a' : '#64748b',
                                  borderBottom: currentTab === 'image' ? '2px solid #e8442a' : '2px solid transparent',
                                  cursor: 'pointer',
                                  fontSize: 12
                                }}
                              >
                                <PictureOutlined /> Hình ảnh {(() => {
                                  let imgs = loadedDoc.imageUrls || doc.imageUrls || [];
                                  if (typeof imgs === 'string') {
                                    try { imgs = JSON.parse(imgs); } catch (e) { imgs = imgs ? [imgs] : []; }
                                  }
                                  return Array.isArray(imgs) && imgs.length > 0 ? `(${imgs.length})` : '';
                                })()}
                              </button>

                              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/import-detail/${doc.id}`, { state: { document: loadedDoc } })}
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

                                {/* EXTRA TRẢ HÀNG BUTTON ON COMPLETED EXPANDED TAB */}
                                {isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenReturnModal && onOpenReturnModal(loadedDoc)}
                                    style={{
                                      padding: '4px 12px',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      borderRadius: 4,
                                      border: '1px solid #fed7aa',
                                      background: '#fff7ed',
                                      color: '#ea580c',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    <RollbackOutlined /> Trả hàng
                                  </button>
                                )}
                              </div>
                            </div>

                            {loadingDocId === doc.id ? (
                              <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                                Đang nạp chi tiết phiếu nhập...
                              </div>
                            ) : (
                              <>
                                {/* TAB 1: THÔNG TIN PHIẾU */}
                                {currentTab === 'info' && (
                                  <div style={{ padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{loadedDoc.code}</span>
                                          <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontSize: 10, fontWeight: 600 }}>
                                            {isCompleted ? 'Đã nhập hàng' : (isPending ? 'Phiếu nhập nháp' : 'Đã hủy')}
                                          </span>
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                                          Người tạo: <strong style={{ color: '#334155' }}>{loadedDoc.creator || loadedDoc.createdByName || 'Hệ thống'}</strong> &nbsp;|&nbsp; Thời gian: <strong style={{ color: '#334155' }}>{dayjs(loadedDoc.orderDate || loadedDoc.createdAt).format('DD/MM/YYYY HH:mm')}</strong>
                                        </div>
                                      </div>

                                      <div style={{ color: '#475569', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <EnvironmentOutlined style={{ color: '#e8442a' }} />
                                        <span>{loadedDoc.branchName || 'Chi nhánh trung tâm'}</span>
                                      </div>
                                    </div>

                                    {/* SUPPLIER INFO BOX */}
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px', background: '#fafafa', margin: '12px 0 16px 0' }}>
                                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                                        Nhà cung cấp: <span style={{ color: '#2563eb' }}>{supplierName}</span>
                                      </div>
                                      <div style={{ display: 'flex', gap: 20, fontSize: 11, color: '#475569', flexWrap: 'wrap' }}>
                                        <div>Tổng tiền gốc: <strong>{totalInvoiceAmount.toLocaleString('vi-VN')} đ</strong></div>
                                        {roundingAmount !== 0 && (
                                          <div>ĐC Làm tròn (Rounding): <strong style={{ color: '#d97706' }}>{roundingAmount > 0 ? `-${roundingAmount.toLocaleString('vi-VN')}` : `+${Math.abs(roundingAmount).toLocaleString('vi-VN')}`} đ</strong></div>
                                        )}
                                        {deductedDebt > 0 && (
                                          <div>Trừ tiền NCC nợ: <strong style={{ color: '#16a34a' }}>-{deductedDebt.toLocaleString('vi-VN')} đ</strong></div>
                                        )}
                                        <div>Cần trả NCC: <strong style={{ color: '#0f172a' }}>{effectivePayableAmount.toLocaleString('vi-VN')} đ</strong></div>
                                        <div>Đã trả NCC: <strong style={{ color: '#059669' }}>{supplierAmountPaid.toLocaleString('vi-VN')} đ</strong></div>
                                        <div>Còn nợ NCC: <strong style={{ color: remainingDebt > 0 ? '#ef4444' : '#64748b' }}>{remainingDebt.toLocaleString('vi-VN')} đ</strong></div>
                                      </div>
                                    </div>

                                    {/* ITEMS TABLE */}
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                        <thead>
                                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, textAlign: 'left' }}>
                                            <th style={{ padding: '8px 10px' }}>Mã sản phẩm</th>
                                            <th style={{ padding: '8px 10px' }}>Tên sản phẩm</th>
                                            <th style={{ padding: '8px 10px' }}>Mã Lô</th>
                                            <th style={{ padding: '8px 10px' }}>Hạn sử dụng</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Đơn vị tính</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Số lượng</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Đơn giá nhập</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thành tiền</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detailsList.length === 0 ? (
                                            <tr>
                                              <td colSpan={8} style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>
                                                Chưa có sản phẩm trong phiếu nhập
                                              </td>
                                            </tr>
                                          ) : (
                                            detailsList.map((dt, idx) => {
                                              const pCode = dt.productCode || dt.snapshotProductCode || dt.currentProductCode || dt.code || `SP${idx + 1}`;
                                              const pName = dt.productName || dt.snapshotProductName || dt.currentProductName || dt.name || 'Sản phẩm';
                                              const bCode = dt.batchCode || dt.batchCodeSnapshot || dt.batch?.batchCode || '---';
                                              const expDate = dt.expiryDate || dt.expiryDateSnapshot ? dayjs(dt.expiryDate || dt.expiryDateSnapshot).format('DD/MM/YYYY') : '---';
                                              const uName = dt.unitName || dt.snapshotUnitName || dt.currentUnitName || 'Đơn vị';
                                              const qty = Number(dt.quantity || 0);
                                              const price = Number(dt.unitPrice || 0);
                                              const total = qty * price;

                                              return (
                                                <tr key={dt.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                  <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                                                    {pCode && pCode !== '---' ? (
                                                      <span
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          navigate(`/inventory-management?tab=Product&search=${encodeURIComponent(pCode)}&subTab=nguyenlieu`);
                                                        }}
                                                        style={{
                                                          color: '#2563eb',
                                                          cursor: 'pointer',
                                                          textDecoration: 'underline'
                                                        }}
                                                        title="Nhấp để tìm nguyên liệu trong tab Sản phẩm / Kho hàng"
                                                      >
                                                        {pCode}
                                                      </span>
                                                    ) : (
                                                      <span style={{ color: '#94a3b8' }}>---</span>
                                                    )}
                                                  </td>
                                                  <td style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 600 }}>{pName}</td>
                                                  <td style={{ padding: '8px 10px', color: '#0f172a', fontWeight: 600 }}>
                                                    {bCode !== '---' ? (
                                                      <span
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          navigate(`/inventory-management?tab=BatchExpiry&search=${encodeURIComponent(bCode)}`);
                                                        }}
                                                        style={{
                                                          background: '#eff6ff',
                                                          color: '#2563eb',
                                                          padding: '2px 6px',
                                                          borderRadius: 4,
                                                          border: '1px solid #bfdbfe',
                                                          fontSize: 10.5,
                                                          cursor: 'pointer',
                                                          textDecoration: 'underline'
                                                        }}
                                                        title="Nhấp để tìm Lô trong tab Quản lý HSD / Lô"
                                                      >
                                                        {bCode}
                                                      </span>
                                                    ) : (
                                                      <span style={{ color: '#94a3b8' }}>---</span>
                                                    )}
                                                  </td>
                                                  <td style={{ padding: '8px 10px', color: '#475569' }}>{expDate}</td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{uName}</td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{qty.toLocaleString('vi-VN')}</td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>{price.toLocaleString('vi-VN')} đ</td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#e8442a' }}>{total.toLocaleString('vi-VN')} đ</td>
                                                </tr>
                                              );
                                            })
                                          )}
                                        </tbody>
                                      </table>
                                    </div>

                                    {loadedDoc.note && (
                                      <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>
                                        Ghi chú: <span style={{ color: '#334155', fontStyle: 'italic' }}>{loadedDoc.note}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* TAB 2: LỊCH SỬ THANH TOÁN */}
                                {currentTab === 'payment' && (
                                  <div style={{ padding: 16 }}>
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                        <thead>
                                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, textAlign: 'left' }}>
                                            <th style={{ padding: '8px 10px' }}>Mã phiếu thu/chi</th>
                                            <th style={{ padding: '8px 10px' }}>Thời gian</th>
                                            <th style={{ padding: '8px 10px' }}>Phương thức</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Số tiền thanh toán</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Trạng thái</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {cashFlowsList.length === 0 && deductedDebt === 0 ? (
                                            <tr>
                                              <td colSpan={5} style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>
                                                Chưa có lịch sử giao dịch thanh toán
                                              </td>
                                            </tr>
                                          ) : (
                                            <>
                                              {deductedDebt > 0 && (
                                                <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }}>
                                                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#16a34a' }}>{`DED-${loadedDoc.code}`}</td>
                                                  <td style={{ padding: '8px 10px', color: '#475569' }}>
                                                    {loadedDoc.orderDate ? dayjs(loadedDoc.orderDate).format('DD/MM/YYYY HH:mm') : dayjs(loadedDoc.createdAt).format('DD/MM/YYYY HH:mm')}
                                                  </td>
                                                  <td style={{ padding: '8px 10px', color: '#16a34a', fontWeight: 600 }}>Cấn trừ nợ NCC</td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                                                    {deductedDebt.toLocaleString('vi-VN')} đ
                                                  </td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                    <span style={{ padding: '2px 6px', borderRadius: 4, background: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 600 }}>
                                                      Đã trừ nợ
                                                    </span>
                                                  </td>
                                                </tr>
                                              )}
                                              {cashFlowsList.map((cf, idx) => {
                                              const isRounding = cf.type === 5 || cf.type === 'Rounding';
                                              return (
                                                <tr key={cf.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: isRounding ? '#fffbeb' : 'transparent' }}>
                                                  <td style={{ padding: '8px 10px', fontWeight: 700, color: isRounding ? '#d97706' : '#2563eb' }}>{cf.code || `CF${idx + 1}`}</td>
                                                  <td style={{ padding: '8px 10px', color: '#475569' }}>
                                                    {cf.businessDate ? dayjs(cf.businessDate).format('DD/MM/YYYY HH:mm') : (cf.createdAt ? dayjs(cf.createdAt).format('DD/MM/YYYY HH:mm') : '---')}
                                                  </td>
                                                  <td style={{ padding: '8px 10px', color: '#334155' }}>
                                                    {isRounding ? 'Làm tròn (Rounding)' : (cf.paymentMethod || 'Tiền mặt')}
                                                  </td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: isRounding ? '#d97706' : '#059669' }}>
                                                    {Number(cf.totalAmount || 0).toLocaleString('vi-VN')} đ
                                                  </td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                    <span style={{ padding: '2px 6px', borderRadius: 4, background: isRounding ? '#fef3c7' : '#dcfce7', color: isRounding ? '#b45309' : '#15803d', fontSize: 10, fontWeight: 600 }}>
                                                      {isRounding ? 'Làm tròn' : (cf.status || 'Hoàn thành')}
                                                    </span>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                            </>
                                          )}
                                        </tbody>
                                      </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* TAB 3: HÌNH ẢNH */}
                                  {currentTab === 'image' && (() => {
                                    let imgs = loadedDoc.imageUrls || doc.imageUrls || [];
                                    if (typeof imgs === 'string') {
                                      try {
                                        imgs = JSON.parse(imgs);
                                      } catch (e) {
                                        imgs = imgs ? [imgs] : [];
                                      }
                                    }
                                    if (!Array.isArray(imgs)) imgs = [];

                                    return (
                                      <div style={{ padding: 16 }}>
                                        {imgs.length === 0 ? (
                                          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                                            <PictureOutlined style={{ fontSize: 36, marginBottom: 8, color: '#cbd5e1' }} />
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Không có ảnh</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Chưa có hình ảnh biên lai hoặc bằng chứng chất lượng hàng nào cho phiếu nhập này.</div>
                                          </div>
                                        ) : (
                                          <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
                                              Danh sách hình ảnh biên lai / nhận hàng ({imgs.length}):
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
                                                    e.currentTarget.style.transform = 'none';
                                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                                                  }}
                                                  title="Bấm để phóng to xem chi tiết"
                                                >
                                                  <img
                                                    src={url}
                                                    alt={`Ảnh ${imgIdx + 1}`}
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
                                                      fontSize: 18,
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
                                                      bottom: 4,
                                                      left: 4,
                                                      background: 'rgba(15, 23, 42, 0.75)',
                                                      color: '#ffffff',
                                                      fontSize: 10,
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
                                </>
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

      {/* CONFIRM DELETE MODAL OVERLAY */}
      {confirmDeleteDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(2px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 8, padding: 20, width: '100%', maxWidth: 400, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              {confirmDeleteDoc.status === 0 || confirmDeleteDoc.status === 'Pending' ? 'Xác nhận xóa vĩnh viễn phiếu lưu tạm' : 'Xác nhận hủy phiếu nhập kho'}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 16, lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa phiếu <strong style={{ color: '#e8442a' }}>{confirmDeleteDoc.code}</strong> không?
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: 12, cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => executeDelete(confirmDeleteDoc)}
                style={{ padding: '6px 14px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#ffffff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER PAGINATION */}
      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={documents.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />

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

export default ImportTable;
