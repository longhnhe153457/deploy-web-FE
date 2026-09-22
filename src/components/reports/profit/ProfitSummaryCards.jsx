import React from "react";
import { Row, Col, Card, Typography, Tag, Button } from "antd";
import {
  RiseOutlined,
  FallOutlined,
  PieChartOutlined,
  PercentageOutlined,
  CheckCircleOutlined,
  SwapOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

/**
 * Profit Report Component: ProfitSummaryCards
 * 5 KPI Cards: Profit, Profit Margin %, Cost Ratio %, Break-even %, Growth %
 * Có nút So sánh hiệu quả lợi nhuận ở trên cùng.
 */
const ProfitSummaryCards = ({ data = {}, onOpenCompare }) => {
  const {
    profit = 172500000,
    profitMargin = 60.6,
    costRatio = 39.4,
    breakEvenPct = 128.5,
    growthPct = 24.8,
  } = data;

  const isGrowthPositive = growthPct >= 0;

  const kpis = [
    {
      title: "Lợi Nhuận Ròng",
      value: formatVND(profit),
      subText: "Doanh thu trừ Chi phí thực tế",
      icon: <RiseOutlined style={{ fontSize: 20, color: "#10b981" }} />,
      bgIcon: "#ecfdf5",
      borderColor: "#10b981",
    },
    {
      title: "Tỷ Suất Lợi Nhuận",
      value: `${profitMargin}%`,
      subText: "Lợi nhuận trên tổng Doanh thu",
      icon: <PieChartOutlined style={{ fontSize: 20, color: "#2563eb" }} />,
      bgIcon: "#eff6ff",
      borderColor: "#2563eb",
    },
    {
      title: "Tỷ Lệ Chi Phí / Doanh Thu",
      value: `${costRatio}%`,
      subText: "Tổng chi phí chiếm tỷ trọng",
      icon: <PercentageOutlined style={{ fontSize: 20, color: "#ef4444" }} />,
      bgIcon: "#fef2f2",
      borderColor: "#ef4444",
    },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Nút so sánh hiệu quả nằm ngay trên 5 thẻ KPI Lợi nhuận */}
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
          📊 Chỉ Số Lợi Nhuận & So Sánh Hiệu Quả Kinh Doanh
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
          <Col xs={24} sm={12} lg={8} key={idx}>
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

export default ProfitSummaryCards;
