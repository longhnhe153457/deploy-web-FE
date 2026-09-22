import React from "react";
import { Row, Col, Card, Typography, Tag, Button } from "antd";
import {
  DollarOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  TrophyOutlined,
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
 * Expense Report Component: ExpenseSummaryCards
 * 5 KPI Cards: Total Expense, Average Expense, Average Expense / Day, Growth %, Largest Expense
 * Có nút So sánh hiệu quả chi phí vận hành ở trên cùng.
 */
const ExpenseSummaryCards = ({ data = {}, onOpenCompare }) => {
  const {
    totalExpense = 112000000,
    avgExpense = 2450000,
    avgExpensePerDay = 3733333,
    growthPct = -4.2,
    largestExpense = 28000000,
  } = data;

  const isGrowthGood = growthPct <= 0; // Giảm chi phí là tốt!

  const kpis = [
    {
      title: "Tổng Chi Phí",
      value: formatVND(totalExpense),
      subText: "Tổng khoản chi ghi nhận kỳ này",
      icon: <DollarOutlined style={{ fontSize: 20, color: "#ef4444" }} />,
      bgIcon: "#fef2f2",
      borderColor: "#ef4444",
    },
    {
      title: "Chi Phí Trung Bình / Phiếu",
      value: formatVND(avgExpense),
      subText: "Trung bình mỗi chứng từ chi",
      icon: <CalculatorOutlined style={{ fontSize: 20, color: "#8b5cf6" }} />,
      bgIcon: "#f5f3ff",
      borderColor: "#8b5cf6",
    },
    {
      title: "Chi Phí Trung Bình / Ngày",
      value: formatVND(avgExpensePerDay),
      subText: "Ước tính theo ngày hoạt động",
      icon: <CalendarOutlined style={{ fontSize: 20, color: "#ea580c" }} />,
      bgIcon: "#fff7ed",
      borderColor: "#ea580c",
    },
    {
      title: "Khoản Chi Lớn Nhất",
      value: formatVND(largestExpense),
      subText: "Tiền thuê mặt bằng / nhập hàng",
      icon: <TrophyOutlined style={{ fontSize: 20, color: "#2563eb" }} />,
      bgIcon: "#eff6ff",
      borderColor: "#2563eb",
    },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Nút so sánh hiệu quả nằm ngay trên 5 thẻ KPI Chi phí */}
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
          📊 Chỉ Số Chi Phí & So Sánh Hiệu Quả Vận Hành
        </Text>
        <Button
          type="primary"
          danger
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
                        color={isGrowthGood ? "success" : "error"}
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

export default ExpenseSummaryCards;
