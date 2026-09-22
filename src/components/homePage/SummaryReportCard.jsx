import React, { useState, useMemo } from "react";
import { Card, Table, Button, Space, Dropdown, Tooltip, Typography } from "antd";
import {
  FileExcelOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  DownloadOutlined,
  DownOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CalculatorOutlined,
} from "@ant-design/icons";
import { exportMultipleTablesToExcel, printMultipleReportTables } from "./exportUtils";

const { Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

const formatSignedVND = (val, sign) => {
  const absVal = Math.abs(val || 0);
  const prefix = sign ? sign : val >= 0 ? "+" : "-";
  return `${prefix}${formatVND(absVal)}`;
};

/**
 * Component Báo Cáo Tổng Hợp Trong Ngày
 * Hiển thị 3 bảng tổng kết:
 * 1. Tổng kết Thu chi (Giá trị tiền)
 * 2. Tổng kết Hóa đơn (Số lượng & Doanh thu PTTT)
 * 3. Tổng số lượng Giao dịch (Lượt giao dịch PTTT)
 * Hỗ trợ Xuất/In chung cả 3 bảng trong 1 thao tác.
 */
const SummaryReportCard = ({ salesList = [], cashFlowList = [] }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ─── 1. TÍNH TOÁN DỮ LIỆU TỔNG KẾT ──────────────────────────────────────────
  const summaryData = useMemo(() => {
    // A. Phân tích salesList
    let salesCount = salesList.length;
    let salesTotalVal = 0;
    let salesCashVal = 0;
    let salesBankVal = 0;
    let salesCardVal = 0;

    let salesCashCount = 0;
    let salesBankCount = 0;
    let salesCardCount = 0;

    salesList.forEach((s) => {
      const amt = Number(s.total || 0);
      salesTotalVal += amt;

      if (s.paymentMethod === "Tiền mặt") {
        salesCashVal += amt;
        salesCashCount += 1;
      } else if (s.paymentMethod === "Chuyển khoản / QR") {
        salesBankVal += amt;
        salesBankCount += 1;
      } else if (s.paymentMethod === "Thẻ Visa/Master") {
        salesCardVal += amt;
        salesCardCount += 1;
      }
    });

    // B. Phân tích cashFlowList
    let cfThuCash = salesCashVal;
    let cfThuBank = salesBankVal;
    let cfThuCard = salesCardVal;

    let cfChiCash = 0;
    let cfChiBank = 0;
    let cfChiCard = 0;

    let cfThuCount = 0;
    let cfThuCashCount = 0;
    let cfThuBankCount = 0;
    let cfThuCardCount = 0;

    let cfChiCount = 0;
    let cfChiCashCount = 0;
    let cfChiBankCount = 0;
    let cfChiCardCount = 0;

    cashFlowList.forEach((cf) => {
      const amt = Number(cf.amount || 0);
      const rawMethod = String(cf.paymentMethod || '').toLowerCase();
      const isCash = rawMethod === '1' || rawMethod === 'cash' || rawMethod.includes('mặt');
      const isCard = rawMethod === '2' || rawMethod === 'card' || rawMethod.includes('thẻ') || rawMethod.includes('visa') || rawMethod.includes('master');

      if (cf.type === "Thu") {
        cfThuCount += 1;
        if (isCash) {
          cfThuCash += amt;
          cfThuCashCount += 1;
        } else if (isCard) {
          cfThuCard += amt;
          cfThuCardCount += 1;
        } else {
          cfThuBank += amt;
          cfThuBankCount += 1;
        }
      } else if (cf.type === "Chi") {
        cfChiCount += 1;
        if (isCash) {
          cfChiCash += amt;
          cfChiCashCount += 1;
        } else if (isCard) {
          cfChiCard += amt;
          cfChiCardCount += 1;
        } else {
          cfChiBank += amt;
          cfChiBankCount += 1;
        }
      }
    });

    const cfThuTotal = cfThuCash + cfThuBank + cfThuCard;
    const cfChiTotal = cfChiCash + cfChiBank + cfChiCard;

    const totalTxnAll = salesCount + cfThuCount + cfChiCount;
    const totalTxnCash = salesCashCount + cfThuCashCount + cfChiCashCount;
    const totalTxnBank = salesBankCount + cfThuBankCount + cfChiBankCount;
    const totalTxnCard = salesCardCount + cfThuCardCount + cfChiCardCount;

    return {
      netTotals: {
        netCash: cfThuCash - cfChiCash,
        netBank: cfThuBank - cfChiBank,
        netCard: cfThuCard - cfChiCard,
        netTotal: cfThuTotal - cfChiTotal,
      },

      // 1. Table Thu chi
      cashFlowSummary: [
        {
          key: "thu",
          category: "Tổng thu",
          cash: cfThuCash,
          bank: cfThuBank,
          card: cfThuCard,
          total: cfThuTotal,
        },
        {
          key: "chi",
          category: "Tổng chi",
          cash: cfChiCash,
          bank: cfChiBank,
          card: cfChiCard,
          total: cfChiTotal,
        },
      ],

      // 2. Table Hóa đơn
      invoiceSummary: [
        {
          key: "inv",
          category: "Hóa đơn bán hàng",
          qty: salesCount,
          value: salesTotalVal,
          cash: salesCashVal,
          bank: salesBankVal,
          card: salesCardVal,
          total: salesTotalVal,
        },
      ],

      // 3. Table Số lượng giao dịch (Tách rõ: Giao dịch hóa đơn, Giao dịch thu, Giao dịch chi)
      txnSummary: [
        {
          key: "txn_sales",
          docType: "Phiếu thu",
          category: "Giao dịch hóa đơn",
          txnCount: salesCount,
          cash: salesCashCount,
          bank: salesBankCount,
          card: salesCardCount,
          total: salesCount,
        },
        {
          key: "txn_thu",
          docType: "Phiếu thu",
          category: "Giao dịch thu",
          txnCount: cfThuCount,
          cash: cfThuCashCount,
          bank: cfThuBankCount,
          card: cfThuCardCount,
          total: cfThuCount,
        },
        {
          key: "txn_chi",
          docType: "Phiếu chi",
          category: "Giao dịch chi",
          txnCount: cfChiCount,
          cash: cfChiCashCount,
          bank: cfChiBankCount,
          card: cfChiCardCount,
          total: cfChiCount,
        },
        {
          key: "txn_total",
          docType: "",
          category: "Tổng giao dịch",
          txnCount: totalTxnAll,
          cash: totalTxnCash,
          bank: totalTxnBank,
          card: totalTxnCard,
          total: totalTxnAll,
        },
      ],
    };
  }, [salesList, cashFlowList]);

  // ─── DEFINITION CÁC CỘT BẢNG ──────────────────────────────────────────────

  // Bảng 1: Thu Chi (Thu +, Chi -, Thực thu ròng ±)
  const cashFlowColumns = [
    {
      title: "Danh mục",
      dataIndex: "category",
      key: "category",
      width: 180,
      render: (t) => (
        <strong style={{ color: t === "Tổng thu" ? "#16a34a" : "#dc2626" }}>
          {t}
        </strong>
      ),
    },
    {
      title: "Tiền mặt",
      dataIndex: "cash",
      key: "cash",
      align: "right",
      render: (v, r) => (
        <span style={{ color: r.category === "Tổng thu" ? "#16a34a" : "#dc2626" }}>
          {formatSignedVND(v, r.category === "Tổng thu" ? "+" : "-")}
        </span>
      ),
    },
    {
      title: "Chuyển khoản",
      dataIndex: "bank",
      key: "bank",
      align: "right",
      render: (v, r) => (
        <span style={{ color: r.category === "Tổng thu" ? "#16a34a" : "#dc2626" }}>
          {formatSignedVND(v, r.category === "Tổng thu" ? "+" : "-")}
        </span>
      ),
    },
    {
      title: "Thẻ Visa/Master",
      dataIndex: "card",
      key: "card",
      align: "right",
      render: (v, r) => (
        <span style={{ color: r.category === "Tổng thu" ? "#16a34a" : "#dc2626" }}>
          {formatSignedVND(v, r.category === "Tổng thu" ? "+" : "-")}
        </span>
      ),
    },
    {
      title: "Tổng giá trị",
      dataIndex: "total",
      key: "total",
      align: "right",
      render: (v, r) => (
        <strong style={{ color: r.category === "Tổng thu" ? "#16a34a" : "#dc2626", fontSize: 14 }}>
          {formatSignedVND(v, r.category === "Tổng thu" ? "+" : "-")}
        </strong>
      ),
    },
  ];

  // Bảng 2: Hóa đơn (Chữ màu đen hoàn toàn)
  const invoiceColumns = [
    { title: "Danh mục", dataIndex: "category", key: "category", width: 180, render: (t) => <strong style={{ color: "#000000" }}>{t}</strong> },
    { title: "Số lượng", dataIndex: "qty", key: "qty", align: "center", render: (v) => <span style={{ color: "#000000", fontWeight: 700 }}>{v} hóa đơn</span> },
    { title: "Giá trị", dataIndex: "value", key: "value", align: "right", render: (v) => <span style={{ color: "#000000" }}>{formatVND(v)}</span> },
    { title: "Tiền mặt", dataIndex: "cash", key: "cash", align: "right", render: (v) => <span style={{ color: "#000000" }}>{formatVND(v)}</span> },
    { title: "Chuyển khoản", dataIndex: "bank", key: "bank", align: "right", render: (v) => <span style={{ color: "#000000" }}>{formatVND(v)}</span> },
    { title: "Thẻ Visa/Master", dataIndex: "card", key: "card", align: "right", render: (v) => <span style={{ color: "#000000" }}>{formatVND(v)}</span> },
    { title: "Tổng giá trị", dataIndex: "total", key: "total", align: "right", render: (v) => <strong style={{ color: "#000000", fontSize: 14 }}>{formatVND(v)}</strong> },
  ];

  // Bảng 3: Giao dịch
  const txnColumns = [
    {
      title: "Loại phiếu",
      dataIndex: "docType",
      key: "docType",
      width: 120,
      onCell: (_, index) => {
        if (index === 0) return { rowSpan: 2 };
        if (index === 1) return { rowSpan: 0 };
        return { rowSpan: 1 };
      },
      render: (t) => <span>{t}</span>,
    },
    { title: "Danh mục", dataIndex: "category", key: "category", width: 180, render: (t) => <strong style={{ color: t === "Tổng giao dịch" ? "var(--color-primary)" : "#334155" }}>{t}</strong> },
    { title: "Số giao dịch", dataIndex: "txnCount", key: "txnCount", align: "center", render: (v) => <span>{v} lượt</span> },
    { title: "Tiền mặt", dataIndex: "cash", key: "cash", align: "center", render: (v) => <span>{v} lượt</span> },
    { title: "Chuyển khoản", dataIndex: "bank", key: "bank", align: "center", render: (v) => <span>{v} lượt</span> },
    { title: "Thẻ Visa/Master", dataIndex: "card", key: "card", align: "center", render: (v) => <span>{v} lượt</span> },
    { title: "Tổng giao dịch", dataIndex: "total", key: "total", align: "center", render: (v) => <strong style={{ color: "#2563eb", fontSize: 14 }}>{v} lượt</strong> },
  ];

  // ─── XUẤT VÀ IN CHUNG CẢ 3 BẢNG ──────────────────────────────────────────
  const getCombinedTablesDefs = () => [
    {
      title: "1. Tổng kết Thu chi Tài chính (Giá trị)",
      columnDefs: [
        { title: "Danh mục", field: "category" },
        { title: "Tiền mặt", field: (r) => formatSignedVND(r.cash, r.category === "Tổng thu" ? "+" : "-"), align: "right" },
        { title: "Chuyển khoản", field: (r) => formatSignedVND(r.bank, r.category === "Tổng thu" ? "+" : "-"), align: "right" },
        { title: "Thẻ Visa/Master", field: (r) => formatSignedVND(r.card, r.category === "Tổng thu" ? "+" : "-"), align: "right" },
        { title: "Tổng giá trị", field: (r) => formatSignedVND(r.total, r.category === "Tổng thu" ? "+" : "-"), align: "right" },
      ],
      summaryRow: [
        "Tổng tồn / Thực thu",
        formatSignedVND(summaryData.netTotals.netCash),
        formatSignedVND(summaryData.netTotals.netBank),
        formatSignedVND(summaryData.netTotals.netCard),
        formatSignedVND(summaryData.netTotals.netTotal),
      ],
      data: summaryData.cashFlowSummary,
    },
    {
      title: "2. Tổng kết Hóa đơn Bán hàng (Doanh thu theo PTTT)",
      columnDefs: [
        { title: "Danh mục", field: "category" },
        { title: "Số lượng", field: (r) => `${r.qty} hóa đơn`, align: "center" },
        { title: "Giá trị", field: (r) => formatVND(r.value), align: "right" },
        { title: "Tiền mặt", field: (r) => formatVND(r.cash), align: "right" },
        { title: "Chuyển khoản", field: (r) => formatVND(r.bank), align: "right" },
        { title: "Thẻ Visa/Master", field: (r) => formatVND(r.card), align: "right" },
        { title: "Tổng giá trị", field: (r) => formatVND(r.total), align: "right" },
      ],
      data: summaryData.invoiceSummary,
    },
    {
      title: "3. Tổng số lượng Giao dịch (Số lượt giao dịch)",
      columnDefs: [
        { title: "Loại phiếu", field: "docType" },
        { title: "Danh mục", field: "category" },
        { title: "Số giao dịch", field: (r) => `${r.txnCount} lượt`, align: "center" },
        { title: "Tiền mặt", field: (r) => `${r.cash} lượt`, align: "center" },
        { title: "Chuyển khoản", field: (r) => `${r.bank} lượt`, align: "center" },
        { title: "Thẻ Visa/Master", field: (r) => `${r.card} lượt`, align: "center" },
        { title: "Tổng giao dịch", field: (r) => `${r.total} lượt`, align: "center" },
      ],
      data: summaryData.txnSummary,
    },
  ];

  const handleExportExcel = () => {
    exportMultipleTablesToExcel("Bao_Cao_Tong_Hop", getCombinedTablesDefs());
  };

  const handleExportPDF = () => {
    printMultipleReportTables("BÁO CÁO TỔNG HỢP TRONG NGÀY IN/PDF", getCombinedTablesDefs());
  };

  const handlePrint = () => {
    printMultipleReportTables("BÁO CÁO TỔNG HỢP TRONG NGÀY", getCombinedTablesDefs());
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
      label: "In toàn bộ báo cáo tổng hợp",
      onClick: handlePrint,
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
              marginBottom: 20,
            }
      }
      bodyStyle={{ padding: 20 }}
    >
      {/* TOOLBAR TỔNG HỢP */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
          borderBottom: "1px solid #f1f5f9",
          paddingBottom: 14,
        }}
      >
        <Space size="middle">
          <CalculatorOutlined style={{ fontSize: 20, color: "var(--color-primary)" }} />
          <Text strong style={{ fontSize: 16, color: "#1e293b" }}>
            Bảng Tổng Hợp Bán Hàng & Tài Chính Trong Ngày
          </Text>
        </Space>

        <Space wrap>
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

      {/* 1. BẢNG TỔNG KẾT THU CHI */}
      <div style={{ marginBottom: 20 }}>
        <Text strong style={{ display: "block", marginBottom: 8, color: "#0f172a", fontSize: 14 }}>
          📊 1. Tổng kết thu chi tài chính
        </Text>
        <Table
          columns={cashFlowColumns}
          dataSource={summaryData.cashFlowSummary}
          pagination={false}
          size="middle"
          bordered
          scroll={{ x: "max-content" }}
          summary={() => {
            const { netCash, netBank, netCard, netTotal } = summaryData.netTotals;
            return (
              <Table.Summary fixed="top">
                <Table.Summary.Row style={{ background: "#fff7ed", fontWeight: 700 }}>
                  <Table.Summary.Cell index={0} style={{ color: "#ea580c" }}>
                    Tổng tồn / Thực thu
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right" style={{ color: netCash >= 0 ? "#16a34a" : "#dc2626" }}>
                    {formatVND(netCash)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right" style={{ color: netBank >= 0 ? "#16a34a" : "#dc2626" }}>
                    {formatVND(netBank)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right" style={{ color: netCard >= 0 ? "#16a34a" : "#dc2626" }}>
                    {formatVND(netCard)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right" style={{ color: netTotal >= 0 ? "#16a34a" : "#dc2626", fontSize: 14 }}>
                    {formatVND(netTotal)}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </div>

      {/* 2. BẢNG TỔNG KẾT HÓA ĐƠN */}
      <div style={{ marginBottom: 20 }}>
        <Text strong style={{ display: "block", marginBottom: 8, color: "#0f172a", fontSize: 14 }}>
          🧾 2. Tổng kết hóa đơn bán hàng
        </Text>
        <Table
          columns={invoiceColumns}
          dataSource={summaryData.invoiceSummary}
          pagination={false}
          size="middle"
          bordered
          scroll={{ x: "max-content" }}
        />
      </div>

      {/* 3. BẢNG TỔNG SỐ LƯỢNG GIAO DỊCH */}
      <div>
        <Text strong style={{ display: "block", marginBottom: 8, color: "#0f172a", fontSize: 14 }}>
          🔢 3. Tổng số lượng giao dịch
        </Text>
        <Table
          columns={txnColumns}
          dataSource={summaryData.txnSummary}
          pagination={false}
          size="middle"
          bordered
          scroll={{ x: "max-content" }}
        />
      </div>
    </Card>
  );
};

export default SummaryReportCard;
