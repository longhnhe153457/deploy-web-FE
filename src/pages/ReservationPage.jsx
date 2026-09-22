import React, { useState, useEffect } from 'react';
import { Card, Button, Tag, Space, message, Tabs, Modal, Typography, DatePicker, Row, Col, Empty, Tooltip } from 'antd';
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import { getReservations, checkInReservation, cancelReservation } from '../api/reservationApi';
import ReservationFormModal from '../components/reservation/ReservationFormModal';
import ReservationEditModal from '../components/reservation/ReservationEditModal';
import AssignTableModal from '../components/reservation/AssignTableModal';
import dayjs from 'dayjs';
import { useBranch } from '../context/BranchContext';
import { useSignalR } from '../context/SignalRContext';
import '../styles/ReservationPage.css';

const { Title, Text } = Typography;

const ReservationPage = ({ isPosHub }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [assigningReservation, setAssigningReservation] = useState(null);


  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [activeTab, setActiveTab] = useState('All');

  const { currentBranchId } = useBranch();
  const connection = useSignalR();
  const [now, setNow] = useState(dayjs());

  const fetchReservations = React.useCallback(async () => {
    setLoading(true);
    try {
      // Pass selectedDate formatted as ISO string (or YYYY-MM-DD depending on backend parsing)
      const data = await getReservations(currentBranchId, selectedDate ? selectedDate.toISOString() : null);
      setReservations(data);
    } catch (error) {
      message.error('Không thể tải danh sách đặt bàn');
    } finally {
      setLoading(false);
    }
  }, [currentBranchId, selectedDate]);

  useEffect(() => {
    fetchReservations();

    const interval = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(interval);
  }, [fetchReservations]);

  // Realtime SignalR listener
  useEffect(() => {
    if (connection && currentBranchId) {
      connection.invoke('JoinBranchGroup', currentBranchId).catch(console.error);

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
          if (data.type === 'new-reservation') {
            message.info(data.message || 'Có yêu cầu đặt bàn mới!');
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
  }, [connection, currentBranchId, fetchReservations]);

  const handleCheckIn = async (id) => {
    Modal.confirm({
      title: 'Xác nhận khách đã đến',
      content: 'Hệ thống sẽ mở bàn và chuyển trạng thái bàn sang "Đang phục vụ". Bạn có chắc chắn không?',
      onOk: async () => {
        try {
          await checkInReservation(id);
          message.success('Khách đã đến. Các bàn đã được mở!');
          fetchReservations();
        } catch (error) {
          message.error(error.response?.data?.message || 'Check-in thất bại');
        }
      }
    });
  };

  const handleCancel = async (id) => {
    Modal.confirm({
      title: 'Xác nhận hủy lịch',
      content: 'Lịch đặt bàn này sẽ bị hủy và bàn sẽ được giải phóng. Bạn có chắc chắn không?',
      okType: 'danger',
      onOk: async () => {
        try {
          await cancelReservation(id);
          message.success('Đã hủy lịch đặt bàn thành công!');
          fetchReservations();
        } catch (error) {
          message.error(error.response?.data?.message || 'Hủy thất bại');
        }
      }
    });
  };



  const filteredReservations = reservations.filter(r => {
    const isSameDate = dayjs(r.reservationTime).isSame(selectedDate, 'day');
    if (activeTab !== 'Pending' && !isSameDate) return false;

    if (activeTab === 'All') return true;
    return r.status === activeTab;
  }).sort((a, b) => dayjs(a.reservationTime).diff(dayjs(b.reservationTime)));

  const renderReservationCard = (r) => {
    const rTime = dayjs(r.reservationTime);
    const diffMinutes = rTime.diff(now, 'minute');
    const isPending = r.status === 'Pending';
    const isConfirmed = r.status === 'Confirmed';
    const isActive = isPending || isConfirmed;

    const canCheckIn = isConfirmed && diffMinutes <= 30;

    const isLate = isActive && diffMinutes < 0;

    const isWarning = isActive && diffMinutes >= 0 && diffMinutes <= 30;

    let cardBorderColor = '#e8e8e8';
    let cardBg = '#fff';

    if (isWarning) {
      cardBorderColor = '#faad14';
      cardBg = '#fffbe6';
    } else if (isLate) {
      cardBorderColor = '#ff4d4f';
      cardBg = '#fff1f0';
    } else if (r.status === 'Completed') {
      cardBorderColor = '#52c41a';
      cardBg = '#f6ffed';
    }

    const getStatusTag = () => {
      if (r.status === 'Pending') return <Tag color="processing">Chờ xác nhận</Tag>;
      if (r.status === 'Confirmed') return <Tag color="warning">Chờ đến</Tag>;
      if (r.status === 'Completed') return <Tag color="success">Đã đến</Tag>;
      if (r.status === 'Cancelled') return <Tag color="error">Đã hủy</Tag>;
      return null;
    };

    return (
      <Col xs={24} sm={12} md={12} lg={8} xl={6} key={r.id}>
        <Card
          hoverable
          style={{ borderColor: cardBorderColor, backgroundColor: cardBg }}
          className="reservation-card"
          headStyle={{ borderBottom: `1px solid ${cardBorderColor}`, backgroundColor: 'transparent' }}
          title={
            <Space>
              <span className="reservation-card-time">{rTime.format('HH:mm')}</span>
              {getStatusTag()}
            </Space>
          }
          extra={
            isActive && (
              <Space>
                <Button type="text" style={{ color: '#1890ff' }} size="small" onClick={() => {
                  setEditingReservation(r);
                  setIsEditModalVisible(true);
                }} title="Sửa thông tin">
                  <EditOutlined />
                </Button>
                <Button type="text" danger size="small" onClick={() => handleCancel(r.id)} title="Hủy lịch">
                  <CloseCircleOutlined />
                </Button>
              </Space>
            )
          }
        >
          <div className="card-customer-header">
            <div className="card-customer-name">{r.customerName}</div>
            <div className="card-customer-phone">📞 {r.customerPhone}</div>
          </div>

          <Row className="card-row">
            <Col span={12}><Text type="secondary">Số lượng:</Text> <br /> <b>{r.numberOfGuests} người</b></Col>
            <Col span={12}><Text type="secondary">Bàn xếp:</Text> <br /> <b>{r.tableNames?.join(', ') || 'Chưa xếp'}</b></Col>
          </Row>

          <div className="card-note">
            <Text type="secondary">Ghi chú:</Text>{' '}
            {r.note ? (
              <Tooltip title={r.note} placement="topLeft">
                <span className="card-note-text">{r.note}</span>
              </Tooltip>
            ) : (
              <Text type="secondary" italic>Không có</Text>
            )}
          </div>

          {/* Hành động thông minh */}
          {isActive && (
            <div className="card-action-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isPending && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  <Button block type="primary" onClick={() => {
                    setAssigningReservation(r);
                    setIsAssignModalVisible(true);
                  }} style={{ height: 40, borderRadius: 8, fontWeight: 600 }}>
                    Xác Nhận & Xếp Bàn
                  </Button>
                  <Button block type="dashed" onClick={() => {
                    setEditingReservation(r);
                    setIsEditModalVisible(true);
                  }} style={{ height: 40, borderRadius: 8, borderColor: '#1890ff', color: '#1890ff' }}>
                    Sửa Thông Tin
                  </Button>
                </div>
              )}
              {isConfirmed && (!r.tableNames || r.tableNames.length === 0) && (
                <Button block onClick={() => {
                  setAssigningReservation(r);
                  setIsAssignModalVisible(true);
                }} style={{ height: 40, borderRadius: 8 }}>
                  Xếp Bàn
                </Button>
              )}
              {isConfirmed && canCheckIn && (
                <Button type="primary" block size="middle" onClick={() => handleCheckIn(r.id)} style={{ fontWeight: 600, height: 40, borderRadius: 8 }}>
                  Khách đã đến (Check-in)
                </Button>
              )}
              {isConfirmed && !canCheckIn && (
                <Button block size="middle" disabled style={{ height: 40, borderRadius: 8 }}>
                  Chưa đến giờ (còn {diffMinutes} phút)
                </Button>
              )}
            </div>
          )}
        </Card>
      </Col>
    );
  };

  const tabs = [
    { key: 'All', label: `Tất cả (${reservations.filter(r => dayjs(r.reservationTime).isSame(selectedDate, 'day')).length})` },
    { key: 'Pending', label: 'Chờ xác nhận' },
    { key: 'Confirmed', label: 'Chờ đến' },
    { key: 'Completed', label: 'Đã đến' },
    { key: 'Cancelled', label: 'Đã hủy' }
  ];

  return (
    <div className={`reservation-container ${isPosHub ? 'compact-padding' : 'full-padding'}`}>

      {/* Header Bar */}
      <div className="reservation-header">
        <Space size="large">
          {!isPosHub && <Title level={3} style={{ margin: 0 }}>Quản Lý Đặt Bàn</Title>}

          <Space>
            <Text strong>Ngày xem:</Text>
            <DatePicker
              value={selectedDate}
              onChange={(date) => setSelectedDate(date || dayjs())}
              format="DD/MM/YYYY"
              allowClear={false}
            />
          </Space>
        </Space>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setIsModalVisible(true)}
        >
          Thêm Đặt Bàn
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="reservation-content-area">
        <>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} style={{ marginBottom: 16 }} />
          {filteredReservations.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px 0' }}>
              <Empty description={`Không có đặt bàn nào vào ngày ${selectedDate.format('DD/MM/YYYY')} (${activeTab})`} />
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {filteredReservations.map(r => renderReservationCard(r))}
            </Row>
          )}
        </>
      </div>

      <ReservationFormModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onSuccess={() => {
          setIsModalVisible(false);
          fetchReservations();
        }}
      />

      <ReservationEditModal
        visible={isEditModalVisible}
        reservation={editingReservation}
        onClose={() => {
          setIsEditModalVisible(false);
          setEditingReservation(null);
        }}
        onSuccess={() => {
          setIsEditModalVisible(false);
          setEditingReservation(null);
          fetchReservations();
        }}
      />

      <AssignTableModal
        visible={isAssignModalVisible}
        reservation={assigningReservation}
        onClose={() => {
          setIsAssignModalVisible(false);
          setAssigningReservation(null);
        }}
        onSuccess={() => {
          setIsAssignModalVisible(false);
          setAssigningReservation(null);
          fetchReservations();
        }}
      />
    </div>
  );
};

export default ReservationPage;
