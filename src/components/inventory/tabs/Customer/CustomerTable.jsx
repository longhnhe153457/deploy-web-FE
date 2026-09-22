import React, { useState, useEffect } from 'react';
import PaginationFooter from '../../../shared/PaginationFooter';
import { useNavigate } from 'react-router-dom';
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  TrophyOutlined,
  HistoryOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { getCustomerPurchases, getCustomerPoints } from '../../../../api/customerManagementApi';
import { useSignalR } from '../../../../context/SignalRContext';
import dayjs from 'dayjs';

const CustomerDetailSection = ({
  customer,
  onEditCustomer,
  onDeleteCustomer,
  onAdjustPoints,
  onEditPointTransaction,
  onDeletePointTransaction
}) => {
  const navigate = useNavigate();
  const connection = useSignalR();
  const [purchases, setPurchases] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('info');

  const fetchDetailHistory = async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const [pRes, ptRes] = await Promise.allSettled([
        getCustomerPurchases(customer.id),
        getCustomerPoints(customer.id)
      ]);

      if (pRes.status === 'fulfilled') setPurchases(pRes.value || []);
      if (ptRes.status === 'fulfilled') setPoints(ptRes.value || []);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử khách hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailHistory();
  }, [customer?.id]);

  // Lắng nghe SignalR để tự động cập nhật lịch sử mua hàng và biến động điểm theo thời gian thực
  useEffect(() => {
    if (!connection || !customer?.id) return;

    const handleCustomerUpdate = (data) => {
      if (!data?.customerId || data.customerId === customer.id) {
        fetchDetailHistory();
      }
    };

    const handleNotification = (notif) => {
      if (
        (notif?.type === 'payment_completed' || notif?.type === 'order_completed') &&
        (!notif?.customerId || notif.customerId === customer.id)
      ) {
        fetchDetailHistory();
      }
    };

    connection.on('ReceiveCustomerUpdate', handleCustomerUpdate);
    connection.on('ReceiveNotification', handleNotification);

    return () => {
      connection.off('ReceiveCustomerUpdate', handleCustomerUpdate);
      connection.off('ReceiveNotification', handleNotification);
    };
  }, [connection, customer?.id]);

  // Chuẩn hóa mã hóa đơn: đảm bảo dạng chuẩn HD{Id}, loại bỏ số 0 thừa từ dữ liệu cũ (HD014935 -> HD14935)
  const formatInvoiceCode = (code, orderId) => {
    if (orderId) return `HD${orderId}`;
    if (!code) return '';
    return code.replace(/^HD0+(\d+)$/i, 'HD$1');
  };

  // Click vào mã hóa đơn để mở trực tiếp Invoice Detail trong tab Hóa đơn
  const handleOpenInvoice = (invoiceCode, orderId) => {
    const formatted = formatInvoiceCode(invoiceCode, orderId);
    if (!formatted) return;
    navigate(`/inventory-management?tab=Invoice&search=${encodeURIComponent(formatted)}`);
  };

  const currentPoints = customer?.point ?? 0;

  return (
    <div style={{ padding: 16 }}>
      {/* HEADER SUB TABS */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '0 8px',
          marginBottom: 14,
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex' }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('info')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              fontWeight: activeSubTab === 'info' ? 700 : 500,
              color: activeSubTab === 'info' ? '#ea580c' : '#64748b',
              borderBottom: activeSubTab === 'info' ? '2px solid #ea580c' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Thông tin khách hàng
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              fontWeight: activeSubTab === 'history' ? 700 : 500,
              color: activeSubTab === 'history' ? '#ea580c' : '#64748b',
              borderBottom: activeSubTab === 'history' ? '2px solid #ea580c' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Lịch sử mua hàng ({purchases.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('points')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              fontWeight: activeSubTab === 'points' ? 700 : 500,
              color: activeSubTab === 'points' ? '#ea580c' : '#64748b',
              borderBottom: activeSubTab === 'points' ? '2px solid #ea580c' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Lịch sử điểm ({points.length})
          </button>
        </div>

        {/* NÚT TÁC VỤ NGỮ CẢNH THEO TỪNG SUB TAB */}
        <div style={{ display: 'flex', gap: 8, paddingRight: 4 }}>
          <button
            type="button"
            onClick={() => navigate(`/customer-detail/${customer.id}`, { state: { customer } })}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: 5,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <EyeOutlined style={{ color: '#e8442a' }} /> Chi tiết khách hàng
          </button>
          {/* KHI XEM THÔNG TIN KHÁCH HÀNG: HIỆN SỬA THÔNG TIN HOẶC XÓA KHÁCH HÀNG */}
          {activeSubTab === 'info' && (
            <>
              <button
                type="button"
                onClick={() => onEditCustomer && onEditCustomer(customer)}
                style={{
                  background: '#ffffff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  borderRadius: 5,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <EditOutlined /> Sửa thông tin
              </button>
              <button
                type="button"
                onClick={() => onDeleteCustomer && onDeleteCustomer(customer.id)}
                style={{
                  background: '#ffffff',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: 5,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <DeleteOutlined /> Xóa khách hàng
              </button>
            </>
          )}

          {/* KHI XEM LỊCH SỬ ĐIỂM: HIỆN ĐIỀU CHỈNH / SỬA ĐIỂM */}
          {activeSubTab === 'points' && (
            <button
              type="button"
              onClick={() => onAdjustPoints && onAdjustPoints(customer)}
              style={{
                background: '#fff7ed',
                color: '#c2410c',
                border: '1px solid #fed7aa',
                borderRadius: 5,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <TrophyOutlined /> Điều chỉnh điểm
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
          Đang tải dữ liệu chi tiết khách hàng...
        </div>
      ) : (
        <>
          {/* TAB 1: THÔNG TIN KHÁCH HÀNG */}
          {activeSubTab === 'info' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: 10.5, marginBottom: 2 }}>Tên khách hàng</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{customer.name}</div>
                </div>

                <div style={{ background: '#fff7ed', padding: '10px 12px', borderRadius: 6, border: '1px solid #fed7aa' }}>
                  <div style={{ color: '#c2410c', fontSize: 10.5, marginBottom: 2, fontWeight: 600 }}>
                    <TrophyOutlined style={{ marginRight: 4 }} /> Điểm tích lũy hiện tại
                  </div>
                  <div style={{ fontWeight: 800, color: '#ea580c', fontSize: 16 }}>
                    {currentPoints.toLocaleString('vi-VN')} điểm
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: 10.5, marginBottom: 2 }}>Số điện thoại</div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 12 }}>{customer.phone || 'Chưa cập nhật'}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: 10.5, marginBottom: 2 }}>Email</div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 12 }}>{customer.email || 'Chưa cập nhật'}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LỊCH SỬ MUA HÀNG (CLICK MỞ HÓA ĐƠN) */}
          {activeSubTab === 'history' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShoppingCartOutlined style={{ color: '#ea580c' }} /> Danh sách hóa đơn đã mua
                </div>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>
                  * Nhấp vào mã hóa đơn để xem chi tiết hoặc in hóa đơn
                </span>
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: 9.5 }}>
                      <th style={{ padding: '7px 10px', textAlign: 'left' }}>Mã hóa đơn</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left' }}>Ngày giao dịch</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>Tổng tiền</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>Điểm nhận</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>Điểm dùng</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>Thực thanh toán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 18, color: '#94a3b8' }}>
                          Khách hàng chưa có lịch sử mua hàng trong hệ thống
                        </td>
                      </tr>
                    ) : (
                      purchases.map((p) => {
                        const invoiceCode = formatInvoiceCode(p.invoiceCode, p.orderId);
                        return (
                          <tr
                            key={p.orderId}
                            onClick={() => handleOpenInvoice(invoiceCode, p.orderId)}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <td style={{ padding: '7px 10px', fontWeight: 700, color: '#2563eb' }}>
                              {invoiceCode}
                            </td>
                            <td style={{ padding: '7px 10px', color: '#64748b' }}>
                              {dayjs(p.createdAt).format('DD/MM/YYYY HH:mm')}
                            </td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', color: '#475569' }}>
                            {p.totalAmount.toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                            +{Number(p.pointsEarned ?? 0).toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>
                            {(p.pointsUsed ?? 0) > 0 ? `-${Number(p.pointsUsed).toLocaleString('vi-VN')}` : '0'}
                          </td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            {p.finalAmount.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      );
                    })
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: LỊCH SỬ ĐIỂM (TÍCH ĐIỂM, TIÊU ĐIỂM, ĐIỀU CHỈNH THỦ CÔNG) */}
          {activeSubTab === 'points' && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <HistoryOutlined style={{ color: '#ea580c' }} /> Sổ cái lịch sử tích điểm
              </div>

              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: 9.5 }}>
                      <th style={{ padding: '7px 10px', textAlign: 'left' }}>Mã hóa đơn / Nguồn</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left' }}>Thời gian</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left' }}>Loại giao dịch</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>Thay đổi điểm</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>Điểm sau GD</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left' }}>Lý do</th>
                      <th style={{ padding: '7px 10px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: 18, color: '#94a3b8' }}>
                          Khách hàng chưa có lịch sử tích điểm nào
                        </td>
                      </tr>
                    ) : (
                      points.map((pt) => {
                        const formattedRelatedCode = formatInvoiceCode(pt.relatedCode, pt.orderId);
                        const isInvoiceRelated = Boolean(
                          pt.orderId || (formattedRelatedCode && formattedRelatedCode.startsWith('HD'))
                        );
                        const isManual = Boolean(pt.isManual);
                        const isReversed = Boolean(pt.isReversed);

                        return (
                          <tr
                            key={pt.id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: isReversed ? '#f8fafc' : 'transparent',
                              opacity: isReversed ? 0.6 : 1
                            }}
                          >
                            <td style={{ padding: '7px 10px' }}>
                              {isInvoiceRelated ? (
                                <span
                                  onClick={() => handleOpenInvoice(formattedRelatedCode, pt.orderId)}
                                  style={{
                                    fontWeight: 700,
                                    color: '#2563eb',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                  }}
                                  title="Nhấp để xem chi tiết hóa đơn"
                                >
                                  {formattedRelatedCode}
                                </span>
                              ) : (
                                <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                                  {pt.relatedCode || 'Điều chỉnh thủ công'}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '7px 10px', color: '#64748b' }}>
                              {dayjs(pt.time).format('DD/MM/YYYY HH:mm')}
                            </td>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>
                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  background: pt.typeEnum === 1 || pt.type === 'Tích điểm'
                                    ? '#ecfdf5'
                                    : pt.typeEnum === 2 || pt.type === 'Sử dụng điểm'
                                    ? '#fef2f2'
                                    : pt.typeEnum === 4 || pt.type === 'Hoàn tác điều chỉnh'
                                    ? '#f1f5f9'
                                    : '#fff7ed',
                                  color: pt.typeEnum === 1 || pt.type === 'Tích điểm'
                                    ? '#059669'
                                    : pt.typeEnum === 2 || pt.type === 'Sử dụng điểm'
                                    ? '#dc2626'
                                    : pt.typeEnum === 4 || pt.type === 'Hoàn tác điều chỉnh'
                                    ? '#64748b'
                                    : '#c2410c'
                                }}
                              >
                                {pt.type}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '7px 10px',
                                textAlign: 'right',
                                fontWeight: 800,
                                color: pt.pointChange > 0 ? '#16a34a' : '#dc2626'
                              }}
                            >
                              {pt.pointChange > 0 ? `+${pt.pointChange}` : pt.pointChange}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                              {pt.pointAfter}
                            </td>
                            <td style={{ padding: '7px 10px', color: '#475569', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pt.reason}>
                              {pt.reason}
                            </td>
                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                              {isManual && !isReversed ? (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => onEditPointTransaction && onEditPointTransaction(customer, pt)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#2563eb',
                                      cursor: 'pointer',
                                      fontSize: 10.5,
                                      fontWeight: 600,
                                      padding: '1px 4px'
                                    }}
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeletePointTransaction && onDeletePointTransaction(customer, pt)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                      fontSize: 10.5,
                                      fontWeight: 600,
                                      padding: '1px 4px'
                                    }}
                                  >
                                    Xóa
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: '#cbd5e1', fontSize: 11 }}>---</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const CustomerTable = ({
  customers = [],
  searchText,
  setSearchText,
  onOpenAddModal,
  onEditCustomer,
  onDeleteCustomer,
  onAdjustPoints,
  onEditPointTransaction,
  onDeletePointTransaction,
  onRefresh,
  loading = false
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [pageSize, setPageSize] = useState(20);

  const toggleExpand = (customerId) => {
    setExpandedCustomerId((prev) => (prev === customerId ? null : customerId));
  };

  const totalPages = Math.ceil(customers.length / pageSize) || 1;
  const currentData = customers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', background: '#ffffff', overflow: 'hidden', width: '100%' }}>
      {/* TOP ACTION TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {setSearchText && (
            <div style={{ position: 'relative', width: 290 }}>
              <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
              <input
                type="text"
                placeholder="Theo tên khách hàng, số điện thoại..."
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
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={onOpenAddModal}
            style={{
              background: 'linear-gradient(135deg, #ea580c, #f97316)',
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
              boxShadow: '0 2px 4px rgba(234, 88, 12, 0.25)'
            }}
          >
            <PlusOutlined style={{ fontSize: 12 }} /> Thêm khách hàng
          </button>

          <button
            type="button"
            onClick={onRefresh}
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
            <ReloadOutlined spin={loading} style={{ fontSize: 12 }} /> Làm mới
          </button>
        </div>
      </div>

      {/* DATA TABLE */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid #cbd5e1', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textWrap: 'nowrap' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textTransform: 'uppercase', color: '#334155', fontWeight: 700, fontSize: 10 }}>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>TÊN KHÁCH HÀNG</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>SỐ ĐIỆN THOẠI</th>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>EMAIL</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>ĐIỂM TÍCH LŨY</th>
              <th style={{ padding: '8px 10px', textAlign: 'center' }}>CHI TIẾT</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                  {loading ? 'Đang tải danh sách...' : 'Chưa có khách hàng nào phù hợp'}
                </td>
              </tr>
            ) : (
              currentData.map((c) => {
                const isExpanded = expandedCustomerId === c.id;
                const points = c.point ?? 0;

                return (
                  <React.Fragment key={c.id}>
                    <tr
                      onClick={() => toggleExpand(c.id)}
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                        background: isExpanded ? '#fff7ed' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = '#fafafa';
                      }}
                      onMouseLeave={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0f172a' }}>{c.name}</td>
                      <td style={{ padding: '9px 10px', color: '#334155' }}>{c.phone || '---'}</td>
                      <td style={{ padding: '9px 10px', color: '#475569' }}>{c.email || '---'}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: '#ea580c' }}>
                        {points.toLocaleString('vi-VN')} điểm
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/customer-detail/${c.id}`)}
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

                    {/* EXPANDED DETAIL CONTAINER */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={5} style={{ padding: '0 12px 14px 12px', borderBottom: '2px solid #cbd5e1' }}>
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
                            <CustomerDetailSection
                              customer={c}
                              onEditCustomer={onEditCustomer}
                              onDeleteCustomer={onDeleteCustomer}
                              onAdjustPoints={onAdjustPoints}
                              onEditPointTransaction={onEditPointTransaction}
                              onDeletePointTransaction={onDeletePointTransaction}
                            />
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
        totalItems={customers.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  );
};

export default CustomerTable;
