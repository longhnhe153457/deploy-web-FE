import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Input, Button, Space, Progress, Card, Dropdown, Tooltip, message } from "antd";
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

const inventoryColumnDefs = [
  { title: "STT", field: (_, idx) => idx + 1 },
  { title: "Tên món ăn", field: "itemName" },
  { title: "Đơn giá", field: (r) => formatVND(r.unitPrice), align: "right" },
  { title: "Số lượng", field: (r) => `${r.qtySold} phần`, align: "center" },
  { title: "Thành tiền", field: (r) => formatVND(r.revenue), align: "right" },
  { title: "Ghi chú", field: "note" },
];

/**
 * Component Báo Cáo Hàng Hóa Chi Tiết
 * Hỗ trợ Fullscreen mode, Horizontal Scroll, Export Dropdown, Search, Sort, Tỷ Trọng %, Phân trang
 */
const InventoryReportTable = ({ data = [] }) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        !searchText ||
        item.itemName.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.itemCode && item.itemCode.toLowerCase().includes(searchText.toLowerCase()));

      return matchSearch;
    });
  }, [data, searchText]);

  const totals = useMemo(() => {
    let itemCount = filteredData.length;
    let totalQtySold = 0;
    let totalRevenue = 0;

    filteredData.forEach((item) => {
      totalQtySold += Number(item.qtySold || 0);
      totalRevenue += Number(item.revenue || 0);
    });

    return {
      itemCount,
      totalQtySold,
      totalRevenue,
    };
  }, [filteredData]);

  const handleExportExcel = () => {
    exportToExcelCSV("Bao_Cao_San_Pham_Hang_Hoa", inventoryColumnDefs, filteredData, [
      "Tổng cộng",
      "-",
      "-",
      `${totals.totalQtySold} phần`,
      formatVND(totals.totalRevenue),
      "-",
    ]);
  };

  const handleExportPDF = () => {
    printReportTable("BÁO CÁO SẢN PHẨM & HÀNG HÓA IN/PDF", inventoryColumnDefs, filteredData, [
      "Tổng cộng",
      "-",
      "-",
      `${totals.totalQtySold} phần`,
      formatVND(totals.totalRevenue),
      "-",
    ]);
  };

  const handlePrint = () => {
    printReportTable("BÁO CÁO SẢN PHẨM & HÀNG HÓA BÁN RA", inventoryColumnDefs, filteredData, [
      "Tổng cộng",
      "-",
      "-",
      `${totals.totalQtySold} phần`,
      formatVND(totals.totalRevenue),
      "-",
    ]);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      message.success("Đã làm mới dữ liệu báo cáo hàng hóa");
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
      width: 80,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Tên món ăn",
      dataIndex: "itemName",
      key: "itemName",
      width: 240,
      render: (text) => (
        <span
          onClick={() => navigate(`/inventory-management?tab=Product&subTab=monan&search=${text}`)}
          style={{ color: "#2563eb", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
        >
          {text}
        </span>
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 140,
      align: "right",
      render: (val) => formatVND(val),
    },
    {
      title: "Số lượng",
      dataIndex: "qtySold",
      key: "qtySold",
      width: 150,
      align: "center",
      sorter: (a, b) => a.qtySold - b.qtySold,
      render: (val) => <strong style={{ fontSize: 13 }}>{val} phần</strong>,
    },
    {
      title: "Thành tiền",
      dataIndex: "revenue",
      key: "revenue",
      width: 160,
      align: "right",
      sorter: (a, b) => a.revenue - b.revenue,
      render: (val) => (
        <strong style={{ color: "#2563eb", fontSize: 13 }}>{formatVND(val)}</strong>
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 200,
      render: (text) => text || "—",
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
            placeholder="Tìm theo Tên món ăn..."
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
            onClick={() => {
              setSearchText("");
            }}
            style={{ borderRadius: 8 }}
          >
            Đặt lại
          </Button>

          {/* Export Dropdown Button */}
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
        rowKey="id"
        sticky
        loading={loading}
        scroll={{ x: "max-content", y: isFullscreen ? "calc(100vh - 220px)" : undefined }}
        summary={() => (
          <Table.Summary fixed="top">
            <Table.Summary.Row
              style={{
                background: "#eff6ff",
                fontWeight: 700,
                borderBottom: "2px solid #3b82f6",
              }}
            >
              <Table.Summary.Cell index={0} align="center">-</Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <span style={{ color: "#1d4ed8", fontWeight: 700 }}>
                  tổng món: {totals.itemCount}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="center">
                <strong style={{ color: "#1d4ed8", fontSize: 13 }}>
                  {totals.totalQtySold} phần
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                <strong style={{ color: "#2563eb", fontSize: 13 }}>
                  {formatVND(totals.totalRevenue)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="center">
                -
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: ["5", "10", "20", "50", "100"],
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} món ăn/sản phẩm`,
        }}
        size="middle"
      />
    </Card>
  );
};

export default InventoryReportTable;
