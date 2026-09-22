import axiosInstance from './axiosInstance';

// Helper validator for mandatory branchId
const validateBranchId = (branchId) => {
  if (!branchId || branchId <= 0) {
    console.warn('[documentApi] Dừng thao tác: Thiếu branchId hợp lệ.', branchId);
    return false;
  }
  return true;
};

// ==========================================
// 1. IMPORT DOCUMENT (Type 1)
// ==========================================
export const getImportDocuments = async (branchId) => {
  if (!validateBranchId(branchId)) return [];
  const response = await axiosInstance.get('/api/Document/import', { params: { branchId } });
  return response.data;
};

export const getImportById = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/ImportDocument/${id}`);
  return response.data;
};

export const createImportDocument = async (dto) => {
  const response = await axiosInstance.post('/api/Document/import', dto);
  return response.data;
};

export const createImportPending = async (dto) => {
  const response = await axiosInstance.post('/api/ImportDocument/pending', dto);
  return response.data;
};

export const createImportCompleted = async (dto) => {
  const response = await axiosInstance.post('/api/ImportDocument/completed', dto);
  return response.data;
};

export const updateImportPending = async (id, dto) => {
  const response = await axiosInstance.put(`/api/ImportDocument/pending/${id}`, dto);
  return response.data;
};

export const completeImportDocument = async (id) => {
  const response = await axiosInstance.post(`/api/ImportDocument/${id}/complete`);
  return response.data;
};

export const deleteImportPendingDocument = async (id, deleteNote = 'Xóa phiếu tạm') => {
  const response = await axiosInstance.delete(`/api/ImportDocument/${id}/soft-delete`, {
    params: { deleteNote }
  });
  return response.data;
};

export const updateImportDocument = async (id, dto, branchId) => {
  const response = await axiosInstance.put(`/api/Document/import/${id}`, dto, {
    params: { branchId }
  });
  return response.data;
};

export const deleteImportDocument = async (id, deleteNote = 'Hủy phiếu nhập kho') => {
  const response = await axiosInstance.delete(`/api/ImportDocument/${id}/soft-delete`, {
    params: { deleteNote }
  });
  return response.data;
};

export const getImportReturnDetails = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/ImportDocument/${id}/return-details`);
  return response.data;
};

// ==========================================
// 2. EXPORT DELETE DOCUMENT (Type 2 / Type 5)
// ==========================================
export const getExportDeleteDocuments = async (branchId) => {
  if (!validateBranchId(branchId)) return [];
  const response = await axiosInstance.get('/api/Document/export-delete', { params: { branchId } });
  return response.data;
};

export const getExportDeleteById = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/ExportDeleteDocument/${id}`);
  return response.data;
};

export const createExportDeleteDocument = async (dto) => {
  const response = await axiosInstance.post('/api/Document/export-delete', dto);
  return response.data;
};

export const createExportDeletePending = async (dto) => {
  const response = await axiosInstance.post('/api/ExportDeleteDocument/pending', dto);
  return response.data;
};

export const createExportDeleteCompleted = async (dto) => {
  const response = await axiosInstance.post('/api/ExportDeleteDocument/completed', dto);
  return response.data;
};

export const updateExportDeletePending = async (id, dto) => {
  const response = await axiosInstance.put(`/api/ExportDeleteDocument/pending/${id}`, dto);
  return response.data;
};

export const completeExportDeleteDocument = async (id) => {
  const response = await axiosInstance.post(`/api/ExportDeleteDocument/${id}/complete`);
  return response.data;
};

export const deleteExportDeletePendingDocument = async (id, deleteNote = 'Hủy phiếu xuất hủy nháp') => {
  const response = await axiosInstance.delete(`/api/ExportDeleteDocument/${id}/soft-delete`, {
    params: { deleteNote }
  });
  return response.data;
};

export const deleteExportDeleteDocument = async (id, deleteNote = 'Hủy phiếu xuất hủy') => {
  const response = await axiosInstance.delete(`/api/ExportDeleteDocument/${id}/soft-delete`, {
    params: { deleteNote }
  });
  return response.data;
};

// ==========================================
// 3. TRANSFER DOCUMENT (Type 3 & 7)
// ==========================================
export const getTransferDocuments = async (branchId) => {
  if (!validateBranchId(branchId)) return [];
  const response = await axiosInstance.get('/api/Document/transfer', { params: { branchId } });
  return response.data;
};

export const getReceiveTransferDocuments = async (branchId) => {
  if (!validateBranchId(branchId)) return [];
  const response = await axiosInstance.get('/api/Document/transfer/receive', { params: { branchId } });
  return response.data;
};

export const getTransferById = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/TransferDocument/${id}`);
  return response.data;
};

