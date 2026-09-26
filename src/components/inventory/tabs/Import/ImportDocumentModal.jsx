import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SearchOutlined,
  DeleteOutlined,
  CloseOutlined,
  FullscreenOutlined,
  PrinterOutlined,
  PlusOutlined,
  UserOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  PictureOutlined,
  ZoomInOutlined,
  LoadingOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { getSuppliers, getExtraPartners, getPartnerFinancialSummary } from '../../../../api/partnerApi';
import { getDebtDisplayInfo } from '../../../../utils/debtHelper';
import { getBInventories, getProductsByDate } from '../../../../api/binventoryApi';
import {
  createImportPending,
  createImportCompleted,
  updateImportPending,
  completeImportDocument,
  getImportById
} from '../../../../api/documentApi';
import { uploadImage } from '../../../../api/imageApi';
import QuickCreatePartnerModal from './QuickCreatePartnerModal';
import { useAuth } from '../../../../context/AuthContext';
import { extractErrorMessage } from '../../utils/errorHelper';

// Native Toast Helper (No antd UI components)
const showToast = (text) => {
  const toast = document.createElement('div');
  toast.innerText = text;
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: #10b981;
    color: #ffffff;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 700;
    z-index: 99999;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
    animation: fadeIn 0.2s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2200);
};

