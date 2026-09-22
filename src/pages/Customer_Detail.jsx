import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  PrinterOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  TrophyOutlined,
  HistoryOutlined,
  DollarCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import { getCustomerById, getCustomerPurchases, getCustomerPoints } from '../api/customerManagementApi';
import { ReferenceLink } from '../utils/documentNavHelper';
import InventoryPrintPortal from '../components/inventory/common/InventoryPrintPortal';

const Customer_Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialCustomer = location.state?.customer || location.state?.document || null;
  const [customer, setCustomer] = useState(initialCustomer);
  const [purchases, setPurchases] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(!initialCustomer);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'points'

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [custRes, purRes, ptsRes] = await Promise.allSettled([
        getCustomerById(id),
        getCustomerPurchases(id),
        getCustomerPoints(id)
      ]);

      if (custRes.status === 'fulfilled' && custRes.value) {
        setCustomer(custRes.value);
      }
      if (purRes.status === 'fulfilled') {
        setPurchases(Array.isArray(purRes.value) ? purRes.value : []);
      }
      if (ptsRes.status === 'fulfilled') {
        setPointsHistory(Array.isArray(ptsRes.value) ? ptsRes.value : []);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết khách hàng:', err);
      message.error('Không thể tải thông tin chi tiết khách hàng.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const formatInvoiceCode = (code, orderId) => {
    if (orderId) return `HD${orderId}`;
    if (!code) return '';
    return code.replace(/^HD0+(\d+)$/i, 'HD$1');
  };

  const totalSpent = purchases.reduce((sum, o) => sum + Number(o.finalAmount ?? o.totalAmount ?? o.total ?? 0), 0);
  const points = Number(customer?.point ?? customer?.points ?? 0);

  const handlePrint = () => {
    const originalTitle = document.title;
    const custClean = (customer?.name || 'KhachHang').replace(/[^a-zA-Z0-9À-ỹ]/g, '_');
    document.title = `MenuGO_HoSoKhachHang_${customer?.phone || id}_${custClean}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
    }, 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh', background: '#f8fafc', overflow: 'hidden', boxSizing: 'border-box' }}>
      {/* HEADER */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/inventory-management?tab=Customer')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <ArrowLeftOutlined /> Quay lại danh sách
          </button>

          <div style={{ borderLeft: '1px solid #e2e8f0', height: 24 }} />

          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              Quản lý kho / Khách hàng / Hồ sơ khách hàng
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {customer?.name || 'Khách hàng'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: 11, fontWeight: 700 }}>
                <TrophyOutlined /> {points.toLocaleString('vi-VN')} điểm
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <PrinterOutlined /> In phiếu
          </button>
          <button
            type="button"
            onClick={fetchDetail}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            <ReloadOutlined spin={loading} /> Làm mới
          </button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* THẺ 1: THÔNG TIN KHÁCH HÀNG */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: '#2563eb' }} /> Thông tin cá nhân
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PhoneOutlined style={{ color: '#059669' }} />
                <span style={{ color: '#64748b' }}>Số điện thoại:</span>
                <strong style={{ color: '#0f172a' }}>{customer?.phone || 'Chưa cập nhật'}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MailOutlined style={{ color: '#2563eb' }} />
                <span style={{ color: '#64748b' }}>Email:</span>
                <span style={{ color: '#334155' }}>{customer?.email || 'Chưa cập nhật'}</span>
              </div>
            </div>
          </div>

          {/* THẺ 2: ĐIỂM TÍCH LŨY */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrophyOutlined style={{ color: '#d97706' }} /> Điểm thưởng thành viên
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Điểm hiện có:</span>
                <strong style={{ fontSize: 15, color: '#b45309' }}>{points.toLocaleString('vi-VN')} điểm</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Giá trị quy đổi giảm giá:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>{(points * 1000).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>

          {/* THẺ 3: TỔNG CHI TIÊU */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarCircleOutlined style={{ color: '#059669' }} /> Tổng mức chi tiêu
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Số đơn đã phục vụ:</span>
                <strong style={{ color: '#0f172a' }}>{purchases.length} hóa đơn</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tổng số tiền đã chi:</span>
                <strong style={{ fontSize: 14, color: '#059669' }}>{Math.round(totalSpent).toLocaleString('vi-VN')} đ</strong>
              </div>
            </div>
          </div>
        </div>

        {/* BẢNG LỊCH SỬ ĐƠN HÀNG VÀ ĐIỂM */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 16px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              style={{
                padding: '12px 16px',
                fontSize: 12.5,
                fontWeight: 700,
                color: activeTab === 'orders' ? '#e8442a' : '#64748b',
                borderBottom: activeTab === 'orders' ? '2px solid #e8442a' : '2px solid transparent',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <FileTextOutlined /> Lịch sử mua hàng ({purchases.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('points')}
              style={{
                padding: '12px 16px',
                fontSize: 12.5,
                fontWeight: 700,
                color: activeTab === 'points' ? '#e8442a' : '#64748b',
                borderBottom: activeTab === 'points' ? '2px solid #e8442a' : '2px solid transparent',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <HistoryOutlined /> Lịch sử điểm ({pointsHistory.length})
            </button>
          </div>

          {activeTab === 'orders' && (
            <div style={{ maxHeight: '450px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                    <th style={{ padding: '10px 12px' }}>Mã hóa đơn</th>
                    <th style={{ padding: '10px 12px' }}>Ngày giao dịch</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tổng tiền</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Điểm nhận</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Điểm dùng</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thực thanh toán</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        Khách hàng chưa có lịch sử mua hàng trong hệ thống
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p, idx) => {
                      const invoiceCode = formatInvoiceCode(p.invoiceCode, p.orderId) || (p.orderId ? `HD${p.orderId}` : `#${p.id}`);
                      return (
                        <tr key={p.orderId || p.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              onClick={() => navigate(`/inventory-management?tab=Invoice&search=${encodeURIComponent(invoiceCode)}`)}
                              style={{
                                color: '#2563eb',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                              title="Nhấp để xem danh sách hóa đơn bán hàng"
                            >
                              {invoiceCode}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>
                            {p.orderDate || p.createdAt ? dayjs(p.orderDate || p.createdAt).format('DD/MM/YYYY HH:mm') : '---'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                            {Math.round(Number(p.totalAmount ?? p.total ?? 0)).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                            +{Number(p.earnedPoints ?? p.pointsEarned ?? 0).toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                            {Number(p.usedPoints ?? p.pointsUsed ?? 0) > 0 ? `-${Number(p.usedPoints ?? p.pointsUsed ?? 0).toLocaleString('vi-VN')}` : '0'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            {Math.round(Number(p.finalAmount ?? p.totalAmount ?? p.total ?? 0)).toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      );
                    })
                  )}
                  <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={2} style={{ padding: '12px 14px', textAlign: 'right', color: '#1e293b', fontSize: 12 }}>
                      TỔNG CỘNG ({purchases.length} ĐƠN HÀNG):
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#64748b' }}>
                      {Math.round(purchases.reduce((s, o) => s + Number(o.totalAmount ?? o.total ?? 0), 0)).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#059669' }}>
                      +{purchases.reduce((s, o) => s + Number(o.earnedPoints ?? o.pointsEarned ?? 0), 0).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#dc2626' }}>
                      -{purchases.reduce((s, o) => s + Number(o.usedPoints ?? o.pointsUsed ?? 0), 0).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13.5, fontWeight: 900, color: '#059669' }}>
                      {Math.round(totalSpent).toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'points' && (
            <div style={{ maxHeight: '450px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                    <th style={{ padding: '10px 12px' }}>Mã tham chiếu</th>
                    <th style={{ padding: '10px 12px' }}>Thời gian</th>
                    <th style={{ padding: '10px 12px' }}>Loại biến động</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Biến động</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Điểm sau GD</th>
                    <th style={{ padding: '10px 12px' }}>Lý do / Nội dung</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        Khách hàng chưa có lịch sử tích điểm nào
                      </td>
                    </tr>
                  ) : (
                    pointsHistory.map((pt, idx) => {
                      const formattedRelatedCode = formatInvoiceCode(pt.relatedCode, pt.orderId);
                      const isInvoiceRelated = Boolean(
                        pt.orderId || (formattedRelatedCode && formattedRelatedCode.startsWith('HD'))
                      );
                      const isReversed = Boolean(pt.isReversed);
                      const pointChangeNum = Number(pt.pointChange ?? pt.pointDelta ?? pt.points ?? 0);

                      return (
                        <tr
                          key={pt.id || idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isReversed ? '#f8fafc' : (idx % 2 === 1 ? '#fafafa' : '#ffffff'),
                            opacity: isReversed ? 0.6 : 1
                          }}
                        >
                          <td style={{ padding: '10px 12px' }}>
                            {isInvoiceRelated ? (
                              <span
                                onClick={() => navigate(`/inventory-management?tab=Invoice&search=${encodeURIComponent(formattedRelatedCode)}`)}
                                style={{
                                  color: '#2563eb',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  textDecoration: 'underline'
                                }}
                                title="Nhấp để xem danh sách hóa đơn bán hàng"
                              >
                                {formattedRelatedCode}
                              </span>
                            ) : (
                              <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                                {pt.relatedCode || 'Điều chỉnh thủ công'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>
                            {pt.createdAt || pt.transactionDate ? dayjs(pt.createdAt || pt.transactionDate).format('DD/MM/YYYY HH:mm') : '---'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10.5,
                                fontWeight: 600,
                                background: pt.typeEnum === 1 || pt.type === 'Tích điểm'
                                  ? '#ecfdf5'
                                  : pt.typeEnum === 2 || pt.type === 'Sử dụng điểm'
                                  ? '#fef2f2'
                                  : pt.typeEnum === 4 || pt.type === 'Hoạt tác điều chỉnh' || pt.type === 'Hoàn tác điều chỉnh'
                                  ? '#f1f5f9'
                                  : '#fff7ed',
                                color: pt.typeEnum === 1 || pt.type === 'Tích điểm'
                                  ? '#059669'
                                  : pt.typeEnum === 2 || pt.type === 'Sử dụng điểm'
                                  ? '#dc2626'
                                  : pt.typeEnum === 4 || pt.type === 'Hoạt tác điều chỉnh' || pt.type === 'Hoàn tác điều chỉnh'
                                  ? '#64748b'
                                  : '#c2410c',
                                border: `1px solid ${
                                  pt.typeEnum === 1 || pt.type === 'Tích điểm'
                                    ? '#a7f3d0'
                                    : pt.typeEnum === 2 || pt.type === 'Sử dụng điểm'
                                    ? '#fecaca'
                                    : pt.typeEnum === 4 || pt.type === 'Hoạt tác điều chỉnh' || pt.type === 'Hoàn tác điều chỉnh'
                                    ? '#e2e8f0'
                                    : '#fed7aa'
                                }`
                              }}
                            >
                              {pt.type || (pointChangeNum > 0 ? 'Tích điểm' : 'Sử dụng điểm')}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              fontWeight: 800,
                              color: pointChangeNum > 0 ? '#16a34a' : '#dc2626'
                            }}
                          >
                            {pointChangeNum > 0 ? `+${pointChangeNum.toLocaleString('vi-VN')}` : pointChangeNum.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {pt.pointAfter != null ? Number(pt.pointAfter).toLocaleString('vi-VN') : '---'}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pt.reason || pt.note || ''}>
                            {pt.reason || pt.note || '---'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{ color: '#94a3b8' }}>---</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* KHUNG IN HỒ SƠ KHÁCH HÀNG CHUẨN A4 */}
      <InventoryPrintPortal
        title="HỒ SƠ KHÁCH HÀNG & LỊCH SỬ GIAO DỊCH"
        subTitle={`Khách hàng: ${customer?.name || '---'} | SĐT: ${customer?.phone || '---'} | In lúc: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
        docCode={customer?.phone || String(id)}
        branchName={localStorage.getItem('currentBranchName')}
        metaItems={[
          { label: 'Họ và tên khách hàng', value: customer?.name || '---' },
          { label: 'Số điện thoại liên hệ', value: customer?.phone || '---' },
          { label: 'Email cá nhân', value: customer?.email || 'Chưa cập nhật' },
          { label: 'Địa chỉ liên hệ', value: customer?.address || 'Chưa cập nhật' },
          { label: 'Điểm thưởng tích lũy', value: `${points.toLocaleString('vi-VN')} điểm` },
          { label: 'Giá trị quy đổi điểm', value: `${(points * 1000).toLocaleString('vi-VN')} đ` },
          { label: 'Tổng số đơn đã mua', value: `${purchases.length} hóa đơn` },
          { label: 'Tổng chi tiêu tích lũy', value: `${Math.round(totalSpent).toLocaleString('vi-VN')} đ` }
        ]}
        signatures={[
          { title: 'Nhân viên tra cứu', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Kế toán đối soát', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Quản lý duyệt', subtitle: '(Ký, ghi rõ họ tên)', name: '' }
        ]}
      >
        <div className="print-section-heading">I. LỊCH SỬ MUA HÀNG VÀ HÓA ĐƠN ({purchases.length})</div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '35px' }}>STT</th>
              <th style={{ width: '110px' }}>Mã hóa đơn</th>
              <th style={{ width: '130px' }}>Ngày giao dịch</th>
              <th style={{ width: '110px' }}>Tổng tiền (đ)</th>
              <th style={{ width: '80px' }}>Điểm cộng</th>
              <th style={{ width: '80px' }}>Điểm dùng</th>
              <th style={{ width: '120px' }}>Thực thanh toán (đ)</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={7} className="print-text-center">Chưa có phát sinh đơn hàng nào</td>
              </tr>
            ) : (
              purchases.map((p, idx) => {
                const invoiceCode = formatInvoiceCode(p.invoiceCode, p.orderId) || (p.orderId ? `HD${p.orderId}` : `#${p.id}`);
                const finalAmt = Math.round(Number(p.finalAmount ?? p.totalAmount ?? p.total ?? 0));
                const totalAmt = Math.round(Number(p.totalAmount ?? p.total ?? 0));
                const earned = Number(p.earnedPoints ?? p.pointsEarned ?? 0);
                const used = Number(p.usedPoints ?? p.pointsUsed ?? 0);

                return (
                  <tr key={idx}>
                    <td className="print-text-center">{idx + 1}</td>
                    <td className="print-font-bold">{invoiceCode}</td>
                    <td className="print-text-center">{p.orderDate || p.createdAt ? dayjs(p.orderDate || p.createdAt).format('DD/MM/YYYY HH:mm') : '---'}</td>
                    <td className="print-text-right">{totalAmt.toLocaleString('vi-VN')}</td>
                    <td className="print-text-right print-font-bold" style={{ color: '#059669' }}>+{earned.toLocaleString('vi-VN')}</td>
                    <td className="print-text-right print-font-bold" style={{ color: '#dc2626' }}>{used > 0 ? `-${used.toLocaleString('vi-VN')}` : '0'}</td>
                    <td className="print-text-right print-font-bold">{finalAmt.toLocaleString('vi-VN')}</td>
                  </tr>
                );
              })
            )}
            <tr className="print-total-row">
              <td colSpan={3} className="print-text-right print-font-bold">TỔNG CỘNG TÍCH LŨY:</td>
              <td className="print-text-right print-font-bold">
                {Math.round(purchases.reduce((s, o) => s + Number(o.totalAmount ?? o.total ?? 0), 0)).toLocaleString('vi-VN')}
              </td>
              <td className="print-text-right print-font-bold" style={{ color: '#059669' }}>
                +{purchases.reduce((s, o) => s + Number(o.earnedPoints ?? o.pointsEarned ?? 0), 0).toLocaleString('vi-VN')}
              </td>
              <td className="print-text-right print-font-bold" style={{ color: '#dc2626' }}>
                -{purchases.reduce((s, o) => s + Number(o.usedPoints ?? o.pointsUsed ?? 0), 0).toLocaleString('vi-VN')}
              </td>
              <td className="print-text-right print-font-bold">
                {Math.round(totalSpent).toLocaleString('vi-VN')}
              </td>
            </tr>
          </tbody>
        </table>

        {pointsHistory.length > 0 && (
          <>
            <div className="print-section-heading">II. LỊCH SỬ BIẾN ĐỘNG ĐIỂM THÀNH VIÊN ({pointsHistory.length})</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>STT</th>
                  <th style={{ width: '120px' }}>Mã tham chiếu</th>
                  <th style={{ width: '130px' }}>Thời gian</th>
                  <th style={{ width: '120px' }}>Loại biến động</th>
                  <th style={{ width: '90px' }}>Biến động</th>
                  <th style={{ width: '90px' }}>Điểm sau GD</th>
                  <th>Nội dung / Lý do</th>
                </tr>
              </thead>
              <tbody>
                {pointsHistory.map((pt, idx) => {
                  const formattedCode = formatInvoiceCode(pt.relatedCode, pt.orderId) || pt.relatedCode || '---';
                  const pChange = Number(pt.pointChange ?? pt.pointDelta ?? pt.points ?? 0);
                  return (
                    <tr key={idx}>
                      <td className="print-text-center">{idx + 1}</td>
                      <td className="print-font-bold">{formattedCode}</td>
                      <td className="print-text-center">{pt.createdAt || pt.transactionDate ? dayjs(pt.createdAt || pt.transactionDate).format('DD/MM/YYYY HH:mm') : '---'}</td>
                      <td>{pt.type || (pChange > 0 ? 'Tích điểm' : 'Sử dụng điểm')}</td>
                      <td className="print-text-right print-font-bold" style={{ color: pChange > 0 ? '#059669' : '#dc2626' }}>
                        {pChange > 0 ? `+${pChange.toLocaleString('vi-VN')}` : pChange.toLocaleString('vi-VN')}
                      </td>
                      <td className="print-text-right print-font-bold">
                        {pt.pointAfter != null ? Number(pt.pointAfter).toLocaleString('vi-VN') : '---'}
                      </td>
                      <td>{pt.reason || pt.note || '---'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </InventoryPrintPortal>
    </div>
  );
};

export default Customer_Detail;
