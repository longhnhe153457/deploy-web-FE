import React from "react";
import { Row, Col, Card, Typography, Tag, Button } from "antd";
import {
  DollarOutlined,
  ShoppingOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  RiseOutlined,
  FallOutlined,
  SwapOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

/**
 * Revenue Report Component: RevenueSummaryCards
 * 5 KPI Cards: Revenue, Orders, Average Order Value, Average Revenue / Day, Growth %
 * Nút So sánh hiệu quả vận hành đặt ở trên cùng.
 */
const RevenueSummaryCards = ({ data = {}, onOpenCompare }) => {
  const {
    totalRevenue = 284500000,
    totalOrders = 1420,
    avgOrderValue = 200350,
    avgRevenuePerDay = 9483333,
    growthPct = 14.8,
  } = data;

  const isGrowthPositive = growthPct >= 0;

  const kpis = [
    {
      title: "Tổng Doanh Thu",
      value: formatVND(totalRevenue),
      subText: "Doanh thu hợp lệ kỳ này",
      icon: <DollarOutlined style={{ fontSize: 20, color: "#2563eb" }} />,
      bgIcon: "#eff6ff",
      borderColor: "#2563eb",
    },
    {
      title: "Tổng Số Đơn Hàng",
      value: `${totalOrders.toLocaleString("vi-VN")} đơn`,
      subText: "Tổng hóa đơn đã thanh toán",
      icon: <ShoppingOutlined style={{ fontSize: 20, color: "#ea580c" }} />,
      bgIcon: "#fff7ed",
      borderColor: "#ea580c",
    },
    {
      title: "Giá Trị Đơn Trung Bình",
      value: formatVND(avgOrderValue),
      subText: "Trung bình mỗi bill",
      icon: <CalculatorOutlined style={{ fontSize: 20, color: "#10b981" }} />,
      bgIcon: "#ecfdf5",
      borderColor: "#10b981",
    },
    {
      title: "Doanh Thu Trung Bình / Ngày",
      value: formatVND(avgRevenuePerDay),
      subText: "Ước tính theo ngày hoạt động",
      icon: <CalendarOutlined style={{ fontSize: 20, color: "#8b5cf6" }} />,
      bgIcon: "#f5f3ff",
      borderColor: "#8b5cf6",
    },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Nút so sánh hiệu quả nằm ngay trên 5 thẻ KPI */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          background: "#ffffff",
          padding: "10px 16px",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <Text strong style={{ fontSize: 13, color: "#334155" }}>
          📊 Chỉ Số Doanh Thu & So Sánh Hiệu Quả Vận Hành
        </Text>
        <Button
          type="primary"
          ghost
          icon={<SwapOutlined />}
          onClick={onOpenCompare}
          style={{ borderRadius: 6, fontWeight: 600 }}
        >
          So sánh hiệu quả các kỳ
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {kpis.map((kpi, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <Card
              bordered={false}
              style={{
                borderRadius: "var(--border-radius)",
                boxShadow: "var(--shadow-sm)",
                background: "var(--color-surface)",
                borderTop: `3px solid ${kpi.borderColor}`,
                height: "100%",
              }}
              bodyStyle={{ padding: 16 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, fontWeight: 500 }}
                  >
                    {kpi.title}
                  </Text>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--color-text)",
                      marginTop: 4,
                    }}
                  >
                    {kpi.isBadge ? (
                      <Tag
                        color={isGrowthPositive ? "success" : "error"}
                        style={{
                          fontSize: 16,
                          padding: "2px 10px",
                          borderRadius: 6,
                          fontWeight: 700,
                        }}
                      >
                        {kpi.value}
                      </Tag>
                    ) : (
                      kpi.value
                    )}
                  </div>
                </div>

                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: kpi.bgIcon,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {kpi.icon}
                </div>
              </div>

              <Text
                type="secondary"
                style={{ fontSize: 11, display: "block", marginTop: 10 }}
              >
                {kpi.subText}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default RevenueSummaryCards;
