import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SearchOutlined,
  ReloadOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  InboxOutlined,
  FilterOutlined,
  SettingOutlined,
  CloseOutlined,
  EditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getBatches, getBatchExpirySummary, getBatchAlertSettings, updateBatchAlertSettings } from '../../../../api/batchApi';
import { renderBatchStatusBadge, renderExpiryStatusBadge } from '../../utils/batchHelper';
import BatchTraceabilityDrawer from './BatchTraceabilityDrawer';
import BatchDateEditModal from './BatchDateEditModal';
import PaginationFooter from '../../../shared/PaginationFooter';

const showNotificationToast = (text, type = 'success') => {
  const toast = document.createElement('div');
  toast.innerText = text;
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
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

const BatchExpiryTab = ({ selectedBranchId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get('search') || '';

  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Summary Metrics State
  const [summary, setSummary] = useState({
    totalBatches: 0,
    activeBatches: 0,
    expiredBatches: 0,
    nearExpiryBatches: 0,
    criticalBatches: 0,
    validBatches: 0,
    noExpiryBatches: 0
  });

  // Filter States
  const [searchText, setSearchText] = useState(searchFromUrl);
  const [expiryStatusFilter, setExpiryStatusFilter] = useState('ALL'); // ALL, expired, near_expiry, valid, no_expiry
  const [batchStatusFilter, setBatchStatusFilter] = useState(null); // null, 1(Active), 2(Depleted), 3(Expired), 4(Locked)
  const [nearExpiryDays, setNearExpiryDays] = useState(7);

  // Sync searchText when URL searchParam changes
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (currentSearch !== searchText) {
      setSearchText(currentSearch);
      setCurrentPage(1);
    }
  }, [searchParams]);

  const handleSearchChange = (val) => {
    setSearchText(val);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set('search', val);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  // Traceability Drawer State
  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
  const [selectedTraceBatchId, setSelectedTraceBatchId] = useState(null);

  // Date Edit Modal State
  const [dateEditModalOpen, setDateEditModalOpen] = useState(false);
  const [selectedDateEditBatch, setSelectedDateEditBatch] = useState(null);
  const [dateEditField, setDateEditField] = useState('expiryDate');

  const handleOpenDateEdit = (batch, field = 'expiryDate') => {
    setSelectedDateEditBatch(batch);
    setDateEditField(field);
    setDateEditModalOpen(true);
  };

  // Settings Modal State
  const [settingModalOpen, setSettingModalOpen] = useState(false);
  const [alertSettings, setAlertSettings] = useState({ criticalDays: 7, warningDays: 14 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingError, setSettingError] = useState('');

  // Fetch alert settings của chi nhánh
  const fetchAlertSettings = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      const res = await getBatchAlertSettings(selectedBranchId);
      if (res) {
        setAlertSettings({
          criticalDays: res.criticalDays || 7,
          warningDays: res.warningDays || 14
        });
        setNearExpiryDays(res.warningDays || 14);
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình cảnh báo hạn dùng:', err);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchAlertSettings();
  }, [fetchAlertSettings]);

  // Fetch summary counts
  const fetchSummary = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      const res = await getBatchExpirySummary(selectedBranchId, nearExpiryDays);
      if (res) {
        setSummary(res);
      }
    } catch (err) {
      console.error('Lỗi khi tải thống kê hạn sử dụng:', err);
    }
  }, [selectedBranchId, nearExpiryDays]);

  // Fetch paginated batches
  const fetchBatchesList = useCallback(async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const res = await getBatches({
        branchId: selectedBranchId,
        search: searchText,
        expiryStatus: expiryStatusFilter !== 'ALL' ? expiryStatusFilter : undefined,
        status: batchStatusFilter !== null ? batchStatusFilter : undefined,
        nearExpiryDays: nearExpiryDays,
        page: currentPage,
        pageSize: pageSize
      });

      setBatches(res?.items || []);
      setTotalCount(res?.totalCount || 0);
    } catch (err) {
      console.error('Lỗi khi tải danh sách Lô theo dõi HSD:', err);
      setBatches([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, searchText, expiryStatusFilter, batchStatusFilter, nearExpiryDays, currentPage, pageSize]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchBatchesList();
  }, [fetchBatchesList]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handleRefresh = () => {
    fetchSummary();
    fetchBatchesList();
  };

  const handleSaveAlertSettings = async () => {
    setSettingError('');
    const crit = Number(alertSettings.criticalDays);
    const warn = Number(alertSettings.warningDays);

    if (isNaN(crit) || crit < 7) {
      setSettingError('Số ngày cấp bách phải từ 7 ngày trở lên.');
      return;
    }
    if (isNaN(warn) || warn < 14) {
      setSettingError('Số ngày cảnh báo phải từ 14 ngày trở lên.');
      return;
    }
    if (warn < crit) {
      setSettingError('Số ngày cảnh báo phải lớn hơn hoặc bằng số ngày cấp bách.');
      return;
    }

    setSavingSettings(true);
    try {
      await updateBatchAlertSettings({
        branchId: selectedBranchId,
        criticalDays: crit,
        warningDays: warn
      });
      showNotificationToast('Lưu thiết lập thông báo thành công!', 'success');
      setNearExpiryDays(warn);
      setSettingModalOpen(false);
      handleRefresh();
    } catch (err) {
      console.error('Lỗi khi lưu thiết lập thông báo:', err);
      setSettingError(err.response?.data?.message || 'Không thể lưu thiết lập thông báo.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', height: '100%', overflow: 'hidden', padding: 16 }}>
      
      {/* ─── 1. TOP KPI SUMMARY CARDS ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {/* TỔNG SỐ LÔ */}
        <div
          onClick={() => { setExpiryStatusFilter('ALL'); setCurrentPage(1); }}
          style={{
            background: '#ffffff',
            borderRadius: 8,
            padding: '12px 14px',
            border: expiryStatusFilter === 'ALL' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: 11.5, fontWeight: 600 }}>
            <span>Tổng số Lô</span>
            <InboxOutlined style={{ fontSize: 16, color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
            {summary.totalBatches}
          </div>
          <div style={{ fontSize: 10.5, color: '#059669', marginTop: 2 }}>
            {summary.activeBatches} Lô đang hoạt động
          </div>
        </div>

        {/* ĐÃ HẾT HẠN (EXPIRED) */}
        <div
          onClick={() => { setExpiryStatusFilter('expired'); setCurrentPage(1); }}
          style={{
            background: '#fef2f2',
            borderRadius: 8,
            padding: '12px 14px',
            border: expiryStatusFilter === 'expired' ? '2px solid #dc2626' : '1px solid #fecaca',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#991b1b', fontSize: 11.5, fontWeight: 700 }}>
            <span>Đã hết hạn</span>
            <CloseCircleOutlined style={{ fontSize: 16, color: '#dc2626' }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
            {summary.expiredBatches}
          </div>
          <div style={{ fontSize: 10.5, color: '#b91c1c', marginTop: 2 }}>
            Cần xuất hủy hoặc xử lý
          </div>
        </div>

        {/* SẮP HẾT HẠN (NEAR EXPIRY) */}
        <div
          onClick={() => { setExpiryStatusFilter('near_expiry'); setCurrentPage(1); }}
          style={{
            background: '#fffbeb',
            borderRadius: 8,
            padding: '12px 14px',
            border: expiryStatusFilter === 'near_expiry' ? '2px solid #d97706' : '1px solid #fde68a',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#92400e', fontSize: 11.5, fontWeight: 700 }}>
            <span>Sắp hết hạn (≤ {nearExpiryDays} ngày)</span>
            <WarningOutlined style={{ fontSize: 16, color: '#d97706' }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {summary.nearExpiryBatches}
          </div>
          <div style={{ fontSize: 10.5, color: '#b45309', marginTop: 2 }}>
            {summary.criticalBatches} Lô khẩn cấp (≤ 3 ngày)
          </div>
        </div>

        {/* KHÔNG CÓ HẠN SỬ DỤNG (NO EXPIRY) */}
        <div
          onClick={() => { setExpiryStatusFilter('no_expiry'); setCurrentPage(1); }}
          style={{
            background: '#f8fafc',
            borderRadius: 8,
            padding: '12px 14px',
            border: expiryStatusFilter === 'no_expiry' ? '2px solid #64748b' : '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#334155', fontSize: 11.5, fontWeight: 700 }}>
            <span>Không có HSD</span>
            <ClockCircleOutlined style={{ fontSize: 16, color: '#64748b' }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#334155', marginTop: 4 }}>
            {summary.noExpiryBatches}
          </div>
          <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
            Hàng không áp dụng HSD
          </div>
        </div>
      </div>

      {/* ─── 2. TOOLBAR & FILTERS ────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px 8px 0 0',
          border: '1px solid #e2e8f0',
          borderBottom: 'none',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* SEARCH INPUT */}
          <div style={{ position: 'relative', width: 280 }}>
            <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
            <input
              type="text"
              placeholder="Tìm theo mã Lô, tên mặt hàng, SKU..."
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: '100%',
                height: 32,
                padding: '4px 10px 4px 30px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                outline: 'none'
              }}
            />
          </div>

          {/* EXPIRY FILTER PILLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
            {[
              { key: 'ALL', label: 'Tất cả HSD' },
              { key: 'expired', label: 'Đã hết hạn' },
              { key: 'near_expiry', label: 'Sắp hết hạn' },
              { key: 'valid', label: 'Còn hạn' },
              { key: 'no_expiry', label: 'Không có HSD' }
            ].map((f) => {
              const active = expiryStatusFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setExpiryStatusFilter(f.key);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#ea580c' : '#475569',
                    background: active ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* BATCH STATUS SELECT */}
          <select
            value={batchStatusFilter !== null ? batchStatusFilter : ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value);
              setBatchStatusFilter(val);
              setCurrentPage(1);
            }}
            style={{
              height: 32,
              padding: '0 8px',
              fontSize: 11.5,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              outline: 'none'
            }}
          >
            <option value="">Tất cả trạng thái Lô</option>
            <option value="1">Đang hoạt động</option>
            <option value="2">Đã hết hàng</option>
            <option value="3">Đã hết hạn</option>
            <option value="4">Đã khóa</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleRefresh}
            style={{
              height: 32,
              padding: '0 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              background: '#ffffff',
              color: '#334155',
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

          <button
            type="button"
            onClick={() => {
              setSettingError('');
              fetchAlertSettings();
              setSettingModalOpen(true);
            }}
            style={{
              height: 32,
              padding: '0 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              background: '#ffffff',
              color: '#334155',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <SettingOutlined style={{ fontSize: 12 }} /> Cài đặt
          </button>
        </div>
      </div>

      {/* ─── 3. MAIN BATCH TABLE ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textWrap: 'nowrap' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155', fontWeight: 700, textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>Mã Lô</th>
              <th style={{ padding: '10px 12px' }}>Tên mặt hàng / Nguyên liệu</th>
              <th style={{ padding: '10px 12px' }}>Đơn vị</th>
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
            {loading ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  Đang nạp danh sách Lô hàng...
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  <InboxOutlined style={{ fontSize: 32, marginBottom: 6 }} />
                  <div>Không tìm thấy Lô hàng nào phù hợp với điều kiện lọc.</div>
                </td>
              </tr>
            ) : (
              batches.map((b) => {
                const qRem = Number(b.quantityRemaining || 0);
                const qOrig = Number(b.quantityOriginal || 0);
                const bCost = Number(b.unitCost || 0);

                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2563eb' }}>
                      {b.batchCode}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                      {b.productName}
                      <span style={{ color: '#64748b', fontSize: 10.5, marginLeft: 6 }}>
                        ({b.productCode})
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                      {b.unitName}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>
                      {qOrig.toLocaleString('vi-VN')}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: qRem > 0 ? '#059669' : '#dc2626'
                      }}
                    >
                      {qRem.toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#ea580c' }}>
                      {bCost.toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>
                      {b.manufactureDate ? dayjs(b.manufactureDate).format('DD/MM/YYYY') : '---'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#1e293b', fontWeight: 600 }}>
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
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <button
                          type="button"
                          title="Sửa ngày sản xuất & hạn sử dụng"
                          onClick={() => handleOpenDateEdit(b, 'expiryDate')}
                          style={{
                            background: '#ffffff',
                            color: '#2563eb',
                            border: '1px solid #cbd5e1',
                            borderRadius: 4,
                            padding: '4px 8px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <EditOutlined style={{ fontSize: 13 }} /> Sửa
                        </button>
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
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <CompassOutlined /> Truy vết Lô
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 4. FOOTER PAGINATION ─────────────────────────────────────────── */}
      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalCount}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />

      {/* ─── 5. BATCH TRACEABILITY DRAWER ───────────────────────────────────── */}
      <BatchTraceabilityDrawer
        open={traceDrawerOpen}
        batchId={selectedTraceBatchId}
        onClose={() => {
          setTraceDrawerOpen(false);
          setSelectedTraceBatchId(null);
        }}
        onActionSuccess={() => {
          fetchBatchesList();
          fetchSummary();
        }}
      />

      {/* ─── 5.1 MODAL SỬA NGÀY SX & HSD LÔ HÀNG ────────────────────────────── */}
      <BatchDateEditModal
        open={dateEditModalOpen}
        batch={selectedDateEditBatch}
        initialFocusField={dateEditField}
        onClose={() => {
          setDateEditModalOpen(false);
          setSelectedDateEditBatch(null);
        }}
        onSuccess={() => {
          fetchBatchesList();
          fetchSummary();
        }}
      />

      {/* ─── 6. MODAL CÀI ĐẶT THÔNG BÁO ───────────────────────────────────────── */}
      {settingModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)',
            padding: 16
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* HEADER: Cài đặt */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SettingOutlined style={{ fontSize: 18, color: '#2563eb' }} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Cài đặt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSettingModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <CloseOutlined />
              </button>
            </div>

            {/* BODY */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* TEXT: Thông báo */}
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', borderBottom: '1px dashed #cbd5e1', paddingBottom: 8 }}>
                Thông báo
              </div>

              {/* LINE 1: Cấp Bách */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', minWidth: 90 }}>
                  Cấp Bách:
                </label>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>dưới</span>
                <input
                  type="number"
                  min="7"
                  value={alertSettings.criticalDays}
                  onChange={(e) => setAlertSettings(prev => ({ ...prev, criticalDays: e.target.value }))}
                  style={{
                    width: 85,
                    height: 34,
                    padding: '4px 10px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Ngày</span>
              </div>

              {/* LINE 2: Cảnh báo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#d97706', minWidth: 90 }}>
                  Cảnh báo:
                </label>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>dưới</span>
                <input
                  type="number"
                  min="14"
                  value={alertSettings.warningDays}
                  onChange={(e) => setAlertSettings(prev => ({ ...prev, warningDays: e.target.value }))}
                  style={{
                    width: 85,
                    height: 34,
                    padding: '4px 10px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Ngày</span>
              </div>

              {/* THÔNG BÁO LỖI NẾU CÓ */}
              {settingError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                  {settingError}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10
              }}
            >
              <button
                type="button"
                onClick={() => setSettingModalOpen(false)}
                style={{
                  height: 34,
                  padding: '0 16px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  color: '#475569',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAlertSettings}
                disabled={savingSettings}
                style={{
                  height: 34,
                  padding: '0 20px',
                  background: savingSettings ? '#93c5fd' : '#2563eb',
                  border: 'none',
                  borderRadius: 6,
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: savingSettings ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}
              >
                {savingSettings ? 'Đang lưu...' : 'Lưu thiết lập'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchExpiryTab;
