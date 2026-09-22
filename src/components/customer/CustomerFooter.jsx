import { Row, Col, Typography } from "antd";
import {
  ShopOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  FacebookFilled,
  InstagramOutlined,
  YoutubeFilled,
} from "@ant-design/icons";

const { Text, Title } = Typography;

const CustomerFooter = ({ chainInfo }) => {
  const year = new Date().getFullYear();
  const name = chainInfo?.name || "MenuGo Restaurant";
  const address = chainInfo?.newAddressName || "TP. Hồ Chí Minh, Việt Nam";
  const openTime = chainInfo?.openTime || "08:00";
  const closeTime = chainInfo?.closeTime || "22:00";

  return (
    <footer className="customer-footer">
      <div className="footer-container">
        <Row gutter={[40, 32]}>
          <Col xs={24} sm={12} lg={8}>
            <div className="footer-brand">
              {chainInfo?.logoImage ? (
                <img
                  src={chainInfo.logoImage}
                  alt={name}
                  className="footer-logo-img"
                />
              ) : (
                <div className="footer-logo-fallback">
                  <ShopOutlined />
                </div>
              )}
              <Title level={4} className="footer-brand-title">
                {name}
              </Title>
            </div>
            <p className="footer-desc">
              Hệ thống nhà hàng ẩm thực hàng đầu với thực đơn phong phú, nguyên liệu tươi ngon
              và trải nghiệm dịch vụ chu đáo nhất cho mọi vị khách.
            </p>
            <div className="footer-socials">
              <a href="#facebook" className="social-icon"><FacebookFilled /></a>
              <a href="#instagram" className="social-icon"><InstagramOutlined /></a>
              <a href="#youtube" className="social-icon"><YoutubeFilled /></a>
            </div>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Title level={5} className="footer-heading">
              Thông Tin Liên Hệ
            </Title>
            <ul className="footer-contact-list">
              <li>
                <EnvironmentOutlined className="contact-icon" />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    name + " " + address
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-address-link"
                >
                  {address}
                </a>
              </li>
              <li>
                <PhoneOutlined className="contact-icon" />
                <span>Hotline: 1900 6868 (Phục vụ 24/7)</span>
              </li>
              <li>
                <MailOutlined className="contact-icon" />
                <span>Email: contact@menugo.vn</span>
              </li>
              <li>
                <ClockCircleOutlined className="contact-icon" />
                <span>Giờ mở cửa: {openTime}</span>
              </li>
              <li>
                <ClockCircleOutlined className="contact-icon" />
                <span>Giờ đóng cửa: {closeTime}</span>
              </li>
            </ul>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Title level={5} className="footer-heading">
              Khám Phá & Mở Rộng
            </Title>
            <ul className="footer-links-list">
              <li><a href="#hero">Về Chuỗi Nhà Hàng</a></li>
              <li><a href="#menu">Thực Đơn Đặc Biệt</a></li>
              <li><a href="#branches">Danh Sách Chi Nhánh</a></li>
              <li><a href="#qr-order">Đặt Món QR (Sắp ra mắt)</a></li>
              <li><a href="#feedback">Đánh Giá & Góp Ý</a></li>
            </ul>
          </Col>
        </Row>

        {/* Divider & Copyright */}
        <div className="footer-bottom">
          <Text className="copyright-text">
            © {year} <strong>{name}</strong>. Phát triển bởi Nền tảng MenuGo. Bảo lưu mọi quyền.
          </Text>
        </div>
      </div>
    </footer>
  );
};

export default CustomerFooter;
