import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ImportReturnTable from './ImportReturnTable';
import ReturnDocumentModal from '../Import/ReturnDocumentModal';

/**
 * ImportReturnTab — Tab phiếu trả hàng nhập (Return Document).
 *
 * Dữ liệu: Lọc từ allDocuments (type === Return / type === 4).
 * Tạo phiếu trả: Dùng ReturnDocumentModal giống như bên ImportTab,
 *   nhưng từ tab này không có importDocument cụ thể →
 *   user cần chọn phiếu nhập gốc qua ImportTab.
 *
 * Để tạo phiếu trả hàng: Mở ImportTab → Click "Trả hàng" trên phiếu Nhập đã Completed.
 */
const ImportReturnTab = ({
  documents = [],
  loading,
  selectedBranchId,
  products = [],
  partners = [],
  fetchDocuments,
  handleDeleteDocument
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get('search') || '';
  const [searchText, setSearchText] = useState(searchFromUrl);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Sync searchText with searchParams from URL when it changes
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

  // Lọc phiếu Trả hàng NCC (DocumentType.Return = 4 hoặc "Return")
  const returnDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const isReturn = doc.type === 2 || doc.type === 4 || doc.type === 'Return' || doc.type === 'CustomerReturn';
      if (!isReturn) return false;

      if (statusFilter !== 'ALL') {
        const docStatus = doc.status;
        if (statusFilter === 'Completed' && docStatus !== 1 && docStatus !== 'Completed') return false;
      }

      if (searchText) {
        const lower = searchText.toLowerCase();
        const matchCode = doc.code?.toLowerCase().includes(lower);
        const matchCreator = (doc.snapshotCreatedByName || doc.creator || '').toLowerCase().includes(lower);
        const matchPartner = (doc.partnerName || doc.snapshotPartnerName || '').toLowerCase().includes(lower);
        if (!matchCode && !matchCreator && !matchPartner) return false;
      }

      return true;
    });
  }, [documents, statusFilter, searchText]);

  const handleRefresh = () => {
    if (fetchDocuments && selectedBranchId) {
      fetchDocuments(selectedBranchId);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      <ImportReturnTable
        documents={returnDocuments}
        searchText={searchText}
        setSearchText={handleSearchChange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        loading={loading}
        onRefresh={handleRefresh}
        // Không truyền onOpenReturnModal vì tab này chỉ xem
        // Để tạo phiếu trả → phải vào ImportTab
      />
    </div>
  );
};

export default ImportReturnTab;
