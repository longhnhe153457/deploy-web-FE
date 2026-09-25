import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Dropdown, Avatar, message, Select, Tooltip, Button, Badge } from "antd";
import NotificationBell from './NotificationBell';
import { useSignalR } from "../context/SignalRContext";
import axiosInstance from "../api/axiosInstance";
import {
  HomeOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  CalendarOutlined,
  ShopOutlined,
  ApartmentOutlined,
  TableOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  CrownOutlined,
  DesktopOutlined,
  BookOutlined,
  FireOutlined,
  GiftOutlined,
  RocketOutlined,
  FileProtectOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  InboxOutlined,
  DollarOutlined,
  FileTextOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownOutlined,
  RightOutlined,
  WalletOutlined,
  GlobalOutlined,
  MessageOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useAuth, ROLES } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";


// ─── Tùy chọn con của Quản Lý Kho ──────────────────────────────────────────
const INVENTORY_SUB_MENU = [
  { label: "Điều chỉnh giá vốn", path: "/inventory-management?tab=Adjustment", tabKey: "Adjustment" },
  { label: "Nhập hàng", path: "/inventory-management?tab=Import", tabKey: "Import" },
  { label: "Trả hàng nhập", path: "/inventory-management?tab=ImportReturn", tabKey: "ImportReturn" },
  { label: "Xuất hủy", path: "/inventory-management?tab=ExportDelete", tabKey: "ExportDelete" },
  { label: "Chuyển hàng", path: "/inventory-management?tab=Transfer", tabKey: "Transfer" },
  { label: "Kiểm kho", path: "/inventory-management?tab=Check", tabKey: "Check" },
  { label: "Đối tác", path: "/inventory-management?tab=Partner", tabKey: "Partner" },
  { label: "Khách hàng", path: "/inventory-management?tab=Customer", tabKey: "Customer" },
  { label: "Hóa đơn", path: "/inventory-management?tab=Invoice", tabKey: "Invoice" },
  { label: "Đồ chuẩn bị sẵn", path: "/inventory-management?tab=Production", tabKey: "Production" },
  { label: "Danh sách nguyên liệu", path: "/inventory-management?tab=Product", tabKey: "Product" },
  { label: "Lô hàng & Hạn sử dụng", path: "/inventory-management?tab=BatchExpiry", tabKey: "BatchExpiry" },
];

const REPORTS_SUB_MENU = [
  { label: "Báo cáo Doanh thu", path: "/reports/revenue" },
  { label: "Báo cáo Chi phí", path: "/reports/expense" },
  { label: "Báo cáo Lợi nhuận", path: "/reports/profit" },
  { label: "Báo cáo Nguyên liệu", path: "/reports/inventory" },
];

const MY_INFO_SUB_MENU = [
  { label: "Hợp đồng của tôi", path: "/my-contract" },
  { label: "Bảng lương của tôi", path: "/my-payroll" },
];

const PAYROLL_SUB_MENU = [
  { label: "Lương Nhân viên", path: "/payroll?tab=Staff", tabKey: "Staff" },
  { label: "Lương Quản lý", path: "/payroll?tab=Manager", tabKey: "Manager" },
];

