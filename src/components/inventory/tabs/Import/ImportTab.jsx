import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ImportTable from './ImportTable';
import ImportDocumentModal from './ImportDocumentModal';
import ReturnDocumentModal from './ReturnDocumentModal';

const ImportTab = ({
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
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const [modalReturnOpen, setModalReturnOpen] = useState(false);
  const [selectedReturnDoc, setSelectedReturnDoc] = useState(null);
  const [editingDocument, setEditingDocument] = useState(null);

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

  const importDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (doc.type !== 1 && doc.type !== 'Import') return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Pending' && doc.status !== 0 && doc.status !== 'Pending') return false;
        if (statusFilter === 'Completed' && doc.status !== 1 && doc.status !== 'Completed') return false;
        if (statusFilter === 'Cancelled' && doc.status !== 2 && doc.status !== 'Cancelled') return false;
      }
      if (searchText) {
        const lower = searchText.toLowerCase();
        const matchCode = doc.code?.toLowerCase().includes(lower);
        const matchCreator = doc.creator?.toLowerCase().includes(lower);
        if (!matchCode && !matchCreator) return false;
      }
      return true;
    });
  }, [documents, statusFilter, searchText]);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      <ImportTable
        documents={importDocuments}
        allDocuments={documents}
        searchText={searchText}
        setSearchText={handleSearchChange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        loading={loading}
        onRefresh={() => fetchDocuments && fetchDocuments(selectedBranchId)}
        onOpenCreateModal={() => {
          setEditingDocument(null);
          setModalImportOpen(true);
        }}
        handleDeleteDocument={handleDeleteDocument}
        onOpenReturnModal={(doc) => {
          setSelectedReturnDoc(doc);
          setModalReturnOpen(true);
        }}
        onEditDocument={(doc) => {
          setEditingDocument(doc);
          setModalImportOpen(true);
        }}
      />

      <ImportDocumentModal
        open={modalImportOpen}
        onClose={() => {
          setModalImportOpen(false);
          setEditingDocument(null);
        }}
        onSuccess={() => {
          fetchDocuments(selectedBranchId);
        }}
        branchId={selectedBranchId}
        products={products}
        partners={partners}
        editingDocument={editingDocument}
      />

      <ReturnDocumentModal
        open={modalReturnOpen}
        onClose={() => {
          setModalReturnOpen(false);
          setSelectedReturnDoc(null);
        }}
        onSuccess={() => {
          fetchDocuments(selectedBranchId);
        }}
        branchId={selectedBranchId}
        products={products}
        partners={partners}
        importDocument={selectedReturnDoc}
      />
    </div>
  );
};

export default ImportTab;
