import React, { useState, useEffect, useCallback } from "react";
import { Breadcrumb, Typography, Skeleton, Empty, Button, message, Modal } from "antd";
import {
  HomeOutlined,
  BarChartOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import ReportFilter from "../components/reports/common/ReportFilter";
import ExportToolbar from "../components/reports/common/ExportToolbar";
import SummaryFooter from "../components/reports/common/SummaryFooter";

import InventoryOverviewCards from "../components/reports/inventory/InventoryOverviewCards";
import InventoryStatusChart from "../components/reports/inventory/InventoryStatusChart";
import ConsumptionVarianceTable from "../components/reports/inventory/ConsumptionVarianceTable";
import TopConsumptionVarianceChart from "../components/reports/inventory/TopConsumptionVarianceChart";
import InventoryDetailTable from "../components/reports/inventory/InventoryDetailTable";
import OperationalAlerts from "../components/reports/inventory/OperationalAlerts";

import { getBInventories, getConsumptionReport, getTransactionLedger } from "../api/binventoryApi";
import { getBranchDashboardStats } from "../api/dashboardApi";
import { getNotifications } from "../api/notificationApi";
import { useBranch } from "../context/BranchContext";
import "../styles/ReportInventoryPage.css";

const { Title, Text } = Typography;

/**
 * Page: InventoryReportPage
 * Báo cáo Nguyên liệu & Tiêu thụ Kho Chuyên sâu — Kết nối dữ liệu thật từ BE
 * Đường dẫn: /reports/inventory
 */
const ReportInventoryPage = () => {
  const { currentBranchId } = useBranch();
  const [loading, setLoading]       = useState(true);
  const [presetTime, setPresetTime]   = useState("today");
  const [dateRange, setDateRange]     = useState([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);

  // Phóng to các bảng riêng biệt bằng Modal (tránh phóng to toàn bộ page trình duyệt)
  const [isConsumptionFullscreen, setIsConsumptionFullscreen] = useState(false);
  const [isDetailFullscreen, setIsDetailFullscreen]           = useState(false);

  // ── Datasets thực tế từ BE ──────────────────────────────────────────────
  const [statsData, setStatsData]               = useState({ totalValue: 0, totalItems: 0, lowStockCount: 0, varianceThresholdPercent: 5 });
  const [statusChartData, setStatusChartData]   = useState([]);
  const [consumptionItems, setConsumptionItems] = useState([]);
  const [topVarianceData, setTopVarianceData]   = useState([]);
  const [detailLedgerItems, setDetailLedgerItems] = useState([]);
  const [alerts, setAlerts]                     = useState([]);
  const [dashRevenue, setDashRevenue]           = useState(0);
  const [dashExpense, setDashExpense]           = useState(0);
  const [dashProfit, setDashProfit]             = useState(0);
  const [dailyStats, setDailyStats]             = useState([]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    const activeBranchId = currentBranchId || 1;
    console.log("[ReportInventoryPage] Fetching data for activeBranchId:", activeBranchId, "currentBranchId:", currentBranchId);
    
    let rawBInventory = [];
    let dashRes = null;
    let unreadNotifications = [];

    // 1. Fetch unread notifications
    try {
      const notifRes = await getNotifications({
        branchId: activeBranchId,
        isRead: false,
        pageSize: 100
      });
      if (notifRes?.data?.items) {
        unreadNotifications = notifRes.data.items;
      } else if (notifRes?.items) {
        unreadNotifications = notifRes.items;
      }
    } catch (err) {
      console.error("[ReportInventoryPage] Error fetching unread notifications:", err);
    }

    try {
      // 2. Fetch danh sách BInventory thực tế độc lập
      rawBInventory = await getBInventories(activeBranchId);
      console.log("[ReportInventoryPage] rawBInventory response success:", rawBInventory);
    } catch (err) {
      console.error("[ReportInventoryPage] BInventory API error:", err);
      message.error("Không thể tải danh sách nguyên liệu kho thực tế.");
    }

    try {
      // 3. Fetch Dashboard Stats của BE độc lập để lấy chi phí & doanh thu
      const [start, end] = dateRange;
      const startStr = start.format("YYYY-MM-DD");
      const endStr   = end.format("YYYY-MM-DD");
      const isToday = start.isSame(dayjs().startOf("day"), "day") && end.isSame(dayjs().endOf("day"), "day");
      const range = isToday ? "today" : (presetTime === "this_month" ? "thisMonth" : "custom");

      dashRes = await getBranchDashboardStats(range, startStr, endStr, activeBranchId);

      if (dashRes?.data) {
        setDashRevenue(dashRes.data.revenue || 0);
        setDashExpense(dashRes.data.expenses || 0);
        setDashProfit(dashRes.data.profit || 0);
        setDailyStats(dashRes.data.dailyStats || []);
      }
    } catch (err) {
      console.error("[ReportInventoryPage] Dashboard Stats API error:", err);
      setDashRevenue(0);
      setDashExpense(0);
      setDashProfit(0);
      setDailyStats([]);
    }

    try {
      if (Array.isArray(rawBInventory)) {
        // --- Tính toán Overview Stats ---
        const totalItems = rawBInventory.length;
        const totalValue = rawBInventory.reduce((acc, item) => acc + (item.quantity || 0) * (item.purchasePrice || 0), 0);
        const lowStockCount = rawBInventory.filter((item) => (item.quantity || 0) <= (item.minStorage || 0)).length;

        setStatsData({
          totalValue,
          totalItems,
          lowStockCount,
          varianceThresholdPercent: 5,
        });

        // --- Gọi API Lấy báo cáo tiêu thụ thực tế ---
        let rawConsumption = [];
        try {
          rawConsumption = await getConsumptionReport(activeBranchId, dateRange[0].toDate(), dateRange[1].toDate());
          console.log("[ReportInventoryPage] rawConsumption response success:", rawConsumption);
        } catch (err) {
          console.error("[ReportInventoryPage] Consumption API error:", err);
          message.error("Không thể tải danh sách tiêu thụ thực tế.");
        }

        // Nếu chưa có nhật ký tiêu thụ theo mốc ngày, chuyển đổi danh sách tồn kho hiện tại để đảm bảo luôn có dữ liệu
        if (!rawConsumption || rawConsumption.length === 0) {
          rawConsumption = (rawBInventory || []).map((bi) => ({
            id: bi.ingredientId || bi.id || bi.code || "-",
            name: bi.ingredientName || bi.productName || bi.name || "Nguyên liệu",
            category: bi.categoryName || bi.category || "Chung",
            unit: bi.unit || bi.unitName || "Đơn vị",
            openingStock: bi.quantity || 0,
            import: 0,
            transferIn: 0,
            transferOut: 0,
            expectedConsumption: 0,
            destruction: 0,
            adjustment: 0,
            closingStock: bi.quantity || 0,
            variance: 0,
            theoreticalStock: bi.quantity || 0,
            variancePercent: 0,
          }));
        }

        setConsumptionItems(rawConsumption);

        // --- Gọi API Lấy nhật ký giao dịch kho chi tiết ---
        let rawLedger = [];
        try {
          rawLedger = await getTransactionLedger(activeBranchId, dateRange[0].toDate(), dateRange[1].toDate());
          console.log("[ReportInventoryPage] rawLedger response success:", rawLedger);
        } catch (err) {
          console.error("[ReportInventoryPage] Ledger API error:", err);
          message.error("Không thể tải nhật ký giao dịch kho.");
        }
        setDetailLedgerItems(rawLedger);

        // --- Tính toán Phân bổ Trạng thái Nguyên liệu Kho (Status Chart Data) ---
        const outOfStock = rawBInventory.filter((item) => (item.quantity || 0) === 0).length;
        const lowStock = rawBInventory.filter((item) => {
          const qty = item.quantity || 0;
          const min = item.minStorage || 0;
          return qty > 0 && qty <= min;
        }).length;
        const normal = Math.max(0, totalItems - lowStock - outOfStock);

        setStatusChartData([
          {
            category: "Chi nhánh",
            normal,
            lowStock,
            outOfStock,
          }
        ]);

        setStatsData({
          totalValue,
          totalItems,
          lowStockCount: lowStock,
          varianceThresholdPercent: 5,
        });

        // --- Lấy top 10 sản phẩm có sai số tiêu hao lớn nhất để vẽ biểu đồ ---
        const sortedTop = [...rawConsumption]
          .filter(item => Math.abs(item.variancePercent) > 5)
          .sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent))
          .slice(0, 10);
        setTopVarianceData(sortedTop);
      }

      // 3. Map Cảnh báo vận hành thực tế (Đồng bộ trực tiếp từ unread notifications)
      const dynamicAlerts = unreadNotifications
        .filter((n) => n.type === "Operational" || n.type === "Inventory")
        .map((n) => ({
          id:             String(n.id),
          severity:       n.priority === "Critical" ? "danger" : (n.priority === "Warning" ? "warning" : "info"),
          title:          n.title,
          timestamp:      dayjs(n.createdAt).format("HH:mm DD/MM/YYYY"),
          message:        n.message,
          actionRequired: n.priority === "Critical" ? "Xử lý ngay" : undefined,
        }));
      
      setAlerts(dynamicAlerts);
    } catch (err) {
      console.error("[ReportInventoryPage] API error:", err);
      message.warning("Không thể kết nối dữ liệu kho từ máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, currentBranchId, presetTime]);

  useEffect(() => {
    fetchReportData();
  }, [currentBranchId, fetchReportData]);

  // Lắng nghe sự kiện notification-updated để làm mới dữ liệu
  useEffect(() => {
    const handleNotifUpdate = () => {
      fetchReportData();
    };
    window.addEventListener('notification-updated', handleNotifUpdate);
    return () => {
      window.removeEventListener('notification-updated', handleNotifUpdate);
    };
  }, [fetchReportData]);

  const handleResetFilters = () => {
    setPresetTime("today");
    setDateRange([dayjs().startOf("day"), dayjs().endOf("day")]);
    message.info("Đã đặt lại thời gian về Hôm nay.");
  };

  const columnDefs = [
    { title: "Mã NL",                       field: "id" },
    { title: "Tên nguyên liệu",              field: "name" },
    { title: "Nhóm",                        field: "category" },
    { title: "Đơn vị",                      field: "unit" },
    { title: "Tồn đầu kỳ",                  field: (r) => `${r.openingStock} ${r.unit}`, align: "right" },
    { title: "Nhập",                        field: (r) => `${r.import} ${r.unit}`, align: "right" },
    { title: "Nhận",                        field: (r) => `${r.transferIn} ${r.unit}`, align: "right" },
    { title: "Gửi",                         field: (r) => `${r.transferOut} ${r.unit}`, align: "right" },
    { title: "Tiêu hao định mức",           field: (r) => `${r.expectedConsumption} ${r.unit}`, align: "right" },
    { title: "Xuất hủy",                    field: (r) => `${(r.destruction || 0)} ${r.unit}`, align: "right" },
    { title: "Tồn cuối",                    field: (r) => `${r.closingStock} ${r.unit}`, align: "right" },
    { title: "Chênh lệch",                  field: (r) => `${r.variance > 0 ? '+' : ''}${r.variance} ${r.unit}`, align: "right" },
    { title: "Tồn lý thuyết",               field: (r) => `${r.theoreticalStock} ${r.unit}`, align: "right" },
    { title: "Sai số (%)",                  field: (r) => `${r.variancePercent > 0 ? '+' : ''}${r.variancePercent}%`, align: "center" },
  ];

  return (
    <div className="report-container">
      {/* ── BREADCRUMB ──────────────────────────────────────────────────────── */}
      <Breadcrumb style={{ marginBottom: 12 }}>
        <Breadcrumb.Item href="/home">
          <HomeOutlined /> Trang chủ
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <BarChartOutlined /> Báo cáo
        </Breadcrumb.Item>
        <Breadcrumb.Item style={{ fontWeight: 600, color: "var(--color-primary)" }}>
          <InboxOutlined /> Báo cáo Nguyên liệu
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* ── HEADER TITLE & EXPORT ───────────────────────────────────────────── */}
      <div className="report-header">
        <div>
          <Title level={3} className="report-title">
            Báo Cáo Nguyên Liệu & Tiêu Thụ Kho
          </Title>
          <Text type="secondary">
            Giám sát tồn kho, hao hụt nguyên liệu khi chế biến, hạn sử dụng & giao dịch kho theo thời gian thực
          </Text>
        </div>

        <ExportToolbar
          reportTitle="Bao_Cao_Nguyen_Lieu"
          columnDefs={columnDefs}
          data={consumptionItems}
          summaryRow={[
            "Tổng cộng", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-",
          ]}
        />
      </div>

      {/* ── REPORT FILTER BAR ───────────────────────────────────────────────── */}
      <ReportFilter
        presetTime={presetTime}
        onPresetChange={setPresetTime}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={fetchReportData}
        onResetFilters={handleResetFilters}
        loading={loading}
      />

      {/* ── LOADING SKELETON OR CONTENT ─────────────────────────────────────── */}
      {loading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : consumptionItems.length === 0 ? (
        <Empty description="Không tìm thấy dữ liệu nguyên liệu nào phù hợp với bộ lọc hiện tại." />
      ) : (
        <>
          {/* SECTION 1: INVENTORY OVERVIEW (KPI CARDS) */}
          <InventoryOverviewCards stats={statsData} />

          {/* SECTION 2: INVENTORY STATUS (HORIZONTAL STACKED BAR CHART) */}
          <InventoryStatusChart data={statusChartData} />

          {/* SECTION 3: CONSUMPTION REPORT (MAIN TABLE) */}
          <ConsumptionVarianceTable
            items={consumptionItems}
            varianceThreshold={statsData.varianceThresholdPercent}
            onRefresh={fetchReportData}
            isFullscreen={isConsumptionFullscreen}
            onToggleFullscreen={() => setIsConsumptionFullscreen(true)}
          />

          {/* SECTION 4: TOP CONSUMPTION VARIANCE (BAR CHART) */}
          <TopConsumptionVarianceChart data={topVarianceData} />

          {/* SECTION 5: INVENTORY DETAIL REPORT (LEDGER TABLE) */}
          <InventoryDetailTable
            items={detailLedgerItems}
            onRefresh={fetchReportData}
            isFullscreen={isDetailFullscreen}
            onToggleFullscreen={() => setIsDetailFullscreen(true)}
          />

          {/* SECTION 7: OPERATIONAL ALERTS (ALERT CARDS) */}
          <OperationalAlerts alerts={alerts} />

          {/* ── SUMMARY FOOTER ───────────────────────────────────────────── */}
          <SummaryFooter
            totalRevenue={dashRevenue}
            totalExpense={dashExpense}
            netProfit={dashProfit}
            avgPerDay={Math.round(dashRevenue / Math.max(1, dateRange[1].diff(dateRange[0], "day") + 1))}
            highestVal={dailyStats.map((d) => d.revenue || 0).length ? Math.max(...dailyStats.map((d) => d.revenue || 0)) : dashRevenue}
            lowestVal={dailyStats.map((d) => d.revenue || 0).length ? Math.min(...dailyStats.map((d) => d.revenue || 0)) : 0}
          />

          {/* --- MODALS PHÓNG TO BẢNG CHI TIẾT --- */}
          {/* 1. Phóng to Bảng tiêu thụ nguyên liệu */}
          <Modal
            title={
              <span className="modal-title-bold">
                🍽️ Báo cáo Tiêu thụ & Biến động Sai số Nguyên liệu
              </span>
            }
            open={isConsumptionFullscreen}
            onCancel={() => setIsConsumptionFullscreen(false)}
            footer={null}
            width="96vw"
            style={{ top: 12 }}
            bodyStyle={{ padding: 16 }}
          >
            <ConsumptionVarianceTable
              items={consumptionItems}
              varianceThreshold={statsData.varianceThresholdPercent}
              onRefresh={fetchReportData}
              isFullscreen={true}
              onToggleFullscreen={() => setIsConsumptionFullscreen(false)}
            />
          </Modal>

          {/* 2. Phóng to Bảng chi tiết nhật ký kho */}
          <Modal
            title={
              <span className="modal-title-bold">
                📦 Chi Tiết Nhật Ký Giao Dịch Kho
              </span>
            }
            open={isDetailFullscreen}
            onCancel={() => setIsDetailFullscreen(false)}
            footer={null}
            width="96vw"
            style={{ top: 12 }}
            bodyStyle={{ padding: 16 }}
          >
            <InventoryDetailTable
              items={detailLedgerItems}
              onRefresh={fetchReportData}
              isFullscreen={true}
              onToggleFullscreen={() => setIsDetailFullscreen(false)}
            />
          </Modal>
        </>
      )}
    </div>
  );
};

export default ReportInventoryPage;
