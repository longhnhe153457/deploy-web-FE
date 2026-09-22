import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { employeeLogin } from '../api/deviceApi';
import { useDevice } from '../context/DeviceContext';
import DeviceQrCode from './DeviceQrCode';

const DeviceEmployeeLoginModal = ({ open, onCancel, onSuccess, prefillEmail }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { deviceToken, loginEmployee } = useDevice();

  useEffect(() => {
    if (prefillEmail) {
      form.setFieldsValue({ email: prefillEmail });
    }
  }, [prefillEmail, form]);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      const res = await employeeLogin({
        deviceToken,
        email: values.email,
        code: values.code
      });

      message.success(`Đăng nhập thành công: ${res.data.employee.name}`);
      loginEmployee(res.data.employee);

      form.resetFields(['code']);
      if (!prefillEmail) form.resetFields(['email']);

      if (onSuccess) onSuccess(res.data.employee);
    } catch (error) {
      message.error(error.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Đăng Nhập Nhân Viên (Xác thực 2FA)"
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      footer={null}
      destroyOnHidden
      width={600}
    >
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 20, color: '#666' }}>
            {prefillEmail ? (
              <p>Mã QR đã được quét! Hệ thống sẽ tự động đăng nhập cho tài khoản <strong>{prefillEmail}</strong>.</p>
            ) : (
              <p>Vui lòng nhập Email và mã 2FA từ ứng dụng Authenticator để bắt đầu phiên làm việc.</p>
            )}
            <p><em>Lưu ý: Bạn phải thuộc chi nhánh của thiết bị này.</em></p>
          </div>

          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Form.Item
              name="email"
              label="Email Nhân Viên"
              initialValue={prefillEmail}
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' }
              ]}
            >
              <Input placeholder="nv1@menugo.com" disabled={!!prefillEmail} />
            </Form.Item>

            <Form.Item
              name="code"
              label="Mã 2FA (Authenticator)"
              rules={[{ required: true, message: 'Vui lòng nhập mã 2FA' }]}
            >
              <Input.OTP length={6} />
            </Form.Item>

            <Button type="primary" htmlType="submit" block loading={loading} style={{ marginTop: 10 }}>
              Xác nhận
            </Button>
          </Form>
        </div>

        {!prefillEmail && (
          <div style={{ width: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid #f0f0f0', paddingLeft: '20px', position: 'relative' }}>
            <DeviceQrCode />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DeviceEmployeeLoginModal;
