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
  BarChartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";
import { getCashFlows } from "../../../api/cashFlowApi";
import { useBranch } from "../../../context/BranchContext";

const { Title, Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val || 0);

// Fetch data lợi nhuận từ getCashFlows
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

  const filtered = allCashFlows.filter((cf) => {
    const dateVal = cf.businessDate || cf.createdAt;
    if (!dateVal) return false;
    const cfDate = dayjs(dateVal);
    return (cfDate.isSame(start, "day") || cfDate.isAfter(start, "day")) &&
           (cfDate.isSame(end, "day") || cfDate.isBefore(end, "day"));
  });

  const revenue = filtered
    .filter(cf => cf.directionValue === 1 || cf.type === "Thu" || cf.directionValue === "Thu")
    .reduce((sum, cf) => sum + (cf.totalAmount || cf.amount || 0), 0);

  const expenses = filtered
    .filter(cf => cf.directionValue === 2 || cf.type === "Chi" || cf.directionValue === "Chi")
    .reduce((sum, cf) => sum + (cf.totalAmount || cf.amount || 0), 0);

  const profit = revenue - expenses;

  let dailyStats = [];
  if (pickerType === "date") {
    const morning = { date: "Sáng (6-11h)", profit: 0 };
    const noon = { date: "Trưa (11-14h)", profit: 0 };
    const afternoon = { date: "Chiều (14-18h)", profit: 0 };
    const night = { date: "Tối (18-22h)", profit: 0 };

    filtered.forEach((cf) => {
      const dateVal = cf.businessDate || cf.createdAt;
      const hr = dayjs(dateVal).hour();
      const amt = cf.totalAmount || cf.amount || 0;
      const sign = (cf.directionValue === 1 || cf.type === "Thu" || cf.directionValue === "Thu") ? 1 : -1;
      
      if (hr >= 6 && hr < 11) morning.profit += (amt * sign);
      else if (hr >= 11 && hr < 14) noon.profit += (amt * sign);
      else if (hr >= 14 && hr < 18) afternoon.profit += (amt * sign);
      else if (hr >= 18 && hr < 22) night.profit += (amt * sign);
    });
    dailyStats = [morning, noon, afternoon, night];
  } else {
    const dailyMap = {};
    let cur = dayjs(start);
    while (cur.isBefore(end) || cur.isSame(end, "day")) {
      const key = cur.format("DD/MM");
      dailyMap[key] = { date: key, profit: 0 };
      cur = cur.add(1, "day");
    }
    filtered.forEach((cf) => {
      const dateVal = cf.businessDate || cf.createdAt;
      const key = dayjs(dateVal).format("DD/MM");
      if (dailyMap[key]) {
        const amt = cf.totalAmount || cf.amount || 0;
        const sign = (cf.directionValue === 1 || cf.type === "Thu" || cf.directionValue === "Thu") ? 1 : -1;
        dailyMap[key].profit += (amt * sign);
      }
    });
    dailyStats = Object.values(dailyMap);
  }

  return {
    revenue,
    expenses,
    profit,
    dailyStats,
  };
};

// Map BE data → structure so sánh lợi nhuận
const mapToPeriod = (beData, dateLabel) => {
  if (!beData) {
    return {
      title: dateLabel,
      netProfit: 0,
      profitMargin: 0,
      costRatio: 0,
      breakEvenPct: 0,
      growthPct: 0,
      financialStructure: [],
      trendData: [],
    };
  }

  const rev  = beData.revenue || 0;
  const exp  = beData.expenses || 0;
  const prof = beData.profit || 0;

  // Lợi nhuận ròng, tỷ suất lợi nhuận & tỷ lệ chi phí
  const profitMargin = rev > 0 ? Number(((prof / rev) * 100).toFixed(1)) : 0;
  const costRatio    = rev > 0 ? Number(((exp / rev) * 100).toFixed(1)) : 0;

  // Tiến độ điểm hòa vốn giả định
  const breakEvenPct = 40000000 > 0 ? Number(((rev / 40000000) * 100).toFixed(1)) : 0;

  // Cơ cấu tài chính
  const financialStructure = [
    { name: "Doanh Thu", amount: rev, fill: "#2563eb" },
    { name: "Chi Phí", amount: exp, fill: "#ef4444" },
    { name: "Lợi Nhuận Ròng", amount: prof, fill: "#10b981" },
  ];

  // Map trend data
  const trendData = (beData.dailyStats || []).map((s) => ({
    date:   s.date,
    profit: s.profit || 0,
  }));

  const trendFallback = (beData.hourSlots || []).map((s) => {
    const slotRev = s.value || 0;
    const expRatio = rev > 0 ? exp / rev : 0;
    const slotExp = Math.round(slotRev * expRatio);
    return {
      date:   s.slot,
      profit: slotRev - slotExp,
    };
  });

  return {
    title: dateLabel,
    netProfit: prof,
    profitMargin,
    costRatio,
    breakEvenPct,
    growthPct: 0,
    financialStructure,
    trendData: trendData.length > 0 ? trendData : trendFallback,
  };
};

