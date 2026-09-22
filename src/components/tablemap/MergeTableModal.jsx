import React, { useState, useRef } from 'react';
import { Modal, Select, message } from 'antd';
import { mergeOrder, createOrder } from '../../api/orderApi';
import { getTableOrderSummary } from '../../api/tableMapApi';

const MergeTableModal = ({ visible, onClose, tables, currentTable, onMerged }) => {
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [loading, setLoading] = useState(false);

  const availableTables = tables.filter(t => t.status === 'Occupied' && t.id !== currentTable?.id);

  const isMergingRef = useRef(false);

  const handleMerge = async () => {
    if (!selectedTableId) {
      message.error("Vui lòng chọn bàn để gộp");
      return;
    }
    if (isMergingRef.current) return;

    isMergingRef.current = true;
    setLoading(true);
    try {
      const fatherSummary = await getTableOrderSummary(currentTable.id);
      let fatherOrderId = fatherSummary.data?.activeOrderId;
      
      const childSummary = await getTableOrderSummary(selectedTableId);
      let childOrderId = childSummary.data?.activeOrderId;

      if (!fatherOrderId) {
        const res = await createOrder({ tableId: currentTable.id, status: 'Active', totalAmount: 0 });
        fatherOrderId = res.data.id;
      }
      if (!childOrderId) {
        const res = await createOrder({ tableId: selectedTableId, status: 'Active', totalAmount: 0 });
        childOrderId = res.data.id;
      }

      if (!fatherOrderId || !childOrderId) {
        message.error("Không thể tạo đơn hàng để gộp bàn");
        setLoading(false);
        return;
      }

      await mergeOrder({
        fatherOrderId: fatherOrderId,
        childOrderId: childOrderId
      });

      message.success("Gộp bàn thành công!");
      setSelectedTableId(null);
      onClose();
      if (onMerged) onMerged();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Lỗi khi gộp bàn");
    } finally {
      setLoading(false);
      isMergingRef.current = false;
    }
  };

  return (
    <Modal
      title={`Gộp bàn vào ${currentTable?.name || ''}`}
      open={visible}
      onCancel={onClose}
      onOk={handleMerge}
      confirmLoading={loading}
      okText="Xác nhận gộp"
      cancelText="Huỷ"
    >
      <div style={{ padding: '20px 0' }}>
        <p style={{ marginBottom: 12 }}>Chọn bàn (đang có khách) để gộp vào bàn này:</p>
        <Select
          style={{ width: '100%' }}
          placeholder="Chọn bàn..."
          value={selectedTableId}
          onChange={setSelectedTableId}
          options={availableTables.map(t => ({
            value: t.id,
            label: `${t.name} - ${t.area?.name || ''}`
          }))}
          notFoundContent="Không có bàn nào khả dụng"
        />
        <p style={{ marginTop: 16, color: '#ef4444', fontSize: '13px' }}>
          * Lưu ý: Toàn bộ món ăn của bàn được chọn sẽ chuyển sang thanh toán chung với bàn này.
        </p>
      </div>
    </Modal>
  );
};

export default MergeTableModal;
