import React from "react";
import { Table, Tag, Typography, Tooltip, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";

const { Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

/**
 * Revenue Report Component: RevenueReportTable
 * Bảng báo cáo doanh thu bán hàng chi tiết từng hóa đơn ERP (Có Search, Sort, Filter, Pagination & Click row -> Bill Detail Drawer).
 */
const RevenueReportTable = ({
  data = [],
  loading = false,
  onSelectBill,
  pagination,
  onTableChange,
}) => {
  const columns = [
    {
      title: "Mã Bill",
      dataIndex: "billCode",
      key: "billCode",
      width: 110,
      sorter: (a, b) => a.billCode.localeCompare(b.billCode),
      render: (text) => (
        <strong 
          style={{ color: "#2563eb", cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/inventory-management?tab=Invoice&search=${text}`;
          }}
        >
          {text}
        </strong>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "date",
      key: "date",
      width: 100,
      sorter: (a, b) => a.date.localeCompare(b.date),
    },
    {
      title: "Thời gian",
      dataIndex: "time",
      key: "time",
      width: 90,
    },
    {
      title: "Khách hàng",
      dataIndex: "customer",
      key: "customer",
      width: 140,
      render: (t) => t || "Khách lẻ",
    },
    {
      title: "Thu ngân",
      dataIndex: "cashier",
      key: "cashier",
      width: 140,
      filters: [
        { text: "Nguyễn Văn An", value: "Nguyễn Văn An" },
        { text: "Trần Thị Bình", value: "Trần Thị Bình" },
        { text: "Lê Hoàng Cường", value: "Lê Hoàng Cường" },
      ],
      onFilter: (val, record) => record.cashier === val,
    },
    {
      title: "Thanh toán",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 150,
      filters: [
        { text: "Tiền mặt", value: "Tiền mặt" },
        { text: "Chuyển khoản / QR", value: "Chuyển khoản / QR" },
        { text: "Thẻ Visa/Master", value: "Thẻ Visa/Master" },
      ],
      onFilter: (val, record) => record.paymentMethod === val,
      render: (m) => {
        let color = "blue";
        if (m === "Tiền mặt") color = "green";
        if (m === "Thẻ Visa/Master") color = "purple";
        return <Tag color={color}>{m}</Tag>;
      },
    },
    {
      title: "Tiền món",
      dataIndex: "dishTotal",
      key: "dishTotal",
      align: "right",
      width: 130,
      render: (v) => (
        <span style={{ whiteSpace: "nowrap" }}>{formatVND(v)}</span>
      ),
    },
    {
      title: "Phụ thu",
      dataIndex: "surcharge",
      key: "surcharge",
      align: "right",
      width: 110,
      render: (v) => (
        <span style={{ whiteSpace: "nowrap" }}>{formatVND(v)}</span>
      ),
    },
    {
      title: "Giảm giá",
      dataIndex: "discount",
      key: "discount",
      align: "right",
      width: 130,
      render: (v) =>
        v ? (
          <Text type="danger" style={{ whiteSpace: "nowrap" }}>
            -{formatVND(v)}
          </Text>
        ) : (
          <span style={{ whiteSpace: "nowrap" }}>0 đ</span>
        ),
    },
    {
      title: "VAT",
      dataIndex: "vat",
      key: "vat",
      align: "right",
      width: 110,
      render: (v) => (
        <span style={{ whiteSpace: "nowrap" }}>{formatVND(v)}</span>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      key: "total",
      align: "right",
      width: 140,
      sorter: (a, b) => a.total - b.total,
      render: (v) => (
        <strong
          style={{
            color: "var(--color-primary)",
            fontSize: 14,
            whiteSpace: "nowrap",
          }}
        >
          {formatVND(v)}
        </strong>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: () => <Tag color="success">Đã hoàn thành</Tag>,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 80,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Tooltip title="Xem chi tiết hóa đơn">
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: "#2563eb", fontSize: 16 }} />}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBill?.(record);
            }}
          />
        </Tooltip>
      ),
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
      scroll={{ x: 1540 }}
      pagination={
        pagination ?? {
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} của ${total} hóa đơn`,
        }
      }
      onChange={onTableChange}
    />
  );
};

export default RevenueReportTable;
