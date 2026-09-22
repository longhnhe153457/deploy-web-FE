import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Modal } from 'antd';
import { UserOutlined, PhoneOutlined, LockOutlined, MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { registerCustomer } from '../../api/customerPortalApi';

const { Title, Text, Link } = Typography;

const CustomerRegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await registerCustomer({
        phone: values.phone,
        name: values.name,
        password: values.password,
        email: values.email || null,
      });

      Modal.success({
        title: 'Đăng ký thành công!',
        content: 'Tài khoản của bạn đã được đăng ký thành công. Hệ thống sẽ tự động liên kết với lịch sử mua hàng trước đây bằng số điện thoại này (nếu có) để bảo lưu điểm tích lũy của bạn.',
        okText: 'Đăng nhập ngay',
        onOk: () => {
          navigate('/customer/login');
        }
      });
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.');
    } finally {
      setLoading(false);
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
          onClick={() => navigate('/customer/login')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
        >
          Quay lại đăng nhập
        </Button>
      </div>

      <Card
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 16,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.5)'
        }}
        bodyStyle={{ padding: '36px 28px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={2} style={{ margin: '0 0 8px 0', color: '#1e293b', fontWeight: 700 }}>
            Đăng Ký Tài Khoản
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Tích điểm nhận quà và nhận nhiều ưu đãi độc quyền từ MenuGo
          </Text>
        </div>

        <Form name="customer_register" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên của bạn!' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Họ và tên"
            />
          </Form.Item>

          <Form.Item
            name="phone"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: /^[0-9]{10}$/, message: 'Số điện thoại phải chứa đúng 10 chữ số!' }
            ]}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Số điện thoại"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[{ type: 'email', message: 'Địa chỉ email không hợp lệ!' }]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Địa chỉ email (dùng để nhận OTP khôi phục mật khẩu)"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
              { min: 6, message: 'Mật khẩu phải chứa ít nhất 6 ký tự!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Mật khẩu (ít nhất 6 ký tự)"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Nhập lại mật khẩu"
            />
          </Form.Item>

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
              Đăng Ký Tài Khoản
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Đã có tài khoản?{' '}
            <Link onClick={() => navigate('/customer/login')} style={{ color: '#ea580c', fontWeight: 600 }}>
              Đăng nhập
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default CustomerRegisterPage;
