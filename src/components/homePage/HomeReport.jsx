import React from "react";
import { Tabs, Collapse, Space } from "antd";
import {
  ShoppingOutlined,
  DollarOutlined,
  InboxOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import SalesReportTable from "./SalesReportTable";
import CashFlowReportTable from "./CashFlowReportTable";
import InventoryReportTable from "./InventoryReportTable";
import SummaryReportCard from "./SummaryReportCard";

const { Panel } = Collapse;

/**
 * Component HomeReport - Chế độ xem báo cáo chi tiết với 4 Tabs:
 * 1. Tổng hợp (Card Bảng Tổng hợp 3 khối + Collapse gập mở 3 bảng Bán hàng, Thu chi, Hàng hóa)
 * 2. Bán hàng (Table Bán hàng)
 * 3. Thu chi (Table Thu chi)
 * 4. Hàng hóa (Table Hàng hóa)
 */
const HomeReport = ({ data, onRefresh }) => {
  const { salesList, cashFlowList, inventoryList } = data;

  const tabItems = [
    {
      key: "summary",
      label: (
        <Space>
          <AppstoreOutlined />
          <span>Tổng hợp</span>
        </Space>
      ),
      children: (
        <div>
          {/* Bảng Tổng Hợp 3 Khối (Thu chi, Hóa đơn, Giao dịch) + Nút Xuất/In chung */}
          <SummaryReportCard salesList={salesList} cashFlowList={cashFlowList} />

          {/* Các bảng báo cáo chi tiết */}
          <Collapse
            defaultActiveKey={["1"]}
            bordered={false}
            style={{ background: "transparent" }}
            expandIconPosition="end"
          >
          <Panel
            header={
              <Space style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>
                <ShoppingOutlined style={{ color: "var(--color-primary)" }} />
                <span>Báo cáo Bán hàng trong ngày</span>
              </Space>
            }
            key="1"
            style={{
              marginBottom: 16,
              background: "#ffffff",
              borderRadius: "var(--border-radius)",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
            }}
          >
            <SalesReportTable data={salesList} onRefresh={onRefresh} />
          </Panel>

          <Panel
            header={
              <Space style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>
                <DollarOutlined style={{ color: "#10b981" }} />
                <span>Báo cáo Thu chi tài chính trong ngày</span>
              </Space>
            }
            key="2"
            style={{
              marginBottom: 16,
              background: "#ffffff",
              borderRadius: "var(--border-radius)",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
            }}
          >
            <CashFlowReportTable data={cashFlowList} onRefresh={onRefresh} />
          </Panel>

          <Panel
            header={
              <Space style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>
                <InboxOutlined style={{ color: "#f59e0b" }} />
                <span>Báo cáo Sản phẩm & Hàng hóa bán ra</span>
              </Space>
            }
            key="3"
            style={{
              background: "#ffffff",
              borderRadius: "var(--border-radius)",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
            }}
          >
            <InventoryReportTable data={inventoryList} onRefresh={onRefresh} />
          </Panel>
        </Collapse>
      </div>
      ),
    },
    {
      key: "sales",
      label: (
        <Space>
          <ShoppingOutlined />
          <span>Bán hàng</span>
        </Space>
      ),
      children: <SalesReportTable data={salesList} onRefresh={onRefresh} />,
    },
    {
      key: "cashflow",
      label: (
        <Space>
          <DollarOutlined />
          <span>Thu chi</span>
        </Space>
      ),
      children: <CashFlowReportTable data={cashFlowList} onRefresh={onRefresh} />,
    },
    {
      key: "inventory",
      label: (
        <Space>
          <InboxOutlined />
          <span>Hàng hóa</span>
        </Space>
      ),
      children: <InventoryReportTable data={inventoryList} onRefresh={onRefresh} />,
    },
  ];

  return (
    <div style={{ marginTop: 8 }}>
      <Tabs
        defaultActiveKey="summary"
        items={tabItems}
        type="card"
        size="large"
        tabBarStyle={{ marginBottom: 16, fontWeight: 600 }}
      />
    </div>
  );
};

export default HomeReport;
