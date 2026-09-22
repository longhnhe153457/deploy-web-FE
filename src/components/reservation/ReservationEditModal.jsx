import React, { useEffect, useState, useRef } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import { updateReservation } from '../../api/reservationApi';
import CustomerSearchInput from '../common/CustomerSearchInput';

const ReservationEditModal = ({ visible, onClose, onSuccess, reservation }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (visible && reservation) {
      form.setFieldsValue({
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        numberOfGuests: reservation.numberOfGuests,
        note: reservation.note,
        reservationTime: dayjs(reservation.reservationTime)
      });
    } else {
      form.resetFields();
    }
  }, [visible, reservation, form]);

  const handleSelectCustomer = (customer) => {
    form.setFieldsValue({ customerName: customer.name });
  };

  const submitUpdate = async (values, confirmUpdateCustomer = false, ignoreWarning = false) => {
    try {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setLoading(true);

      const updateData = {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        numberOfGuests: values.numberOfGuests,
        reservationTime: values.reservationTime.toISOString(),
        note: values.note || '',
        confirmUpdateCustomer,
        ignoreWarning
      };

      await updateReservation(reservation.id, updateData);
      message.success('Cập nhật thông tin đặt bàn thành công');
      onSuccess();
    } catch (error) {
      if (error.response?.status === 409) {
        Modal.confirm({
          title: 'Trùng số điện thoại',
          content: error.response.data.message,
          okText: 'Cập nhật',
          cancelText: 'Hủy',
          onOk: async () => {
            isSubmittingRef.current = false;
            await submitUpdate(values, true, ignoreWarning);
          },
          onCancel: () => {
             isSubmittingRef.current = false;
          }
        });
      } else if (error.response?.status === 422 && error.response.data?.isWarning) {
        Modal.confirm({
          title: 'Cảnh báo trùng bàn',
          content: error.response.data.message,
          okText: 'Vẫn cập nhật',
          cancelText: 'Hủy',
          onOk: async () => {
            isSubmittingRef.current = false;
            await submitUpdate(values, confirmUpdateCustomer, true);
          },
          onCancel: () => {
             isSubmittingRef.current = false;
          }
        });
      } else {
        message.error(error.response?.data?.message || 'Cập nhật thất bại');
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await submitUpdate(values, false);
    } catch (error) {
      // Validation error
    }
  };

  const handleCancel = () => {
    if (form.isFieldsTouched()) {
      Modal.confirm({
        title: 'Cảnh báo chưa lưu dữ liệu',
        content: 'Bạn có dữ liệu đang nhập dở. Bạn có chắc chắn muốn thoát và hủy bỏ toàn bộ không?',
        okText: 'Thoát',
        cancelText: 'Tiếp tục nhập',
        onOk: () => {
           form.resetFields();
           onClose();
        }
      });
    } else {
      form.resetFields();
      onClose();
    }
  };

  return (
    <Modal
      title="Sửa Thông Tin Đặt Bàn"
      open={visible}
      maskClosable={false}
      onCancel={handleCancel}
      onOk={handleOk}
      confirmLoading={loading}
      okText="Lưu"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="customerName"
          label="Tên khách hàng"
          rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}
        >
          <Input placeholder="Nhập tên khách hàng" />
        </Form.Item>

        <Form.Item
          name="customerPhone"
          label="Số điện thoại"
          rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
        >
          <CustomerSearchInput onSelectCustomer={handleSelectCustomer} />
        </Form.Item>

        <Form.Item
          name="reservationTime"
          label="Thời gian đặt bàn"
          rules={[
            { required: true, message: 'Vui lòng chọn thời gian' },
            {
              validator: (_, value) => {
                if (value && value.isBefore(dayjs())) {
                  return Promise.reject(new Error('Phải sau thời gian hiện tại'));
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <DatePicker 
            showTime 
            format="DD/MM/YYYY HH:mm" 
            style={{ width: '100%' }} 
            disabledDate={current => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

        <Form.Item
          name="numberOfGuests"
          label="Số lượng khách"
          rules={[{ required: true, message: 'Vui lòng nhập số khách' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="note"
          label="Ghi chú"
        >
          <Input.TextArea placeholder="Nhập ghi chú (nếu có)" rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReservationEditModal;
