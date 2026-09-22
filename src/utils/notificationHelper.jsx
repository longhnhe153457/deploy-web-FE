import React from 'react';
import {
  InboxOutlined,
  HourglassOutlined,
  AlertOutlined,
  ClockCircleOutlined,
  ScheduleOutlined,
  AuditOutlined,
  ShoppingOutlined,
  DollarOutlined,
  WarningOutlined,
  BellOutlined,
  CalendarOutlined,
  MessageOutlined
} from '@ant-design/icons';

/**
 * Trích xuất cấu hình màu sắc, icon, nhãn nhận diện trực quan cho từng loại thông báo
 * Cho phép người dùng nhìn lướt qua nhận biết ngay đây là loại thông báo gì mà không cần đọc nội dung chi tiết.
 */
export const getNotificationVisualMeta = (item = {}) => {
  const type = item.type || 'Other';
  const title = (item.title || '').toLowerCase();
  const message = (item.message || '').toLowerCase();
  const isImportant = item.isImportant || item.priority === 'Critical';

  // 0. ĐẶT BÀN & ĐẶT CHỖ (Reservation)
  if (type === 'Reservation' || title.includes('đặt bàn') || message.includes('đặt bàn')) {
    const isCancelled = title.includes('hủy') || message.includes('hủy');
    return {
      categoryKey: 'Reservation',
      badgeText: isCancelled ? 'ĐẶT BÀN - ĐÃ HỦY' : 'ĐẶT BÀN - XÁC NHẬN',
      badgeEmoji: '📅',
      accentColor: isCancelled ? '#dc2626' : '#2563eb',
      cardBg: isCancelled ? '#fef2f2' : '#eff6ff',
      borderColor: isCancelled ? '#fecaca' : '#bfdbfe',
      tagBg: isCancelled ? '#fee2e2' : '#dbeafe',
      tagColor: isCancelled ? '#991b1b' : '#1e40af',
      iconBg: isCancelled ? '#fee2e2' : '#dbeafe',
      iconColor: isCancelled ? '#dc2626' : '#2563eb',
      icon: <CalendarOutlined />,
      actionText: 'Xem danh sách đặt bàn ➜',
      defaultTitle: 'Thông báo đặt bàn',
    };
  }

  // 1. BẢNG LƯƠNG & CHỐT LƯƠNG CHI NHÁNH (Payroll)
  if (type === 'Payroll' || title.includes('chốt lương') || title.includes('trả lương') || title.includes('bảng lương') || message.includes('chốt lương')) {
    const isUrgent = title.includes('cảnh báo') || title.includes('chủ cửa hàng') || title.includes('chưa chốt') || isImportant;
    if (isUrgent) {
      return {
        categoryKey: 'PayrollAlert',
        badgeText: 'LƯƠNG - HẠN CHỐT',
        badgeEmoji: '🚨',
        accentColor: '#ef4444',
        cardBg: '#fef2f2',
        borderColor: '#fca5a5',
        tagBg: '#fee2e2',
        tagColor: '#991b1b',
        iconBg: '#fee2e2',
        iconColor: '#dc2626',
        icon: <DollarOutlined />,
        actionText: 'Mở trang Bảng lương ➜',
        defaultTitle: 'Cảnh báo hạn chốt lương chi nhánh',
      };
    }
    return {
      categoryKey: 'PayrollPayday',
      badgeText: 'LƯƠNG - THANH TOÁN',
      badgeEmoji: '💰',
      accentColor: '#2563eb',
      cardBg: '#eff6ff',
      borderColor: '#bfdbfe',
      tagBg: '#dbeafe',
      tagColor: '#1e40af',
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
      icon: <DollarOutlined />,
      actionText: 'Mở trang Bảng lương ➜',
      defaultTitle: 'Thông báo thanh toán lương',
    };
  }

  // 2. HẠN SỬ DỤNG & LÔ NGUYÊN LIỆU (ShelfLife / Expiry)
  if (type === 'ShelfLife' || title.includes('hết hạn') || message.includes('hết hạn') || title.includes('hạn sử dụng')) {
    const isExpired = title.includes('đã hết hạn') || message.includes('đã hết hạn') || isImportant;
    if (isExpired) {
      return {
        categoryKey: 'ShelfLifeExpired',
        badgeText: 'HẠN DÙNG - ĐÃ HẾT HẠN',
        badgeEmoji: '🚨',
        accentColor: '#e11d48',
        cardBg: '#fff1f2',
        borderColor: '#fecdd3',
        tagBg: '#ffe4e6',
        tagColor: '#be123c',
        iconBg: '#ffe4e6',
        iconColor: '#e11d48',
        icon: <AlertOutlined />,
        actionText: 'Xử lý lô nguyên liệu quá hạn ➜',
        defaultTitle: 'Lô nguyên liệu đã hết hạn sử dụng',
      };
    }
    return {
      categoryKey: 'ShelfLifeWarning',
      badgeText: 'HẠN DÙNG - HẾT HẠN',
      badgeEmoji: '⏳',
      accentColor: '#f43f5e',
      cardBg: '#fff1f2',
      borderColor: '#fecdd3',
      tagBg: '#ffe4e6',
      tagColor: '#9f1239',
      iconBg: '#ffe4e6',
      iconColor: '#f43f5e',
      icon: <HourglassOutlined />,
      actionText: 'Kiểm tra lô hàng hết hạn ➜',
      defaultTitle: 'Lô nguyên liệu hết hạn sử dụng',
    };
  }

  // 2. CHẤM CÔNG & CA LÀM VIỆC (Attendance / Shift / WorkSchedule)
  if (type === 'Attendance' || title.includes('chấm công') || message.includes('chấm công') || title.includes('ca làm') || title.includes('đổi ca') || title.includes('nghỉ phép')) {
    const isLateOrMissing = title.includes('chưa chấm công') || message.includes('chưa') || title.includes('quá giờ') || title.includes('trễ');
    if (isLateOrMissing) {
      return {
        categoryKey: 'AttendanceLate',
        badgeText: 'CHẤM CÔNG - CHƯA VÀO CA',
        badgeEmoji: '⏰',
        accentColor: '#8b5cf6',
        cardBg: '#faf5ff',
        borderColor: '#e9d5ff',
        tagBg: '#ede9fe',
        tagColor: '#6d28d9',
        iconBg: '#f3e8ff',
        iconColor: '#7c3aed',
        icon: <ClockCircleOutlined />,
        actionText: 'Mở lịch làm việc ➜',
        defaultTitle: 'Nhân viên chưa chấm công vào ca',
      };
    }
    return {
      categoryKey: 'AttendanceStart',
      badgeText: 'CHẤM CÔNG - MỞ CA LÀM',
      badgeEmoji: '📋',
      accentColor: '#3b82f6',
      cardBg: '#eff6ff',
      borderColor: '#bfdbfe',
      tagBg: '#dbeafe',
      tagColor: '#1d4ed8',
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      icon: <ScheduleOutlined />,
      actionText: 'Mở lịch làm việc ➜',
      defaultTitle: 'Bắt đầu chấm công ca làm việc',
    };
  }

  // 3. TỒN KHO NGUYÊN LIỆU (Inventory / Out of Stock)
  if (type === 'Inventory' || title.includes('tồn kho') || message.includes('tồn kho') || title.includes('nguyên liệu') || title.includes('hết hàng')) {
    return {
      categoryKey: 'Inventory',
      badgeText: 'TỒN KHO - HÀNG HẾT',
      badgeEmoji: '📦',
      accentColor: '#f97316',
      cardBg: '#fff7ed',
      borderColor: '#fed7aa',
      tagBg: '#ffedd5',
      tagColor: '#c2410c',
      iconBg: '#ffedd5',
      iconColor: '#ea580c',
      icon: <InboxOutlined />,
      actionText: 'Kiểm tra tồn kho & Đặt hàng ➜',
      defaultTitle: 'Nguyên liệu hết tồn kho',
    };
  }

  // 4. KIỂM KÊ CHẤT LƯỢNG & HAO HỤT (Quality & Audit)
  if (type === 'Quality' || title.includes('kiểm kê') || message.includes('kiểm kho') || title.includes('hao hụt') || message.includes('hao hụt') || title.includes('sai số')) {
    return {
      categoryKey: 'Quality',
      badgeText: 'KIỂM KÊ - HAO HỤT',
      badgeEmoji: '🔍',
      accentColor: '#d97706',
      cardBg: '#fefce8',
      borderColor: '#fef08a',
      tagBg: '#fef9c3',
      tagColor: '#a16207',
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      icon: <AuditOutlined />,
      actionText: 'Xem biên bản kiểm kê kho ➜',
      defaultTitle: 'Sai số hao hụt kiểm kho',
    };
  }

  // 5. ĐƠN HÀNG & MÓN ĂN (Order & Kitchen)
  if (
    type === 'Order' ||
    title.includes('đơn hàng') ||
    title.includes('món ăn') ||
    (title.includes('bàn') && !title.includes('đặt bàn')) ||
    (message.includes('bàn') && !message.includes('đặt bàn')) ||
    message.includes('order')
  ) {
    return {
      categoryKey: 'Order',
      badgeText: 'ĐƠN HÀNG - PHỤC VỤ',
      badgeEmoji: '🍽️',
      accentColor: '#16a34a',
      cardBg: '#f0fdf4',
      borderColor: '#bbf7d0',
      tagBg: '#dcfce7',
      tagColor: '#15803d',
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      icon: <ShoppingOutlined />,
      actionText: 'Xem chi tiết đơn hàng ➜',
      defaultTitle: 'Đơn hàng & Món ăn',
    };
  }

  // 6. TIN NHẮN & TƯ VẤN (Chat)
  if (type === 'Chat' || title.includes('tin nhắn') || message.includes('tin nhắn')) {
    return {
      categoryKey: 'Chat',
      badgeText: 'TIN NHẮN - HỖ TRỢ',
      badgeEmoji: '💬',
      accentColor: '#0284c7',
      cardBg: '#f0f9ff',
      borderColor: '#bae6fd',
      tagBg: '#e0f2fe',
      tagColor: '#0369a1',
      iconBg: '#e0f2fe',
      iconColor: '#0284c7',
      icon: <MessageOutlined />,
      actionText: 'Mở cuộc trò chuyện ➜',
      defaultTitle: 'Tin nhắn hỗ trợ',
    };
  }

  // 7. TÀI CHÍNH & CHI PHÍ (Operational / Finance)
  if (type === 'Operational' && (title.includes('chi phí') || message.includes('chi phí') || title.includes('tiền') || message.includes('sổ quỹ'))) {
    return {
      categoryKey: 'Finance',
      badgeText: 'TÀI CHÍNH - CHI PHÍ',
      badgeEmoji: '💰',
      accentColor: '#0d9488',
      cardBg: '#f0fdfa',
      borderColor: '#99f6e4',
      tagBg: '#ccfbf1',
      tagColor: '#0f766e',
      iconBg: '#ccfbf1',
      iconColor: '#0d9488',
      icon: <DollarOutlined />,
      actionText: 'Xem chi tiết sổ quỹ & chi phí ➜',
      defaultTitle: 'Cảnh báo chi phí hoạt động',
    };
  }

  // 8. VẬN HÀNH HỆ THỐNG (Operational / General)
  if (type === 'Operational') {
    return {
      categoryKey: 'Operational',
      badgeText: 'VẬN HÀNH - HỆ THỐNG',
      badgeEmoji: '⚠️',
      accentColor: '#0284c7',
      cardBg: '#f0f9ff',
      borderColor: '#bae6fd',
      tagBg: '#e0f2fe',
      tagColor: '#0369a1',
      iconBg: '#e0f2fe',
      iconColor: '#0284c7',
      icon: <WarningOutlined />,
      actionText: 'Xem chi tiết vận hành ➜',
      defaultTitle: 'Cảnh báo vận hành',
    };
  }

  // 9. KHÁC / THÔNG BÁO CHUNG
  return {
    categoryKey: 'Other',
    badgeText: 'THÔNG BÁO HỆ THỐNG',
    badgeEmoji: '📌',
    accentColor: '#64748b',
    cardBg: '#f8fafc',
    borderColor: '#e2e8f0',
    tagBg: '#f1f5f9',
    tagColor: '#475569',
    iconBg: '#f1f5f9',
    iconColor: '#64748b',
    icon: <BellOutlined />,
    actionText: 'Xem chi tiết ➜',
    defaultTitle: 'Thông báo hệ thống',
  };
};

