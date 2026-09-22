import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Switch } from 'antd';
import {
  ReloadOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  SwapOutlined,
  ProfileOutlined,
  SearchOutlined,
  AppstoreOutlined,
  CompassOutlined,
  InboxOutlined,
  EyeOutlined,
  SettingOutlined,
  BellOutlined,
  CloseOutlined,
  BellFilled
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getBInventories,
  getBInventoryLedger,
  getStockAlertSettings,
  updateStockAlertSettings,
  getItemStockAlertSettings,
  updateItemStockAlertSettings
} from '../../../../api/binventoryApi';
import { getBatchesByBInventoryId } from '../../../../api/batchApi';
import { renderBatchStatusBadge, renderExpiryStatusBadge } from '../../utils/batchHelper';
import BatchTraceabilityDrawer from './BatchTraceabilityDrawer';
import PaginationFooter from '../../../shared/PaginationFooter';

const showProductToast = (text, type = 'success') => {
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

const renderTruncatedText = (value, maxLength = 25, style = {}) => {
  const str = value !== null && value !== undefined ? String(value) : '';
  const isTooLong = str.length > maxLength;
  const displayStr = isTooLong ? `${str.slice(0, maxLength)}...` : str;

  return (
    <span
      title={str}
      style={{
        display: 'inline-block',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        verticalAlign: 'bottom',
        ...style
      }}
    >
      {displayStr}
    </span>
  );
};

// Check if product is PROCESSED (Món ăn / Món chế biến)
const checkIsProcessed = (item) => {
  const pType = String(
    item.productType || item.product?.type || item.type || ''
  ).toLowerCase().trim();

  return pType === 'processed' || pType === '1';
};

// Badge helper for rendering ProductType on the un-expanded main row
const getProductTypeBadge = (item) => {
  const pType = String(
    item.productType || item.product?.type || item.type || ''
  ).toLowerCase();

  if (pType === 'ingredient' || pType === '4') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
        Nguyên liệu
      </span>
    );
  }
  if (pType === 'processed' || pType === '1') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>
        Món chế biến
      </span>
    );
  }
  if (pType === 'manufactured' || pType === '2') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, background: '#fae8ff', color: '#86198f', border: '1px solid #f5d0fe' }}>
        Sản xuất
      </span>
    );
  }
  if (pType === 'regular' || pType === '3') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
        Hàng hóa
      </span>
    );
  }
  if (pType === 'tool' || pType === '5') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
        Công cụ
      </span>
    );
  }

  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
      {item.type || item.productType || 'Khác'}
    </span>
  );
};

const mapMethodToTab = (methodName, docCode) => {
  if (methodName === "Bán hàng" || (docCode && (docCode.startsWith("PXBH") || docCode.startsWith("HD")))) {
    return "Invoice";
  }
  switch (methodName) {
    case "Nhập hàng":
      return "Import";
    case "Trả hàng nhập":
    case "Trả Hàng":
    case "Trả hàng":
      return "ImportReturn";
    case "Kiểm kho":
      return "Check";
    case "Xuất hủy":
    case "Xuất Hủy":
      return "ExportDelete";
    case "Xuất chuyển kho":
    case "Chuyển Hàng":
    case "Chuyển hàng":
      return "Transfer";
    case "Sản xuất":
      return "Production";
    case "Điều chỉnh":
    case "Điều chỉnh giá vốn":
      return "Adjustment";
    default:
      return null;
  }
};

const renderMethodBadge = (ldg) => {
  let method = ldg.methodName || ldg.method || ldg.type || '';
  const docType = ldg.documentType || '';
  const docCode = ldg.documentCode || ldg.docCode || '';

  if (docType === 'Export' || docType === 'ExportDelete' || method.toLowerCase().includes('hủy') || docCode.startsWith('XH')) {
    method = 'Xuất Hủy';
  } else if (docType === 'Sale' || method.toLowerCase().includes('bán') || docCode.startsWith('PXBH') || docCode.startsWith('HD')) {
    method = 'Bán hàng';
  } else if (docType === 'Return' || (method.toLowerCase().includes('trả') && !method.toLowerCase().includes('khách')) || docCode.startsWith('THN') || docCode.startsWith('TH')) {
    method = 'Trả Hàng';
  } else if (docType === 'Transfer' || method.toLowerCase().includes('chuyển') || docCode.startsWith('CK')) {
    method = 'Chuyển Hàng';
  } else if (docType === 'CustomerReturn' || method.toLowerCase().includes('khách')) {
    method = 'Khách trả hàng';
  } else if (docType === 'Import' || method.toLowerCase().includes('nhập') || docCode.startsWith('NH')) {
    method = 'Nhập hàng';
  } else if (docType === 'Check' || method.toLowerCase().includes('kiểm')) {
    method = 'Kiểm kho';
  } else if (docType === 'Production' || method.toLowerCase().includes('sản xuất')) {
    method = 'Sản xuất';
  }

  let bg = '#f1f5f9';
  let color = '#334155';
  let border = '#e2e8f0';

  if (method === 'Bán hàng') {
    bg = '#eff6ff';
    color = '#1d4ed8';
    border = '#bfdbfe';
  } else if (method === 'Xuất Hủy') {
    bg = '#fef2f2';
    color = '#dc2626';
    border = '#fecaca';
  } else if (method === 'Trả Hàng') {
    bg = '#fff7ed';
    color = '#c2410c';
    border = '#ffedd5';
  } else if (method === 'Chuyển Hàng') {
    bg = '#f5f3ff';
    color = '#6d28d9';
    border = '#ddd6fe';
  } else if (method === 'Nhập hàng') {
    bg = '#ecfdf5';
    color = '#047857';
    border = '#a7f3d0';
  } else if (method === 'Khách trả hàng') {
    bg = '#f0fdf4';
    color = '#15803d';
    border = '#bbf7d0';
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2.5px 8px',
        borderRadius: 4,
        fontSize: 10.5,
        fontWeight: 700,
        background: bg,
        color: color,
        border: `1px solid ${border}`
      }}
    >
      {method}
    </span>
  );
};

