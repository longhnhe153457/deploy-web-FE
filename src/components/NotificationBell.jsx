import React, { useState, useEffect, useCallback } from 'react';
import { Popover, Badge, Button, List, Spin, Avatar, Typography, Divider } from 'antd';
import { BellOutlined, MessageOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useBranch } from '../context/BranchContext';
import { useSignalR } from '../context/SignalRContext';
import { useAuth } from '../context/AuthContext';
import { getRecentNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../api/notificationApi';
import { getNotificationVisualMeta, getNotificationSmartRedirectUrl } from '../utils/notificationHelper';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text } = Typography;

const NotificationBell = ({ collapsed }) => {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const { currentBranchId, branches } = useBranch();
  const { role } = useAuth();
  const connection = useSignalR();
  const navigate = useNavigate();

  // Inject Dynamic Payroll Deadline & Payday Alerts
  const generatePayrollAlerts = useCallback(() => {
    const activeBranch = branches.find((b) => b.id === currentBranchId) || branches[0];
    if (!activeBranch) return [];

    const payday = activeBranch.payrollPayday ?? activeBranch.PayrollPayday ?? 10;
    const lockDeadlineDay = payday >= 3 ? payday - 2 : 1;
    const lockWarningStartDay = payday >= 4 ? payday - 3 : 1;
    const todayDay = dayjs().date();

    const isManagement = role === 'Owner' || role === 'Admin' || role === 'Manager';
    const alerts = [];

    if (isManagement) {
      // 1. Management Alerts
      if (todayDay >= lockWarningStartDay && todayDay < payday) {
        alerts.push({
          id: `payroll-lock-deadline-${activeBranch.id}-${dayjs().format('YYYY-MM')}`,
          title: (role === 'Owner' || role === 'Admin')
            ? '🚨 THÔNG BÁO CHO CHỦ CỬA HÀNG: QUẢN LÝ CHƯA CHỐT LƯƠNG ĐÚNG HẠN'
            : '⚠️ CẢNH BÁO HẠN CHỐT LƯƠNG CHI NHÁNH',
          message: `Chi nhánh ${activeBranch.name} quy định trả lương ngày ${payday} hàng tháng. Quản lý cần hoàn tất chốt bảng lương trước ngày ${lockDeadlineDay}!`,
          createdAt: dayjs().toISOString(),
          isRead: false,
          type: 'Payroll',
          branchName: activeBranch.name,
          redirectUrl: '/payroll',
        });
      }

      if (todayDay === payday) {
        alerts.push({
          id: `payroll-payday-${activeBranch.id}-${dayjs().format('YYYY-MM')}`,
          title: `🔔 ĐÃ ĐẾN NGÀY THANH TOÁN LƯƠNG HÀNG THÁNG (NGÀY ${payday})`,
          message: `Hôm nay là ngày ${payday} (Ngày trả lương chi nhánh ${activeBranch.name}). Vui lòng kiểm tra và thực hiện thanh toán cho nhân sự!`,
          createdAt: dayjs().toISOString(),
          isRead: false,
          type: 'Payroll',
          branchName: activeBranch.name,
          redirectUrl: '/payroll',
        });
      }
    } else {
      // 2. Employee Alerts (Staff: Cashier, Chef, Waiter, etc.)
      if (todayDay >= lockWarningStartDay) {
        const isPastPayday = todayDay >= payday;
        alerts.push({
          id: `employee-payroll-status-${activeBranch.id}-${dayjs().format('YYYY-MM')}`,
          title: isPastPayday
            ? `⚠️ THÔNG BÁO TIẾN ĐỘ BẢNG LƯƠNG (NGÀY ${payday})`
            : `🔔 THÔNG BÁO TIẾN ĐỘ CHỐT LƯƠNG HÀNG THÁNG`,
          message: isPastPayday
            ? `Hôm nay là ngày ${payday} (Ngày trả lương chi nhánh ${activeBranch.name}). Vui lòng kiểm tra tiến độ chốt và thanh toán bảng lương của bạn!`
            : `Chi nhánh ${activeBranch.name} quy định trả lương vào ngày ${payday} hàng tháng. Hạn Quản lý chốt lương: Ngày ${lockDeadlineDay}.`,
          createdAt: dayjs().toISOString(),
          isRead: false,
          type: 'Payroll',
          branchName: activeBranch.name,
          redirectUrl: '/my-payroll',
        });
      }
    }

    return alerts;
  }, [branches, currentBranchId, role]);

  // Load số lượng chưa đọc và thông báo gần nhất
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const countRes = await getUnreadCount(currentBranchId);
      const recentRes = await getRecentNotifications(currentBranchId);

      const payrollAlerts = generatePayrollAlerts();
      const combined = [...payrollAlerts, ...recentRes];

      setUnreadCount((countRes?.count || 0) + payrollAlerts.length);
      setNotifications(combined);
    } catch (err) {
      console.error('Lỗi khi tải thông báo:', err);
    } finally {
      setLoading(false);
    }
  }, [currentBranchId, generatePayrollAlerts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Đăng ký nhận thông báo Realtime qua SignalR (nhận đủ các loại cảnh báo vận hành, kho, chấm công)
  useEffect(() => {
    if (connection) {
      const handleReceive = (payload) => {
        const payloadBranchId = payload?.branchId || payload?.BranchId;
        const isBelongsToBranch = !currentBranchId || !payloadBranchId || payloadBranchId === currentBranchId;
        if (isBelongsToBranch) {
          setUnreadCount((prev) => prev + 1);
          loadData();
        }
      };

      connection.on('ReceiveNotification', handleReceive);
      connection.on('ReceiveStockAlert', handleReceive);
      connection.on('ReceiveWorkScheduleNotification', handleReceive);

      return () => {
        connection.off('ReceiveNotification', handleReceive);
        connection.off('ReceiveStockAlert', handleReceive);
        connection.off('ReceiveWorkScheduleNotification', handleReceive);
      };
    }
  }, [connection, currentBranchId, loadData]);

  const handleItemClick = async (item) => {
    try {
      if (!item.isRead) {
        await markAsRead(item.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) => prev.filter((n) => n.id !== item.id));
      }
      setVisible(false);

      const targetUrl = getNotificationSmartRedirectUrl(item);
      if (targetUrl) {
        navigate(targetUrl);
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái đọc:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      try {
        await markAllAsRead(currentBranchId);
      } catch (apiErr) {
        const unreadItems = notifications.filter((n) => !n.isRead);
        if (unreadItems.length > 0) {
          await Promise.allSettled(unreadItems.map((n) => markAsRead(n.id)));
        }
      }
      setUnreadCount(0);
      setNotifications([]);
    } catch (err) {
      console.error('Lỗi khi đọc tất cả thông báo:', err);
    }
  };

  // Chỉ lọc hiển thị các thông báo CHƯA ĐỌC và trong HÔM NAY
  const unreadTodayNotifications = notifications.filter((n) => {
    if (n.isRead) return false;
    return dayjs(n.createdAt).isSame(dayjs(), 'day');
  });

  const popoverContent = (
    <div style={{ width: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 15, color: '#0f172a' }}>Thông báo mới hôm nay</Text>
          {unreadCount > 0 && <Badge count={unreadCount} style={{ backgroundColor: '#ef4444' }} />}
        </div>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            onClick={handleMarkAllAsRead}
            style={{ padding: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-primary, #ea580c)' }}
          >
            Đọc tất cả
          </Button>
        )}
      </div>
      <Divider style={{ margin: '4px 0' }} />
      
      {loading && unreadTodayNotifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin size="small" /></div>
      ) : unreadTodayNotifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 8px', color: '#8c8c8c' }}>
          <MessageOutlined style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
          Không có thông báo mới nào hôm nay.
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '0 8px' }}>
          <List
            itemLayout="horizontal"
            dataSource={unreadTodayNotifications}
            renderItem={(item) => {
              const meta = getNotificationVisualMeta(item);
              return (
                <List.Item
                  onClick={() => handleItemClick(item)}
                  style={{
                    cursor: 'pointer',
                    padding: '10px 10px',
                    borderRadius: 8,
                    transition: 'all 0.2s',
                    backgroundColor: item.isRead ? '#ffffff' : meta.cardBg,
                    marginBottom: 6,
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${meta.accentColor}`,
                  }}
                  className="notif-item-hover"
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: meta.iconBg,
                          color: meta.iconColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          border: `1px solid ${meta.borderColor}`
                        }}
                      >
                        {meta.icon}
                      </div>
                    }
                    title={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: meta.tagBg,
                              color: meta.tagColor,
                              border: `1px solid ${meta.borderColor}`
                            }}
                          >
                            {meta.badgeEmoji} {meta.badgeText}
                          </span>
                          {!item.isRead && (
                            <span style={{ width: 6, height: 6, backgroundColor: '#3b82f6', borderRadius: '50%', flexShrink: 0 }} />
                          )}
                        </div>
                        <Text strong={!item.isRead} style={{ fontSize: 13, color: '#1e293b' }}>
                          {item.title}
                        </Text>
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ fontSize: 12, color: '#475569', marginBottom: 4, lineHeight: 1.4 }}>
                          {item.message}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                          <span>
                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                            {dayjs(item.createdAt).fromNow()}
                          </span>
                          {!currentBranchId && item.branchName && (
                            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                              {item.branchName}
                            </span>
                          )}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </div>
      )}
      
      <Divider style={{ margin: '4px 0' }} />
      <div style={{ textAlign: 'center', padding: '6px 0' }}>
        <Button
          type="link"
          size="small"
          onClick={() => {
            setVisible(false);
            navigate('/notifications');
          }}
          style={{ width: '100%', fontWeight: 600 }}
        >
          Xem tất cả thông báo
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      title={null}
      trigger="click"
      open={visible}
      onOpenChange={(newVal) => {
        setVisible(newVal);
        if (newVal) {
          loadData();
        }
      }}
      placement="rightTop"
      overlayClassName="notif-bell-popover"
      overlayStyle={{ zIndex: 1050 }}
    >
      <div className={`sidebar-notif-bell-wrapper ${collapsed ? 'collapsed' : ''}`} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Badge count={unreadCount} overflowCount={99} size="small" offset={[2, 2]}>
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 20, color: 'var(--color-text-secondary)' }} />}
            className="sidebar-notif-btn"
            title="Thông báo"
          />
        </Badge>
      </div>
    </Popover>
  );
};

export default NotificationBell;
