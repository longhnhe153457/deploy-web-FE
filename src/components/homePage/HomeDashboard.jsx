import React from "react";
import { Card, Row, Col, Typography, Tag, Alert, Progress, Tooltip as AntTooltip } from "antd";
import {
  DollarOutlined,
  ShoppingOutlined,
  RiseOutlined,
  FallOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";

const { Text, Title } = Typography;

// Helper format tiền VNĐ
const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);

/**
 * Component HomeDashboard - Dashboard tổng quan trong ngày
 * Hỗ trợ Data chuẩn Backend API (DashboardStatsDto):
 * - KPIs (Doanh thu, Chi phí, Lợi nhuận, Đơn hàng)
 * - Cảnh báo vận hành (Alerts)
 * - Tổng hợp trạng thái Đơn hàng (OrderSummary: New, Paid, Unpaid, Cancelled)
 * - Tỷ lệ Phương thức Thanh toán (PaymentMethods)
 * - Biểu đồ xu hướng giờ (HourlyTrends / HourSlots)
 * - Top 5 món bán chạy & Món bán chậm nhất
 */
const HomeDashboard = ({ data }) => {
  const { kpis, hourlyTrends, topDishes, orderSummary, alerts } = data;

  const kpiItems = [
    {
      title: "Doanh thu trong ngày",
      value: kpis.revenue.formatted,
      changePct: kpis.revenue.changePct || 0,
      isGood: (kpis.revenue.changePct || 0) >= 0,
      icon: <DollarOutlined style={{ fontSize: 22, color: "#2563eb" }} />,
      bgIcon: "#eff6ff",
    },
    {
      title: "Tổng số đơn hàng",
      value: kpis.orders.formatted,
      changePct: kpis.orders.changePct || 0,
      isGood: (kpis.orders.changePct || 0) >= 0,
      icon: <ShoppingOutlined style={{ fontSize: 22, color: "#ea580c" }} />,
      bgIcon: "#fff7ed",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── 1. 4 CARD KPIs ────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        {kpiItems.map((kpi, index) => {
          const isUp = kpi.changePct >= 0;
          return (
            <Col xs={24} sm={12} lg={12} key={index}>
              <Card
                bordered={false}
                style={{
                  borderRadius: "var(--border-radius)",
                  boxShadow: "var(--shadow-sm)",
                  background: "var(--color-surface)",
                  height: "100%",
                }}
                bodyStyle={{ padding: "18px 20px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                      {kpi.title}
                    </Text>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)", marginTop: 4 }}>
                      {kpi.value}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: kpi.bgIcon,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {kpi.icon}
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <Tag
                    color={kpi.isGood ? "success" : "error"}
                    style={{ borderRadius: 6, fontWeight: 600, margin: 0, padding: "1px 6px" }}
                  >
                    {isUp ? <RiseOutlined /> : <FallOutlined />}{" "}
                    {Math.abs(kpi.changePct)}%
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    so với kỳ trước
                  </Text>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* ── 2. ORDER SUMMARY (BACKEND DATA) ─────────────── */}
      {orderSummary && (
        <Row gutter={[16, 16]}>
          {/* Order Status Breakdown Card */}
          {orderSummary && (
            <Col xs={24} lg={24}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ShoppingOutlined style={{ color: "#2563eb" }} />
                    <span style={{ fontWeight: 700, fontSize: 15 }}>
                      Trạng thái Đơn hàng trong ngày
                    </span>
                  </div>
                }
                bordered={false}
                style={{
                  borderRadius: "var(--border-radius)",
                  boxShadow: "var(--shadow-sm)",
                  background: "var(--color-surface)",
                  height: "100%",
                }}
                bodyStyle={{ padding: "18px 20px" }}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                      <ShoppingOutlined style={{ fontSize: 22, color: "#2563eb", marginBottom: 6 }} />
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#1e40af" }}>{orderSummary.created || 0}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Đã tạo</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                      <CheckCircleOutlined style={{ fontSize: 22, color: "#16a34a", marginBottom: 6 }} />
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#15803d" }}>{orderSummary.completed || 0}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Đã hoàn thành</div>
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                      <ExclamationCircleOutlined style={{ fontSize: 22, color: "#d97706", marginBottom: 6 }} />
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#b45309" }}>{orderSummary.uncompleted || 0}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Chưa hoàn thành</div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* ── 4 & 5. Order Trend + Top 5 Best Selling Dishes ────────────────── */}
      <Row gutter={[16, 16]}>
        {/* Order Trend Column Chart */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShoppingOutlined style={{ color: "#ea580c" }} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  Số lượng Đơn hàng theo khung giờ
                </span>
              </div>
            }
            bordered={false}
            style={{
              borderRadius: "var(--border-radius)",
              boxShadow: "var(--shadow-sm)",
              background: "var(--color-surface)",
              height: "100%",
            }}
            bodyStyle={{ padding: "16px 20px 24px 20px" }}
          >
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tickLine={false} stroke="#94a3b8" fontSize={11} />
                  <YAxis tickLine={false} stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    formatter={(val) => [`${val} đơn`, "Số lượng đơn"]}
                    contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="orders" name="Số đơn" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Top 5 Món Bán Chạy Horizontal Bar Chart */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TrophyOutlined style={{ color: "#f59e0b" }} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  Top Món ăn bán chạy nhất
                </span>
              </div>
            }
            bordered={false}
            style={{
              borderRadius: "var(--border-radius)",
              boxShadow: "var(--shadow-sm)",
              background: "var(--color-surface)",
              height: "100%",
            }}
            bodyStyle={{ padding: "16px 20px 24px 20px" }}
          >
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topDishes}
                  margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickLine={false} stroke="#94a3b8" fontSize={11} />
                  <YAxis dataKey="name" type="category" tickLine={false} stroke="#475569" fontSize={12} width={130} />
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${val} phần ${item.payload.revenue ? `(${formatVND(item.payload.revenue)})` : ""}`,
                      "Số lượng bán",
                    ]}
                    contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="quantity" radius={[0, 6, 6, 0]}>
                    {topDishes.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? "#e8442a"
                            : index === 1
                            ? "#ff8c42"
                            : index === 2
                            ? "#f59e0b"
                            : "#3b82f6"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HomeDashboard;
