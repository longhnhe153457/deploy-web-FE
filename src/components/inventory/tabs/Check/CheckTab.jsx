import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import CheckTable from './CheckTable';
import CheckDocumentModal from './CheckDocumentModal';
import { getCheckDocuments } from '../../../../api/documentApi';
import { removeVietnameseTones } from '../../../../utils/stringHelper';

const CheckTab = ({
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
  const [modalCheckOpen, setModalCheckOpen] = useState(false);
  const [editDocumentId, setEditDocumentId] = useState(null);
  const [localDocs, setLocalDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCheckDocs = useCallback(async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const res = await getCheckDocuments(selectedBranchId);
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setLocalDocs(data);
    } catch (err) {
      console.error('Error fetching check documents:', err);
      setLocalDocs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchCheckDocs();
  }, [fetchCheckDocs]);

  const rawDocs = localDocs.length > 0 ? localDocs : documents;

  const checkDocuments = useMemo(() => {
    return rawDocs.filter((doc) => {
      const rawType = doc.type;
      const typeStr = String(rawType ?? '').toLowerCase();
      const isMatch =
        rawType === 10 ||
        rawType === 3 ||
        rawType === 5 ||
        typeStr.includes('check');
      if (!isMatch) return false;
      if (statusFilter !== 'ALL') {
        const isPending = doc.status === 0 || doc.status === 'Pending';
        const isCompleted = doc.status === 1 || doc.status === 'Completed';
        const isCancelled = doc.status === 2 || doc.status === 'Cancelled';
        if (statusFilter === 'Pending' && !isPending) return false;
        if (statusFilter === 'Completed' && !isCompleted) return false;
        if (statusFilter === 'Cancelled' && !isCancelled) return false;
      }
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
    setModalCheckOpen(true);
  };

  const handleCloseModal = () => {
    setModalCheckOpen(false);
    setEditDocumentId(null);
  };

  const handleRefresh = () => {
    fetchCheckDocs();
    if (parentFetchDocuments) parentFetchDocuments(selectedBranchId);
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      <CheckTable
        documents={checkDocuments}
        searchText={searchText}
        setSearchText={handleSearchChange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        loading={loading || parentLoading}
        setModalCheckOpen={setModalCheckOpen}
        onEditDocument={handleOpenEdit}
        handleDeleteDocument={handleDeleteDocument}
        onRefresh={handleRefresh}
      />

      <CheckDocumentModal
        open={modalCheckOpen}
        editDocumentId={editDocumentId}
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

export default CheckTab;
