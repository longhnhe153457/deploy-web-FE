import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductionTable from './ProductionTable';
import ProductionDocumentModal from './ProductionDocumentModal';
import { removeVietnameseTones } from '../../../../utils/stringHelper';

const ProductionTab = ({
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
  const [modalProductionOpen, setModalProductionOpen] = useState(false);
  const [editDocumentId, setEditDocumentId] = useState(null);

  const productionDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const isProd = doc.type === 9 || doc.type === 6 || doc.type === 'Production' || String(doc.type ?? '').toLowerCase().includes('production');
      if (!isProd) return false;

      if (statusFilter !== 'ALL') {
        const docStatusStr = String(doc.status);
        if (statusFilter === 'Pending' && docStatusStr !== '0' && docStatusStr !== 'Pending') return false;
        if (statusFilter === 'Completed' && docStatusStr !== '1' && docStatusStr !== 'Completed') return false;
        if (statusFilter === 'Cancelled' && docStatusStr !== '2' && docStatusStr !== 'Cancelled' && docStatusStr !== 'Canceled') return false;
      }

      if (searchText) {
        const lower = searchText.toLowerCase().trim();
        const norm = removeVietnameseTones(searchText).trim();

        const codeRaw = (doc.code || '').toLowerCase();
        const creatorRaw = (doc.createdByName || doc.snapshotCreatedByName || doc.currentCreatedByName || doc.creator || doc.creatorName || '').toLowerCase();
        const creatorNorm = removeVietnameseTones(doc.createdByName || doc.snapshotCreatedByName || doc.currentCreatedByName || doc.creator || doc.creatorName || '');
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
  }, [documents, statusFilter, searchText]);

  const handleOpenEdit = (docId) => {
    setEditDocumentId(docId);
    setModalProductionOpen(true);
  };

  const handleCloseModal = () => {
    setModalProductionOpen(false);
    setEditDocumentId(null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      <ProductionTable
        documents={productionDocuments}
        searchText={searchText}
        setSearchText={handleSearchChange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        loading={loading}
        setModalProductionOpen={setModalProductionOpen}
        onEditDocument={handleOpenEdit}
        handleDeleteDocument={handleDeleteDocument}
        onRefresh={() => fetchDocuments && selectedBranchId && fetchDocuments(selectedBranchId)}
      />

      <ProductionDocumentModal
        open={modalProductionOpen}
        editDocumentId={editDocumentId}
        onClose={handleCloseModal}
        onSuccess={() => {
          fetchDocuments(selectedBranchId);
        }}
        branchId={selectedBranchId}
        products={products}
      />
    </div>
  );
};

export default ProductionTab;
