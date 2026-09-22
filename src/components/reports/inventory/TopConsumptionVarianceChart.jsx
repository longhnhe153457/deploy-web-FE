import React from "react";
import { Card, Typography, Tooltip as AntTooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
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
  LabelList,
} from "recharts";

const { Title, Text } = Typography;

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div
        style={{
          background: "rgba(15, 23, 42, 0.94)",
          backdropFilter: "blur(6px)",
          color: "#fff",
          padding: "12px 16px",
          borderRadius: 10,
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
          fontSize: 12,
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: "#f87171", marginBottom: 6 }}>
          🔥 {item.name}
        </div>
        <div>
          <span>Mã nguyên liệu: </span>
          <strong>{item.id}</strong>
        </div>
        <div>
          <span>Sai số tiêu hao: </span>
          <strong style={{ color: "#ef4444", fontSize: 14 }}>{item.variancePercent}%</strong>
        </div>
        <div>
          <span>Lượng tiêu hao vượt: </span>
          <strong>{item.excessQty} {item.unit}</strong>
        </div>
        <div>
          <span>Đã nhập: </span>
          <strong>{item.importedQty} {item.unit}</strong> | <span>Thực tế tiêu thụ: </span>
          <strong>{item.consumedQty} {item.unit}</strong>
        </div>
      </div>
    );
  }
  return null;
};

const TopConsumptionVarianceChart = ({ data }) => {
  const chartData = data || [];

  return (
    <Card
      style={{
        borderRadius: 16,
        marginBottom: 24,
        boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
        border: "1px solid #e2e8f0",
      }}
      bodyStyle={{ padding: "20px 24px" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
            🔥 Top 10 Nguyên liệu Sai số Tiêu hao Lớn nhất
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Hiển thị trực quan chỉ số sai số tiêu hao % trên từng cột nguyên liệu.
          </Text>
        </div>

        <AntTooltip title="Hiển thị chỉ số % sai số tiêu hao chi tiết ngay phía trên đầu mỗi cột.">
          <InfoCircleOutlined style={{ fontSize: 16, color: "#94a3b8", cursor: "pointer" }} />
        </AntTooltip>
      </div>

      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 25, right: 30, left: 20, bottom: 65 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={70}
              tickFormatter={(value) => (value.length > 15 ? `${value.slice(0, 15)}...` : value)}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              unit="%"
              domain={[0, "dataMax + 5"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
            />
            <Bar
              dataKey="variancePercent"
              name="Sai số tiêu hao (%)"
              radius={[6, 6, 0, 0]}
              barSize={34}
            >
              <LabelList
                dataKey="variancePercent"
                position="top"
                formatter={(val) => `${val}%`}
                style={{ fontSize: 11, fontWeight: 700, fill: "#dc2626" }}
              />
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.variancePercent > 10 ? "#ef4444" : "#f59e0b"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default TopConsumptionVarianceChart;
