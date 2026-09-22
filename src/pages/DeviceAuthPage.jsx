import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Button, message, Result } from 'antd';
import { ScanOutlined } from '@ant-design/icons';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const DeviceAuthPage = () => {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (!user || !token) {
      message.warning('Bạn cần đăng nhập trên điện thoại trước khi quét mã.');
      navigate('/login', { state: { from: `/device-auth/${challengeId}` } });
    }
  }, [user, token, navigate, challengeId]);

  const handleScan = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post(
        '/api/Device/personal-login',
        { challengeId }
      );

      const data = response.data;
      if (!data.isPos && data.branchId) {
        localStorage.setItem('activeShiftBranchId', data.branchId);
        window.dispatchEvent(new Event('shiftUpdated'));
      }

      setSuccessData(data);
    } catch (e) {
      message.error(e.response?.data?.message || 'Không thể đăng nhập thiết bị. Mã QR có thể đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    if (!successData.success) {
      return (
        <div style={{ padding: 20, textAlign: 'center', maxWidth: 400, margin: '50px auto' }}>
          <Result
            status="error"
            title="Điểm danh thất bại!"
            subTitle={successData.message || "Bạn không có ca làm việc hôm nay tại chi nhánh này."}
            extra={[
              <Button type="primary" key="home" onClick={() => navigate('/')}>
                Về Trang Chủ
              </Button>
            ]}
          />
        </div>
      );
    } else if (successData.isPos) {
      return (
        <div style={{ padding: 20, textAlign: 'center', maxWidth: 400, margin: '50px auto' }}>
          <Result
            status="success"
            title="Đăng nhập thành công!"
            subTitle="Tài khoản của bạn đã được đăng nhập vào thiết bị Thu ngân thành công."
            extra={[
              <Button type="primary" key="home" onClick={() => navigate('/')}>
                Về Trang Chủ
              </Button>
            ]}
          />
        </div>
      );
    } else if (successData.isAttendance) {
      return (
        <div style={{ padding: 20, textAlign: 'center', maxWidth: 400, margin: '50px auto' }}>
          <Result
            status="success"
            title="Điểm danh thành công!"
            subTitle={successData.message}
            extra={[
              <Button type="primary" key="home" onClick={() => navigate('/')}>
                Về Trang Chủ
              </Button>
            ]}
          />
        </div>
      );
    } else {
      return (
        <div style={{ padding: 20, textAlign: 'center', maxWidth: 400, margin: '50px auto' }}>
          <Result
            status="success"
            title="Nhận ca thành công!"
            subTitle={successData.message || "Bạn đã kết nối thành công với trạm phục vụ."}
            extra={[
              <Button type="primary" key="waiter" onClick={() => navigate('/waiter-session')}>
                Bắt đầu Phục Vụ
              </Button>
            ]}
          />
        </div>
      );
    }
  }

  return (
    <div style={{ padding: 20, textAlign: 'center', maxWidth: 400, margin: '50px auto' }}>
      <ScanOutlined style={{ fontSize: 64, color: '#ff4d4f', marginBottom: 20 }} />
      <h2>Đăng Nhập Thiết Bị</h2>
      <p style={{ color: '#666', marginBottom: 30 }}>
        Bạn đang yêu cầu đăng nhập tài khoản <strong>{user?.email}</strong> vào thiết bị quán.
      </p>
      <Button
        type="primary"
        size="large"
        block
        onClick={handleScan}
        loading={loading}
      >
        Xác Nhận Đăng Nhập
      </Button>
    </div>
  );
};

export default DeviceAuthPage;
