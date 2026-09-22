import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Select,
  DatePicker,
  Row,
  Col,
  Card,
  Typography,
  Tag,
  Divider,
  Space,
  Spin,
} from "antd";
import {
  SwapOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { getCashFlows } from "../../../api/cashFlowApi";
import { useBranch } from "../../../context/BranchContext";

const { Title, Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);

// Fetch data chi phí từ getCashFlows
const fetchPeriodStats = async (date, pickerType, branchId) => {
  const d = dayjs(date);
  let start, end;
  if (pickerType === "date") {
    start = d.startOf("day");
    end   = d.endOf("day");
  } else if (pickerType === "month") {
    start = d.startOf("month");
    end   = d.endOf("month");
  } else {
    start = d.startOf("year");
    end   = d.endOf("year");
  }

  const res = await getCashFlows(branchId);
  const allCashFlows = res || [];

  const filteredExpenses = allCashFlows.filter((cf) => {
    const dateVal = cf.businessDate || cf.createdAt;
    if (!dateVal) return false;
    const cfDate = dayjs(dateVal);
    const matchesDate = (cfDate.isSame(start, "day") || cfDate.isAfter(start, "day")) &&
                        (cfDate.isSame(end, "day") || cfDate.isBefore(end, "day"));
    const isExpense = cf.directionValue === 2 || cf.type === "Chi" || cf.directionValue === "Chi";
    return matchesDate && isExpense;
  });

  const totalExpense = filteredExpenses.reduce((sum, cf) => sum + (cf.totalAmount || cf.amount || 0), 0);

  let dailyStats = [];
  if (pickerType === "date") {
    const morning = { date: "Sáng (6-11h)", expense: 0 };
    const noon = { date: "Trưa (11-14h)", expense: 0 };
    const afternoon = { date: "Chiều (14-18h)", expense: 0 };
    const night = { date: "Tối (18-22h)", expense: 0 };

    filteredExpenses.forEach((cf) => {
      const dateVal = cf.businessDate || cf.createdAt;
      const hr = dayjs(dateVal).hour();
      const amt = cf.totalAmount || cf.amount || 0;
      if (hr >= 6 && hr < 11) morning.expense += amt;
      else if (hr >= 11 && hr < 14) noon.expense += amt;
      else if (hr >= 14 && hr < 18) afternoon.expense += amt;
      else if (hr >= 18 && hr < 22) night.expense += amt;
    });
    dailyStats = [morning, noon, afternoon, night];
  } else {
    const dailyMap = {};
    let cur = dayjs(start);
    while (cur.isBefore(end) || cur.isSame(end, "day")) {
      const key = cur.format("DD/MM");
      dailyMap[key] = { date: key, expense: 0 };
      cur = cur.add(1, "day");
    }
    filteredExpenses.forEach((cf) => {
      const dateVal = cf.businessDate || cf.createdAt;
      const key = dayjs(dateVal).format("DD/MM");
      if (dailyMap[key]) {
        dailyMap[key].expense += (cf.totalAmount || cf.amount || 0);
      }
    });
    dailyStats = Object.values(dailyMap);
  }

  return {
    expenses: totalExpense,
    cashFlowList: filteredExpenses.map(cf => ({
      id: cf.id,
      category: cf.category || "Chi phí khác",
      amount: cf.totalAmount || cf.amount || 0,
      type: "out"
    })),
    dailyStats,
  };
};

// Map BE data → structure phù hợp cho so sánh chi phí
const mapToPeriod = (beData, dateLabel) => {
  if (!beData) {
    return {
      title: dateLabel,
      totalExpense: 0,
      avgExpense: 0,
      avgExpensePerDay: 1,
      largestExpense: 0,
      topExpenses: [],
      trendData: [],
    };
  }

  const expenses = beData.expenses || 0;

  // Lọc chi phí từ cashFlowList
  const flowList = beData.cashFlowList || [];
  const outFlows = flowList.filter((cf) => cf.type === "out");

  const mappedExpenses = outFlows.map((cf, idx) => ({
    id:     String(cf.id || idx + 1),
    amount: Math.abs(cf.amount || 0),
    name:   cf.category || "Chi phí khác",
  }));

  // Top khoản chi lớn nhất
  const topExpenses = [...mappedExpenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Trend chi phí theo ngày
  const trendData = (beData.dailyStats || []).map((s) => ({
    date:    s.date,
    expense: s.expense || 0,
  }));

  const trendFallback = (beData.hourSlots || []).map((s) => {
    const slotRev = s.value || 0;
    const expRatio = beData.revenue > 0 ? expenses / beData.revenue : 0;
    return {
      date:   s.slot,
      expense: Math.round(slotRev * expRatio),
    };
  });

  const largestVal = mappedExpenses.reduce((max, c) => Math.max(max, c.amount), 0);

  return {
    title:            dateLabel,
    totalExpense:     expenses,
    avgExpense:       mappedExpenses.length ? Math.round(expenses / mappedExpenses.length) : 0,
    avgExpensePerDay: expenses,
    largestExpense:   largestVal,
    topExpenses,
    trendData:        trendData.length > 0 ? trendData : trendFallback,
  };
};

/**
 * Component: ExpenseCompareModal
 * So sánh hiệu quả chi phí vận hành từ dữ liệu thật
 */
const ExpenseCompareModal = ({ visible, onClose }) => {
  const { currentBranchId } = useBranch();
  const [pickerType, setPickerType] = useState("date");

  const [dateA, setDateA] = useState(dayjs());
  const [dateB, setDateB] = useState(dayjs().subtract(1, "day"));

  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [periodA, setPeriodA]   = useState(null);
  const [periodB, setPeriodB]   = useState(null);

  const formatTitle = (d, type) => {
    if (!d) return "";
    if (type === "date")  return `Ngày ${d.format("DD/MM/YYYY")}`;
    if (type === "month") return `Tháng ${d.format("MM/YYYY")}`;
    return `Năm ${d.format("YYYY")}`;
  };

  const loadPeriodA = useCallback(async () => {
    setLoadingA(true);
    try {
      const data = await fetchPeriodStats(dateA, pickerType, currentBranchId);
      setPeriodA(mapToPeriod(data, `Kỳ chọn: ${formatTitle(dateA, pickerType)}`));
    } finally { setLoadingA(false); }
  }, [dateA, pickerType, currentBranchId]);

  const loadPeriodB = useCallback(async () => {
    setLoadingB(true);
    try {
      const data = await fetchPeriodStats(dateB, pickerType, currentBranchId);
      setPeriodB(mapToPeriod(data, `Kỳ so sánh: ${formatTitle(dateB, pickerType)}`));
    } finally { setLoadingB(false); }
  }, [dateB, pickerType, currentBranchId]);

  useEffect(() => { if (visible) { loadPeriodA(); loadPeriodB(); } }, [visible, loadPeriodA, loadPeriodB, currentBranchId]);

  const handlePickerTypeChange = (val) => {
    setPickerType(val);
    const now = dayjs();
    if (val === "date") { setDateA(now); setDateB(now.subtract(1, "day")); }
    else if (val === "month") { setDateA(now.startOf("month")); setDateB(now.subtract(1, "month").startOf("month")); }
    else { setDateA(now.startOf("year")); setDateB(now.subtract(1, "year").startOf("year")); }
  };

  const combinedTrend = (() => {
    if (!periodA && !periodB) return [];
    const tA = periodA?.trendData || [];
    const tB = periodB?.trendData || [];
    const len = Math.max(tA.length, tB.length);
    return Array.from({ length: len }, (_, i) => ({
      date:     tA[i]?.date || tB[i]?.date || `Mốc ${i + 1}`,
      expenseA: tA[i]?.expense || 0,
      expenseB: tB[i]?.expense || 0,
    }));
  })();

  const diffExpensePct =
    periodA && periodB && periodB.totalExpense > 0
      ? Number((((periodA.totalExpense - periodB.totalExpense) / periodB.totalExpense) * 100).toFixed(1))
      : 0;
  const diffExpenseDelta = periodA && periodB ? periodA.totalExpense - periodB.totalExpense : 0;

  const renderPeriodBlock = (period, loading, isCurrent) => (
    <Spin spinning={loading}>
      <Card
        bordered
        style={{ borderRadius: 10, borderColor: isCurrent ? "#fecaca" : "#fed7aa", background: "#fff" }}
        bodyStyle={{ padding: 16 }}
      >
        <Title level={5} style={{ margin: "0 0 12px", color: "#1e293b", fontWeight: 700 }}>
          {isCurrent ? "📌 " : "⏱️ "}
          {period?.title || (isCurrent ? "Kỳ chọn" : "Kỳ so sánh")}
        </Title>

        {/* KPIs */}
        <Row gutter={[8, 8]} style={{ marginBottom: 14 }}>
          {[
            { label: "Tổng Chi Phí", value: formatVND(period?.totalExpense),   color: "#ef4444" },
            { label: "Trung bình/Phiếu", value: formatVND(period?.avgExpense),   color: "#ea580c" },
            { label: "Khoản Chi Lớn Nhất", value: formatVND(period?.largestExpense), color: "#2563eb" },
          ].map((kpi) => (
            <Col key={kpi.label} xs={8}>
              <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{kpi.label}</Text>
                <div style={{ fontWeight: 700, fontSize: 13, color: kpi.color }}>{kpi.value}</div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Charts Row */}
        <Row gutter={[10, 10]}>
          <Col span={24}>
            <div style={{ background: "#fff", padding: 10, borderRadius: 6, border: "1px solid #e2e8f0" }}>
              <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                <LineChartOutlined style={{ color: "#ef4444" }} /> Xu hướng Chi phí
              </Text>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickLine={false} stroke="#94a3b8" fontSize={9} />
                    <YAxis tickLine={false} stroke="#94a3b8" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(v, name) => [formatVND(v), name]} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                    <Line
                      type="monotone"
                      dataKey="expenseA"
                      name="Kỳ chọn"
                      stroke="#ef4444"
                      strokeWidth={isCurrent ? 3 : 2}
                      strokeDasharray={isCurrent ? undefined : "4 4"}
                      dot={{ r: isCurrent ? 5 : 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenseB"
                      name="Kỳ so sánh"
                      stroke="#f97316"
                      strokeWidth={isCurrent ? 2 : 3}
                      strokeDasharray={isCurrent ? "4 4" : undefined}
                      dot={{ r: isCurrent ? 3 : 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </Spin>
  );

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined style={{ color: "var(--color-primary)", fontSize: 20 }} />
          <span style={{ fontWeight: 800, fontSize: 18 }}>So Sánh Hiệu Quả Chi Phí Vận Hành</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1100}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: "85vh", overflowY: "auto", padding: "16px 20px" }}
    >
      {/* ── Header: Chọn loại + 2 DatePicker ────────────────────────────── */}
      <div style={{ background: "#f1f5f9", padding: "14px 18px", borderRadius: 8, marginBottom: 16 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} md={8}>
            <Text strong style={{ display: "block", fontSize: 12, marginBottom: 4 }}>1. Loại mốc thời gian:</Text>
            <Select
              value={pickerType}
              onChange={handlePickerTypeChange}
              style={{ width: "100%" }}
              options={[
                { label: "So sánh theo ngày",  value: "date" },
                { label: "So sánh theo tháng", value: "month" },
                { label: "So sánh theo năm",   value: "year" },
              ]}
            />
          </Col>
          <Col xs={12} md={8}>
            <Text strong style={{ display: "block", fontSize: 12, marginBottom: 4 }}>2. Kỳ chọn:</Text>
            <DatePicker
              picker={pickerType}
              value={dateA}
              onChange={(val) => val && setDateA(val)}
              format={pickerType === "date" ? "DD/MM/YYYY" : pickerType === "month" ? "MM/YYYY" : "YYYY"}
              style={{ width: "100%", borderRadius: 6 }}
            />
          </Col>
          <Col xs={12} md={8}>
            <Text strong style={{ display: "block", fontSize: 12, marginBottom: 4 }}>3. Kỳ so sánh:</Text>
            <DatePicker
              picker={pickerType}
              value={dateB}
              onChange={(val) => val && setDateB(val)}
              format={pickerType === "date" ? "DD/MM/YYYY" : pickerType === "month" ? "MM/YYYY" : "YYYY"}
              style={{ width: "100%", borderRadius: 6 }}
            />
          </Col>
        </Row>
      </div>

      {/* ── Chênh lệch tổng kết ────────────────────────────────────────── */}
      <div
        style={{
          background: "#fef2f2", padding: "10px 16px", borderRadius: 8,
          border: "1px solid #fecaca", marginBottom: 16,
          display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap",
        }}
      >
        <Text strong>Biến động chi phí: {formatTitle(dateA, pickerType)} vs {formatTitle(dateB, pickerType)}</Text>
        <Tag color={diffExpensePct < 0 ? "success" : "error"} style={{ fontSize: 13, fontWeight: 700, padding: "2px 8px" }}>
          Chi phí: {diffExpensePct >= 0 ? "+" : ""}{diffExpensePct}% ({diffExpenseDelta >= 0 ? "+" : ""}{formatVND(diffExpenseDelta)})
        </Tag>
      </div>

      {/* ── 2 khối kỳ ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {renderPeriodBlock(periodA, loadingA, true)}
        <Divider style={{ margin: "4px 0" }}>⚡ So sánh đối chiếu trực tiếp ⚡</Divider>
        {renderPeriodBlock(periodB, loadingB, false)}
      </div>
    </Modal>
  );
};

export default ExpenseCompareModal;
