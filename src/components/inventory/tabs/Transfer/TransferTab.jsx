import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import TransferTable from './TransferTable';
import TransferDocumentModal from './TransferDocumentModal';
import ReceiveTransferDocumentModal from './ReceiveTransferDocumentModal';
import { getTransferDocuments } from '../../../../api/documentApi';

const TransferTab = ({
  documents = [],
  loading: parentLoading,
  selectedBranchId,
  branches = [],
  products = [],
  fetchDocuments,
  handleDeleteDocument
}) => {
  const [transferList, setTransferList] = useState([]);
  const [loading, setLoading] = useState(false);

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
  const [modalTransferOpen, setModalTransferOpen] = useState(false);
  const [editDocumentId, setEditDocumentId] = useState(null);
  const [modalReceiveOpen, setModalReceiveOpen] = useState(false);
  const [selectedTransferDoc, setSelectedTransferDoc] = useState(null);

  const loadTransferDocuments = useCallback(async (bId) => {
    if (!bId || bId <= 0) {
      setTransferList([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getTransferDocuments(bId);
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setTransferList(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách phiếu chuyển kho:', err);
      setTransferList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBranchId && selectedBranchId > 0) {
      loadTransferDocuments(selectedBranchId);
    } else {
      setTransferList([]);
    }
  }, [selectedBranchId, loadTransferDocuments]);

  const displaySource = transferList.length > 0 ? transferList : documents;

  const transferDocuments = useMemo(() => {
    return displaySource.filter((doc) => {
      // Include Transfer (Type 2, 3, 7 or 'Transfer')
      const isTransfer = doc.type === 2 || doc.type === 3 || doc.type === 7 || doc.type === 'Transfer' || doc.type === 'ReceiveTransfer';
      if (!isTransfer && displaySource === documents) return false;

      if (statusFilter !== 'ALL') {
        const docStatusStr = String(doc.status);
        if (statusFilter === 'Pending' && docStatusStr !== '0' && docStatusStr !== 'Pending') return false;
        if (statusFilter === 'Completed' && docStatusStr !== '1' && docStatusStr !== 'Completed') return false;
        if (statusFilter === 'Cancelled' && docStatusStr !== '2' && docStatusStr !== 'Cancelled' && docStatusStr !== 'Canceled') return false;
      }

      if (searchText) {
        const lower = searchText.toLowerCase();
        const matchCode = doc.code?.toLowerCase().includes(lower);
        const matchCreator = (doc.creator || doc.createdByName || doc.snapshotCreatedByName)?.toLowerCase().includes(lower);
        const matchBranch = (doc.snapshotBranchName || doc.snapshotToBranchName || doc.currentBranchName)?.toLowerCase().includes(lower);
        if (!matchCode && !matchCreator && !matchBranch) return false;
      }
      return true;
    });
  }, [displaySource, documents, statusFilter, searchText]);

  const handleOpenEdit = (docId) => {
    setEditDocumentId(docId);
    setModalTransferOpen(true);
  };

  const handleCloseTransferModal = () => {
    setModalTransferOpen(false);
    setEditDocumentId(null);
  };

  const handleOpenReceiveModal = (doc = null) => {
    setSelectedTransferDoc(doc);
    setModalReceiveOpen(true);
  };

  const handleRefresh = () => {
    if (selectedBranchId) {
      loadTransferDocuments(selectedBranchId);
      if (fetchDocuments) fetchDocuments(selectedBranchId);
    }
  };

  const handleDelete = async (id, type) => {
    if (handleDeleteDocument) {
      await handleDeleteDocument(id, type);
      handleRefresh();
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      <TransferTable
        documents={transferDocuments}
        selectedBranchId={selectedBranchId}
        searchText={searchText}
        setSearchText={handleSearchChange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        loading={loading || parentLoading}
        branches={branches}
        setModalTransferOpen={setModalTransferOpen}
        onEditDocument={handleOpenEdit}
        handleReceiveTransfer={handleOpenReceiveModal}
        handleDeleteDocument={handleDelete}
        onRefresh={handleRefresh}
      />

      {/* MODAL 1: CHUYỂN HÀNG */}
      <TransferDocumentModal
        open={modalTransferOpen}
        editDocumentId={editDocumentId}
        onClose={handleCloseTransferModal}
        onSuccess={handleRefresh}
        branchId={selectedBranchId}
        branches={branches}
        products={products}
      />

      {/* MODAL 2: NHẬN HÀNG */}
      <ReceiveTransferDocumentModal
        open={modalReceiveOpen}
        onClose={() => setModalReceiveOpen(false)}
        onSuccess={handleRefresh}
        documentData={selectedTransferDoc}
      />
    </div>
  );
};

export default TransferTab;
