import React from "react";
import { Card, DatePicker, Select, Button, Space, Typography } from "antd";
import { FilterOutlined, CalendarOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { INITIAL_MOCK_EMPLOYEES } from "./homeMockData";

const { Text } = Typography;

/**
 * Component HomeFilter — Thanh Bộ Lọc Báo Cáo Ngang
 * Vị trí: Đặt ngay bên dưới card "Báo cáo trong ngày" và ngay bên trên tab Tổng hợp/Bán hàng/Thu chi/Hàng hóa.
 * Tự động áp dụng ngay khi người dùng chọn ngày hoặc nhân viên (không cần bấm Áp dụng).
 */
const HomeFilter = ({
  selectedDate,
  onDateChange,
  selectedEmployee,
  onEmployeeChange,
  onReset,
}) => {
  return (
    <Card
      bordered={false}
      style={{
        borderRadius: "var(--border-radius)",
        boxShadow: "var(--shadow-sm)",
        background: "var(--color-surface)",
        marginBottom: 20,
      }}
      bodyStyle={{ padding: "14px 20px" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {/* LEFT: Filter Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <Space align="center" size={6}>
            <FilterOutlined style={{ color: "var(--color-primary)", fontSize: 16 }} />
            <Text strong style={{ fontSize: 14, color: "#1e293b" }}>
              Bộ lọc báo cáo:
            </Text>
          </Space>

          {/* Date Picker */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
              <CalendarOutlined style={{ marginRight: 4, color: "#64748b" }} />
              Thời gian:
            </Text>
            <DatePicker
              value={selectedDate ? dayjs(selectedDate, "DD/MM/YYYY") : dayjs()}
              onChange={(date, dateString) => {
                const newDate = dateString || dayjs().format("DD/MM/YYYY");
                onDateChange(newDate);
              }}
              format="DD/MM/YYYY"
              allowClear={false}
              style={{ width: 150, borderRadius: 8 }}
            />
          </div>
        </div>

        {/* RIGHT: Reset Button */}
        <div>
          <Button
            onClick={onReset}
            style={{
              borderRadius: 8,
              fontWeight: 500,
            }}
          >
            Đặt lại
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default HomeFilter;