// ─── Menu items theo từng role ─────────────────────────────────────────────
const ROLE_MENUS = {
  [ROLES.ADMIN]: [
    { label: "Tổng quan", path: "/home", icon: <HomeOutlined /> },
    { label: "Báo cáo chuyên sâu", path: "/reports/revenue", icon: <BarChartOutlined />, children: REPORTS_SUB_MENU },
    { label: "Lịch làm việc", path: "/work-schedule", icon: <CalendarOutlined /> },
    { label: "Ca làm việc", path: "/shifts", icon: <ClockCircleOutlined /> },
    { label: "Phản hồi ca làm", path: "/work-schedule-feedback", icon: <MessageOutlined /> },
    { label: "Nhân sự", path: "/accounts", icon: <TeamOutlined /> },
    { label: "Hợp đồng", path: "/contracts", icon: <FileProtectOutlined /> },
    { label: "Chi tiết lương", path: "/salary-details", icon: <FileTextOutlined /> },
    { label: "Bảng lương", path: "/payroll", icon: <DollarOutlined />, children: PAYROLL_SUB_MENU },
    { label: "Trò chuyện khách", path: "/chat", icon: <MessageOutlined /> },
    { label: "Phục vụ", path: "/waiter-session", icon: <UserOutlined /> },
    { label: "Thu ngân", path: "/cashier", icon: <DollarOutlined /> },
    { label: "Đặt bàn", path: "/reservations", icon: <BookOutlined /> },
    { label: "Màn hình Bếp", path: "/kds", icon: <FireOutlined /> },
    { label: "Trả món", path: "/leftover", icon: <DeleteOutlined /> },
    { label: "Khuyến mãi", path: "/promotions", icon: <GiftOutlined /> },
    { label: "Cấu hình Lễ/Tết", path: "/holiday-config", icon: <GiftOutlined /> },
    { label: "Quản lý bàn", path: "/tables", icon: <TableOutlined /> },
    { label: "Danh mục sản phẩm", path: "/product-catalog", icon: <AppstoreOutlined /> },
    { label: "Quản lý kho", path: "/inventory-management", icon: <InboxOutlined />, children: INVENTORY_SUB_MENU },
    { label: "Sổ thu chi", path: "/cashflow", icon: <WalletOutlined /> },
    { label: "Thực đơn", path: "/menu-management", icon: <BookOutlined /> },
    { label: "Chuỗi", path: "/chains", icon: <ShopOutlined /> },
    { label: "Chi nhánh", path: "/branches", icon: <ApartmentOutlined /> },
    { label: "Trang chào mừng", path: "/welcome", icon: <GlobalOutlined /> },
  ],
  [ROLES.OWNER]: [
    { label: "Tổng quan", path: "/home", icon: <HomeOutlined /> },
    { label: "Báo cáo chuyên sâu", path: "/reports/revenue", icon: <BarChartOutlined />, children: REPORTS_SUB_MENU },
    { label: "Lịch làm việc", path: "/work-schedule", icon: <CalendarOutlined /> },
    { label: "Ca làm việc", path: "/shifts", icon: <ClockCircleOutlined /> },
    { label: "Phản hồi ca làm", path: "/work-schedule-feedback", icon: <MessageOutlined /> },
    { label: "Nhân sự", path: "/accounts", icon: <TeamOutlined /> },
    { label: "Hợp đồng", path: "/contracts", icon: <FileProtectOutlined /> },
    { label: "Chi tiết lương", path: "/salary-details", icon: <FileTextOutlined /> },
    { label: "Bảng lương", path: "/payroll", icon: <DollarOutlined />, children: PAYROLL_SUB_MENU },
    { label: "Trò chuyện khách", path: "/chat", icon: <MessageOutlined /> },
    { label: "Màn hình Bếp", path: "/kds", icon: <FireOutlined /> },
    { label: "Trả món", path: "/leftover", icon: <DeleteOutlined /> },
    { label: "Khuyến mãi", path: "/promotions", icon: <GiftOutlined /> },
    { label: "Cấu hình Lễ/Tết", path: "/holiday-config", icon: <GiftOutlined /> },
    { label: "Quản lý bàn", path: "/tables", icon: <TableOutlined /> },
    { label: "Danh mục sản phẩm", path: "/product-catalog", icon: <AppstoreOutlined /> },
    { label: "Quản lý kho", path: "/inventory-management", icon: <InboxOutlined />, children: INVENTORY_SUB_MENU },
    { label: "Sổ thu chi", path: "/cashflow", icon: <WalletOutlined /> },
    { label: "Thực đơn", path: "/menu-management", icon: <BookOutlined /> },
    { label: "Chuỗi", path: "/chains", icon: <ShopOutlined /> },
    { label: "Chi nhánh", path: "/branches", icon: <ApartmentOutlined /> },
    { label: "Trang chào mừng", path: "/welcome", icon: <GlobalOutlined /> },
  ],
  [ROLES.MANAGER]: [
    { label: "Tổng quan", path: "/home", icon: <HomeOutlined /> },
    { label: "Báo cáo chuyên sâu", path: "/reports/revenue", icon: <BarChartOutlined />, children: REPORTS_SUB_MENU },
    { label: "Lịch làm việc", path: "/work-schedule", icon: <CalendarOutlined /> },
    { label: "Ca làm việc", path: "/shifts", icon: <ClockCircleOutlined /> },
    { label: "Phản hồi ca làm", path: "/work-schedule-feedback", icon: <MessageOutlined /> },
    { label: "Tổng hợp tháng", path: "/work-schedule-summary", icon: <BarChartOutlined /> },
    { label: "Nhân sự", path: "/accounts", icon: <TeamOutlined /> },
    { label: "Hợp đồng", path: "/contracts", icon: <FileProtectOutlined /> },
    { label: "Chi tiết lương", path: "/salary-details", icon: <FileTextOutlined /> },
    { label: "Bảng lương", path: "/payroll", icon: <DollarOutlined /> },
    { label: "Trò chuyện khách", path: "/chat", icon: <MessageOutlined /> },
    { label: "Phiên Phục vụ", path: "/waiter-session", icon: <RocketOutlined /> },
    { label: "Phiên Thu Ngân", path: "/cashier-session", icon: <DollarOutlined /> },
    { label: "Phiên Bếp", path: "/kitchen-session", icon: <FireOutlined /> },
    { label: "Đặt bàn", path: "/reservations", icon: <BookOutlined /> },
    { label: "Màn hình Bếp", path: "/kds", icon: <FireOutlined /> },
    { label: "Trả món", path: "/leftover", icon: <DeleteOutlined /> },
    { label: "Khuyến mãi", path: "/promotions", icon: <GiftOutlined /> },
    { label: "Cấu hình Lễ/Tết", path: "/holiday-config", icon: <GiftOutlined /> },
    { label: "Quản lý bàn", path: "/tables", icon: <TableOutlined /> },
    { label: "Quản lý kho", path: "/inventory-management", icon: <InboxOutlined />, children: INVENTORY_SUB_MENU },
    { label: "Sổ thu chi", path: "/cashflow", icon: <WalletOutlined /> },
    { label: "Thực đơn", path: "/menu-management", icon: <BookOutlined /> },
    { label: "Cá nhân", path: "/my-contract", icon: <UserOutlined />, children: MY_INFO_SUB_MENU },
    { label: "Trang chào mừng", path: "/welcome", icon: <GlobalOutlined /> },
  ],
  [ROLES.CASHIER]: [
    { label: "Lịch làm việc", path: "/work-schedule", icon: <CalendarOutlined /> },
    { label: "Trò chuyện khách", path: "/chat", icon: <MessageOutlined /> },
    { label: "Phiên Thu Ngân", path: "/cashier-session", icon: <DollarOutlined /> },
    { label: "Hợp đồng của tôi", path: "/my-contract", icon: <FileProtectOutlined /> },
    { label: "Bảng lương của tôi", path: "/my-payroll", icon: <DollarOutlined /> },
    { label: "Trang chào mừng", path: "/welcome", icon: <GlobalOutlined /> },
  ],
  [ROLES.CHEF]: [
    { label: "Lịch làm việc", path: "/work-schedule", icon: <CalendarOutlined /> },
    { label: "Phiên Bếp", path: "/kitchen-session", icon: <FireOutlined /> },
    { label: "Hợp đồng của tôi", path: "/my-contract", icon: <FileProtectOutlined /> },
    { label: "Bảng lương của tôi", path: "/my-payroll", icon: <DollarOutlined /> },
    { label: "Trang chào mừng", path: "/welcome", icon: <GlobalOutlined /> },
  ],
  [ROLES.WAITER]: [
    { label: "Lịch làm việc", path: "/work-schedule", icon: <CalendarOutlined /> },
    { label: "Phiên Phục vụ", path: "/waiter-session", icon: <RocketOutlined /> },
    { label: "Trả món", path: "/leftover", icon: <DeleteOutlined /> },
    { label: "Hợp đồng của tôi", path: "/my-contract", icon: <FileProtectOutlined /> },
    { label: "Bảng lương của tôi", path: "/my-payroll", icon: <DollarOutlined /> },
    { label: "Trang chào mừng", path: "/welcome", icon: <GlobalOutlined /> },
  ],
};

