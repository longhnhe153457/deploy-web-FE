import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SwapOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import { getTransferById } from '../api/documentApi';
import { ReferenceLink } from '../utils/documentNavHelper';
import InventoryPrintPortal from '../components/inventory/common/InventoryPrintPortal';

const Transfer_Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialDoc = location.state?.document || null;
  const [doc, setDoc] = useState(initialDoc);
  const [loading, setLoading] = useState(!initialDoc);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getTransferById(id);
      if (res) {
        setDoc(res);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết phiếu chuyển kho:', err);
      message.error('Không thể tải thông tin phiếu chuyển kho.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const detailsList = useMemo(() => {
    if (!doc) return [];
    const list = doc.details || doc.documentDetails || [];
    return list.map((dt, idx) => {
      const pCode = dt.productCode || dt.snapshotProductCode || dt.code || `SP${idx + 1}`;
      const pName = dt.productName || dt.snapshotProductName || dt.name || 'Sản phẩm';
      const uName = dt.unitName || dt.snapshotUnitName || 'Đơn vị';
      const sendQty = Number(dt.quantity || 0);
      const receiveQty = Number(dt.receivedQuantity ?? dt.quantity ?? 0);
      const diffQty = receiveQty - sendQty;
      const price = Number(dt.unitPrice || dt.snapshotAvgCost || 0);
      const total = sendQty * price;

      return {
        ...dt,
        pCode,
        pName,
        uName,
        sendQty,
        receiveQty,
        diffQty,
        price,
        total
      };
    });
  }, [doc]);

  const totalAmount = useMemo(() => {
    if (doc?.totalAmount && doc.totalAmount > 0) return Number(doc.totalAmount);
    return detailsList.reduce((sum, item) => sum + item.total, 0);
  }, [doc, detailsList]);

  // Transfer status rendering
  const getTransferStatusBadge = () => {
    const st = doc?.transferStatus;
    if (st === 'Received' || st === 3) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 12, fontWeight: 700 }}>
          <CheckCircleOutlined /> Đã nhận hàng
        </span>
      );
    }
    if (st === 'Rejected' || st === 5 || doc?.status === 'Cancelled' || doc?.status === 2) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 12, fontWeight: 700 }}>
          <CloseCircleOutlined /> Đã từ chối / Hủy
        </span>
      );
    }
    if (st === 'PartialReceived' || st === 4) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontSize: 12, fontWeight: 700 }}>
          <ClockCircleOutlined /> Đã nhận một phần
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', fontSize: 12, fontWeight: 700 }}>
        <ClockCircleOutlined /> Đang vận chuyển
      </span>
    );
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const docDate = dayjs(doc?.businessDate || doc?.createdAt).format('DDMMYYYY');
    document.title = `MenuGO_ChuyenKho_${doc?.code || id}_${docDate}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh', background: '#f8fafc', overflow: 'hidden', boxSizing: 'border-box' }}>
      {/* HEADER */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/inventory-management?tab=Transfer')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <ArrowLeftOutlined /> Quay lại danh sách
          </button>

          <div style={{ borderLeft: '1px solid #e2e8f0', height: 24 }} />

          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              Quản lý kho / Chuyển kho / Chi tiết phiếu chuyển
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {doc?.code || 'Phiếu chuyển kho'}
              </span>
              {getTransferStatusBadge()}
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
          {/* THẺ 1: TUYẾN CHUYỂN KHO */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SwapOutlined style={{ color: '#0284c7' }} /> Lộ trình chuyển kho
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Từ chi nhánh xuất:</span>
                <strong style={{ color: '#0f172a' }}>{doc?.branchName || doc?.snapshotBranchName || 'Chi nhánh gửi'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Đến chi nhánh nhận:</span>
                <strong style={{ color: '#0284c7' }}>{doc?.toBranchName || doc?.snapshotToBranchName || 'Chi nhánh nhận'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Mã chứng từ:</span>
                <span style={{ fontWeight: 700, color: '#0891b2' }}>{doc?.code}</span>
              </div>
              {doc?.parentDocumentId && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Chứng từ tham chiếu:</span>
                  <ReferenceLink
                    code={doc?.parentDocumentCode}
                    id={doc?.parentDocumentId}
                    navigate={navigate}
                    style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* THẺ 2: NHÂN SỰ & THỜI GIAN */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: '#2563eb' }} /> Nhân sự & Thời gian
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Người gửi:</span>
                <strong style={{ color: '#0f172a' }}>{doc?.creatorName || doc?.snapshotCreatedByName || doc?.creator || 'Quản lý gửi'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Ngày gửi:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>
                  <CalendarOutlined style={{ marginRight: 4, color: '#94a3b8' }} />
                  {doc?.businessDate || doc?.createdAt ? dayjs(doc.businessDate || doc.createdAt).format('DD/MM/YYYY HH:mm') : '---'}
                </span>
              </div>
              {doc?.snapshotReceiverName && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Người nhận:</span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>
                    {doc.snapshotReceiverName} {doc.responseDate ? `(${dayjs(doc.responseDate).format('DD/MM/YYYY HH:mm')})` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* THẺ 3: GIÁ TRỊ LÔ HÀNG */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AppstoreOutlined style={{ color: '#059669' }} /> Tổng quan lô chuyển
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Số lượng mặt hàng:</span>
                <strong style={{ color: '#0f172a' }}>{detailsList.length} mặt hàng</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tổng giá trị chuyển:</span>
                <strong style={{ color: '#0284c7', fontSize: 14 }}>{Math.round(totalAmount).toLocaleString('vi-VN')} đ</strong>
              </div>
            </div>
          </div>
        </div>

        {/* GHI CHÚ */}
        {doc?.note && (
          <div style={{ padding: '10px 16px', borderRadius: 6, background: '#eff6ff', border: '1px solid #dbeafe', color: '#1d4ed8', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined />
            <span><strong>Ghi chú chuyển kho:</strong> {doc.note}</span>
          </div>
        )}

        {/* BẢNG SẢN PHẨM CHUYỂN KHO */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 12.5, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AppstoreOutlined /> Chi tiết mặt hàng chuyển kho ({detailsList.length})
          </div>
          <div style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                  <th style={{ padding: '10px 12px' }}>Mã SP</th>
                  <th style={{ padding: '10px 12px' }}>Tên sản phẩm</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>ĐVT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>SL gửi</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>SL thực nhận</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Chênh lệch</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Đơn giá (đ)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tổng giá trị (đ)</th>
                </tr>
              </thead>
              <tbody>
                {detailsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      Chưa có chi tiết sản phẩm chuyển kho
                    </td>
                  </tr>
                ) : (
                  detailsList.map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          onClick={() => navigate(`/inventory-management?tab=Product&search=${encodeURIComponent(item.pCode || item.code || '')}`)}
                          style={{
                            color: '#2563eb',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                          title="Nhấp để chuyển tới Quản lý tồn kho hàng hóa"
                        >
                          {item.pCode}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{item.pName}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>{item.uName}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{item.sendQty.toLocaleString('vi-VN')}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{item.receiveQty.toLocaleString('vi-VN')}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: item.diffQty < 0 ? '#dc2626' : (item.diffQty > 0 ? '#059669' : '#64748b') }}>
                        {item.diffQty !== 0 ? (item.diffQty > 0 ? `+${item.diffQty}` : item.diffQty) : '0'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                        {Math.round(item.price).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>
                        {Math.round(item.total).toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))
                )}
                <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={7} style={{ padding: '12px 14px', textAlign: 'right', color: '#1e293b', fontSize: 12 }}>
                    TỔNG GIÁ TRỊ LÔ HÀNG:
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13.5, fontWeight: 900, color: '#0284c7' }}>
                    {Math.round(totalAmount).toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* KHUNG IN PHIẾU CHUYỂN KHO CHUẨN A4 */}
      <InventoryPrintPortal
        title="PHIẾU CHUYỂN KHO NỘI BỘ"
        subTitle={`Mã phiếu: ${doc?.code || '---'} | Ngày gửi: ${doc?.businessDate || doc?.createdAt ? dayjs(doc.businessDate || doc.createdAt).format('DD/MM/YYYY HH:mm') : '---'} | Trạng thái: ${doc?.status === 1 ? 'Đã nhận đủ' : 'Đang chuyển hàng'}`}
        docCode={doc?.code}
        branchName={doc?.branchName || doc?.snapshotBranchName}
        metaItems={[
          { label: 'Từ chi nhánh xuất', value: doc?.branchName || doc?.snapshotBranchName },
          { label: 'Đến chi nhánh nhận', value: doc?.toBranchName || doc?.snapshotToBranchName },
          { label: 'Người tạo lệnh chuyển', value: doc?.creatorName || doc?.snapshotCreatedByName || doc?.creator },
          { label: 'Người tiếp nhận', value: doc?.snapshotReceiverName || 'Chưa nhận' },
          { label: 'Thời gian xuất gửi', value: doc?.businessDate || doc?.createdAt ? dayjs(doc.businessDate || doc.createdAt).format('DD/MM/YYYY HH:mm') : '---' },
          { label: 'Thời gian thực nhận', value: doc?.responseDate ? dayjs(doc.responseDate).format('DD/MM/YYYY HH:mm') : '---' },
          { label: 'Tổng số mặt hàng', value: `${detailsList.length} mặt hàng` },
          { label: 'Tổng giá trị chuyển', value: `${Math.round(totalAmount).toLocaleString('vi-VN')} đ` },
          { label: 'Ghi chú chuyển', value: doc?.note || 'Không có ghi chú' }
        ]}
        signatures={[
          { title: 'Người lập phiếu', subtitle: '(Ký, ghi rõ họ tên)', name: doc?.creatorName || doc?.snapshotCreatedByName || '' },
          { title: 'Người giao hàng', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Thủ kho nhận hàng', subtitle: '(Ký, ghi rõ họ tên)', name: doc?.snapshotReceiverName || '' },
          { title: 'Quản lý / Giám đốc duyệt', subtitle: '(Ký, ghi rõ họ tên)', name: '' }
        ]}
      >
        <div className="print-section-heading">CHI TIẾT MẶT HÀNG CHUYỂN KHO TRUY VẾT ({detailsList.length})</div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '35px' }}>STT</th>
              <th style={{ width: '90px' }}>Mã nguyên liệu</th>
              <th>Tên nguyên liệu</th>
              <th style={{ width: '55px' }}>ĐVT</th>
              <th style={{ width: '75px' }}>SL gửi</th>
              <th style={{ width: '75px' }}>SL nhận</th>
              <th style={{ width: '75px' }}>Lệch</th>
              <th style={{ width: '90px' }}>Đơn giá (đ)</th>
              <th style={{ width: '100px' }}>Thành tiền (đ)</th>
            </tr>
          </thead>
          <tbody>
            {detailsList.length === 0 ? (
              <tr>
                <td colSpan={9} className="print-text-center">Chưa có chi tiết sản phẩm chuyển kho</td>
              </tr>
            ) : (
              detailsList.map((item, idx) => (
                <tr key={idx}>
                  <td className="print-text-center">{idx + 1}</td>
                  <td className="print-font-bold">{item.pCode}</td>
                  <td>{item.pName}</td>
                  <td className="print-text-center">{item.uName}</td>
                  <td className="print-text-right">{item.sendQty.toLocaleString('vi-VN')}</td>
                  <td className="print-text-right print-font-bold">{item.receiveQty.toLocaleString('vi-VN')}</td>
                  <td className="print-text-right print-font-bold" style={{ color: item.diffQty < 0 ? '#b91c1c' : (item.diffQty > 0 ? '#15803d' : '#000') }}>
                    {item.diffQty !== 0 ? (item.diffQty > 0 ? `+${item.diffQty}` : item.diffQty) : '0'}
                  </td>
                  <td className="print-text-right">{Math.round(item.price || 0).toLocaleString('vi-VN')}</td>
                  <td className="print-text-right print-font-bold">{Math.round(item.total || 0).toLocaleString('vi-VN')}</td>
                </tr>
              ))
            )}
            <tr>
              <td colSpan={8} className="print-text-right print-font-bold">TỔNG GIÁ TRỊ LÔ HÀNG CHUYỂN:</td>
              <td className="print-text-right print-font-bold">{Math.round(totalAmount).toLocaleString('vi-VN')} đ</td>
            </tr>
          </tbody>
        </table>
      </InventoryPrintPortal>
    </div>
  );
};

export default Transfer_Detail;