const ImportDocumentModal = ({
  open,
  onClose,
  onSuccess,
  branchId,
  products = [],
  partners = [],
  editingDocument = null
}) => {
  const auth = useAuth ? useAuth() : {};
  const user = auth?.user;
  const creatorName = user?.name || user?.email || 'Hệ thống';

  const [loading, setLoading] = useState(false);
  const [suppliersList, setSuppliersList] = useState([]);
  const [bInventoryList, setBInventoryList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [createPartnerModalOpen, setCreatePartnerModalOpen] = useState(false);
  const [createPartnerDefaultType, setCreatePartnerDefaultType] = useState(1);

  const [formData, setFormData] = useState({
    supplierId: undefined,
    docCode: '',
    paidAmount: 0,
    note: ''
  });

  const [items, setItems] = useState([]);
  // Lưu string hiển thị SỐ LƯỢNG riêng để tránh bị lock khi đang gõ
  const [qtyInputMap, setQtyInputMap] = useState({});
  const [supplierDebt, setSupplierDebt] = useState(null);
  const [loadingSupplierDebt, setLoadingSupplierDebt] = useState(false);
  const [deductDebt, setDeductDebt] = useState(false);
  const [confirmEmptyExpiryOpen, setConfirmEmptyExpiryOpen] = useState(false);
  const [emptyExpiryCount, setEmptyExpiryCount] = useState(0);

  // Quản lý ảnh chứng từ / biên lai nhập hàng
  const [showImageOverlay, setShowImageOverlay] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch Suppliers & Product Search List when modal opens
  useEffect(() => {
    if (!open) return;

    setSearchQuery('');
    setShowDropdown(false);
    setConfirmEmptyExpiryOpen(false);
    setEmptyExpiryCount(0);
    setShowImageOverlay(false);
    setPreviewImage(null);

    if (branchId) {
      getSuppliers(branchId)
        .then((res) => {
          const data = res?.items || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
          setSuppliersList(data.length > 0 ? data : partners);
        })
        .catch((err) => {
          console.error('Failed to load suppliers:', err);
          setSuppliersList(partners);
        });

      getBInventories(branchId)
        .then((res) => {
          const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          setBInventoryList(data);
        })
        .catch(() => setBInventoryList([]));
    }

    if (editingDocument && editingDocument.id) {
      const populateModalData = (doc) => {
        const supplierPartner = (doc.partners || []).find(
          (p) => p.partnerType === 1 || p.partnerType === 'Supplier'
        ) || doc.partner;

        setFormData({
          supplierId: supplierPartner?.partnerId ? Number(supplierPartner.partnerId) : (doc.partnerId ? Number(doc.partnerId) : undefined),
          docCode: doc.code || '',
          paidAmount: supplierPartner?.amountPaid ? Number(supplierPartner.amountPaid) : (doc.amountPaid ? Number(doc.amountPaid) : 0),
          note: doc.note || ''
        });

        const rawDetails = doc.details || doc.documentDetails || [];
        const mappedItems = rawDetails.map((d) => {
          const bInvId = Number(d.bInventoryId || d.bInventory?.id || d.id);

          const matchedInv = (bInventoryList || []).find((b) => Number(b.id) === bInvId) ||
                             (products || []).find((p) => Number(p.id) === bInvId || Number(p.bInventoryId) === bInvId);

          const conversions = d.bInventory?.product?.unitConversions ||
                              d.unitConversions ||
                              d.conversions ||
                              matchedInv?.unitConversions ||
                              matchedInv?.conversions ||
                              matchedInv?.product?.unitConversions || [];

          const selectedUc = d.unitConversionId ? conversions.find((c) => Number(c.id) === Number(d.unitConversionId)) : (conversions.length > 0 ? conversions[0] : null);
          const conversionPoint = selectedUc?.conversionPoint > 0 ? selectedUc.conversionPoint : (d.conversionRate > 0 ? d.conversionRate : 1);

          const pCode = d.productCode || d.currentProductCode || d.snapshotProductCode || d.code || matchedInv?.code || 'SP';
          const pName = d.productName || d.currentProductName || d.snapshotProductName || d.name || matchedInv?.name || 'Sản phẩm';
          const uName = selectedUc ? (selectedUc.unitName || selectedUc.name) : (d.unitName || d.currentUnitName || d.snapshotUnitName || 'Đơn vị');

          const baseStock = d.currentStockQuantity ?? d.systemQuantity ?? d.bInventory?.quantity ?? matchedInv?.stock ?? matchedInv?.quantity ?? 0;
          const convertedStock = baseStock / conversionPoint;
          const unitPriceVal = Math.floor(Number(d.unitPrice || 0));

          return {
            rowId: `${bInvId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            bInventoryId: bInvId,
            code: pCode,
            name: pName,
            baseStock: baseStock,
            stock: convertedStock,
            quantity: Number(d.quantity || 1),
            baseUnitPrice: conversionPoint > 0 ? unitPriceVal / conversionPoint : unitPriceVal,
            unitPrice: unitPriceVal,
            unitConversionId: selectedUc ? Number(selectedUc.id) : null,
            unitName: uName,
            unitConversions: conversions,
            conversionPoint: conversionPoint,
            batchCode: d.batchCode || d.batchCodeSnapshot || d.batch?.batchCode || '',
            manufactureDate: d.manufactureDate || d.manufactureDateSnapshot ? dayjs(d.manufactureDate || d.manufactureDateSnapshot).format('YYYY-MM-DD') : '',
            expiryDate: d.expiryDate || d.expiryDateSnapshot ? dayjs(d.expiryDate || d.expiryDateSnapshot).format('YYYY-MM-DD') : ''
          };
        });
        setItems(mappedItems);
        setQtyInputMap({});

        // Nạp danh sách ảnh đính kèm (nếu có)
        let imgs = [];
        if (Array.isArray(doc.imageUrls)) {
          imgs = doc.imageUrls;
        } else if (typeof doc.imageUrls === 'string' && doc.imageUrls.trim().length > 0) {
          try {
            imgs = JSON.parse(doc.imageUrls);
          } catch (e) {
            imgs = [doc.imageUrls];
          }
        }
        setImageUrls(imgs || []);
      };

      // Populate immediately with initial editingDocument
      populateModalData(editingDocument);

      // If details array is empty on the passed object, fetch full document details
      const hasDetails = (editingDocument.details && editingDocument.details.length > 0) ||
                         (editingDocument.documentDetails && editingDocument.documentDetails.length > 0);

      if (!hasDetails) {
        getImportById(editingDocument.id)
          .then((fullDoc) => {
            if (fullDoc) {
              populateModalData(fullDoc);
            }
          })
          .catch((err) => console.error('Failed to fetch full editing document:', err));
      }
    } else {
      // Create Mode Initialization
      setFormData({
        supplierId: undefined,
        docCode: '',
        paidAmount: 0,
        note: ''
      });
      setItems([]);
      setQtyInputMap({});
      setImageUrls([]);
      setShowImageOverlay(false);
      setPreviewImage(null);
    }
  }, [open, branchId, partners, editingDocument, products]);

  useEffect(() => {
    setDeductDebt(false);
    if (!formData.supplierId) {
      setSupplierDebt(null);
      return;
    }
    let isMounted = true;
    setLoadingSupplierDebt(true);
    getPartnerFinancialSummary(formData.supplierId)
      .then((res) => {
        if (isMounted) setSupplierDebt(res);
      })
      .catch(() => {
        if (isMounted) setSupplierDebt(null);
      })
      .finally(() => {
        if (isMounted) setLoadingSupplierDebt(false);
      });
    return () => {
      isMounted = false;
    };
  }, [formData.supplierId]);

  // Live Product Search Trigger
  useEffect(() => {
    if (!open || !branchId || !searchQuery) return;
    const timer = setTimeout(() => {
      getProductsByDate(branchId, null, searchQuery, null, 1)
        .then((res) => {
          const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          if (data.length > 0) setBInventoryList(data);
        })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, open, branchId]);

  // Filtered Products for Search Dropdown (ONLY ProductType REGULAR, INGREDIENT, TOOL allowed)
  const searchOptions = bInventoryList.length > 0 ? bInventoryList : products;
  const filteredSearchList = searchOptions.filter((b) => {
    const rawType = b.type ?? b.productType ?? b.product?.type;
    const typeStr = String(rawType ?? '').toLowerCase();
    const isAllowedType =
      typeStr === 'regular' ||
      typeStr === 'ingredient' ||
      typeStr === 'tool' ||
      rawType === 3 ||
      rawType === 4 ||
      rawType === 5;

    if (!isAllowedType) return false;

    if (!searchQuery) return true;
    const lower = searchQuery.toLowerCase();
    const matchName = (b.name || b.productName || '').toLowerCase().includes(lower);
    const matchCode = (b.code || b.productCode || '').toLowerCase().includes(lower);
    return matchName || matchCode;
  });

  // Add Item Handler (Preserves existing item selection if already in table)
  const handleAddItem = (prod) => {
    const bInvId = Number(prod.id ?? prod.bInventoryId ?? prod.productId);
    setItems((prevItems) => {
      const existingIdx = prevItems.findIndex((i) => Number(i.bInventoryId) === bInvId);
      if (existingIdx >= 0) {
        const updated = [...prevItems];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1
        };
        return updated;
      }

      const conversions = prod.unitConversions || prod.conversions || prod.product?.unitConversions || [];
      const defaultUc = conversions.length > 0 ? conversions[0] : null;
      const conversionPoint = defaultUc?.conversionPoint > 0 ? defaultUc.conversionPoint : 1;
      const baseStock = prod.quantity ?? prod.stockQuantity ?? prod.stock ?? prod.baseStock ?? 0;
      const convertedStock = baseStock / conversionPoint;
      const basePrice = Math.floor(Number(prod.purchasePrice || prod.avg || prod.sellPrice || 0));

      return [
        ...prevItems,
        {
          rowId: `${bInvId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          bInventoryId: bInvId,
          code: prod.code || prod.skuCode || `SP${bInvId}`,
          name: prod.name || 'Sản phẩm',
          baseStock: baseStock,
          stock: convertedStock,
          quantity: 1,
          baseUnitPrice: basePrice,
          unitPrice: Math.floor(basePrice * conversionPoint),
          unitConversionId: defaultUc ? Number(defaultUc.id) : null,
          unitName: defaultUc ? (defaultUc.unitName || defaultUc.name) : (prod.unitName || 'Đơn vị'),
          unitConversions: conversions,
          conversionPoint: conversionPoint,
          batchCode: '',
          manufactureDate: '',
          expiryDate: ''
        }
      ];
    });
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleUnitChange = (rowId, ucId) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;
        const conversions = item.unitConversions || [];
        const selectedUc = conversions.find((c) => Number(c.id) === Number(ucId));
        const conversionPoint = selectedUc?.conversionPoint > 0 ? selectedUc.conversionPoint : 1;
        const unitName = selectedUc ? (selectedUc.unitName || selectedUc.name) : item.unitName;
        const baseStock = item.baseStock ?? item.stock ?? 0;
        const convertedStock = baseStock / conversionPoint;
        const baseUnitPrice = item.baseUnitPrice ?? (item.conversionPoint > 0 ? item.unitPrice / item.conversionPoint : item.unitPrice);

        return {
          ...item,
          unitConversionId: selectedUc ? Number(selectedUc.id) : null,
          unitName: unitName,
          conversionPoint: conversionPoint,
          stock: convertedStock,
          unitPrice: Math.floor(baseUnitPrice * conversionPoint)
        };
      })
    );
  };

  const handleRemoveItem = (rowId) => {
    setItems((prev) => prev.filter((i) => i.rowId !== rowId));
  };

  const handleItemChange = (rowId, field, val) => {
    setItems((prev) =>
      prev.map((i) => (i.rowId === rowId ? { ...i, [field]: val } : i))
    );
  };

  const handlePartnerCreated = (newPartner) => {
    if (!newPartner) return;
    if (branchId) {
      getSuppliers(branchId)
        .then((res) => {
          const data = res?.items || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
          setSuppliersList(data.length > 0 ? data : partners);
        })
        .catch(() => {});
    }
    if (newPartner.id) {
      setFormData((prev) => ({ ...prev, supplierId: Number(newPartner.id) }));
    }
  };

  // Calculations & Rounding Rules
  const goodsAmount = items.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
  const remainder = goodsAmount - Math.floor(goodsAmount);
  const roundedGoodsAmount = remainder < 0.5 ? Math.floor(goodsAmount) : Math.floor(goodsAmount) + 1;
  const roundingValue = goodsAmount - roundedGoodsAmount;

  // Bù trừ công nợ khi NCC nợ cửa hàng (remainingDebt < 0)
  const supplierCredit = (supplierDebt && supplierDebt.remainingDebt < 0) ? Math.abs(supplierDebt.remainingDebt) : 0;
  const effectiveCreditDeduction = (deductDebt && supplierCredit > 0) ? Math.min(roundedGoodsAmount, supplierCredit) : 0;
  const payableAmount = Math.max(0, roundedGoodsAmount - effectiveCreditDeduction);

  useEffect(() => {
    if (Number(formData.paidAmount || 0) > payableAmount) {
      setFormData((prev) => ({ ...prev, paidAmount: payableAmount }));
    }
  }, [payableAmount, formData.paidAmount]);

  // Build Payload (Matches ImportDocumentCreateDto and ImportDocumentUpdateDto schema)
  const buildPayload = () => {
    const formattedDetails = items.map((i) => ({
      bInventoryId: Number(i.bInventoryId),
      unitConversionId: i.unitConversionId ? Number(i.unitConversionId) : null,
      quantity: Number(i.quantity || 1),
      unitPrice: Number(i.unitPrice || 0),
      batchCodeSnapshot: i.batchCode ? i.batchCode.trim() : undefined,
      manufactureDateSnapshot: i.manufactureDate ? new Date(i.manufactureDate).toISOString() : undefined,
      expiryDateSnapshot: i.expiryDate ? new Date(i.expiryDate).toISOString() : undefined
    }));

    const deductionNote = deductDebt && effectiveCreditDeduction > 0
      ? `(Trừ tiền NCC nợ: ${effectiveCreditDeduction.toLocaleString('vi-VN')} đ)`
      : '';
    const finalNote = formData.note
      ? (deductionNote && !formData.note.includes('Trừ tiền NCC nợ') ? `${formData.note} ${deductionNote}` : formData.note)
      : (deductionNote ? `Trừ tiền NCC nợ: ${effectiveCreditDeduction.toLocaleString('vi-VN')} đ` : '');

    return {
      branchId: Number(branchId),
      code: formData.docCode ? formData.docCode.trim() : undefined,
      partnerId: formData.supplierId ? Number(formData.supplierId) : null,
      orderDate: new Date().toISOString(),
      note: finalNote,
      amountPaid: Number(formData.paidAmount || 0),
      debtDeductionAmount: (deductDebt && effectiveCreditDeduction > 0) ? effectiveCreditDeduction : 0,
      imageUrls: imageUrls || [],
      details: formattedDetails
    };
  };

  // Xử lý upload ảnh chứng từ
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const validImageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validImageFiles.length === 0) {
      alert('Vui lòng chỉ chọn các tệp hình ảnh (.jpg, .jpeg, .png, .webp, ...).');
      return;
    }
    setUploadingImage(true);
    try {
      const uploadPromises = validImageFiles.map((file) => uploadImage(file));
      const results = await Promise.all(uploadPromises);
      const newUrls = results
        .map((res) => res.data?.imageLink || res.data?.url || res.data)
        .filter(Boolean);
      // Ảnh mới tải lên sẽ nằm ở đầu danh sách dưới ô tải ảnh
      setImageUrls((prev) => [...newUrls, ...prev]);
      showToast(`Đã tải lên ${newUrls.length} hình ảnh`);
    } catch (error) {
      console.error('Lỗi khi tải ảnh:', error);
      alert('Không thể tải ảnh lên máy chủ. Vui lòng kiểm tra lại kết nối và thử lại!');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files) {
      await handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // ACTION 1: LƯU TẠM (SAVE PENDING)
  const handleSavePending = async () => {
    if (items.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để nhập kho');
      return;
    }

    for (const item of items) {
      const q = Number(item.quantity || 0);
      const p = Number(item.unitPrice || 0);
      if (q < 0.001 || q > 10000000000) {
        alert(`Số lượng mặt hàng '${item.name}' (${q}) không hợp lệ. Phải nằm trong khoảng từ 0.001 đến 10 tỷ.`);
        return;
      }
      if (p < 0 || p > 10000000000) {
        alert(`Đơn giá nhập mặt hàng '${item.name}' (${p}) không hợp lệ. Phải là số dương từ 0 đến 10 tỷ VNĐ.`);
        return;
      }
      if (item.manufactureDate && item.expiryDate) {
        const mDate = new Date(item.manufactureDate);
        const eDate = new Date(item.expiryDate);
        if (eDate < mDate) {
          alert(`Hạn sử dụng của mặt hàng '${item.name}' không được trước ngày sản xuất.`);
          return;
        }
      }
    }

    if (Number(formData.paidAmount || 0) < 0 || Number(formData.paidAmount || 0) > roundedGoodsAmount) {
      alert(`Số tiền đã trả (${formData.paidAmount}) không hợp lệ. Phải nằm trong khoảng từ 0 đến ${roundedGoodsAmount.toLocaleString('vi-VN')} đ.`);
      return;
    }

    setLoading(true);
    try {
      const payload = buildPayload();
      if (editingDocument && editingDocument.id) {
        await updateImportPending(editingDocument.id, payload);
      } else {
        await createImportPending(payload);
      }
      showToast('Lưu thành công');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu tạm phiếu nhập:', err);
      const serverMsg = extractErrorMessage(err, 'Không thể lưu tạm phiếu nhập.');
      alert(`Lỗi khi lưu tạm phiếu nhập:\n${serverMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // ACTION 2: HOÀN THÀNH (COMPLETE & POST)
  const executeComplete = async () => {
    const maxPayable = deductDebt ? payableAmount : roundedGoodsAmount;
    if (Number(formData.paidAmount || 0) < 0 || Number(formData.paidAmount || 0) > maxPayable) {
      alert(`Số tiền đã trả (${formData.paidAmount}) không hợp lệ. Phải nằm trong khoảng từ 0 đến ${maxPayable.toLocaleString('vi-VN')} đ.`);
      return;
    }
    setLoading(true);
    try {
      const payload = buildPayload();
      if (editingDocument && editingDocument.id) {
        await updateImportPending(editingDocument.id, payload);
        await completeImportDocument(editingDocument.id);
      } else {
        await createImportCompleted(payload);
      }
      showToast('Tạo thành công');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi hoàn thành phiếu nhập:', err);
      const serverMsg = extractErrorMessage(err, 'Không thể hoàn thành phiếu nhập.');
      alert(`Lỗi khi hoàn thành phiếu nhập:\n${serverMsg}`);
    } finally {
      setLoading(false);
      setConfirmEmptyExpiryOpen(false);
    }
  };

  const handleComplete = async () => {
    if (items.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để nhập kho');
      return;
    }
    if (!formData.supplierId || Number(formData.supplierId) <= 0) {
      alert('Vui lòng chọn Nhà cung cấp trước khi hoàn thành phiếu nhập kho.');
      return;
    }

    for (const item of items) {
      const q = Number(item.quantity || 0);
      const p = Number(item.unitPrice || 0);
      if (q < 0.001 || q > 10000000000) {
        alert(`Số lượng mặt hàng '${item.name}' (${q}) không hợp lệ. Phải nằm trong khoảng từ 0.001 đến 10 tỷ.`);
        return;
      }
      if (p < 0 || p > 10000000000) {
        alert(`Đơn giá nhập mặt hàng '${item.name}' (${p}) không hợp lệ. Phải là số dương từ 0 đến 10 tỷ VNĐ.`);
        return;
      }
      if (item.manufactureDate && item.expiryDate) {
        const mDate = new Date(item.manufactureDate);
        const eDate = new Date(item.expiryDate);
        if (eDate < mDate) {
          alert(`Hạn sử dụng của mặt hàng '${item.name}' không được trước ngày sản xuất.`);
          return;
        }
      }
    }

    // Kiểm tra các mặt hàng đang bỏ trống HẠN DÙNG
    const emptyExpiryItems = items.filter((item) => !item.expiryDate || String(item.expiryDate).trim() === '');
    if (emptyExpiryItems.length > 0) {
      setEmptyExpiryCount(emptyExpiryItems.length);
      setConfirmEmptyExpiryOpen(true);
      return;
    }

    await executeComplete();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* ORIGINAL HEADER BAR (BRAND ORANGE GRADIENT) */}
      <div
        style={{
          height: 48,
          background: 'linear-gradient(135deg, #e8442a 0%, #d9381e 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxShadow: '0 2px 8px rgba(232, 68, 42, 0.25)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#ffffff', letterSpacing: '0.3px' }}>
            {editingDocument ? `Chỉnh sửa phiếu nhập kho (${editingDocument.code})` : 'Tạo phiếu nhập kho'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <button
            type="button"
            title="Toàn màn hình"
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              borderRadius: 6,
              padding: '5px 8px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FullscreenOutlined />
          </button>
          <button
            type="button"
            title="In phiếu"
            style={{
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              borderRadius: 6,
              padding: '5px 8px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <PrinterOutlined />
          </button>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              border: 'none',
              borderRadius: 6,
              padding: '5px 8px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 15,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <CloseOutlined />
          </button>
        </div>
      </div>

      {/* ORIGINAL 2-COLUMN BODY (LEFT: TABLE & SEARCH | RIGHT: SIDEBAR FORM) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT SECTION: SEARCH & PRODUCT TABLE */}
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* SEARCH INPUT WITH DROPDOWN */}
          <div style={{ marginBottom: 10, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <SearchOutlined style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }} />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                placeholder="Tìm sản phẩm theo mã hoặc tên (F1)..."
                style={{
                  width: '100%',
                  height: 36,
                  paddingLeft: 34,
                  paddingRight: 12,
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  background: '#ffffff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
            </div>

            {/* LIVE SEARCH DROPDOWN */}
            {showDropdown && filteredSearchList.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  background: '#ffffff',
                  maxHeight: 220,
                  overflowY: 'auto',
                  marginTop: 4,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 100
                }}
              >
                {filteredSearchList.map((p) => (
                  <div
                    key={p.id ?? p.bInventoryId ?? p.productId}
                    onClick={() => handleAddItem(p)}
                    style={{
                      padding: '9px 14px',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >
                    <div>
                      <strong style={{ color: '#0f172a' }}>{p.name}</strong> <span style={{ color: '#64748b' }}>({p.code || p.skuCode})</span>
                    </div>
                    <span style={{ color: '#2563eb', fontWeight: 600 }}>Tồn: {p.quantity ?? p.stockQuantity ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PRODUCT ITEMS TABLE */}
          <div
            style={{
              flex: 1,
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textTransform: 'uppercase', color: '#334155', fontWeight: 700, fontSize: 10 }}>
                  <th style={{ width: 36, padding: '8px 6px', textAlign: 'center' }}>STT</th>
                  <th style={{ width: 95, padding: '8px 8px', textAlign: 'left' }}>MÃ HÀNG</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left' }}>TÊN HÀNG</th>
                  <th style={{ width: 105, padding: '8px 6px', textAlign: 'left' }}>MÃ LÔ</th>
                  <th style={{ width: 105, padding: '8px 6px', textAlign: 'left' }}>NGÀY SX</th>
                  <th style={{ width: 105, padding: '8px 6px', textAlign: 'left' }}>HẠN DÙNG</th>
                  <th style={{ width: 85, padding: '8px 6px', textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: 65, padding: '8px 6px', textAlign: 'center' }}>TỒN</th>
                  <th style={{ width: 75, padding: '8px 6px', textAlign: 'center' }}>SỐ LƯỢNG</th>
                  <th style={{ width: 95, padding: '8px 6px', textAlign: 'right' }}>ĐƠN GIÁ</th>
                  <th style={{ width: 105, padding: '8px 6px', textAlign: 'right' }}>THÀNH TIỀN</th>
                  <th style={{ width: 32, padding: '8px 4px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
                      Chưa có sản phẩm nào được chọn. Hãy gõ tìm kiếm để chọn sản phẩm nhập kho.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const rowTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);

                    return (
                      <tr key={item.rowId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ textAlign: 'center', color: '#64748b', padding: '6px 4px' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: '#2563eb', padding: '6px 8px' }}>{item.code}</td>
                        <td style={{ fontWeight: 600, color: '#0f172a', padding: '6px 8px' }}>{item.name}</td>
                        <td style={{ padding: '6px 4px' }}>
                          <input
                            type="text"
                            placeholder="Tự sinh"
                            value={item.batchCode || ''}
                            onChange={(e) => handleItemChange(item.rowId, 'batchCode', e.target.value)}
                            style={{
                              width: '100%',
                              height: 26,
                              fontSize: 10.5,
                              padding: '0 4px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              outline: 'none'
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input
                            type="date"
                            value={item.manufactureDate || ''}
                            onChange={(e) => handleItemChange(item.rowId, 'manufactureDate', e.target.value)}
                            style={{
                              width: '100%',
                              height: 26,
                              fontSize: 10.5,
                              padding: '0 2px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              outline: 'none'
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <input
                            type="date"
                            value={item.expiryDate || ''}
                            onChange={(e) => handleItemChange(item.rowId, 'expiryDate', e.target.value)}
                            style={{
                              width: '100%',
                              height: 26,
                              fontSize: 10.5,
                              padding: '0 2px',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              outline: 'none'
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                          {item.unitConversions && item.unitConversions.length > 0 ? (
                            <select
                              value={item.unitConversionId || ''}
                              onChange={(e) => handleUnitChange(item.rowId, e.target.value)}
                              style={{
                                height: 26,
                                padding: '0 4px',
                                fontSize: 11,
                                borderRadius: 4,
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                outline: 'none'
                              }}
                            >
                              {item.unitConversions.map((uc) => (
                                <option key={uc.id} value={uc.id}>
                                  {uc.unitName || uc.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ color: '#475569' }}>{item.unitName || 'Đơn vị'}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b', padding: '6px 4px' }}>
                          {item.stock != null ? Number(item.stock).toLocaleString('vi-VN', { maximumFractionDigits: 3 }) : 0}
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                          <input
                            type="number"
                            min={0.001}
                            step="any"
                            value={qtyInputMap[item.rowId] !== undefined ? qtyInputMap[item.rowId] : item.quantity}
                            onChange={(e) => {
                              // Cập nhật string hiển thị tự do, không clamp
                              setQtyInputMap((prev) => ({ ...prev, [item.rowId]: e.target.value }));
                            }}
                            onBlur={(e) => {
                              // Khi rời input mới validate & commit số thực
                              const val = parseFloat(e.target.value);
                              const committed = isNaN(val) || val < 0.001 ? 0.001 : val;
                              handleItemChange(item.rowId, 'quantity', committed);
                              setQtyInputMap((prev) => ({ ...prev, [item.rowId]: String(committed) }));
                            }}
                            style={{
                              width: 60,
                              height: 26,
                              textAlign: 'center',
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              outline: 'none'
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 4px' }}>
                          <input
                            type="text"
                            value={Number(item.unitPrice || 0).toLocaleString('vi-VN')}
                            onChange={(e) => {
                              const rawVal = e.target.value.replace(/[^0-9]/g, '');
                              const numVal = rawVal ? Number(rawVal) : 0;
                              handleItemChange(item.rowId, 'unitPrice', Math.max(0, numVal));
                            }}
                            style={{
                              width: 80,
                              height: 26,
                              textAlign: 'right',
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              outline: 'none'
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#e8442a', padding: '6px 4px' }}>
                          {rowTotal.toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 2px' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.rowId)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: 4,
                              fontSize: 13
                            }}
                          >
                            <DeleteOutlined />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT SECTION: SIDEBAR FORM & SUMMARY (WIDTH 330PX MATCHING ORIGINAL DESIGNS) */}
        <div
          style={{
            width: 330,
            background: '#ffffff',
            borderLeft: '1px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
        >
          {/* USER & AUDIT HEADER CARD */}
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155', fontWeight: 600 }}>
              <UserOutlined style={{ color: '#e8442a' }} />
              <span>Người tạo: <strong style={{ color: '#0f172a' }}>{creatorName}</strong></span>
            </div>
            <div style={{ color: '#64748b', fontSize: 10.5, marginTop: 4 }}>
              Thời gian khởi tạo: {dayjs().format('DD/MM/YYYY HH:mm')}
            </div>
          </div>

          {/* FORM FIELDS */}
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, position: 'relative', overflowY: 'auto' }}>
            {/* SUPPLIER SELECT WITH QUICK CREATE BUTTON */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                  Nhà cung cấp <span style={{ color: '#e8442a' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCreatePartnerDefaultType(1);
                    setCreatePartnerModalOpen(true);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#2563eb',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <PlusOutlined /> Thêm mới
                </button>
              </div>
              <select
                value={formData.supplierId || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, supplierId: e.target.value ? Number(e.target.value) : undefined }))}
                style={{
                  width: '100%',
                  height: 32,
                  padding: '0 8px',
                  fontSize: 11.5,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  outline: 'none'
                }}
              >
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliersList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.partnerName}
                  </option>
                ))}
              </select>
              {formData.supplierId && (
                <div style={{ marginTop: 6 }}>
                  {loadingSupplierDebt ? (
                    <span style={{ fontSize: 10.5, color: '#64748b' }}>Đang nạp công nợ NCC...</span>
                  ) : supplierDebt ? (() => {
                    const info = getDebtDisplayInfo(supplierDebt.remainingDebt);
                    return (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: info.bgColor,
                          color: info.color,
                          border: `1px solid ${info.borderColor}`
                        }}
                      >
                        <span>Công nợ hiện tại:</span>
                        <strong>{info.text}</strong>
                      </div>
                    );
                  })() : null}
                </div>
              )}
            </div>

            {/* DOCUMENT CODE */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 4 }}>
                Mã phiếu nhập
              </label>
              <input
                type="text"
                value={formData.docCode}
                onChange={(e) => setFormData((prev) => ({ ...prev, docCode: e.target.value }))}
                placeholder="Mã tự động..."
                style={{
                  width: '100%',
                  height: 32,
                  padding: '0 8px',
                  fontSize: 11.5,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  outline: 'none'
                }}
              />
            </div>

            {/* NOTE */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 4 }}>
                Ghi chú
              </label>
              <textarea
                rows={2}
                value={formData.note}
                onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Ghi chú thêm..."
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: 11.5,
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            {/* FINANCIAL SUMMARY BOX (DISCOUNT & OTHER COST OMITTED AS REQUESTED) */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0', marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Tổng số lượng:</span>
                <strong style={{ color: '#0f172a' }}>
                  {items.reduce((sum, i) => sum + Number(i.quantity || 0), 0).toLocaleString('vi-VN')}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#334155', fontWeight: 600 }}>Tổng tiền hàng (gốc):</span>
                <strong style={{ color: '#e8442a', fontSize: 14 }}>{goodsAmount.toLocaleString('vi-VN')} đ</strong>
              </div>

              {roundingValue !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11.5, color: '#d97706' }}>
                  <span>ĐC Làm tròn (Rounding):</span>
                  <strong>{roundingValue > 0 ? `-${roundingValue.toLocaleString('vi-VN')}` : `+${Math.abs(roundingValue).toLocaleString('vi-VN')}`} đ</strong>
                </div>
              )}

              {/* DÒNG TÍCH CHỌN TRỪ TIỀN NCC ĐANG NỢ MÌNH */}
              {supplierCredit > 0 && (
                <div style={{ margin: '8px 0', padding: '6px 10px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: '#166534' }}>
                    <input
                      type="checkbox"
                      checked={deductDebt}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDeductDebt(checked);
                        const ded = checked ? Math.min(roundedGoodsAmount, supplierCredit) : 0;
                        const newPayable = Math.max(0, roundedGoodsAmount - ded);
                        setFormData((prev) => ({ ...prev, paidAmount: newPayable }));
                      }}
                      style={{ accentColor: '#16a34a', width: 15, height: 15, cursor: 'pointer' }}
                    />
                    <span>Trừ tiền NCC nợ ({supplierCredit.toLocaleString('vi-VN')} đ)</span>
                  </label>
                </div>
              )}

              {/* DÒNG HIỂN THỊ SỐ TIỀN TRỪ NỢ (KHI ĐƯỢC TÍCH) */}
              {deductDebt && effectiveCreditDeduction > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#16a34a' }}>
                  <span style={{ fontWeight: 600 }}>Trừ tiền NCC nợ:</span>
                  <strong style={{ fontWeight: 700 }}>-{effectiveCreditDeduction.toLocaleString('vi-VN')} đ</strong>
                </div>
              )}

              {/* DÒNG TIỀN PHẢI TRẢ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>Tiền phải trả:</span>
                <strong style={{ color: '#059669', fontSize: 15 }}>{payableAmount.toLocaleString('vi-VN')} đ</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
                <span style={{ color: '#475569', fontSize: 11.5, fontWeight: 600 }}>Tiền trả NCC:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    formData.paidAmount === '' || formData.paidAmount == null
                      ? ''
                      : Number(formData.paidAmount).toLocaleString('vi-VN')
                  }
                  onChange={(e) => {
                    const rawDigits = e.target.value.replace(/\D/g, '');
                    if (!rawDigits) {
                      setFormData((prev) => ({ ...prev, paidAmount: 0 }));
                      return;
                    }
                    let val = Number(rawDigits);
                    if (val > payableAmount) {
                      val = payableAmount;
                    }
                    setFormData((prev) => ({ ...prev, paidAmount: val }));
                  }}
                  onFocus={(e) => {
                    if (formData.paidAmount === 0) {
                      e.target.select();
                    }
                  }}
                  placeholder="0"
                  style={{
                    width: 130,
                    height: 28,
                    padding: '0 8px',
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'right',
                    borderRadius: 4,
                    border: '1px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* NÚT TẢI ẢNH (NGAY BÊN DƯỚI CARD TIỀN TRẢ NCC) */}
            <button
              type="button"
              onClick={() => setShowImageOverlay(true)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: '#f8fafc',
                border: '1px dashed #0284c7',
                borderRadius: 6,
                color: '#0369a1',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e0f2fe';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
              }}
            >
              <UploadOutlined style={{ fontSize: 14 }} />
              <span>Tải Ảnh {imageUrls.length > 0 ? `(${imageUrls.length})` : ''}</span>
            </button>

            {/* OVERLAY POPUP HIỂN THỊ ĐÈ LÊN KHU VỰC THÔNG TIN NHÀ CUNG CẤP & CHI TIẾT */}
            {showImageOverlay && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#ffffff',
                  zIndex: 25,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  overflowY: 'auto'
                }}
              >
                {/* NÚT QUAY LẠI */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowImageOverlay(false)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                    }}
                  >
                    <ArrowLeftOutlined /> Quay lại
                  </button>
                  <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>
                    {imageUrls.length > 0 ? `${imageUrls.length} ảnh đã chọn` : 'Chưa có ảnh'}
                  </span>
                </div>

                {/* HÌNH VUÔNG VỚI NÚT TẢI ẢNH (ĐƯỜNG VIỀN NÉT ĐỨT) */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: 8,
                    border: isDragging ? '2px dashed #0284c7' : '2px dashed #94a3b8',
                    background: isDragging ? '#e0f2fe' : (uploadingImage ? '#f8fafc' : '#fafafa'),
                    boxShadow: isDragging ? '0 0 15px rgba(2, 132, 199, 0.45)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: uploadingImage ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    userSelect: 'none',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (!isDragging && !uploadingImage) {
                      e.currentTarget.style.borderColor = '#0284c7';
                      e.currentTarget.style.background = '#f0f9ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDragging && !uploadingImage) {
                      e.currentTarget.style.borderColor = '#94a3b8';
                      e.currentTarget.style.background = '#fafafa';
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {uploadingImage ? (
                    <div style={{ textAlign: 'center', color: '#0284c7' }}>
                      <LoadingOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                      <div style={{ fontSize: 12, fontWeight: 700 }}>Đang tải ảnh lên...</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: isDragging ? '#0284c7' : '#475569', padding: 16 }}>
                      <CloudUploadOutlined style={{ fontSize: 38, color: isDragging ? '#0284c7' : '#64748b', marginBottom: 8 }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: isDragging ? '#0369a1' : '#1e293b' }}>
                        Tải ảnh
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        {isDragging ? 'Thả ảnh vào đây' : 'Bấm hoặc kéo thả ảnh vào đây'}
                      </div>
                    </div>
                  )}
                </div>

                {/* DANH SÁCH ẢNH ĐƯỢC TẢI LÊN (HIỂN THỊ BÊN DƯỚI Ô TẢI ẢNH, DẠNG HÌNH VUÔNG, CUỘN ĐƯỢC) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {imageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        position: 'relative',
                        background: '#f8fafc',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                      }}
                    >
                      <img
                        src={url}
                        alt={`Ảnh ${idx + 1}`}
                        onClick={() => setPreviewImage(url)}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          cursor: 'pointer',
                          display: 'block'
                        }}
                      />
                      {/* NHÃN THỨ TỰ ẢNH */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          left: 8,
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          pointerEvents: 'none'
                        }}
                      >
                        Ảnh {idx + 1}
                      </div>
                      {/* NÚT PHÓNG TO VÀ XÓA */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          display: 'flex',
                          gap: 6
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setPreviewImage(url)}
                          title="Phóng to ảnh để xem"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 4,
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12
                          }}
                        >
                          <ZoomInOutlined />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          title="Xóa ảnh này"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 4,
                            background: 'rgba(239, 68, 68, 0.85)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12
                          }}
                        >
                          <DeleteOutlined />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS AT SIDEBAR FOOTER ([LƯU TẠM] & [HOÀN THÀNH]) */}
          <div style={{ padding: 16, borderTop: '1px solid #cbd5e1', background: '#ffffff', display: 'flex', gap: 10 }}>
            <button
              type="button"
              disabled={loading || items.length === 0}
              onClick={handleSavePending}
              style={{
                flex: 1,
                height: 38,
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 6,
                border: '1px solid #fde68a',
                background: loading || items.length === 0 ? '#fef3c7' : '#f59e0b',
                color: '#ffffff',
                cursor: loading || items.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Đang lưu...' : 'Lưu tạm'}
            </button>

            <button
              type="button"
              disabled={loading || items.length === 0}
              onClick={handleComplete}
              style={{
                flex: 1,
                height: 38,
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 6,
                border: 'none',
                background: loading || items.length === 0 ? '#cbd5e1' : '#e8442a',
                color: '#ffffff',
                cursor: loading || items.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(232, 68, 42, 0.25)'
              }}
            >
              {loading ? 'Đang xử lý...' : 'Hoàn thành'}
            </button>
          </div>
        </div>
      </div>

      {/* QUICK CREATE PARTNER MODAL */}
      <QuickCreatePartnerModal
        open={createPartnerModalOpen}
        onClose={() => setCreatePartnerModalOpen(false)}
        onPartnerCreated={handlePartnerCreated}
        branchId={branchId}
        defaultType={createPartnerDefaultType}
      />

      {/* MODAL XÁC NHẬN BỎ TRỐNG HẠN DÙNG */}
      {confirmEmptyExpiryOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 100000,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: 440,
              maxWidth: '92vw',
              background: '#ffffff',
              borderRadius: 12,
              padding: '22px 24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0
                }}
              >
                <InfoCircleOutlined />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Xác nhận hạn dùng
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Thông tin hạn sử dụng hàng nhập kho
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 18,
                fontSize: 13,
                color: '#92400e',
                lineHeight: 1.5
              }}
            >
              Hiện đang có <strong style={{ color: '#b45309', fontSize: 14 }}>{emptyExpiryCount}</strong> mặt hàng chưa nhập <strong style={{ color: '#b45309' }}>HẠN DÙNG</strong>.
              <div style={{ marginTop: 6, color: '#451a03' }}>
                Bạn có muốn tiếp tục để HẠN DÙNG bỏ trống và hoàn thành phiếu nhập kho không?
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmEmptyExpiryOpen(false)}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Quay lại điền
              </button>
              <button
                type="button"
                onClick={executeComplete}
                disabled={loading}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                }}
              >
                {loading ? 'Đang hoàn thành...' : 'Đồng ý để trống'}
              </button>
            </div>
          </div>
        </div>
      )}

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

export default ImportDocumentModal;
