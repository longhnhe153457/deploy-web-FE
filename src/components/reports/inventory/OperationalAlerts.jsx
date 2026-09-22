import React from "react";
import { Card, Typography, List, Tag, Button, Tooltip, Badge } from "antd";
import {
  BellOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  RightOutlined,
  AlertOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const OperationalAlerts = ({ alerts = [] }) => {
  const getSeverityStyle = (severity) => {
    switch (severity) {
      case "danger":
        return {
          bg: "#fef2f2",
          border: "#fecaca",
          text: "#dc2626",
          icon: <CloseCircleOutlined style={{ fontSize: 18, color: "#dc2626" }} />,
          tagColor: "error",
        };
      case "warning":
        return {
          bg: "#fffbeb",
          border: "#fde68a",
          text: "#d97706",
          icon: <WarningOutlined style={{ fontSize: 18, color: "#d97706" }} />,
          tagColor: "warning",
        };
      case "info":
      default:
        return {
          bg: "#f0f9ff",
          border: "#bae6fd",
          text: "#0284c7",
          icon: <SafetyCertificateOutlined style={{ fontSize: 18, color: "#0284c7" }} />,
          tagColor: "processing",
        };
    }
  };

  return (
    <Card
      style={{
        borderRadius: 16,
        marginBottom: 24,
        boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
        border: "1px solid #e2e8f0",
      }}
      bodyStyle={{ padding: "20px 24px" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Badge count={alerts.length} offset={[10, 0]}>
            <BellOutlined style={{ fontSize: 22, color: "#e8442a" }} />
          </Badge>
          <div>
            <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
              🚨 Cảnh báo Vận hành Kho Nguyên liệu
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Danh sách thông báo khẩn cấp cần Bếp trưởng và Quản lý xử lý ngay lập tức trong ca làm việc.
            </Text>
          </div>
        </div>

        <Tag color="error" style={{ fontWeight: 700, borderRadius: 10 }}>
          <AlertOutlined style={{ marginRight: 4 }} />
          {alerts.filter((a) => a.severity === "danger").length} cảnh báo đỏ
        </Tag>
      </div>

      <div style={{ maxHeight: "380px", overflowY: "auto", paddingRight: 4 }}>
        <List
          dataSource={alerts}
          renderItem={(item) => {
            const style = getSeverityStyle(item.severity);
          return (
            <List.Item
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: 12,
                marginBottom: 10,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ marginTop: 2 }}>{style.icon}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                      {item.title}
                    </span>
                    <Tag color={style.tagColor} style={{ fontSize: 10, fontWeight: 600 }}>
                      {item.timestamp}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                    {item.message}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {item.actionRequired && (
                  <Button
                    size="small"
                    type="primary"
                    danger={item.severity === "danger"}
                    style={{
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {item.actionRequired} <RightOutlined style={{ fontSize: 10 }} />
                  </Button>
                )}
              </div>
            </List.Item>
          );
        }}
      />
      </div>
    </Card>
  );
};

export default OperationalAlerts;
