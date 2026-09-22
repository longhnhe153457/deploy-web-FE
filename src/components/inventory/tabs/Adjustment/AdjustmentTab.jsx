import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdjustmentTable from './AdjustmentTable';
import AdjustmentDocumentModal from './AdjustmentDocumentModal';

const AdjustmentTab = ({
  documents = [],
  loading,
  selectedBranchId,
  products = [],
  fetchDocuments,
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editDocumentId, setEditDocumentId] = useState(null);

  const adjustmentDocs = useMemo(() => {
    return documents.filter((doc) => {
      // DocumentType 11 = CostAdjustment
      const typeStr = String(doc.type ?? '').toLowerCase();
      if (doc.type !== 11 && typeStr !== 'costadjustment') return false;

      if (statusFilter !== 'ALL') {
        const normFilter = String(statusFilter).toUpperCase();
        const docSt = String(doc.status ?? '').toUpperCase();

        if (normFilter === 'PENDING' && !(docSt === '0' || docSt === 'PENDING')) return false;
        if (normFilter === 'COMPLETED' && !(docSt === '1' || docSt === 'COMPLETED')) return false;
        if (normFilter === 'CANCELLED' && !(docSt === '2' || docSt === 'CANCELLED' || docSt === 'CANCELED')) return false;
      }

      if (searchText) {
        const lower = searchText.toLowerCase().trim();
        const matchCode = doc.code?.toLowerCase().includes(lower);
        const matchCreator = (doc.creator || doc.creatorName || doc.snapshotCreatedByName)?.toLowerCase().includes(lower);
        const matchNote = doc.note?.toLowerCase().includes(lower);
        if (!matchCode && !matchCreator && !matchNote) return false;
      }
      return true;
    });
  }, [documents, statusFilter, searchText]);

  const handleOpenEdit = (docId) => {
    setEditDocumentId(docId);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditDocumentId(null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      {/* CONTENT TABLE WITH TOP SEARCH TOOLBAR */}
      <AdjustmentTable
        documents={adjustmentDocs}
        loading={loading}
        selectedBranchId={selectedBranchId}
        searchText={searchText}
        setSearchText={handleSearchChange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        fetchDocuments={fetchDocuments}
        handleDeleteDocument={handleDeleteDocument}
        setModalOpen={setModalOpen}
        onEditDocument={handleOpenEdit}
      />

      {/* CREATE ADJUSTMENT MODAL */}
      <AdjustmentDocumentModal
        open={modalOpen}
        editDocumentId={editDocumentId}
        onClose={handleCloseModal}
        onSuccess={() => fetchDocuments(selectedBranchId)}
        branchId={selectedBranchId}
        products={products}
      />
    </div>
  );
};

export default AdjustmentTab;
