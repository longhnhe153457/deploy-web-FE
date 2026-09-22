import { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Select, Button, message } from 'antd';
import { setupDevice } from '../api/deviceApi';
import { getAllBranches } from '../api/branchApi';
import { useDevice } from '../context/DeviceContext';
import { useAuth, ROLES } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DeviceSetupPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const { setupDevice: contextSetupDevice } = useDevice();
  const { logout, user, role } = useAuth();
  const navigate = useNavigate();

  const isAdminOrOwner = role === ROLES.ADMIN || role === ROLES.OWNER;

  useEffect(() => {
    if (isAdminOrOwner) {
      const fetchBranches = async () => {
        try {
          const res = await getAllBranches();
          setBranches(res.data);
        } catch (err) {
          message.error('Lỗi khi tải danh sách chi nhánh');
        }
      };
      fetchBranches();
    }
  }, [isAdminOrOwner]);

  const isSubmittingRef = useRef(false);

  const handleFinish = async (values) => {
    if (isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const payload = {
        name: values.name,
        deviceType: values.deviceType,
        ...(isAdminOrOwner && values.branchId ? { branchId: values.branchId } : {})
      };

      const res = await setupDevice(payload);
      const { deviceToken, deviceInfo } = res.data;
      
      message.success(`Xác lập thiết bị thành công: ${deviceInfo.name}`);
      
      contextSetupDevice(deviceToken, deviceInfo);

      setTimeout(async () => {
        try { await logout(); } catch (_) { /* ignore */ }
        
        const targetPath = {
          POS: '/pos',
          Waiter: '/station', 
          Kitchen: '/kitchen',
          Attendance: '/attendance'
        }[deviceInfo.deviceType] || '/login';
        
        window.location.href = targetPath;
      }, 200);

    } catch (error) {
      message.error(error.response?.data?.message || 'Xác lập thiết bị thất bại');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
      <Card title="Xác Lập Thiết Bị Này" style={{ width: '100%', maxWidth: 500 }}>
        <p style={{ marginBottom: 24, color: '#666' }}>
          Hành động này sẽ biến trình duyệt hiện tại thành một thiết bị của quán (Device Mode).
          Tài khoản quản lý của bạn sẽ được tự động đăng xuất sau khi xác lập thành công.
        </p>

        <Form form={form} layout="vertical" onFinish={handleFinish}>
          {isAdminOrOwner && (
            <Form.Item
              name="branchId"
              label="Chi nhánh"
              rules={[{ required: true, message: 'Vui lòng chọn chi nhánh' }]}
            >
              <Select placeholder="-- Chọn chi nhánh --">
                {branches.map(b => (
                  <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label="Tên thiết bị (VD: Máy 1 - Quầy Thu Ngân)"
            rules={[{ required: true, message: 'Vui lòng nhập tên thiết bị' }]}
          >
            <Input placeholder="Nhập tên thiết bị..." />
          </Form.Item>

          <Form.Item
            name="deviceType"
            label="Loại thiết bị"
            rules={[{ required: true, message: 'Vui lòng chọn loại thiết bị' }]}
          >
            <Select placeholder="-- Chọn loại thiết bị --">
              <Select.Option value="POS">Máy Thu Ngân (POS)</Select.Option>
              <Select.Option value="Waiter">Máy Phục Vụ (Sơ đồ bàn)</Select.Option>
              <Select.Option value="Kitchen">Màn Hình Bếp</Select.Option>
              <Select.Option value="Attendance">Máy Điểm Danh</Select.Option>
            </Select>
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={loading}>
            Xác Lập Thiết Bị
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default DeviceSetupPage;
