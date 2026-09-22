import React from "react";
import { DatePicker, Button, Tooltip, Space, Card, Segmented } from "antd";
import {
  CalendarOutlined,
  ReloadOutlined,
  UndoOutlined,
} from "@ant-design/icons";

const { RangePicker } = DatePicker;

const TIME_SEGMENTS = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "7days", label: "7 ngày" },
  { value: "30days", label: "30 ngày" },
  { value: "this_month", label: "Tháng này" },
  { value: "this_quarter", label: "Quý này" },
  { value: "this_year", label: "Năm nay" },
  { value: "custom", label: "Tùy chọn" },
];

const InventoryFilterBar = ({
  presetTime,
  onPresetTimeChange,
  dateRange,
  onDateRangeChange,
  onReset,
  onRefresh,
}) => {
  return (
    <Card
      size="small"
      style={{
        borderRadius: 14,
        marginBottom: 20,
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        border: "1px solid #e2e8f0",
      }}
      bodyStyle={{ padding: "12px 16px" }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* LEFT: Time Segmented Selection */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
            <CalendarOutlined style={{ color: "#2563eb", fontSize: 14 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
              Khoảng thời gian:
            </span>
          </div>

          <Segmented
            options={TIME_SEGMENTS}
            value={presetTime}
            onChange={onPresetTimeChange}
            size="middle"
            style={{
              background: "#f1f5f9",
              padding: 3,
              borderRadius: 10,
              fontWeight: 500,
              fontSize: 12,
            }}
          />

          {presetTime === "custom" && (
            <RangePicker
              value={dateRange}
              onChange={onDateRangeChange}
              format="DD/MM/YYYY"
              style={{ borderRadius: 8 }}
              size="middle"
            />
          )}
        </div>

        {/* RIGHT: Reset & Refresh Actions */}
        <Space size={8}>
          <Button
            icon={<UndoOutlined />}
            onClick={onReset}
            style={{ borderRadius: 8, fontSize: 12 }}
            size="middle"
          >
            Đặt lại
          </Button>

          <Tooltip title="Làm mới dữ liệu">
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              style={{ borderRadius: 8 }}
              size="middle"
            />
          </Tooltip>
        </Space>
      </div>
    </Card>
  );
};

export default InventoryFilterBar;
