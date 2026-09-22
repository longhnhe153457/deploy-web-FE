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
  DollarOutlined,
  SearchOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import ReportFilter from "../components/reports/common/ReportFilter";
import ExportToolbar from "../components/reports/common/ExportToolbar";
import SummaryFooter from "../components/reports/common/SummaryFooter";

import ExpenseSummaryCards from "../components/reports/expense/ExpenseSummaryCards";
import ExpenseCharts from "../components/reports/expense/ExpenseCharts";
import ExpenseReportTable from "../components/reports/expense/ExpenseReportTable";
import ExpenseDetailDrawer from "../components/reports/expense/ExpenseDetailDrawer";
import ExpenseCompareModal from "../components/reports/expense/ExpenseCompareModal";

import { getCashFlows } from "../api/cashFlowApi";
import { getPaidInvoices } from "../api/orderApi";
import { useBranch } from "../context/BranchContext";

const { Title, Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0
  );

/**
 * Page: ReportExpensePage
 * Báo cáo Chi phí chuyên sâu — kết nối với dữ liệu thật của BE từ Sổ quỹ /api/CashFlow
 * Đường dẫn: /reports/expense
 */
const ReportExpensePage = () => {
  const { currentBranchId } = useBranch();
  const [loading, setLoading]         = useState(true);
  const [presetTime, setPresetTime]   = useState("this_month");
  const [dateRange, setDateRange]     = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [searchText, setSearchText]           = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedCreatedBy, setSelectedCreatedBy] = useState("all");

  const [selectedExpense, setSelectedExpense] = useState(null);
  const [drawerVisible, setDrawerVisible]     = useState(false);
  const [isFullscreen, setIsFullscreen]       = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);

  // ── Dữ liệu thật từ BE ───────────────────────────────────────────────────
  const [allExpenses, setAllExpenses]   = useState([]);
  const [trendData, setTrendData]       = useState([]);
  const [breakdownData, setBreakdownData] = useState([]);
  const [topExpenseData, setTopExpenseData] = useState([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [avgExpense, setAvgExpense]     = useState(0);
  const [avgPerDay, setAvgPerDay]       = useState(0);
  const [highestVal, setHighestVal]     = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [start, end] = dateRange;
      const startStr = start.format("YYYY-MM-DD");
      const endStr   = end.format("YYYY-MM-DD");

      const [invoicesRes, cashFlowsRes] = await Promise.allSettled([
        getPaidInvoices(currentBranchId),
        getCashFlows(currentBranchId)
      ]);

      const allInvoices = invoicesRes.status === "fulfilled" ? (invoicesRes.value?.data || invoicesRes.value || []) : [];
      const allCashFlows = cashFlowsRes.status === "fulfilled" ? (cashFlowsRes.value || []) : [];

      // Filter Chi cashflows in date range
      const filteredCashFlows = allCashFlows.filter((cf) => {
        const dateVal = cf.businessDate || cf.createdAt;
        if (!dateVal) return false;
        const cfDate = dayjs(dateVal);
        const matchesDate = (cfDate.isSame(start, "day") || cfDate.isAfter(start, "day")) &&
                            (cfDate.isSame(end, "day") || cfDate.isBefore(end, "day"));
        const isExpense = cf.directionValue === 2 || cf.type === "Chi" || cf.directionValue === "Chi";
        return matchesDate && isExpense;
      });

      // Filter invoices in date range
      const filteredInvoices = allInvoices.filter((ord) => {
        if (!ord.createdAt) return false;
        const ordDate = dayjs(ord.createdAt);
        return (ordDate.isSame(start, "day") || ordDate.isAfter(start, "day")) &&
               (ordDate.isSame(end, "day") || ordDate.isBefore(end, "day"));
      });

      // Map expenses
      const expenses = filteredCashFlows.map((cf, idx) => {
        const dateVal = cf.businessDate || cf.createdAt;
        return {
          id:          String(cf.id),
          expenseCode: cf.code || `PC${String(cf.id).padStart(6, "0")}`,
          date:        dateVal ? dayjs(dateVal).format("DD/MM/YYYY") : "—",
          time:        dateVal ? dayjs(dateVal).format("HH:mm") : "00:00",
          category:    cf.category || "Chi phí khác",
          supplier:    cf.partnerName || "Khác",
          createdBy:   cf.createdByName || "Thu ngân",
          amount:      cf.totalAmount || cf.amount || 0,
          notes:       cf.note || `Phiếu chi tiền ${cf.category ? cf.category.toLowerCase() : "hoạt động"} ghi nhận từ sổ quỹ.`,
          status:      cf.status || "Completed",
        };
      });
      setAllExpenses(expenses);

      // Calculations
      const totalExp = expenses.reduce((sum, item) => sum + item.amount, 0);
      const avgExp = expenses.length > 0 ? Math.round(totalExp / expenses.length) : 0;
      const daysInRange = Math.max(1, end.diff(start, "day") + 1);
      const avgD = Math.round(totalExp / daysInRange);
      const maxExp = expenses.length > 0 ? Math.max(...expenses.map(e => e.amount)) : 0;
      const rev = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      setTotalExpense(totalExp);
      setAvgExpense(avgExp);
      setAvgPerDay(avgD);
      setHighestVal(maxExp);
      setTotalRevenue(rev);

      // Map breakdown data (Pie Chart: Theo nhóm danh mục)
      const categoriesMap = {};
      expenses.forEach((item) => {
        categoriesMap[item.category] = (categoriesMap[item.category] || 0) + item.amount;
      });
      const breakdown = Object.keys(categoriesMap).map((catName) => ({
        name:  catName,
        value: categoriesMap[catName],
      }));
      setBreakdownData(breakdown);

      // Map top expenses
      const sorted = [...expenses]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map((item) => ({
          name: item.notes || item.category,
          amount: item.amount,
        }));
      setTopExpenseData(sorted);

      // Map trend data: group expenses by date
      const dailyMap = {};
      let cur = dayjs(start);
      while (cur.isBefore(end) || cur.isSame(end, "day")) {
        const key = cur.format("YYYY-MM-DD");
        dailyMap[key] = { date: cur.format("DD/MM"), expense: 0 };
        cur = cur.add(1, "day");
      }

      expenses.forEach((item) => {
        const key = dayjs(item.date, "DD/MM/YYYY").format("YYYY-MM-DD");
        if (dailyMap[key]) {
          dailyMap[key].expense += item.amount;
        }
      });
      setTrendData(Object.values(dailyMap));

    } catch (err) {
      console.error("[ReportExpensePage] API error:", err);
      message.warning("Không thể tải dữ liệu chi phí. Vui lòng thử lại.");
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
    setSelectedSupplier("all");
    setSelectedCreatedBy("all");
  };

  // ── Client-side filtering ───────────────────────────────────────────────
  const filteredData = allExpenses.filter((item) => {
    const matchSearch =
      !searchText ||
      item.expenseCode.toLowerCase().includes(searchText.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchText.toLowerCase());

    const matchSupplier = selectedSupplier === "all" || item.supplier === selectedSupplier;
    const matchCreatedBy = selectedCreatedBy === "all" || item.createdBy === selectedCreatedBy;

    return matchSearch && matchSupplier && matchCreatedBy;
  });

  const lowestVal = 0;

  const columnDefs = [
    { title: "Mã Phiếu Chi", field: "expenseCode" },
    { title: "Ngày",         field: "date" },
    { title: "Giờ",         field: "time" },
    { title: "Nhà Cung Cấp", field: "supplier" },
    { title: "Người Tạo",    field: "createdBy" },
    { title: "Giá Trị Chi",  field: (r) => `-${formatVND(r.amount)}`, align: "right" },
    { title: "Ghi chú",      field: "notes" },
  ];

  return (
    <div style={{ padding: "16px 24px", minHeight: "100vh", background: "#f8fafc" }}>
      {/* ── BREADCRUMB ──────────────────────────────────────────────────────── */}
      <Breadcrumb style={{ marginBottom: 12 }}>
        <Breadcrumb.Item href="/home">
          <HomeOutlined /> Trang chủ
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <BarChartOutlined /> Báo cáo
        </Breadcrumb.Item>
        <Breadcrumb.Item style={{ fontWeight: 600, color: "#ef4444" }}>
          <DollarOutlined /> Báo cáo Chi phí
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* ── HEADER TITLE & EXPORT ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
            Báo Cáo Chi Phí Vận Hành & Đầu Vào
          </Title>
          <Text type="secondary">
            Theo dõi, phân tích toàn bộ các khoản chi mua hàng, lương thưởng, mặt bằng & điện nước
          </Text>
        </div>

        <ExportToolbar
          reportTitle="Bao_Cao_Chi_Phi"
          columnDefs={columnDefs}
          data={filteredData}
          summaryRow={[
            "Tổng cộng", "-", "-", "-", "-", `-${formatVND(totalExpense)}`, "-",
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
          <ExpenseSummaryCards
            data={{
              totalExpense,
              avgExpense,
              avgExpensePerDay: avgPerDay,
              growthPct: 0,
              largestExpense: highestVal,
            }}
            onOpenCompare={() => setCompareModalVisible(true)}
          />

          {/* 2. Expense Charts */}
          <ExpenseCharts
            trendData={trendData}
            topExpenseData={topExpenseData}
          />

          {/* 3. Expense Report Table */}
          <div
            style={{
              background: "#ffffff",
              padding: 18,
              borderRadius: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            {/* Tiêu đề + Toolbar trên cùng 1 hàng */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 16,
                gap: 12,
              }}
            >
              <Title level={5} style={{ margin: 0, fontWeight: 700 }}>
                Danh Sách Chứng Từ & Phiếu Chi Chi Tiết ({filteredData.length} chứng từ)
              </Title>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Input
                  placeholder="Tìm mã phiếu chi, nhà cung cấp, ghi chú..."
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 260, borderRadius: 6 }}
                  allowClear
                />

                <Tooltip title="Làm mới dữ liệu phiếu chi">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchReportData}
                    style={{ borderRadius: 6 }}
                  />
                </Tooltip>

                <Tooltip title="Xóa tất cả bộ lọc phiếu chi">
                  <Button onClick={handleResetFilters} style={{ borderRadius: 6 }}>
                    Đặt lại
                  </Button>
                </Tooltip>

                <ExportToolbar
                  reportTitle="Bao_Cao_Chi_Phi_Chi_Tiet"
                  columnDefs={columnDefs}
                  data={filteredData}
                  summaryRow={[
                    "Tổng cộng", "-", "-", "-", "-", `-${formatVND(totalExpense)}`, "-",
                  ]}
                />

                <Tooltip title="Phóng to toàn màn hình">
                  <Button
                    icon={<FullscreenOutlined />}
                    onClick={() => setIsFullscreen(true)}
                    style={{ borderRadius: 6 }}
                  />
                </Tooltip>
              </div>
            </div>

            {filteredData.length === 0 ? (
              <Empty description="Không có khoản chi phí nào ghi nhận trong kỳ được chọn" />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <ExpenseReportTable
                  data={filteredData}
                  loading={loading}
                  onSelectExpense={(exp) => {
                    setSelectedExpense(exp);
                    setDrawerVisible(true);
                  }}
                />
              </div>
            )}
          </div>

          {/* Fullscreen Modal */}
          <Modal
            title={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingRight: 24,
                }}
              >
                <span style={{ fontWeight: 800, fontSize: 16 }}>
                  Danh Sách Chứng Từ & Phiếu Chi Chi Tiết ({filteredData.length} chứng từ)
                </span>
                <Button
                  icon={<FullscreenExitOutlined />}
                  onClick={() => setIsFullscreen(false)}
                  style={{ borderRadius: 6 }}
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
            <div style={{ overflowX: "auto" }}>
              <ExpenseReportTable
                data={filteredData}
                loading={loading}
                onSelectExpense={(exp) => {
                  setSelectedExpense(exp);
                  setDrawerVisible(true);
                }}
              />
            </div>
          </Modal>

          {/* 4. Footer ERP Summary */}
          <SummaryFooter
            totalRevenue={totalRevenue}
            totalExpense={totalExpense}
            netProfit={totalRevenue - totalExpense}
            avgPerDay={avgPerDay}
            highestVal={highestVal}
            lowestVal={lowestVal}
            variance={0}
          />
        </>
      )}

      {/* Expense Detail Drawer */}
      <ExpenseDetailDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        expenseData={selectedExpense}
      />

      {/* Expense Compare Modal */}
      <ExpenseCompareModal
        visible={compareModalVisible}
        onClose={() => setCompareModalVisible(false)}
      />
    </div>
  );
};

export default ReportExpensePage;