/**
 * Component: ProfitCompareModal
 * So sánh hiệu quả lợi nhuận ròng từ dữ liệu thật
 */
const ProfitCompareModal = ({ visible, onClose }) => {
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
      date:    tA[i]?.date || tB[i]?.date || `Mốc ${i + 1}`,
      profitA: tA[i]?.profit || 0,
      profitB: tB[i]?.profit || 0,
    }));
  })();

  const diffProfitPct =
    periodA && periodB && periodB.netProfit > 0
      ? Number((((periodA.netProfit - periodB.netProfit) / periodB.netProfit) * 100).toFixed(1))
      : 0;
  const diffProfitDelta = periodA && periodB ? periodA.netProfit - periodB.netProfit : 0;

  const renderPeriodBlock = (period, loading, isCurrent) => (
    <Spin spinning={loading}>
      <Card
        bordered
        style={{ borderRadius: 10, borderColor: isCurrent ? "#bbf7d0" : "#fed7aa", background: "#fff" }}
        bodyStyle={{ padding: 16 }}
      >
        <Title level={5} style={{ margin: "0 0 12px", color: "#1e293b", fontWeight: 700 }}>
          {isCurrent ? "📌 " : "⏱️ "}
          {period?.title || (isCurrent ? "Kỳ chọn" : "Kỳ so sánh")}
        </Title>

        {/* KPIs */}
        <Row gutter={[8, 8]} style={{ marginBottom: 14 }}>
          {[
            { label: "Lợi Nhuận Ròng", value: formatVND(period?.netProfit),    color: "#10b981" },
            { label: "Tỷ Suất Lợi Nhuận", value: `${period?.profitMargin || 0}%`, color: "#2563eb" },
            { label: "Tỷ Lệ Chi Phí",    value: `${period?.costRatio || 0}%`,    color: "#ef4444" },
          ].map((kpi) => (
            <Col key={kpi.label} xs={8}>
              <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <Text type="secondary" style={{ fontSize: 10, display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{kpi.label}</Text>
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
                <LineChartOutlined style={{ color: "#10b981" }} /> Xu thái Lợi nhuận Ròng
              </Text>
              <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickLine={false} stroke="#94a3b8" fontSize={9} />
                    <YAxis tickLine={false} stroke="#94a3b8" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(v, name) => [formatVND(v), name]} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                    <Line
                      type="monotone"
                      dataKey="profitA"
                      name="Kỳ chọn"
                      stroke="#10b981"
                      strokeWidth={isCurrent ? 3 : 2}
                      strokeDasharray={isCurrent ? undefined : "4 4"}
                      dot={{ r: isCurrent ? 5 : 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="profitB"
                      name="Kỳ so sánh"
                      stroke="#f59e0b"
                      strokeWidth={isCurrent ? 2 : 3}
                      strokeDasharray={isCurrent ? "4 4" : undefined}
                      dot={{ r: isCurrent ? 3 : 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Col>

          <Col span={24}>
            <div style={{ background: "#fff", padding: 10, borderRadius: 6, border: "1px solid #e2e8f0" }}>
              <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                <BarChartOutlined style={{ color: "#2563eb" }} /> Cơ cấu Tài chính
              </Text>
              <div style={{ width: "100%", height: 160 }}>
                {(period?.financialStructure?.length || 0) === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: 12 }}>
                    Chưa có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={period.financialStructure} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tickLine={false} stroke="#94a3b8" fontSize={9} />
                      <YAxis tickLine={false} stroke="#94a3b8" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                      <Tooltip formatter={(v) => [formatVND(v), "Số tiền"]} />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={16}>
                        {period.financialStructure.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
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
          <SwapOutlined style={{ color: "#10b981", fontSize: 20 }} />
          <span style={{ fontWeight: 800, fontSize: 18 }}>So Sánh Hiệu Quả Lợi Nhuận & Kinh Doanh</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1100}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: "85vh", overflowY: "auto", padding: "16px 20px" }}
    >
      {/* Date filter pickers */}
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

      {/* Delta badge */}
      <div
        style={{
          background: "#f0fdf4", padding: "10px 16px", borderRadius: 8,
          border: "1px solid #dcfce7", marginBottom: 16,
          display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap",
        }}
      >
        <Text strong>Biến động lợi nhuận ròng: {formatTitle(dateA, pickerType)} vs {formatTitle(dateB, pickerType)}</Text>
        <Tag color={diffProfitPct >= 0 ? "success" : "error"} style={{ fontSize: 13, fontWeight: 700, padding: "2px 8px" }}>
          Lợi nhuận ròng: {diffProfitPct >= 0 ? "+" : ""}{diffProfitPct}% ({diffProfitDelta >= 0 ? "+" : ""}{formatVND(diffProfitDelta)})
        </Tag>
      </div>

      {/* Render blocks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {renderPeriodBlock(periodA, loadingA, true)}
        <Divider style={{ margin: "4px 0" }}>⚡ So sánh đối chiếu trực tiếp ⚡</Divider>
        {renderPeriodBlock(periodB, loadingB, false)}
      </div>
    </Modal>
  );
};

export default ProfitCompareModal;