export const NOTIFICATION_CATEGORIES = [
  { value: 'All', label: 'Tất cả', emoji: '🔔' },
  { value: 'Inventory', label: 'Tồn kho & Hàng hết', emoji: '📦' },
  { value: 'Attendance', label: 'Chấm công', emoji: '⏰' },
  { value: 'ShelfLife', label: 'Hạn sử dụng', emoji: '⏳' },
  { value: 'Reservation', label: 'Đặt bàn', emoji: '📅' },
  { value: 'Payroll', label: 'Lương thưởng', emoji: '💰' },
  { value: 'Quality', label: 'Kiểm kê & Hao hụt', emoji: '🔍' },
  { value: 'Order', label: 'Đơn hàng & Phục vụ', emoji: '🍽️' },
  { value: 'Chat', label: 'Tin nhắn hỗ trợ', emoji: '💬' }
];

/**
 * Trích xuất đường dẫn thông minh khi bấm vào thông báo:
 * - Về kho: Tự động gắn query ?tab=Product&search=...&expand=true để nhảy thẳng vào đúng nguyên liệu và mở chi tiết
 * - Về nhân viên/chấm công: Tự động gắn query mở trang Lịch làm việc /work-schedule?search=...&accountId=...
 */
export const getNotificationSmartRedirectUrl = (item) => {
  if (!item) return '/home';

  const type = item.type || '';
  const title = (item.title || '').toLowerCase();
  const message = (item.message || '').toLowerCase();
  const rawUrl = item.redirectUrl || '';

  // 1. TỒN KHO & HẠN DÙNG (Kho nguyên liệu / Hàng sắp hết / Hết hạn / Hao hụt)
  if (type === 'Inventory' || type === 'ShelfLife' || type === 'Quality' || rawUrl.includes('/inventory-management')) {
    let searchTarget = '';
    let inventoryId = (item.referenceType === 'BInventory' && item.referenceId) ? item.referenceId : null;
    let batchId = (item.referenceType === 'BInventoryBatch' && item.referenceId) ? item.referenceId : null;
    let productId = null;
    let activeTab = null;

    // Ưu tiên đọc tham số từ rawUrl nếu có
    if (rawUrl) {
      try {
        const urlObj = new URL(rawUrl, 'http://localhost');
        if (urlObj.searchParams.get('search')) searchTarget = urlObj.searchParams.get('search');
        if (urlObj.searchParams.get('inventoryId')) inventoryId = urlObj.searchParams.get('inventoryId');
        if (urlObj.searchParams.get('batchId')) batchId = urlObj.searchParams.get('batchId');
        if (urlObj.searchParams.get('productId')) productId = urlObj.searchParams.get('productId');
        if (urlObj.searchParams.get('activeTab')) activeTab = urlObj.searchParams.get('activeTab');
      } catch (e) {
        // Bỏ qua lỗi parse URL
      }
    }

    // Nếu chưa có searchTarget từ rawUrl, bóc tách từ thông điệp
    if (!searchTarget && item.message) {
      const ingredientMatch = item.message.match(/(?:nguyên liệu|sản phẩm|món|hàng)\s*["'“]([^"'“”]+)["'”]/i);
      if (ingredientMatch) {
        searchTarget = ingredientMatch[1].trim();
      } else {
        const allMatches = [...(item.message.matchAll(/["'“]([^"'“”]+)["'”]/g) || [])];
        if (allMatches.length > 0) {
          if (allMatches.length > 1 && (item.message.toLowerCase().includes('lô ') || item.message.toLowerCase().includes('lot'))) {
            searchTarget = allMatches[1][1].trim();
          } else {
            searchTarget = allMatches[0][1].trim();
          }
        }
      }
    }

    let targetUrl = '/inventory-management?tab=Product';
    if (searchTarget) {
      targetUrl += `&search=${encodeURIComponent(searchTarget)}`;
    }
    if (inventoryId) {
      targetUrl += `&inventoryId=${inventoryId}`;
    }
    if (productId) {
      targetUrl += `&productId=${productId}`;
    }
    if (batchId) {
      targetUrl += `&batchId=${batchId}`;
      targetUrl += `&activeTab=${activeTab || 'batches'}`;
    }
    targetUrl += '&expand=true';
    return targetUrl;
  }

  // 2. CHẤM CÔNG & LỊCH LÀM VIỆC (Mở trang /work-schedule)
  if (
    type === 'Attendance' ||
    title.includes('chấm công') ||
    message.includes('chấm công') ||
    message.includes('check-in') ||
    message.includes('check in') ||
    title.includes('nhân viên') ||
    message.includes('nhân viên') ||
    rawUrl.includes('/work-schedule') ||
    rawUrl.includes('/accounts')
  ) {
    let employeeName = '';
    let accountId = item.accountId || null;

    if (rawUrl) {
      try {
        const urlObj = new URL(rawUrl, 'http://localhost');
        if (urlObj.searchParams.get('search')) employeeName = urlObj.searchParams.get('search');
        if (urlObj.searchParams.get('accountId')) accountId = urlObj.searchParams.get('accountId');
      } catch (e) {
        // Bỏ qua lỗi parse URL
      }
    }

    if (!employeeName && item.message) {
      const empMatch = item.message.match(/(?:nhân viên|tài khoản|người)\s*["'“]([^"'“”]+)["'”]/i);
      if (empMatch) {
        employeeName = empMatch[1].trim();
      } else {
        const match = item.message.match(/["'“]([^"'“”]+)["'”]/);
        if (match) employeeName = match[1].trim();
      }
    }

    let targetUrl = '/work-schedule';
    const params = [];
    if (employeeName) {
      params.push(`search=${encodeURIComponent(employeeName)}`);
    }
    if (accountId) {
      params.push(`accountId=${accountId}`);
    }
    if (item.referenceId && item.referenceType?.startsWith('WorkSchedule')) {
      params.push(`scheduleId=${item.referenceId}`);
    }
    if (params.length > 0) {
      targetUrl += `?${params.join('&')}`;
    }
    return targetUrl;
  }

  // 3. ĐẶT BÀN & ĐẶT CHỖ
  if (type === 'Reservation' || title.includes('đặt bàn') || message.includes('đặt bàn') || rawUrl.includes('/reservations')) {
    return rawUrl || '/reservations';
  }

  // 4. BẢNG LƯƠNG & CHỐT LƯƠNG CHI NHÁNH
  if (type === 'Payroll' || rawUrl.includes('/payroll') || title.includes('lương')) {
    return '/payroll';
  }

  // 5. ĐƠN HÀNG & PHỤC VỤ
  if (type === 'Order' || rawUrl.includes('/orders')) {
    return rawUrl || '/orders';
  }

  // 6. KIỂM KÊ & HAO HỤT
  if (type === 'Quality' || title.includes('kiểm kê') || message.includes('kiểm kê') || title.includes('hao hụt')) {
    return '/inventory-management?tab=Check';
  }

  // 7. SỔ QUỸ & CHI PHÍ
  if (type === 'Operational' && (title.includes('chi phí') || message.includes('chi phí') || rawUrl.includes('/cashflow'))) {
    return '/cashflow';
  }

  return rawUrl || '/home';
};


