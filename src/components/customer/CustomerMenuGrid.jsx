import { Empty, Skeleton, Row, Col } from "antd";
import CustomerMenuCard from "./CustomerMenuCard";

const CustomerMenuGrid = ({ products, loading, onViewDetail, onConsult }) => {
  if (loading) {
    return (
      <div className="menu-grid-container">
        <Row gutter={[24, 24]}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Col key={i} xs={24} sm={12} md={8} lg={6}>
              <div className="skeleton-card">
                <Skeleton.Image active className="skeleton-img" />
                <div style={{ padding: "16px" }}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="empty-menu-container">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div className="empty-text">
              <h4>Không tìm thấy món ăn phù hợp</h4>
              <p>Thử tìm kiếm từ khóa khác hoặc thay đổi bộ lọc danh mục.</p>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="menu-grid-container">
      <Row gutter={[24, 24]}>
        {products.map((product, idx) => (
          <Col key={product.id || product.Id || idx} xs={24} sm={12} md={8} lg={6}>
            <CustomerMenuCard
              product={product}
              onViewDetail={onViewDetail}
              onConsult={onConsult}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default CustomerMenuGrid;
