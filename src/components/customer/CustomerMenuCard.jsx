import React, { useState } from "react";
import { Tag, Button, Modal } from "antd";
import { CoffeeOutlined, CustomerServiceOutlined, MessageOutlined, EyeOutlined } from "@ant-design/icons";

const formatPrice = (price) => {
  if (price === undefined || price === null) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

const CustomerMenuCard = ({ product, onViewDetail, onConsult }) => {
  const [consultModalOpen, setConsultModalOpen] = useState(false);

  const name = product.name || product.Name || "Món ăn chưa đặt tên";
  const price = product.price ?? product.Price ?? 0;
  const image =
    product.imageLink ||
    product.image ||
    product.ImageLink ||
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";
  const groupName = product.groupName || product.Group?.Name || product.category;

  const handleConfirmConsult = () => {
    setConsultModalOpen(false);
    if (onConsult) {
      onConsult(product);
    }
  };

  return (
    <>
      <div 
        className="customer-menu-card"
        onClick={() => onViewDetail && onViewDetail(product)}
        style={{ cursor: "pointer" }}
      >
        <div className="card-image-wrapper">
          <img 
            src={image} 
            alt={name} 
            className="card-img" 
            loading="lazy" 
            style={{ width: '100%', height: '200px', objectFit: 'cover' }}
            onError={(e) => { 
              e.target.onerror = null; 
              e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; 
            }}
          />
          <div className="card-overlay">
            <Button
              shape="round"
              icon={<MessageOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setConsultModalOpen(true);
              }}
              style={{
                background: '#ea580c',
                borderColor: '#ea580c',
                color: '#fff',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)'
              }}
            >
              Tư vấn
            </Button>
          </div>
          {product.isNew && (
            <span className="card-new-badge">
              Mới
            </span>
          )}
          {product.originalPrice && product.originalPrice > price && (
            <span className="card-discount-badge" style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: '#ea580c',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '4px 8px',
              borderBottomLeftRadius: '8px',
              zIndex: 10
            }}>
              -{Math.round(((product.originalPrice - price) / product.originalPrice) * 100)}%
            </span>
          )}
        </div>

        <div className="card-info">
          {groupName && (
            <Tag className="card-category-tag">
              <CoffeeOutlined /> {groupName}
            </Tag>
          )}
          <h3 className="card-title" title={name}>
            {name}
          </h3>
          <div className="card-footer-row">
            <div className="card-price" style={{ display: 'flex', flexDirection: 'column' }}>
              {product.originalPrice && product.originalPrice > price && (
                <span style={{ fontSize: 12, textDecoration: 'line-through', color: '#94a3b8', marginBottom: '-2px' }}>
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              <span style={{ fontSize: 15, fontWeight: 800, color: product.originalPrice && product.originalPrice > price ? '#ea580c' : '#1e293b' }}>
                {formatPrice(price)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button
                type="primary"
                ghost
                size="small"
                icon={<MessageOutlined style={{ color: '#ea580c' }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setConsultModalOpen(true);
                }}
                style={{
                  color: '#ea580c',
                  borderColor: '#ea580c',
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: 6
                }}
              >
                Tư vấn
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Xác Nhận Tư Vấn Món Ăn */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
            <CustomerServiceOutlined style={{ color: '#ea580c' }} /> Xác nhận tư vấn món ăn
          </div>
        }
        open={consultModalOpen}
        onCancel={() => setConsultModalOpen(false)}
        onOk={handleConfirmConsult}
        okText="Có, gửi vào chat"
        cancelText="Hủy"
        okButtonProps={{ style: { background: '#ea580c', borderColor: '#ea580c', borderRadius: 6, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        centered
        width={440}
      >
        <div style={{ padding: '8px 0', display: 'flex', gap: 12, alignItems: 'center' }}>
          <img
            src={image}
            alt={name}
            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #fed7aa' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
            }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{name}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ea580c', marginTop: 2 }}>{formatPrice(price)}</div>
          </div>
        </div>
        <p style={{ marginTop: 8, color: '#475569', fontSize: 13, lineHeight: 1.5 }}>
          Bạn có muốn tư vấn về món này không? Thông tin món sẽ được gửi trực tiếp vào khung chat để nhân viên hỗ trợ.
        </p>
      </Modal>
    </>
  );
};

export default CustomerMenuCard;
