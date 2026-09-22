import React from 'react';
import { Card, Tag, Typography, Space } from 'antd';
import { CoffeeOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const formatPrice = (price) => {
  if (price === undefined || price === null) return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

const ProductConsultationCard = ({ metadataJson }) => {
  if (!metadataJson) return null;

  let data = null;
  try {
    data = typeof metadataJson === 'string' ? JSON.parse(metadataJson) : metadataJson;
  } catch {
    return null;
  }

  const products = data?.products || data?.Products || [];
  if (!products || products.length === 0) return null;

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#ea580c', display: 'flex', alignItems: 'center', gap: 6 }}>
        <CoffeeOutlined /> Danh sách món cần tư vấn ({products.length} món):
      </div>

      {products.map((item, idx) => {
        const productId = item.productId ?? item.ProductId ?? idx;
        const name = item.name || item.Name || 'Món ăn';
        const price = item.price ?? item.Price ?? 0;
        const imageLink = item.imageLink || item.ImageLink || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80';
        const groupName = item.groupName || item.GroupName || '';

        return (
          <Card
            key={productId}
            size="small"
            style={{
              borderRadius: 8,
              border: '1px solid #fed7aa',
              background: '#fffaf5',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            bodyStyle={{ padding: '8px 10px', display: 'flex', gap: 10, alignItems: 'center' }}
            styles={{ body: { padding: '8px 10px', display: 'flex', gap: 10, alignItems: 'center' } }}
          >
            <img
              src={imageLink}
              alt={name}
              style={{
                width: 50,
                height: 50,
                objectFit: 'cover',
                borderRadius: 6,
                flexShrink: 0,
                border: '1px solid #ffedd5'
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80';
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#1e293b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={name}
              >
                {name}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                <span style={{ fontWeight: 700, color: '#ea580c', fontSize: 13 }}>
                  {formatPrice(price)}
                </span>

                {groupName && (
                  <Tag color="orange" style={{ margin: 0, fontSize: 11, padding: '0 4px', borderRadius: 4 }}>
                    {groupName}
                  </Tag>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {(data.note || data.Note) && (
        <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', background: '#fff', padding: '4px 8px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
          Ghi chú: {data.note || data.Note}
        </div>
      )}
    </div>
  );
};

export default ProductConsultationCard;
