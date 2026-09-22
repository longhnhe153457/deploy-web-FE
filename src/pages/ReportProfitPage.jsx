import React, { useState, useEffect, useCallback } from "react";
import {
  Breadcrumb,
  Typography,
  Skeleton,
  Empty,
  Input,
  Button,
  Tooltip,
  Space,
  Modal,
  message,
} from "antd";
import {
  HomeOutlined,
  BarChartOutlined,
  RiseOutlined,
  SearchOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import ReportFilter from "../components/reports/common/ReportFilter";
import ExportToolbar from "../components/reports/common/ExportToolbar";
import SummaryFooter from "../components/reports/common/SummaryFooter";

import ProfitSummaryCards from "../components/reports/profit/ProfitSummaryCards";
import ProfitCharts from "../components/reports/profit/ProfitCharts";
import ProfitReportTable from "../components/reports/profit/ProfitReportTable";
import ProfitCompareModal from "../components/reports/profit/ProfitCompareModal";

import { getCashFlows } from "../api/cashFlowApi";
import { getPaidInvoices } from "../api/orderApi";
import { useBranch } from "../context/BranchContext";
import "../styles/ReportProfitPage.css";

const { Title, Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);

/**
 * Page: ProfitReportPage
 * Báo cáo Lợi nhuận chuyên sâu — kết nối với dữ liệu thật từ Hóa đơn & Sổ quỹ
 * Đường dẫn: /reports/profit
 */
const ReportProfitPage = () => {
  const { currentBranchId } = useBranch();
  const [loading, setLoading]         = useState(true);
  const [presetTime, setPresetTime]   = useState("this_month");
  const [dateRange, setDateRange]     = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [searchText, setSearchText]   = useState("");
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [isFullscreen, setIsFullscreen]               = useState(false);

  // ── Dữ liệu thật từ BE ───────────────────────────────────────────────────
  const [tableData, setTableData]             = useState([]);
  const [trendData, setTrendData]             = useState([]);
  const [waterfallData, setWaterfallData]     = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [totalRevenue, setTotalRevenue]       = useState(0);
  const [totalExpense, setTotalExpense]       = useState(0);
  const [netProfit, setNetProfit]             = useState(0);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [start, end] = dateRange;

      const [invoicesRes, cashFlowsRes] = await Promise.allSettled([
        getPaidInvoices(currentBranchId),
        getCashFlows(currentBranchId)
      ]);

      const allInvoices = invoicesRes.status === "fulfilled" ? (invoicesRes.value?.data || invoicesRes.value || []) : [];
      const allCashFlows = cashFlowsRes.status === "fulfilled" ? (cashFlowsRes.value || []) : [];

      // Filter invoices in date range
      const filteredInvoices = allInvoices.filter((ord) => {
        if (!ord.createdAt) return false;
        const ordDate = dayjs(ord.createdAt);
        return (ordDate.isSame(start, "day") || ordDate.isAfter(start, "day")) &&
               (ordDate.isSame(end, "day") || ordDate.isBefore(end, "day"));
      });

      // Filter cashflows in date range
      const filteredCashFlows = allCashFlows.filter((cf) => {
        const dateVal = cf.businessDate || cf.createdAt;
        if (!dateVal) return false;
        const cfDate = dayjs(dateVal);
        return (cfDate.isSame(start, "day") || cfDate.isAfter(start, "day")) &&
               (cfDate.isSame(end, "day") || cfDate.isBefore(end, "day"));
      });

      // Calculate totals
      const invoiceRev = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const cashflowRev = filteredCashFlows
        .filter(cf => (cf.directionValue === 1 || cf.type === "Thu" || cf.directionValue === "Thu") && !cf.orderId && cf.category !== "Bán hàng")
        .reduce((sum, cf) => sum + (cf.totalAmount || cf.amount || 0), 0);

      // Nếu có hóa đơn thì dùng invoiceRev + thu khác, nếu không có hóa đơn thì fallback toàn bộ cashflow thu
      const rev = filteredInvoices.length > 0 
        ? (invoiceRev + cashflowRev)
        : filteredCashFlows
            .filter(cf => cf.directionValue === 1 || cf.type === "Thu" || cf.directionValue === "Thu")
            .reduce((sum, cf) => sum + (cf.totalAmount || cf.amount || 0), 0);

      const exp = filteredCashFlows
        .filter(cf => cf.directionValue === 2 || cf.type === "Chi" || cf.directionValue === "Chi")
        .reduce((sum, cf) => sum + (cf.totalAmount || cf.amount || 0), 0);

      const prof = rev - exp;

      setTotalRevenue(rev);
      setTotalExpense(exp);
      setNetProfit(prof);

      // Create Daily Chart Map
      const dailyMap = {};
      let cur = dayjs(start);
      while (cur.isBefore(end) || cur.isSame(end, "day")) {
        const key = cur.format("YYYY-MM-DD");
        dailyMap[key] = { date: cur.format("DD/MM"), revenue: 0, expense: 0, profit: 0 };
        cur = cur.add(1, "day");
      }

      if (filteredInvoices.length > 0) {
        filteredInvoices.forEach((inv) => {
          const key = dayjs(inv.createdAt).format("YYYY-MM-DD");
          if (dailyMap[key]) {
            dailyMap[key].revenue += (inv.totalAmount || 0);
          }
        });
      }

      filteredCashFlows.forEach((cf) => {
        const dateVal = cf.businessDate || cf.createdAt;
        const key = dayjs(dateVal).format("YYYY-MM-DD");
        if (dailyMap[key]) {
          const amt = cf.totalAmount || cf.amount || 0;
          if (cf.directionValue === 1 || cf.type === "Thu" || cf.directionValue === "Thu") {
            if (filteredInvoices.length === 0 || (!cf.orderId && cf.category !== "Bán hàng")) {
              dailyMap[key].revenue += amt;
            }
          } else if (cf.directionValue === 2 || cf.type === "Chi" || cf.directionValue === "Chi") {
            dailyMap[key].expense += amt;
          }
        }
      });

      Object.keys(dailyMap).forEach((key) => {
        dailyMap[key].profit = dailyMap[key].revenue - dailyMap[key].expense;
      });

      // Map detailed table analysis (tableData)
      const list = Object.keys(dailyMap).map((key, idx) => {
        const dailyRev = dailyMap[key].revenue;
        const dailyExp = dailyMap[key].expense;
        const dailyProf = dailyRev - dailyExp;
        return {
          id:           `PFT-${idx + 1}`,
          timeLabel:    dayjs(key).format("DD/MM/YYYY"),
          revenue:      dailyRev,
          expense:      dailyExp,
          profit:       dailyProf,
          marginPct:    dailyRev > 0 ? Number(((dailyProf / dailyRev) * 100).toFixed(1)) : 0,
          costRatioPct: dailyRev > 0 ? Number(((dailyExp / dailyRev) * 100).toFixed(1)) : 0,
        };
      });
      setTableData(list);

      // Trend data cho ProfitCharts
      setTrendData(
        list.map((item) => ({
          date:    item.timeLabel.substring(0, 5), // show DD/MM
          revenue: item.revenue,
          expense: item.expense,
          profit:  item.profit,
        }))
      );

      // Waterfall data cho cơ cấu lợi nhuận
      const costCategories = {};
      filteredCashFlows
        .filter((cf) => cf.directionValue === 2 || cf.type === "Chi" || cf.directionValue === "Chi")
        .forEach((cf) => {
          const catName = cf.category || "Chi phí khác";
          costCategories[catName] = (costCategories[catName] || 0) + (cf.totalAmount || cf.amount || 0);
        });

      const waterfall = [
        { name: "Tổng Doanh Thu", amount: rev, isTotal: true },
        ...Object.keys(costCategories).map((cat) => ({
          name:   cat,
          amount: -costCategories[cat],
          isCost: true,
        })),
        { name: "Lợi Nhuận Ròng", amount: prof, isProfit: true },
      ];
      setWaterfallData(waterfall);

      // Phân bổ khoảng lợi nhuận
      const ranges = [
        { range: "< 0 ₫",      min: -Infinity, max: 0,         count: 0 },
        { range: "0 - 10M",    min: 0,         max: 10000000,  count: 0 },
        { range: "10M - 20M",  min: 10000000,  max: 20000000,  count: 0 },
        { range: "20M - 50M",  min: 20000000,  max: 50000000,  count: 0 },
        { range: "> 50M",     min: 50000000,  max: Infinity,  count: 0 },
      ];
      list.forEach((item) => {
        const profVal = item.profit;
        const match = ranges.find((r) => profVal >= r.min && profVal < r.max);
        if (match) match.count += 1;
      });
      setDistributionData(ranges.filter((r) => r.count > 0));

    } catch (err) {
      console.error("[ReportProfitPage] API error:", err);
      message.warning("Không thể tải dữ liệu lợi nhuận. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, presetTime, currentBranchId]);

  useEffect(() => {
    fetchReportData();
  }, [currentBranchId, fetchReportData]);

  const handlePresetChange = (val) => {
    setPresetTime(val);
  };

  const handleResetFilters = () => {
    setPresetTime("this_month");
    setDateRange([dayjs().startOf("month"), dayjs().endOf("month")]);
    setSearchText("");
  };

  // Client-side filtering
  const filteredData = tableData.filter((item) => {
    return !searchText || item.timeLabel.toLowerCase().includes(searchText.toLowerCase());
  });

  const dailyList = tableData;
  const revenueValues = dailyList.map((d) => d.revenue || 0);
  const highestVal = revenueValues.length ? Math.max(...revenueValues) : totalRevenue;
  const lowestVal  = revenueValues.length ? Math.min(...revenueValues) : 0;

  const daysInRange = Math.max(1, dateRange[1].diff(dateRange[0], "day") + 1);
  const avgPerDay   = Math.round(totalRevenue / daysInRange);

  // Điểm hòa vốn ước tính
  const breakEvenTarget = 40000000; // mục tiêu điểm hòa vốn giả định
  const breakEvenPercent =
    breakEvenTarget > 0 ? Number(((totalRevenue / breakEvenTarget) * 100).toFixed(1)) : 0;

  const columnDefs = [
    { title: "Mốc Thời Gian", field: "timeLabel" },
    { title: "Doanh Thu", field: (r) => formatVND(r.revenue), align: "right" },
    { title: "Chi Phí",   field: (r) => `-${formatVND(r.expense)}`, align: "right" },
    { title: "Lợi Nhuận Ròng", field: (r) => `+${formatVND(r.profit)}`, align: "right" },
    { title: "Tỷ Suất Lợi Nhuận", field: (r) => `${r.marginPct}%`, align: "right" },
    { title: "Tỷ Lệ Chi Phí", field: (r) => `${r.costRatioPct}%`, align: "right" },
  ];

  return (
    <div className="profit-container">
      {/* ── BREADCRUMB ──────────────────────────────────────────────────────── */}
      <Breadcrumb style={{ marginBottom: 12 }}>
        <Breadcrumb.Item href="/home">
          <HomeOutlined /> Trang chủ
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <BarChartOutlined /> Báo cáo
        </Breadcrumb.Item>
        <Breadcrumb.Item style={{ fontWeight: 600, color: "#10b981" }}>
          <RiseOutlined /> Báo cáo Lợi nhuận
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* ── HEADER TITLE & EXPORT ───────────────────────────────────────────── */}
      <div className="profit-header">
        <div>
          <Title level={3} className="profit-title">
            Báo Cáo Lợi Nhuận & Hiệu Quả Kinh Doanh
          </Title>
          <Text type="secondary">
            Phân tích tỷ suất lợi nhuận ròng, điểm hòa vốn và biến động tài chính theo chu kỳ thời gian
          </Text>
        </div>

        <ExportToolbar
          reportTitle="Bao_Cao_Loi_Nhuan"
          columnDefs={columnDefs}
          data={filteredData}
          summaryRow={[
            "Tổng cộng",
            formatVND(totalRevenue),
            `-${formatVND(totalExpense)}`,
            `+${formatVND(netProfit)}`,
            `${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%`,
            `${totalRevenue > 0 ? ((totalExpense / totalRevenue) * 100).toFixed(1) : 0}%`,
          ]}
        />
      </div>

      {/* ── REPORT FILTER BAR ───────────────────────────────────────────────── */}
      <ReportFilter
        presetTime={presetTime}
        onPresetChange={handlePresetChange}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={fetchReportData}
        onResetFilters={handleResetFilters}
        loading={loading}
      />

      {/* ── LOADING SKELETON OR CONTENT ─────────────────────────────────────── */}
      {loading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <>
          {/* 1. Summary KPI Cards */}
          <ProfitSummaryCards
            data={{
              profit:       netProfit,
              profitMargin: totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0,
              costRatio:    totalRevenue > 0 ? Number(((totalExpense / totalRevenue) * 100).toFixed(1)) : 0,
              breakEvenPct: breakEvenPercent,
              growthPct:    0,
            }}
            onOpenCompare={() => setCompareModalVisible(true)}
          />

          {/* 2. Profit Charts */}
          <ProfitCharts
            trendData={trendData}
            waterfallData={waterfallData}
            distributionData={distributionData}
            breakEvenInfo={{
              target:  breakEvenTarget,
              current: totalRevenue,
              percent: breakEvenPercent,
            }}
          />

          {/* 3. Profit Report Table */}
          <div className="table-section">
            <div className="table-header">
              <Title level={5} className="table-title">
                Bảng Phân Tích Lợi Nhuận Theo Mốc Thời Gian ({filteredData.length} dòng)
              </Title>

              <Space wrap size="small">
                <Input
                  placeholder="Tìm mốc thời gian..."
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 220, borderRadius: 6 }}
                  allowClear
                />

                <Tooltip title="Làm mới dữ liệu lợi nhuận">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchReportData}
                    style={{ borderRadius: 6 }}
                  />
                </Tooltip>

                <Tooltip title="Xóa bộ lọc tìm kiếm">
                  <Button onClick={handleResetFilters} style={{ borderRadius: 6 }}>
                    Đặt lại
                  </Button>
                </Tooltip>

                <ExportToolbar
                  reportTitle="Bao_Cao_Phan_Tich_Loi_Nhuan"
                  columnDefs={columnDefs}
                  data={filteredData}
                  summaryRow={[
                    "Tổng cộng",
                    formatVND(totalRevenue),
                    `-${formatVND(totalExpense)}`,
                    `+${formatVND(netProfit)}`,
                    `${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%`,
                    `${totalRevenue > 0 ? ((totalExpense / totalRevenue) * 100).toFixed(1) : 0}%`,
                  ]}
                />

                <Tooltip title="Phóng to toàn màn hình">
                  <Button
                    icon={<FullscreenOutlined />}
                    onClick={() => setIsFullscreen(true)}
                    style={{ borderRadius: 6 }}
                  />
                </Tooltip>
              </Space>
            </div>

            {filteredData.length === 0 ? (
              <Empty description="Không có dữ liệu lợi nhuận nào trong kỳ được chọn" />
            ) : (
              <ProfitReportTable
                data={filteredData}
                loading={loading}
                presetTime={presetTime}
              />
            )}
          </div>

          {/* Fullscreen Modal */}
          <Modal
            title={
              <div className="modal-header">
                <span className="modal-title-bold">
                  Bảng Phân Tích Lợi Nhuận Theo Mốc Thời Gian ({filteredData.length} dòng)
                </span>
                <Button
                  icon={<FullscreenExitOutlined />}
                  onClick={() => setIsFullscreen(false)}
                  className="modal-close-btn"
                >
                  Thu nhỏ
                </Button>
              </div>
            }
            open={isFullscreen}
            onCancel={() => setIsFullscreen(false)}
            footer={null}
            width="96vw"
            style={{ top: 12 }}
            bodyStyle={{ padding: 16 }}
          >
            <ProfitReportTable
              data={filteredData}
              loading={loading}
              presetTime={presetTime}
            />
          </Modal>

          {/* 4. Footer ERP Summary */}
          <SummaryFooter
            totalRevenue={totalRevenue}
            totalExpense={totalExpense}
            netProfit={netProfit}
            avgPerDay={avgPerDay}
            highestVal={highestVal}
            lowestVal={lowestVal}
            variance={0}
          />
        </>
      )}

      {/* So Sánh Modal */}
      <ProfitCompareModal
        visible={compareModalVisible}
        onClose={() => setCompareModalVisible(false)}
      />
    </div>
  );
};

export default ReportProfitPage;
