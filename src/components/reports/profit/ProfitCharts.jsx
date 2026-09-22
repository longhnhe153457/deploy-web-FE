import React from "react";
import { Card, Progress, Typography, Space, Empty } from "antd";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  ThunderboltOutlined,
  PartitionOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0
  );

/**
 * Profit Report Component: ProfitCharts
 * 3 Biểu đồ xếp chồng dọc theo thứ tự:
 * 1. Tiến độ điểm hòa vốn (Break-even)
 * 2. Biến động Doanh thu - Chi phí - Lợi nhuận (Trend)
 * 3. Phân tích Đóng góp Chi phí vs Lợi nhuận (Waterfall)
 */
const ProfitCharts = ({
  trendData,
  waterfallData,
  breakEvenInfo = {},
}) => {
  const trendList =
    trendData !== undefined
      ? trendData
      : [
          { date: "Tháng 1", revenue: 240000000, expense: 110000000, profit: 130000000 },
          { date: "Tháng 2", revenue: 260000000, expense: 115000000, profit: 145000000 },
          { date: "Tháng 3", revenue: 220000000, expense: 105000000, profit: 115000000 },
          { date: "Tháng 4", revenue: 280000000, expense: 120000000, profit: 160000000 },
          { date: "Tháng 5", revenue: 310000000, expense: 125000000, profit: 185000000 },
          { date: "Tháng 6", revenue: 295000000, expense: 118000000, profit: 177000000 },
          { date: "Tháng 7", revenue: 284500000, expense: 112000000, profit: 172500000 },
        ];

  const waterfallList =
    waterfallData !== undefined
      ? waterfallData
      : [
          { name: "Tổng Doanh Thu", amount: 284500000, isTotal: true },
          { name: "Giá vốn Hàng bán (Food)", amount: -85000000, isCost: true },
          { name: "Chi phí Lương", amount: -42000000, isCost: true },
          { name: "Điện, Nước & Gas", amount: -12000000, isCost: true },
          { name: "Chi phí Khác", amount: -8000000, isCost: true },
          { name: "Lợi Nhuận Ròng", amount: 137500000, isProfit: true },
        ];

  const { target = 220000000, current = 284500000, percent = 129.3 } = breakEvenInfo;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>

      {/* 2. Biến động Doanh thu, Chi phí & Lợi nhuận (Trend) */}
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ThunderboltOutlined style={{ color: "#10b981" }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              Biến động Doanh thu, Chi phí & Lợi nhuận
            </span>
          </div>
        }
        bordered={false}
        style={{
          borderRadius: "var(--border-radius)",
          boxShadow: "var(--shadow-sm)",
          background: "var(--color-surface)",
        }}
        bodyStyle={{ padding: "16px 20px" }}
      >
        <div style={{ width: "100%", height: 300 }}>
          {trendList.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <Empty description="Không có dữ liệu xu hướng" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendList} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} stroke="#94a3b8" fontSize={11} />
                <YAxis
                  tickLine={false}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <Tooltip formatter={(v, n) => [formatVND(v), n]} />
                <Legend verticalAlign="top" height={32} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Chi phí"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Lợi nhuận ròng"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#profitGrad)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* 3. Phân Tích Đóng Góp Chi Phí vs Lợi Nhuận */}
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PartitionOutlined style={{ color: "#8b5cf6" }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              Phân Tích Đóng Góp Chi Phí vs Lợi Nhuận
            </span>
          </div>
        }
        bordered={false}
        style={{
          borderRadius: "var(--border-radius)",
          boxShadow: "var(--shadow-sm)",
          background: "var(--color-surface)",
        }}
        bodyStyle={{ padding: "16px 20px" }}
      >
        <div style={{ width: "100%", height: 260 }}>
          {waterfallList.length <= 2 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <Empty description="Không có dữ liệu cơ cấu đóng góp" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallList} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} stroke="#94a3b8" fontSize={11} />
                <YAxis
                  tickLine={false}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <Tooltip formatter={(v) => [formatVND(v), "Số tiền"]} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={32}>
                  {waterfallList.map((entry, index) => {
                    let fill = "#2563eb";
                    if (entry.isCost) fill = "#ef4444";
                    if (entry.isProfit) fill = "#10b981";
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ProfitCharts;
