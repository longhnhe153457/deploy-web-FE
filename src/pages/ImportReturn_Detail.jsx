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
  RollbackOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarCircleOutlined,
  ShopOutlined,
  InfoCircleOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import { getReturnDocumentById, getDocumentById } from '../api/documentApi';
import { ReferenceLink } from '../utils/documentNavHelper';
import InventoryPrintPortal from '../components/inventory/common/InventoryPrintPortal';

const ImportReturn_Detail = () => {
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
      let res = null;
      try {
        res = await getReturnDocumentById(id);
      } catch (e) {
        console.warn('getReturnDocumentById failed, attempting getDocumentById fallback...', e);
      }
      if (!res) {
        res = await getDocumentById(id);
      }
      if (res) {
        setDoc(res);
      } else {
        throw new Error('Không tìm thấy dữ liệu phiếu');
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết phiếu trả hàng nhập:', err);
      message.error('Không thể tải thông tin phiếu trả hàng nhập.');
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
      const qty = Number(dt.quantity || 0);
      const price = Number(dt.unitPrice || dt.snapshotAvgCost || 0);
      const total = Number(dt.totalPrice || (qty * price) || 0);
      const note = dt.note || dt.reason || '---';

      return {
        ...dt,
        pCode,
        pName,
        uName,
        qty,
        price,
        total,
        note
      };
    });
  }, [doc]);

  const totalAmount = Number(doc?.totalAmount || 0);
  const amountPaid = Number(doc?.amountPaid || 0);
  const amountDue = Number(doc?.amountDue ?? (totalAmount - amountPaid));

  const handlePrint = () => {
    const originalTitle = document.title;
    const docDate = dayjs(doc?.orderDate || doc?.createdDate || doc?.createdAt).format('DDMMYYYY');
    const partnerClean = (doc?.partnerName || doc?.snapshotPartnerName || 'NCC').replace(/[^a-zA-Z0-9À-ỹ]/g, '_');
    document.title = `MenuGO_TraHang_${doc?.code || id}_${docDate}_${partnerClean}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh', background: '#f8fafc', overflow: 'hidden', boxSizing: 'border-box' }}>
      {/* HEADER BAR */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/inventory-management?tab=ImportReturn')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <ArrowLeftOutlined /> Quay lại danh sách
          </button>

          <div style={{ borderLeft: '1px solid #e2e8f0', height: 24 }} />

          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              Quản lý kho / Trả hàng nhập / Chi tiết phiếu trả hàng
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {doc?.code || 'Phiếu trả hàng'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 12, fontWeight: 700 }}>
                <CheckCircleOutlined /> Hoàn thành
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
          {/* THẺ 1: NHÀ CUNG CẤP & PHIẾU GỐC */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShopOutlined style={{ color: '#e8442a' }} /> Thông tin Nhà cung cấp & Chứng từ gốc
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Nhà cung cấp:</span>
                {doc?.partnerId ? (
                  <ReferenceLink id={doc.partnerId} type="Partner" navigate={navigate} style={{ fontWeight: 700 }}>
                    {doc?.partnerName || doc?.snapshotPartnerName || `NCC #${doc.partnerId}`}
                  </ReferenceLink>
                ) : (
                  <strong style={{ color: '#0f172a' }}>{doc?.partnerName || doc?.snapshotPartnerName || 'Nhà cung cấp'}</strong>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Phiếu nhập gốc:</span>
                <ReferenceLink
                  code={doc?.parentDocumentCode}
                  id={doc?.parentDocumentId}
                  type="Import"
                  navigate={navigate}
                  style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Mã phiếu trả:</span>
                <span style={{ fontWeight: 700, color: '#ea580c' }}>{doc?.code}</span>
              </div>
            </div>
          </div>

          {/* THẺ 2: NHÂN SỰ & THỜI GIAN */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: '#2563eb' }} /> Nhân sự & Thời gian
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Người tạo:</span>
                <strong style={{ color: '#0f172a' }}>{doc?.snapshotCreatedByName || doc?.creator || 'Hệ thống'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Ngày trả hàng:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>
                  <CalendarOutlined style={{ marginRight: 4, color: '#94a3b8' }} />
                  {doc?.orderDate || doc?.createdAt ? dayjs(doc.orderDate || doc.createdAt).format('DD/MM/YYYY HH:mm') : '---'}
                </span>
              </div>
            </div>
          </div>

          {/* THẺ 3: TIỀN HOÀN LẠI */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarCircleOutlined style={{ color: '#059669' }} /> Giá trị hoàn trả
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tổng tiền hoàn trả:</span>
                <strong style={{ color: '#e8442a', fontSize: 13 }}>{Math.round(totalAmount).toLocaleString('vi-VN')} đ</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>NCC đã thanh toán:</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>{Math.round(amountPaid).toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>NCC còn nợ lại:</span>
                <span style={{ color: amountDue > 0 ? '#dc2626' : '#059669', fontWeight: 800 }}>
                  {Math.round(amountDue).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GHI CHÚ */}
        {doc?.note && (
          <div style={{ padding: '10px 16px', borderRadius: 6, background: '#fff7ed', border: '1px solid #ffedd5', color: '#c2410c', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined />
            <span><strong>Lý do trả hàng:</strong> {doc.note}</span>
          </div>
        )}

        {/* BẢNG SẢN PHẨM HOÀN TRẢ */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 12.5, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AppstoreOutlined /> Danh sách mặt hàng hoàn trả ({detailsList.length})
          </div>
          <div style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                  <th style={{ padding: '10px 12px' }}>Mã SP</th>
                  <th style={{ padding: '10px 12px' }}>Tên sản phẩm</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>ĐVT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Số lượng trả</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Đơn giá nhập (đ)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thành tiền hoàn trả (đ)</th>
                  <th style={{ padding: '10px 12px' }}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {detailsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      Chưa có chi tiết sản phẩm hoàn trả
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
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                        {item.qty.toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                        {Math.round(item.price).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#e8442a' }}>
                        {Math.round(item.total).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.note}</td>
                    </tr>
                  ))
                )}
                {/* TỔNG KẾT */}
                <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={5} style={{ padding: '12px 14px', textAlign: 'right', color: '#1e293b', fontSize: 12 }}>
                    TỔNG GIÁ TRỊ HOÀN TRẢ:
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13.5, fontWeight: 900, color: '#e8442a' }}>
                    {Math.round(totalAmount).toLocaleString('vi-VN')} đ
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* KHUNG IN PHIẾU TRẢ HÀNG NHẬP CHUẨN A4 */}
      <InventoryPrintPortal
        title="PHIẾU TRẢ HÀNG NHẬP CHO NHÀ CUNG CẤP"
        subTitle={`Mã phiếu: ${doc?.code || '---'} | Ngày trả: ${doc?.orderDate || doc?.createdDate || doc?.createdAt ? dayjs(doc.orderDate || doc.createdDate || doc.createdAt).format('DD/MM/YYYY HH:mm') : '---'} | Trạng thái: Hoàn thành`}
        docCode={doc?.code}
        branchName={doc?.branchName || doc?.snapshotBranchName}
        metaItems={[
          { label: 'Nhà cung cấp', value: doc?.partnerName || doc?.snapshotPartnerName },
          { label: 'Phiếu nhập gốc', value: doc?.parentDocumentCode || 'Không có' },
          { label: 'Chi nhánh xuất trả', value: doc?.branchName || doc?.snapshotBranchName },
          { label: 'Người lập phiếu', value: doc?.creatorName || doc?.snapshotCreatedByName || doc?.creator },
          { label: 'Tổng tiền hoàn trả', value: `${Math.round(totalAmount).toLocaleString('vi-VN')} đ` },
          { label: 'Đã thu tiền hoàn', value: `${Math.round(amountPaid).toLocaleString('vi-VN')} đ` },
          { label: 'Ghi chú', value: doc?.note || 'Không có ghi chú' }
        ]}
        signatures={[
          { title: 'Người lập phiếu', subtitle: '(Ký, ghi rõ họ tên)', name: doc?.creatorName || doc?.snapshotCreatedByName || '' },
          { title: 'Đại diện NCC / Nhận hàng', subtitle: '(Ký, ghi rõ họ tên)', name: doc?.partnerName || doc?.snapshotPartnerName || '' },
          { title: 'Thủ kho xuất trả', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Quản lý / Giám đốc duyệt', subtitle: '(Ký, ghi rõ họ tên)', name: '' }
        ]}
      >
        <div className="print-section-heading">DANH SÁCH MẶT HÀNG TRẢ LẠI NCC TRUY VẾT ({detailsList.length})</div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '35px' }}>STT</th>
              <th style={{ width: '90px' }}>Mã nguyên liệu</th>
              <th>Tên nguyên liệu</th>
              <th style={{ width: '55px' }}>ĐVT</th>
              <th style={{ width: '80px' }}>Số lượng</th>
              <th style={{ width: '95px' }}>Giá hoàn (đ)</th>
              <th style={{ width: '105px' }}>Thành tiền (đ)</th>
              <th>Lý do trả lại</th>
            </tr>
          </thead>
          <tbody>
            {detailsList.length === 0 ? (
              <tr>
                <td colSpan={8} className="print-text-center">Chưa có chi tiết sản phẩm trả hàng</td>
              </tr>
            ) : (
              detailsList.map((item, idx) => (
                <tr key={idx}>
                  <td className="print-text-center">{idx + 1}</td>
                  <td className="print-font-bold">{item.pCode}</td>
                  <td>{item.pName}</td>
                  <td className="print-text-center">{item.uName}</td>
                  <td className="print-text-right print-font-bold">{item.qty.toLocaleString('vi-VN')}</td>
                  <td className="print-text-right">{Math.round(item.price).toLocaleString('vi-VN')}</td>
                  <td className="print-text-right print-font-bold">{Math.round(item.total).toLocaleString('vi-VN')}</td>
                  <td>{item.note || 'Trả lại NCC'}</td>
                </tr>
              ))
            )}
            <tr>
              <td colSpan={6} className="print-text-right print-font-bold">TỔNG GIÁ TRỊ HOÀN TRẢ:</td>
              <td className="print-text-right print-font-bold">{Math.round(totalAmount).toLocaleString('vi-VN')} đ</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </InventoryPrintPortal>
    </div>
  );
};

export default ImportReturn_Detail;
