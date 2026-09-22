import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  PrinterOutlined,
  ShopOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  DownOutlined,
  RightOutlined,
  DollarOutlined,
  UploadOutlined,
  PictureOutlined,
  CloudUploadOutlined,
  ZoomInOutlined,
  LoadingOutlined,
  CloseOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { message, Modal } from 'antd';
import {
  getPartnerById,
  getPartnerFinancialSummary,
  getPartnerImportDocuments,
  getPartnerCashFlows,
  payPartnerImportDocument,
  getPartnersByBranch,
  updatePartnerImages
} from '../api/partnerApi';
import { uploadImage } from '../api/imageApi';
import { getDebtDisplayInfo } from '../utils/debtHelper';
import { ReferenceLink } from '../utils/documentNavHelper';
import InventoryPrintPortal from '../components/inventory/common/InventoryPrintPortal';

// Phân loại nhãn hiển thị cho đối tác
const getPartnerBadge = (t) => {
  if (t === 1 || t === '1' || t === 'Supplier' || t === 'Nhà cung cấp' || t === 'NCC') {
    return { label: 'Nhà cung cấp', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
  }
  if (t === 2 || t === '2' || t === 'Customer' || t === 'Khách hàng' || t === 'KH') {
    return { label: 'Khách hàng', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
  }
  if (t === 3 || t === '3' || t === 'Transporter' || t === 'Vận chuyển' || t === 'VC') {
    return { label: 'Vận chuyển', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
  }
  return { label: 'Khác', bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
};

// Chuẩn hóa phương thức thanh toán sang Tiếng Việt
const formatPaymentMethod = (method) => {
  if (!method) return 'Chưa xác định';
  if (method === 'Cash' || method === 1 || method === '1') return 'Tiền mặt';
  if (method === 'BankTransfer' || method === 2 || method === '2') return 'Chuyển khoản';
  if (method === 'Other' || method === 3 || method === '3') return 'Khác';
  if (method === 'Ghi nợ NCC') return 'Ghi nợ NCC';
  return method;
};

// Kiểu badge loại giao dịch
const formatTransactionTypeBadge = (type) => {
  if (type === 'Nhập hàng') {
    return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
  }
  if (type === 'Thanh toán NCC') {
    return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
  }
  if (type === 'Thu lại NCC') {
    return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
  }
  return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
};

const Partner_Detail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialPartner = location.state?.partner || location.state?.document || null;
  const [partner, setPartner] = useState(initialPartner);
  const [summary, setSummary] = useState(null);
  const [docs, setDocs] = useState([]);
  const [cashFlows, setCashFlows] = useState([]);
  const [loading, setLoading] = useState(!initialPartner);
  const [activeTab, setActiveTab] = useState('docs'); // 'docs' | 'cashflows'

  // States quản lý mở rộng phiếu nhập & thanh toán cho NCC
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayDoc, setSelectedPayDoc] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState(1);
  const [payDate, setPayDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [payNote, setPayNote] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const toggleDocExpand = (docId) => {
    setExpandedDocId((prev) => (prev === docId ? null : docId));
  };

  const handleOpenPayModal = (docItem) => {
    if (!docItem || docItem.debtAmount <= 0) {
      message.warning('Phiếu nhập này không còn dư nợ để thanh toán!');
      return;
    }
    setSelectedPayDoc(docItem);
    setPayAmount(docItem.debtAmount || 0);
    setPayMethod(1);
    setPayDate(dayjs().format('YYYY-MM-DD'));
    setPayNote(`Thanh toán cho NCC phiếu nhập ${docItem.code}`);
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!selectedPayDoc || payAmount <= 0) return;
    setPayLoading(true);
    try {
      const paymentDateTime = payDate
        ? dayjs(payDate).hour(dayjs().hour()).minute(dayjs().minute()).second(dayjs().second()).toISOString()
        : new Date().toISOString();

      await payPartnerImportDocument(partner?.id || id, selectedPayDoc.id, {
        amount: Number(payAmount),
        paymentMethod: Number(payMethod),
        paymentDate: paymentDateTime,
        note: payNote
      });
      message.success('Thanh toán cho nhà cung cấp thành công!');
      setPaymentModalOpen(false);
      setSelectedPayDoc(null);
      await fetchDetail();
    } catch (err) {
      console.error('Lỗi khi thanh toán cho NCC:', err);
      message.error(err.response?.data?.message || 'Không thể thực hiện thanh toán lúc này!');
    } finally {
      setPayLoading(false);
    }
  };

  // States quản lý hình ảnh hợp đồng đối tác
  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Xử lý upload danh sách file ảnh hợp đồng
  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(
      (f) => (f.type && f.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(f.name)
    );
    if (validFiles.length === 0) {
      message.warning('Vui lòng chọn tệp định dạng hình ảnh hợp lệ (PNG, JPG, JPEG, WEBP)!');
      return;
    }

    setUploadingImage(true);
    try {
      const uploadPromises = validFiles.map((file) => uploadImage(file));
      const results = await Promise.allSettled(uploadPromises);
      const uploadedList = [];
      let failCount = 0;
      let lastErrMsg = '';

      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          const link = res.value?.data?.imageLink || res.value?.data?.url || res.value?.data;
          if (link && typeof link === 'string') {
            uploadedList.push(link);
          }
        } else {
          failCount++;
          lastErrMsg = res.reason?.response?.data?.message || res.reason?.message || '';
          console.error('Lỗi khi tải ảnh:', validFiles[idx]?.name, res.reason);
        }
      });

      if (uploadedList.length > 0) {
        const currentList = Array.isArray(partner?.imageUrls) ? partner.imageUrls : [];
        const updatedList = [...currentList, ...uploadedList];
        await updatePartnerImages(partner?.id || id, updatedList);
        setPartner((prev) => ({ ...prev, imageUrls: updatedList }));
        if (failCount > 0) {
          message.warning(`Đã tải lên ${uploadedList.length} ảnh, nhưng có ${failCount} ảnh bị lỗi!`);
        } else {
          message.success(`Đã tải lên thành công ${uploadedList.length} ảnh hợp đồng!`);
        }
      } else {
        message.error(lastErrMsg || 'Không thể tải ảnh lên máy chủ, vui lòng thử lại!');
      }
    } catch (err) {
      console.error('Lỗi khi lưu ảnh hợp đồng đối tác:', err);
      message.error(err.response?.data?.message || 'Đã xảy ra lỗi khi lưu ảnh hợp đồng!');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Xử lý xác nhận và xóa ảnh hợp đồng
  const handleConfirmDeleteImage = (indexToDelete) => {
    Modal.confirm({
      title: 'Xác nhận xóa ảnh',
      content: 'Bạn có chắc chắn muốn xóa ảnh này không? Thao tác này không thể hoàn tác.',
      okText: 'Xác nhận xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      centered: true,
      onOk: async () => {
        try {
          const currentList = Array.isArray(partner?.imageUrls) ? partner.imageUrls : [];
          const updatedList = currentList.filter((_, idx) => idx !== indexToDelete);
          await updatePartnerImages(partner?.id || id, updatedList);
          setPartner((prev) => ({ ...prev, imageUrls: updatedList }));
          message.success('Đã xóa ảnh thành công!');
        } catch (err) {
          console.error('Lỗi khi xóa ảnh:', err);
          message.error('Không thể xóa ảnh, vui lòng thử lại!');
        }
      }
    });
  };

  // Xử lý kéo thả tệp (Drag & Drop)
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [partnerRes, sumRes, docsRes, cfRes] = await Promise.allSettled([
        getPartnerById(id),
        getPartnerFinancialSummary(id),
        getPartnerImportDocuments(id),
        getPartnerCashFlows(id)
      ]);

      let partnerData = null;
      if (partnerRes.status === 'fulfilled' && partnerRes.value) {
        partnerData = partnerRes.value;
      } else {
        // Fallback tìm đối tác theo danh sách chi nhánh nếu getPartnerById chưa hỗ trợ
        try {
          const branchId = localStorage.getItem('currentBranchId') || 1;
          const branchPartners = await getPartnersByBranch(branchId);
          const list = Array.isArray(branchPartners?.data)
            ? branchPartners.data
            : Array.isArray(branchPartners)
            ? branchPartners
            : [];
          partnerData = list.find((p) => String(p.id) === String(id));
        } catch (_) {}
      }

      if (partnerData) {
        setPartner((prev) => ({
          ...prev,
          ...partnerData
        }));
      }

      if (sumRes.status === 'fulfilled' && sumRes.value) {
        setSummary(sumRes.value);
        setPartner((prev) => ({
          ...prev,
          id: prev?.id || sumRes.value.partnerId || id,
          name: sumRes.value.partnerName || prev?.name || 'Đối tác'
        }));
      }

      if (docsRes.status === 'fulfilled') {
        setDocs(docsRes.value || []);
      }
      if (cfRes.status === 'fulfilled') {
        setCashFlows(cfRes.value || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết hồ sơ đối tác:', err);
      message.error('Không thể tải dữ liệu chi tiết đối tác!');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const badge = getPartnerBadge(partner?.type ?? 1);
  const totalImport = summary?.totalImportAmount || 0;
  const totalReturn = summary?.totalReturnAmount || 0;
  const totalPaid = summary?.totalPaidAmount || 0;
  const remainingDebt = summary?.remainingDebt ?? partner?.remainingDebt ?? 0;
  const debtInfo = getDebtDisplayInfo(remainingDebt);

  const handlePrint = () => {
    const originalTitle = document.title;
    const partnerClean = (partner?.name || summary?.partnerName || 'DoiTac').replace(/[^a-zA-Z0-9À-ỹ]/g, '_');
    document.title = `MenuGO_SoGiaoDich_${partner?.code || id}_${partnerClean}`;
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
            onClick={() => navigate('/inventory-management?tab=Partner')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <ArrowLeftOutlined /> Quay lại danh sách
          </button>

          <div style={{ borderLeft: '1px solid #e2e8f0', height: 24 }} />

          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              Quản lý kho / Đối tác & Nhà cung cấp / Chi tiết hồ sơ
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                {partner?.name || summary?.partnerName || 'Đối tác'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontSize: 11, fontWeight: 700 }}>
                <ShopOutlined /> {badge.label}
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
        {/* CARDS TỔNG QUAN HỒ SƠ & TÀI CHÍNH */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* THẺ 1: THÔNG TIN ĐỐI TÁC */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShopOutlined style={{ color: '#2563eb' }} /> Thông tin đối tác
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tên đối tác:</span>
                <strong style={{ color: '#0f172a' }}>{partner?.name || summary?.partnerName || 'Chưa cập nhật'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Mã đối tác:</span>
                <strong style={{ color: '#2563eb' }}>{`DT${partner?.id || id}`}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Số điện thoại:</span>
                <strong style={{ color: '#1e293b' }}>{partner?.phone || 'Chưa cập nhật'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Email:</span>
                <span style={{ color: '#334155', fontWeight: 500 }}>{partner?.email || 'Chưa cập nhật'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Địa chỉ:</span>
                <span style={{ color: '#334155', fontWeight: 500 }}>{partner?.address || 'Chưa cập nhật'}</span>
              </div>
            </div>
          </div>

          {/* THẺ 2: TÌNH HÌNH TÀI CHÍNH & CÔNG NỢ */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarCircleOutlined style={{ color: '#16a34a' }} /> Tình hình tài chính
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tổng giá trị hàng nhập:</span>
                <strong style={{ color: '#1d4ed8' }}>{totalImport.toLocaleString('vi-VN')} VNĐ</strong>
              </div>
              {totalReturn > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Giá trị hàng xuất trả:</span>
                  <strong style={{ color: '#ea580c' }}>{totalReturn.toLocaleString('vi-VN')} VNĐ</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tiền đã chi cho NCC:</span>
                <strong style={{ color: '#15803d' }}>{totalPaid.toLocaleString('vi-VN')} VNĐ</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: 6, marginTop: 2 }}>
                <span style={{ color: '#64748b' }}>Công nợ:</span>
                <strong style={{ fontSize: 14, color: debtInfo.color }}>
                  {debtInfo.formattedAmount} ({debtInfo.label})
                </strong>
              </div>
            </div>
          </div>

          {/* THẺ 3: TỔNG QUAN GIAO DỊCH */}
          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HistoryOutlined style={{ color: '#ea580c' }} /> Tổng quan giao dịch
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tổng số phiếu nhập hàng:</span>
                <strong style={{ color: '#0f172a' }}>{docs.length} phiếu</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Lịch sử giao dịch tài chính:</span>
                <strong style={{ color: '#0f172a' }}>{cashFlows.length} giao dịch</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Trạng thái công nợ:</span>
                <span style={{ fontWeight: 700, color: debtInfo.color }}>
                  {debtInfo.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GHI CHÚ */}
        <div style={{ padding: '10px 16px', borderRadius: 6, background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <InfoCircleOutlined />
          <span><strong>Ghi chú:</strong> {partner?.note || 'Không có ghi chú thêm'}</span>
        </div>

        {/* CONTAINER CHÍNH CÓ CÁC TABS */}
        <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          {/* HEADER TABS */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              padding: '0 16px'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              style={{
                padding: '12px 16px',
                fontSize: 12.5,
                fontWeight: 700,
                color: activeTab === 'docs' ? '#e8442a' : '#64748b',
                borderBottom: activeTab === 'docs' ? '2px solid #e8442a' : '2px solid transparent',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <FileTextOutlined /> Phiếu nhập hàng ({docs.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cashflows')}
              style={{
                padding: '12px 16px',
                fontSize: 12.5,
                fontWeight: 700,
                color: activeTab === 'cashflows' ? '#e8442a' : '#64748b',
                borderBottom: activeTab === 'cashflows' ? '2px solid #e8442a' : '2px solid transparent',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <HistoryOutlined /> Lịch sử giao dịch ({cashFlows.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('images')}
              style={{
                padding: '12px 16px',
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
              <PictureOutlined /> Hình ảnh {partner?.imageUrls && partner.imageUrls.length > 0 ? `(${partner.imageUrls.length})` : ''}
            </button>
          </div>

          {/* NỘI DUNG TAB PHIẾU NHẬP HÀNG */}
          {activeTab === 'docs' && (
            <div style={{ maxHeight: '450px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                    <th style={{ padding: '10px 12px' }}>Mã phiếu nhập</th>
                    <th style={{ padding: '10px 12px' }}>Ngày nhập</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tổng tiền (đ)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Đã thanh toán (đ)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Còn nợ (đ)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Trạng thái thanh toán</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        Chưa có phiếu nhập hàng nào từ nhà cung cấp này
                      </td>
                    </tr>
                  ) : (
                    docs.map((d, idx) => {
                      const isDocExpanded = expandedDocId === d.id;
                      const isReturned = d.paymentStatus === 'Returned' || (d.returnedAmount > 0 && d.debtAmount === 0 && d.amountPaid === 0);
                      const hasPaid = d.debtAmount === 0;

                      return (
                        <React.Fragment key={d.id || idx}>
                          <tr
                            onClick={() => toggleDocExpand(d.id)}
                            style={{
                              borderBottom: isDocExpanded ? 'none' : '1px solid #f1f5f9',
                              background: isDocExpanded ? '#fff7ed' : idx % 2 === 1 ? '#fafafa' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isDocExpanded) e.currentTarget.style.backgroundColor = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              if (!isDocExpanded) e.currentTarget.style.backgroundColor = idx % 2 === 1 ? '#fafafa' : '#ffffff';
                            }}
                          >
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {isDocExpanded ? (
                                  <DownOutlined style={{ fontSize: 10, color: '#e8442a' }} />
                                ) : (
                                  <RightOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
                                )}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/inventory-management?tab=Import&search=${encodeURIComponent(d.code)}`);
                                  }}
                                  style={{
                                    color: '#2563eb',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                  }}
                                  title="Nhấp để chuyển tới Quản lý nhập hàng"
                                >
                                  {d.code}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#334155' }}>
                              {dayjs(d.importDate).format('DD/MM/YYYY HH:mm')}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                              <div>{d.totalAmount.toLocaleString('vi-VN')} đ</div>
                              {d.returnedAmount > 0 && (
                                <div style={{ fontSize: 10, color: '#ea580c', fontWeight: 600 }}>
                                  (Đã trả: -{d.returnedAmount.toLocaleString('vi-VN')} đ)
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                              {d.amountPaid.toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: d.debtAmount > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                              {d.debtAmount.toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {isReturned ? (
                                <span
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 4,
                                    background: '#f5f3ff',
                                    color: '#7c3aed',
                                    border: '1px solid #ddd6fe',
                                    fontSize: 10.5,
                                    fontWeight: 700
                                  }}
                                >
                                  Đã trả hàng
                                </span>
                              ) : hasPaid ? (
                                <span
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: 4,
                                    background: '#f0fdf4',
                                    color: '#16a34a',
                                    border: '1px solid #bbf7d0',
                                    fontSize: 10.5,
                                    fontWeight: 700
                                  }}
                                >
                                  Đã thanh toán
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPayModal(d);
                                  }}
                                  style={{
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fca5a5',
                                    borderRadius: 4,
                                    padding: '3px 9px',
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    boxShadow: '0 1px 2px rgba(220, 38, 38, 0.08)'
                                  }}
                                  title="Chưa thanh toán - Nhấp để thanh toán cho nhà cung cấp"
                                >
                                  <DollarOutlined style={{ fontSize: 11 }} /> Chưa thanh toán
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* VÙNG CHI TIẾT LỊCH SỬ GIAO DỊCH TƯƠNG ỨNG CỦA PHIẾU NHẬP */}
                          {isDocExpanded && (
                            <tr style={{ background: '#f8fafc' }}>
                              <td colSpan={6} style={{ padding: '10px 14px 14px 14px', borderBottom: '1px solid #cbd5e1' }}>
                                <div
                                  style={{
                                    background: '#ffffff',
                                    borderRadius: 6,
                                    border: '1px solid #e2e8f0',
                                    padding: 12,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <HistoryOutlined style={{ color: '#ea580c' }} /> Lịch sử giao dịch thanh toán cho phiếu nhập {d.code} ({d.transactions ? d.transactions.length : 0})
                                    </div>
                                    {d.debtAmount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenPayModal(d)}
                                        style={{
                                          background: '#16a34a',
                                          color: '#ffffff',
                                          border: 'none',
                                          borderRadius: 4,
                                          padding: '3px 10px',
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4
                                        }}
                                      >
                                        <DollarOutlined /> Thanh toán cho NCC ({d.debtAmount.toLocaleString('vi-VN')} đ)
                                      </button>
                                    )}
                                  </div>

                                  {(!d.transactions || d.transactions.length === 0) ? (
                                    <div style={{ textAlign: 'center', padding: '14px 0', color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>
                                      Chưa có phát sinh giao dịch thanh toán nào cho phiếu nhập này
                                    </div>
                                  ) : (
                                    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 4 }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                        <thead>
                                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: 9.5 }}>
                                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Thời gian</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Loại giao dịch</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Mã Thu/Chi</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Phương thức</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Số tiền thanh toán</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Ghi chú</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {d.transactions.map((tx) => (
                                            <tr key={tx.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                              <td style={{ padding: '6px 8px', color: '#64748b' }}>
                                                {dayjs(tx.transactionDate).format('DD/MM/YYYY HH:mm')}
                                              </td>
                                              <td style={{ padding: '6px 8px' }}>
                                                <span style={{ padding: '1px 6px', borderRadius: 3, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: 9.5, fontWeight: 600 }}>
                                                  {tx.transactionType}
                                                </span>
                                              </td>
                                              <td style={{ padding: '6px 8px' }}>
                                                {tx.code ? (
                                                  <span
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigate(`/cashflow?search=${encodeURIComponent(tx.code)}`);
                                                    }}
                                                    style={{
                                                      color: '#0284c7',
                                                      fontWeight: 700,
                                                      cursor: 'pointer',
                                                      textDecoration: 'underline'
                                                    }}
                                                    title="Nhấp để xem sổ quỹ"
                                                  >
                                                    {tx.code}
                                                  </span>
                                                ) : (
                                                  <span style={{ color: '#94a3b8' }}>---</span>
                                                )}
                                              </td>
                                              <td style={{ padding: '6px 8px', color: '#475569' }}>
                                                {formatPaymentMethod(tx.paymentMethod)}
                                              </td>
                                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                                                {Math.abs(tx.amount).toLocaleString('vi-VN')} đ
                                              </td>
                                              <td style={{ padding: '6px 8px', color: '#64748b' }}>
                                                {tx.note || '---'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={2} style={{ padding: '12px 14px', textAlign: 'right', color: '#1e293b', fontSize: 12 }}>
                      TỔNG CỘNG ({docs.length} PHIẾU NHẬP):
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#1d4ed8' }}>
                      {totalImport.toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#16a34a' }}>
                      {docs.reduce((sum, d) => sum + Number(d.amountPaid || 0), 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: debtInfo.color }}>
                      {docs.reduce((sum, d) => sum + Number(d.debtAmount || 0), 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* NỘI DUNG TAB LỊCH SỬ GIAO DỊCH */}
          {activeTab === 'cashflows' && (
            <div style={{ maxHeight: '450px', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5 }}>
                    <th style={{ padding: '10px 12px' }}>Mã nhập hàng</th>
                    <th style={{ padding: '10px 12px' }}>Ngày giao dịch</th>
                    <th style={{ padding: '10px 12px' }}>Loại giao dịch</th>
                    <th style={{ padding: '10px 12px' }}>Mã Thu/Chi</th>
                    <th style={{ padding: '10px 12px' }}>Phương thức</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Số tiền (đ)</th>
                    <th style={{ padding: '10px 12px' }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        Chưa có phát sinh giao dịch tài chính nào với đối tác này
                      </td>
                    </tr>
                  ) : (
                    cashFlows.map((cf, idx) => {
                      const typeBadge = formatTransactionTypeBadge(cf.transactionType);
                      const isExpense = cf.amount < 0;
                      return (
                        <tr key={cf.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                          <td style={{ padding: '10px 12px' }}>
                            {cf.importCode ? (
                              <span
                                onClick={() => navigate(`/inventory-management?tab=Import&search=${encodeURIComponent(cf.importCode)}`)}
                                style={{
                                  color: '#2563eb',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  textDecoration: 'underline'
                                }}
                                title="Nhấp để chuyển tới Quản lý nhập hàng"
                              >
                                {cf.importCode}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>---</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#334155' }}>
                            {cf.transactionDate || cf.businessDate || cf.createdAt ? dayjs(cf.transactionDate || cf.businessDate || cf.createdAt).format('DD/MM/YYYY HH:mm') : '---'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '2px 7px', borderRadius: 4, background: typeBadge.bg, color: typeBadge.color, border: `1px solid ${typeBadge.border}`, fontSize: 10.5, fontWeight: 700 }}>
                              {cf.transactionType}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0284c7' }}>
                            {cf.code ? (
                              <span
                                onClick={() => navigate(`/cashflow?search=${encodeURIComponent(cf.code)}`)}
                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                title="Nhấp để xem sổ quỹ"
                              >
                                {cf.code}
                              </span>
                            ) : (
                              '---'
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#475569' }}>
                            {formatPaymentMethod(cf.paymentMethod)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: isExpense ? '#16a34a' : '#dc2626' }}>
                            {cf.amount > 0 ? `+${cf.amount.toLocaleString('vi-VN')}` : cf.amount.toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            {cf.note || '---'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan={5} style={{ padding: '12px 14px', textAlign: 'right', color: '#1e293b', fontSize: 12 }}>
                      TỔNG TIỀN ĐÃ CHI TRẢ CHO NCC:
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13.5, fontWeight: 900, color: '#16a34a' }}>
                      {totalPaid.toLocaleString('vi-VN')} đ
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* NỘI DUNG TAB HÌNH ẢNH HỢP ĐỒNG */}
          {activeTab === 'images' && (
            <div style={{ padding: '20px' }}>
              {/* THANH TIÊU ĐỀ TAB */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <PictureOutlined style={{ color: '#ea580c', fontSize: 16 }} />
                <span>Hình ảnh hợp đồng & chứng từ đối tác ({partner?.imageUrls?.length || 0})</span>
              </div>

              {/* INPUT FILE ẨN ĐỂ MỞ THƯ MỤC / CHỌN ẢNH */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={(e) => handleUploadFiles(e.target.files)}
                style={{ display: 'none' }}
              />

              {/* KHU VỰC KÉO THẢ ẢNH (DROPZONE) */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: isDragging ? '2px dashed #ea580c' : '2px dashed #cbd5e1',
                  background: isDragging ? '#fff7ed' : '#f8fafc',
                  borderRadius: 8,
                  padding: isDragging ? '28px 20px' : '20px',
                  textAlign: 'center',
                  marginBottom: 16,
                  transition: 'all 0.2s ease',
                  boxShadow: isDragging ? '0 8px 24px rgba(234, 88, 12, 0.25)' : 'none',
                  cursor: 'pointer'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {isDragging ? (
                  <div style={{ pointerEvents: 'none' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#ea580c',
                        color: '#ffffff',
                        padding: '6px 20px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 800,
                        marginBottom: 8,
                        boxShadow: '0 2px 8px rgba(234, 88, 12, 0.35)'
                      }}
                    >
                      <CloudUploadOutlined style={{ fontSize: 16 }} /> SẴN SÀNG TẢI ẢNH LÊN
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#c2410c' }}>
                      Thả các ảnh hợp đồng vào đây ngay để tải lên!
                    </div>
                    <div style={{ fontSize: 11.5, color: '#ea580c', marginTop: 4 }}>
                      Hệ thống sẽ tự động lưu ảnh vào hồ sơ của đối tác này
                    </div>
                  </div>
                ) : (
                  <div>
                    <CloudUploadOutlined style={{ fontSize: 32, color: '#94a3b8', marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                      Kéo thả ảnh vào đây, hoặc nhấn để mở thư mục chọn ảnh từ máy tính
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                      Định dạng hỗ trợ: PNG, JPG, JPEG, WEBP. Cho phép chọn và tải lên nhiều ảnh cùng lúc.
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      disabled={uploadingImage}
                      style={{
                        marginTop: 12,
                        padding: '5px 16px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#334155',
                        cursor: uploadingImage ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <UploadOutlined style={{ color: '#ea580c' }} /> Mở thư mục chọn ảnh
                    </button>
                  </div>
                )}
              </div>

              {/* TRẠNG THÁI ĐANG TẢI ẢNH LÊN */}
              {uploadingImage && (
                <div
                  style={{
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: 6,
                    padding: '12px 16px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 12.5,
                    color: '#ea580c',
                    fontWeight: 600
                  }}
                >
                  <LoadingOutlined spin /> Đang xử lý tải ảnh lên máy chủ, vui lòng đợi trong giây lát...
                </div>
              )}

              {/* DANH SÁCH ẢNH ĐÃ TẢI LÊN */}
              {(!partner?.imageUrls || partner.imageUrls.length === 0) ? (
                <div
                  style={{
                    border: '1px dashed #e2e8f0',
                    borderRadius: 8,
                    padding: '36px 20px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: 12
                  }}
                >
                  <PictureOutlined style={{ fontSize: 32, color: '#cbd5e1', marginBottom: 8, display: 'block' }} />
                  Chưa có hình ảnh hợp đồng nào được tải lên cho đối tác này.
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: 450,
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 14,
                    background: '#f8fafc'
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                      gap: 14
                    }}
                  >
                    {partner.imageUrls.map((url, index) => (
                      <div
                        key={index}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          overflow: 'hidden',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {/* HÌNH ẢNH PREVIEW */}
                        <div
                          style={{
                            height: 140,
                            overflow: 'hidden',
                            background: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          onClick={() => setPreviewImage(url)}
                          title="Nhấp vào ảnh để phóng to"
                        >
                          <img
                            src={url}
                            alt="Ảnh hợp đồng"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.2s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          />
                        </div>

                        {/* NÚT XÓA ẢNH */}
                        <div
                          style={{
                            padding: '6px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#ffffff',
                            borderTop: '1px solid #f1f5f9'
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmDeleteImage(index);
                            }}
                            style={{
                              width: '100%',
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: 4,
                              padding: '5px 8px',
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#fee2e2';
                              e.currentTarget.style.borderColor = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#fef2f2';
                              e.currentTarget.style.borderColor = '#fecaca';
                            }}
                            title="Xóa ảnh này"
                          >
                            <DeleteOutlined /> Xóa ảnh
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODAL XEM PHÓNG TO HÌNH ẢNH (LIGHTBOX) */}
          {previewImage && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: 20
              }}
              onClick={() => setPreviewImage(null)}
            >
              <div
                style={{
                  position: 'relative',
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  background: '#0f172a',
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* THANH ĐIỀU KHIỂN MODAL XEM ẢNH */}
                <div
                  style={{
                    padding: '8px 14px',
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    borderBottom: '1px solid #334155'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPreviewImage(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: 16,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px 4px'
                    }}
                    title="Đóng"
                  >
                    <CloseOutlined />
                  </button>
                </div>

                {/* KHU VỰC HIỂN THỊ ẢNH */}
                <div
                  style={{
                    padding: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    maxHeight: 'calc(90vh - 60px)',
                    overflow: 'auto'
                  }}
                >
                  <img
                    src={previewImage}
                    alt="Xem ảnh hợp đồng"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 'calc(85vh - 60px)',
                      objectFit: 'contain',
                      borderRadius: 4
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL THANH TOÁN TIỀN CHO NHÀ CUNG CẤP */}
      {paymentModalOpen && selectedPayDoc && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setPaymentModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              width: 480,
              maxWidth: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* TIÊU ĐỀ MODAL */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Thanh toán cho Nhà cung cấp
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* FORM THANH TOÁN */}
            <form onSubmit={handleConfirmPayment} style={{ padding: '16px 18px' }}>
              {/* TÓM TẮT PHIẾU NHẬP */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px', marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11.5 }}>
                  <div>Mã phiếu: <strong style={{ color: '#2563eb' }}>{selectedPayDoc.code}</strong></div>
                  <div>Đối tác: <strong>{partner?.name || summary?.partnerName}</strong></div>
                  <div>Tổng tiền: <strong>{selectedPayDoc.totalAmount.toLocaleString('vi-VN')} VNĐ</strong></div>
                  <div>Đã thanh toán: <strong style={{ color: '#16a34a' }}>{selectedPayDoc.amountPaid.toLocaleString('vi-VN')} VNĐ</strong></div>
                  <div style={{ gridColumn: 'span 2', borderTop: '1px dashed #cbd5e1', paddingTop: 6, marginTop: 2 }}>
                    Số tiền còn nợ: <strong style={{ color: '#dc2626', fontSize: 13 }}>{selectedPayDoc.debtAmount.toLocaleString('vi-VN')} VNĐ</strong>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Số tiền thanh toán (VNĐ) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedPayDoc.debtAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: 34,
                    padding: '4px 10px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Hình thức thanh toán
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(Number(e.target.value))}
                    style={{
                      width: '100%',
                      height: 34,
                      padding: '4px 10px',
                      fontSize: 12,
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  >
                    <option value={1}>Tiền mặt</option>
                    <option value={2}>Chuyển khoản</option>
                    <option value={3}>Khác</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Ngày thanh toán
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: 34,
                      padding: '4px 10px',
                      fontSize: 12,
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Ghi chú thanh toán
                </label>
                <textarea
                  rows={2}
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Nhập ghi chú cho đợt thanh toán này..."
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  style={{
                    padding: '7px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: payLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {payLoading ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KHUNG IN SỔ CHI TIẾT GIAO DỊCH ĐỐI TÁC CHUẨN A4 */}
      <InventoryPrintPortal
        title="SỔ CHI TIẾT GIAO DỊCH VÀ CÔNG NỢ ĐỐI TÁC"
        subTitle={`Mã đối tác: ${partner?.code || id} | Tên: ${partner?.name || summary?.partnerName || 'Đối tác'} | In lúc: ${dayjs().format('DD/MM/YYYY HH:mm')}`}
        docCode={partner?.code || id}
        metaItems={[
          { label: 'Tên đối tác', value: partner?.name || summary?.partnerName },
          { label: 'Mã đối tác', value: partner?.code || `NCC#${id}` },
          { label: 'Số điện thoại', value: partner?.phone || partner?.phoneNumber || '---' },
          { label: 'Địa chỉ', value: partner?.address || '---' },
          { label: 'Tổng tiền mua hàng', value: `${Math.round(totalImport).toLocaleString('vi-VN')} đ` },
          { label: 'Tổng tiền trả hàng', value: `${Math.round(totalReturn).toLocaleString('vi-VN')} đ` },
          { label: 'Đã thanh toán', value: `${Math.round(totalPaid).toLocaleString('vi-VN')} đ` },
          { label: debtInfo.label, value: `${Math.round(Math.abs(remainingDebt)).toLocaleString('vi-VN')} đ` }
        ]}
        signatures={[
          { title: 'Người lập sổ', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Kế toán công nợ', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
          { title: 'Đại diện Đối tác / NCC', subtitle: '(Ký, ghi rõ họ tên)', name: partner?.name || summary?.partnerName || '' },
          { title: 'Quản lý / Giám đốc duyệt', subtitle: '(Ký, ghi rõ họ tên)', name: '' }
        ]}
      >
        <div className="print-section-heading">I. LỊCH SỬ CHỨNG TỪ GIAO DỊCH (NHẬP HÀNG / TRẢ HÀNG) ({docs.length})</div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '35px' }}>STT</th>
              <th style={{ width: '100px' }}>Mã chứng từ</th>
              <th style={{ width: '110px' }}>Ngày chứng từ</th>
              <th style={{ width: '100px' }}>Nghiệp vụ</th>
              <th style={{ width: '105px' }}>Tổng tiền (đ)</th>
              <th style={{ width: '105px' }}>Đã trả (đ)</th>
              <th style={{ width: '105px' }}>Còn nợ (đ)</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr>
                <td colSpan={8} className="print-text-center">Chưa phát sinh chứng từ giao dịch nào với đối tác này</td>
              </tr>
            ) : (
              docs.map((d, idx) => {
                const total = Number(d.totalAmount || 0);
                const paid = Number(d.paidAmount || 0);
                const debt = Number(d.debtAmount || Math.max(0, total - paid));
                const isReturn = d.type === 'Return' || String(d.code || '').startsWith('THN') || String(d.code || '').startsWith('TH');

                return (
                  <tr key={idx}>
                    <td className="print-text-center">{idx + 1}</td>
                    <td className="print-font-bold">{d.code}</td>
                    <td className="print-text-center">
                      {d.orderDate || d.createdDate || d.createdAt ? dayjs(d.orderDate || d.createdDate || d.createdAt).format('DD/MM/YYYY HH:mm') : '---'}
                    </td>
                    <td className="print-text-center">{isReturn ? 'Trả hàng NCC' : 'Nhập hàng'}</td>
                    <td className="print-text-right print-font-bold">{Math.round(total).toLocaleString('vi-VN')}</td>
                    <td className="print-text-right">{Math.round(paid).toLocaleString('vi-VN')}</td>
                    <td className="print-text-right print-font-bold" style={{ color: debt > 0 ? '#b91c1c' : '#000' }}>
                      {Math.round(debt).toLocaleString('vi-VN')}
                    </td>
                    <td className="print-text-center">{d.status === 1 ? 'Hoàn thành' : (d.status === 0 ? 'Tạm' : 'Đã hủy')}</td>
                  </tr>
                );
              })
            )}
            <tr>
              <td colSpan={4} className="print-text-right print-font-bold">TỔNG CỘNG TIỀN MUA HÀNG:</td>
              <td className="print-text-right print-font-bold">{Math.round(totalImport).toLocaleString('vi-VN')} đ</td>
              <td className="print-text-right print-font-bold">{Math.round(totalPaid).toLocaleString('vi-VN')} đ</td>
              <td className="print-text-right print-font-bold">{Math.round(Math.max(0, remainingDebt)).toLocaleString('vi-VN')} đ</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        {cashFlows.length > 0 && (
          <>
            <div className="print-section-heading">II. LỊCH SỬ GIAO DỊCH TIỀN / THANH TOÁN ({cashFlows.length})</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>STT</th>
                  <th style={{ width: '110px' }}>Mã phiếu chi/thu</th>
                  <th style={{ width: '120px' }}>Thời gian</th>
                  <th style={{ width: '110px' }}>Số tiền (đ)</th>
                  <th style={{ width: '100px' }}>Phương thức</th>
                  <th>Ghi chú / Diễn giải</th>
                </tr>
              </thead>
              <tbody>
                {cashFlows.map((cf, idx) => (
                  <tr key={idx}>
                    <td className="print-text-center">{idx + 1}</td>
                    <td className="print-font-bold">{cf.code}</td>
                    <td className="print-text-center">
                      {cf.businessDate || cf.createdAt ? dayjs(cf.businessDate || cf.createdAt).format('DD/MM/YYYY HH:mm') : '---'}
                    </td>
                    <td className="print-text-right print-font-bold">
                      {Math.round(Number(cf.totalAmount || cf.amount || 0)).toLocaleString('vi-VN')}
                    </td>
                    <td className="print-text-center">
                      {cf.paymentMethod === 'Cash' || cf.paymentMethod === 1 ? 'Tiền mặt' : 'Chuyển khoản'}
                    </td>
                    <td>{cf.note || 'Thanh toán tiền hàng'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </InventoryPrintPortal>
    </div>
  );
};

export default Partner_Detail;
