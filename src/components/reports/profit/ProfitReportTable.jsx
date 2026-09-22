import React from "react";
import { Table, Tag, Typography } from "antd";

const { Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

/**
 * Profit Report Component: ProfitReportTable
 * Bảng báo cáo Lợi nhuận ERP linh hoạt theo mốc thời gian:
 * - Lọc Năm: 12 dòng (Tháng 1 -> 12)
 * - Lọc Tháng: 30 dòng (Ngày 01 -> 30)
 * - Lọc Tuần: 7 dòng (Thứ 2 -> Chủ Nhật)
 * - Lọc Ngày: 24 dòng (00:00 -> 23:00 theo giờ)
 */
const ProfitReportTable = ({
  data = [],
  loading = false,
  presetTime = "this_month",
  pagination,
  onTableChange,
}) => {
  const columns = [
    {
      title: "Mốc Thời Gian",
      dataIndex: "timeLabel",
      key: "timeLabel",
      width: 140,
      sorter: (a, b) => a.timeLabel.localeCompare(b.timeLabel),
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Doanh Thu",
      dataIndex: "revenue",
      key: "revenue",
      align: "right",
      width: 150,
      sorter: (a, b) => a.revenue - b.revenue,
      render: (v) => (
        <span style={{ color: "#2563eb", fontWeight: 600 }}>
          {formatVND(v)}
        </span>
      ),
    },
    {
      title: "Chi Phí",
      dataIndex: "expense",
      key: "expense",
      align: "right",
      width: 150,
      sorter: (a, b) => a.expense - b.expense,
      render: (v) => (
        <span style={{ color: "#ef4444", fontWeight: 600 }}>
          -{formatVND(v)}
        </span>
      ),
    },
    {
      title: "Lợi Nhuận Ròng",
      dataIndex: "profit",
      key: "profit",
      align: "right",
      width: 160,
      sorter: (a, b) => a.profit - b.profit,
      render: (v) => (
        <strong style={{ color: v >= 0 ? "#16a34a" : "#dc2626", fontSize: 14 }}>
          {v >= 0 ? "+" : ""}
          {formatVND(v)}
        </strong>
      ),
    },
    {
      title: "Tỷ Suất Lợi Nhuận",
      dataIndex: "marginPct",
      key: "marginPct",
      align: "right",
      width: 160,
      sorter: (a, b) => a.marginPct - b.marginPct,
      render: (v) => <Tag color={v >= 40 ? "success" : "warning"}>{v}%</Tag>,
    },
    {
      title: "Tỷ Lệ Chi Phí",
      dataIndex: "costRatioPct",
      key: "costRatioPct",
      align: "right",
      width: 160,
      sorter: (a, b) => a.costRatioPct - b.costRatioPct,
      render: (v) => <Tag color={v <= 40 ? "blue" : "error"}>{v}%</Tag>,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      size="middle"
      bordered
      scroll={{ x: 1000 }}
      pagination={
        pagination ?? {
          defaultPageSize: 30,
          showSizeChanger: true,
          pageSizeOptions: ["10", "24", "30", "50"],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} của ${total} mốc thời gian`,
        }
      }
      onChange={onTableChange}
    />
  );
};

export default ProfitReportTable;
