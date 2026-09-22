import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { updateDevice } from '../../api/deviceApi';

const DeviceEditModal = ({ visible, onClose, onSuccess, editingDevice }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (visible && editingDevice) {
      form.setFieldsValue({
        name: editingDevice.name,
        deviceType: editingDevice.deviceType
      });
    } else {
      form.resetFields();
    }
  }, [visible, editingDevice, form]);

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

  const handleUpdate = async (values) => {
    setLoading(true);
    try {
      await updateDevice({ 
        ...values, 
        id: editingDevice.id,
        isActive: editingDevice.isActive 
      });
      message.success('Cập nhật thông tin thiết bị thành công');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err) {
      message.error('Lỗi khi cập nhật thiết bị');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Chỉnh sửa thiết bị"
      open={visible}
      maskClosable={false}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical" onFinish={handleUpdate}>
        <Form.Item 
          name="name" 
          label="Tên thiết bị" 
          rules={[{ required: true, message: 'Vui lòng nhập tên thiết bị' }]}
        >
          <Input placeholder="Ví dụ: Máy Waiter 01" />
        </Form.Item>
        <Form.Item 
          name="deviceType" 
          label="Loại thiết bị"
          rules={[{ required: true, message: 'Vui lòng chọn loại thiết bị' }]}
        >
          <Select>
            <Select.Option value="POS">Thu ngân (POS)</Select.Option>
            <Select.Option value="Waiter">Phục vụ (Waiter)</Select.Option>
            <Select.Option value="Kitchen">Bếp (Kitchen)</Select.Option>
            <Select.Option value="Attendance">Điểm danh (Attendance)</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DeviceEditModal;
