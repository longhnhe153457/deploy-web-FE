import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Row,
  Col,
  Statistic,
  Space,
  Modal,
  Typography,
  Divider,
  Form,
  Input,
  Tabs,
  message,
  Switch
} from 'antd';
import {
  CalendarOutlined,
  MessageOutlined,
  LogoutOutlined,
  HomeOutlined,
  CloseCircleOutlined,
  ShopOutlined,
  EditOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  LockOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  SendOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useSignalR } from '../../context/SignalRContext';
import {
  getCustomerReservations,
  updateCustomerProfile,
  sendCustomerResetOtp,
  resetCustomerPassword
} from '../../api/customerPortalApi';
import axiosInstance from '../../api/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const formatCurrency = (val) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
};

const CustomerDashboardPage = () => {
  const { customer, logout, updateCustomer } = useCustomerAuth();
  const connection = useSignalR();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Edit Profile & Password States
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('info');
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // OTP Forgot Password inside Dashboard
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpForm] = Form.useForm();

  const navigate = useNavigate();

  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await getCustomerReservations();
      setReservations(res.data);
    } catch (error) {
      message.error('Không thể tải lịch sử đặt bàn');
    } finally {
      setLoading(false);
    }
  };

  const fetchVouchers = async () => {
    setLoadingVouchers(true);
    try {
      const { getAvailableVouchers } = await import('../../api/voucherApi');
      const res = await getAvailableVouchers();
      // Lọc các voucher khả dụng cho customer này
      setVouchers(res || []);
    } catch (error) {
      console.error('Không thể tải danh sách voucher:', error);
    } finally {
      setLoadingVouchers(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    fetchVouchers();
  }, []);

  // Realtime SignalR listener for Customer
  useEffect(() => {
    if (connection && customer?.id) {
      connection.invoke('JoinCustomerGroup', customer.id).catch(console.error);

      const handleReservationUpdate = () => {
        fetchReservations();
      };

      const handleNotification = (data) => {
        if (
          data.type === 'new-reservation' ||
          data.type === 'reservation-updated' ||
          data.type === 'reservation-confirmed' ||
          data.type === 'reservation-cancelled' ||
          data.type === 'reservation-rejected'
        ) {
          fetchReservations();
          if (data.message) {
            message.info(data.message);
          }
        }
      };

      connection.on('ReceiveReservationUpdate', handleReservationUpdate);
      connection.on('ReceiveNotification', handleNotification);

      return () => {
        connection.off('ReceiveReservationUpdate', handleReservationUpdate);
        connection.off('ReceiveNotification', handleNotification);
      };
    }
  }, [connection, customer?.id]);

  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleOpenDetail = (record) => {
    setSelectedReservation(record);
    setDetailModalOpen(true);
  };

  const handleCancelReservation = (id) => {
    Modal.confirm({
      title: 'Hủy lịch đặt bàn',
      content: 'Bạn có chắc chắn muốn hủy yêu cầu đặt bàn này không?',
      okText: 'Hủy lịch',
      cancelText: 'Quay lại',
      okType: 'danger',
      onOk: async () => {
        try {
          await axiosInstance.put(`/api/CustomerPortal/reservations/${id}/cancel`);
          message.success('Đã hủy lịch đặt bàn thành công!');
          setDetailModalOpen(false);
          fetchReservations();
        } catch (error) {
          message.error(error.response?.data?.message || 'Không thể hủy lịch đặt bàn.');
        }
      }
    });
  };

  const handleOpenEditProfile = () => {
    profileForm.setFieldsValue({
      name: customer?.name || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      receivePromoEmails: customer?.receivePromoEmails !== false, // default true
    });
    passwordForm.resetFields();
    setActiveProfileTab('info');
    setEditProfileOpen(true);
  };

  const handleUpdateInfo = async (values) => {
    setEditProfileLoading(true);
    try {
      const res = await updateCustomerProfile({
        name: values.name,
        phone: values.phone,
        email: values.email || null,
        receivePromoEmails: values.receivePromoEmails
      });

      if (res.data && res.data.customer) {
        updateCustomer(res.data.customer);
      }
      message.success('Cập nhật thông tin cá nhân thành công!');
      setEditProfileOpen(false);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể cập nhật thông tin.');
    } finally {
      setEditProfileLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    setEditProfileLoading(true);
    try {
      await updateCustomerProfile({
        name: customer?.name,
        phone: customer?.phone,
        email: customer?.email,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });

      message.success('Đổi mật khẩu thành công!');
      passwordForm.resetFields();
      setEditProfileOpen(false);
    } catch (error) {
      message.error(error.response?.data?.message || 'Mật khẩu hiện tại không đúng hoặc có lỗi xảy ra.');
    } finally {
      setEditProfileLoading(false);
    }
  };

  // Gửi OTP qua Email khi quên mật khẩu
  const handleSendOtp = async () => {
    const targetEmail = customer?.email || profileForm.getFieldValue('email');
    if (!targetEmail) {
      message.warning('Tài khoản chưa có thông tin Email. Vui lòng cập nhật Email trước.');
      return;
    }

    setOtpLoading(true);
    try {
      await sendCustomerResetOtp(targetEmail);
      message.success(`Mã xác nhận OTP đã được gửi tới email ${targetEmail}`);
      setOtpCountdown(60);
      setOtpModalOpen(true);
      otpForm.setFieldsValue({ email: targetEmail });
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể gửi mã xác nhận qua Email.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResetPasswordWithOtp = async (values) => {
    setOtpLoading(true);
    try {
      await resetCustomerPassword({
        email: values.email,
        otpCode: values.otpCode,
        newPassword: values.newPassword
      });

      message.success('Đặt lại mật khẩu thành công!');
      setOtpModalOpen(false);
      setEditProfileOpen(false);
      otpForm.resetFields();
    } catch (error) {
      message.error(error.response?.data?.message || 'Mã xác nhận không đúng hoặc đã hết hạn.');
    } finally {
      setOtpLoading(false);
    }
  };

  const getStatusTag = (status) => {
    switch (status) {
      case 'Pending':
        return <Tag color="warning" style={{ fontSize: '13px', padding: '2px 10px', borderRadius: 4 }}>Chờ xác nhận</Tag>;
      case 'Confirmed':
        return <Tag color="processing" style={{ fontSize: '13px', padding: '2px 10px', borderRadius: 4 }}>Đã xác nhận</Tag>;
      case 'Completed':
        return <Tag color="success" style={{ fontSize: '13px', padding: '2px 10px', borderRadius: 4 }}>Đã đến</Tag>;
      case 'Cancelled':
        return <Tag color="default" style={{ fontSize: '13px', padding: '2px 10px', borderRadius: 4 }}>Đã hủy</Tag>;
      case 'Rejected':
        return <Tag color="error" style={{ fontSize: '13px', padding: '2px 10px', borderRadius: 4 }}>Bị từ chối</Tag>;
      default:
        return <Tag style={{ fontSize: '13px', padding: '2px 10px', borderRadius: 4 }}>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Mã phiếu',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (id) => <span style={{ fontWeight: 700, color: '#ea580c' }}>#{id}</span>
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (branchName, record) => {
        return (
          <span style={{ fontWeight: 600, color: '#1e293b' }}>
            {branchName || (record.branchId ? `Chi nhánh #${record.branchId}` : 'Chưa phân công')}
          </span>
        );
      }
    },
    {
      title: 'Thời gian hẹn',
      dataIndex: 'reservationTime',
      key: 'reservationTime',
      render: (time) => dayjs(time).format('DD/MM/YYYY HH:mm'),
      sorter: (a, b) => new Date(a.reservationTime) - new Date(b.reservationTime)
    },
    {
      title: 'Số khách',
      dataIndex: 'numberOfGuests',
      key: 'numberOfGuests',
      width: 100,
      render: (num) => <span>{num} người</span>
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      render: (note) => note || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 110,
      align: 'center',
      render: (_, record) => {
        const canCancel = record.status === 'Pending' || record.status === 'Confirmed';
        return canCancel ? (
          <Button
            type="link"
            danger
            icon={<CloseCircleOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleCancelReservation(record.id);
            }}
            style={{ fontWeight: 600, padding: 0 }}
          >
            Hủy lịch
          </Button>
        ) : (
          <span style={{ color: '#cbd5e1' }}>—</span>
        );
      }
    }
  ];

  const handleLogout = () => {
    logout();
    message.success('Đã đăng xuất tài khoản.');
    navigate('/welcome');
  };

  const preOrderColumns = [
    {
      title: 'Tên món',
      dataIndex: 'productName',
      key: 'productName',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'center'
    },
    {
      title: 'Đơn giá',
      dataIndex: 'price',
      key: 'price',
      width: 110,
      align: 'right',
      render: (price) => formatCurrency(price)
    },
    {
      title: 'Thành tiền',
      key: 'total',
      width: 120,
      align: 'right',
      render: (_, item) => (
        <span style={{ fontWeight: 600, color: '#ea580c' }}>
          {formatCurrency((item.price || 0) * (item.quantity || 0))}
        </span>
      )
    }
  ];

  const canCancelSelected = selectedReservation && (selectedReservation.status === 'Pending' || selectedReservation.status === 'Confirmed');

  return (
    <div
      style={{
        background: '#f8fafc',
        minHeight: '100vh',
        padding: '16px 24px',
        fontFamily: "'Be Vietnam Pro', sans-serif",
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        {/* Nút Về Trang Chủ đặt phía trên */}
        <div style={{ marginBottom: 12 }}>
          <Button
            type="link"
            icon={<HomeOutlined />}
            onClick={() => navigate('/welcome')}
            style={{
              color: '#ea580c',
              fontWeight: 600,
              padding: 0,
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Về trang chủ
          </Button>
        </div>

        {/* Header: Cổng Khách Hàng MenuGo & Đăng xuất */}
        <Row
          justify="space-between"
          align="middle"
          style={{
            marginBottom: 24,
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: 16,
          }}
        >
          <Col xs={18} sm={20}>
            <Title
              level={3}
              style={{
                margin: 0,
                color: '#0f172a',
                fontWeight: 700,
                fontSize: 'clamp(18px, 2.5vw, 24px)',
              }}
            >
              Cổng Khách Hàng MenuGo
            </Title>
          </Col>
          <Col xs={6} sm={4} style={{ textAlign: 'right' }}>
            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ fontWeight: 600 }}
            >
              Đăng xuất
            </Button>
          </Col>
        </Row>

        {/* Dashboard Grid */}
        <Row gutter={[24, 24]}>
          {/* Left profile info */}
          <Col xs={24} lg={8} xl={7}>
            <Card
              style={{
                borderRadius: 12,
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#fff',
                border: 'none',
                boxShadow: '0 4px 15px rgba(15, 23, 42, 0.15)',
              }}
              bodyStyle={{ padding: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 600 }}>
                  Xin chào, {customer?.name}!
                </Title>
              </div>

              <div style={{ marginBottom: 20, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '16px 20px' }}>
                <Statistic
                  title={<span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>ĐIỂM TÍCH LŨY</span>}
                  value={customer?.point || 0}
                  valueStyle={{ color: '#f97316', fontWeight: 800, fontSize: 32 }}
                  suffix={<span style={{ fontSize: 16, color: '#f97316', fontWeight: 600 }}> điểm</span>}
                />
              </div>

              <Space direction="vertical" size="small" style={{ width: '100%', fontSize: 13, color: '#cbd5e1' }}>
                <div><strong>Số điện thoại:</strong> {customer?.phone}</div>
                <div><strong>Email:</strong> {customer?.email || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa cập nhật</span>}</div>
                <div><strong>Thành viên từ:</strong> {dayjs(customer?.createdAt).format('DD/MM/YYYY')}</div>
              </Space>

              <Button
                icon={<EditOutlined />}
                onClick={handleOpenEditProfile}
                style={{
                  marginTop: 20,
                  width: '100%',
                  height: 38,
                  borderRadius: 8,
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(5px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                Chỉnh sửa thông tin
              </Button>
            </Card>

            <Card style={{ marginTop: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Title level={5} style={{ margin: '0 0 16px 0', color: '#334155' }}>
                Thao tác nhanh
              </Title>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button
                  type="primary"
                  icon={<CalendarOutlined />}
                  onClick={() => navigate('/customer/booking')}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 8,
                    fontWeight: 600,
                    background: '#ea580c',
                    borderColor: '#ea580c',
                  }}
                >
                  Đặt bàn trực tuyến
                </Button>
                <Button
                  type="default"
                  icon={<MessageOutlined />}
                  onClick={() => navigate('/customer/chat')}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 8,
                    fontWeight: 600,
                    color: '#ea580c',
                    borderColor: '#ea580c',
                  }}
                >
                  Nhắn tin với Chi nhánh
                </Button>
              </Space>
            </Card>
          </Col>

          {/* Right reservation list */}
          <Col xs={24} lg={16} xl={17}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Card
                title={<span style={{ fontWeight: 700, color: '#1e293b' }}>Lịch Sử Đặt Bàn</span>}
                style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                bodyStyle={{ padding: 16 }}
              >
                <div style={{ overflowX: 'auto' }}>
                  <Table
                    columns={columns}
                    dataSource={reservations}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 5 }}
                    locale={{ emptyText: 'Bạn chưa có yêu cầu đặt bàn nào.' }}
                    size="middle"
                    scroll={{ x: 650 }}
                    rowClassName={() => 'customer-reservation-row'}
                    onRow={(record) => ({
                      onClick: () => handleOpenDetail(record),
                      style: { cursor: 'pointer' }
                    })}
                  />
                </div>
              </Card>

              {/* Kho Voucher Khả Dụng */}
              <Card
                title={<span style={{ fontWeight: 700, color: '#1e293b' }}>Kho Voucher Ưu Đãi</span>}
                style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                bodyStyle={{ padding: 16 }}
                loading={loadingVouchers}
              >
                {vouchers.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    Hiện tại chưa có Voucher khả dụng nào.
                  </div>
                ) : (
                  <Row gutter={[16, 16]}>
                    {vouchers.map(v => (
                      <Col xs={24} sm={12} xl={8} key={v.id}>
                        <div style={{
                          border: '1px dashed #ea580c',
                          borderRadius: 8,
                          padding: 16,
                          background: '#fff7ed',
                          position: 'relative'
                        }}>
                          <div style={{ fontWeight: 700, color: '#ea580c', fontSize: 16, marginBottom: 4 }}>
                            {v.name}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                            Mã: <span style={{ padding: '2px 6px', background: '#ea580c', color: '#fff', borderRadius: 4 }}>{v.code}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#475569', marginTop: 8 }}>
                            Giảm {v.discountType === 'Percentage' ? `${v.discountValue}%` : formatCurrency(v.discountValue)}
                            <br />Đơn từ {formatCurrency(v.minOrderValue)}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 12 }}>
                            HSD: {dayjs(v.endDate).format('DD/MM/YYYY HH:mm')}
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                )}
              </Card>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Modal Chi Tiết Phiếu Đặt Bàn */}
      <Modal
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={560}
        centered
        title={
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            Phiếu Đặt Bàn #{selectedReservation?.id}
          </span>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingTop: 8 }}>
            <div>
              {canCancelSelected && (
                <Button
                  danger
                  type="primary"
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleCancelReservation(selectedReservation?.id)}
                  style={{ borderRadius: 8, fontWeight: 600 }}
                >
                  Hủy lịch
                </Button>
              )}
            </div>
            <Button
              type="default"
              onClick={() => setDetailModalOpen(false)}
              style={{ borderRadius: 8, padding: '0 24px', fontWeight: 600 }}
            >
              Đóng
            </Button>
          </div>
        }
      >
        {selectedReservation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 10 }}>
            
            {/* DÒNG 1: (ngày tạo phiếu) | (trạng thái) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, color: '#475569' }}>
                <span style={{ color: '#64748b' }}>Ngày tạo phiếu: </span>
                <strong>{dayjs(selectedReservation.createdAt).format('DD/MM/YYYY HH:mm')}</strong>
              </div>
              <div>
                {getStatusTag(selectedReservation.status)}
              </div>
            </div>

            {/* DÒNG 2: (tên chi nhánh) */}
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Chi nhánh
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ea580c', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShopOutlined />
                <span>{selectedReservation.branchName || `Chi nhánh #${selectedReservation.branchId}`}</span>
              </div>
            </div>

            {/* DÒNG 3: (thời gian hẹn) | (số lượng khách) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#fff7ed',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #ffedd5'
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: '#9a3412', fontWeight: 600 }}>Thời gian hẹn:</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#c2410c' }}>
                  {dayjs(selectedReservation.reservationTime).format('DD/MM/YYYY HH:mm')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#9a3412', fontWeight: 600 }}>Số lượng khách:</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#c2410c' }}>
                  {selectedReservation.numberOfGuests} người
                </div>
              </div>
            </div>

            {/* DÒNG 4: (Ghi chú) */}
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Ghi chú:
              </div>
              <div style={{ fontSize: 14, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {selectedReservation.note || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có ghi chú</span>}
              </div>
            </div>

            {/* Bàn phục vụ nếu đã phân công */}
            {selectedReservation.tableNames && selectedReservation.tableNames.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', padding: '0 4px' }}>
                <strong>Bàn phục vụ:</strong>
                <Space wrap size={[4, 4]}>
                  {selectedReservation.tableNames.map((tbl, i) => (
                    <Tag color="cyan" key={i} style={{ fontWeight: 600 }}>{tbl}</Tag>
                  ))}
                </Space>
              </div>
            )}

            {/* Món ăn đặt trước nếu có */}
            {selectedReservation.preOrderItems && selectedReservation.preOrderItems.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <Divider orientation="left" style={{ margin: '8px 0 12px 0', fontSize: 14, fontWeight: 700 }}>
                  Món ăn đặt trước ({selectedReservation.preOrderItems.length} món)
                </Divider>
                <Table
                  columns={preOrderColumns}
                  dataSource={selectedReservation.preOrderItems}
                  rowKey={(item, idx) => item.productId || idx}
                  pagination={false}
                  size="small"
                  bordered
                  summary={(pageData) => {
                    const total = pageData.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
                    return (
                      <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 700 }}>
                        <Table.Summary.Cell index={0} colSpan={3} style={{ textAlign: 'right' }}>
                          Tổng tiền món đặt trước:
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} style={{ textAlign: 'right', color: '#ea580c', fontSize: 14 }}>
                          {formatCurrency(total)}
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    );
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Chỉnh Sửa Thông Tin Cá Nhân & Đổi Mật Khẩu */}
      <Modal
        open={editProfileOpen}
        onCancel={() => setEditProfileOpen(false)}
        footer={null}
        width={520}
        centered
        title={
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            Hồ Sơ & Mật Khẩu
          </span>
        }
      >
        <Tabs
          activeKey={activeProfileTab}
          onChange={setActiveProfileTab}
          items={[
            {
              key: 'info',
              label: (
                <span style={{ fontWeight: 600 }}>
                  <UserOutlined /> Thông tin cá nhân
                </span>
              ),
              children: (
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={handleUpdateInfo}
                  style={{ marginTop: 12 }}
                >
                  <Form.Item
                    name="name"
                    label="Họ và tên"
                    rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                  >
                    <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Họ và tên" />
                  </Form.Item>

                  <Form.Item
                    name="phone"
                    label="Số điện thoại"
                    rules={[
                      { required: true, message: 'Vui lòng nhập số điện thoại!' },
                      { pattern: /^[0-9]{10}$/, message: 'Số điện thoại phải chứa 10 chữ số!' }
                    ]}
                  >
                    <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} placeholder="Số điện thoại" />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label="Địa chỉ Email"
                    rules={[{ type: 'email', message: 'Địa chỉ email không hợp lệ!' }]}
                  >
                    <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="Địa chỉ email (dùng để nhận OTP và thông báo)" />
                  </Form.Item>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                    <Form.Item
                      name="receivePromoEmails"
                      valuePropName="checked"
                      style={{ margin: 0 }}
                    >
                      <Switch />
                    </Form.Item>
                    <div>
                      <div style={{ fontWeight: 600, color: '#9a3412', fontSize: '14px' }}>Nhận thông báo ưu đãi</div>
                      <div style={{ fontSize: '12px', color: '#c2410c' }}>Đồng ý nhận email thông báo khi có Voucher hoặc Khuyến mãi mới</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                    <Button onClick={() => setEditProfileOpen(false)}>Hủy</Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={editProfileLoading}
                      style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 600 }}
                    >
                      Lưu thay đổi
                    </Button>
                  </div>
                </Form>
              )
            },
            {
              key: 'password',
              label: (
                <span style={{ fontWeight: 600 }}>
                  <LockOutlined /> Đổi mật khẩu
                </span>
              ),
              children: (
                <div>
                  <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handleChangePassword}
                    style={{ marginTop: 12 }}
                  >
                    <Form.Item
                      name="currentPassword"
                      label="Mật khẩu hiện tại"
                      rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
                    >
                      <Input.Password
                        prefix={<KeyOutlined style={{ color: '#94a3b8' }} />}
                        placeholder="Mật khẩu hiện tại"
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                      <Button
                        type="link"
                        onClick={handleSendOtp}
                        loading={otpLoading}
                        style={{ padding: 0, color: '#ea580c', fontWeight: 600 }}
                      >
                        Quên mật khẩu?
                      </Button>
                      <Space>
                        <Button onClick={() => setEditProfileOpen(false)}>Hủy</Button>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={editProfileLoading}
                          style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 600 }}
                        >
                          Đổi mật khẩu
                        </Button>
                      </Space>
                    </div>
                  </Form>
                </div>
              )
            }
          ]}
        />
      </Modal>

      {/* Modal Quên Mật Khẩu qua Email OTP */}
      <Modal
        open={otpModalOpen}
        onCancel={() => setOtpModalOpen(false)}
        footer={null}
        width={480}
        centered
        title={
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            Đặt Lại Mật Khẩu Qua Email OTP
          </span>
        }
      >
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Vui lòng nhập mã OTP 6 chữ số đã được gửi tới email của bạn và thiết lập mật khẩu mới.
          </Text>

          <Form
            form={otpForm}
            layout="vertical"
            onFinish={handleResetPasswordWithOtp}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email!' },
                { type: 'email', message: 'Email không hợp lệ!' }
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Địa chỉ Email"
                disabled
              />
            </Form.Item>

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
                placeholder="Nhập mã 6 chữ số"
                maxLength={6}
                style={{ fontSize: 16, letterSpacing: 4, fontWeight: 700 }}
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
              <Button
                type="text"
                disabled={otpCountdown > 0}
                onClick={handleSendOtp}
                style={{ fontSize: 13, color: otpCountdown > 0 ? '#94a3b8' : '#ea580c' }}
              >
                {otpCountdown > 0 ? `Gửi lại mã (${otpCountdown}s)` : 'Gửi lại mã OTP'}
              </Button>
              <Space>
                <Button onClick={() => setOtpModalOpen(false)}>Hủy</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={otpLoading}
                  style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 600 }}
                >
                  Xác nhận đặt lại
                </Button>
              </Space>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerDashboardPage;