export const createTransferDocument = async (dto) => {
  const response = await axiosInstance.post('/api/Document/transfer', dto);
  return response.data;
};

export const createTransferPending = async (dto) => {
  const response = await axiosInstance.post('/api/TransferDocument/pending', dto);
  return response.data;
};

export const createTransferCompleted = async (dto) => {
  const response = await axiosInstance.post('/api/TransferDocument/completed', dto);
  return response.data;
};

export const updateTransferPending = async (id, dto) => {
  const response = await axiosInstance.put(`/api/TransferDocument/pending/${id}`, dto);
  return response.data;
};

export const completeTransferDocument = async (id) => {
  const response = await axiosInstance.post(`/api/TransferDocument/${id}/complete`);
  return response.data;
};

export const deleteTransferPendingDocument = async (id, deleteNote = 'Hủy phiếu chuyển kho nháp') => {
  const response = await axiosInstance.delete(`/api/TransferDocument/${id}/soft-delete`, {
    params: { deleteNote }
  });
  return response.data;
};

export const updateTransferDocument = async (id, dto, branchId) => {
  const response = await axiosInstance.put(`/api/Document/transfer/${id}`, dto, {
    params: { branchId }
  });
  return response.data;
};

export const processTransferReceipt = async (id, dto) => {
  const response = await axiosInstance.post(`/api/TransferDocument/${id}/receive`, dto);
  return response.data;
};

export const receiveTransferDocument = async (dto) => {
  const id = dto.transferDocumentId || dto.id;
  const payload = {
    status: dto.status || 'Received',
    note: dto.note || dto.receivingNote || '',
    receivedDetails: dto.receivedDetails || (dto.details ? dto.details.map(d => ({
      detailId: d.detailId || d.id,
      receivedQuantity: d.receivedQuantity ?? d.receiveQty ?? 0
    })) : [])
  };
  const response = await axiosInstance.post(`/api/TransferDocument/${id}/receive`, payload);
  return response.data;
};

export const rejectTransferDocument = async (dto) => {
  const id = dto.transferDocumentId || dto.id;
  const payload = {
    status: 'Rejected',
    note: dto.reason || dto.note || 'Từ chối nhận hàng',
    receivedDetails: []
  };
  const response = await axiosInstance.post(`/api/TransferDocument/${id}/receive`, payload);
  return response.data;
};

export const deleteTransferDocument = async (id) => {
  const response = await axiosInstance.delete(`/api/TransferDocument/${id}/soft-delete`, {
    params: { deleteNote: 'Hủy phiếu chuyển kho' }
  });
  return response.data;
};

// ==========================================
// 4. RETURN DOCUMENT (Type 4)
// ==========================================
export const getReturnDocuments = async (branchId) => {
  if (!validateBranchId(branchId)) return [];
  const response = await axiosInstance.get('/api/Document/return', { params: { branchId } });
  return response.data;
};

export const getReturnDocumentById = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/ReturnDocument/${id}`);
  return response.data;
};

export const createReturnDocument = async (dto) => {
  const response = await axiosInstance.post('/api/ReturnDocument/completed', dto);
  return response.data;
};

export const deleteReturnDocument = async (id) => {
  const response = await axiosInstance.delete(`/api/Document/return/${id}`);
  return response.data;
};

// ==========================================
// 5. CHECK DOCUMENT (Type 5 / Type 3)
// ==========================================
export const getCheckDocuments = async (branchId) => {
  if (!validateBranchId(branchId)) return [];
  const response = await axiosInstance.get('/api/Document/check', { params: { branchId } });
  return response.data;
};

export const getCheckById = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/CheckDocument/${id}`);
  return response.data;
};

export const createCheckDocument = async (dto) => {
  const response = await axiosInstance.post('/api/Document/check', dto);
  return response.data;
};

export const createCheckPending = async (dto) => {
  const response = await axiosInstance.post('/api/CheckDocument/pending', dto);
  return response.data;
};

export const createCheckCompleted = async (dto) => {
  const response = await axiosInstance.post('/api/CheckDocument/completed', dto);
  return response.data;
};

export const updateCheckPending = async (id, dto) => {
  const response = await axiosInstance.put(`/api/CheckDocument/pending/${id}`, dto);
  return response.data;
};

export const completeCheckDocument = async (id) => {
  const response = await axiosInstance.post(`/api/CheckDocument/${id}/complete`);
  return response.data;
};

