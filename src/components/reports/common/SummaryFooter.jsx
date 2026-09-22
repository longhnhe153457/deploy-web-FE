import { Card, Row, Col, Typography } from "antd";

const { Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

const SummaryFooter = ({
  totalRevenue = 0,
  totalExpense = 0,
  netProfit = 0,
  avgPerDay = 0,
  highestVal = 0,
  lowestVal = 0,
  variance = 0,
}) => {
  return (
    <Card
      bordered={false}
      style={{
        borderRadius: "var(--border-radius)",
        boxShadow: "var(--shadow-sm)",
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        color: "#ffffff",
        marginTop: 20,
      }}
      bodyStyle={{ padding: "16px 24px" }}
    >
      <Row gutter={[16, 16]} align="middle">
        <Col xs={12} sm={8} md={4}>
          <Text style={{ color: "#94a3b8", fontSize: 12, display: "block" }}>
            Tổng Doanh Thu
          </Text>
          <Text style={{ color: "#60a5fa", fontSize: 16, fontWeight: 700 }}>
            {formatVND(totalRevenue)}
          </Text>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Text style={{ color: "#94a3b8", fontSize: 12, display: "block" }}>
            Tổng Chi Phí
          </Text>
          <Text style={{ color: "#f87171", fontSize: 16, fontWeight: 700 }}>
            {formatVND(totalExpense)}
          </Text>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Text style={{ color: "#94a3b8", fontSize: 12, display: "block" }}>
            Lợi Nhuận Ròng
          </Text>
          <Text
            style={{
              color: netProfit >= 0 ? "#4ade80" : "#f87171",
              fontSize: 17,
              fontWeight: 800,
            }}
          >
            {netProfit >= 0 ? "+" : ""}
            {formatVND(netProfit)}
          </Text>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Text style={{ color: "#94a3b8", fontSize: 12, display: "block" }}>
            Trung bình / Ngày
          </Text>
          <Text style={{ color: "#facc15", fontSize: 15, fontWeight: 600 }}>
            {formatVND(avgPerDay)}
          </Text>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Text style={{ color: "#94a3b8", fontSize: 12, display: "block" }}>
            Giá trị Cao nhất
          </Text>
          <Text style={{ color: "#38bdf8", fontSize: 14, fontWeight: 600 }}>
            {formatVND(highestVal)}
          </Text>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Text style={{ color: "#94a3b8", fontSize: 12, display: "block" }}>
            Giá trị Thấp nhất
          </Text>
          <Text style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600 }}>
            {formatVND(lowestVal)}
          </Text>
        </Col>
      </Row>
    </Card>
  );
};

export default SummaryFooter;
