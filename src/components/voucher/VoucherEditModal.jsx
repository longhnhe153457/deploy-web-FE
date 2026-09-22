import React from 'react';
import { Modal, Form, Input, Select, InputNumber, DatePicker, Switch, message } from 'antd';
import dayjs from 'dayjs';
import { updateVoucher } from '../../api/voucherApi';
import { useAuth, ROLES } from '../../context/AuthContext';

const { Option } = Select;

const VoucherEditModal = ({ visible, onClose, onSuccess, branches, editingVoucher }) => {
  const { hasRole } = useAuth();
  const isOwnerOrAdmin = hasRole(ROLES.OWNER, ROLES.ADMIN);
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (visible && editingVoucher) {
      form.setFieldsValue({
        ...editingVoucher,
        startDate: dayjs(editingVoucher.startDate),
        endDate: dayjs(editingVoucher.endDate)
      });
    } else {
      form.resetFields();
    }
  }, [visible, editingVoucher, form]);

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

  const handleOk = () => {
    form.validateFields().then(async (values) => {
      setLoading(true);
      try {
        const payload = {
          ...values,
          startDate: values.startDate.toISOString(),
          endDate: values.endDate.toISOString(),
          id: editingVoucher.id
        };

        await updateVoucher(payload);
        message.success('Cập nhật khuyến mãi thành công');
        form.resetFields();
        onSuccess();
        onClose();
      } catch (error) {
        message.error(error.response?.data?.message || 'Lỗi xử lý');
      } finally {
        setLoading(false);
      }
    });
  };

  const hasBeenUsed = editingVoucher?.usedCount > 0;

  return (
    <Modal
      title="Cập nhật Khuyến mãi"
      open={visible}
      maskClosable={false}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
    >
      <Form form={form} layout="vertical">
        {hasBeenUsed && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16, border: '1px solid #f87171' }}>
            <strong>Lưu ý:</strong> Voucher này đã được khách hàng sử dụng trong giao dịch. Bạn chỉ có thể thay đổi Tên, Thời gian áp dụng, Số lượng phát hành, Giới hạn dùng/khách và Trạng thái.
          </div>
        )}

        <Form.Item name="code" label="Mã Voucher" rules={[{ required: true, message: 'Vui lòng nhập mã Voucher' }]}>
          <Input placeholder="VD: SUMMER2026" disabled={hasBeenUsed} />
        </Form.Item>
        
        <Form.Item name="name" label="Tên Chương trình" rules={[{ required: true, message: 'Vui lòng nhập tên CTKM' }]}>
          <Input placeholder="Khuyến mãi mùa hè" />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="discountType" label="Loại giảm giá" style={{ flex: 1 }}>
            <Select disabled={hasBeenUsed}>
              <Option value="Percentage">Theo phần trăm (%)</Option>
              <Option value="Fixed">Số tiền cố định (đ)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="discountValue" label="Giá trị giảm" rules={[{ required: true, message: 'Nhập giá trị' }]} style={{ flex: 1 }}>
            <InputNumber style={{ width: '100%' }} min={0} disabled={hasBeenUsed} />
          </Form.Item>
        </div>

        <Form.Item noStyle dependencies={['discountType']}>
          {({ getFieldValue }) => (
            getFieldValue('discountType') === 'Percentage' ? (
              <Form.Item name="maxDiscount" label="Giảm tối đa (đ)">
                <InputNumber style={{ width: '100%' }} min={0} disabled={hasBeenUsed} />
              </Form.Item>
            ) : null
          )}
        </Form.Item>

        <Form.Item name="minOrderValue" label="Đơn hàng tối thiểu (đ)">
          <InputNumber style={{ width: '100%' }} min={0} disabled={hasBeenUsed} />
        </Form.Item>

        {isOwnerOrAdmin && (
          <Form.Item name="branchId" label="Chi nhánh áp dụng (Để trống = Toàn hệ thống)">
            <Select allowClear placeholder="Chọn chi nhánh" disabled={hasBeenUsed}>
              {branches
                .filter((b) => !b.isDeleted && b.status !== 'Ngừng kinh doanh')
                .map((b) => (
                  <Option key={b.id} value={b.id}>{b.name}</Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]} style={{ flex: 1 }}>
            <DatePicker 
              style={{ width: '100%' }} 
              showTime 
              format="DD/MM/YYYY HH:mm" 
              disabled={hasBeenUsed}
            />
          </Form.Item>

          <Form.Item name="endDate" label="Đến ngày" rules={[{ required: true, message: 'Chọn ngày kết thúc' }]} style={{ flex: 1 }}>
            <DatePicker 
              style={{ width: '100%' }} 
              showTime 
              format="DD/MM/YYYY HH:mm" 
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="quantity" label="Số lượng phát hành" rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>

          <Form.Item name="maxUsagePerCustomer" label="Giới hạn dùng/khách" style={{ flex: 1 }}>
            <InputNumber style={{ width: '100%' }} min={1} placeholder="Không giới hạn" />
          </Form.Item>

          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default VoucherEditModal;
