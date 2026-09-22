import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CalendarOutlined,
  FallOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  PictureOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { message } from 'antd';
import { getExportDeleteById } from '../api/documentApi';
import { ReferenceLink } from '../utils/documentNavHelper';
import InventoryPrintPortal from '../components/inventory/common/InventoryPrintPortal';

const ExportDelete_Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialDoc = location.state?.document || null;
  const [doc, setDoc] = useState(initialDoc);
  const [loading, setLoading] = useState(!initialDoc);
  const [activeTab, setActiveTab] = useState('details');
  const [previewImage, setPreviewImage] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getExportDeleteById(id);
      if (res) {
        setDoc(res);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết phiếu xuất hủy:', err);
      message.error('Không thể tải thông tin phiếu xuất hủy.');
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
      const reason = dt.note || dt.reason || '---';

      return {
        ...dt,
        pCode,
        pName,
        uName,
        qty,
        price,
        total,
        reason
      };
    });
  }, [doc]);

  const totalAmount = useMemo(() => {
    if (doc?.totalAmount && doc.totalAmount > 0) return Number(doc.totalAmount);
    return detailsList.reduce((sum, item) => sum + item.total, 0);
  }, [doc, detailsList]);

  const imageUrlsList = useMemo(() => {
    let imgs = doc?.imageUrls || [];
    if (typeof imgs === 'string') {
      try {
        imgs = JSON.parse(imgs);
      } catch (e) {
        imgs = imgs ? [imgs] : [];
      }
    }
    return Array.isArray(imgs) ? imgs : [];
  }, [doc]);

  const isPending = doc?.status === 0 || doc?.status === 'Pending';

  const handlePrint = () => {
    const originalTitle = document.title;
    const docDate = dayjs(doc?.businessDate || doc?.createdAt).format('DDMMYYYY');
    document.title = `MenuGO_XuatHuy_${doc?.code || id}_${docDate}`;
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
            onClick={() => navigate('/inventory-management?tab=ExportDelete')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <ArrowLeftOutlined /> Quay lại danh sách
          </button>

          <div style={{ borderLeft: '1px solid #e2e8f0', height: 24 }} />

          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              Quản lý kho / Xuất hủy / Chi tiết phiếu xuất hủy
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {doc?.code || 'Phiếu xuất hủy'}
              </span>
              {isPending ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 12, fontWeight: 700 }}>
                  <ClockCircleOutlined /> Lưu tạm
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: 12, fontWeight: 700 }}>
                  <CheckCircleOutlined /> Hoàn thành
                </span>
              )}
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
          {/* THẺ 1: THÔNG TIN PHIẾU */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DeleteOutlined style={{ color: '#dc2626' }} /> Thông tin xuất hủy
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Mã chứng từ:</span>
                <strong style={{ color: '#dc2626' }}>{doc?.code || '---'}</strong>
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Chi nhánh:</span>
                <span style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <EnvironmentOutlined style={{ color: '#e8442a' }} />
                  {doc?.branchName || doc?.snapshotBranchName || 'Chi nhánh trung tâm'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Hình thức:</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>Xuất hủy hao mòn / Hết hạn</span>
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
                <span style={{ color: '#64748b' }}>Người lập:</span>
                <strong style={{ color: '#0f172a' }}>{doc?.creatorName || doc?.snapshotCreatedByName || doc?.creator || 'Quản lý'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Ngày lập:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>
                  <CalendarOutlined style={{ marginRight: 4, color: '#94a3b8' }} />
                  {doc?.orderDate || doc?.createdDate || doc?.createdAt ? dayjs(doc.orderDate || doc.createdDate || doc.createdAt).format('DD/MM/YYYY HH:mm') : '---'}
                </span>
              </div>
              {doc?.snapshotPostedByName && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Người duyệt:</span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>{doc.snapshotPostedByName}</span>
                </div>
              )}
            </div>
          </div>

          {/* THẺ 3: THIỆT HẠI HỦY */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FallOutlined style={{ color: '#dc2626' }} /> Tổng giá trị thiệt hại
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Số lượng mặt hàng hủy:</span>
                <strong style={{ color: '#0f172a' }}>{detailsList.length} mặt hàng</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tổng giá trị hủy:</span>
                <strong style={{ color: '#dc2626', fontSize: 14 }}>{Math.round(totalAmount).toLocaleString('vi-VN')} đ</strong>
              </div>
            </div>
          </div>
        </div>

        {/* GHI CHÚ */}
        {doc?.note && (
          <div style={{ padding: '10px 16px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoCircleOutlined />
            <span><strong>Lý do xuất hủy:</strong> {doc.note}</span>
          </div>
        )}

        {/* BẢNG MẶT HÀNG XUẤT HỦY & HÌNH ẢNH */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              style={{
                padding: '12px 18px',
                fontSize: 12.5,
                fontWeight: 700,
                color: activeTab === 'details' ? '#e8442a' : '#64748b',
                borderBottom: activeTab === 'details' ? '2px solid #e8442a' : '2px solid transparent',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <AppstoreOutlined /> Thông tin chi tiết phiếu xuất hủy ({detailsList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('images')}
              style={{
                padding: '12px 18px',
                fontSize: 12.5,
                fontWeight: 700,
                color: activeTab === 'images' ? '#e8442a' : '#64748b',
                borderBottom: activeTab === 'images' ? '2px solid #e8442a' : '2px solid transparent',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <PictureOutlined /> Hình ảnh {imageUrlsList.length > 0 ? `(${imageUrlsList.length})` : ''}
            </button>
          </div>

          {activeTab === 'details' && (
            <div style={{ maxHeight: '420px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                  <th style={{ padding: '10px 12px' }}>Mã SP</th>
                  <th style={{ padding: '10px 12px' }}>Tên sản phẩm</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>ĐVT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Số lượng hủy</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Giá vốn lúc hủy (đ)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thành tiền thiệt hại (đ)</th>
                  <th style={{ padding: '10px 12px' }}>Lý do hủy</th>
                </tr>
              </thead>
              <tbody>
                {detailsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                      Chưa có chi tiết sản phẩm xuất hủy
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
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                        {Math.round(item.total).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.reason}</td>
                    </tr>
                  ))
                )}
                <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={5} style={{ padding: '12px 14px', textAlign: 'right', color: '#1e293b', fontSize: 12 }}>
                    TỔNG GIÁ TRỊ THIỆT HẠI:
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13.5, fontWeight: 900, color: '#dc2626' }}>
                    {Math.round(totalAmount).toLocaleString('vi-VN')} đ
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          )}

          {activeTab === 'images' && (
            <div style={{ padding: '20px 24px' }}>
              {imageUrlsList.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                  <PictureOutlined style={{ fontSize: 40, marginBottom: 10, color: '#cbd5e1' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>Không có ảnh</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Chưa có hình ảnh biên bản hoặc bằng chứng hàng hỏng nào cho phiếu xuất hủy này.</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 16 }}>
                    Danh sách hình ảnh chứng từ ({imageUrlsList.length}):
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 140px))',
                      gap: 16
                    }}
                  >
                    {imageUrlsList.map((url, imgIdx) => (
                      <div
                        key={imgIdx}
                        onClick={() => setPreviewImage(url)}
                        style={{
                          width: 140,
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
                            bottom: 6,
                            left: 6,
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#ffffff',
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: '2px 8px',
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
          )}
        </div>
      </div>

      {/* KHUNG IN PHIẾU XUẤT HỦY KHO CHUẨN A4 */}
      <InventoryPrintPortal
        title="PHIẾU XUẤT HỦY NGUYÊN VẬT LIỆU"
        subTitle={`Mã phiếu: ${doc?.code || '---'} | Ngày xuất: ${doc?.businessDate || doc?.createdAt ? dayjs(doc.businessDate || doc.createdAt).format('DD/MM/YYYY HH:mm') : '---'} | Trạng thái: ${isPending ? 'Lưu tạm' : 'Hoàn thành'}`}
        docCode={doc?.code}
        branchName={doc?.branchName || doc?.snapshotBranchName}
        metaItems={[
          { label: 'Mã chứng từ', value: doc?.code },
          { label: 'Chứng từ tham chiếu', value: doc?.parentDocumentCode || 'Không có' },
          { label: 'Chi nhánh xuất hủy', value: doc?.branchName || doc?.snapshotBranchName },
          { label: 'Người lập phiếu', value: doc?.creatorName || doc?.snapshotCreatedByName || doc?.creator },
          { label: 'Thời gian xuất hủy', value: doc?.businessDate || doc?.createdAt ? dayjs(doc.businessDate || doc.createdAt).format('DD/MM/YYYY HH:mm') : '---' },
          { label: 'Tổng số mặt hàng hủy', value: `${detailsList.length} mặt hàng` },
          { label: 'Tổng giá trị thiệt hại', value: `${Math.round(totalAmount).toLocaleString('vi-VN')} đ` },
          { label: 'Ghi chú xuất hủy', value: doc?.note || 'Không có ghi chú' }
        ]}
        signatures={[
          { title: 'Người lập phiếu', subtitle: '(Ký, ghi rõ họ tên)', name: doc?.creatorName || doc?.snapshotCreatedByName || '' },
          { title: 'Thủ kho phụ trách', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Người kiểm tra / Chứng kiến', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Quản lý / Giám đốc duyệt', subtitle: '(Ký, ghi rõ họ tên)', name: '' }
        ]}
      >
        <div className="print-section-heading">DANH SÁCH MẶT HÀNG XUẤT HỦY TRUY VẾT ({detailsList.length})</div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '35px' }}>STT</th>
              <th style={{ width: '90px' }}>Mã nguyên liệu</th>
              <th>Tên nguyên liệu</th>
              <th style={{ width: '55px' }}>ĐVT</th>
              <th style={{ width: '80px' }}>Số lượng</th>
              <th style={{ width: '90px' }}>Giá vốn (đ)</th>
              <th style={{ width: '105px' }}>Thiệt hại (đ)</th>
              <th>Lý do xuất hủy</th>
            </tr>
          </thead>
          <tbody>
            {detailsList.length === 0 ? (
              <tr>
                <td colSpan={8} className="print-text-center">Chưa có chi tiết sản phẩm xuất hủy</td>
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
                  <td className="print-text-right print-font-bold" style={{ color: '#b91c1c' }}>
                    {Math.round(item.total).toLocaleString('vi-VN')}
                  </td>
                  <td>{item.reason || 'Hỏng / Hết hạn'}</td>
                </tr>
              ))
            )}
            <tr>
              <td colSpan={6} className="print-text-right print-font-bold">TỔNG GIÁ TRỊ THIỆT HẠI:</td>
              <td className="print-text-right print-font-bold" style={{ color: '#b91c1c' }}>
                {Math.round(totalAmount).toLocaleString('vi-VN')} đ
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </InventoryPrintPortal>

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

export default ExportDelete_Detail;
