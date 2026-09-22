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
import { getPaidInvoices } from "../../../api/orderApi";
import { useBranch } from "../../../context/BranchContext";

const { Text, Title } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);

// ─── Fetch stats cho 1 kỳ từ getPaidInvoices ────────────────────────────────
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

  const res = await getPaidInvoices(branchId);
  const allInvoices = res.data || res || [];

  const filtered = allInvoices.filter((inv) => {
    if (!inv.createdAt) return false;
    const c = dayjs(inv.createdAt);
    return (c.isSame(start, "day") || c.isAfter(start, "day")) &&
           (c.isSame(end, "day") || c.isBefore(end, "day"));
  });

  const revenue = filtered.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const completedBills = filtered.length;
  const avgOrderValue = completedBills > 0 ? Math.round(revenue / completedBills) : 0;

  let dailyStats = [];
  if (pickerType === "date") {
    const morning = { date: "Sáng (6-11h)", revenue: 0 };
    const noon = { date: "Trưa (11-14h)", revenue: 0 };
    const afternoon = { date: "Chiều (14-18h)", revenue: 0 };
    const night = { date: "Tối (18-22h)", revenue: 0 };

    filtered.forEach((inv) => {
      const hr = dayjs(inv.createdAt).hour();
      const amt = inv.totalAmount || 0;
      if (hr >= 6 && hr < 11) morning.revenue += amt;
      else if (hr >= 11 && hr < 14) noon.revenue += amt;
      else if (hr >= 14 && hr < 18) afternoon.revenue += amt;
      else if (hr >= 18 && hr < 22) night.revenue += amt;
    });
    dailyStats = [morning, noon, afternoon, night];
  } else {
    const dailyMap = {};
    let cur = dayjs(start);
    while (cur.isBefore(end) || cur.isSame(end, "day")) {
      const key = cur.format("DD/MM");
      dailyMap[key] = { date: key, revenue: 0 };
      cur = cur.add(1, "day");
    }
    filtered.forEach((inv) => {
      const key = dayjs(inv.createdAt).format("DD/MM");
      if (dailyMap[key]) {
        dailyMap[key].revenue += (inv.totalAmount || 0);
      }
    });
    dailyStats = Object.values(dailyMap);
  }

  return {
    revenue,
    completedBills,
    avgOrderValue,
    dailyStats,
  };
};

// ─── Map BE stats → period summary ─────────────────────────────────────────
const mapToPeriod = (beData, dateLabel) => {
  if (!beData) return { title: dateLabel, totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, avgRevenuePerDay: 1, trendData: [] };

  const revenue = beData.revenue || 0;
  const orders  = beData.completedBills || 0;

  // dailyStats → trend
  const trendData = (beData.dailyStats || []).map((s) => ({
    date:    s.date,
    revenue: s.revenue || 0,
  }));

  // hourSlots → fallback nếu ko có dailyStats
  const trendFallback = (beData.hourSlots || []).map((s) => ({
    date:    s.slot,
    revenue: s.value || 0,
  }));

  return {
    title:           dateLabel,
    totalRevenue:    revenue,
    totalOrders:     orders,
    avgOrderValue:   beData.avgOrderValue || 0,
    avgRevenuePerDay: revenue,   // 1 ngày = chính nó; 1 tháng tính sau
    trendData:       trendData.length > 0 ? trendData : trendFallback,
  };
};

/**
 * Component: RevenueCompareModal
 * So sánh doanh thu 2 kỳ bất kỳ — dữ liệu thật từ BE
 */
