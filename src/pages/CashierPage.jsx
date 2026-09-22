import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  Tabs,
  Select,
  message,
  Statistic,
} from 'antd';
import {
  DollarOutlined,
  BookOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CreditCardOutlined,
  PayCircleOutlined,
} from '@ant-design/icons';
import { getAllOrders } from '../api/orderApi';
import { getAllShifts } from '../api/shiftApi';
import TableMapPage from './TableMapPage';
import ReservationPage from './ReservationPage';
import ShiftStatsPanel from '../components/payment/ShiftStatsPanel';
import { useSignalR } from '../context/SignalRContext';
import { useBranch } from '../context/BranchContext';

const { Title, Text } = Typography;

const CashierPage = () => {
  const [activeTab, setActiveTab] = useState('CHECKOUT');

  const [orders, setOrders] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { currentBranchId } = useBranch();

  // SignalR Connection
  const signalRConnection = useSignalR();

  // Cashier join on_duty group để nhận thông báo order
  useEffect(() => {
    if (!signalRConnection || !currentBranchId) return;
    signalRConnection.invoke('JoinOnDuty', currentBranchId).catch(console.error);
    return () => {
      signalRConnection.invoke('LeaveOnDuty', currentBranchId).catch(console.error);
    };
  }, [signalRConnection, currentBranchId]);

  // Fetch Orders and Shifts
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [oRes, sRes] = await Promise.allSettled([
        getAllOrders(currentBranchId),
        getAllShifts(),
      ]);

      if (oRes.status === 'fulfilled') setOrders(oRes.value.data || []);
      if (sRes.status === 'fulfilled') setShifts(sRes.value.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải dữ liệu quầy thu ngân.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // SignalR Listener for real-time order/payment updates
  useEffect(() => {
    if (!signalRConnection) return;

    const handleNotif = (notif) => {
      if (
        notif.type === 'cooking-status-changed' ||
        notif.type === 'new-order' ||
        notif.type === 'order-cancelled' ||
        notif.type === 'PaymentWebhook' ||
        notif.Type === 'PaymentWebhook'
      ) {
        fetchData(false);
      }
    };

    signalRConnection.on('ReceiveNotification', handleNotif);
    return () => {
      signalRConnection.off('ReceiveNotification', handleNotif);
    };
  }, [signalRConnection, fetchData]);

  // Active / Pending Checkout Orders (ONLY Orders that are non-empty and in checkout state)
  // const pendingOrders = useMemo(() => {
  //   return orders.filter(
  //     (o) =>
  //       (o.status === 'Active' ||
  //         o.status === 'Serving' ||
  //         o.status === 'Pending' ||
  //         o.status === 'Unpaid' ||
  //         o.status === 'CustomerPending') &&
  //       (o.totalAmount > 0 || o.finalAmount > 0) &&
  //       !o.fatherId
  //   );
  // }, [orders]);

  // Paid Today Orders
  const paidTodayOrders = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter(
      (o) =>
        (o.status === 'Paid' || o.status === 'Completed') &&
        o.createdAt &&
        new Date(o.createdAt).toDateString() === today &&
        !o.fatherId
    );
  }, [orders]);

  return (
    <div className="cashier-page" style={{ padding: '24px' }}>
      {/* ── HEADER QUẦY THU NGÂN CHUẨN MỰC ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={3} style={{ margin: 0 }}>Quầy Thu Ngân</Title>
        <Space size="middle">
          {/* <Tag icon={<SafetyCertificateOutlined />} color="success" style={{ fontSize: 13, padding: '4px 10px' }}>
            Thiết bị đã xác thực
          </Tag> */}
          <Button icon={<ReloadOutlined />} onClick={() => {
            fetchData(true);
            setRefreshKey(prev => prev + 1);
          }}>
            Làm mới
          </Button>
        </Space>
      </div>

      {/* ── MAIN WORKSPACE TABS ─────────────────────────────────────────────── */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'CHECKOUT',
            label: (
              <span>
                <DollarOutlined /> Thanh Toán Hóa Đơn
              </span>
            ),
          },
          {
            key: 'RESERVATION',
            label: (
              <span>
                <BookOutlined /> Quản Lý Đặt Bàn
              </span>
            ),
          },
          {
            key: 'SHIFT_STATS',
            label: (
              <span>
                <ThunderboltOutlined /> Thống Kê Ca Thu Ngân ({paidTodayOrders.length} HĐ đã thu)
              </span>
            ),
          },
        ]}
      />

      {/* ── TAB 1: MÀN HÌNH THANH TOÁN HÓA ĐƠN (CHỈ DÙNG SƠ ĐỒ BÀN) ────────── */}
      {activeTab === 'CHECKOUT' && (
        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
          <TableMapPage key={`tablemap-${refreshKey}`} isPosHub={true} />
        </Card>
      )}

      {/* ── TAB 2: QUẢN LÝ ĐẶT BÀN ───────────────────────────────────────────── */}
      {activeTab === 'RESERVATION' && (
        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
          <ReservationPage key={`reservation-${refreshKey}`} isPosHub={true} />
        </Card>
      )}

      {/* ── TAB 3: THỐNG KÊ CA THU NGÂN ─────────────────────────────────────── */}
      {activeTab === 'SHIFT_STATS' && (
        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 24 }}>
          <ShiftStatsPanel shifts={shifts} paidTodayOrders={paidTodayOrders} loading={loading} />
        </Card>
      )}
    </div>
  );
};

export default CashierPage;
