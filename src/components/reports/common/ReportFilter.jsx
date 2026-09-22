import { Card, DatePicker, Button, Space, Tooltip } from "antd";
import { ReloadOutlined, CalendarOutlined, UndoOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const ReportFilter = ({
  presetTime = "this_month",
  onPresetChange,
  dateRange,
  onDateRangeChange,
  onRefresh,
  onResetFilters,
  loading = false,
}) => {
  const timePresets = [
    { label: "Hôm nay", value: "today" },
    { label: "Hôm qua", value: "yesterday" },
    { label: "Tuần này", value: "this_week" },
    { label: "Tuần trước", value: "last_week" },
    { label: "Tháng này", value: "this_month" },
    { label: "Tháng trước", value: "last_month" },
    { label: "Năm nay", value: "this_year" },
    { label: "Tùy chọn", value: "custom" },
  ];

  const handlePresetSelect = (value) => {
    onPresetChange?.(value);
    const now = dayjs();
    let start = now;
    let end = now;

    switch (value) {
      case "today":
        start = now.startOf("day");
        end = now.endOf("day");
        break;
      case "yesterday":
        start = now.subtract(1, "day").startOf("day");
        end = now.subtract(1, "day").endOf("day");
        break;
      case "this_week":
        start = now.startOf("week");
        end = now.endOf("week");
        break;
      case "last_week":
        start = now.subtract(1, "week").startOf("week");
        end = now.subtract(1, "week").endOf("week");
        break;
      case "this_month":
        start = now.startOf("month");
        end = now.endOf("month");
        break;
      case "last_month":
        start = now.subtract(1, "month").startOf("month");
        end = now.subtract(1, "month").endOf("month");
        break;
      case "this_year":
        start = now.startOf("year");
        end = now.endOf("year");
        break;
      default:
        break;
    }

    if (value !== "custom") {
      onDateRangeChange?.([start, end]);
    }
  };

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
          gap: 12,
        }}
      >
        <Space wrap size={[8, 8]}>
          <CalendarOutlined
            style={{
              color: "var(--color-primary)",
              marginRight: 4,
              fontSize: 16,
            }}
          />
          {timePresets.map((preset) => {
            const active = presetTime === preset.value;
            return (
              <Button
                key={preset.value}
                type={active ? "primary" : "default"}
                size="middle"
                onClick={() => handlePresetSelect(preset.value)}
                style={{
                  borderRadius: 6,
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                }}
              >
                {preset.label}
              </Button>
            );
          })}

          {presetTime === "custom" && (
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => onDateRangeChange?.(dates)}
              format="DD/MM/YYYY"
              size="middle"
              style={{ borderRadius: 6, width: 230 }}
            />
          )}

          <Tooltip title="Làm mới dữ liệu">
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              loading={loading}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>

          {onResetFilters && (
            <Tooltip title="Đặt lại bộ lọc thời gian về mặc định">
              <Button
                onClick={onResetFilters}
                style={{ borderRadius: 6 }}
              >
                Đặt lại
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>
    </Card>
  );
};

export default ReportFilter;
