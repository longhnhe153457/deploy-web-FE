import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Tag,
  Badge,
  Space,
  Tabs,
  Typography,
  message,
  Alert,
  Spin,
  Tooltip,
  Popconfirm,
  Modal,
  Table,
} from 'antd';
import {
  FireOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { getKitchenItems, updateCookingStatus, batchUpdateCookingStatus, cancelOrderDetail, reuseLeftoverForOrderDetail } from '../api/kitchenApi';
import { getReusableLeftovers, getLeftoverRecordsByBranch } from '../api/leftoverApi';
import { useSignalR } from '../context/SignalRContext';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';

import { useBranch } from '../context/BranchContext';

const { Title, Text } = Typography;

// ─── Unified visual language for the whole Kitchen (KDS) screen ───────────
// One background, one border, one shadow, one text-color scheme for every
// card/panel on this page. Status colors (red/orange/green/blue) are kept
// as functional accents (tags, badges, action buttons) — they signal state,
// not stylistic drift.
const KDS_STYLE = {
  cardBg: '#ffffff',
  border: '1px solid #f0f0f0',
  radius: 12,
  shadow: '0 2px 8px rgba(0,0,0,0.06)',
  textPrimary: '#000000',
  textSecondary: '#595959',
};

// Standard cooking status definitions
const COOKING_STATUS = {
  WAITING: 'Waiting',   // Món mới (New)
  ACCEPTED: 'Accepted', // Đã nhận
  COOKING: 'Cooking',   // Đang nấu
  READY: 'Ready',       // Đã xong / Hoàn thành
};

const KDSPage = () => {
  const { user } = useAuth();
  const { deviceInfo } = useDevice();
  const { currentBranchId: contextBranchId } = useBranch();
  
  const currentBranchId = deviceInfo?.branchId || contextBranchId || user?.branchId || user?.contracts?.find((c) => (c.status === 'Active' || c.status === 1) && c.branchId)?.branchId;

  const [items, setItems] = useState([]);
  const [reusableLeftovers, setReusableLeftovers] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [viewMode, setViewMode] = useState('COLUMN'); // 'COLUMN' (Chia dọc) or 'GRID' (Grid/Tab)
  const [cancelledAlerts, setCancelledAlerts] = useState([]);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  // Món khách trả (nhân viên ghi nhận ở trang Trả món) — bếp chỉ xem để biết, không
  // thao tác gì trên danh sách này (khác với gợi ý "dùng lại món thừa" ở trên).
  const [returnedItems, setReturnedItems] = useState([]);
  const [showReturnedItemsModal, setShowReturnedItemsModal] = useState(false);
  const signalRConnection = useSignalR();

  // Join branch-specific SignalR group
  useEffect(() => {
    if (signalRConnection && currentBranchId) {
      signalRConnection
        .invoke('JoinBranchGroup', Number(currentBranchId))
        .catch((err) => console.log('JoinBranchGroup error:', err));
    }
  }, [signalRConnection, currentBranchId]);

  // Helper sound generator for EX-1 (Cancellation Warning & New Order Warning)
  const playAlertSound = useCallback((type = 'cancel') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'cancel') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15); // A4
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // Browser autoplay restriction fallback
    }
  }, []);

  // Fetch kitchen items
  const fetchItems = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await getKitchenItems(currentBranchId);
      const data = res.data || [];
      // Sort chronologically from oldest to newest
      const sorted = [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setItems(sorted);
    } catch (err) {
      console.error('Lỗi khi tải danh sách bếp:', err);
      message.error('Không thể tải danh sách chế biến món ăn.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    fetchItems(true);
    // Auto refresh fallback every 15 seconds
    const interval = setInterval(() => fetchItems(false), 15000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  // Món thừa (khách trả, bếp đã làm xong, còn trong 30p) — gợi ý dùng lại thay vì
  // nấu trùng khi có món đang chờ chế biến khớp đúng sản phẩm + số lượng.
  const fetchReusableLeftovers = useCallback(async () => {
    if (!currentBranchId) return;
    try {
      const res = await getReusableLeftovers(currentBranchId);
      setReusableLeftovers(res.data || []);
    } catch {
      // Chỉ là gợi ý — im lặng bỏ qua, không chặn luồng bếp
    }
  }, [currentBranchId]);

  useEffect(() => {
    fetchReusableLeftovers();
    const interval = setInterval(fetchReusableLeftovers, 20000);
    return () => clearInterval(interval);
  }, [fetchReusableLeftovers]);

  useEffect(() => {
    if (reusableLeftovers.length === 0) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, [reusableLeftovers.length]);

  // Danh sách món khách trả trong ngày — chỉ để bếp xem, không thao tác.
  const fetchReturnedItems = useCallback(async () => {
    if (!currentBranchId) return;
    try {
      const res = await getLeftoverRecordsByBranch(currentBranchId, { type: 'Return' });
      setReturnedItems(res.data || []);
    } catch {
      // Chỉ để xem — im lặng bỏ qua, không chặn luồng bếp
    }
  }, [currentBranchId]);

  useEffect(() => {
    fetchReturnedItems();
    const interval = setInterval(fetchReturnedItems, 30000);
    return () => clearInterval(interval);
  }, [fetchReturnedItems]);

  // SignalR real-time event listener
  useEffect(() => {
    if (!signalRConnection) return;

    const handleNotification = (notif) => {
      console.log('KDS Notification received:', notif);

      // Branch isolation check: Bỏ qua nếu thông báo thuộc chi nhánh khác
      if (notif.branchId && currentBranchId && Number(notif.branchId) !== Number(currentBranchId)) {
        console.log('KDS Notification ignored due to branch mismatch:', notif.branchId, 'vs', currentBranchId);
        return;
      }

      if (notif.type === 'new-order' || notif.type === 'new-item') {
        playAlertSound('new');
        message.info(`🔔 Món mới từ ${notif.tableName || 'khách hàng'}!`);
        fetchItems(false);
      } else if (notif.type === 'item-cancelled' || notif.type === 'order-cancelled') {
        playAlertSound('cancel');
        const alertMsg = notif.message || `Món ăn #${notif.orderDetailId || ''} đã bị HỦY từ ngoài!`;
        setCancelledAlerts((prev) => [
          { id: Date.now(), message: alertMsg, timestamp: new Date().toLocaleTimeString('vi-VN') },
          ...prev,
        ]);
        fetchItems(false);
      } else if (notif.type === 'cooking-status-changed') {
        fetchItems(false);
      } else if (notif.type === 'leftover-return') {
        playAlertSound('new');
        message.warning(notif.message || `Bàn ${notif.tableName || '?'} vừa trả món!`);
        fetchReturnedItems();
        fetchReusableLeftovers();
      }
    };

    signalRConnection.on('ReceiveNotification', handleNotification);

    return () => {
      signalRConnection.off('ReceiveNotification', handleNotification);
    };
  }, [signalRConnection, fetchItems, playAlertSound, currentBranchId, fetchReturnedItems, fetchReusableLeftovers]);

  // Single Item Status Change Handler
  const handleStatusChange = async (detailIdOrIds, nextStatus, quantity = null) => {
    try {
      if (Array.isArray(detailIdOrIds)) {
        await Promise.all(detailIdOrIds.map(id => updateCookingStatus(id, nextStatus)));
      } else {
        await updateCookingStatus(detailIdOrIds, nextStatus, quantity);
      }
      
      const statusLabels = {
        [COOKING_STATUS.ACCEPTED]: 'Đã nhận món',
        [COOKING_STATUS.COOKING]: 'Đã chuyển sang Đang nấu',
        [COOKING_STATUS.READY]: 'Đã hoàn thành chế biến',
      };
      message.success(statusLabels[nextStatus] || 'Đã cập nhật trạng thái');
      fetchItems(false);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.response?.data?.detail || 'Lỗi khi cập nhật trạng thái món.';
      message.error(errorMsg);
    }
  };

  const handleBatchStatusChange = async (productId, nextStatus) => {
    try {
      const res = await batchUpdateCookingStatus(productId, nextStatus);
      if (res.data?.failed > 0) {
        // Một số món trong mẻ không bắt đầu được (vd: thiếu nguyên liệu) — báo rõ lý do.
        message.warning(res.data.message, 8);
      } else {
        message.success('Đã xác nhận toàn bộ mẻ thành công');
      }
      fetchItems(false);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.response?.data?.detail || 'Lỗi khi cập nhật trạng thái mẻ.';
      message.error(errorMsg);
    }
  };

  // Single Item Cancel Handler
  const handleCancelItem = async (detailId) => {
    try {
      await cancelOrderDetail(detailId);
      message.success('Đã hủy món ăn thành công');
      fetchItems(false);
    } catch (err) {
      console.error(err);
      message.error('Không thể hủy món. Món đã chế biến xong hoặc đã bị hủy.');
    }
  };



  // Dùng lại món thừa khớp đúng món + số lượng cho một món đang chờ chế biến —
  // dừng chế biến luôn thay vì để bếp nấu trùng.
  const handleReuseLeftover = async (item, leftover) => {
    try {
      await reuseLeftoverForOrderDetail(item.orderDetailId, leftover.id);
      message.success(`Đã dùng lại ${leftover.productName} vừa trả — dừng chế biến món này.`);
      setReusableLeftovers((prev) => prev.filter((l) => l.id !== leftover.id));
      fetchItems(false);
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.message || 'Không thể dùng lại món thừa cho món này.');
    }
  };

  const visibleItems = items;

  const waitingItems = useMemo(() => visibleItems.filter((i) => !i.cookingStatus || i.cookingStatus === COOKING_STATUS.WAITING), [visibleItems]);
  const acceptedItems = useMemo(() => visibleItems.filter((i) => i.cookingStatus === COOKING_STATUS.ACCEPTED), [visibleItems]);
  const cookingItems = useMemo(() => visibleItems.filter((i) => i.cookingStatus === COOKING_STATUS.COOKING).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)), [visibleItems]);
  const readyItems = useMemo(() => visibleItems.filter((i) => i.cookingStatus === COOKING_STATUS.READY).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)), [visibleItems]);

  const batchableItems = useMemo(() => {
    const combined = [...waitingItems, ...acceptedItems];
    const grouped = {};
    const now = new Date();
    
    combined.forEach(item => {
      // Bỏ qua các món đã tạo quá 30 phút (không cho vào mẻ nữa)
      if (item.createdAt) {
        const minutes = (now - new Date(item.createdAt)) / 60000;
        if (minutes > 30) return;
      }

      const key = item.productId || item.productName;
      if (!grouped[key]) {
        grouped[key] = {
          productId: item.productId,
          productName: item.productName || item.ProductName,
          totalQty: 0,
        };
      }
      grouped[key].totalQty += item.quantity;
    });
    // Đưa lên tất cả món đang chờ/đã nhận trong 30 phút gần nhất, kể cả món lẻ
    // (chỉ 1 bàn đặt) — vẫn coi là 1 mẻ để bếp xử lý đồng bộ qua thanh này.
    return Object.values(grouped);
  }, [waitingItems, acceptedItems]);



  // Chỉ những món được nấu qua thanh "Chế biến theo lô / mẻ" mới có chung batchId và
  // được gom thành một mẻ; món bấm "Xác nhận chế biến" riêng lẻ (không có batchId) hiện
  // như một món riêng. Giữ nguyên thứ tự thời gian của danh sách đầu vào.
  const groupItemsByBatch = useCallback((list) => {
    const batches = {};
    const entries = [];
    list.forEach((item) => {
      if (!item.batchId) {
        entries.push({ type: 'single', item });
        return;
      }
      if (!batches[item.batchId]) {
        batches[item.batchId] = {
          type: 'batch',
          batchId: item.batchId,
          productName: item.productName || item.ProductName,
          totalQty: 0,
          items: [],
        };
        entries.push(batches[item.batchId]);
      }
      batches[item.batchId].items.push(item);
      batches[item.batchId].totalQty += item.quantity;
    });
    return entries;
  }, []);

  const renderGroupedColumn = (list, emptyLabel) => {
    if (list.length === 0) {
      return <div style={{ textAlign: 'center', padding: '40px 0', color: '#595959' }}>{emptyLabel}</div>;
    }
    return groupItemsByBatch(list).map((entry) => {
      if (entry.type === 'single') return renderKdsCard(entry.item);
      return (
        <div key={entry.batchId} style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 12, borderBottom: '2px dashed #d9d9d9', paddingBottom: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ color: '#000000', fontSize: 18 }}>{entry.productName}</Text>
            </div>
            <div style={{
              display: 'inline-block',
              backgroundColor: '#e6fffb',
              border: '2px solid #13c2c2',
              borderRadius: 8,
              padding: '4px 10px',
              color: '#006d75',
              fontSize: 14,
              fontWeight: 800,
              textTransform: 'uppercase',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              whiteSpace: 'nowrap',
            }}>
              Mẻ • {entry.totalQty} phần
            </div>
          </div>
          {entry.items.map(renderKdsCard)}
        </div>
      );
    });
  };

  // Display items based on current active tab
  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case COOKING_STATUS.WAITING:
      case COOKING_STATUS.ACCEPTED:
        return [...waitingItems, ...acceptedItems];
      case COOKING_STATUS.COOKING:
        return cookingItems;
      case COOKING_STATUS.READY:
        return readyItems;
      default:
        return visibleItems.filter((i) => i.cookingStatus !== COOKING_STATUS.READY);
    }
  }, [activeTab, visibleItems, waitingItems, acceptedItems, cookingItems, readyItems]);

  // Render Time Elapsed since created
  const renderTimeElapsed = (createdAt) => {
    if (!createdAt) return 'Vừa xong';
    const minutes = Math.floor((new Date() - new Date(createdAt)) / 60000);
    if (minutes < 1) return 'Vừa xong (<1 phút)';
    if (minutes > 30) {
      return <span style={{ color: '#ff4d4f', fontWeight: 700 }}>⚠️ {minutes} phút</span>;
    }
    return `${minutes} phút trước`;
  };

  // Reusable KDS Card component
  const renderKdsCard = (item) => {
    const status = item.cookingStatus || COOKING_STATUS.WAITING;

    let cardBorderColor = '#ff4d4f';
    let statusTag = <Tag color="red">CHỜ XÁC NHẬN</Tag>;

    if (status === COOKING_STATUS.ACCEPTED) {
      cardBorderColor = '#1890ff';
      statusTag = <Tag color="blue">ĐÃ NHẬN</Tag>;
    } else if (status === COOKING_STATUS.COOKING) {
      cardBorderColor = '#fa8c16';
      statusTag = <Tag color="orange">ĐANG NẤU</Tag>;
    } else if (status === COOKING_STATUS.READY) {
      cardBorderColor = '#52c41a';
      statusTag = <Tag color="green">SẴN SÀNG</Tag>;
    }

    // Món thừa khớp đúng sản phẩm + số lượng, còn trong 30p — chỉ gợi ý khi món
    // này còn chờ (chưa bắt đầu nấu), tránh dừng món đang/đã nấu.
    const matchingLeftover = (status === COOKING_STATUS.WAITING || status === COOKING_STATUS.ACCEPTED)
      ? reusableLeftovers.find((l) => l.productId === item.productId && l.quantity === item.quantity)
      : null;

    return (
      <Card
        key={item._splitKey || item.orderDetailId}
        hoverable
        style={{
          backgroundColor: KDS_STYLE.cardBg,
          borderColor: cardBorderColor,
          borderRadius: KDS_STYLE.radius,
          borderWidth: 2,
          boxShadow: KDS_STYLE.shadow,
          marginBottom: 16,
          width: '100%',
          height: 340,
          display: 'flex',
          flexDirection: 'column',
        }}
        bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        {/* Card Header: Table Name & Time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
          <Space size={4}>
            <Tag
              color="volcano"
              style={{ fontSize: 16, fontWeight: 700, padding: '2px 10px', borderRadius: 4, margin: 0 }}
            >
              🪑 {item.tableName}
            </Tag>
          </Space>
          <Text style={{ color: '#595959', fontSize: 12 }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {renderTimeElapsed(item.createdAt)}
          </Text>
        </div>

        {/* Product Image, Name & Quantity */}
        <div style={{ display: 'flex', marginBottom: 12, alignItems: 'center' }}>
          {item.productImage ? (
            <img
              src={item.productImage}
              alt={item.productName}
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                objectFit: 'cover',
                marginRight: 12,
                border: KDS_STYLE.border,
              }}
            />
          ) : (
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: KDS_STYLE.textSecondary,
                marginRight: 12,
                border: KDS_STYLE.border,
              }}
            >
              🍲
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Title
              level={4}
              style={{
                color: '#000000',
                margin: '0 0 4px 0',
                fontSize: 16,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.productName}
            </Title>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#faad14', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center' }}>
              Số lượng: x{item.quantity}
              {item.batchId && (status === COOKING_STATUS.COOKING || status === COOKING_STATUS.READY) && (
                <Tag color="magenta" style={{ marginLeft: 12, fontSize: 14, fontWeight: 800, padding: '2px 8px' }}>
                  <ThunderboltOutlined /> MẺ
                </Tag>
              )}
            </div>
          </div>
        </div>

        {/* Note / Special instructions (scrolls internally so the frame never grows) */}
        {item.note && (
          <div
            style={{
              backgroundColor: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: 6,
              padding: '6px 10px',
              marginBottom: 12,
              color: KDS_STYLE.textPrimary,
              fontSize: 13,
              maxHeight: 56,
              overflowY: 'auto',
            }}
          >
            <strong>📝 Ghi chú:</strong> {item.note}
          </div>
        )}

        {/* Status Badge */}
        <div style={{ marginBottom: 16 }}>{statusTag}</div>

        {/* Spacer keeps the frame uniform (same height) regardless of note/image content */}
        <div style={{ flex: 1 }} />

        {/* Action Buttons (Normal Flow) */}
        <Space direction="vertical" style={{ width: '100%' }}>
          {matchingLeftover && (
            <Popconfirm
              title={`Có món thừa "${matchingLeftover.productName}" x${matchingLeftover.quantity} khách vừa trả (còn trong 30 phút). Dùng lại thay vì nấu mới?`}
              onConfirm={() => handleReuseLeftover(item, matchingLeftover)}
              okText="Dùng lại, dừng nấu"
              cancelText="Vẫn nấu mới"
            >
              <Button
                block
                icon={<ThunderboltOutlined />}
                style={{
                  backgroundColor: '#fffbeb',
                  borderColor: '#f59e0b',
                  color: '#b45309',
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 8,
                  height: 'auto',
                  minHeight: 40,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                  padding: '8px 12px',
                }}
              >
                ♻️ Dùng món thừa vừa trả
                <br />
                Dừng chế biến
              </Button>
            </Popconfirm>
          )}

          {(status === COOKING_STATUS.WAITING || status === COOKING_STATUS.ACCEPTED) && (
            <Button
              type="primary"
              block
              size="large"
              icon={<FireOutlined />}
              onClick={() => handleStatusChange(item.orderDetailId, COOKING_STATUS.COOKING, 1)}
              style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16', fontWeight: 600, color: '#ffffff', marginBottom: 8 }}
            >
              Xác nhận chế biến
            </Button>
          )}

          {status === COOKING_STATUS.COOKING && (
            <Button
              type="primary"
              block
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={() => handleStatusChange(item.orderDetailIds || item.orderDetailId, COOKING_STATUS.READY)}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 600, color: '#ffffff' }}
            >
              Hoàn thành
            </Button>
          )}

          {status === COOKING_STATUS.READY && (
            <Button block disabled style={{ backgroundColor: '#ffffff', color: '#595959' }}>
              Đã báo phục vụ
            </Button>
          )}

          {/* Cancellation Option ("Huỷ món") — món Ready vẫn huỷ được cho luồng
              "bếp làm chậm, khách đi về không nhận món nữa" (lỗi của bếp, được
              ghi nhận vào thống kê Món thừa). */}
          <Popconfirm
            title={
              status === COOKING_STATUS.READY
                ? 'Huỷ món ĐÃ HOÀN THÀNH này? (Sẽ được ghi nhận là bếp làm chậm trong thống kê)'
                : 'Bạn có chắc chắn muốn hủy món này không?'
            }
            onConfirm={() => {
                if (item.orderDetailIds) {
                    item.orderDetailIds.forEach(id => handleCancelItem(id));
                } else {
                    handleCancelItem(item.orderDetailId);
                }
            }}
            okText="Đồng ý"
            cancelText="Hủy bỏ"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              block
              type="text"
              style={{
                marginTop: 4,
                borderColor: '#ff4d4f',
                color: '#ff4d4f',
                border: '1px dashed #ff4d4f',
              }}
            >
              Hủy món
            </Button>
          </Popconfirm>
        </Space>
      </Card>
    );
  };

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f0f2f5',
      minHeight: 'calc(100vh - 64px)',
      color: '#000000',
      fontFamily: "'Be Vietnam Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* ── HEADER BANNER FOR KDS ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          backgroundColor: KDS_STYLE.cardBg,
          padding: '16px 24px',
          borderRadius: KDS_STYLE.radius,
          marginBottom: 20,
          border: KDS_STYLE.border,
          boxShadow: KDS_STYLE.shadow,
        }}
      >
        <Space size="large" style={{ flexShrink: 0 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <FireOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <Title level={3} style={{ color: '#000000', margin: 0, whiteSpace: 'nowrap' }}>
              Màn hình Bếp & Chế biến
            </Title>
            <Text style={{ color: '#595959', whiteSpace: 'nowrap' }}>
              Điều phối & Điều khiển Thứ tự Chế biến Món ăn theo Thời gian Thực
            </Text>
          </div>
        </Space>

        <Space size="middle" wrap style={{ flexShrink: 0 }}>
          {/* View Mode Toggle Button Group */}
          <Button.Group>
            <Button
              type={viewMode === 'COLUMN' ? 'primary' : 'default'}
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode('COLUMN')}
              style={viewMode === 'COLUMN' ? { backgroundColor: '#1890ff', borderColor: '#1890ff', color: '#ffffff' } : { backgroundColor: '#ffffff', borderColor: '#d9d9d9', color: '#000000' }}
            >
              Chia dọc (Cột)
            </Button>
            <Button
              type={viewMode === 'GRID' ? 'primary' : 'default'}
              icon={<BellOutlined />}
              onClick={() => setViewMode('GRID')}
              style={viewMode === 'GRID' ? { backgroundColor: '#1890ff', borderColor: '#1890ff', color: '#ffffff' } : { backgroundColor: '#ffffff', borderColor: '#d9d9d9', color: '#000000' }}
            >
              Dạng Thẻ
            </Button>
          </Button.Group>

          <Tooltip title="Làm mới danh sách">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchItems(true)}
              style={{ backgroundColor: '#ffffff', borderColor: '#d9d9d9', color: '#000000' }}
            >
              Làm mới
            </Button>
          </Tooltip>

          <Badge count={waitingItems.length} overflowCount={99}>
            <Tag color="#ff4d4f" style={{ fontSize: 14, padding: '4px 12px', borderRadius: 16 }}>
              🔥 {waitingItems.length} Món mới
            </Tag>
          </Badge>

          <Badge count={cookingItems.length} overflowCount={99}>
            <Tag color="#faad14" style={{ fontSize: 14, padding: '4px 12px', borderRadius: 16 }}>
              🍳 {cookingItems.length} Đang nấu
            </Tag>
          </Badge>

          <Button
            icon={<CheckCircleOutlined />}
            onClick={() => setShowCompletedModal(true)}
            style={{ backgroundColor: '#f6ffed', borderColor: '#52c41a', color: '#389e0d', borderRadius: 16 }}
          >
            Hoàn thành ({readyItems.length})
          </Button>

          <Badge count={returnedItems.length} overflowCount={99}>
            <Button
              icon={<ExclamationCircleOutlined />}
              onClick={() => setShowReturnedItemsModal(true)}
              style={{ backgroundColor: '#fff1f0', borderColor: '#ff4d4f', color: '#cf1322', borderRadius: 16 }}
            >
              Món khách trả
            </Button>
          </Badge>
        </Space>
      </div>

      {/* ── EX-1: CANCELLATION ALERTS BANNER ────────────────────────────────── */}
      {cancelledAlerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {cancelledAlerts.map((alert) => (
            <Alert
              key={alert.id}
              message={
                <Space>
                  <ExclamationCircleOutlined style={{ fontSize: 18, color: '#ff4d4f' }} />
                  <span style={{ fontWeight: 700 }}>CẢNH BÁO BẾP:</span>
                  <span>{alert.message}</span>
                  <Tag color="default">{alert.timestamp}</Tag>
                </Space>
              }
              type="error"
              closable
              onClose={() => setCancelledAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
              style={{
                marginBottom: 8,
                borderRadius: 8,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Gợi ý dùng lại món thừa (tổng quan, kể cả khi chưa khớp món đang chờ nấu) ── */}
      {reusableLeftovers.length > 0 && (
        <div
          style={{
            marginBottom: 20,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: KDS_STYLE.radius,
            padding: '14px 20px',
            boxShadow: KDS_STYLE.shadow,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: '#b45309', marginBottom: 10 }}>
            💡 Gợi ý dùng lại món thừa (còn trong 30 phút) — {reusableLeftovers.length} món
          </div>
          <Space size={10} wrap>
            {reusableLeftovers.map((item) => {
              const minutesLeft = Math.max(0, Math.round((new Date(item.expiresAt).getTime() - now) / 60000));
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #f59e0b',
                    background: '#fff',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, color: KDS_STYLE.textPrimary }}>
                    {item.productName} x{item.quantity}
                  </div>
                  <div style={{ fontSize: 12, color: '#92400e' }}>
                    {item.tableName ? `Từ ${item.tableName} · ` : ''}còn {minutesLeft}p
                  </div>
                </div>
              );
            })}
          </Space>
        </div>
      )}

      {/* ── BATCH PROCESSING BAR ────────────────────────────────── */}
      <div style={{ marginBottom: 20, backgroundColor: KDS_STYLE.cardBg, padding: '16px 20px', borderRadius: KDS_STYLE.radius, border: KDS_STYLE.border, boxShadow: KDS_STYLE.shadow }}>
        <Title level={5} style={{ margin: '0 0 12px 0', color: KDS_STYLE.textPrimary, display: 'flex', alignItems: 'center' }}>
          <ThunderboltOutlined style={{ color: '#faad14', marginRight: 8, fontSize: 18 }} />
          Thanh Chế Biến Theo Lô / Mẻ
        </Title>
        {batchableItems.length === 0 ? (
          <Text style={{ color: KDS_STYLE.textSecondary }}>Không có món cần gộp chế biến theo mẻ lúc này.</Text>
        ) : (
          <Space size="middle" wrap style={{ width: '100%' }}>
            {batchableItems.map(batch => (
              <Card
                key={batch.productId}
                size="small"
                style={{ borderColor: '#f0f0f0', backgroundColor: KDS_STYLE.cardBg, minWidth: 260, borderRadius: 10, overflow: 'hidden' }}
                styles={{ body: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }}
              >
                <div>
                  <Text strong style={{ fontSize: 16, color: '#000000', display: 'block', marginBottom: 4 }}>{batch.productName}</Text>
                  <div style={{ color: '#d4380d', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Mẻ {batch.totalQty} phần
                  </div>
                </div>
                <Button 
                  type="primary" 
                  size="large"
                  onClick={() => handleBatchStatusChange(batch.productId, COOKING_STATUS.COOKING)}
                  style={{ marginLeft: 20, backgroundColor: '#1890ff', borderColor: '#1890ff', fontWeight: 700, height: 48, borderRadius: 8 }}
                  icon={<FireOutlined style={{ fontSize: 20 }} />}
                >
                  Xác nhận
                </Button>
              </Card>
            ))}
          </Space>
        )}
      </div>

      {/* ── MAIN KITCHEN QUEUE ───────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" tip="Đang tải danh sách món ăn..." />
        </div>
      ) : viewMode === 'COLUMN' ? (
        /* Vertical Column Split View (Chia dọc) */
        <Row gutter={[20, 20]}>
          {/* Column 1: Chờ chế biến (Waiting + Accepted) */}
          <Col xs={24} md={8}>
            <div style={{ backgroundColor: KDS_STYLE.cardBg, borderRadius: KDS_STYLE.radius, padding: 16, border: KDS_STYLE.border, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', boxShadow: KDS_STYLE.shadow }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: '2px solid #1890ff'
              }}>
                <Title level={4} style={{ color: '#000000', margin: 0, fontSize: 16 }}>
                  📋 Chờ xác nhận ({waitingItems.length + acceptedItems.length})
                </Title>
                <Badge count={waitingItems.length + acceptedItems.length} style={{ backgroundColor: '#1890ff' }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                {waitingItems.length + acceptedItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#595959' }}>Không có món chờ chế biến</div>
                ) : (
                  [...waitingItems, ...acceptedItems].map(item => renderKdsCard(item))
                )}
              </div>
            </div>
          </Col>

          {/* Column 2: Đang nấu (Cooking) */}
          <Col xs={24} md={8}>
            <div style={{ backgroundColor: KDS_STYLE.cardBg, borderRadius: KDS_STYLE.radius, padding: 16, border: KDS_STYLE.border, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', boxShadow: KDS_STYLE.shadow }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: '2px solid #fa8c16'
              }}>
                <Title level={4} style={{ color: '#000000', margin: 0, fontSize: 16 }}>
                  🍳 Đang nấu ({cookingItems.length})
                </Title>
                <Badge count={cookingItems.length} style={{ backgroundColor: '#fa8c16' }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                {renderGroupedColumn(cookingItems, 'Không có món đang làm')}
              </div>
            </div>
          </Col>

          {/* Column 3: Hoàn thành (Ready) */}
          <Col xs={24} md={8}>
            <div style={{ backgroundColor: KDS_STYLE.cardBg, borderRadius: KDS_STYLE.radius, padding: 16, border: KDS_STYLE.border, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', boxShadow: KDS_STYLE.shadow }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: '2px solid #52c41a'
              }}>
                <Title level={4} style={{ color: '#000000', margin: 0, fontSize: 16 }}>
                  ✅ Sẵn sàng ({readyItems.length})
                </Title>
                <Badge count={readyItems.length} style={{ backgroundColor: '#52c41a' }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                {renderGroupedColumn(readyItems, 'Chưa có món hoàn thành')}
              </div>
            </div>
          </Col>
        </Row>
      ) : (
        /* Tab Mode (Original style but clean/refactored) */
        <>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            style={{ color: '#000000' }}
            items={[
              {
                key: 'ALL',
                label: (
                  <span>
                    <AppstoreOutlined /> Tất cả ({visibleItems.filter((i) => i.cookingStatus !== COOKING_STATUS.READY).length})
                  </span>
                ),
              },
              {
                key: COOKING_STATUS.WAITING,
                label: (
                  <span>
                    <BellOutlined /> Chờ xác nhận ({waitingItems.length + acceptedItems.length})
                  </span>
                ),
              },
              {
                key: COOKING_STATUS.COOKING,
                label: (
                  <span>
                    <FireOutlined /> Đang làm ({cookingItems.length})
                  </span>
                ),
              },
              {
                key: COOKING_STATUS.READY,
                label: (
                  <span>
                    <CheckCircleOutlined /> Đã nấu xong ({readyItems.length})
                  </span>
                ),
              },
            ]}
          />

          {filteredItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                background: KDS_STYLE.cardBg,
                borderRadius: KDS_STYLE.radius,
                border: KDS_STYLE.border,
              }}
            >
              <Title level={4} style={{ color: KDS_STYLE.textSecondary }}>
                🎉 Bếp hiện không có món nào thuộc danh mục này!
              </Title>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {filteredItems.map((item) => (
                <Col xs={24} sm={12} md={8} lg={6} key={item._splitKey || item.orderDetailId}>
                  {renderKdsCard(item)}
                </Col>
              ))}
            </Row>
          )}
        </>
      )}

      {/* ── Modal: All completed orders (Đơn đã hoàn thành) ─────── */}
      <Modal
        title={`✅ Đơn đã hoàn thành (${readyItems.length})`}
        open={showCompletedModal}
        onCancel={() => setShowCompletedModal(false)}
        footer={null}
        width={900}
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
          {renderGroupedColumn(readyItems, 'Chưa có món hoàn thành')}
        </div>
      </Modal>

      {/* ── Modal: Món khách trả (chỉ xem, bếp không thao tác gì ở đây) ─────── */}
      <Modal
        title={`📋 Món khách trả (${returnedItems.length}) — chỉ xem`}
        open={showReturnedItemsModal}
        onCancel={() => setShowReturnedItemsModal(false)}
        footer={null}
        width={800}
      >
        <Table
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8 }}
          dataSource={returnedItems}
          locale={{ emptyText: 'Chưa có món nào bị khách trả.' }}
          columns={[
            { title: 'Bàn', dataIndex: 'tableName', key: 'tableName', render: (v) => v || '—' },
            { title: 'Món', dataIndex: 'productName', key: 'productName' },
            { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 60 },
            { title: 'Lý do', dataIndex: 'reason', key: 'reason' },
            {
              title: 'Cách xử lý',
              dataIndex: 'handlingAction',
              key: 'handlingAction',
              render: (v) => {
                const labels = { Discard: 'Huỷ', StaffUse: 'Nhân viên dùng', Reuse: 'Tái sử dụng' };
                return v ? <Tag>{labels[v] || v}</Tag> : '—';
              },
            },
            {
              title: 'Thời gian',
              dataIndex: 'createdAt',
              key: 'createdAt',
              render: (v) => new Date(v).toLocaleString('vi-VN'),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default KDSPage;
