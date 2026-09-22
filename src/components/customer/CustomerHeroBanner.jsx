import { Tag, Button } from "antd";
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";

const CustomerHeroBanner = ({ chainInfo, onExploreMenu, onExploreBranches }) => {
  const hasBg = Boolean(chainInfo?.backgroundImage);

  const bannerStyle = hasBg
    ? {
      backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0.88) 100%), url("${chainInfo.backgroundImage}")`,
    }
    : {};

  return (
    <section
      id="hero"
      className={`hero-banner-section ${hasBg ? "has-bg-image" : "no-bg-image"}`}
      style={bannerStyle}
    >
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-logo-wrapper">
            {chainInfo?.logoImage ? (
              <img
                src={chainInfo.logoImage}
                alt={chainInfo.name || "Logo"}
                className="hero-logo-img"
              />
            ) : (
              <div className="hero-logo-fallback">
                <ShopOutlined />
              </div>
            )}
          </div>

          <div className="hero-title-group">
            <Tag color="gold" className="hero-welcome-badge">
              Chào mừng quý khách đến với hệ thống của chúng tôi
            </Tag>
            <h1 className="hero-chain-name">
              {chainInfo?.name || "Chuỗi Nhà Hàng MenuGo"}
            </h1>
          </div>

          <div className="hero-meta-grid">
            <div className="meta-card">
              <div className="meta-icon">
                <ClockCircleOutlined />
              </div>
              <div className="meta-text">
                <span className="meta-label">Giờ mở cửa</span>
                <span className="meta-value">
                  {chainInfo?.openTime || "07:00:00"}
                </span>
              </div>
            </div>

            <div className="meta-card">
              <div className="meta-icon">
                <ClockCircleOutlined />
              </div>
              <div className="meta-text">
                <span className="meta-label">Giờ đóng cửa</span>
                <span className="meta-value">
                  {chainInfo?.closeTime || "21:00:00"}
                </span>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                (chainInfo?.newAddressName || "")
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="meta-card clickable-meta-card"
            >
              <div className="meta-icon">
                <EnvironmentOutlined />
              </div>
              <div className="meta-text">
                <span className="meta-label">Địa chỉ trụ sở</span>
                <span className="meta-value">
                  {chainInfo?.newAddressName || "Đang cập nhật địa chỉ"}
                </span>
              </div>
            </a>
          </div>

          <div className="hero-actions">
            <Button
              type="primary"
              size="large"
              icon={<ArrowDownOutlined />}
              className="btn-explore-menu"
              onClick={onExploreMenu}
            >
              Khám Phá Thực Đơn
            </Button>
            <Button
              size="large"
              icon={<EnvironmentOutlined />}
              className="btn-explore-branches"
              onClick={onExploreBranches}
            >
              Xem Chi Nhánh
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomerHeroBanner;
