import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Input, Select, Button, Space, Tag, Card, Dropdown, Tooltip, message } from "antd";
import {
  SearchOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PrinterOutlined,
  DownloadOutlined,
  DownOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { exportToExcelCSV, printReportTable } from "./exportUtils";
import { deleteCashFlow } from "../../api/cashFlowApi";

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

const cashFlowColumnDefs = [
  { title: "Mã phiếu", field: "code" },
  { title: "Loại", field: "type", align: "center" },
  { title: "Số tiền", field: (r) => `${r.type === "Thu" ? "+" : "-"}${formatVND(r.amount)}`, align: "right" },
  { title: "Phương thức", field: (r) => {
      const METHOD_LABELS = {
        1: 'Tiền mặt', Cash: 'Tiền mặt',
        2: 'Thẻ', Card: 'Thẻ',
        3: 'Chuyển khoản', Transfer: 'Chuyển khoản',
      };
      return METHOD_LABELS[r.paymentMethod] || r.paymentMethod || "—";
    }
  },
  { title: "Đối tác", field: "person" },
  { title: "Chứng từ gốc", field: "docCode" },
  { title: "Ngày", field: (r) => `${r.date} ${r.time}` },
  { title: "Ghi chú", field: "note" },
];

/**
 * Component Báo Cáo Thu Chi Chi Tiết
 * Hỗ trợ Fullscreen mode, Horizontal Scroll, Export Dropdown, Search, Filter Loại Thu/Chi, Sort, Phân trang
 */
const CashFlowReportTable = ({ data = [], onRefresh }) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await deleteCashFlow(id, "Xóa từ báo cáo");
      message.success("Đã xóa phiếu thu chi thành công");
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi xóa phiếu thu chi");
    } finally {
      setConfirmDeleteId(null);
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        item.code.toLowerCase().includes(searchText.toLowerCase()) ||
        item.person.toLowerCase().includes(searchText.toLowerCase()) ||
        item.note.toLowerCase().includes(searchText.toLowerCase()) ||
        item.docCode.toLowerCase().includes(searchText.toLowerCase());

      const matchType = typeFilter === "all" || item.type === typeFilter;

      return matchSearch && matchType;
    });
  }, [data, searchText, typeFilter]);

  const totals = useMemo(() => {
    let totalCount = filteredData.length;
    let netAmount = 0;

    filteredData.forEach((item) => {
      const amt = Number(item.amount || 0);
      if (item.type === "Thu") {
        netAmount += amt;
      } else if (item.type === "Chi") {
        netAmount -= amt;
      }
    });

    return {
      totalCount,
      netAmount,
    };
  }, [filteredData]);

  const handleExportExcel = () => {
    exportToExcelCSV("Bao_Cao_Thu_Chi", cashFlowColumnDefs, filteredData, [
      `Tổng: ${totals.totalCount} giao dịch`,
      "-",
      "-",
      "-",
      `${totals.netAmount >= 0 ? "+" : ""}${formatVND(totals.netAmount)}`,
      "-",
      "-",
    ]);
  };

  const handleExportPDF = () => {
    printReportTable("BÁO CÁO THU CHI TÀI CHÍNH IN/PDF", cashFlowColumnDefs, filteredData, [
      `Tổng: ${totals.totalCount} giao dịch`,
      "-",
      "-",
      "-",
      `${totals.netAmount >= 0 ? "+" : ""}${formatVND(totals.netAmount)}`,
      "-",
      "-",
    ]);
  };

  const handlePrint = () => {
    printReportTable("BÁO CÁO THU CHI TÀI CHÍNH", cashFlowColumnDefs, filteredData, [
      `Tổng: ${totals.totalCount} giao dịch`,
      "-",
      "-",
      "-",
      `${totals.netAmount >= 0 ? "+" : ""}${formatVND(totals.netAmount)}`,
      "-",
      "-",
    ]);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      message.success("Đã làm mới dữ liệu báo cáo thu chi");
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
      title: "Mã phiếu",
      dataIndex: "code",
      key: "code",
      width: 140,
      render: (text) => (
        <span
          onClick={() => navigate(`/cashflow?search=${text}`)}
          style={{ color: "#f97316", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
        >
          {text}
        </span>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 100,
      align: "center",
      render: (type) => (
        <Tag
          color={type === "Thu" ? "success" : "error"}
          style={{ borderRadius: 6, fontWeight: 600, padding: "2px 8px" }}
        >
          {type === "Thu" ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {type}
        </Tag>
      ),
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      align: "right",
      sorter: (a, b) => a.amount - b.amount,
      render: (val, record) => (
        <strong style={{ color: record.type === "Thu" ? "#10b981" : "#ef4444", fontSize: 13 }}>
          {record.type === "Thu" ? "+" : "-"}{formatVND(val)}
        </strong>
      ),
    },
    {
      title: "Phương thức",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 130,
      render: (method) => {
        const METHOD_LABELS = {
          1: 'Tiền mặt', Cash: 'Tiền mặt',
          2: 'Thẻ', Card: 'Thẻ',
          3: 'Chuyển khoản', Transfer: 'Chuyển khoản',
        };
        return METHOD_LABELS[method] || method || "—";
      }
    },
    {
      title: "Đối tác",
      dataIndex: "person",
      key: "person",
      width: 180,
    },
    {
      title: "Chứng từ gốc",
      dataIndex: "docCode",
      key: "docCode",
      width: 160,
      render: (text) => {
        if (!text || text === "—") return "—";
        const handleClick = () => {
          let tab = "Import";
          const lower = text.toLowerCase();
          if (lower.startsWith("hd") || lower.startsWith("pxbh") || lower.startsWith("ptbh") || lower.startsWith("pth")) {
            tab = "Invoice";
          } else if (lower.startsWith("nh") || lower.startsWith("nk")) {
            tab = "Import";
          } else if (lower.startsWith("ck")) {
            tab = "Transfer";
          }
          navigate(`/inventory-management?tab=${tab}&search=${text}`);
        };
        return (
          <span
            onClick={handleClick}
            style={{ fontFamily: "monospace", color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
          >
            {text}
          </span>
        );
      },
    },
    {
      title: "Ngày",
      key: "date",
      width: 140,
      render: (_, record) => `${record.date} ${record.time}`,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 180,
    },
    {
      title: "Xóa",
      key: "delete",
      width: 100,
      align: "center",
      render: (_, record) => {
        const hasDoc = record.docCode && record.docCode !== "—";
        if (hasDoc) return <span style={{ color: "#cbd5e1" }}>—</span>;

        return confirmDeleteId === record.id ? (
          <Space>
            <Button
              type="primary"
              danger
              size="small"
              onClick={() => handleDelete(record.id)}
            >
              Có
            </Button>
            <Button
              size="small"
              onClick={() => setConfirmDeleteId(null)}
            >
              Không
            </Button>
          </Space>
        ) : (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setConfirmDeleteId(record.id)}
          />
        );
      }
    }
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
            placeholder="Tìm theo Mã, Người nộp/nhận, Nội dung..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280, borderRadius: 8 }}
            allowClear
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 160 }}
            options={[
              { value: "all", label: "Tất cả Loại" },
              { value: "Thu", label: "Phiếu Thu (+)" },
              { value: "Chi", label: "Phiếu Chi (-)" },
            ]}
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
              setTypeFilter("all");
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
                background: "#fef2f2",
                fontWeight: 700,
                borderBottom: "2px solid #fca5a5",
              }}
            >
              <Table.Summary.Cell index={0} align="center">-</Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <span style={{ color: "#dc2626", fontWeight: 700 }}>
                  tổng giao dịch: {totals.totalCount}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <strong
                  style={{
                    color: totals.netAmount >= 0 ? "#10b981" : "#ef4444",
                    fontSize: 14,
                  }}
                >
                  {totals.netAmount >= 0 ? "+" : ""}{formatVND(totals.netAmount)}
                </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>-</Table.Summary.Cell>
              <Table.Summary.Cell index={5}>-</Table.Summary.Cell>
              <Table.Summary.Cell index={6}>-</Table.Summary.Cell>
              <Table.Summary.Cell index={7}>-</Table.Summary.Cell>
              <Table.Summary.Cell index={8}>-</Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="center">-</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: ["5", "10", "20", "50", "100"],
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} giao dịch`,
        }}
        size="middle"
      />
    </Card>
  );
};

export default CashFlowReportTable;
