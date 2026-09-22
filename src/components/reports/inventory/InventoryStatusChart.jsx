import React from "react";
import { Card, Typography, Tooltip as AntTooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
} from "recharts";

const { Title, Text } = Typography;

const InventoryStatusChart = ({ data }) => {
  const chartData = data && data.length > 0 ? data : [
    {
      category: "Kho tổng",
      normal: 126,
      lowStock: 5,
      outOfStock: 3,
    },
  ];

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
            📊 Phân bổ Trạng thái Nguyên liệu Kho
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Tổng quan số lượng và tỷ lệ các nguyên liệu đang gặp vấn đề trong kho.
          </Text>
        </div>

        <AntTooltip title="Biểu đồ phản ánh số lượng nguyên liệu chia theo 3 trạng thái vận hành.">
          <InfoCircleOutlined style={{ fontSize: 16, color: "#94a3b8", cursor: "pointer" }} />
        </AntTooltip>
      </div>

      {/* Horizontal Stacked Bar Chart */}
      <div style={{ width: "100%", height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            barCategoryGap="10%"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" stroke="#94a3b8" fontSize={11} />
            <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={12} width={80} />
            <Legend
              content={() => (
                <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", paddingTop: 10 }}>
                  {[
                    { label: "Bình thường", color: "#22c55e" },
                    { label: "Sắp hết",     color: "#f59e0b" },
                    { label: "Hết hàng",    color: "#ef4444" },
                  ].map((item, index) => (
                    <div key={index} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: item.color, borderRadius: 2 }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#334155" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            />
            <Bar dataKey="normal" name="normal" stackId="status" fill="#22c55e" radius={[4, 0, 0, 4]} barSize={28} />
            <Bar dataKey="lowStock" name="lowStock" stackId="status" fill="#f59e0b" barSize={28} />
            <Bar dataKey="outOfStock" name="outOfStock" stackId="status" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default InventoryStatusChart;
