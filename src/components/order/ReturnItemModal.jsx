import React, { useState, useRef, useEffect } from 'react';
import { Modal, InputNumber, Input, Form, message, Select, Switch } from 'antd';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { getChefs } from '../../api/accountApi';
import { requestReturnItem } from '../../api/orderApi';

const ReturnItemModal = ({ visible, item, onCancel, onSuccess, isCustomerMode = false }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const actionRef = useRef(false);
  const [chefAccounts, setChefAccounts] = useState([]);
  
  const { user } = useAuth();
  const { currentBranchId } = useBranch();
  const branchId = currentBranchId || user?.branchId;
  
  // handlingAction now represents the Switch (true = Reuse, false = Discard)
  const isHandlingReuse = Form.useWatch('handlingAction', form);
  const returnReason = Form.useWatch('returnReason', form);

  useEffect(() => {
    const fetchChefs = async () => {
      if (!branchId || !visible) return;
      try {
        const res = await getChefs(branchId);
        setChefAccounts(res.data || []);
      } catch (err) {
        console.error('Failed to fetch chef accounts', err);
      }
    };
    fetchChefs();
  }, [branchId, visible]);

  if (!item) return null;

  const maxReturnable = item.quantity - (item.returnedQuantity || 0);

  const getReasonOptions = () => {
    // Nếu là đồ thường/đóng gói và chọn Tái sử dụng: được phép chọn lý do mở rộng
    if ((item.productType === 'Regular' || item.productType === 'Manufactured') && isHandlingReuse) {
      return [
        { value: 'Khách gọi dư', label: 'Khách gọi dư' },
        { value: 'Nhân viên bấm nhầm', label: 'Nhân viên bấm nhầm' },
        { value: 'Bàn hủy món phút chót', label: 'Bàn hủy món phút chót' },
        { value: 'Lý do khác', label: 'Lý do khác' }
      ];
    }
    // Các trường hợp còn lại (Processed hoặc Huỷ): Chỉ các lỗi do nhà hàng
    return [
      { value: 'Ra món chậm', label: 'Ra món chậm' },
      { value: 'Thức ăn nguội/kém chất lượng', label: 'Thức ăn nguội/kém chất lượng' },
      { value: 'Có dị vật', label: 'Có dị vật' },
      { value: 'Nhân viên làm đổ', label: 'Nhân viên làm đổ' },
      { value: 'Lên sai món', label: 'Lên sai món' },
      { value: 'Bao bì rách/hỏng', label: 'Bao bì rách/hỏng' },
      { value: 'Lý do khác', label: 'Lý do khác' }
    ];
  };

  const handleHandlingChange = (checked) => {
    form.setFieldsValue({
      handlingAction: checked,
    });
  };

  const handleOk = async () => {
    if (actionRef.current) return;
    actionRef.current = true;
    try {
      const values = await form.validateFields();
      setLoading(true);

      let finalReason = values.returnReason;
      if (values.returnReason === 'Lý do khác') {
        finalReason = values.otherReason;
      }

      const isReuse = values.handlingAction === true;

      const payload = {
        orderDetailId: item.orderDetailId,
        returnQuantity: values.returnQuantity,
        returnReason: finalReason,
        isIntact: isReuse, // Derived implicitly: Reuse means it was intact
        handlingAction: isReuse ? 'Reuse' : 'Discard',
        atFaultAccountId: values.atFaultAccountId,
      };

      if (isCustomerMode) {
        await axiosInstance.post(`/api/Order/details/${item.orderDetailId}/customer-request-return`, payload);
      } else {
        await requestReturnItem(item.orderDetailId, payload);
      }

      message.success('Đã gửi yêu cầu trả món thành công!');
      form.resetFields();
      onSuccess();
    } catch (error) {
      if (error.errorFields) return; // validation error
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi yêu cầu trả món!');
    } finally {
      setLoading(false);
      actionRef.current = false;
    }
  };

  return (
    <Modal
      title={`Trả món: ${item.productName}`}
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      okText="Xác nhận trả"
      cancelText="Hủy"
    >
      <div style={{ marginBottom: 16 }}>
        <p><strong>Số lượng đã gọi:</strong> {item.quantity}</p>
        <p><strong>Số lượng có thể trả:</strong> {maxReturnable}</p>
      </div>

      <Form form={form} layout="vertical" initialValues={{ returnQuantity: 1, handlingAction: true }}>
        <Form.Item
          name="returnQuantity"
          label="Số lượng trả"
          rules={[
            { required: true, message: 'Vui lòng nhập số lượng trả!' },
            { type: 'number', min: 1, max: maxReturnable, message: `Số lượng trả phải từ 1 đến ${maxReturnable}!` }
          ]}
        >
          <InputNumber min={1} max={maxReturnable} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="handlingAction" valuePropName="checked" label="Hướng xử lý">
          <Switch
            checkedChildren="Tái sử dụng"
            unCheckedChildren="Không sử dụng"
            onChange={handleHandlingChange}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
            Hàng tái sử dụng sẽ được cộng lại vào kho nếu là mặt hàng Thường.
          </div>
        </Form.Item>

        {item.productType !== 'Regular' && item.productType !== 'Manufactured' && (
          <Form.Item name="atFaultAccountId" label="Bếp làm sai (nếu có)">
            <Select
              allowClear
              showSearch
              placeholder="Chọn bếp làm sai..."
              optionFilterProp="label"
              options={chefAccounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </Form.Item>
        )}

        <Form.Item
          name="returnReason"
          label="Lý do trả"
          rules={[{ required: true, message: 'Vui lòng chọn lý do trả món!' }]}
          style={{ marginBottom: returnReason === 'Lý do khác' ? 8 : 24 }}
        >
          <Select
            placeholder="Chọn lý do trả món..."
            options={getReasonOptions()}
          />
        </Form.Item>

        {returnReason === 'Lý do khác' && (
          <Form.Item
            name="otherReason"
            rules={[{ required: true, message: 'Vui lòng nhập chi tiết lý do!' }]}
            style={{ marginBottom: 24 }}
          >
            <Input.TextArea rows={2} placeholder="Vui lòng nhập chi tiết lý do..." />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default ReturnItemModal;
