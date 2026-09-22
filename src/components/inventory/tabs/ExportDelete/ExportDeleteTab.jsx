import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import ExportDeleteTable from './ExportDeleteTable';
import DisposalDocumentModal from './DisposalDocumentModal';
import { getExportDeleteDocuments } from '../../../../api/documentApi';
import { getBatches, getBatchExpirySummary } from '../../../../api/batchApi';
import { getProductsByDate } from '../../../../api/binventoryApi';
import { removeVietnameseTones } from '../../../../utils/stringHelper';

const showToast = (text, type = 'success') => {
  const toast = document.createElement('div');
  toast.innerText = text;
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : type === 'info' ? '#3b82f6' : '#10b981'};
    color: #ffffff;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 700;
    z-index: 99999;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
};

const ExportDeleteTab = ({
  documents = [],
  loading: parentLoading,
  selectedBranchId,
  products = [],
  fetchDocuments: parentFetchDocuments,
  handleDeleteDocument
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get('search') || '';
  const [searchText, setSearchText] = useState(searchFromUrl);

  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (currentSearch !== searchText) {
      setSearchText(currentSearch);
    }
  }, [searchParams]);

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

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalExportOpen, setModalExportOpen] = useState(false);
  const [editDocumentId, setEditDocumentId] = useState(null);
  const [initialDisposalData, setInitialDisposalData] = useState(null);
  const [localDocs, setLocalDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingExpired, setLoadingExpired] = useState(false);
  const [expiredBatchesCount, setExpiredBatchesCount] = useState(0);

  const fetchExportDeleteDocs = useCallback(async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const res = await getExportDeleteDocuments(selectedBranchId);
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setLocalDocs(data);
    } catch (err) {
      console.error('Error fetching export delete documents:', err);
      setLocalDocs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  // Lấy tổng số Lô hết hạn để hiển thị badge trên nút Xuất hỏng
  const fetchExpiredCount = useCallback(async () => {
    if (!selectedBranchId) {
      setExpiredBatchesCount(0);
      return;
    }
    try {
      const summary = await getBatchExpirySummary(selectedBranchId);
      if (summary && summary.expiredBatches != null) {
        setExpiredBatchesCount(summary.expiredBatches);
      }
    } catch {
      setExpiredBatchesCount(0);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchExportDeleteDocs();
    fetchExpiredCount();
  }, [fetchExportDeleteDocs, fetchExpiredCount]);

  const rawDocs = localDocs.length > 0 ? localDocs : documents;

  const exportDeleteDocuments = useMemo(() => {
    return rawDocs.filter((doc) => {
      const rawType = doc.type;
      const typeStr = String(rawType ?? '').toLowerCase();
      const isMatch =
        rawType === 8 ||
        rawType === 7 ||
        rawType === 2 ||
        rawType === 5 ||
        typeStr.includes('export') ||
        typeStr.includes('delete');
      if (!isMatch) return false;
      if (statusFilter !== 'ALL' && doc.status !== statusFilter) return false;
      if (searchText) {
        const lower = searchText.toLowerCase().trim();
        const norm = removeVietnameseTones(searchText).trim();

        const codeRaw = (doc.code || '').toLowerCase();
        const creatorRaw = (doc.createdByName || doc.currentCreatedByName || doc.snapshotCreatedByName || doc.creatorName || doc.creator || '').toLowerCase();
        const creatorNorm = removeVietnameseTones(doc.createdByName || doc.currentCreatedByName || doc.snapshotCreatedByName || doc.creatorName || doc.creator || '');
        const noteRaw = (doc.note || '').toLowerCase();
        const noteNorm = removeVietnameseTones(doc.note || '');
        const branchRaw = (doc.branchName || doc.snapshotBranchName || '').toLowerCase();
        const branchNorm = removeVietnameseTones(doc.branchName || doc.snapshotBranchName || '');

        const matchCode = codeRaw.includes(lower);
        const matchCreator = creatorRaw.includes(lower) || creatorNorm.includes(norm);
        const matchNote = noteRaw.includes(lower) || noteNorm.includes(norm);
        const matchBranch = branchRaw.includes(lower) || branchNorm.includes(norm);

        if (!matchCode && !matchCreator && !matchNote && !matchBranch) return false;
      }
      return true;
    });
  }, [rawDocs, statusFilter, searchText]);

  const handleOpenEdit = (docId) => {
    setEditDocumentId(docId);
    setInitialDisposalData(null);
    setModalExportOpen(true);
  };

  const handleCloseModal = () => {
    setModalExportOpen(false);
    setEditDocumentId(null);
    setInitialDisposalData(null);
  };

  const handleRefresh = () => {
    fetchExportDeleteDocs();
    fetchExpiredCount();
    if (parentFetchDocuments) parentFetchDocuments(selectedBranchId);
  };

  // Tự động tìm và chọn các nguyên liệu đã hết hạn để xuất hủy
  const handleOpenExpiredDisposal = async () => {
    if (!selectedBranchId) {
      showToast('Vui lòng chọn chi nhánh trước khi thực hiện xuất hỏng.', 'warning');
      return;
    }

    setLoadingExpired(true);
    try {
      const [batchesRes, invRes] = await Promise.all([
        getBatches({
          branchId: selectedBranchId,
          expiryStatus: 'expired',
          pageSize: 1000
        }),
        getProductsByDate(selectedBranchId, new Date().toISOString(), '', null, 2)
      ]);

      const batches = Array.isArray(batchesRes?.items) ? batchesRes.items : [];
      // Lọc các Lô hết hạn còn số lượng tồn kho > 0 và chưa bị Depleted
      const expiredBatches = batches.filter(
        (b) => Number(b.quantityRemaining) > 0 && b.status !== 2 && b.status !== 'Depleted'
      );

      if (expiredBatches.length === 0) {
        showToast('Không tìm thấy nguyên liệu nào đã hết hạn còn tồn kho trong chi nhánh.', 'info');
        return;
      }

      const inventoryList = Array.isArray(invRes?.data) ? invRes.data : (Array.isArray(invRes) ? invRes : products);

      // Gom nhóm theo BInventoryId (mỗi BInventory chỉ tạo 1 dòng chi tiết trong phiếu xuất hủy)
      const groupedByInv = {};
      expiredBatches.forEach((batch) => {
        const invId = Number(batch.bInventoryId);
        if (!groupedByInv[invId]) {
          groupedByInv[invId] = [];
        }
        groupedByInv[invId].push(batch);
      });

      const generatedItems = Object.entries(groupedByInv)
        .map(([invIdStr, bList]) => {
          const invId = Number(invIdStr);
          const matchP = (inventoryList || []).find((b) => Number(b.id ?? b.bInventoryId) === invId)
            || (products || []).find((p) => Number(p.id ?? p.bInventoryId) === invId);

          const totalExpiredQty = bList.reduce((sum, b) => sum + Number(b.quantityRemaining || 0), 0);
          const baseStockVal = Number(matchP?.runningQuantity ?? matchP?.quantity ?? matchP?.stockQuantity ?? 0);

          // Nếu tồn kho sản phẩm đã hết (<= 0) hoặc lượng hết hạn <= 0 thì đã xuất hủy hết
          if (baseStockVal <= 0 || totalExpiredQty <= 0) return null;

          const conversions = matchP?.unitConversions || matchP?.product?.unitConversions || [];
          const defaultUc = conversions.length > 0 ? conversions[0] : null;
          const conversionPoint = defaultUc?.conversionPoint > 0 ? defaultUc.conversionPoint : 1;
          const avgVal = matchP?.runningAverageCost > 0 ? matchP.runningAverageCost : (matchP?.avg > 0 ? matchP.avg : (bList[0].unitCost || 0));

          const batchDesc = bList.map((b) => {
            const exp = b.expiryDate ? dayjs(b.expiryDate).format('DD/MM/YYYY') : '---';
            return `${b.batchCode} (${b.quantityRemaining} ${b.unitName}, HSD: ${exp})`;
          }).join('; ');

          return {
            rowId: `expired-${invId}-${Date.now()}-${Math.random()}`,
            bInventoryId: invId,
            code: matchP?.code || bList[0].productCode || `SP${invId}`,
            name: matchP?.name || bList[0].productName || 'Nguyên liệu',
            baseStock: baseStockVal,
            stock: baseStockVal,
            baseAvgCost: avgVal,
            costPrice: avgVal,
            unitConversionId: defaultUc ? defaultUc.id : null,
            unitName: defaultUc ? (defaultUc.unitName || defaultUc.name) : (matchP?.unitName || bList[0].unitName || 'Đơn vị'),
            unitConversions: conversions,
            conversionPoint: conversionPoint,
            quantity: Math.min(totalExpiredQty, baseStockVal),
            note: `Lô hết hạn: ${batchDesc}`,
            isExpiredAutoSelected: true,
            editingNote: false
          };
        })
        .filter(Boolean);

      if (generatedItems.length === 0) {
        showToast('Các nguyên liệu hết hạn đã được xuất hủy hết hoặc không còn tồn kho.', 'info');
        return;
      }

      setInitialDisposalData({
        note: `Xuất hủy nguyên liệu hết hạn sử dụng (${expiredBatches.length} lô hết hạn)`,
        items: generatedItems
      });
      setEditDocumentId(null);
      setModalExportOpen(true);
      showToast(`Đã tự động chọn ${generatedItems.length} mặt hàng hết hạn (${expiredBatches.length} lô) để xuất hủy.`, 'success');
    } catch (err) {
      console.error('Lỗi khi tìm nguyên liệu hết hạn:', err);
      showToast('Có lỗi xảy ra khi tìm nguyên liệu hết hạn.', 'error');
    } finally {
      setLoadingExpired(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      <ExportDeleteTable
        documents={exportDeleteDocuments}
        searchText={searchText}
        setSearchText={handleSearchChange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        loading={loading || parentLoading}
        setModalExportOpen={setModalExportOpen}
        onEditDocument={handleOpenEdit}
        handleDeleteDocument={handleDeleteDocument}
        onRefresh={handleRefresh}
        onOpenExpiredDisposal={handleOpenExpiredDisposal}
        loadingExpired={loadingExpired}
        expiredCount={expiredBatchesCount}
      />

      <DisposalDocumentModal
        open={modalExportOpen}
        editDocumentId={editDocumentId}
        initialData={initialDisposalData}
        onClose={handleCloseModal}
        onSuccess={() => {
          handleRefresh();
        }}
        branchId={selectedBranchId}
        products={products}
      />
    </div>
  );
};

export default ExportDeleteTab;
