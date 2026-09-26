import React, { useState, useEffect, useCallback } from "react";
import { Typography, Segmented, message, Space, Tag, Spin } from "antd";
import {
  DashboardOutlined,
  TableOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import HomeFilter from "../components/homePage/HomeFilter";
import HomeDashboard from "../components/homePage/HomeDashboard";
import HomeReport from "../components/homePage/HomeReport";
import { getBranchDashboardStats } from "../api/dashboardApi";
import { getPaidInvoices, getAllOrders } from "../api/orderApi";
import { getCashFlows } from "../api/cashFlowApi";
import { getAllWorkSchedules } from "../api/workScheduleApi";
import { getRoleRange } from "../api/accountApi";
import { useBranch } from "../context/BranchContext";

const { Title, Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0
  );

// ─── MAP BE → ReportData ────────────────────────────────────────────────────
/**
 * BE Response (GET /api/Dashboard/branch-stats) JSON shape (camelCase):
 *
 * {
 *   revenue: double,           // Tổng Payment.Status=="Success" trong kỳ
 *   expenses: double,          // Tổng CashFlow Direction==2 (Chi) trong kỳ
 *   profit: double,
 *   completedBills: int,       // Số Payment thành công
 *   avgOrderValue: double,
 *   totalItemsSold: int,
 *
 *   orderSummary: {            // CHỈ CÓ KHI range=="today"
 *     new: int,                // Active && createdAt >= 1h trước
 *     paid: int,               // Status=="Paid"
 *     unpaid: int,             // Active && createdAt < 1h trước
 *     cancelled: int,
 *     total: int
 *   },
 *
 *   alerts: [{ level: "warning"|"danger", message: string }],
 *
 *   cashFlowList: [{           // Từ GetCashFlowListAsync: Payments + CashFlows
 *     id: long,
 *     time: "yyyy-MM-dd HH:mm",
 *     type: "in"|"out",
 *     category: string,        // "Thanh toán hóa đơn" | "Trả lương" | "Nhập hàng" | ...
 *     amount: double           // Chi: âm, Thu: dương
 *   }],
 *
 *   hourSlots: [{              // 4 khung giờ cố định (chỉ tính Paid)
 *     slot: "Sáng (6-11h)"|"Trưa (11-14h)"|"Chiều (14-18h)"|"Tối (18-22h)",
 *     value: double            // Doanh thu khung giờ đó
 *   }],
 *
 *   topDishes: [{ name: string, quantity: int }],   // Top 10 bán chạy nhất
 *   leastDishes: [{ name: string, quantity: int }], // Top 10 bán chậm nhất
 *
 *   dailyStats: [{             // Breakdown theo ngày (dùng khi range > 1 ngày)
 *     date: "dd/MM",
 *     revenue: double,
 *     expense: double,
 *     profit: double
 *   }],
 *
 *   paymentMethods: [{ name: string, value: double }],
 *   monthlyStats: [...]
 * }
 */
// ─── HELPER FOR CONSOLIDATING SERVED DISHES ──────────────────────────────────
const getConsolidatedServedItemsForHome = (invoices = []) => {
  const map = new Map();
  
  invoices.forEach((inv) => {
    const details = inv.orderDetails || inv.details || [];
    details.forEach((d) => {
      if (d.status === 'Cancelled' || d.status === 'Rejected' || d.cookingStatus === 'Cancelled') {
        return;
      }
      const pType = String(d.productType || d.type || '').toLowerCase();
      if (pType === 'ingredient' || pType === '4') {
        return;
      }
      const isValidStatus = !d.status || d.status === 'Confirmed' || d.status === 'Completed' || d.status === 'Served' || d.status === 1 || d.status === 'Paid';
      const isValidCooking = !d.cookingStatus || d.cookingStatus === 'Served' || d.cookingStatus === 'Ready';
      if (!isValidStatus || !isValidCooking) {
        return;
      }

      const productId = d.productId || d.bInventoryId || d.id;
      const name = d.productName || d.snapshotProductName || d.product?.name || d.name || 'Món ăn';
      const unitPrice = Number(d.price ?? d.unitPrice ?? (d.quantity > 0 ? (d.totalPrice || 0) / d.quantity : 0) ?? 0);
      const key = `${productId}_${name}_${unitPrice}`;

      const qty = Number(d.quantity || 0) - Number(d.returnedQuantity || 0);
      if (qty <= 0) return;

      const note = d.note || '';

      if (!map.has(key)) {
        map.set(key, {
          productId,
          itemName: name,
          unitPrice,
          qtySold: qty,
          revenue: qty * unitPrice,
          note: note ? [note] : [],
        });
      } else {
        const existing = map.get(key);
        existing.qtySold += qty;
        existing.revenue += qty * unitPrice;
        if (note && !existing.note.includes(note)) {
          existing.note.push(note);
        }
      }
    });
  });

  const list = Array.from(map.values());
  const totalRevenue = list.reduce((sum, item) => sum + item.revenue, 0);

  return list.map((item, idx) => ({
    id: String(idx + 1),
    itemCode: `SP-${String(idx + 1).padStart(3, "0")}`,
    itemName: item.itemName,
    unitPrice: item.unitPrice,
    qtySold: item.qtySold,
    revenue: item.revenue,
    note: item.note.join(", ") || "—",
    sharePct: totalRevenue > 0 ? Number(((item.revenue / totalRevenue) * 100).toFixed(1)) : 0,
  }));
};

/**
 * Ánh xạ dữ liệu BE stats + invoices + cash flows sang cấu trúc ReportData
 */
const mapBeToReportData = (beStats, filteredInvoices, filteredCashFlows, filteredAllOrders, dateStr) => {
  const dailyRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalExpenses = filteredCashFlows
    .filter(cf => cf.directionValue === 2 || cf.type === "Chi" || cf.directionValue === "Chi")
    .reduce((sum, cf) => sum + (cf.totalAmount || cf.amount || 0), 0);
  const dailyProfit = dailyRevenue - totalExpenses;
  const totalPaidBills = filteredInvoices.length;

  // Hourly Trends computed directly from filtered invoices
  const morningSlot = { slot: "Sáng (6-11h)", count: 0 };
  const noonSlot = { slot: "Trưa (11-14h)", count: 0 };
  const afternoonSlot = { slot: "Chiều (14-18h)", count: 0 };
  const nightSlot = { slot: "Tối (18-22h)", count: 0 };

  filteredInvoices.forEach((inv) => {
    const hr = dayjs(inv.createdAt).hour();
    if (hr >= 6 && hr < 11) morningSlot.count++;
    else if (hr >= 11 && hr < 14) noonSlot.count++;
    else if (hr >= 14 && hr < 18) afternoonSlot.count++;
    else if (hr >= 18 || hr < 6) nightSlot.count++;
  });

  const hourlyTrends = [
    { hour: "Sáng (6-11h)", revenue: morningSlot.count, expense: 0, profit: 0, orders: morningSlot.count },
    { hour: "Trưa (11-14h)", revenue: noonSlot.count, expense: 0, profit: 0, orders: noonSlot.count },
    { hour: "Chiều (14-18h)", revenue: afternoonSlot.count, expense: 0, profit: 0, orders: afternoonSlot.count },
    { hour: "Tối (18-22h)", revenue: nightSlot.count, expense: 0, profit: 0, orders: nightSlot.count },
  ];

  // Cash Flow list mapping
  const cashFlowList = filteredCashFlows.map((cf, idx) => {
    return {
      id: cf.id,
      code: cf.code || `TC-${String(cf.id).padStart(8, "0")}`,
      docCode: cf.documentCode || "—",
      time: cf.businessDate ? dayjs(cf.businessDate).format("HH:mm") : (cf.createdAt ? dayjs(cf.createdAt).format("HH:mm") : "00:00"),
      date: cf.businessDate ? dayjs(cf.businessDate).format("DD/MM/YYYY") : (cf.createdAt ? dayjs(cf.createdAt).format("DD/MM/YYYY") : "—"),
      type: cf.directionValue === 1 ? "Thu" : "Chi",
      person: cf.partnerName || (cf.note && (cf.note.includes('cho nhân viên') || cf.note.includes('lương tháng')) ? (cf.note.includes('cho nhân viên') ? 'NV: ' + cf.note.substring(cf.note.indexOf('cho nhân viên') + 14).trim() : 'NV (Chi lương)') : "—"),
      note: cf.note || "Giao dịch",
      amount: cf.totalAmount || 0,
      paymentMethod: cf.paymentMethod || "—",
      raw: cf
    };
  });

  // Sales list mapping
  const salesList = filteredInvoices.map((inv) => {
    return {
      id: inv.id,
      billCode: inv.code || `HD${inv.id}`,
      date: inv.createdAt ? dayjs(inv.createdAt).format("DD/MM/YYYY") : "—",
      time: inv.createdAt ? dayjs(inv.createdAt).format("HH:mm") : "00:00",
      tableName: inv.tableName || (inv.tableId ? `Bàn #${inv.tableId}` : 'Mang về'),
      areaName: inv.areaName || "",
      customer: inv.customerName || (inv.customerId ? `Khách hàng #${inv.customerId}` : 'Khách lẻ'),
      cashier: inv.createdByName || 'Thu ngân',
      total: inv.totalAmount || 0,
      status: inv.status || 'Paid',
      paymentMethod: inv.paymentMethod || "Tiền mặt",
      orderDetails: inv.orderDetails || [],
      raw: inv
    };
  });

  // Consolidated items list
  const inventoryList = getConsolidatedServedItemsForHome(filteredInvoices);

  // Top Dishes computed directly from filtered invoices
  const topDishes = [...inventoryList]
    .sort((a, b) => b.qtySold - a.qtySold)
    .slice(0, 5)
    .map((item) => ({
      name: item.itemName,
      quantity: item.qtySold,
      revenue: item.revenue,
    }));

  // Order status breakdown: created, completed, uncompleted
  const completedCount = filteredInvoices.length;
  const uncompletedCount = filteredAllOrders.filter(
    (o) => o.status !== "Paid" && o.status !== "Completed" && o.status !== "Cancelled" && o.status !== "Rejected" && o.status !== 1
  ).length;
  const createdCount = completedCount + uncompletedCount;

  const orderSummary = {
    created: createdCount,
    completed: completedCount,
    uncompleted: uncompletedCount,
  };

  return {
    dateStr: dateStr || dayjs().format("DD/MM/YYYY"),
    kpis: {
      revenue: {
        value:     dailyRevenue,
        formatted: formatVND(dailyRevenue),
        changePct: 0,
        isPositive: dailyRevenue >= 0,
      },
      expense: {
        value:     totalExpenses,
        formatted: formatVND(totalExpenses),
        changePct: 0,
        isPositive: true,
      },
      profit: {
        value:     dailyProfit,
        formatted: formatVND(dailyProfit),
        changePct: 0,
        isPositive: dailyProfit >= 0,
      },
      orders: {
        value:     totalPaidBills,
        formatted: `${totalPaidBills} đơn`,
        changePct: 0,
        isPositive: true,
      },
    },
    orderSummary,
    alerts:         [],
    paymentMethods: beStats.paymentMethods || [],
    hourlyTrends,
    topDishes,
    salesList,
    cashFlowList,
    inventoryList,
  };
};

const EMPTY_DAILY_REPORT = {
  dateStr: "",
  kpis: {
    revenue: { value: 0, formatted: "0 đ", changePct: 0, isPositive: true },
    expense: { value: 0, formatted: "0 đ", changePct: 0, isPositive: true },
    profit: { value: 0, formatted: "0 đ", changePct: 0, isPositive: true },
    orders: { value: 0, formatted: "0 đơn", changePct: 0, isPositive: true },
  },
  hourlyTrends: [],
  topDishes: [],
  salesList: [],
  cashFlowList: [],
  inventoryList: [],
  orderSummary: null,
  alerts: [],
  paymentMethods: [],
};

// ─── HomePage Component ──────────────────────────────────────────────────────
const HomePage = () => {
  const { currentBranchId } = useBranch();
  const [selectedDate, setSelectedDate] = useState(dayjs().format("DD/MM/YYYY"));
  const [loading, setLoading]           = useState(false);
  const [displayMode, setDisplayMode]   = useState("dashboard");
  const [reportData, setReportData]     = useState(EMPTY_DAILY_REPORT);
  const [absentEmployees, setAbsentEmployees] = useState([]);

  const fetchDashboardData = useCallback(async (dateStr) => {
    setLoading(true);
    try {
      const parsedDate = dayjs(dateStr, "DD/MM/YYYY");
      const isToday     = parsedDate.isSame(dayjs(), "day");
      const isYesterday = parsedDate.isSame(dayjs().subtract(1, "day"), "day");

      const range        = isToday ? "today" : isYesterday ? "yesterday" : "custom";
      const formattedStart = parsedDate.format("YYYY-MM-DD");
      const formattedEnd   = parsedDate.format("YYYY-MM-DD");

      const [statsRes, invoicesRes, cashFlowsRes, schedulesRes, accountsRes, allOrdersRes] = await Promise.allSettled([
        getBranchDashboardStats(range, formattedStart, formattedEnd, currentBranchId),
        getPaidInvoices(currentBranchId, formattedStart, formattedEnd),
        getCashFlows(currentBranchId, formattedStart, formattedEnd),
        getAllWorkSchedules(),
        getRoleRange(),
        getAllOrders(currentBranchId, formattedStart, formattedEnd),
      ]);

      const beStats = statsRes.status === "fulfilled" ? statsRes.value?.data : null;
      const allInvoices = invoicesRes.status === "fulfilled" ? (invoicesRes.value?.data || invoicesRes.value || []) : [];
      const allCashFlows = cashFlowsRes.status === "fulfilled" ? (cashFlowsRes.value || []) : [];
      const allSchedules = schedulesRes.status === "fulfilled" ? (schedulesRes.value?.data || schedulesRes.value || []) : [];
      const allAccounts = accountsRes.status === "fulfilled" ? (accountsRes.value?.data || accountsRes.value || []) : [];
      const rawAllOrders = allOrdersRes.status === "fulfilled" ? (allOrdersRes.value?.data || allOrdersRes.value || []) : [];

      const filteredInvoices = allInvoices.filter((ord) => {
        const matchesBranch = !currentBranchId || !ord.branchId || ord.branchId === currentBranchId;
        return matchesBranch && ord.createdAt && dayjs(ord.createdAt).format("DD/MM/YYYY") === dateStr;
      });

      const filteredCashFlows = allCashFlows.filter((cf) => {
        const matchesBranch = !currentBranchId || !cf.branchId || cf.branchId === currentBranchId;
        const dateVal = cf.businessDate || cf.createdAt;
        return matchesBranch && dateVal && dayjs(dateVal).format("DD/MM/YYYY") === dateStr;
      });

      const filteredAllOrders = rawAllOrders.filter((ord) => {
        const matchesBranch = !currentBranchId || !ord.branchId || ord.branchId === currentBranchId;
        return matchesBranch && ord.createdAt && dayjs(ord.createdAt).format("DD/MM/YYYY") === dateStr;
      });

      // Filter absent employees
      const targetDateStr = parsedDate.format("YYYY-MM-DD");
      const noCheckInSchedules = allSchedules.filter((ws) => {
        const matchesBranch = !currentBranchId || ws.branchId === currentBranchId;
        const matchesDate = ws.workDate && dayjs(ws.workDate).format("YYYY-MM-DD") === targetDateStr;
        const isNotCheckedIn = ws.checkInAt === null || ws.checkInAt === undefined;
        return matchesBranch && matchesDate && isNotCheckedIn;
      });

      const absentNames = noCheckInSchedules.map((ws) => {
        const acc = allAccounts.find((a) => a.id === ws.accountId);
        return acc ? acc.name : `Nhân viên #${ws.accountId}`;
      });

      setAbsentEmployees(Array.from(new Set(absentNames)));

      if (beStats) {
        setReportData(mapBeToReportData(beStats, filteredInvoices, filteredCashFlows, filteredAllOrders, dateStr));
      } else {
        setReportData(mapBeToReportData({}, filteredInvoices, filteredCashFlows, filteredAllOrders, dateStr));
      }
    } catch (err) {
      console.warn("[HomePage] API error:", err);
      setReportData({ ...EMPTY_DAILY_REPORT, dateStr });
      setAbsentEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    fetchDashboardData(selectedDate);
  }, [selectedDate, currentBranchId, fetchDashboardData]);

  const handleDateChange = (newDate) => setSelectedDate(newDate);

  const handleResetFilter = () => {
    const todayStr = dayjs().format("DD/MM/YYYY");
    setSelectedDate(todayStr);
    message.info("Đã đặt lại bộ lọc về hôm nay");
  };

  return (
    <div style={{ width: "100%", paddingBottom: 24 }}>
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          flexWrap:       "wrap",
          gap:            16,
          marginBottom:   16,
          background:     "var(--color-surface)",
          padding:        "16px 20px",
          borderRadius:   "var(--border-radius)",
          boxShadow:      "var(--shadow-sm)",
        }}
      >
        <div>
          <Space align="center" size="small">
            <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
              Báo cáo trong ngày
            </Title>
            <Tag
              color="orange"
              icon={<CalendarOutlined />}
              style={{ borderRadius: 6, fontSize: 13, padding: "2px 8px" }}
            >
              {reportData.dateStr}
            </Tag>
          </Space>
          <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
            Tổng hợp chỉ số và nhật ký hoạt động kinh doanh hàng ngày
          </Text>
        </div>

        <Segmented
          value={displayMode}
          onChange={setDisplayMode}
          size="large"
          options={[
            {
              label: (
                <div style={{ padding: "4px 8px" }}>
                  <DashboardOutlined style={{ marginRight: 6 }} />
                  <span>Dashboard</span>
                </div>
              ),
              value: "dashboard",
            },
            {
              label: (
                <div style={{ padding: "4px 8px" }}>
                  <TableOutlined style={{ marginRight: 6 }} />
                  <span>Report</span>
                </div>
              ),
              value: "report",
            },
          ]}
        />
      </div>

      {/* ─── BỘ LỌC NGÀY ──────────────────────────────────────────────────── */}
      <HomeFilter
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onReset={handleResetFilter}
      />

      {/* ─── CẢNH BÁO CHẤM CÔNG (SCROLL NGANG) ──────────────────────────────── */}
      {absentEmployees.length > 0 && (
        <div
          style={{
            margin: "0 0 16px 0",
            background: "#fff7ed",
            borderLeft: "4px solid #ea580c",
            borderRadius: "8px",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <ExclamationCircleOutlined style={{ color: "#ea580c", fontSize: "16px", flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: "#c2410c", fontSize: "13px", whiteSpace: "nowrap", flexShrink: 0 }}>
            {absentEmployees.length} nhân viên chưa chấm công hôm nay:
          </span>
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              padding: "2px 0",
              flex: 1,
            }}
            className="hide-scrollbar"
          >
            {absentEmployees.map((name, idx) => (
              <Tag
                key={idx}
                color="orange"
                style={{
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "12px",
                  padding: "2px 8px",
                  margin: 0,
                }}
              >
                {name}
              </Tag>
            ))}
          </div>
          <style>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
        </div>
      )}

      {/* ─── NỘI DUNG ─────────────────────────────────────────────────────── */}
      <Spin spinning={loading} tip="Đang tải dữ liệu từ máy chủ...">
        {displayMode === "dashboard" ? (
          <HomeDashboard data={reportData} />
        ) : (
          <HomeReport data={reportData} onRefresh={() => fetchDashboardData(selectedDate)} />
        )}
      </Spin>
    </div>
  );
};

export default HomePage;
