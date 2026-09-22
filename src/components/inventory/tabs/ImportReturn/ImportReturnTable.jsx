import React, { useState } from 'react';
import PaginationFooter from '../../../shared/PaginationFooter';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  EnvironmentOutlined,
  PrinterOutlined,
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  CreditCardOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { getReturnDocumentById, getDocumentById } from '../../../../api/documentApi';

const ImportReturnTable = ({
  documents = [],
  searchText,
  setSearchText,
  statusFilter = 'ALL',
  setStatusFilter,
  loading,
  onOpenReturnModal,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [activeTabMap, setActiveTabMap] = useState({});
  const [loadedDocMap, setLoadedDocMap] = useState({});
  const [loadingDocId, setLoadingDocId] = useState(null);

  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.ceil(documents.length / pageSize) || 1;
  const currentData = documents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleExpand = async (docId) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
    } else {
      setExpandedDocId(docId);
      if (!activeTabMap[docId]) {
        setActiveTabMap((prev) => ({ ...prev, [docId]: 'info' }));
      }

      if (!loadedDocMap[docId]) {
        setLoadingDocId(docId);
        try {
          const fullDoc = await getReturnDocumentById(docId);
          if (fullDoc) {
            setLoadedDocMap((prev) => ({ ...prev, [docId]: fullDoc }));
          }
        } catch (err) {
          console.error(`Failed to load details for return document #${docId}`, err);
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

  const handlePrint = (code, e) => {
    e?.stopPropagation();
    alert(`Đang chuẩn bị in phiếu trả: ${code}`);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', background: '#ffffff', overflow: 'hidden', width: '100%' }}>
      {/* HEADER ACTION TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* SEARCH */}
          {setSearchText && (
            <div style={{ position: 'relative', width: 280 }}>
              <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
              <input
                type="text"
                placeholder="Theo mã phiếu trả, mã phiếu nhập, NCC..."
                value={searchText || ''}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  width: '100%', height: 32, padding: '4px 10px 4px 30px',
                  fontSize: 12, fontWeight: 500, color: '#1e293b',
                  borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none'
                }}
              />
            </div>
          )}

          {/* STATUS FILTER */}
          {setStatusFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
              {[{ key: 'ALL', label: 'Tất cả' }, { key: 'Completed', label: 'Hoàn thành' }].map((st) => {
                const active = statusFilter === st.key;
                return (
                  <button key={st.key} type="button" onClick={() => setStatusFilter(st.key)}
                    style={{
                      padding: '4px 10px', fontSize: 11.5,
                      fontWeight: active ? 700 : 500,
                      color: active ? '#ea580c' : '#475569',
                      background: active ? '#ffffff' : 'transparent',
                      border: 'none', borderRadius: 4, cursor: 'pointer',
                      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}>
                    {st.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onOpenReturnModal && (
            <button type="button" onClick={onOpenReturnModal}
              style={{
                background: 'linear-gradient(135deg, #e8442a, #f97316)',
                color: '#ffffff', border: 'none', borderRadius: 6,
                padding: '0 14px', height: 32, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 4px rgba(232, 68, 42, 0.25)'
              }}>
              <PlusOutlined /> Trả hàng nhập
            </button>
          )}
          <button type="button"
            onClick={() => { if (setSearchText) setSearchText(''); if (setStatusFilter) setStatusFilter('ALL'); if (onRefresh) onRefresh(); }}
            style={{ background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0 12px', height: 32, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ReloadOutlined /> Làm mới
          </button>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid #cbd5e1', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textWrap: 'nowrap' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>
              <th style={{ padding: '9px 10px', textAlign: 'left' }}>MÃ PHIẾU TRẢ</th>
              <th style={{ padding: '9px 10px', textAlign: 'left' }}>PHIẾU NHẬP GỐC</th>
              <th style={{ padding: '9px 10px', textAlign: 'left' }}>NHÀ CUNG CẤP</th>
              <th style={{ padding: '9px 10px', textAlign: 'left' }}>NGÀY TRẢ</th>
              <th style={{ padding: '9px 10px', textAlign: 'right' }}>TỔNG TIỀN TRẢ (₫)</th>
              <th style={{ padding: '9px 10px', textAlign: 'right' }}>NCC ĐÃ THANH TOÁN (₫)</th>
              <th style={{ padding: '9px 10px', textAlign: 'center' }}>TRẠNG THÁI</th>
              <th style={{ padding: '9px 10px', textAlign: 'left' }}>NGƯỜI TẠO</th>
              <th style={{ padding: '9px 10px', textAlign: 'center' }}>CHI TIẾT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                <LoadingOutlined style={{ marginRight: 6 }} />Đang tải dữ liệu...
              </td></tr>
            ) : currentData.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <RollbackOutlined style={{ fontSize: 28, color: '#cbd5e1' }} />
                  <span>Chưa có phiếu trả hàng nhập nào</span>
                </div>
              </td></tr>
            ) : (
              currentData.map((doc) => {
                const isExpanded = expandedDocId === doc.id;
                const currentTab = activeTabMap[doc.id] || 'info';
                const loadedDoc = loadedDocMap[doc.id] || null;
                const partnerName = loadedDoc?.partnerName || doc.partnerName || doc.snapshotPartnerName || 'Nhà cung cấp';
                const totalAmt = Math.round(Number(loadedDoc?.totalAmount ?? doc.totalAmount ?? 0));
                const paidAmt = Math.round(Number(loadedDoc?.amountPaid ?? doc.amountPaid ?? 0));
                const parentCode = loadedDoc?.parentDocumentCode || doc.parentDocumentCode || (doc.parentDocumentId ? `#${doc.parentDocumentId}` : '---');

                return (
                  <React.Fragment key={doc.id}>
                    {/* MASTER ROW */}
                    <tr onClick={() => toggleExpand(doc.id)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isExpanded ? '#fff7ed' : 'transparent',
                        cursor: 'pointer', transition: 'background 0.2s'
                      }}>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: '#e8442a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <RollbackOutlined style={{ fontSize: 10, color: '#ea580c' }} />
                          {doc.code}
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px', color: '#475569', fontSize: 11 }}>
                        <span style={{ fontFamily: 'monospace', color: '#334155', fontWeight: 600 }}>{parentCode}</span>
                      </td>
                      <td style={{ padding: '9px 10px', color: '#334155', fontWeight: 600 }}>{partnerName}</td>
                      <td style={{ padding: '9px 10px', color: '#334155' }}>
                        {dayjs(doc.orderDate || doc.createdAt).format('DD/MM/YYYY HH:mm')}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#e8442a' }}>
                        {totalAmt.toLocaleString('vi-VN')} ₫
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                        {paidAmt.toLocaleString('vi-VN')} ₫
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 10, fontWeight: 600 }}>
                          Hoàn thành
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px', color: '#64748b' }}>
                        {doc.snapshotCreatedByName || doc.creator || 'Hệ thống'}
                      </td>
                      {/* CỘT CHI TIẾT */}
                      <td style={{ padding: '9px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/import-return-detail/${doc.id}`, { state: { document: loadedDoc || doc } })}
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

                    {/* EXPANDED DETAIL ROW */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0, background: '#fafafa', borderBottom: '2px solid #e2e8f0' }}>
                          <div style={{ background: '#ffffff', borderTop: '1px dashed #cbd5e1' }}>

                            {/* TABS BAR */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 16px', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <button onClick={() => handleTabChange(doc.id, 'info')}
                                  style={{
                                    padding: '10px 16px', border: 'none', background: 'transparent',
                                    fontWeight: currentTab === 'info' ? 700 : 500,
                                    color: currentTab === 'info' ? '#e8442a' : '#64748b',
                                    borderBottom: currentTab === 'info' ? '2px solid #e8442a' : '2px solid transparent',
                                    cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5
                                  }}>
                                  <InfoCircleOutlined /> Thông tin phiếu
                                </button>
                                <button onClick={() => handleTabChange(doc.id, 'payment')}
                                  style={{
                                    padding: '10px 16px', border: 'none', background: 'transparent',
                                    fontWeight: currentTab === 'payment' ? 700 : 500,
                                    color: currentTab === 'payment' ? '#e8442a' : '#64748b',
                                    borderBottom: currentTab === 'payment' ? '2px solid #e8442a' : '2px solid transparent',
                                    cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5
                                  }}>
                                  <CreditCardOutlined /> Lịch sử thanh toán
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => navigate(`/import-return-detail/${doc.id}`, { state: { document: loadedDoc || doc } })}
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

                            {/* LOADING STATE */}
                            {loadingDocId === doc.id ? (
                              <div style={{ padding: 28, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                                <LoadingOutlined style={{ marginRight: 6 }} />Đang tải chi tiết phiếu trả...
                              </div>
                            ) : (
                              <>
                                {/* ---- TAB: THÔNG TIN ---- */}
                                {currentTab === 'info' && (() => {
                                  const d = loadedDoc || doc;
                                  const details = d.details || [];
                                  const supplierName = d.partnerName || d.snapshotPartnerName || 'Nhà cung cấp';
                                  const branchName = d.branchName || d.snapshotBranchName || 'Chi nhánh';
                                  const creatorName = d.snapshotCreatedByName || d.createdByName || d.creator || 'Hệ thống';
                                  const docRawTotalAmt = Number(d.totalAmount || 0);
                                  const cfs = d.cashFlows || [];
                                  const roundingCF = cfs.find((cf) => cf.type === 5 || cf.type === 'Rounding');
                                  const roundingAmt = Number(roundingCF?.totalAmount || 0);
                                  const docEffectiveAmt = docRawTotalAmt - roundingAmt;
                                  const docTotalAmt = docRawTotalAmt;
                                  const docPaidAmt = Math.round(Number(d.amountPaid || 0));
                                  const parentDocCode = d.parentDocumentCode || (d.parentDocumentId ? `#${d.parentDocumentId}` : '---');

                                  return (
                                    <div style={{ padding: 16 }}>
                                      {/* HEADER META */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{d.code}</span>
                                            <span style={{ padding: '2px 8px', borderRadius: 4, background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', fontSize: 10, fontWeight: 600 }}>
                                              Trả hàng nhập
                                            </span>
                                            <span style={{ padding: '2px 8px', borderRadius: 4, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 10, fontWeight: 600 }}>
                                              Hoàn thành
                                            </span>
                                          </div>
                                          <div style={{ color: '#64748b', fontSize: 11, marginTop: 4, display: 'flex', gap: 12 }}>
                                            <span>Người tạo: <strong style={{ color: '#334155' }}>{creatorName}</strong></span>
                                            <span>Thời gian: <strong style={{ color: '#334155' }}>{dayjs(d.orderDate || d.createdAt).format('DD/MM/YYYY HH:mm')}</strong></span>
                                            <span>Phiếu nhập gốc: <strong style={{ color: '#e8442a' }}>{parentDocCode}</strong></span>
                                          </div>
                                        </div>
                                        <div style={{ color: '#475569', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <EnvironmentOutlined style={{ color: '#e8442a' }} />
                                          <span>{branchName}</span>
                                        </div>
                                      </div>

                                      {/* SUPPLIER BOX (Đã bỏ dữ liệu lặp) */}
                                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px', background: '#fafafa', marginBottom: 16 }}>
                                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Nhà cung cấp</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{supplierName}</div>
                                        {d.note && <div style={{ color: '#64748b', fontSize: 11, marginTop: 6 }}>Ghi chú: <em>{d.note}</em></div>}
                                      </div>

                                      {/* ITEMS TABLE */}
                                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                          <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>
                                              <th style={{ padding: '8px 10px', textAlign: 'center', width: 36 }}>STT</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'left' }}>MÃ HÀNG</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'left' }}>TÊN HÀNG</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'center' }}>ĐVT</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'center' }}>SL TRẢ</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>ĐƠN GIÁ TRẢ (₫)</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>THÀNH TIỀN (₫)</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {details.length === 0 ? (
                                              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                                                {loadedDoc ? 'Phiếu trả không có chi tiết hàng hóa' : 'Đang tải...'}
                                              </td></tr>
                                            ) : (
                                              details.map((item, idx) => {
                                                const qty = Number(item.quantity || 0);
                                                const price = Number(item.unitPrice || 0);
                                                const amount = Math.round(Number(item.totalPrice ?? qty * price));
                                                const productName = item.snapshotProductName || item.productName || 'Sản phẩm';
                                                const productCode = item.snapshotProductCode || item.productCode || `SP${item.bInventoryId}`;
                                                const unitName = item.snapshotUnitName || item.unitName || 'Cái';

                                                return (
                                                  <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                                                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#334155' }}>{productCode}</td>
                                                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{productName}</td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                      <span style={{ padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', fontSize: 10, border: '1px solid #cbd5e1', fontWeight: 600 }}>
                                                        {unitName}
                                                      </span>
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#ea580c' }}>
                                                      {qty.toLocaleString('vi-VN')}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                                      {Math.round(price).toLocaleString('vi-VN')}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                      {amount.toLocaleString('vi-VN')}
                                                    </td>
                                                  </tr>
                                                );
                                              })
                                            )}
                                          </tbody>
                                          {details.length > 0 && (
                                            <tfoot>
                                              <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                                                <td colSpan={6} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>
                                                  Tổng tiền hàng trả:
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#e8442a', fontSize: 13 }}>
                                                  {docTotalAmt.toLocaleString('vi-VN')} ₫
                                                </td>
                                              </tr>
                                            </tfoot>
                                          )}
                                        </table>
                                      </div>

                                      {/* FINANCIAL SUMMARY */}
                                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <div style={{ width: 340, background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12 }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, paddingBottom: 6, borderBottom: '1px dashed #e2e8f0' }}>
                                            <span style={{ color: '#64748b' }}>Tổng tiền hàng gốc:</span>
                                            <strong style={{ color: '#0f172a' }}>{docRawTotalAmt.toLocaleString('vi-VN')} ₫</strong>
                                          </div>
                                          {roundingAmt !== 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#d97706', marginBottom: 6 }}>
                                              <span>ĐC Làm tròn (Rounding):</span>
                                              <strong>{roundingAmt > 0 ? `-${roundingAmt.toLocaleString('vi-VN')}` : `+${Math.abs(roundingAmt).toLocaleString('vi-VN')}`} ₫</strong>
                                            </div>
                                          )}
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                                            <span style={{ color: '#64748b', fontWeight: 600 }}>Cần thu NCC (Đã làm tròn):</span>
                                            <strong style={{ color: '#059669' }}>{docEffectiveAmt.toLocaleString('vi-VN')} ₫</strong>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                                            <span style={{ color: '#64748b' }}>NCC đã thanh toán:</span>
                                            <strong style={{ color: '#16a34a' }}>{docPaidAmt.toLocaleString('vi-VN')} ₫</strong>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
                                            <span style={{ color: '#64748b', fontWeight: 600 }}>Còn lại phải thu:</span>
                                            <strong style={{ color: docEffectiveAmt - docPaidAmt > 0 ? '#ef4444' : '#059669', fontSize: 13 }}>
                                              {Math.max(0, docEffectiveAmt - docPaidAmt).toLocaleString('vi-VN')} ₫
                                            </strong>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* ---- TAB: LỊCH SỬ THANH TOÁN ---- */}
                                {currentTab === 'payment' && (() => {
                                  const cashFlows = loadedDoc?.cashFlows || [];

                                  return (
                                    <div style={{ padding: 16 }}>
                                      {cashFlows.length === 0 ? (
                                        <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                                          {loadedDoc
                                            ? 'Phiếu trả hàng này chưa có giao dịch thanh toán nào từ nhà cung cấp.'
                                            : 'Đang tải...'}
                                        </div>
                                      ) : (
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                            <thead>
                                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>
                                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>MÃ PHIẾU THU</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>THỜI GIAN</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>PHƯƠNG THỨC</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>SỐ TIỀN THU (₫)</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'center' }}>TRẠNG THÁI</th>
                                                <th style={{ padding: '8px 10px', textAlign: 'left' }}>GHI CHÚ</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {cashFlows.map((cf, idx) => {
                                                const isRounding = cf.type === 5 || cf.type === 'Rounding';
                                                const pm = isRounding
                                                  ? 'Làm tròn (Rounding)'
                                                  : (cf.paymentMethod === 'BankTransfer' || cf.paymentMethod === 'Chuyển khoản'
                                                    ? 'Chuyển khoản'
                                                    : 'Tiền mặt');

                                                return (
                                                  <tr key={cf.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: isRounding ? '#fffbeb' : 'transparent' }}>
                                                    <td style={{ padding: '8px 10px', fontWeight: 600, color: isRounding ? '#d97706' : '#e8442a' }}>
                                                      {cf.code || `PTHU-${cf.id}`}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: '#334155' }}>
                                                      {cf.businessDate
                                                        ? dayjs(cf.businessDate).format('DD/MM/YYYY HH:mm')
                                                        : '---'}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: '#334155' }}>
                                                      {pm}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: isRounding ? '#d97706' : '#16a34a', fontSize: 12 }}>
                                                      {Number(cf.totalAmount || cf.amount || 0).toLocaleString('vi-VN')} ₫
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                      <span style={{ padding: '2px 6px', borderRadius: 4, background: isRounding ? '#fef3c7' : '#ecfdf5', color: isRounding ? '#b45309' : '#059669', border: isRounding ? '1px solid #fcd34d' : '1px solid #a7f3d0', fontSize: 10, fontWeight: 600 }}>
                                                        {isRounding ? 'Làm tròn' : 'Đã thu'}
                                                      </span>
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: '#64748b' }}>
                                                      {cf.note || '---'}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
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

      {/* PAGINATION */}
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

export default ImportReturnTable;
