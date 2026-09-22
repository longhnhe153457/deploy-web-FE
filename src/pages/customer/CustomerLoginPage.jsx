import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Modal, message, Space } from 'antd';
import {
  PhoneOutlined,
  LockOutlined,
  ArrowLeftOutlined,
  MailOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { loginCustomer, sendCustomerResetOtp, resetCustomerPassword } from '../../api/customerPortalApi';

const { Title, Text, Link } = Typography;

const CustomerLoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useCustomerAuth();

  // Forgot Password States
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Send OTP, 2: Reset Password
  const [forgotLoading, setForgotLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [targetEmail, setTargetEmail] = useState('');
  const [forgotForm1] = Form.useForm();
  const [forgotForm2] = Form.useForm();

  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await loginCustomer({
        phone: values.phone,
        password: values.password,
      });
      if (res.data && res.data.token) {
        setAuth(res.data.token, res.data.customer);
        message.success('Đăng nhập thành công!');
        navigate('/customer/dashboard');
      } else {
        message.error('Thông tin đăng nhập không hợp lệ');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Số điện thoại hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotStep(1);
    setTargetEmail('');
    forgotForm1.resetFields();
    forgotForm2.resetFields();
    setForgotModalOpen(true);
  };

  const handleSendForgotOtp = async (values) => {
    setForgotLoading(true);
    try {
      await sendCustomerResetOtp(values.email);
      setTargetEmail(values.email);
      setForgotStep(2);
      setOtpCountdown(60);
      forgotForm2.setFieldsValue({ email: values.email });
      message.success(`Mã OTP đã được gửi tới email ${values.email}`);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không tìm thấy tài khoản với email này.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!targetEmail) return;
    setForgotLoading(true);
    try {
      await sendCustomerResetOtp(targetEmail);
      setOtpCountdown(60);
      message.success('Đã gửi lại mã OTP qua email.');
    } catch (error) {
      message.error(error.response?.data?.message || 'Gửi lại mã thất bại.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (values) => {
    setForgotLoading(true);
    try {
      await resetCustomerPassword({
        email: targetEmail || values.email,
        otpCode: values.otpCode,
        newPassword: values.newPassword
      });

      message.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.');
      setForgotModalOpen(false);
    } catch (error) {
      message.error(error.response?.data?.message || 'Mã xác nhận không đúng hoặc đã hết hạn.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fca5a5 100%)',
        padding: '24px',
        fontFamily: "'Be Vietnam Pro', sans-serif"
      }}
    >
      <div style={{ position: 'absolute', top: 24, left: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/welcome')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
        >
          Quay lại trang chủ
        </Button>
      </div>

      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.5)'
        }}
        bodyStyle={{ padding: '36px 28px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/favicon.ico"
            alt="MenuGo"
            onError={(e) => { e.target.style.display = 'none'; }}
            style={{ width: 64, height: 64, marginBottom: 12, borderRadius: 12 }}
          />
          <Title level={2} style={{ margin: '0 0 8px 0', color: '#1e293b', fontWeight: 700 }}>
            Đăng Nhập Khách Hàng
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Chào mừng bạn đến với Cổng khách hàng thân thiết MenuGo
          </Text>
        </div>

        <Form name="customer_login" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="phone"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: /^[0-9]{10}$/, message: 'Số điện thoại phải có 10 chữ số!' }
            ]}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Số điện thoại"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Mật khẩu"
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <Link
              onClick={handleOpenForgotModal}
              style={{ color: '#ea580c', fontSize: 13, fontWeight: 500 }}
            >
              Quên mật khẩu?
            </Link>
          </div>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                borderColor: '#ea580c',
                height: 48,
                borderRadius: 8,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.2)'
              }}
            >
              Đăng Nhập
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Chưa có tài khoản?{' '}
            <Link onClick={() => navigate('/customer/register')} style={{ color: '#ea580c', fontWeight: 600 }}>
              Đăng ký ngay
            </Link>
          </Text>
        </div>
      </Card>

      {/* Modal Quên Mật Khẩu qua Email OTP */}
      <Modal
        open={forgotModalOpen}
        onCancel={() => setForgotModalOpen(false)}
        footer={null}
        width={460}
        centered
        title={
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            Khôi Phục Mật Khẩu
          </span>
        }
      >
        {forgotStep === 1 ? (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Nhập địa chỉ Email đã đăng ký để nhận mã xác nhận (OTP) đặt lại mật khẩu.
            </Text>

            <Form
              form={forgotForm1}
              layout="vertical"
              onFinish={handleSendForgotOtp}
              style={{ marginTop: 20 }}
              size="large"
            >
              <Form.Item
                name="email"
                label="Địa chỉ Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email!' },
                  { type: 'email', message: 'Địa chỉ email không hợp lệ!' }
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="example@domain.com"
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <Button onClick={() => setForgotModalOpen(false)}>Hủy</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={forgotLoading}
                  style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 600 }}
                >
                  Gửi mã OTP
                </Button>
              </div>
            </Form>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Mã xác nhận 6 chữ số đã được gửi tới <strong>{targetEmail}</strong>. Vui lòng kiểm tra hộp thư.
            </Text>

            <Form
              form={forgotForm2}
              layout="vertical"
              onFinish={handleResetPassword}
              style={{ marginTop: 20 }}
              size="large"
            >
              <Form.Item
                name="otpCode"
                label="Mã xác nhận (OTP)"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã OTP!' },
                  { len: 6, message: 'Mã OTP gồm 6 chữ số!' }
                ]}
              >
                <Input
                  prefix={<CheckCircleOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Mã 6 chữ số"
                  maxLength={6}
                  style={{ fontSize: 18, letterSpacing: 6, textAlign: 'center', fontWeight: 700 }}
                />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                  { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Xác nhận mật khẩu mới"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Nhập lại mật khẩu mới"
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                <Button
                  type="text"
                  disabled={otpCountdown > 0}
                  onClick={handleResendOtp}
                  style={{ fontSize: 13, color: otpCountdown > 0 ? '#94a3b8' : '#ea580c', padding: 0 }}
                >
                  {otpCountdown > 0 ? `Gửi lại mã (${otpCountdown}s)` : 'Gửi lại mã OTP'}
                </Button>
                <Space>
                  <Button onClick={() => setForgotStep(1)}>Quay lại</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={forgotLoading}
                    style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 600 }}
                  >
                    Đổi mật khẩu
                  </Button>
                </Space>
              </div>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerLoginPage;
