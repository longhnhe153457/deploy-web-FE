import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Input, Select, Button, Space, Tag, Card, Dropdown, Tooltip, message } from "antd";
import {
  SearchOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  DownloadOutlined,
  DownOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import { exportToExcelCSV, printReportTable } from "./exportUtils";

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

const salesColumnsDefs = [
  { title: "MÃ HÓA ĐƠN", field: "billCode" },
  { title: "NGÀY LẬP", field: (r) => `${r.date} ${r.time}` },
  { title: "BÀN / KHU VỰC", field: (r) => r.areaName ? `${r.tableName} (${r.areaName})` : r.tableName },
  { title: "KHÁCH HÀNG", field: "customer" },
  { title: "THU NGÂN", field: "cashier" },
  { title: "TỔNG TIỀN (VNĐ)", field: (r) => formatVND(r.total), align: "right" },
  { title: "TRẠNG THÁI", field: (r) => {
      const isPaid = r.status === "Paid" || r.status === "Completed" || r.status === 1;
      return isPaid ? "Đã thanh toán" : r.status;
    }
  },
];

/**
 * Component Báo Cáo Bán Hàng Chi Tiết
 * Hỗ trợ Fullscreen mode, Horizontal Scroll, Export Dropdown, Search, Filter PTTT, Sort, Phân trang
 */
const SalesReportTable = ({ data = [] }) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        !searchText ||
        item.billCode.toLowerCase().includes(searchText.toLowerCase()) ||
        item.customer?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.cashier.toLowerCase().includes(searchText.toLowerCase());

      return matchSearch;
    });
  }, [data, searchText]);

  const totals = useMemo(() => {
    let billCount = filteredData.length;
    let totalAmount = 0;

    filteredData.forEach((item) => {
      totalAmount += Number(item.total || 0);
    });

    return {
      billCount,
      totalAmount,
    };
  }, [filteredData]);

  const handleExportExcel = () => {
    exportToExcelCSV("Bao_Cao_Ban_Hang", salesColumnsDefs, filteredData, [
      "Tổng cộng",
      "-",
      "-",
      "-",
      "-",
      formatVND(totals.totalAmount),
      "-",
    ]);
  };

  const handleExportPDF = () => {
    printReportTable("BÁO CÁO BÁN HÀNG CHI TIẾT IN/PDF", salesColumnsDefs, filteredData, [
      "Tổng cộng",
      "-",
      "-",
      "-",
      "-",
      formatVND(totals.totalAmount),
      "-",
    ]);
  };

  const handlePrint = () => {
    printReportTable("BÁO CÁO BÁN HÀNG CHI TIẾT", salesColumnsDefs, filteredData, [
      `Tổng: ${totals.billCount} bill`,
      "-",
      "-",
      "-",
      `${totals.totalItemCount} món`,
      formatVND(totals.totalSubtotal),
      totals.totalSurcharge > 0 ? formatVND(totals.totalSurcharge) : "-",
      totals.totalDiscount > 0 ? `-${formatVND(totals.totalDiscount)}` : "-",
      formatVND(totals.totalAmount),
      "-",
    ]);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      message.success("Đã làm mới dữ liệu báo cáo bán hàng");
    }, 300);
  };

  const exportMenuItems = [
    {
      key: "excel",
      icon: <FileExcelOutlined style={{ color: "#16a34a" }} />,
      label: "Xuất file Excel (.csv / .xlsx)",
      onClick: handleExportExcel,
    },
    {
      key: "pdf",
      icon: <FilePdfOutlined style={{ color: "#dc2626" }} />,
      label: "Xuất file PDF (.pdf)",
      onClick: handleExportPDF,
    },
    {
      type: "divider",
    },
    {
      key: "print",
      icon: <PrinterOutlined style={{ color: "#2563eb" }} />,
      label: "In báo cáo (Mở giao diện máy in)",
      onClick: handlePrint,
    },
  ];

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 70,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "MÃ HÓA ĐƠN",
      dataIndex: "billCode",
      key: "billCode",
      width: 160,
      render: (text) => (
        <span
          onClick={() => navigate(`/inventory-management?tab=Invoice&search=${text}`)}
          style={{ color: "#16a34a", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
        >
          {text}
        </span>
      ),
    },
    {
      title: "NGÀY LẬP",
      key: "createdAt",
      width: 160,
      render: (_, record) => `${record.date} ${record.time}`,
    },
    {
      title: "BÀN / KHU VỰC",
      key: "tableName",
      width: 180,
      render: (_, record) => record.areaName ? `${record.tableName} (${record.areaName})` : record.tableName,
    },
    {
      title: "KHÁCH HÀNG",
      dataIndex: "customer",
      key: "customer",
      width: 160,
    },
    {
      title: "THU NGÂN",
      dataIndex: "cashier",
      key: "cashier",
      width: 150,
    },
    {
      title: "TỔNG TIỀN (VNĐ)",
      dataIndex: "total",
      key: "total",
      width: 160,
      align: "right",
      sorter: (a, b) => a.total - b.total,
      render: (val) => <strong style={{ color: "#16a34a", fontSize: 13 }}>{formatVND(val)}</strong>,
    },
    {
      title: "TRẠNG THÁI",
      dataIndex: "status",
      key: "status",
      width: 140,
      align: "center",
      render: (status) => {
        const isPaid = status === "Paid" || status === "Completed" || status === 1;
        return (
          <Tag color={isPaid ? "success" : "warning"} style={{ borderRadius: 6, fontWeight: 600, padding: "2px 8px" }}>
            {isPaid ? "Đã thanh toán" : status}
          </Tag>
        );
      },
    },
  ];

  return (
    <Card
      bordered={false}
      style={
        isFullscreen
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1200,
              borderRadius: 0,
              overflow: "auto",
              background: "#ffffff",
              padding: 24,
            }
          : {
              borderRadius: "var(--border-radius)",
              boxShadow: "var(--shadow-sm)",
              background: "var(--color-surface)",
            }
      }
      bodyStyle={{ padding: 16 }}
    >
      {/* Complete Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Space wrap size="middle">
          <Input
            placeholder="Tìm theo Mã hóa đơn, Bàn, Thu ngân..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280, borderRadius: 8 }}
            allowClear
          />
        </Space>

        <Space wrap>
          {/* Refresh Data Button */}
          <Tooltip title="Tải lại dữ liệu">
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
              style={{ borderRadius: 8 }}
            />
          </Tooltip>

          {/* Reset Filters Button */}
          <Button
            onClick={() => setSearchText("")}
            style={{ borderRadius: 8 }}
          >
            Đặt lại
          </Button>

          {/* Export & Print Dropdown Button */}
          <Dropdown
            menu={{ items: exportMenuItems }}
            trigger={["click"]}
            placement="bottomRight"
            getPopupContainer={(trigger) => trigger.parentElement}
          >
            <Button type="primary" icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>
              Xuất/In <DownOutlined />
            </Button>
          </Dropdown>

          {/* Fullscreen Toggle Button */}
          <Tooltip title={isFullscreen ? "Thoát toàn màn hình" : "Phóng to toàn màn hình"}>
            <Button
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{ borderRadius: 8 }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Table with Horizontal Scroll Support & Top Summary Row */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="billCode"
        sticky
        loading={loading}
        scroll={{ x: "max-content", y: isFullscreen ? "calc(100vh - 220px)" : undefined }}
        summary={() => (
          <Table.Summary fixed="top">
            <Table.Summary.Row
              style={{
                background: "#f0fdf4",
                fontWeight: 700,
                borderBottom: "2px solid #86efac",
              }}
            >
              <Table.Summary.Cell index={0} align="center">-</Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <span style={{ color: "#16a34a", fontWeight: 700 }}>
                  tổng hóa đơn: {totals.billCount}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
              <Table.Summary.Cell index={3}>-</Table.Summary.Cell>
              <Table.Summary.Cell index={4}>-</Table.Summary.Cell>
              <Table.Summary.Cell index={5}>-</Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right">
                <strong style={{ color: "#16a34a", fontSize: 14 }}>
                  {formatVND(totals.totalAmount)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="center">
                -
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: ["5", "10", "20", "50", "100"],
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn hàng`,
        }}
        size="middle"
      />
    </Card>
  );
};

export default SalesReportTable;
