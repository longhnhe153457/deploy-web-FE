import { useState, useEffect } from "react";
import { Row, Col, Typography, Spin, Pagination, Button, Space, message } from "antd";
import { ShopOutlined, LeftOutlined, RightOutlined, CompassOutlined } from "@ant-design/icons";
import CustomerBranchCard from "./CustomerBranchCard";

const { Title, Paragraph } = Typography;

const CustomerBranchSection = ({ branches = [], loading, chainInfo }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [userCoords, setUserCoords] = useState(null);
  const [sortByDistance, setSortByDistance] = useState(false);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleRequestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setSortByDistance(true);
          message.success("Đã xác định vị trí của bạn!");
        },
        (error) => {
          console.warn("Lỗi GPS:", error);
          message.warning("Không thể lấy vị trí. Vui lòng cấp quyền định vị GPS trên trình duyệt.");
        }
      );
    } else {
      message.error("Trình duyệt không hỗ trợ định vị.");
    }
  };

  const activeBranches = (branches || [])
    .filter((b) => !b.isDeleted && b.status !== "Ngừng kinh doanh")
    .map(b => {
      const distance = getDistance(
        userCoords?.latitude,
        userCoords?.longitude,
        b.latitude || b.Latitude,
        b.longitude || b.Longitude
      );
      return { ...b, distance };
    });

  if (sortByDistance && userCoords) {
    activeBranches.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }

  const paginatedBranches = activeBranches.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const [touchStartX, setTouchStartX] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    const totalPages = Math.ceil(activeBranches.length / pageSize);

    if (diff > 60) {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    } else if (diff < -60) {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  // Mouse drag handlers for page swiping
  const [mouseDownX, setMouseDownX] = useState(0);
  const [isMouseDownState, setIsMouseDownState] = useState(false);

  const handleMouseDown = (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    setIsMouseDownState(true);
    setMouseDownX(e.clientX);
  };

  const handleMouseUp = (e) => {
    if (!isMouseDownState) return;
    setIsMouseDownState(false);
    const diff = mouseDownX - e.clientX;
    const totalPages = Math.ceil(activeBranches.length / pageSize);

    if (diff > 80) {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    } else if (diff < -80) {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsMouseDownState(false);
  };

  return (
    <section id="branches" className="customer-branch-section">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header center">
          <div className="sub-title-badge">
            <ShopOutlined /> Hệ thống chi nhánh
          </div>
          <Title level={2} className="section-main-title">
            Ghé Thăm Chi Nhánh MenuGo Gần Bạn
          </Title>
          <div style={{ marginTop: 16 }}>
            <Button
              type="primary"
              icon={<CompassOutlined />}
              onClick={handleRequestLocation}
              loading={sortByDistance && !userCoords}
              style={{
                background: sortByDistance ? "#10b981" : "#ea580c",
                borderColor: sortByDistance ? "#10b981" : "#ea580c",
                fontWeight: 600,
                borderRadius: 8,
                height: 40
              }}
            >
              {sortByDistance ? "Đang sắp xếp theo vị trí gần nhất" : "Tìm chi nhánh gần nhất"}
            </Button>
            {sortByDistance && (
              <Button
                type="text"
                onClick={() => setSortByDistance(false)}
                style={{ marginLeft: 8, color: "#64748b" }}
              >
                Hủy sắp xếp
              </Button>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="section-loading">
            <Spin size="large" tip="Đang tải danh sách chi nhánh..." />
          </div>
        ) : (
          <>
            {/* Branch Grid với Vuốt/Bấm mép để sang trang */}
            <div
              className="branch-swiper-container"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: "grab" }}
            >
              {/* Nút mép trái để sang trang trước */}
              {currentPage > 1 && (
                <button
                  className="edge-nav-btn edge-left"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  aria-label="Trang trước"
                >
                  <LeftOutlined />
                </button>
              )}

              {/* Nút mép phải để sang trang sau */}
              {currentPage < Math.ceil(activeBranches.length / pageSize) && (
                <button
                  className="edge-nav-btn edge-right"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  aria-label="Trang sau"
                >
                  <RightOutlined />
                </button>
              )}

              <Row gutter={[24, 24]} className="branches-grid">
                {paginatedBranches && paginatedBranches.length > 0 ? (
                  paginatedBranches.map((branch, index) => {
                    const isMain = false;
                    return (
                      <Col
                        key={branch.id || branch.Id || index}
                        xs={24}
                        sm={12}
                        lg={8}
                      >
                        <CustomerBranchCard branch={branch} isMain={isMain} userCoords={userCoords} />
                      </Col>
                    );
                  })
                ) : (
                  <Col xs={24} sm={12} lg={8}>
                    <CustomerBranchCard
                      branch={{
                        name: chainInfo?.name || "Trụ Sở Chính MenuGo",
                        newAddressName:
                          chainInfo?.newAddressName ||
                          "123 Đường Lý Tự Trọng, Quận 1, TP. HCM",
                        openTime: chainInfo?.openTime || "08:00",
                        closeTime: chainInfo?.closeTime || "22:00",
                        phone: "1900 6868",
                      }}
                      isMain={true}
                    />
                  </Col>
                )}
              </Row>
            </div>

            {/* Pagination Controls */}
            {activeBranches.length > 0 && (
              <div className="branch-pagination-wrapper">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={activeBranches.length}
                  onChange={(page, size) => {
                    setCurrentPage(page);
                    setPageSize(size);
                  }}
                  showSizeChanger
                  pageSizeOptions={["4", "8", "12", "20"]}
                />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default CustomerBranchSection;
