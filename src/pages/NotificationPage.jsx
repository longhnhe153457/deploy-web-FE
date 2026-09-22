import React, { useState, useEffect, useCallback } from 'react';
import {
  Breadcrumb,
  Typography,
  Card,
  Input,
  Select,
  DatePicker,
  List,
  Tag,
  Button,
  Pagination,
  Empty,
  Skeleton,
  message,
  Space
} from 'antd';
import {
  HomeOutlined,
  BellOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  ArrowRightOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notificationApi';
import { getNotificationVisualMeta, NOTIFICATION_CATEGORIES, getNotificationSmartRedirectUrl } from '../utils/notificationHelper';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import '../styles/NotificationPage.css';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DATE_PRESETS = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: '7days', label: '7 ngày qua' },
  { value: '30days', label: '30 ngày qua' },
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'custom', label: 'Khoảng thời gian tự chọn' }
];

const NotificationPage = () => {
  const { currentBranchId, branches } = useBranch();
  const { role, user } = useAuth();
  const navigate = useNavigate();

  // Filters state
  const [datePreset, setDatePreset] = useState('today');
  const [dateRange, setDateRange] = useState([dayjs().startOf('day'), dayjs().endOf('day')]);
  const [selectedType, setSelectedType] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [searchText, setSearchText] = useState('');
  
  // Data state
  const [notifications, setNotifications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Xử lý đổi Preset thời gian
  const handlePresetChange = (val) => {
    setDatePreset(val);
    const now = dayjs();
    if (val === 'today') {
      setDateRange([now.startOf('day'), now.endOf('day')]);
    } else if (val === 'yesterday') {
      const yesterday = now.subtract(1, 'day');
      setDateRange([yesterday.startOf('day'), yesterday.endOf('day')]);
    } else if (val === '7days') {
      setDateRange([now.subtract(6, 'day').startOf('day'), now.endOf('day')]);
    } else if (val === '30days') {
      setDateRange([now.subtract(29, 'day').startOf('day'), now.endOf('day')]);
    } else if (val === 'thisMonth') {
      setDateRange([now.startOf('month'), now.endOf('month')]);
    }
  };

  // Tải dữ liệu từ API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      let branchIdParam = null;
      if (currentBranchId) {
        branchIdParam = currentBranchId;
      } else if (selectedBranch !== 'All') {
        branchIdParam = Number(selectedBranch);
      }

      const params = {
        branchId: branchIdParam,
        fromDate: dateRange[0]?.toISOString(),
        toDate: dateRange[1]?.toISOString(),
        type: selectedType === 'All' ? null : selectedType,
        priority: selectedPriority === 'All' ? null : selectedPriority,
        search: searchText.trim() || null,
        page: currentPage,
        pageSize: pageSize
      };

      const res = await getNotifications(params);
      setNotifications(res.items || []);
      setTotalCount(res.totalCount || 0);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử thông báo:', err);
      message.error(err.message || 'Không thể tải lịch sử thông báo.');
    } finally {
      setLoading(false);
    }
  }, [currentBranchId, selectedBranch, dateRange, selectedType, selectedPriority, searchText, currentPage, pageSize]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Reset page khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [currentBranchId, selectedBranch, datePreset, dateRange, selectedType, selectedPriority, searchText]);

  const handleItemClick = async (item) => {
    try {
      if (!item.isRead) {
        await markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      }
      
      const targetUrl = getNotificationSmartRedirectUrl(item);
      if (targetUrl) {
        navigate(targetUrl);
      }
    } catch (err) {
      console.error('Lỗi khi đánh dấu đã đọc:', err);
    }
  };

  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      let branchIdParam = null;
      if (currentBranchId) {
        branchIdParam = currentBranchId;
      } else if (selectedBranch !== 'All') {
        branchIdParam = Number(selectedBranch);
      }

      try {
        await markAllAsRead(branchIdParam);
      } catch (apiErr) {
        const unreadItems = notifications.filter((n) => !n.isRead);
        if (unreadItems.length > 0) {
          await Promise.allSettled(unreadItems.map((n) => markAsRead(n.id)));
        }
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      message.success('Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch (err) {
      console.error('Lỗi khi đọc tất cả thông báo:', err);
      message.error('Không thể đánh dấu đã đọc tất cả.');
    } finally {
      setMarkingAll(false);
    }
  };

  const renderPriorityTag = (priority, isImportant) => {
    if (isImportant || priority === 'Critical') {
      return (
        <Tag style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5', fontWeight: 700, borderRadius: 4 }}>
          🔴 Cấp bách
        </Tag>
      );
    }
    if (priority === 'Warning') {
      return (
        <Tag style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fde68a', fontWeight: 600, borderRadius: 4 }}>
          🟡 Cảnh báo
        </Tag>
      );
    }
    return (
      <Tag style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe', fontWeight: 500, borderRadius: 4 }}>
        🔵 Thông tin
      </Tag>
    );
  };

  return (
    <div className="notification-history-container">
      {/* ── BREADCRUMB ──────────────────────────────────────────────────────── */}
      <Breadcrumb style={{ marginBottom: 12 }}>
        <Breadcrumb.Item href="/home">
          <HomeOutlined /> Trang chủ
        </Breadcrumb.Item>
        <Breadcrumb.Item style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
          <BellOutlined /> Lịch sử thông báo
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="notif-header-section">
        <div className="notif-title-area">
          <Title level={3}>Nhật Ký Cảnh Báo & Thông Báo Hệ Thống</Title>
          <Text type="secondary">
            Nhận diện trực quan mọi loại cảnh báo: Hàng Hết, Hết hạn, Chưa chấm công chi tiết theo chi nhánh.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          onClick={handleMarkAllAsRead}
          loading={markingAll}
          style={{
            borderRadius: 8,
            fontWeight: 600,
            background: 'var(--color-primary, #ea580c)',
            borderColor: 'var(--color-primary, #ea580c)',
            height: 38
          }}
        >
          Đọc tất cả
        </Button>
      </div>

      {/* ── QUICK CATEGORY CHIPS BAR ─────────────────────────────────────────── */}
      <div className="notif-category-chips">
        {NOTIFICATION_CATEGORIES.map((cat) => (
          <div
            key={cat.value}
            className={`notif-category-chip ${selectedType === cat.value ? 'active' : ''}`}
            onClick={() => setSelectedType(cat.value)}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </div>
        ))}
      </div>

      {/* ── FILTER CARD ─────────────────────────────────────────────────────── */}
      <Card className="notif-filter-card">
        <div className="notif-filter-row">
          {/* Branch filter */}
          {!currentBranchId && branches && branches.length > 0 && (
            <div className="notif-filter-item">
              <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Chi nhánh</span>
              <Select
                value={selectedBranch}
                onChange={setSelectedBranch}
                style={{ width: '100%' }}
                options={[
                  { value: 'All', label: 'Tất cả chi nhánh' },
                  ...branches.map((b) => ({ value: String(b.id), label: b.name }))
                ]}
              />
            </div>
          )}

          {/* Time range preset */}
          <div className="notif-filter-item">
            <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Mốc thời gian</span>
            <Select
              value={datePreset}
              onChange={handlePresetChange}
              style={{ width: '100%' }}
              options={DATE_PRESETS}
            />
          </div>

          {/* Custom Date Range Picker */}
          {datePreset === 'custom' && (
            <div className="notif-filter-item" style={{ minWidth: 280 }}>
              <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Khoảng ngày tự chọn</span>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates || [null, null])}
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Priority Dropdown */}
          <div className="notif-filter-item">
            <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Cấp cảnh báo</span>
            <Select
              value={selectedPriority}
              onChange={setSelectedPriority}
              style={{ width: '100%' }}
              options={[
                { value: 'All', label: 'Tất cả cấp độ' },
                { value: 'Critical', label: '🔴 Cấp bách' },
                { value: 'Warning', label: '🟠 Cảnh cáo' },
                { value: 'Information', label: '🔵 Thông tin' }
              ]}
            />
          </div>

          {/* Type Category Dropdown */}
          <div className="notif-filter-item">
            <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Loại cảnh báo</span>
            <Select
              value={selectedType}
              onChange={setSelectedType}
              style={{ width: '100%' }}
              options={NOTIFICATION_CATEGORIES.map((c) => ({
                value: c.value,
                label: `${c.emoji} ${c.label}`
              }))}
            />
          </div>

          {/* Search text */}
          <div className="notif-filter-item" style={{ minWidth: 240 }}>
            <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tìm kiếm nội dung</span>
            <Input
              placeholder="Nhập từ khóa tiêu đề, thông điệp..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </div>
        </div>
      </Card>

      {/* ── NOTIFICATION LIST ───────────────────────────────────────────────── */}
      <Card className="notif-list-card">
        {loading && notifications.length === 0 ? (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Skeleton avatar active paragraph={{ rows: 2 }} />
            <Skeleton avatar active paragraph={{ rows: 2 }} />
            <Skeleton avatar active paragraph={{ rows: 2 }} />
          </Space>
        ) : notifications.length === 0 ? (
          <Empty
            description={
              <div>
                <Text type="secondary" style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
                  Không tìm thấy cảnh báo nào phù hợp.
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Không có cảnh báo hoạt động nào được ghi nhận tại chi nhánh trong khoảng thời gian đã chọn.
                </Text>
              </div>
            }
            style={{ padding: '40px 0' }}
          />
        ) : (
          <>
            <List
              itemLayout="horizontal"
              dataSource={notifications}
              renderItem={(item) => {
                const meta = getNotificationVisualMeta(item);
                return (
                  <div
                    className={`notif-item ${item.isRead ? 'read' : 'unread'}`}
                    style={{
                      borderLeftColor: meta.accentColor,
                      backgroundColor: item.isRead ? '#ffffff' : meta.cardBg
                    }}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="notif-item-body-layout">
                      {/* ICON AVATAR */}
                      <div
                        className="notif-icon-avatar"
                        style={{
                          backgroundColor: meta.iconBg,
                          color: meta.iconColor,
                          border: `1px solid ${meta.borderColor}`
                        }}
                      >
                        {meta.icon}
                      </div>

                      {/* CONTENT */}
                      <div className="notif-item-content">
                        <div className="notif-item-header">
                          {/* CATEGORY RECOGNITION PILL */}
                          <span
                            className="notif-badge-pill"
                            style={{
                              backgroundColor: meta.tagBg,
                              color: meta.tagColor,
                              borderColor: meta.borderColor
                            }}
                          >
                            <span>{meta.badgeEmoji}</span>
                            <span>{meta.badgeText}</span>
                          </span>

                          <span className="notif-item-title">{item.title}</span>

                          {renderPriorityTag(item.priority, item.isImportant)}
                        </div>

                        <div className="notif-item-desc">
                          {item.message}
                        </div>

                        <div className="notif-item-meta">
                          <span className="notif-meta-point">
                            <ClockCircleOutlined />
                            {dayjs(item.createdAt).format('HH:mm - DD/MM/YYYY')} ({dayjs(item.createdAt).fromNow()})
                          </span>

                          {item.branchName && (
                            <span className="notif-meta-point" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                              <ShopOutlined />
                              {item.branchName}
                            </span>
                          )}

                          {item.redirectUrl && (
                            <span
                              className="notif-action-btn"
                              style={{ color: meta.accentColor }}
                            >
                              {meta.actionText} <ArrowRightOutlined style={{ fontSize: 10 }} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* PAGINATION */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <Pagination
                current={currentPage}
                total={totalCount}
                pageSize={pageSize}
                onChange={setCurrentPage}
                showSizeChanger={false}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default NotificationPage;
