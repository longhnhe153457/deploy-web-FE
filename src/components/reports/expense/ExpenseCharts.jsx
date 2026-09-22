import React from "react";
import { Row, Col, Card, Empty } from "antd";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  LineChartOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

const ExpenseCharts = ({
  trendData,
  topExpenseData,
}) => {
  const trendList = trendData !== undefined ? trendData : [
    { date: "01/08", expense: 3500000 },
    { date: "02/08", expense: 4200000 },
    { date: "03/08", expense: 2800000 },
    { date: "04/08", expense: 18500000 },
    { date: "05/08", expense: 3900000 },
    { date: "06/08", expense: 4100000 },
    { date: "07/08", expense: 6200000 },
  ];

  const topExpenseList = topExpenseData !== undefined ? topExpenseData : [
    { name: "Nhập thịt bò Mỹ & Hải sản", amount: 28000000 },
    { name: "Trả lương nhân viên tháng 7", value: 16000000 },
    { name: "Tiền thuê mặt bằng tháng 8", amount: 18000000 },
    { name: "Tiền điện sản xuất", amount: 6200000 },
    { name: "Nhập bia & đồ uống", amount: 5500000 },
  ];

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      {/* Chart 1: Expense Trend Line Chart */}
      <Col xs={24} lg={24}>
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LineChartOutlined style={{ color: "#ef4444" }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                Xu hướng Tổng Chi phí theo thời gian
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
          bodyStyle={{ padding: "16px 20px" }}
        >
          <div style={{ width: "100%", height: 250 }}>
            {trendList.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <Empty description="Không có dữ liệu xu hướng chi phí" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendList}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    stroke="#94a3b8"
                    fontSize={11}
                  />
                  <YAxis
                    tickLine={false}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => `${v / 1000000}M`}
                  />
                  <Tooltip formatter={(v) => [formatVND(v), "Chi phí"]} />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Chi phí"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </Col>

      {/* Chart 3: Top Expense Bar Chart */}
      <Col xs={24} lg={24}>
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BarChartOutlined style={{ color: "#ef4444" }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                Top Khoản Chi Lớn Nhất
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
          bodyStyle={{ padding: "16px 20px" }}
        >
          <div style={{ width: "100%", height: 260 }}>
            {topExpenseList.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <Empty description="Không có dữ liệu khoản chi lớn nhất" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topExpenseList}
                  margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${v / 1000000}M`}
                    fontSize={11}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={220}
                    fontSize={11}
                    stroke="#64748b"
                  />
                  <Tooltip formatter={(v) => [formatVND(v), "Giá trị chi"]} />
                  <Bar
                    dataKey="amount"
                    name="Giá trị chi"
                    fill="#ef4444"
                    radius={[0, 6, 6, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default ExpenseCharts;
