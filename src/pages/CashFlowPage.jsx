import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  DeleteOutlined,
  WalletOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useBranch } from '../context/BranchContext';
import { getCashFlows, deleteCashFlow } from '../api/cashFlowApi';
import CreateCashFlowModal from '../components/cashflow/CreateCashFlowModal';
import PaginationFooter from '../components/shared/PaginationFooter';
import '../styles/CashFlowPage.css';

/* ─── Helpers ─────────────────────────────── */
const formatMoney = (v) =>
  typeof v === 'number' ? v.toLocaleString('vi-VN') + ' ₫' : '—';

const formatDate = (d) =>
  d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—';

const METHOD_LABELS = {
  1: 'Tiền mặt', Cash: 'Tiền mặt',
  2: 'Thẻ', Card: 'Thẻ',
  3: 'Chuyển khoản', Transfer: 'Chuyển khoản',
};

/* ─── Page ─────────────────────────────────── */
const CashFlowPage = () => {
  const { currentBranchId } = useBranch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleNavigateToSource = (row) => {
    if (!row.sourceType || !row.sourceCode) return;
    let tab = '';
    if (row.sourceType === 'Import') {
      tab = 'Import';
    } else if (row.sourceType === 'Return') {
      tab = 'ImportReturn';
    } else if (row.sourceType === 'Sale') {
      tab = 'Invoice';
    } else {
      return;
    }
    navigate(`/inventory-management?tab=${tab}&search=${row.sourceCode}`);
  };

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDirection, setModalDirection] = useState(2);

  // Filters
  const searchFromUrl = searchParams.get('search') || '';
  const [searchText, setSearchText] = useState(searchFromUrl);
  const [dirFilter, setDirFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Confirm delete
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  /* ── Fetch ── */
  const fetchData = async () => {
    setLoading(true);
    try {
      const list = await getCashFlows(currentBranchId);
      setData(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [currentBranchId]);
  useEffect(() => {
    const q = searchParams.get('search') || '';
    if (q !== searchText) {
      setSearchText(q);
    }
  }, [searchParams]);
  useEffect(() => { setCurrentPage(1); }, [searchText, dirFilter, dateFrom, dateTo]);

  const handleSearchChange = (newVal) => {
    setSearchText(newVal);
    const newParams = new URLSearchParams(searchParams);
    if (newVal) {
      newParams.set('search', newVal);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  /* ── Filtered ── */
  const filtered = useMemo(() => {
    return data.filter((row) => {
      if (dirFilter === '1' && row.directionValue !== 1) return false;
      if (dirFilter === '2' && row.directionValue !== 2) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        if (
          !row.code?.toLowerCase().includes(q) &&
          !row.note?.toLowerCase().includes(q) &&
          !row.partnerName?.toLowerCase().includes(q) &&
          !row.documentCode?.toLowerCase().includes(q)
        ) return false;
      }
      if (dateFrom) {
        if (dayjs(row.businessDate).isBefore(dayjs(dateFrom).startOf('day'))) return false;
      }
      if (dateTo) {
        if (dayjs(row.businessDate).isAfter(dayjs(dateTo).endOf('day'))) return false;
      }
      return true;
    });
  }, [data, dirFilter, searchText, dateFrom, dateTo]);

  /* ── Stats ── */
  const totalInflow = useMemo(
    () => filtered.filter(r => r.directionValue === 1).reduce((s, r) => s + (r.totalAmount || 0), 0),
    [filtered]
  );
  const totalOutflow = useMemo(
    () => filtered.filter(r => r.directionValue === 2).reduce((s, r) => s + (r.totalAmount || 0), 0),
    [filtered]
  );
  const netBalance = totalInflow - totalOutflow;

  /* ── Paginated rows ── */
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pageData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  /* ── Delete ── */
  const handleDelete = async (id) => {
    try {
      await deleteCashFlow(id, 'Xóa thủ công');
      setConfirmDeleteId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="cashflow-container">

      {/* ─── TOP HEADER ─────────────────────────────────── */}
      <div className="cashflow-header">
        <div className="cashflow-header-title">
          <div className="cashflow-logo-wrapper">
            <WalletOutlined />
          </div>
          <h2 className="cashflow-header-text">
            SỔ THU CHI
          </h2>
        </div>
        <div className="cashflow-sync-status">
          <span className="cashflow-sync-dot" />
          Live Synced
        </div>
      </div>

      {/* ─── BODY ────────────────────────────────────────── */}
      <div className="cashflow-body">

        {/* ─── STAT CARDS ─── */}
        <div className="cashflow-stats-row">
          {/* Total Inflow */}
          <div className="cashflow-stat-card inflow">
            <div className="cashflow-stat-title-inflow">
              <ArrowUpOutlined style={{ marginRight: 4 }} />Tổng Thu
            </div>
            <div className="cashflow-stat-val-inflow">
              {totalInflow.toLocaleString('vi-VN')} ₫
            </div>
            <div className="cashflow-stat-subtitle inflow">
              {filtered.filter(r => r.directionValue === 1).length} phiếu
            </div>
          </div>

          {/* Total Outflow */}
          <div className="cashflow-stat-card outflow">
            <div className="cashflow-stat-title-outflow">
              <ArrowDownOutlined style={{ marginRight: 4 }} />Tổng Chi
            </div>
            <div className="cashflow-stat-val-outflow">
              {totalOutflow.toLocaleString('vi-VN')} ₫
            </div>
            <div className="cashflow-stat-subtitle outflow">
              {filtered.filter(r => r.directionValue === 2).length} phiếu
            </div>
          </div>

          {/* Net Balance */}
          <div className={`cashflow-stat-card net ${netBalance >= 0 ? 'positive' : 'negative'}`}>
            <div className={`cashflow-stat-title-net ${netBalance >= 0 ? 'positive' : 'negative'}`}>
              Số dư ròng
            </div>
            <div className={`cashflow-stat-val-net ${netBalance >= 0 ? 'positive' : 'negative'}`}>
              {netBalance < 0 ? '−' : '+'}{Math.abs(netBalance).toLocaleString('vi-VN')} ₫
            </div>
            <div className="cashflow-stat-subtitle net">{filtered.length} phiếu hiển thị</div>
          </div>
        </div>

        {/* ─── TOOLBAR ─── */}
        <div className="cashflow-toolbar">
          {/* Create buttons */}
          <button
            type="button"
            className="btn-create-inflow"
            onClick={() => { setModalDirection(1); setModalOpen(true); }}
          >
            <PlusOutlined /> Tạo phiếu Thu
          </button>
          <button
            type="button"
            className="btn-create-outflow"
            onClick={() => { setModalDirection(2); setModalOpen(true); }}
          >
            <PlusOutlined /> Tạo phiếu Chi
          </button>

          {/* Divider */}
          <div className="toolbar-divider" />

          {/* Search */}
          <div className="search-input-wrapper">
            <SearchOutlined className="search-icon" />
            <input
              type="text"
              placeholder="Tìm mã, ghi chú, đối tác..."
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Direction filter pills */}
          <div className="dir-filter-pills">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: '1', label: 'Thu' },
              { key: '2', label: 'Chi' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDirFilter(opt.key)}
                className={`dir-filter-btn ${dirFilter === opt.key ? 'active' : 'inactive'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="date-input"
          />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="date-input"
          />

          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="btn-clear-date"
            >
              <CloseCircleOutlined />
            </button>
          )}

          {/* Refresh */}
          <div style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="btn-refresh"
            >
              <ReloadOutlined className={loading ? 'spin-animation' : ''} />
              Làm mới
            </button>
          </div>
        </div>

        {/* ─── TABLE ─── */}
        <div className="cashflow-table-wrapper">
          <table className="cashflow-table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Loại</th>
                <th style={{ textAlign: 'right' }}>Số tiền</th>
                <th>Phương thức</th>
                <th>Đối tác</th>
                <th>Chứng từ gốc</th>
                <th>Ngày</th>
                <th style={{ maxWidth: 200 }}>Ghi chú</th>
                <th style={{ textAlign: 'center' }}>Xóa</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>Đang tải dữ liệu...</td></tr>
              ) : pageData.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                  {!currentBranchId ? 'Vui lòng chọn chi nhánh' : 'Chưa có phiếu thu chi nào'}
                </td></tr>
              ) : pageData.map((row) => (
                <tr
                  key={row.id}
                  className={row.directionValue === 1 ? 'row-inflow' : 'row-outflow'}
                >
                  <td>
                    {row.sourceType && row.sourceCode ? (
                      <span
                        className="code-text cashflow-reference-link"
                        onClick={() => handleNavigateToSource(row)}
                      >
                        {row.code}
                      </span>
                    ) : (
                      <span className="code-text">{row.code}</span>
                    )}
                  </td>
                  <td>
                    {row.directionValue === 1 ? (
                      <span className="tag-direction inflow">
                        <ArrowUpOutlined />Thu
                      </span>
                    ) : (
                      <span className="tag-direction outflow">
                        <ArrowDownOutlined />Chi
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`amount-text ${row.directionValue === 1 ? 'inflow' : 'outflow'}`}>
                      {row.directionValue === 2 ? '−' : '+'}{(row.totalAmount || 0).toLocaleString('vi-VN')} ₫
                    </span>
                  </td>
                  <td>{METHOD_LABELS[row.paymentMethod] || row.paymentMethod || '—'}</td>
                  <td>
                    {row.partnerName ? (
                      <span className="partner-text">{row.partnerName}</span>
                    ) : row.note && (row.note.includes('cho nhân viên') || row.note.includes('lương tháng')) ? (
                      <span className="partner-text" style={{ color: '#1677ff', fontWeight: 500 }}>
                        {row.note.includes('cho nhân viên')
                          ? 'NV: ' + row.note.substring(row.note.indexOf('cho nhân viên') + 14).trim()
                          : 'NV (Chi lương)'}
                      </span>
                    ) : (
                      <span className="empty-text">—</span>
                    )}
                  </td>
                  <td>
                    {row.documentCode ? (
                      <span
                        className="doc-code-tag cashflow-reference-link"
                        onClick={() => handleNavigateToSource(row)}
                      >
                        {row.documentCode}
                      </span>
                    ) : (
                      <span className="empty-text">—</span>
                    )}
                  </td>
                  <td>{formatDate(row.businessDate)}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.note || <span className="empty-text">—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {!row.documentId ? (
                      confirmDeleteId === row.id ? (
                        <span className="confirm-delete-group">
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="btn-confirm-yes"
                          >Xác nhận</button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="btn-confirm-no"
                          >Không</button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(row.id)}
                          title="Hủy phiếu"
                          className="btn-delete"
                        >
                          <DeleteOutlined />
                        </button>
                      )
                    ) : (
                      <span title="Phiếu từ chứng từ - không thể xóa" className="btn-delete-disabled">
                        <DeleteOutlined />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ─── PAGINATION ─── */}
        <PaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>

      {/* ─── MODAL ─── */}
      <CreateCashFlowModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); fetchData(); }}
        branchId={currentBranchId}
        defaultDirection={modalDirection}
      />
    </div>
  );
};

export default CashFlowPage;
