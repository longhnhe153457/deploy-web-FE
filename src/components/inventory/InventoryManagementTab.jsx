import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import InventoryHeaderNav from './InventoryHeaderNav';
import { useBranch } from '../../context/BranchContext';
import {
  deleteDocument,
  deleteImportDocument,
  deleteReturnDocument,
  deleteExportDeleteDocument,
  deleteTransferDocument,
  deleteCheckDocument,
  deleteProductionDocument,
  deleteCostAdjustmentDocument,
  getDocuments
} from '../../api/documentApi';

// Tab Components
import ImportTab from './tabs/Import/ImportTab';
import ImportReturnTab from './tabs/ImportReturn/ImportReturnTab';
import CheckTab from './tabs/Check/CheckTab';
import ExportDeleteTab from './tabs/ExportDelete/ExportDeleteTab';
import TransferTab from './tabs/Transfer/TransferTab';
import ProductionTab from './tabs/Production/ProductionTab';
import PartnerTab from './tabs/Partner/PartnerTab';
import CustomerTab from './tabs/Customer/CustomerTab';
import ProductTab from './tabs/Product/ProductTab';
import InvoiceTab from './tabs/Invoice/InvoiceTab';
import AdjustmentTab from './tabs/Adjustment/AdjustmentTab';
import BatchExpiryTab from './tabs/Product/BatchExpiryTab';

const InventoryManagementTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentBranchId, branches } = useBranch();
  const [loading, setLoading] = useState(false);

  // Read tab parameter from URL query parameter, fallback to 'Adjustment'
  const tabFromUrl = searchParams.get('tab') || 'Adjustment';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync activeTab when URL searchParams change
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams]);

  // Sync URL searchParams when activeTab is changed locally (e.g. via InventoryHeaderNav dropdown)
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Real Data states
  const [documents, setDocuments] = useState([]);
  const [partners, setPartners] = useState([]);
  const [products] = useState([]);

  const fetchDocuments = async (branchId) => {
    if (!branchId || branchId <= 0) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    try {
      const res = await getDocuments(branchId);
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching branch documents:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async (branchId) => {
    if (!branchId || branchId <= 0) {
      setPartners([]);
      return;
    }
    try {
      const { getPartnersByBranch } = await import('../../api/partnerApi');
      const res = await getPartnersByBranch(branchId);
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setPartners(data);
    } catch (err) {
      console.error('Error fetching branch partners:', err);
      setPartners([]);
    }
  };

  useEffect(() => {
    if (currentBranchId && currentBranchId > 0) {
      fetchDocuments(currentBranchId);
      fetchPartners(currentBranchId);
    } else {
      setDocuments([]);
      setPartners([]);
    }
  }, [currentBranchId]);

  const handleDeleteDocument = async (id, type, status) => {
    const isCompleted = status === 2 || status === 'Completed' || String(status).toLowerCase() === 'completed';
    const isCancelled = status === 3 || status === 'Cancelled' || String(status).toLowerCase() === 'cancelled';

    if (isCompleted) {
      alert('Không thể xóa chứng từ đã hoàn thành. Theo nguyên tắc kế toán kho, số liệu đã được ghi sổ kho và tính giá vốn. Vui lòng lập phiếu kiểm kho hoặc điều chỉnh bù trừ nếu cần sửa đổi số liệu.');
      return;
    }

    if (isCancelled) {
      alert('Chứng từ này đã ở trạng thái hủy, không thể thao tác thêm.');
      return;
    }

    try {
      if (type === 1 || type === 'Import') {
        await deleteImportDocument(id);
      } else if (type === 2 || type === 4 || type === 'Return') {
        await deleteReturnDocument(id);
      } else if (type === 5 || type === 'Transfer') {
        await deleteTransferDocument(id);
      } else if (type === 7 || type === 8 || type === 'Export' || type === 'ExportDelete') {
        await deleteExportDeleteDocument(id);
      } else if (type === 9 || type === 6 || type === 'Production') {
        await deleteProductionDocument(id);
      } else if (type === 10 || type === 'Check') {
        await deleteCheckDocument(id);
      } else if (type === 11 || type === 'CostAdjustment') {
        await deleteCostAdjustmentDocument(id);
      } else {
        await deleteProductionDocument(id);
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Lỗi khi xóa chứng từ:', err);
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi xóa chứng từ.';
      alert(`Thao tác không thành công: ${msg}`);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', fontSize: 12 }}>
      {/* TOP HEADER NAVIGATION BAR */}
      <InventoryHeaderNav activeTab={activeTab} />

      {/* BODY CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {activeTab === 'Import' && (
          <ImportTab
            documents={documents}
            loading={loading}
            selectedBranchId={currentBranchId}
            products={products}
            partners={partners}
            fetchDocuments={fetchDocuments}
            handleDeleteDocument={handleDeleteDocument}
          />
        )}

        {activeTab === 'ImportReturn' && (
          <ImportReturnTab
            documents={documents}
            loading={loading}
            selectedBranchId={currentBranchId}
            products={products}
            partners={partners}
            fetchDocuments={fetchDocuments}
            handleDeleteDocument={handleDeleteDocument}
          />
        )}

        {activeTab === 'Check' && (
          <CheckTab
            documents={documents}
            loading={loading}
            selectedBranchId={currentBranchId}
            products={products}
            fetchDocuments={fetchDocuments}
            handleDeleteDocument={handleDeleteDocument}
          />
        )}

        {activeTab === 'Adjustment' && (
          <AdjustmentTab
            documents={documents}
            loading={loading}
            selectedBranchId={currentBranchId}
            products={products}
            fetchDocuments={fetchDocuments}
            handleDeleteDocument={handleDeleteDocument}
          />
        )}

        {activeTab === 'ExportDelete' && (
          <ExportDeleteTab
            documents={documents}
            loading={loading}
            selectedBranchId={currentBranchId}
            products={products}
            fetchDocuments={fetchDocuments}
            handleDeleteDocument={handleDeleteDocument}
          />
        )}

        {activeTab === 'Transfer' && (
          <TransferTab
            documents={documents}
            loading={loading}
            selectedBranchId={currentBranchId}
            branches={branches}
            products={products}
            fetchDocuments={fetchDocuments}
            handleDeleteDocument={handleDeleteDocument}
          />
        )}

        {activeTab === 'Production' && (
          <ProductionTab
            documents={documents}
            loading={loading}
            selectedBranchId={currentBranchId}
            products={products}
            fetchDocuments={fetchDocuments}
            handleDeleteDocument={handleDeleteDocument}
          />
        )}

        {activeTab === 'Partner' && (
          <PartnerTab
            partners={partners}
            fetchPartners={fetchPartners}
            selectedBranchId={currentBranchId}
          />
        )}

        {activeTab === 'Customer' && (
          <CustomerTab
            selectedBranchId={currentBranchId}
          />
        )}

        {activeTab === 'Product' && (
          <ProductTab dishes={[]} selectedBranchId={currentBranchId} />
        )}

        {activeTab === 'Invoice' && (
          <InvoiceTab selectedBranchId={currentBranchId} />
        )}

        {activeTab === 'BatchExpiry' && (
          <BatchExpiryTab selectedBranchId={currentBranchId} />
        )}
      </div>
    </div>
  );
};

export default InventoryManagementTab;
