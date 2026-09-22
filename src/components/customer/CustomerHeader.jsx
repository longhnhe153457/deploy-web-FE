import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, Button, Dropdown } from "antd";
import { useAuth } from "../../context/AuthContext";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import {
  MenuOutlined,
  ShopOutlined,
  AppstoreOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CalendarOutlined,
  MessageOutlined,
  DownOutlined,
  LogoutOutlined
} from "@ant-design/icons";

const CustomerHeader = ({ chainInfo, activeSection, onNavigate }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const customerAuth = useCustomerAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { key: "hero", label: "Trang chủ", icon: <HomeOutlined /> },
    { key: "menu", label: "Thực đơn", icon: <AppstoreOutlined /> },
    { key: "branches", label: "Chi nhánh", icon: <EnvironmentOutlined /> },
  ];

  const profileMenuItems = [
    {
      key: "dashboard",
      icon: <UserOutlined style={{ color: "#ea580c" }} />,
      label: <span style={{ fontWeight: 600 }}>Thông tin</span>,
      onClick: () => navigate("/customer/dashboard")
    },
    {
      key: "booking",
      icon: <CalendarOutlined style={{ color: "#ea580c" }} />,
      label: <span style={{ fontWeight: 600 }}>Đặt bàn</span>,
      onClick: () => navigate("/customer/booking")
    },
    {
      key: "chat",
      icon: <MessageOutlined style={{ color: "#ea580c" }} />,
      label: <span style={{ fontWeight: 600 }}>Tin nhắn</span>,
      onClick: () => navigate("/customer/chat")
    },
    {
      type: "divider"
    },
    {
      key: "logout",
      icon: <LogoutOutlined style={{ color: "#ef4444" }} />,
      label: <span style={{ fontWeight: 600, color: "#ef4444" }}>Đăng xuất</span>,
      onClick: () => {
        customerAuth.logout();
        navigate("/welcome");
      }
    }
  ];

  const handleNavClick = (key) => {
    onNavigate(key);
    setMobileMenuOpen(false);
  };

  return (
    <header className={`customer-header ${scrolled ? "scrolled" : ""}`}>
      <div className="header-container">
        <div className="header-brand" onClick={() => handleNavClick("hero")}>
          {chainInfo?.logoImage ? (
            <img
              src={chainInfo.logoImage}
              alt={chainInfo.name || "Logo"}
              className="brand-logo"
            />
          ) : (
            <div className="brand-logo-fallback">
              <ShopOutlined />
            </div>
          )}
          <div className="brand-info">
            <span className="brand-name">
              {chainInfo?.name || "Nhà Hàng MenuGo"}
            </span>
            <span className="brand-subtitle">Trải nghiệm ẩm thực</span>
          </div>
        </div>

        <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-link ${activeSection === item.key ? "active" : ""}`}
              onClick={() => handleNavClick(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          {customerAuth.isAuthenticated ? (
            <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight" trigger={['click', 'hover']}>
              <button
                className="nav-link login-btn"
                style={{
                  marginLeft: "12px",
                  background: "#ea580c",
                  color: "#fff",
                  borderRadius: "6px",
                  padding: "0 16px",
                  height: "36px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  verticalAlign: "middle"
                }}
              >
                <UserOutlined />
                <span>Hồ sơ</span>
                <DownOutlined style={{ fontSize: 10 }} />
              </button>
            </Dropdown>
          ) : (
            <button
              className="nav-link login-btn"
              onClick={() => navigate("/customer/login")}
              style={{
                marginLeft: "12px",
                background: "#ea580c",
                color: "#fff",
                borderRadius: "6px",
                padding: "0 16px",
                height: "36px",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                verticalAlign: "middle"
              }}
            >
              <span>Khách hàng</span>
            </button>
          )}
          <button
            className="nav-link staff-login-btn"
            onClick={() => navigate(isAuthenticated ? "/home" : "/login")}
            style={{
              marginLeft: "8px",
              background: "transparent",
              color: scrolled ? "#334155" : "#fff",
              border: "1px solid " + (scrolled ? "#cbd5e1" : "rgba(255,255,255,0.4)"),
              borderRadius: "6px",
              padding: "0 14px",
              height: "36px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              verticalAlign: "middle"
            }}
          >
            Nhân viên
          </button>
        </nav>

        <Button
          type="text"
          className="mobile-menu-btn"
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuOpen(true)}
        />

        <Drawer
          title={
            <div className="drawer-brand">
              <ShopOutlined /> {chainInfo?.name || "MenuGo"}
            </div>
          }
          placement="right"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          className="customer-mobile-drawer"
        >
          <div className="mobile-nav-list">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`mobile-nav-item ${activeSection === item.key ? "active" : ""}`}
                onClick={() => handleNavClick(item.key)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
            
            {customerAuth.isAuthenticated ? (
              <div style={{ marginTop: "16px", background: "#fff7ed", borderRadius: "8px", padding: "10px", border: "1px solid #fed7aa" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#9a3412", marginBottom: "8px", paddingLeft: "8px" }}>
                  HỒ SƠ KHÁCH HÀNG
                </div>
                <button
                  className="mobile-nav-item"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/customer/dashboard");
                  }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "none", border: "none", cursor: "pointer", fontWeight: 600, color: "#1e293b" }}
                >
                  <UserOutlined style={{ color: "#ea580c" }} />
                  <span>Thông tin</span>
                </button>
                <button
                  className="mobile-nav-item"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/customer/booking");
                  }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "none", border: "none", cursor: "pointer", fontWeight: 600, color: "#1e293b" }}
                >
                  <CalendarOutlined style={{ color: "#ea580c" }} />
                  <span>Đặt bàn</span>
                </button>
                <button
                  className="mobile-nav-item"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/customer/chat");
                  }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "none", border: "none", cursor: "pointer", fontWeight: 600, color: "#1e293b" }}
                >
                  <MessageOutlined style={{ color: "#ea580c" }} />
                  <span>Tin nhắn</span>
                </button>
              </div>
            ) : (
              <button
                className="mobile-nav-item login-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/customer/login");
                }}
                style={{
                  marginTop: "16px",
                  width: "100%",
                  background: "#ea580c",
                  color: "#fff",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                Khách hàng
              </button>
            )}

            <button
              className="mobile-nav-item staff-btn"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate(isAuthenticated ? "/home" : "/login");
              }}
              style={{
                marginTop: "12px",
                width: "100%",
                background: "#f1f5f9",
                color: "#475569",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 500,
                border: "1px solid #cbd5e1",
                cursor: "pointer",
                textAlign: "center"
              }}
            >
              Cổng nhân viên
            </button>
          </div>
        </Drawer>
      </div>
    </header>
  );
};

export default CustomerHeader;