const RevenueCompareModal = ({ visible, onClose }) => {
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

  // ── Biểu đồ kết hợp cả 2 kỳ trên cùng 1 Line chart ───────────────────
  const combinedTrend = (() => {
    if (!periodA && !periodB) return [];
    const tA = periodA?.trendData || [];
    const tB = periodB?.trendData || [];
    const len = Math.max(tA.length, tB.length);
    return Array.from({ length: len }, (_, i) => ({
      date:     tA[i]?.date || tB[i]?.date || `Mốc ${i + 1}`,
      revenueA: tA[i]?.revenue || 0,
      revenueB: tB[i]?.revenue || 0,
    }));
  })();

  const diffRevenuePct =
    periodA && periodB && periodB.totalRevenue > 0
      ? Number((((periodA.totalRevenue - periodB.totalRevenue) / periodB.totalRevenue) * 100).toFixed(1))
      : 0;
  const diffRevenueDelta = periodA && periodB ? periodA.totalRevenue - periodB.totalRevenue : 0;
  const diffOrdersPct =
    periodA && periodB && periodB.totalOrders > 0
      ? Number((((periodA.totalOrders - periodB.totalOrders) / periodB.totalOrders) * 100).toFixed(1))
      : 0;
  const diffOrdersDelta = periodA && periodB ? periodA.totalOrders - periodB.totalOrders : 0;

  // ── Render 1 khối kỳ ───────────────────────────────────────────────────
  const renderPeriodBlock = (period, loading, isCurrent) => (
    <Spin spinning={loading}>
      <Card
        bordered
        style={{ borderRadius: 10, borderColor: isCurrent ? "#bfdbfe" : "#d1fae5", background: "#fff" }}
        bodyStyle={{ padding: 16 }}
      >
        <Title level={5} style={{ margin: "0 0 12px", color: "#1e293b", fontWeight: 700 }}>
          {isCurrent ? "📌 " : "⏱️ "}
          {period?.title || (isCurrent ? "Kỳ chọn" : "Kỳ so sánh")}
        </Title>

        {/* KPIs */}
        <Row gutter={[8, 8]} style={{ marginBottom: 14 }}>
          {[
            { label: "Doanh Thu",   value: formatVND(period?.totalRevenue),    color: "#2563eb" },
            { label: "Số Đơn",      value: `${period?.totalOrders || 0} đơn`,  color: "#ea580c" },
            { label: "Giá Trị Đơn Trung Bình", value: formatVND(period?.avgOrderValue),   color: "#10b981" },
          ].map((kpi) => (
            <Col key={kpi.label} xs={8}>
              <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <Text type="secondary" style={{ fontSize: 10, display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{kpi.label}</Text>
                <div style={{ fontWeight: 700, fontSize: 13, color: kpi.color }}>{kpi.value}</div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Charts: Trend */}
        <Row gutter={[10, 10]}>
          <Col span={24}>
            <div style={{ background: "#fff", padding: 10, borderRadius: 6, border: "1px solid #e2e8f0" }}>
              <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                <LineChartOutlined style={{ color: "#2563eb" }} /> Xu hướng doanh thu
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
                      dataKey="revenueA"
                      name="Kỳ chọn"
                      stroke="#2563eb"
                      strokeWidth={isCurrent ? 3 : 2}
                      strokeDasharray={isCurrent ? undefined : "4 4"}
                      dot={{ r: isCurrent ? 5 : 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenueB"
                      name="Kỳ so sánh"
                      stroke="#0ea5e9"
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
          <span style={{ fontWeight: 800, fontSize: 18 }}>So Sánh Hiệu Quả Vận Hành Doanh Thu</span>
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
          background: "#fff7ed", padding: "10px 16px", borderRadius: 8,
          border: "1px solid #ffedd5", marginBottom: 16,
          display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap",
        }}
      >
        <Text strong>Tăng trưởng: {formatTitle(dateA, pickerType)} vs {formatTitle(dateB, pickerType)}</Text>
        <Tag color={diffRevenuePct >= 0 ? "success" : "error"} style={{ fontSize: 13, fontWeight: 700, padding: "2px 8px" }}>
          Doanh thu: {diffRevenuePct >= 0 ? "+" : ""}{diffRevenuePct}% ({diffRevenueDelta >= 0 ? "+" : ""}{formatVND(diffRevenueDelta)})
        </Tag>
        <Tag color={diffOrdersPct >= 0 ? "success" : "error"} style={{ fontSize: 13, fontWeight: 700, padding: "2px 8px" }}>
          Đơn hàng: {diffOrdersPct >= 0 ? "+" : ""}{diffOrdersPct}% ({diffOrdersDelta >= 0 ? "+" : ""}{diffOrdersDelta} đơn)
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

export default RevenueCompareModal;
