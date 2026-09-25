import React, { useState, useEffect } from 'react';
import { Modal, Select, message, Spin, Form } from 'antd';
import { assignTablesToReservation, getAvailableTablesForReservation } from '../../api/reservationApi';

const AssignTableModal = ({ visible, onClose, onSuccess, reservation }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);

  useEffect(() => {
    if (visible && reservation) {
      form.resetFields();
      fetchAvailableTables();
    }
  }, [visible, reservation]);

  const fetchAvailableTables = async () => {
    try {
      setLoading(true);
      const data = await getAvailableTablesForReservation(reservation.branchId, reservation.reservationTime);
      setAvailableTables(data);
    } catch (error) {
      message.error('Lỗi tải danh sách bàn trống!');
    } finally {
      setLoading(false);
    }
  };

  const handleOk = async () => {
    let tableIds;
    try {
      const values = await form.validateFields();
      tableIds = values.tableIds;

      if (!tableIds || tableIds.length === 0) {
        message.warning('Vui lòng chọn ít nhất 1 bàn!');
        return;
      }

      setSubmitting(true);
      await assignTablesToReservation(reservation.id, tableIds);
      message.success('Xếp bàn thành công!');
      onSuccess();
    } catch (error) {
      if (error.errorFields) return;
      
      // Handle Reservation Warning
      if (error.response?.status === 422 && error.response.data?.isWarning) {
        const currentTableIds = tableIds;
        const currentReservationId = reservation.id;
        Modal.confirm({
          title: 'Cảnh báo xếp bàn',
          content: error.response.data.message,
          okText: 'Vẫn xếp bàn',
          cancelText: 'Huỷ',
          onOk: async () => {
            try {
              await assignTablesToReservation(currentReservationId, currentTableIds, true);
              message.success('Xếp bàn thành công!');
              onSuccess();
            } catch (retryError) {
              message.error(retryError.response?.data?.message || 'Xếp bàn thất bại');
            }
          }
        });
        return;
      }

      message.error(error.response?.data?.message || 'Xếp bàn thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Xếp Bàn Cho Khách"
      open={visible}
      onCancel={() => {
        Modal.confirm({
          title: 'Xác nhận đóng',
          content: 'Bạn có chắc chắn muốn đóng cửa sổ xếp bàn không?',
          okText: 'Đóng',
          cancelText: 'Huỷ',
          onOk: onClose
        });
      }}
      onOk={handleOk}
      confirmLoading={submitting}
      destroyOnClose
      maskClosable={false}
    >
      <Spin spinning={loading}>
        {reservation && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>Khách hàng:</strong> {reservation.customerName} - {reservation.customerPhone}</p>
            <p><strong>Số lượng:</strong> {reservation.numberOfGuests} người (Cần {reservation.tableCount} bàn)</p>
          </div>
        )}

        <Form form={form} layout="vertical">
          <Form.Item
            name="tableIds"
            label="Chọn bàn trống"
            rules={[
              { required: true, message: 'Vui lòng chọn bàn!' },
              { type: 'array', min: 1, message: 'Vui lòng chọn ít nhất 1 bàn!' }
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn bàn..."
              optionFilterProp="children"
              style={{ width: '100%' }}
              onChange={(value) => {
                if (!value || value.length <= 1) return;
                const selectedAreas = new Set(
                  value.map(id => availableTables.find(t => t.id === id)?.areaName)
                );
                if (selectedAreas.size > 1) {
                  message.warning('Khuyến cáo: Các bàn đã chọn thuộc các khu vực khác nhau!');
                }
              }}
            >
              {Object.entries(
                availableTables.reduce((acc, table) => {
                  const areaName = table.areaName || 'Khu vực khác';
                  acc[areaName] = acc[areaName] || [];
                  acc[areaName].push(table);
                  return acc;
                }, {})
              ).map(([areaName, tables]) => (
                <Select.OptGroup key={areaName} label={`Khu vực: ${areaName}`}>
                  {tables.map(t => (
                    <Select.Option key={t.id} value={t.id}>
                      {t.name}
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default AssignTableModal;
