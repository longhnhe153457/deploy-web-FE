import React from 'react';
import { Modal, Form, Input, Select, InputNumber, DatePicker, Switch, message } from 'antd';
import { createVoucher } from '../../api/voucherApi';
import dayjs from 'dayjs';

const { Option } = Select;
import { useAuth, ROLES } from '../../context/AuthContext';

const VoucherCreateModal = ({ visible, onClose, onSuccess, branches }) => {
  const { hasRole } = useAuth();
  const isOwnerOrAdmin = hasRole(ROLES.OWNER, ROLES.ADMIN);
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        discountType: 'Percentage',
        isActive: true,
        quantity: 100,
        minOrderValue: 0
      });
    }
  }, [visible, form]);

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
        if (values.startDate.isBefore(dayjs().subtract(2, 'minute'))) {
          message.error('Thời gian bắt đầu không được ở trong quá khứ');
          setLoading(false);
          return;
        }
        if (values.endDate.isBefore(values.startDate)) {
          message.error('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
          setLoading(false);
          return;
        }

        const payload = {
          ...values,
          startDate: values.startDate.toISOString(),
          endDate: values.endDate.toISOString(),
        };

        await createVoucher(payload);
        message.success('Thêm khuyến mãi thành công');
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

  return (
    <Modal
      title="Tạo Khuyến mãi mới"
      open={visible}
      maskClosable={false}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="code" label="Mã Voucher" rules={[{ required: true, message: 'Vui lòng nhập mã Voucher' }]}>
          <Input placeholder="VD: SUMMER2026" />
        </Form.Item>
        
        <Form.Item name="name" label="Tên Chương trình" rules={[{ required: true, message: 'Vui lòng nhập tên CTKM' }]}>
          <Input placeholder="Khuyến mãi mùa hè" />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="discountType" label="Loại giảm giá" style={{ flex: 1 }}>
            <Select>
              <Option value="Percentage">Theo phần trăm (%)</Option>
              <Option value="Fixed">Số tiền cố định (đ)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="discountValue" label="Giá trị giảm" rules={[{ required: true, message: 'Nhập giá trị' }]} style={{ flex: 1 }}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </div>

        <Form.Item noStyle dependencies={['discountType']}>
          {({ getFieldValue }) => (
            getFieldValue('discountType') === 'Percentage' ? (
              <Form.Item name="maxDiscount" label="Giảm tối đa (đ)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            ) : null
          )}
        </Form.Item>

        <Form.Item name="minOrderValue" label="Đơn hàng tối thiểu (đ)">
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>

        {isOwnerOrAdmin && (
          <Form.Item name="branchId" label="Chi nhánh áp dụng (Để trống = Toàn hệ thống)">
            <Select allowClear placeholder="Chọn chi nhánh">
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
              disabledDate={(current) => current && current < dayjs().startOf('day')}
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

export default VoucherCreateModal;
