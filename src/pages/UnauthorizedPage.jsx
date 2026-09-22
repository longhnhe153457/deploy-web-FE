import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
      <Result
        status="403"
        title="403 Forbidden"
        subTitle="Xin lỗi, bạn không có quyền truy cập vào trang này."
        extra={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button onClick={() => navigate(-1)}>
              Quay Lại Trang Trước
            </Button>
            <Button type="primary" onClick={() => navigate('/home')}>
              Trang Chủ
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default UnauthorizedPage;
