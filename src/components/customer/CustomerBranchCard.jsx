import { Tag, Button } from "antd";
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  CompassOutlined,
  ShopOutlined,
  StarFilled,
} from "@ant-design/icons";

const CustomerBranchCard = ({ branch, isMain, userCoords }) => {
  const branchName = branch.name || branch.Name || "Chi nhánh MenuGo";
  const address =
    branch.newAddressName ||
    branch.newaddressname ||
    branch.addressName ||
    branch.address ||
    "Địa chỉ chưa cập nhật";
  const openTime = branch.openTime || "08:00";
  const closeTime = branch.closeTime || "22:00";
  const phone = branch.phone || branch.phoneNumber || "1900 6868";

  const latitude = branch.latitude || branch.Latitude;
  const longitude = branch.longitude || branch.Longitude;
  const distance = branch.distance;

  const mapsUrl = latitude && longitude
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const mapEmbedUrl = latitude && longitude
    ? `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=14&ie=UTF8&iwloc=&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className={`customer-branch-card ${isMain ? "main-branch" : ""}`}>
      <div className="branch-card-header">
        <div className="branch-badge-group" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {distance !== null && distance !== undefined && (
            <Tag color="magenta" style={{ margin: 0, fontWeight: 600 }}>
              Cách bạn {distance.toFixed(1)} km
            </Tag>
          )}
          {isMain ? (
            <Tag color="gold" className="badge-headquarter">
              <StarFilled /> Trụ sở chính
            </Tag>
          ) : (
            <Tag color="blue" className="badge-branch">
              <ShopOutlined /> Chi nhánh
            </Tag>
          )}

          {branch.status === "Tạm dừng" ? (
            <Tag color="warning" style={{ margin: 0, fontWeight: 600 }}>Tạm dừng</Tag>
          ) : (
            <Tag color="success" style={{ margin: 0, fontWeight: 600 }}>Hoạt động</Tag>
          )}
        </div>
      </div>

      <h3 className="branch-title">{branchName}</h3>

      <div className="branch-info-list">
        <div className="info-row">
          <EnvironmentOutlined className="info-icon icon-location" />
          <div className="info-content">
            <span className="info-label">Địa chỉ</span>
            <span className="info-value">{address}</span>
          </div>
        </div>

        <div className="info-row">
          <ClockCircleOutlined className="info-icon icon-clock" />
          <div className="info-content">
            <span className="info-label">Giờ mở cửa</span>
            <span className="info-value">{openTime}</span>
          </div>
        </div>

        <div className="info-row">
          <ClockCircleOutlined className="info-icon icon-clock" />
          <div className="info-content">
            <span className="info-label">Giờ đóng cửa</span>
            <span className="info-value">{closeTime}</span>
          </div>
        </div>

      </div>

      <div className="branch-maps-preview">
        <div className="maps-iframe-wrapper">
          <iframe
            title={`Bản đồ ${branchName}`}
            width="100%"
            height="160"
            style={{ border: 0, borderRadius: "8px", display: "block" }}
            loading="lazy"
            allowFullScreen
            src={mapEmbedUrl}
          ></iframe>
        </div>
        <Button
          type="default"
          icon={<CompassOutlined />}
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-directions"
          block
        >
          Xem đường đi trên Google Maps
        </Button>
      </div>
    </div>
  );
};

export default CustomerBranchCard;
