import React from "react";
import { Table, Tag, Typography, Tooltip, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";

const { Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

/**
 * Expense Report Component: ExpenseReportTable
 * Bảng báo cáo chi phí chi tiết ERP (Có Search, Sort, Filter, Pagination & Click row -> Expense Detail Drawer).
 */
const ExpenseReportTable = ({
  data = [],
  loading = false,
  onSelectExpense,
  pagination,
  onTableChange,
}) => {
  const columns = [
    {
      title: "Mã Phiếu Chi",
      dataIndex: "expenseCode",
      key: "expenseCode",
      sorter: (a, b) => a.expenseCode.localeCompare(b.expenseCode),
      render: (text) => (
        <strong 
          style={{ color: "#ef4444", cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/cashflow?search=${text}`;
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
      sorter: (a, b) => a.date.localeCompare(b.date),
    },
    {
      title: "Giờ",
      dataIndex: "time",
      key: "time",
    },
    {
      title: "Nhà Cung Cấp / Đối tác",
      dataIndex: "supplier",
      key: "supplier",
      render: (s) => s || "-",
    },
    {
      title: "Người Tạo",
      dataIndex: "createdBy",
      key: "createdBy",
    },
    {
      title: "Giá Trị Chi",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      sorter: (a, b) => a.amount - b.amount,
      render: (v) => (
        <strong style={{ color: "#dc2626", fontSize: 14 }}>
          {formatVND(v)}
        </strong>
      ),
    },
    {
      title: "Ghi chú / Nội dung",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
    },
    {
      title: "Trạng Thái",
      dataIndex: "status",
      key: "status",
      render: () => <Tag color="success">Đã chi tiền</Tag>,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 80,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Tooltip title="Xem chi tiết phiếu chi">
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: "#2563eb", fontSize: 16 }} />}
            onClick={(e) => {
              e.stopPropagation();
              onSelectExpense?.(record);
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
      scroll={{ x: "max-content" }}
      pagination={
        pagination ?? {
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} của ${total} chứng từ chi`,
        }
      }
      onChange={onTableChange}
    />
  );
};

export default ExpenseReportTable;
