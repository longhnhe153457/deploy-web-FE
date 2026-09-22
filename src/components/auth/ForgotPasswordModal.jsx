import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Button, Steps, message, notification, Space } from "antd";
import { MailOutlined, KeyOutlined, LockOutlined } from "@ant-design/icons";
import { forgotPassword, verifyResetOtp, resetPassword } from "../../api/authApi";

const ForgotPasswordModal = ({ visible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const [form1] = Form.useForm();
  const [form2] = Form.useForm();
  const [form3] = Form.useForm();

  // Đếm ngược gửi lại mã
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Reset modal state khi đóng/mở
  useEffect(() => {
    if (!visible) {
      setCurrentStep(1);
      setEmail("");
      setOtp("");
      setResendTimer(0);
      form1.resetFields();
      form2.resetFields();
      form3.resetFields();
    }
  }, [visible, form1, form2, form3]);

  // ── STEP 1: Gửi yêu cầu OTP ────────────────────────────────────────────────
  const handleStep1Submit = async (values) => {
    setLoading(true);
    try {
      await forgotPassword(values.email);
      setEmail(values.email);
      message.success("Mã xác thực đã được gửi tới email của bạn!");
      setResendTimer(60);
      setCurrentStep(2);
    } catch (error) {
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi gửi mã.");
    } finally {
      setLoading(false);
    }
  };

  // ── Gửi lại OTP ────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await forgotPassword(email);
      message.success("Mã xác thực mới đã được gửi!");
      setResendTimer(60);
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể gửi lại mã.");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: Xác thực OTP ───────────────────────────────────────────────────
  const handleStep2Submit = async (values) => {
    setLoading(true);
    try {
      await verifyResetOtp({ email, otp: values.otp });
      setOtp(values.otp);
      message.success("Mã xác thực hợp lệ!");
      setCurrentStep(3);
    } catch (error) {
      message.error(error.response?.data?.message || "Mã xác thực không chính xác hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: Đặt mật khẩu mới ───────────────────────────────────────────────
  const handleStep3Submit = async (values) => {
    setLoading(true);
    try {
      await resetPassword({
        email,
        otp,
        newPassword: values.password
      });

      notification.success({
        message: "Đặt lại mật khẩu thành công",
        description: "Mật khẩu của bạn đã được thay đổi. Hãy dùng mật khẩu mới để đăng nhập.",
        placement: "top",
        duration: 5
      });

      onClose();
    } catch (error) {
      message.error(error.response?.data?.message || "Đặt lại mật khẩu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      title={null}
      footer={null}
      onCancel={onClose}
      destroyOnClose
      centered
      width={480}
      styles={{
        body: { padding: "24px 12px 12px 12px" }
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: "#1f1f1f", marginBottom: 4 }}>
          {currentStep === 1 && "Quên mật khẩu"}
          {currentStep === 2 && "Xác thực Email"}
          {currentStep === 3 && "Đặt mật khẩu mới"}
        </h2>
        <p style={{ color: "#8c8c8c", margin: 0, fontSize: 14 }}>
          {currentStep === 1 && "Nhập Email đăng nhập để nhận mã OTP."}
          {currentStep === 2 && `Một mã xác thực gồm 6 số đã được gửi tới ${email}.`}
          {currentStep === 3 && "Vui lòng nhập mật khẩu mới bảo mật của bạn."}
        </p>
      </div>

      <Steps
        current={currentStep - 1}
        size="small"
        style={{ marginBottom: 32, padding: "0 12px" }}
        items={[
          { title: "Email" },
          { title: "Mã OTP" },
          { title: "Mật khẩu" }
        ]}
      />

      {/* ── BƯỚC 1: EMAIL ──────────────────────────────────────────────────────── */}
      {currentStep === 1 && (
        <Form form={form1} layout="vertical" onFinish={handleStep1Submit} requiredMark={false}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email đăng nhập" },
              { type: "email", message: "Email không đúng định dạng" }
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Nhập email của bạn"
              size="large"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={onClose} size="large" style={{ borderRadius: 6 }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ borderRadius: 6 }}>
                Tiếp tục
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}

      {/* ── BƯỚC 2: OTP ────────────────────────────────────────────────────────── */}
      {currentStep === 2 && (
        <Form form={form2} layout="vertical" onFinish={handleStep2Submit} requiredMark={false}>
          <Form.Item
            name="otp"
            rules={[
              { required: true, message: "Vui lòng nhập mã xác thực" },
              { len: 6, message: "Mã xác thực phải đúng 6 số" }
            ]}
          >
            <Input
              prefix={<KeyOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Nhập mã OTP 6 số"
              size="large"
              maxLength={6}
              style={{ borderRadius: 6, textAlign: "center", letterSpacing: 8, fontSize: 18 }}
            />
          </Form.Item>

          <div style={{ textAlign: "center", marginBottom: 24 }}>
            {resendTimer > 0 ? (
              <span style={{ color: "#8c8c8c" }}>
                Gửi lại mã sau <strong>{resendTimer}s</strong>
              </span>
            ) : (
              <Button type="link" onClick={handleResendOtp} disabled={loading} style={{ padding: 0 }}>
                Gửi lại mã
              </Button>
            )}
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Button onClick={() => setCurrentStep(1)} size="large" style={{ borderRadius: 6 }}>
                Quay lại
              </Button>
              <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ borderRadius: 6 }}>
                Xác nhận
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}

      {/* ── BƯỚC 3: RESET PASSWORD ─────────────────────────────────────────────── */}
      {currentStep === 3 && (
        <Form form={form3} layout="vertical" onFinish={handleStep3Submit} requiredMark={false}>
          <Form.Item
            name="password"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 8, message: "Mật khẩu phải chứa ít nhất 8 ký tự" },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: "Mật khẩu cần ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số"
              }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Mật khẩu mới"
              size="large"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Mật khẩu xác nhận không trùng khớp!"));
                }
              })
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Xác nhận mật khẩu"
              size="large"
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large" loading={loading} block style={{ borderRadius: 6 }}>
              Đổi mật khẩu
            </Button>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default ForgotPasswordModal;
