import { Modal, Tag, Typography, Button } from "antd";
import {
  CoffeeOutlined,
  CalendarOutlined,
  CheckOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

const formatPrice = (price) => {
  if (price === undefined || price === null) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

const ProductDetailModal = ({ product, open, onClose, onConsult }) => {
  if (!product) return null;

  const groupName = product.groupName || product.Group?.Name || product.category || "Món ăn";
  const image = product.imageLink || product.image || product.ImageLink || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={700}
      className="product-detail-modal"
    >
      <div className="modal-product-container">
        <div className="modal-image-wrapper">
          <img src={image} alt={product.name || product.Name} className="modal-product-img" />
          {product.isNew && (
            <Tag color="error" className="modal-new-tag">
              <CalendarOutlined /> Món mới tháng này
            </Tag>
          )}
        </div>

        <div className="modal-product-content">
          <div className="modal-header-info">
            <Tag color="volcano" className="modal-category-tag">
              <CoffeeOutlined /> {groupName}
            </Tag>
            <Title level={3} className="modal-product-title">
              {product.name || product.Name}
            </Title>
            <div className="modal-product-price" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#ea580c' }}>
                {formatPrice(product.price ?? product.Price)}
              </span>
              {product.originalPrice && (
                <span style={{ fontSize: 16, textDecoration: 'line-through', color: '#94a3b8' }}>
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
          </div>

          <div className="modal-product-body">
            <Text type="secondary" className="body-section-title">Mô tả món ăn:</Text>
            <Paragraph className="modal-description">
              {product.description ||
                product.Description ||
                "Món ăn được chế biến từ những nguyên liệu tươi ngon nhất, giữ nguyên hương vị đặc trưng truyền thống kết hợp nét ẩm thực hiện đại."}
            </Paragraph>
          </div>

          <div className="modal-highlights">
            <div className="highlight-item">
              <CheckOutlined className="check-icon" /> Đảm bảo vệ sinh ATTP
            </div>
            <div className="highlight-item">
              <CheckOutlined className="check-icon" /> Nguyên liệu tươi mới mỗi ngày
            </div>
          </div>

          <div className="modal-actions" style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Button
              size="large"
              onClick={onClose}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 8,
                fontWeight: 600,
                color: '#475569',
                borderColor: '#cbd5e1'
              }}
            >
              Đóng
            </Button>
            {onConsult && (
              <Button
                type="primary"
                size="large"
                onClick={() => {
                  onClose();
                  onConsult(product);
                }}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 8,
                  background: '#ea580c',
                  borderColor: '#ea580c',
                  fontWeight: 600
                }}
              >
                Tư vấn món này
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ProductDetailModal;