export const deleteCheckPendingDocument = async (id, deleteNote = 'Hủy phiếu kiểm kho nháp') => {
  const response = await axiosInstance.delete(`/api/CheckDocument/${id}/soft-delete`, {
    params: { deleteNote }
  });
  return response.data;
};

export const deleteCheckDocument = async (id, deleteNote = 'Hủy phiếu kiểm kho') => {
  const response = await axiosInstance.delete(`/api/CheckDocument/${id}/soft-delete`, {
    params: { deleteNote }
  });
  return response.data;
};

// ==========================================
// 6. PRODUCTION DOCUMENT (Type 6)
// ==========================================
export const getProductionDocuments = async (branchId) => {
  if (!validateBranchId(branchId)) return [];
  const response = await axiosInstance.get('/api/Document/production', { params: { branchId } });
  return response.data;
};

export const getProductionById = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/ProductionDocument/${id}`);
  return response.data;
};

export const createProductionDocument = async (dto) => {
  const response = await axiosInstance.post('/api/Document/production', dto);
  return response.data;
};

export const createProductionPending = async (dto) => {
  const response = await axiosInstance.post('/api/ProductionDocument/pending', dto);
  return response.data;
};

export const createProductionCompleted = async (dto) => {
  const response = await axiosInstance.post('/api/ProductionDocument/completed', dto);
  return response.data;
};

export const updateProductionPending = async (id, dto) => {
  const response = await axiosInstance.put(`/api/ProductionDocument/pending/${id}`, dto);
  return response.data;
};

export const completeProductionDocument = async (id) => {
  const response = await axiosInstance.post(`/api/ProductionDocument/${id}/complete`);
  return response.data;
};

export const deleteProductionPendingDocument = async (id, deleteNote = 'Hủy phiếu sản xuất nháp') => {
  const response = await axiosInstance.delete(`/api/ProductionDocument/${id}/soft-delete`, {
    params: { deleteNote }
  });
  return response.data;
};

export const deleteProductionDocument = async (id, deleteNote = 'Hủy phiếu sản xuất') => {
  const response = await axiosInstance.delete(`/api/ProductionDocument/${id}/soft-delete`, {
    params: { deleteNote }
  });
  return response.data;
};

// ==========================================
// 7. COST ADJUSTMENT DOCUMENT (Type 11)
// ==========================================
export const getCostAdjustmentDocuments = async (branchId) => {
  if (!validateBranchId(branchId)) return [];
  const response = await axiosInstance.get('/api/CostAdjustmentDocument', { params: { branchId } });
  return response.data;
};

export const getCostAdjustmentById = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/CostAdjustmentDocument/${id}`);
  return response.data;
};

export const createCostAdjustmentPending = async (dto) => {
  const response = await axiosInstance.post('/api/CostAdjustmentDocument/pending', dto);
  return response.data;
};

export const createCostAdjustmentCompleted = async (dto) => {
  const response = await axiosInstance.post('/api/CostAdjustmentDocument/completed', dto);
  return response.data;
};

export const updateCostAdjustmentPending = async (id, dto) => {
  const response = await axiosInstance.put(`/api/CostAdjustmentDocument/pending/${id}`, dto);
  return response.data;
};

export const completeCostAdjustmentDocument = async (id) => {
  const response = await axiosInstance.post(`/api/CostAdjustmentDocument/${id}/complete`);
  return response.data;
};

export const deleteCostAdjustmentPendingDocument = async (id, deleteNote = 'Hủy phiếu điều chỉnh giá vốn nháp') => {
  const response = await axiosInstance.delete(`/api/CostAdjustmentDocument/${id}/soft-delete`, {
    params: { deleteNote }
  });
  return response.data;
};

export const deleteCostAdjustmentDocument = async (id, deleteNote = 'Hủy phiếu điều chỉnh giá vốn') => {
  const response = await axiosInstance.delete(`/api/CostAdjustmentDocument/${id}/soft-delete`, {
    params: { deleteNote }
  });
  return response.data;
};

// ==========================================
// GENERIC DOCUMENT ENDPOINTS
// ==========================================
export const deleteDocument = async (id) => {
  const response = await axiosInstance.delete(`/api/Document/${id}`);
  return response.data;
};

export const getDocuments = async (branchId, type) => {
  if (!validateBranchId(branchId)) return [];
  const response = await axiosInstance.get('/api/Document', {
    params: { branchId, type }
  });
  return response.data;
};

export const getDocumentById = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/Document/${id}`);
  return response.data;
};

export const getSaleById = async (id) => {
  if (!id || id <= 0) return null;
  const response = await axiosInstance.get(`/api/SaleDocument/${id}`);
  return response.data;
};
