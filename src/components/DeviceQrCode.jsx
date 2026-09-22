import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axiosInstance from '../api/axiosInstance';
import { Spin } from 'antd';
import { useDevice } from '../context/DeviceContext';
import '../styles/deviceqrcode.css';

const DeviceQrCode = () => {
  const [challengeId, setChallengeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { deviceToken } = useDevice();

  const fetchChallenge = async () => {
    if (!deviceToken) return;
    try {
      setLoading(true);
      const res = await axiosInstance.post('/api/Device/auth/challenge', {
        deviceToken
      });
      setChallengeId(res.data.challengeId);
    } catch (e) {
      console.error('Lỗi khi lấy mã QR đăng nhập', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenge();
    // Refresh QR code every 2.5 minutes (150000ms)
    const interval = setInterval(fetchChallenge, 150000);
    return () => clearInterval(interval);
  }, [deviceToken]);

  if (!deviceToken) return null;

  return (
    <div className="device-qr-container">
      <div className="device-qr-title">Đăng Nhập Nhanh</div>
      <div className="device-qr-code">
        {loading ? (
          <Spin />
        ) : challengeId ? (
          <QRCodeSVG 
            value={`${window.location.origin}/device-auth/${challengeId}`} 
            size={120} 
            level="M" 
          />
        ) : (
          <div className="device-qr-error">Lỗi QR</div>
        )}
      </div>
      <div className="device-qr-desc">
        Quét bằng camera điện thoại
        {challengeId && (
          <div style={{ marginTop: '8px' }}>
            <a href={`${window.location.origin}/device-auth/${challengeId}`} target="_blank" rel="noreferrer">
              (Hoặc click vào đây để test)
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceQrCode;
