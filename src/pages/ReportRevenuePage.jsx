import React, { useState, useEffect, useCallback } from "react";
import {
  Breadcrumb,
  Typography,
  Skeleton,
  Empty,
  Select,
  Col,
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
  ShoppingOutlined,
  SearchOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import ReportFilter from "../components/reports/common/ReportFilter";
import ExportToolbar from "../components/reports/common/ExportToolbar";
import SummaryFooter from "../components/reports/common/SummaryFooter";

import RevenueSummaryCards from "../components/reports/revenue/RevenueSummaryCards";
import RevenueCharts from "../components/reports/revenue/RevenueCharts";
import RevenueReportTable from "../components/reports/revenue/RevenueReportTable";
import BillDetailDrawer from "../components/reports/revenue/BillDetailDrawer";
import RevenueCompareModal from "../components/reports/revenue/RevenueCompareModal";

import { getBranchDashboardStats } from "../api/dashboardApi";
import { getPaidInvoices } from "../api/orderApi";
import { getCashFlows } from "../api/cashFlowApi";
import { useBranch } from "../context/BranchContext";
import "../styles/ReportRevenuePage.css";

const { Title, Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);

/**
 * Page: ReportRevenuePage
 * Báo cáo Doanh thu — kết nối với BE qua GET /api/Order/invoices và /api/CashFlow
 * Đường dẫn: /reports/revenue
 */
const ReportRevenuePage = () => {
  const { currentBranchId } = useBranch();
  const [loading, setLoading]         = useState(true);
  const [presetTime, setPresetTime]   = useState("this_month");
  const [dateRange, setDateRange]     = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [searchText, setSearchText]           = useState("");
  const [selectedMethod, setSelectedMethod]   = useState("all");
  const [isFullscreen, setIsFullscreen]       = useState(false);
  const [selectedBill, setSelectedBill]       = useState(null);
  const [drawerVisible, setDrawerVisible]     = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);

  // ── Raw data từ BE ──────────────────────────────────────────────────────
  const [allBills, setAllBills]         = useState([]);   // toàn bộ bills từ BE
  const [trendData, setTrendData]       = useState([]);   // dailyStats
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders]   = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [avgPerDay, setAvgPerDay]       = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  // ── Fetch từ BE ─────────────────────────────────────────────────────────
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [start, end] = dateRange;
      const startStr = start.format("YYYY-MM-DD");
      const endStr   = end.format("YYYY-MM-DD");

      const today = dayjs().startOf("day");
      const isToday = start.isSame(today, "day") && end.isSame(today, "day");

      const presetToRange = {
        today:       "today",
        yesterday:   "yesterday",
        this_week:   "custom",
        last_week:   "custom",
        this_month:  "thisMonth",
        last_month:  "lastMonth",
        this_year:   "custom",
        custom:      "custom",
      };
      let range = isToday ? "today" : (presetToRange[presetTime] || "custom");

      const [invoicesRes, cashFlowsRes] = await Promise.allSettled([
        getPaidInvoices(currentBranchId),
        getCashFlows(currentBranchId)
      ]);

      const allInvoices = invoicesRes.status === "fulfilled" ? (invoicesRes.value?.data || invoicesRes.value || []) : [];
      const allCashFlows = cashFlowsRes.status === "fulfilled" ? (cashFlowsRes.value || []) : [];

      // Filter lists by selected date range
      const filteredInvoices = allInvoices.filter((ord) => {
        if (!ord.createdAt) return false;
        const ordDate = dayjs(ord.createdAt);
        return (ordDate.isSame(start, "day") || ordDate.isAfter(start, "day")) &&
               (ordDate.isSame(end, "day") || ordDate.isBefore(end, "day"));
      });

      const filteredCashFlows = allCashFlows.filter((cf) => {
        const dateVal = cf.businessDate || cf.createdAt;
        if (!dateVal) return false;
        const cfDate = dayjs(dateVal);
        return (cfDate.isSame(start, "day") || cfDate.isAfter(start, "day")) &&
               (cfDate.isSame(end, "day") || cfDate.isBefore(end, "day"));
      });

      // Calculate totals
      const rev = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const ords = filteredInvoices.length;
      const aov = ords > 0 ? Math.round(rev / ords) : 0;
      const daysInRange = Math.max(1, end.diff(start, "day") + 1);
      const avgD = Math.round(rev / daysInRange);
      const exp = filteredCashFlows
        .filter(cf => cf.directionValue === 2 || cf.type === "Chi" || cf.directionValue === "Chi")
        .reduce((sum, cf) => sum + (cf.totalAmount || cf.amount || 0), 0);

      setTotalRevenue(rev);
      setTotalOrders(ords);
      setAvgOrderValue(aov);
      setAvgPerDay(avgD);
      setTotalExpense(exp);

      // Map bills
      const bills = filteredInvoices.map((inv) => ({
        id:            String(inv.id),
        billCode:      inv.code || `HD${inv.id}`,
        date:          inv.createdAt ? dayjs(inv.createdAt).format("DD/MM/YYYY") : "—",
        time:          inv.createdAt ? dayjs(inv.createdAt).format("HH:mm") : "00:00",
        customer:      inv.customerName || (inv.customerId ? `Khách hàng #${inv.customerId}` : "Khách lẻ"),
        tableName:     inv.tableName || (inv.tableId ? `Bàn #${inv.tableId}` : 'Mang về'),
        cashier:       inv.createdByName || 'Thu ngân',
        paymentMethod: inv.paymentMethod || 'Tiền mặt',
        dishTotal:     (inv.totalAmount || 0) + (inv.discountAmount || 0),
        surcharge:     0,
        discount:      inv.discountAmount || 0,
        vat:           0,
        total:         inv.totalAmount || 0,
        status:        inv.status || 'Completed',
        _raw:          inv,
      }));
      setAllBills(bills);

      // Create Daily Chart Map
      const dailyMap = {};
      let cur = dayjs(start);
      while (cur.isBefore(end) || cur.isSame(end, "day")) {
        const key = cur.format("YYYY-MM-DD");
        dailyMap[key] = { date: cur.format("DD/MM"), revenue: 0, expense: 0, profit: 0 };
        cur = cur.add(1, "day");
      }

      filteredInvoices.forEach((inv) => {
        const key = dayjs(inv.createdAt).format("YYYY-MM-DD");
        if (dailyMap[key]) {
          dailyMap[key].revenue += (inv.totalAmount || 0);
        }
      });

      filteredCashFlows.forEach((cf) => {
        const dateVal = cf.businessDate || cf.createdAt;
        const key = dayjs(dateVal).format("YYYY-MM-DD");
        if (dailyMap[key]) {
          const amt = cf.totalAmount || cf.amount || 0;
          if (cf.directionValue === 2 || cf.type === "Chi") {
            dailyMap[key].expense += amt;
          }
        }
      });

      Object.keys(dailyMap).forEach((key) => {
        dailyMap[key].profit = dailyMap[key].revenue - dailyMap[key].expense;
      });

      setTrendData(Object.values(dailyMap));

      // Pie chart payment breakdown
      const methodMap = {};
      filteredInvoices.forEach((inv) => {
        const method = inv.paymentMethod || "Tiền mặt";
        methodMap[method] = (methodMap[method] || 0) + (inv.totalAmount || 0);
      });
      setPaymentMethodData(
        Object.keys(methodMap).map((key) => ({
          name: key,
          value: methodMap[key],
        }))
      );

    } catch (err) {
      console.error("[ReportRevenuePage] API error:", err);
      message.warning("Không thể tải dữ liệu doanh thu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, presetTime, currentBranchId]);

  useEffect(() => {
    fetchReportData();
  }, [currentBranchId, fetchReportData]);

  // ── Khi preset thay đổi → ReportFilter tự cập nhật dateRange
  const handlePresetChange = (val) => {
    setPresetTime(val);
  };

  const handleResetFilters = () => {
    setPresetTime("this_month");
    setDateRange([dayjs().startOf("month"), dayjs().endOf("month")]);
    setSearchText("");
    setSelectedMethod("all");
  };

  // ── Client-side filter trên bảng ─────────────────────────────────────────
  const filteredData = allBills.filter((item) => {
    const matchSearch =
      !searchText ||
      item.billCode.toLowerCase().includes(searchText.toLowerCase()) ||
      item.customer.toLowerCase().includes(searchText.toLowerCase()) ||
      item.cashier.toLowerCase().includes(searchText.toLowerCase());

    const matchMethod =
      selectedMethod === "all" || item.paymentMethod === selectedMethod;

    return matchSearch && matchMethod;
  });

  const profit = totalRevenue - totalExpense;
  const dailyList = trendData;
  const revenueValues = dailyList.map((d) => d.revenue || 0);
  const highestVal = revenueValues.length ? Math.max(...revenueValues) : totalRevenue;
  const lowestVal  = revenueValues.length ? Math.min(...revenueValues) : 0;

  // Danh sách PTTT từ BE (dùng cho dropdown filter)
  const methodOptions = [
    { label: "Tất cả phương thức", value: "all" },
    ...paymentMethodData.map((m) => ({ label: m.name, value: m.name })),
  ];

  const columnDefs = [
    { title: "Mã Bill",    field: "billCode" },
    { title: "Ngày",       field: "date" },
    { title: "Thời gian",  field: "time" },
    { title: "Khách hàng", field: "customer" },
    { title: "Thu ngân",   field: "cashier" },
    { title: "Thanh toán", field: "paymentMethod" },
    { title: "Tiền món",   field: (r) => formatVND(r.dishTotal), align: "right" },
    { title: "Phụ thu",    field: (r) => formatVND(r.surcharge), align: "right" },
    { title: "Giảm giá",   field: (r) => formatVND(r.discount),  align: "right" },
    { title: "VAT",        field: (r) => formatVND(r.vat),       align: "right" },
    { title: "Tổng tiền",  field: (r) => formatVND(r.total),     align: "right" },
  ];

  return (
    <div className="revenue-container">
      {/* ── BREADCRUMB ──────────────────────────────────────────────────────── */}
      <Breadcrumb style={{ marginBottom: 12 }}>
        <Breadcrumb.Item href="/home">
          <HomeOutlined /> Trang chủ
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <BarChartOutlined /> Báo cáo
        </Breadcrumb.Item>
        <Breadcrumb.Item style={{ fontWeight: 600, color: "var(--color-primary)" }}>
          <ShoppingOutlined /> Báo cáo Doanh thu
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* ── HEADER TITLE & EXPORT ───────────────────────────────────────────── */}
      <div className="revenue-header">
        <div>
          <Title level={3} className="revenue-title">
            Báo Cáo Doanh Thu Bán Hàng
          </Title>
          <Text type="secondary">
            Tra cứu, phân tích doanh thu chi tiết theo từng hóa đơn và phương thức thanh toán
          </Text>
        </div>

        <ExportToolbar
          reportTitle="Bao_Cao_Doanh_Thu"
          columnDefs={columnDefs}
          data={filteredData}
          summaryRow={[
            "Tổng cộng", "-", "-", "-", "-", "-", "-", "-", "-", "-",
            formatVND(totalRevenue),
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
          <RevenueSummaryCards
            data={{
              totalRevenue,
              totalOrders,
              avgOrderValue,
              avgRevenuePerDay: avgPerDay,
              growthPct: 0,   // BE chưa có so sánh kỳ trước
            }}
            onOpenCompare={() => setCompareModalVisible(true)}
          />

          {/* 2. Revenue Charts */}
          <RevenueCharts
            trendData={trendData}
          />

          {/* 3. Bills Table */}
          <div className="table-section">
            <div className="table-header">
              <Title level={5} className="table-title">
                Nhật Ký Hóa Đơn Doanh Thu Bán Hàng Chi Tiết ({filteredData.length} hóa đơn)
              </Title>

              <Space wrap size="small">
                <Input
                  placeholder="Tìm kiếm mã bill, khách hàng, thu ngân..."
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 240, borderRadius: 6 }}
                  allowClear
                />

                <Select
                  value={selectedMethod}
                  onChange={setSelectedMethod}
                  style={{ width: 180 }}
                  options={methodOptions}
                />

                <Tooltip title="Làm mới dữ liệu từ máy chủ">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchReportData}
                    style={{ borderRadius: 6 }}
                  />
                </Tooltip>

                <Tooltip title="Xóa tất cả bộ lọc">
                  <Button onClick={handleResetFilters} style={{ borderRadius: 6 }}>
                    Đặt lại
                  </Button>
                </Tooltip>

                <ExportToolbar
                  reportTitle="Bao_Cao_Doanh_Thu_Chi_Tiet"
                  columnDefs={columnDefs}
                  data={filteredData}
                  summaryRow={[
                    "Tổng cộng", "-", "-", "-", "-", "-", "-", "-", "-", "-",
                    formatVND(totalRevenue),
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
              <Empty description="Không có hóa đơn nào đã thanh toán trong kỳ được chọn" />
            ) : (
              <RevenueReportTable
                data={filteredData}
                loading={loading}
                onSelectBill={(bill) => {
                  setSelectedBill(bill);
                  setDrawerVisible(true);
                }}
              />
            )}
          </div>

          {/* Fullscreen Modal */}
          <Modal
            title={
              <div className="modal-header">
                <span className="modal-title-bold">
                  Nhật Ký Hóa Đơn Doanh Thu ({filteredData.length} hóa đơn)
                </span>
                <Button
                  icon={<FullscreenExitOutlined />}
                  onClick={() => setIsFullscreen(false)}
                  className="revenue-btn"
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
            <RevenueReportTable
              data={filteredData}
              loading={loading}
              onSelectBill={(bill) => {
                setSelectedBill(bill);
                setDrawerVisible(true);
              }}
            />
          </Modal>

          {/* 4. Footer ERP Summary */}
          <SummaryFooter
            totalRevenue={totalRevenue}
            totalExpense={totalExpense}
            netProfit={profit}
            avgPerDay={avgPerDay}
            highestVal={highestVal}
            lowestVal={lowestVal}
            variance={0}
          />
        </>
      )}

      {/* Bill Detail Drawer */}
      <BillDetailDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        billData={selectedBill}
      />

      {/* So Sánh Modal */}
      <RevenueCompareModal
        visible={compareModalVisible}
        onClose={() => setCompareModalVisible(false)}
      />
    </div>
  );
};

export default ReportRevenuePage;