const ProductTable = ({
  dishes = [],
  selectedBranchId,
  searchText,
  setSearchText,
  subTab = 'nguyenlieu',
  setSubTab,
  statusFilter = 'ALL',
  setStatusFilter
}) => {
  const navigate = useNavigate();
  const [bInventories, setBInventories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Row Expansion State: expandedId is the itemId currently expanded
  const [expandedId, setExpandedId] = useState(null);
  // Sub-Tab State per Item: { [itemId]: 'info' | 'ledger' | 'unit' | 'recipe' | 'batches' }
  const [activeTabMap, setActiveTabMap] = useState({});

  // Lazy Loaded Ledger State: ONLY fetched when user clicks 'Thẻ kho' tab!
  // { [itemId]: { loading, items: [], page: 1, totalPages: 1, totalCount: 0 } }
  const [ledgerDataMap, setLedgerDataMap] = useState({});

  // Lazy Loaded Batches State: ONLY fetched when user clicks 'Lô hàng & HSD' tab!
  // { [itemId]: { loading, items: [] } }
  const [batchDataMap, setBatchDataMap] = useState({});

  // Traceability Drawer State
  const [traceDrawerOpen, setTraceDrawerOpen] = useState(false);
  const [selectedTraceBatchId, setSelectedTraceBatchId] = useState(null);

  // Chi nhánh Stock Alert Settings Modal
  const [branchAlertModalOpen, setBranchAlertModalOpen] = useState(false);
  const [branchStockSettings, setBranchStockSettings] = useState({ criticalThreshold: 20, warningThreshold: 40 });
  const [savingBranchSettings, setSavingBranchSettings] = useState(false);
  const [branchSettingError, setBranchSettingError] = useState('');

  const fetchBranchStockAlertSettings = async () => {
    if (!selectedBranchId) return;
    try {
      const res = await getStockAlertSettings(selectedBranchId);
      if (res) {
        setBranchStockSettings({
          criticalThreshold: res.criticalThreshold || 20,
          warningThreshold: res.warningThreshold || 40
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình cảnh báo tồn kho chi nhánh:', err);
    }
  };

  useEffect(() => {
    fetchBranchStockAlertSettings();
  }, [selectedBranchId]);

  const handleSaveBranchStockSettings = async () => {
    setBranchSettingError('');
    const crit = Number(branchStockSettings.criticalThreshold);
    const warn = Number(branchStockSettings.warningThreshold);

    if (isNaN(crit) || crit <= 0) {
      setBranchSettingError('Số lượng cảnh báo cấp bách phải lớn hơn 0.');
      return;
    }
    if (isNaN(warn) || warn <= 0) {
      setBranchSettingError('Số lượng cảnh báo phải lớn hơn 0.');
      return;
    }
    if (warn < crit) {
      setBranchSettingError('Số lượng cảnh báo phải lớn hơn hoặc bằng số lượng cấp bách.');
      return;
    }

    setSavingBranchSettings(true);
    try {
      await updateStockAlertSettings({
        branchId: selectedBranchId,
        criticalThreshold: crit,
        warningThreshold: warn
      });
      showProductToast('Lưu thiết lập thông báo thành công!', 'success');
      setBranchAlertModalOpen(false);
      fetchInventoryList();
    } catch (err) {
      console.error('Lỗi khi lưu thiết lập cảnh báo tồn kho:', err);
      setBranchSettingError(err.response?.data?.message || 'Không thể lưu thiết lập thông báo.');
    } finally {
      setSavingBranchSettings(false);
    }
  };

  // Item Stock Alert Settings Modal
  const [itemAlertModalOpen, setItemAlertModalOpen] = useState(false);
  const [selectedAlertItem, setSelectedAlertItem] = useState(null);
  const [itemAlertLoading, setItemAlertLoading] = useState(false);
  const [itemAlertForm, setItemAlertForm] = useState({
    useCustom: false,
    customCriticalThreshold: '',
    customWarningThreshold: ''
  });
  const [savingItemAlert, setSavingItemAlert] = useState(false);
  const [itemAlertError, setItemAlertError] = useState('');

  const handleOpenItemAlertSettings = async (item) => {
    const binvId = item.bInventoryId || item.id;
    if (!binvId) return;
    setItemAlertError('');
    setItemAlertModalOpen(true);
    setItemAlertLoading(true);
    try {
      const res = await getItemStockAlertSettings(binvId);
      setSelectedAlertItem(res);
      const hasCustom = res.customCriticalThreshold !== null && res.customCriticalThreshold !== undefined;
      setItemAlertForm({
        useCustom: hasCustom,
        customCriticalThreshold: hasCustom ? res.customCriticalThreshold : (res.branchCriticalThreshold || branchStockSettings.criticalThreshold || 20),
        customWarningThreshold: (hasCustom && res.customWarningThreshold !== null && res.customWarningThreshold !== undefined)
          ? res.customWarningThreshold
          : (res.branchWarningThreshold || branchStockSettings.warningThreshold || 40),
        isAlertEnabled: res.isAlertEnabled !== false
      });
    } catch (err) {
      console.error('Lỗi khi tải cấu hình cảnh báo mặt hàng:', err);
      showProductToast('Không thể tải cấu hình cảnh báo của mặt hàng.', 'error');
      setItemAlertModalOpen(false);
    } finally {
      setItemAlertLoading(false);
    }
  };

  const handleSaveItemAlertSettings = async () => {
    if (!selectedAlertItem?.bInventoryId) return;
    setItemAlertError('');

    let payload = {
      customCriticalThreshold: null,
      customWarningThreshold: null,
      isAlertEnabled: itemAlertForm.isAlertEnabled
    };

    if (itemAlertForm.useCustom) {
      const crit = Number(itemAlertForm.customCriticalThreshold);
      const warn = Number(itemAlertForm.customWarningThreshold);

      if (isNaN(crit) || crit <= 0) {
        setItemAlertError('Số lượng cảnh báo cấp bách tùy chỉnh phải lớn hơn 0.');
        return;
      }
      if (isNaN(warn) || warn <= 0) {
        setItemAlertError('Số lượng cảnh báo tùy chỉnh phải lớn hơn 0.');
        return;
      }
      if (warn < crit) {
        setItemAlertError('Số lượng cảnh báo tùy chỉnh phải lớn hơn hoặc bằng số lượng cấp bách.');
        return;
      }

      payload = {
        customCriticalThreshold: crit,
        customWarningThreshold: warn,
        isAlertEnabled: itemAlertForm.isAlertEnabled
      };
    }

    setSavingItemAlert(true);
    try {
      await updateItemStockAlertSettings(selectedAlertItem.bInventoryId, payload);
      showProductToast('Lưu thiết lập cảnh báo cho mặt hàng thành công!', 'success');
      setItemAlertModalOpen(false);
      fetchInventoryList();
    } catch (err) {
      console.error('Lỗi khi lưu thiết lập cảnh báo mặt hàng:', err);
      setItemAlertError(err.response?.data?.message || 'Không thể lưu thiết lập cảnh báo.');
    } finally {
      setSavingItemAlert(false);
    }
  };

  // Fetch BInventories from API when selectedBranchId or subTab changes
  const fetchInventoryList = async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      // mode = 4 for 'monan' (only Processed), mode = 2 for 'nguyenlieu' (all non-Processed)
      const modeParam = subTab === 'monan' ? 4 : 2;
      let data = await getBInventories(selectedBranchId, '', '', modeParam);

      // Nếu có tìm kiếm từ URL hoặc tham số sản phẩm mà không tìm thấy trong subTab hiện tại, kiểm tra toàn bộ kho
      const searchParam = searchParams.get('search') || searchText;
      const prodIdParam = searchParams.get('productId');
      const invIdParam = searchParams.get('inventoryId');
      if (searchParam || prodIdParam || invIdParam) {
        const lowerSearch = (searchParam || '').toLowerCase().trim();
        const found = (data || []).some((i) => {
          if (invIdParam && (i.id === Number(invIdParam) || i.bInventoryId === Number(invIdParam))) return true;
          if (prodIdParam && (i.productId === Number(prodIdParam) || i.product?.id === Number(prodIdParam))) return true;
          if (lowerSearch) {
            const pName = String(i.name || i.productName || i.product?.name || '').toLowerCase();
            const pCode = String(i.code || i.productCode || i.product?.code || '').toLowerCase();
            return pName === lowerSearch || pCode === lowerSearch || pCode.includes(lowerSearch) || pName.includes(lowerSearch);
          }
          return false;
        });

        if (!found) {
          try {
            const allData = await getBInventories(selectedBranchId, '', '', 0);
            const matchedItem = (allData || []).find((i) => {
              if (invIdParam && (i.id === Number(invIdParam) || i.bInventoryId === Number(invIdParam))) return true;
              if (prodIdParam && (i.productId === Number(prodIdParam) || i.product?.id === Number(prodIdParam))) return true;
              if (lowerSearch) {
                const pName = String(i.name || i.productName || i.product?.name || '').toLowerCase();
                const pCode = String(i.code || i.productCode || i.product?.code || '').toLowerCase();
                return pName === lowerSearch || pCode === lowerSearch || pCode.includes(lowerSearch) || pName.includes(lowerSearch);
              }
              return false;
            });

            if (matchedItem) {
              const isProcessed = checkIsProcessed(matchedItem);
              const neededSubTab = isProcessed ? 'monan' : 'nguyenlieu';
              if (subTab !== neededSubTab && setSubTab) {
                setSubTab(neededSubTab);
                return;
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (Array.isArray(data)) {
        setBInventories(data);
      } else {
        setBInventories([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách BInventory từ API:', err);
      setBInventories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryList();
  }, [selectedBranchId, subTab]);

  // Combine fetched BInventories with dishes fallback if needed
  const rawList = useMemo(() => {
    if (bInventories.length > 0) return bInventories;
    return dishes.map((d, idx) => ({
      id: d.id || idx + 1,
      bInventoryId: d.id || idx + 1,
      code: d.code || `AD${String(idx + 1).padStart(10, '0')}`,
      name: d.name || d.title || `Sản phẩm ${idx + 1}`,
      unitName: d.unit || 'Đĩa',
      minStorage: d.minStorage || 0,
      maxStorage: d.maxStorage || 1000,
      stockQuantity: d.stock !== undefined ? d.stock : (idx === 0 ? -86.12 : 10.99 + idx * 2),
      unitPrice: d.price || (idx === 0 ? 55556005 : 90643.53),
      sellPrice: d.price || 30000,
      type: idx % 2 === 0 ? 'Ingredient' : 'Processed',
      unitConversions: idx % 3 === 0 ? [{ unitName: 'Thùng', conversionPoint: 24 }] : [],
      recipeDetailes: idx % 2 === 1 ? [{ ingredientName: 'Thịt bò', quantity: 200, unit: 'g' }, { ingredientName: 'Bánh phở', quantity: 300, unit: 'g' }] : []
    }));
  }, [bInventories, dishes]);

  // Filter list based strictly on Product Type (subTab), search text & status filter
  const filteredData = useMemo(() => {
    return rawList.filter((item) => {
      const isProcessed = checkIsProcessed(item);
      if (subTab === 'nguyenlieu' && isProcessed) return false;
      if ((subTab === 'monan' || subTab === 'mathang') && !isProcessed) return false;

      // Status filter
      const qty = Number(item.stockQuantity ?? item.quantity ?? 0);
      if (statusFilter === 'IN_STOCK' && qty <= 0) return false;
      if (statusFilter === 'OUT_OF_STOCK' && qty > 0) return false;

      // Search filter
      if (searchText) {
        const lower = searchText.toLowerCase().trim();
        const pName = String(item.name || item.productName || item.product?.name || '').toLowerCase();
        const pCode = String(item.code || item.productCode || item.product?.code || '').toLowerCase();
        const pUnit = String(item.unitName || item.unit || '').toLowerCase();
        const nameMatch = pName.includes(lower);
        const codeMatch = pCode.includes(lower);
        const unitMatch = pUnit.includes(lower);
        if (!nameMatch && !codeMatch && !unitMatch) return false;
      }
      return true;
    });
  }, [rawList, subTab, statusFilter, searchText]);

  // Summary Totals
  const totalStockQty = useMemo(() => {
    return filteredData.reduce((acc, item) => acc + Number(item.stockQuantity ?? item.quantity ?? 0), 0);
  }, [filteredData]);

  const [searchParams] = useSearchParams();

  // Tự động mở chi tiết nguyên liệu khi điều hướng từ thông báo cảnh báo kho hoặc tìm kiếm
  useEffect(() => {
    const listToSearch = (rawList && rawList.length > 0) ? rawList : filteredData;
    if (!listToSearch || listToSearch.length === 0) return;

    const invIdParam = searchParams.get('inventoryId') ? Number(searchParams.get('inventoryId')) : null;
    const prodIdParam = searchParams.get('productId') ? Number(searchParams.get('productId')) : null;
    const batchParam = searchParams.get('batchId') ? Number(searchParams.get('batchId')) : null;
    const activeTabParam = searchParams.get('activeTab');

    let matched = null;
    if (invIdParam) {
      matched = listToSearch.find((i) => i.id === invIdParam || i.bInventoryId === invIdParam);
    }
    if (!matched && prodIdParam) {
      matched = listToSearch.find((i) => i.productId === prodIdParam || i.product?.id === prodIdParam);
    }
    if (!matched && searchText) {
      const lower = searchText.toLowerCase().trim();
      matched = listToSearch.find((i) => {
        const pName = String(i.name || i.productName || i.product?.name || '').toLowerCase();
        const pCode = String(i.code || i.productCode || i.product?.code || '').toLowerCase();
        return pName === lower || pCode === lower || pCode.includes(lower) || pName.includes(lower);
      });
    }

    if (matched) {
      // Tự chuyển subTab nếu cần
      const isProcessed = checkIsProcessed(matched);
      const neededSubTab = isProcessed ? 'monan' : 'nguyenlieu';
      if (subTab !== neededSubTab && setSubTab) {
        setSubTab(neededSubTab);
      }

      setExpandedId(matched.id);
      const tabToActivate = activeTabParam || (batchParam ? 'batches' : 'info');
      setActiveTabMap((prev) => ({ ...prev, [matched.id]: tabToActivate }));

      // Tự chuyển sang đúng trang chứa nguyên liệu
      const matchedIdx = filteredData.findIndex((i) => i.id === matched.id);
      if (matchedIdx >= 0) {
        const targetPage = Math.floor(matchedIdx / pageSize) + 1;
        setCurrentPage(targetPage);
      }
    }
  }, [filteredData, rawList, searchParams, searchText, subTab, setSubTab]);

  const totalStockValue = useMemo(() => {
    return filteredData.reduce((acc, item) => {
      const qty = Number(item.stockQuantity ?? item.quantity ?? 0);
      const price = Number(item.purchasePrice || item.avg || item.unitPrice || 0);
      return acc + qty * price;
    }, 0);
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const currentData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Checkbox Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentData.map((item) => item.bInventoryId || item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // LAZY LOAD LEDGER (ONLY WHEN USER CLICKS 'THẺ KHO' TAB - PAGE SIZE = 20)
  const fetchLedgerForProduct = async (itemId, page = 1) => {
    setLedgerDataMap((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: true }
    }));

    try {
      const res = await getBInventoryLedger(itemId, page, 20);
      const rawLedgerItems = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
      // Sort by latest date descending
      const sortedItems = [...rawLedgerItems].sort((a, b) => {
        const tA = new Date(a.businessDate || a.createdAt || a.createdDate || a.time || a.date || 0).getTime();
        const tB = new Date(b.businessDate || b.createdAt || b.createdDate || b.time || b.date || 0).getTime();
        return tB - tA;
      });

      setLedgerDataMap((prev) => ({
        ...prev,
        [itemId]: {
          loading: false,
          items: sortedItems,
          page: res.page || page,
          totalPages: res.totalPages || Math.ceil((res.totalCount || sortedItems.length) / 20) || 1,
          totalCount: res.totalCount || sortedItems.length
        }
      }));
    } catch (err) {
      console.error(`Lỗi khi tải thẻ kho cho id=${itemId}:`, err);
      setLedgerDataMap((prev) => ({
        ...prev,
        [itemId]: { loading: false, items: [], page: 1, totalPages: 1, totalCount: 0 }
      }));
    }
  };

  // LAZY LOAD BATCHES (ONLY WHEN USER CLICKS 'LÔ HÀNG & HSD' TAB)
  const fetchBatchesForProduct = async (itemId) => {
    setBatchDataMap((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: true }
    }));

    try {
      const res = await getBatchesByBInventoryId(itemId);
      const items = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
      setBatchDataMap((prev) => ({
        ...prev,
        [itemId]: { loading: false, items }
      }));
    } catch (err) {
      console.error(`Lỗi khi tải danh sách Lô cho id=${itemId}:`, err);
      setBatchDataMap((prev) => ({
        ...prev,
        [itemId]: { loading: false, items: [] }
      }));
    }
  };

  // Toggle Expand Row (Does NOT load ledger by default)
  const toggleExpand = (itemId) => {
    if (expandedId === itemId) {
      setExpandedId(null);
    } else {
      setExpandedId(itemId);
      if (!activeTabMap[itemId]) {
        setActiveTabMap((prev) => ({ ...prev, [itemId]: 'info' }));
      }
    }
  };

  // Handle Sub-Tab Click (ONLY fetches ledger/batches if user explicitly clicks tab)
  const handleTabSwitch = (itemId, tabKey) => {
    setActiveTabMap((prev) => ({ ...prev, [itemId]: tabKey }));
    if (tabKey === 'ledger' && !ledgerDataMap[itemId]) {
      fetchLedgerForProduct(itemId, 1);
    } else if (tabKey === 'batches' && !batchDataMap[itemId]) {
      fetchBatchesForProduct(itemId);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff', height: '100%', overflow: 'hidden' }}>

      {/* ─── TOP ACTION TOOLBAR ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* SEARCH INPUT */}
          {setSearchText && (
            <div style={{ position: 'relative', width: 280 }}>
              <SearchOutlined style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }} />
              <input
                type="text"
                placeholder="Theo mã, tên nguyên liệu, mặt hàng..."
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
                  transition: 'border 0.2s ease'
                }}
              />
            </div>
          )}

          {/* SUBTAB PILLS (NGUYÊN LIỆU / MẶT HÀNG) */}
          {setSubTab && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
              {[
                { key: 'nguyenlieu', label: 'Nguyên liệu' },
                { key: 'monan', label: 'Món ăn' }
              ].map((st) => {
                const active = subTab === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setSubTab(st.key)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: active ? 700 : 500,
                      color: active ? '#ea580c' : '#475569',
                      background: active ? '#ffffff' : 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* STATUS FILTER PILLS (TẤT CẢ / CÒN HÀNG / HẾT HÀNG) */}
          {setStatusFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'IN_STOCK', label: 'Còn hàng' },
                { key: 'OUT_OF_STOCK', label: 'Hết hàng' }
              ].map((st) => {
                const active = statusFilter === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setStatusFilter(st.key)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: active ? 700 : 500,
                      color: active ? '#ea580c' : '#475569',
                      background: active ? '#ffffff' : 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={fetchInventoryList}
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
              setBranchSettingError('');
              fetchBranchStockAlertSettings();
              setBranchAlertModalOpen(true);
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

      {/* ─── DATA TABLE AREA ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, textWrap: 'nowrap' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#334155', fontWeight: 700, fontSize: 11, textAlign: 'left', background: '#f8fafc' }}>
              <th style={{ padding: '10px 8px', width: 36 }}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={currentData.length > 0 && currentData.every((item) => selectedIds.includes(item.bInventoryId || item.id))}
                />
              </th>
              <th style={{ padding: '10px 8px', width: 140 }}>{subTab === 'nguyenlieu' ? 'Mã nguyên liệu' : 'Mã món ăn'}</th>
              <th style={{ padding: '10px 8px' }}>{subTab === 'nguyenlieu' ? 'Tên nguyên liệu' : 'Tên món ăn'}</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Loại sản phẩm</th>
              <th style={{ padding: '10px 8px' }}>Đơn vị</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>SL tối thiểu</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>SL tồn cuối</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Đơn giá</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Giá trị tồn cuối</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Trạng thái</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {/* SUMMARY ROW (TỔNG CỘNG) */}
            <tr style={{ background: '#f8fafc', fontWeight: 700, borderBottom: '1px solid #e2e8f0', fontSize: 11.5 }}>
              <td colSpan={6} style={{ padding: '10px 8px', color: '#0f172a', textTransform: 'uppercase' }}>
                TỔNG CỘNG
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', color: '#0f172a' }}>
                {totalStockQty.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td style={{ padding: '10px 8px' }}></td>
              <td style={{ padding: '10px 8px', textAlign: 'right', color: '#0f172a' }}>
                {totalStockValue.toLocaleString('vi-VN')}đ
              </td>
              <td style={{ padding: '10px 8px' }}></td>
              <td style={{ padding: '10px 8px' }}></td>
            </tr>

            {loading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                  Đang tải danh sách tồn kho từ API...
                </td>
              </tr>
            ) : currentData.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                  Không tìm thấy dữ liệu nguyên liệu / mặt hàng nào
                </td>
              </tr>
            ) : (
              currentData.map((item) => {
                const itemId = item.bInventoryId || item.id;
                const isSelected = selectedIds.includes(itemId);
                const isExpanded = expandedId === itemId;
                const activeTab = activeTabMap[itemId] || 'info';

                const stockQty = Number(item.stockQuantity ?? item.quantity ?? 0);
                const unitPrice = Number(item.purchasePrice || item.avg || item.unitPrice || 0);
                const totalValue = stockQty * unitPrice;
                const isInStock = stockQty > 0;

                // Extract Unit Conversions & Recipe Arrays from backend object
                const unitConversions = item.unitConversions || item.product?.unitConversions || [];
                const recipeList = item.recipeDetailes || item.recipe || item.ingredients || item.recipeComponents || item.components || item.product?.recipe || [];

                const hasUnitConversions = Array.isArray(unitConversions) && unitConversions.length > 0;
                const hasRecipe = Array.isArray(recipeList) && recipeList.length > 0;

                return (
                  <React.Fragment key={itemId}>
                    {/* MAIN TABLE ROW */}
                    <tr
                      onClick={() => toggleExpand(itemId)}
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                        background: isExpanded ? '#eff6ff' : (isSelected ? '#f0f9ff' : 'transparent'),
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '10px 8px' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(itemId)}
                        />
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#2563eb' }}>
                        {renderTruncatedText(item.code || item.productCode || item.product?.code || '---', 20)}
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1e293b' }}>
                        {renderTruncatedText(item.name || item.productName || item.product?.name || '---', 35)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {getProductTypeBadge(item)}
                      </td>
                      <td style={{ padding: '10px 8px', color: '#334155' }}>
                        {item.unitName || item.unit || 'Đĩa'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#334155' }}>
                        {item.minStorage ?? 0}
                      </td>
                      <td
                        style={{
                          padding: '10px 8px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: stockQty < 0 ? '#ea580c' : '#0f172a'
                        }}
                      >
                        {stockQty.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#334155' }}>
                        {unitPrice ? unitPrice.toLocaleString('vi-VN') : '0'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#334155' }}>
                        {totalValue.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}đ
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {isInStock ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 10px',
                              borderRadius: 10,
                              fontSize: 10.5,
                              fontWeight: 600,
                              background: '#38bdf8',
                              color: '#ffffff'
                            }}
                          >
                            Còn hàng
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 10px',
                              borderRadius: 10,
                              fontSize: 10.5,
                              fontWeight: 600,
                              background: '#fecdd3',
                              color: '#e11d48'
                            }}
                          >
                            Hết hàng
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/product-detail/${itemId}`)}
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

                    {/* ─── EXPANDED DETAILED DRAWER CONTAINER ─────────────────── */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={11} style={{ padding: '4px 12px 14px 12px', borderBottom: '2px solid #cbd5e1' }}>
                          <div
                            style={{
                              background: '#ffffff',
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                              overflow: 'hidden',
                              fontSize: 11.5
                            }}
                          >
                            {/* SUB-TABS NAVIGATION HEADER */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 12px', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex' }}>
                                {/* TAB 1: THÔNG TIN (MANDATORY) */}
                                <button
                                  type="button"
                                  onClick={() => handleTabSwitch(itemId, 'info')}
                                  style={{
                                    padding: '9px 14px',
                                    border: 'none',
                                    background: 'transparent',
                                    fontWeight: activeTab === 'info' ? 700 : 500,
                                    color: activeTab === 'info' ? '#2563eb' : '#64748b',
                                    borderBottom: activeTab === 'info' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5
                                  }}
                                >
                                  <InfoCircleOutlined /> Thông tin
                                </button>

                                {/* TAB 2: THẺ KHO (MANDATORY, LAZY LOADED ON CLICK) */}
                                <button
                                  type="button"
                                  onClick={() => handleTabSwitch(itemId, 'ledger')}
                                  style={{
                                    padding: '9px 14px',
                                    border: 'none',
                                    background: 'transparent',
                                    fontWeight: activeTab === 'ledger' ? 700 : 500,
                                    color: activeTab === 'ledger' ? '#2563eb' : '#64748b',
                                    borderBottom: activeTab === 'ledger' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5
                                  }}
                                >
                                  <HistoryOutlined /> Thẻ kho
                                </button>

                                {/* TAB 3: ĐƠN VỊ QUY ĐỔI (CONDITIONAL) */}
                                {hasUnitConversions && (
                                  <button
                                    type="button"
                                    onClick={() => handleTabSwitch(itemId, 'unit')}
                                    style={{
                                      padding: '9px 14px',
                                      border: 'none',
                                      background: 'transparent',
                                      fontWeight: activeTab === 'unit' ? 700 : 500,
                                      color: activeTab === 'unit' ? '#2563eb' : '#64748b',
                                      borderBottom: activeTab === 'unit' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                                      cursor: 'pointer',
                                      fontSize: 12,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 5
                                    }}
                                  >
                                    <SwapOutlined /> Đơn vị quy đổi
                                  </button>
                                )}

                                {/* TAB 4: ĐỊNH LƯỢNG / THÀNH PHẦN (CONDITIONAL) */}
                                {hasRecipe && (
                                  <button
                                    type="button"
                                    onClick={() => handleTabSwitch(itemId, 'recipe')}
                                    style={{
                                      padding: '9px 14px',
                                      border: 'none',
                                      background: 'transparent',
                                      fontWeight: activeTab === 'recipe' ? 700 : 500,
                                      color: activeTab === 'recipe' ? '#2563eb' : '#64748b',
                                      borderBottom: activeTab === 'recipe' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                                      cursor: 'pointer',
                                      fontSize: 12,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 5
                                    }}
                                  >
                                    <ProfileOutlined /> Định lượng món
                                  </button>
                                )}

                                {/* TAB 5: DANH SÁCH LÔ HÀNG & HSD (MANDATORY) */}
                                <button
                                  type="button"
                                  onClick={() => handleTabSwitch(itemId, 'batches')}
                                  style={{
                                    padding: '9px 14px',
                                    border: 'none',
                                    background: 'transparent',
                                    fontWeight: activeTab === 'batches' ? 700 : 500,
                                    color: activeTab === 'batches' ? '#2563eb' : '#64748b',
                                    borderBottom: activeTab === 'batches' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5
                                  }}
                                >
                                  <AppstoreOutlined /> Lô hàng & HSD
                                </button>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenItemAlertSettings(item)}
                                  style={{
                                    padding: '4px 12px',
                                    fontSize: 11.5,
                                    borderRadius: 5,
                                    border: (item.customCriticalThreshold !== null && item.customCriticalThreshold !== undefined)
                                      ? '1px solid #bfdbfe'
                                      : '1px solid #cbd5e1',
                                    background: (item.customCriticalThreshold !== null && item.customCriticalThreshold !== undefined)
                                      ? '#eff6ff'
                                      : '#ffffff',
                                    color: (item.customCriticalThreshold !== null && item.customCriticalThreshold !== undefined)
                                      ? '#2563eb'
                                      : '#0f172a',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                  }}
                                  title="Cài đặt ngưỡng cảnh báo tồn kho riêng cho mặt hàng này"
                                >
                                  <BellOutlined style={{ fontSize: 12, color: (item.customCriticalThreshold !== null && item.customCriticalThreshold !== undefined) ? '#2563eb' : '#ea580c' }} />
                                  <span>Cài đặt cảnh báo</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => navigate(`/product-detail/${itemId}`)}
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
                                    gap: 6,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                  }}
                                >
                                  <EyeOutlined style={{ fontSize: 12, color: '#e8442a' }} /> Chi tiết mặt hàng
                                </button>
                              </div>
                            </div>

                            {/* TAB 1 CONTENT: THÔNG TIN */}
                            {activeTab === 'info' && (
                              <div style={{ padding: 16, display: 'flex', gap: 20 }}>
                                <div
                                  style={{
                                    width: 90,
                                    height: 90,
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                    overflow: 'hidden',
                                    background: '#f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}
                                >
                                  {(() => {
                                    const imgSrc = item.imageUrl || item.imageLink || item.avatar || item.avatarImage || item.product?.imageUrl || item.product?.imageLink || (typeof item.image === 'string' ? item.image : item.image?.imageLink);
                                    return imgSrc ? (
                                      <img
                                        src={imgSrc}
                                        alt={item.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <span style={{ fontSize: 32 }}>📦</span>
                                    );
                                  })()}
                                </div>

                                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12 }}>
                                  {/* ROW 1 */}
                                  <div>
                                    <span style={{ color: '#64748b' }}>Mã sản phẩm:</span>{' '}
                                    <strong style={{ color: '#2563eb' }}>{item.code || item.productCode || item.product?.code || '---'}</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: '#64748b' }}>Tồn kho hiện tại:</span>{' '}
                                    <strong style={{ color: stockQty < 0 ? '#ea580c' : '#0f172a' }}>
                                      {stockQty.toLocaleString('vi-VN')} {item.unitName || item.unit}
                                    </strong>
                                  </div>
                                  <div>
                                    <span style={{ color: '#64748b' }}>Nhóm hàng:</span>{' '}
                                    <strong>{item.groupName || item.categoryName || 'Mặc định'}</strong>
                                  </div>

                                  {/* ROW 2 */}
                                  <div>
                                    <span style={{ color: '#64748b' }}>Tên sản phẩm:</span>{' '}
                                    <strong style={{ color: '#0f172a' }}>{item.name || item.productName || item.product?.name || '---'}</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: '#64748b' }}>SL tối thiểu:</span>{' '}
                                    <strong>{item.minStorage ?? 0} {item.unitName || item.unit || ''}</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: '#64748b' }}>Loại sản phẩm:</span>{' '}
                                    {getProductTypeBadge(item)}
                                  </div>

                                  {/* ROW 3 */}
                                  <div>
                                    <span style={{ color: '#64748b' }}>Giá bán:</span>{' '}
                                    <strong style={{ color: '#059669' }}>
                                      {(item.sellPrice || item.price || 0).toLocaleString('vi-VN')} đ
                                    </strong>
                                  </div>
                                  <div>
                                    <span style={{ color: '#64748b' }}>SL tối đa (Giới hạn):</span>{' '}
                                    <strong>{item.maxStorage ?? 1000} {item.unitName || item.unit || ''}</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: '#64748b' }}>Giá trung bình / Giá vốn:</span>{' '}
                                    <strong>{unitPrice.toLocaleString('vi-VN')} đ</strong>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* TAB 2 CONTENT: THẺ KHO (LAZY LOADED ON CLICK - PAGE SIZE = 20) */}
                            {activeTab === 'ledger' && (
                              <div style={{ padding: 12 }}>
                                {(() => {
                                  const ledgerState = ledgerDataMap[itemId] || { loading: false, items: [], page: 1, totalPages: 1, totalCount: 0 };
                                  const lItems = ledgerState.items || [];
                                  const lPage = ledgerState.page || 1;
                                  const lTotalPages = ledgerState.totalPages || 1;

                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                                          <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                                              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Mã chứng từ</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Nghiệp vụ</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Thời gian</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Giá vốn BQ</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thay đổi tồn</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tồn tích lũy</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {ledgerState.loading ? (
                                              <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: 16, color: '#64748b' }}>
                                                  Đang tải lịch sử thẻ kho (trang {lPage}, 20 mục/trang)...
                                                </td>
                                              </tr>
                                            ) : lItems.length === 0 ? (
                                              <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>
                                                  Chưa có lịch sử giao dịch thẻ kho cho sản phẩm này
                                                </td>
                                              </tr>
                                            ) : (
                                              lItems.map((ldg, ldgIdx) => {
                                                const docCode = ldg.documentCode || ldg.docCode || ldg.code || `CT${ldgIdx + 1}`;
                                                const method = ldg.methodName || ldg.method || ldg.note || ldg.type || 'Giao dịch kho';
                                                const timeStr = ldg.businessDate ? new Date(ldg.businessDate).toLocaleString('vi-VN') : (ldg.createdDate ? new Date(ldg.createdDate).toLocaleString('vi-VN') : (ldg.time ? new Date(ldg.time).toLocaleString('vi-VN') : '---'));
                                                const runAvgCost = Number(ldg.runningAverageCost ?? ldg.unitCost ?? ldg.unitPrice ?? 0);
                                                const qDelta = Number(ldg.quantityDelta ?? ldg.quantity ?? 0);
                                                const runQty = Number(ldg.runningQuantity ?? ldg.endingStock ?? 0);

                                                return (
                                                  <tr key={ldg.id || ldgIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                                                      <button
                                                        type="button"
                                                        style={{
                                                          background: 'none',
                                                          border: 'none',
                                                          padding: 0,
                                                          color: '#2563eb',
                                                          fontWeight: 700,
                                                          cursor: 'pointer',
                                                          textDecoration: 'underline'
                                                        }}
                                                        onClick={() => {
                                                          const tab = mapMethodToTab(ldg.methodName || method, docCode);
                                                          if (tab) {
                                                            window.location.href = `/inventory-management?tab=${tab}&search=${docCode}`;
                                                          }
                                                        }}
                                                      >
                                                        {renderTruncatedText(docCode, 18)}
                                                      </button>
                                                    </td>
                                                    <td style={{ padding: '8px 10px' }}>
                                                      {renderMethodBadge(ldg)}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: '#475569' }}>
                                                      {timeStr}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>
                                                      {runAvgCost.toLocaleString('vi-VN')} đ
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: qDelta < 0 ? '#ef4444' : (qDelta > 0 ? '#059669' : '#475569') }}>
                                                      {qDelta > 0 ? `+${qDelta.toLocaleString('vi-VN')}` : qDelta.toLocaleString('vi-VN')}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                      {runQty.toLocaleString('vi-VN')}
                                                    </td>
                                                  </tr>
                                                );
                                              })
                                            )}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* LEDGER PAGINATION FOOTER (PAGE SIZE = 20) */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b' }}>
                                        <div>Hiển thị 20 giao dịch / trang | Tổng: <strong>{ledgerState.totalCount}</strong> giao dịch thẻ kho</div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                          <button
                                            type="button"
                                            disabled={lPage === 1 || ledgerState.loading}
                                            onClick={() => fetchLedgerForProduct(itemId, lPage - 1)}
                                            style={{ padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#fff', cursor: lPage === 1 ? 'not-allowed' : 'pointer' }}
                                          >
                                            Trở lại
                                          </button>
                                          <span>Trang {lPage} / {lTotalPages}</span>
                                          <button
                                            type="button"
                                            disabled={lPage >= lTotalPages || ledgerState.loading}
                                            onClick={() => fetchLedgerForProduct(itemId, lPage + 1)}
                                            style={{ padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: 4, background: '#fff', cursor: lPage >= lTotalPages ? 'not-allowed' : 'pointer' }}
                                          >
                                            Tiếp
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {/* TAB 3 CONTENT: ĐƠN VỊ QUY ĐỔI (CONDITIONAL) */}
                            {activeTab === 'unit' && hasUnitConversions && (
                              <div style={{ padding: 12 }}>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                                    <thead>
                                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Tên đơn vị quy đổi</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Tỷ lệ quy đổi</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Lượng hàng quy đổi (làm tròn)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {unitConversions.map((uc, ucIdx) => {
                                        const point = Number(uc.conversionPoint || uc.ratio || 1);
                                        const convertedQty = Math.round(stockQty / (point || 1));
                                        return (
                                          <tr key={ucIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>
                                              {uc.unitName || uc.name}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>
                                              1 {uc.unitName || uc.name} = {point} {item.unitName || 'đơn vị chuẩn'}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                                              {convertedQty.toLocaleString('vi-VN')} {uc.unitName || uc.name}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* TAB 4 CONTENT: CÔNG THỨC NẤU (CONDITIONAL) */}
                            {activeTab === 'recipe' && hasRecipe && (
                              <div style={{ padding: 12 }}>
                                <div style={{ marginBottom: 6, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                  Thành phần nguyên liệu cho 1 đơn vị sản phẩm (tầng nông):
                                </div>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                                    <thead>
                                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Tên nguyên liệu thành phần</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Số lượng định mức</th>
                                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Đơn vị tính</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {recipeList.map((rec, recIdx) => (
                                        <tr key={recIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>
                                            {rec.ingredientName || rec.name || rec.code}
                                          </td>
                                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#e8442a' }}>
                                            {rec.quantity || rec.amount || 1}
                                          </td>
                                          <td style={{ padding: '8px 10px', color: '#475569' }}>
                                            {rec.unit || rec.unitName || 'g'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* TAB 5 CONTENT: DANH SÁCH LÔ HÀNG & HSD (MANDATORY) */}
                            {activeTab === 'batches' && (
                              <div style={{ padding: 12 }}>
                                {(() => {
                                  const batchState = batchDataMap[itemId] || { loading: false, items: [] };
                                  const batchList = batchState.items || [];

                                  if (batchState.loading) {
                                    return (
                                      <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                                        Đang nạp danh sách Lô hàng...
                                      </div>
                                    );
                                  }

                                  return (
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600 }}>
                                          Danh sách Lô hàng tồn kho của mặt hàng ({batchList.length} Lô):
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => fetchBatchesForProduct(itemId)}
                                          style={{
                                            padding: '3px 8px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: 4,
                                            background: '#ffffff',
                                            fontSize: 11,
                                            color: '#334155',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4
                                          }}
                                        >
                                          <ReloadOutlined style={{ fontSize: 10 }} /> Tải lại Lô
                                        </button>
                                      </div>

                                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                                          <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, textAlign: 'left' }}>
                                              <th style={{ padding: '8px 10px' }}>Mã Lô</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>SL ban đầu</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tồn hiện tại</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Giá vốn riêng Lô</th>
                                              <th style={{ padding: '8px 10px' }}>Ngày sản xuất</th>
                                              <th style={{ padding: '8px 10px' }}>Hạn sử dụng</th>
                                              <th style={{ padding: '8px 10px' }}>Ngày nhập</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Trạng thái Lô</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Hạn Dùng</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Thao tác</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {batchList.length === 0 ? (
                                              <tr>
                                                <td colSpan={10} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                                                  Mặt hàng này chưa có Lô hàng nào được ghi nhận.
                                                </td>
                                              </tr>
                                            ) : (
                                              batchList.map((b, bIdx) => {
                                                const qRem = Number(b.quantityRemaining || 0);
                                                const qOrig = Number(b.quantityOriginal || 0);
                                                const bCost = Number(b.unitCost || 0);

                                                return (
                                                  <tr key={b.id || bIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                                                      {b.batchCode ? (
                                                        <span
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/inventory-management?tab=BatchExpiry&search=${encodeURIComponent(b.batchCode)}`);
                                                          }}
                                                          style={{
                                                            color: '#2563eb',
                                                            cursor: 'pointer',
                                                            textDecoration: 'underline'
                                                          }}
                                                          title="Nhấp để tìm Lô trong tab Quản lý HSD / Lô"
                                                        >
                                                          {b.batchCode}
                                                        </span>
                                                      ) : (
                                                        <span style={{ color: '#94a3b8' }}>---</span>
                                                      )}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>
                                                      {qOrig.toLocaleString('vi-VN')} {item.unitName || 'đv'}
                                                    </td>
                                                    <td
                                                      style={{
                                                        padding: '8px 10px',
                                                        textAlign: 'right',
                                                        fontWeight: 700,
                                                        color: qRem > 0 ? '#059669' : '#dc2626'
                                                      }}
                                                    >
                                                      {qRem.toLocaleString('vi-VN')} {item.unitName || 'đv'}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#ea580c' }}>
                                                      {bCost.toLocaleString('vi-VN')} đ
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: '#475569' }}>
                                                      {b.manufactureDate ? dayjs(b.manufactureDate).format('DD/MM/YYYY') : '---'}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: '#334155', fontWeight: 600 }}>
                                                      {b.expiryDate ? dayjs(b.expiryDate).format('DD/MM/YYYY') : 'Không có'}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: '#475569' }}>
                                                      {b.receivedDate ? dayjs(b.receivedDate).format('DD/MM/YYYY') : '---'}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                      {renderBatchStatusBadge(b.status)}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                      {renderExpiryStatusBadge(b.expiryDate, b.daysUntilExpiry, b.quantityRemaining, b.status)}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
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
                                                          padding: '3px 8px',
                                                          fontSize: 10.5,
                                                          fontWeight: 600,
                                                          cursor: 'pointer',
                                                          display: 'inline-flex',
                                                          alignItems: 'center',
                                                          gap: 4
                                                        }}
                                                      >
                                                        <CompassOutlined /> Truy vết Lô
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
                                  );
                                })()}
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
          </tbody>
        </table>
      </div>

      {/* ─── FOOTER PAGINATION ─────────────────────────────────────────────── */}
      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filteredData.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
      />

      {/* ─── BATCH TRACEABILITY DRAWER ─────────────────────────────────────── */}
      <BatchTraceabilityDrawer
        open={traceDrawerOpen}
        batchId={selectedTraceBatchId}
        onClose={() => {
          setTraceDrawerOpen(false);
          setSelectedTraceBatchId(null);
        }}
      />

      {/* ─── MODAL CÀI ĐẶT THÔNG BÁO TỒN KHO CHI NHÁNH ───────────────────────── */}
      {branchAlertModalOpen && (
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
                onClick={() => setBranchAlertModalOpen(false)}
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
                  min="1"
                  step="any"
                  value={branchStockSettings.criticalThreshold}
                  onChange={(e) => setBranchStockSettings(prev => ({ ...prev, criticalThreshold: e.target.value }))}
                  style={{
                    width: 95,
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
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>đơn vị</span>
              </div>

              {/* LINE 2: Cảnh báo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#d97706', minWidth: 90 }}>
                  Cảnh báo:
                </label>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>dưới</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={branchStockSettings.warningThreshold}
                  onChange={(e) => setBranchStockSettings(prev => ({ ...prev, warningThreshold: e.target.value }))}
                  style={{
                    width: 95,
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
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>đơn vị</span>
              </div>

              {/* THÔNG BÁO LỖI NẾU CÓ */}
              {branchSettingError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                  {branchSettingError}
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
                onClick={() => setBranchAlertModalOpen(false)}
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
                onClick={handleSaveBranchStockSettings}
                disabled={savingBranchSettings}
                style={{
                  height: 34,
                  padding: '0 18px',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: 6,
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: savingBranchSettings ? 'not-allowed' : 'pointer',
                  opacity: savingBranchSettings ? 0.7 : 1
                }}
              >
                {savingBranchSettings ? 'Đang lưu...' : 'Lưu thiết lập'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CÀI ĐẶT CẢNH BÁO RIÊNG MẶT HÀNG ───────────────────────────── */}
      {itemAlertModalOpen && (
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
            {/* HEADER */}
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
                <BellOutlined style={{ fontSize: 18, color: '#f59e0b' }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  Cài đặt cảnh báo tồn kho mặt hàng
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18, color: itemAlertForm.isAlertEnabled ? '#10b981' : '#cbd5e1', display: 'flex', transition: 'color 0.2s' }}>
                    {itemAlertForm.isAlertEnabled ? <BellFilled /> : <BellOutlined />}
                  </span>
                  <Switch
                    checked={itemAlertForm.isAlertEnabled}
                    onChange={(checked) => {
                      setItemAlertForm(prev => ({ ...prev, isAlertEnabled: checked }));
                      showProductToast(checked ? 'Đã bật nhận thông báo cho mặt hàng này.' : 'Đã tắt nhận thông báo cho mặt hàng này.', 'success');
                    }}
                    checkedChildren="Bật"
                    unCheckedChildren="Tắt"
                    style={{ background: itemAlertForm.isAlertEnabled ? '#10b981' : undefined }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setItemAlertModalOpen(false)}
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
            </div>

            {/* BODY */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>
              {itemAlertLoading ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 13 }}>
                  Đang tải thông tin thiết lập...
                </div>
              ) : (
                <>
                  {/* SWITCH DÙNG THIẾT LẬP RIÊNG */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      background: itemAlertForm.useCustom ? '#eff6ff' : '#f8fafc',
                      borderRadius: 8,
                      border: `1px solid ${itemAlertForm.useCustom ? '#bfdbfe' : '#e2e8f0'}`
                    }}
                  >
                    <input
                      type="checkbox"
                      id="useCustomStockAlert"
                      checked={itemAlertForm.useCustom}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setItemAlertForm(prev => ({
                          ...prev,
                          useCustom: checked,
                          customCriticalThreshold: prev.customCriticalThreshold || selectedAlertItem?.branchCriticalThreshold || branchStockSettings.criticalThreshold || 20,
                          customWarningThreshold: prev.customWarningThreshold || selectedAlertItem?.branchWarningThreshold || branchStockSettings.warningThreshold || 40
                        }));
                      }}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2563eb' }}
                    />
                    <label htmlFor="useCustomStockAlert" style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                      Thiết lập ngưỡng cảnh báo riêng cho vật phẩm này
                    </label>
                  </div>

                  {/* VÙNG THIẾT LẬP NGƯỠNG */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                      padding: '16px 18px',
                      background: itemAlertForm.useCustom ? '#ffffff' : '#f8fafc',
                      borderRadius: 8,
                      border: `1px solid ${itemAlertForm.useCustom ? '#cbd5e1' : '#e2e8f0'}`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* LINE 1: Cấp Bách */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: itemAlertForm.useCustom ? '#dc2626' : '#94a3b8', minWidth: 90 }}>
                        Cấp Bách:
                      </label>
                      <span style={{ fontSize: 13, color: itemAlertForm.useCustom ? '#475569' : '#94a3b8', fontWeight: 500 }}>dưới</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        disabled={!itemAlertForm.useCustom}
                        value={itemAlertForm.useCustom ? itemAlertForm.customCriticalThreshold : (selectedAlertItem?.branchCriticalThreshold ?? branchStockSettings.criticalThreshold ?? 20)}
                        onChange={(e) => setItemAlertForm(prev => ({ ...prev, customCriticalThreshold: e.target.value }))}
                        style={{
                          width: 95,
                          height: 34,
                          padding: '4px 10px',
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 6,
                          border: `1px solid ${itemAlertForm.useCustom ? '#cbd5e1' : '#e2e8f0'}`,
                          background: itemAlertForm.useCustom ? '#ffffff' : '#f1f5f9',
                          color: itemAlertForm.useCustom ? '#1e293b' : '#64748b',
                          outline: 'none',
                          textAlign: 'center',
                          cursor: itemAlertForm.useCustom ? 'text' : 'not-allowed'
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: itemAlertForm.useCustom ? '#334155' : '#64748b' }}>
                        {selectedAlertItem?.unitName || 'đơn vị'}
                      </span>
                      {!itemAlertForm.useCustom && (
                        <span style={{ fontSize: 12.5, color: '#64748b', fontStyle: 'italic', fontWeight: 500 }}>
                          (sử dụng theo thiết lập chung)
                        </span>
                      )}
                    </div>

                    {/* LINE 2: Cảnh báo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: itemAlertForm.useCustom ? '#d97706' : '#94a3b8', minWidth: 90 }}>
                        Cảnh báo:
                      </label>
                      <span style={{ fontSize: 13, color: itemAlertForm.useCustom ? '#475569' : '#94a3b8', fontWeight: 500 }}>dưới</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        disabled={!itemAlertForm.useCustom}
                        value={itemAlertForm.useCustom ? itemAlertForm.customWarningThreshold : (selectedAlertItem?.branchWarningThreshold ?? branchStockSettings.warningThreshold ?? 40)}
                        onChange={(e) => setItemAlertForm(prev => ({ ...prev, customWarningThreshold: e.target.value }))}
                        style={{
                          width: 95,
                          height: 34,
                          padding: '4px 10px',
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 6,
                          border: `1px solid ${itemAlertForm.useCustom ? '#cbd5e1' : '#e2e8f0'}`,
                          background: itemAlertForm.useCustom ? '#ffffff' : '#f1f5f9',
                          color: itemAlertForm.useCustom ? '#1e293b' : '#64748b',
                          outline: 'none',
                          textAlign: 'center',
                          cursor: itemAlertForm.useCustom ? 'text' : 'not-allowed'
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: itemAlertForm.useCustom ? '#334155' : '#64748b' }}>
                        {selectedAlertItem?.unitName || 'đơn vị'}
                      </span>
                      {!itemAlertForm.useCustom && (
                        <span style={{ fontSize: 12.5, color: '#64748b', fontStyle: 'italic', fontWeight: 500 }}>
                          (sử dụng theo thiết lập chung)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* THÔNG BÁO LỖI NẾU CÓ */}
                  {itemAlertError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                      {itemAlertError}
                    </div>
                  )}
                </>
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
                onClick={() => setItemAlertModalOpen(false)}
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
                onClick={handleSaveItemAlertSettings}
                disabled={savingItemAlert || itemAlertLoading}
                style={{
                  height: 34,
                  padding: '0 18px',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: 6,
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: (savingItemAlert || itemAlertLoading) ? 'not-allowed' : 'pointer',
                  opacity: (savingItemAlert || itemAlertLoading) ? 0.7 : 1
                }}
              >
                {savingItemAlert ? 'Đang lưu...' : 'Lưu thiết lập'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTable;