// ─── Hiển thị role bằng tiếng Việt ───────────────────────────────────────
const ROLE_LABELS = {
  [ROLES.ADMIN]: "Chủ sở hữu",
  [ROLES.OWNER]: "Chủ sở hữu",
  [ROLES.MANAGER]: "Quản lý",
  [ROLES.CASHIER]: "Thu ngân",
  [ROLES.CHEF]: "Bếp trưởng",
  [ROLES.WAITER]: "Phục vụ",
};

const SideBar = ({ collapsed, onToggleCollapse }) => {
  const { user, role, logout } = useAuth();
  const { currentBranchId, selectBranch, branches } = useBranch();
  const location = useLocation();
  const navigate = useNavigate();

  const [openSubMenus, setOpenSubMenus] = useState({
    "Quản lý kho": true,
    "Báo cáo chuyên sâu": true,
  });

  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const connection = useSignalR();

  const fetchChatUnreadCount = useCallback(async () => {
    if (!currentBranchId) {
      setChatUnreadCount(0);
      return;
    }
    try {
      const res = await axiosInstance.get('/api/BranchChat/conversations', {
        params: { branchId: currentBranchId },
      });
      if (Array.isArray(res.data)) {
        const total = res.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setChatUnreadCount(total);
      }
    } catch (err) {
      console.warn('Không thể tải số tin nhắn chưa đọc:', err);
    }
  }, [currentBranchId]);

  useEffect(() => {
    fetchChatUnreadCount();
  }, [currentBranchId, fetchChatUnreadCount]);

  useEffect(() => {
    const handleCustomUpdate = (e) => {
      if (typeof e.detail === "number") {
        setChatUnreadCount(e.detail);
      } else {
        fetchChatUnreadCount();
      }
    };
    window.addEventListener("chat-unread-updated", handleCustomUpdate);
    return () => {
      window.removeEventListener("chat-unread-updated", handleCustomUpdate);
    };
  }, [fetchChatUnreadCount]);

  useEffect(() => {
    if (connection && currentBranchId) {
      connection.invoke("JoinBranchGroup", currentBranchId).catch(() => {});

      const handleSignalRUpdate = () => {
        fetchChatUnreadCount();
      };

      connection.on("ReceiveNewMessage", handleSignalRUpdate);
      connection.on("ReceiveNewConversation", handleSignalRUpdate);

      return () => {
        connection.off("ReceiveNewMessage", handleSignalRUpdate);
        connection.off("ReceiveNewConversation", handleSignalRUpdate);
      };
    }
  }, [connection, currentBranchId, fetchChatUnreadCount]);

  const toggleSubMenu = (label) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const menuItems = ROLE_MENUS[role] ?? [];
  const searchParams = new URLSearchParams(location.search);
  const activeTabParam = searchParams.get("tab") || "Adjustment";

  const handleLogout = async () => {
    await logout();
    message.success("Đã đăng xuất");
    navigate("/login");
  };

  const userMenuItems = [
    {
      key: "user-info",
      label: (
        <div style={{ padding: "4px 8px" }}>
          <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
            {user?.name || user?.fullName || "Người dùng"}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {user?.email || ""}
          </div>
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Thông tin tài khoản",
      onClick: () => navigate("/my-profile"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      danger: true,
      label: "Đăng xuất",
      onClick: handleLogout,
    },
  ];

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Sidebar Header: Logo & Toggle Button */}
      <div className="sidebar-header" style={{ flexDirection: collapsed ? 'column' : 'row', gap: collapsed ? 8 : 0, paddingTop: 12, paddingBottom: collapsed ? 12 : 10, height: 'auto' }}>
        <Link to="/home" className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <CrownOutlined style={{ fontSize: 22, color: "var(--color-primary)" }} />
          </div>
          {!collapsed && <span className="sidebar-logo-text">MenuGo</span>}
        </Link>
        <div style={{ display: 'flex', flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', gap: collapsed ? 8 : 4 }}>
          <NotificationBell collapsed={collapsed} />
          <Button
            type="text"
            className="sidebar-toggle-btn"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={onToggleCollapse}
            title={collapsed ? "Mở rộng Sidebar" : "Thu gọn Sidebar"}
          />
        </div>
      </div>

      {/* Branch Selector */}
      {branches && branches.length > 0 && (
        <div className="sidebar-branch-wrapper">
          {!collapsed ? (
            <Select
              className="sidebar-branch-select"
              value={currentBranchId || undefined}
              onChange={(value) => selectBranch(value)}
              placeholder="Chọn chi nhánh"
              options={branches.map((b) => ({
                label: (
                  <span style={{ fontSize: 13, fontWeight: 500, color: b.status === "Ngừng kinh doanh" ? "#ff4d4f" : "inherit" }}>
                    <ShopOutlined style={{ marginRight: 6, color: b.status === "Ngừng kinh doanh" ? "#ff4d4f" : "var(--color-primary)" }} />
                    {b.name} {b.status === "Ngừng kinh doanh" ? " (Ngừng kinh doanh)" : ""}
                  </span>
                ),
                value: b.id,
              }))}
            />
          ) : (
            <Tooltip title="Đổi chi nhánh" placement="right">
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: branches.map((b) => ({
                    key: b.id,
                    label: b.status === "Ngừng kinh doanh" ? `${b.name} (Ngừng kinh doanh)` : b.name,
                    icon: <ShopOutlined style={{ color: b.status === "Ngừng kinh doanh" ? "#ff4d4f" : undefined }} />,
                    onClick: () => selectBranch(b.id),
                  })),
                  selectedKeys: [String(currentBranchId)],
                }}
              >
                <Button
                  type="text"
                  className="sidebar-branch-collapsed-btn"
                  icon={<ShopOutlined style={{ color: "var(--color-primary)", fontSize: 18 }} />}
                />
              </Dropdown>
            </Tooltip>
          )}
        </div>
      )}

      {/* Sidebar Nav List */}
      <nav className="sidebar-nav">
        {menuItems.map((item, idx) => {
          const hasChildren = item.children && item.children.length > 0;
          const isParentActive = hasChildren
            ? item.children.some((child) => {
              const childBasePath = child.path.split("?")[0];
              if (child.tabKey) {
                return location.pathname === childBasePath && activeTabParam === child.tabKey;
              }
              return location.pathname === childBasePath;
            })
            : location.pathname === item.path ||
            (item.path !== "/home" && location.pathname.startsWith(item.path + "/"));

          const isSubOpen = openSubMenus[item.label] ?? true;

          // ── Parent Menu Item With Submenu (e.g., Quản lý kho, Báo cáo chuyên sâu) ───────────────
          if (hasChildren) {
            if (collapsed) {
              const popupMenuItems = item.children.map((child) => {
                const childBasePath = child.path.split("?")[0];
                const isChildActive = child.tabKey
                  ? location.pathname === childBasePath && activeTabParam === child.tabKey
                  : location.pathname === childBasePath;
                return {
                  key: child.tabKey || child.path,
                  label: (
                    <span style={{ color: isChildActive ? "var(--color-primary)" : "inherit", fontWeight: isChildActive ? 600 : 400 }}>
                      {child.label}
                    </span>
                  ),
                  onClick: () => navigate(child.path),
                };
              });

              return (
                <Dropdown
                  key={idx}
                  placement="rightTop"
                  menu={{ items: popupMenuItems }}
                  trigger={["hover", "click"]}
                >
                  <div className={`sidebar-nav-item ${isParentActive ? "active" : ""}`} style={{ cursor: "pointer" }}>
                    <span className="sidebar-nav-icon">{item.icon}</span>
                  </div>
                </Dropdown>
              );
            }

            return (
              <div key={idx} className="sidebar-menu-group">
                <div
                  className={`sidebar-nav-item parent ${isParentActive ? "active" : ""}`}
                  onClick={() => toggleSubMenu(item.label)}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  <span className="sidebar-nav-label">{item.label}</span>
                  <span className="sidebar-nav-arrow">
                    {isSubOpen ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
                  </span>
                </div>

                {isSubOpen && (
                  <div className="sidebar-submenu">
                    {item.children.map((child, cIdx) => {
                      const childBasePath = child.path.split("?")[0];
                      const isChildActive = child.tabKey
                        ? location.pathname === childBasePath && activeTabParam === child.tabKey
                        : location.pathname === childBasePath;
                      return (
                        <Link
                          key={cIdx}
                          to={child.path}
                          state={{ from: location }}
                          className={`sidebar-submenu-item ${isChildActive ? "active" : ""}`}
                        >
                          <span className="sidebar-submenu-dot">•</span>
                          <span className="sidebar-submenu-label">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ── Standard Single Menu Item ──────────────────────────────────────
          const isChatItem = item.path === "/chat";
          const showBadge = isChatItem && chatUnreadCount > 0;

          const navLinkContent = (
            <Link
              key={idx}
              to={item.path}
              state={{ from: location }}
              className={`sidebar-nav-item ${isParentActive ? "active" : ""}`}
            >
              <span className="sidebar-nav-icon">
                {showBadge && collapsed ? (
                  <Badge count={chatUnreadCount} overflowCount={99} size="small" offset={[2, -2]}>
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </span>
              {!collapsed && (
                <span
                  className="sidebar-nav-label"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    gap: 8,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.label}
                  </span>
                  {showBadge && (
                    <Badge
                      count={chatUnreadCount}
                      overflowCount={99}
                      style={{
                        backgroundColor: "#ef4444",
                        boxShadow: "0 0 0 1px #fff",
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    />
                  )}
                </span>
              )}
            </Link>
          );

          if (collapsed) {
            const tooltipTitle = showBadge ? `${item.label} (${chatUnreadCount} tin chưa đọc)` : item.label;
            return (
              <Tooltip key={idx} title={tooltipTitle} placement="right">
                {navLinkContent}
              </Tooltip>
            );
          }

          return navLinkContent;
        })}
      </nav>

      {/* Sidebar Footer: User Info, Bell & Logout */}
      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        {!collapsed && (
          <Dropdown menu={{ items: userMenuItems }} trigger={["click"]} placement="topRight">
            <div className="sidebar-user" style={{ flex: 1, overflow: 'hidden' }}>
              <Avatar className="sidebar-avatar" icon={<UserOutlined />} />
              <div className="sidebar-user-info">
                <span className="sidebar-user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {user?.name || user?.fullName || "Người dùng"}
                </span>
                <span className="sidebar-user-role">
                  {ROLE_LABELS[role] || role || "Nhân viên"}
                </span>
              </div>
            </div>
          </Dropdown>
        )}

        <div style={{ display: 'flex', flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', gap: '4px' }}>
          {!collapsed && (
            <Tooltip title="Đăng xuất" placement="top">
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                className="sidebar-logout-btn"
                style={{ width: '40px', height: '40px', borderRadius: '50%' }}
              />
            </Tooltip>
          )}
        </div>

        {/* If collapsed, still show avatar that can click to dropdown */}
        {collapsed && (
          <div style={{ marginTop: '12px' }}>
            <Dropdown menu={{ items: userMenuItems }} trigger={["click"]} placement="topRight">
              <Avatar className="sidebar-avatar" icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
            </Dropdown>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SideBar;

