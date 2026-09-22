import React from "react";
import { Row, Col, Card, Empty } from "antd";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { LineChartOutlined } from "@ant-design/icons";

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

/**
 * Revenue Report Component: RevenueCharts
 * 1 Chart: Revenue Trend Line Chart taking full width
 */
const RevenueCharts = ({ trendData }) => {
  const hasTrendData = trendData && trendData.length > 0;
  const trendList = trendData === undefined
    ? [
        { date: "01/08", revenue: 8500000 },
        { date: "02/08", revenue: 9200000 },
        { date: "03/08", revenue: 7800000 },
        { date: "04/08", revenue: 11500000 },
        { date: "05/08", revenue: 10900000 },
        { date: "06/08", revenue: 12100000 },
        { date: "07/08", revenue: 14200000 },
      ]
    : trendData;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
      {/* Chart 1: Revenue Trend Line Chart */}
      <Col xs={24} lg={24}>
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LineChartOutlined style={{ color: "var(--color-primary)" }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                Xu hướng Doanh thu theo thời gian
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
          <div style={{ width: "100%", height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {trendData !== undefined && !hasTrendData ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có dữ liệu xu hướng doanh thu" />
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
                  <Tooltip formatter={(v) => [formatVND(v), "Doanh thu"]} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default RevenueCharts;
