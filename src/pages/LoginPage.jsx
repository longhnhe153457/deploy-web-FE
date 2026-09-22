import { useState } from "react";
import { Form, Input, Button, Divider, message } from "antd";
import {
  UserOutlined,
  LockOutlined,
  DesktopOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  HomeOutlined,
} from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDevice } from "../context/DeviceContext";
import { login } from "../api/authApi";
import ForgotPasswordModal from "../components/auth/ForgotPasswordModal";

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);

  const { setAuth } = useAuth();
  const { isDeviceMode, deviceInfo } = useDevice();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const logoUrl = "/src/assets/logo.png";
  const backgroundlogoUrl = "/src/assets/background.png";

  //================================================================================================================= HANDLE LOGIN
  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const res = await login(values);
      const data = res.data;

      if (data.status === "success") {
        HandleLoginNavigate(data.user, data.token);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================================================= HANDLE LOGIN NAVIGATE
  const HandleLoginNavigate = (user, token) => {
    setAuth(token, user);
    message.success(` Chào mừng trở lại, ${user.name}! 👋`);
    navigate("/home");
  };

  return (
    <div className="login-page">
      {/*===================================================================================================== Background Image */}
      <div
        className="login-page-background"
        style={
          backgroundlogoUrl
            ? { backgroundImage: `url(${backgroundlogoUrl})` }
            : {}
        }
      />

      {/*=============================================================================================== Login card information */}
      <div className="login-card">
        <div className="login-logo">
          <Link to="/welcome" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="login-logo-icon-name" style={{ cursor: "pointer" }}>
              <div className="login-logo-icon">
                {logoUrl && logoUrl.trim() !== "" ? (
                  <img src={logoUrl} alt="Logo" />
                ) : (
                  "🍜"
                )}
              </div>
              <h1 className="login-logo-name">MenuGo</h1>
            </div>
          </Link>
          <p className="login-logo-subtitle">Hệ thống quản lý nhà hàng</p>
        </div>

        {/*========================================================================================================== ĐĂNG NHẬP */}
          <Form
            form={form}
            onFinish={handleLogin}
            layout="vertical"
            className="login-form"
            autoComplete="on"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Vui lòng nhập email" },
                { type: "email", message: "Email không hợp lệ" },
              ]}
            >
              <Input
                prefix={<UserOutlined className="login-input-icon" />}
                placeholder="Email"
                size="large"
                className="login-input"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
            >
              <Input.Password
                prefix={<LockOutlined className="login-input-icon" />}
                placeholder="Mật khẩu"
                size="large"
                className="login-input"
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
                autoComplete="current-password"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
              className="login-btn-primary"
            >
              {loading ? "Đang đăng nhập" : "Đăng nhập"}
            </Button>

            {/*============================================================================= Forgot Password and Welcome Links */}
            <div className="forgot-password-links-div" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <Link to="/welcome" style={{ color: "#e8442a", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}>
                <HomeOutlined /> Trang chào mừng
              </Link>
              <span 
                onClick={() => setForgotModalVisible(true)} 
                className="forgot-password-link" 
                style={{ cursor: "pointer", fontSize: 13 }}
              >
                Quên mật khẩu?
              </span>
            </div>
          </Form>

        {/*=============================================================================================== DEVICE AUTHORIZATION */}
        {/* {isDeviceMode && deviceInfo?.isActive && (
          <>
            <Divider className="login-divider">hoặc</Divider>
            <Button
              size="large"
              block
              icon={<DesktopOutlined />}
              className="login-btn-cashier"
              onClick={() => {
                switch (deviceInfo.deviceType) {
                  case 'POS': navigate('/pos'); break;
                  case 'Waiter': navigate('/station'); break;
                  case 'Kitchen': navigate('/kitchen'); break;
                  case 'Attendance': navigate('/attendance'); break;
                  default: navigate('/login');
                }
              }}
            >
              Vào chế độ {deviceInfo.deviceType === 'POS' ? 'Thu Ngân' : deviceInfo.deviceType === 'Waiter' ? 'Phục Vụ' : deviceInfo.deviceType === 'Kitchen' ? 'Bếp' : 'Điểm Danh'}
            </Button>
            <p className="login-device-note">
              Thiết bị này đã được xác lập: {deviceInfo.name}
            </p>
          </>
        )} */}
      </div>
      <ForgotPasswordModal 
        visible={forgotModalVisible} 
        onClose={() => setForgotModalVisible(false)} 
      />
    </div>
  );
};

export default LoginPage;
