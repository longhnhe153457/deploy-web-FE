import React from "react";
import { Row, Col, Card, Tooltip, Typography } from "antd";
import {
  InboxOutlined,
  DollarOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const formatCurrency = (val) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const InventoryOverviewCards = ({ stats }) => {
  const cardsData = [
    {
      title: "Tổng số nguyên liệu",
      value: stats.totalItems || 0,
      suffix: " mặt hàng",
      icon: <InboxOutlined style={{ fontSize: 24, color: "#2563eb" }} />,
      bg: "#eff6ff",
      borderColor: "#bfdbfe",
      tooltip: "Tổng số chủng loại nguyên liệu đang được quản lý trong hệ thống kho.",
      subText: "Đang lưu kho active",
    },
    {
      title: "Tổng giá trị tồn kho",
      value: formatCurrency(stats.totalValue),
      icon: <DollarOutlined style={{ fontSize: 24, color: "#16a34a" }} />,
      bg: "#f0fdf4",
      borderColor: "#bbf7d0",
      tooltip: "Tổng giá trị quy đổi theo giá vốn hiện tại của tất cả nguyên liệu tồn kho.",
      subText: "Theo giá nhập gần nhất",
    },
    {
      title: "Nguyên liệu sắp hết",
      value: stats.lowStockCount || 0,
      suffix: " loại",
      icon: <WarningOutlined style={{ fontSize: 24, color: "#d97706" }} />,
      bg: "#fffbeb",
      borderColor: "#fde68a",
      tooltip: "Số nguyên liệu có tồn kho thực tế chạm hoặc dưới định mức tồn tối thiểu.",
      subText: "Dưới ngưỡng định mức",
      highlightColor: "#d97706",
    },
    {
      title: "Nguyên liệu đã hết",
      value: stats.outOfStockCount || 0,
      suffix: " loại",
      icon: <CloseCircleOutlined style={{ fontSize: 24, color: "#dc2626" }} />,
      bg: "#fef2f2",
      borderColor: "#fecaca",
      tooltip: "Số nguyên liệu có số lượng tồn kho bằng 0. Cần tạo phiếu nhập gấp.",
      subText: "Cần nhập hàng ngay",
      highlightColor: "#dc2626",
    },
    {
      title: "Nguyên liệu cần kiểm tra",
      value: stats.needInspectionCount || 0,
      suffix: " loại",
      icon: <SafetyCertificateOutlined style={{ fontSize: 24, color: "#0284c7" }} />,
      bg: "#f0f9ff",
      borderColor: "#bae6fd",
      tooltip: "Số nguyên liệu có biến động sai số tiêu hao hoặc chưa được kiểm tra chất lượng trong ngày.",
      subText: "Chưa kiểm tra hôm nay",
    },
    {
      title: "Nguyên liệu sắp hết hạn",
      value: stats.expiringSoonCount || 0,
      suffix: " loại",
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: "#ea580c" }} />,
      bg: "#fff7ed",
      borderColor: "#ffedd5",
      tooltip: "Số nguyên liệu có hạn sử dụng còn lại dưới hoặc bằng 10 ngày.",
      subText: "Hạn dùng <= 10 ngày",
      highlightColor: "#ea580c",
    },
  ];

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {cardsData.map((card, idx) => (
        <Col xs={24} sm={12} md={8} lg={4} key={idx}>
          <Card
            bordered={false}
            style={{
              height: "100%",
              borderRadius: 14,
              background: card.bg,
              border: `1px solid ${card.borderColor}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              display: "flex",
              flexDirection: "column",
            }}
            bodyStyle={{
              padding: "16px 14px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
            hoverable
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>{card.title}</Text>
                  <Tooltip title={card.tooltip}>
                    <InfoCircleOutlined style={{ fontSize: 11, color: "#94a3b8", cursor: "pointer" }} />
                  </Tooltip>
                </div>
                <div>{card.icon}</div>
              </div>

              <div style={{ fontSize: 18, fontWeight: 700, color: card.highlightColor || "#0f172a", marginBottom: 4 }}>
                {card.value}
                {card.suffix && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b", marginLeft: 4 }}>
                    {card.suffix}
                  </span>
                )}
              </div>
            </div>

            <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", marginTop: 6 }}>
              {card.subText}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default InventoryOverviewCards;
