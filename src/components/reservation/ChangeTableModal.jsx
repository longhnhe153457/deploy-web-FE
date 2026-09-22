import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, message, Spin } from 'antd';
import { getTablesByBranch } from '../../api/tableApi';
import { changeTable, getAvailableTablesForReservation } from '../../api/reservationApi';

const { Option } = Select;

const ChangeTableModal = ({ visible, onClose, conflictData, onSuccess }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && conflictData?.BranchId) {
      fetchTables(conflictData.BranchId, conflictData.ReservationTime);
    } else {
      setTables([]);
      setSelectedTableId(null);
    }
  }, [visible, conflictData]);

  const fetchTables = async (branchId, reservationTime) => {
    setLoading(true);
    try {
      let response;
      if (reservationTime) {
        response = { data: await getAvailableTablesForReservation(branchId, reservationTime) };
      } else {
        response = await getTablesByBranch([branchId]);
      }

      setTables(response.data);
    } catch (error) {
      console.error("Lỗi lấy danh sách bàn:", error);
      message.error("Không thể tải danh sách bàn dự phòng.");
    } finally {
      setLoading(false);
    }
  };

  const handleOk = async () => {
    if (!selectedTableId) {
      message.warning('Vui lòng chọn một bàn dự phòng!');
      return;
    }
    setSubmitting(true);
    try {
      await changeTable(conflictData.ReservationId, selectedTableId);
      message.success('Đã đổi bàn dự phòng thành công!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi đổi bàn!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Xử Lý Xung Đột Bàn Đặt Trước"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          danger
          loading={submitting}
          onClick={handleOk}
          disabled={!selectedTableId}
        >
          Đổi sang bàn này
        </Button>,
      ]}
    >
      <div className="mb-4">
        <p className="text-red-500 font-medium">
          {conflictData?.Message}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Vui lòng chọn một bàn đang trống tại cùng chi nhánh để chuyển đơn đặt bàn này sang.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-4"><Spin /></div>
      ) : (
        <Select
          className="w-full"
          placeholder="Chọn bàn dự phòng"
          value={selectedTableId}
          onChange={setSelectedTableId}
          showSearch
          optionFilterProp="children"
        >
          {tables.map(t => (
            <Option key={t.id} value={t.id}>
              Bàn {t.name} - Khu vực: {t.areaName || 'Chung'}
            </Option>
          ))}
        </Select>
      )}
    </Modal>
  );
};

export default ChangeTableModal;
