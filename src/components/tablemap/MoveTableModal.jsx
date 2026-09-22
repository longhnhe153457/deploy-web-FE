import React, { useState, useRef } from 'react';
import { Modal, Select, message } from 'antd';
import { moveOrder } from '../../api/orderApi';
import { getTableOrderSummary } from '../../api/tableMapApi';

const MoveTableModal = ({ visible, onClose, tables, currentTable, summary, onMoved }) => {
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [loading, setLoading] = useState(false);

  const availableTables = tables.filter(t => t.status === 'Empty' && t.id !== currentTable?.id);

  const isMovingRef = useRef(false);

  const handleMove = async () => {
    if (!selectedTableId) {
      message.error("Vui lòng chọn bàn mới để chuyển tới");
      return;
    }
    if (isMovingRef.current) return;

    isMovingRef.current = true;
    setLoading(true);
    try {
      const activeOrderId = summary?.originalOrderId;
      
      if (!activeOrderId) {
        message.error("Không tìm thấy đơn hàng của bàn này");
        setLoading(false);
        return;
      }

      await moveOrder(activeOrderId, {
        newTableId: selectedTableId
      });

      message.success("Chuyển bàn thành công!");
      setSelectedTableId(null);
      onClose();
      if (onMoved) onMoved();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Lỗi khi chuyển bàn");
    } finally {
      setLoading(false);
      isMovingRef.current = false;
    }
  };

  return (
    <Modal
      title={`Chuyển bàn: ${currentTable?.name || ''}`}
      open={visible}
      onCancel={onClose}
      onOk={handleMove}
      confirmLoading={loading}
      okText="Xác nhận chuyển"
      cancelText="Huỷ"
    >
      <div style={{ padding: '20px 0' }}>
        <p style={{ marginBottom: 12 }}>Chọn một bàn (đang trống) để chuyển tới:</p>
        <Select
          style={{ width: '100%' }}
          placeholder="Chọn bàn đích"
          value={selectedTableId}
          onChange={setSelectedTableId}
          showSearch
          optionFilterProp="children"
        >
          {availableTables.map(t => (
            <Select.Option key={t.id} value={t.id}>
              {t.name} {t.areaName ? `(${t.areaName})` : ''}
            </Select.Option>
          ))}
        </Select>
        {availableTables.length === 0 && (
          <p style={{ color: 'red', marginTop: 10 }}>Không có bàn trống nào khả dụng!</p>
        )}
      </div>
    </Modal>
  );
};

export default MoveTableModal;
