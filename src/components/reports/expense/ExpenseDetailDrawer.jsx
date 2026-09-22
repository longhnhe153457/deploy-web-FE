import React from "react";
import {
  Drawer,
  Descriptions,
  Tag,
  Typography,
  Divider,
  Space,
  Button,
} from "antd";
import { PrinterOutlined, FileProtectOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

/**
 * Expense Report Component: ExpenseDetailDrawer
 * Drawer xem chi tiết phiếu chi khi click vào bất kỳ dòng nào trong Báo cáo Chi phí.
 */
const ExpenseDetailDrawer = ({ visible, onClose, expenseData }) => {
  if (!expenseData) return null;

  return (
    <Drawer
      title={
        <Space>
          <FileProtectOutlined style={{ color: "#ef4444" }} />
          <span>
            Chi Tiết Phiếu Chi:{" "}
            <strong>{expenseData.expenseCode || expenseData.id}</strong>
          </span>
        </Space>
      }
      width={600}
      open={visible}
      onClose={onClose}
      extra={
        <Button
          icon={<PrinterOutlined />}
          onClick={() => window.print()}
          type="primary"
          style={{ borderRadius: 6 }}
        >
          In phiếu chi
        </Button>
      }
    >
      {/* Thông tin chứng từ chi */}
      <Descriptions
        size="small"
        column={2}
        bordered
        style={{ marginBottom: 20 }}
      >
        <Descriptions.Item label="Mã Phiếu Chi">
          {expenseData.expenseCode || expenseData.id}
        </Descriptions.Item>
        <Descriptions.Item label="Thời gian">
          {expenseData.date} {expenseData.time}
        </Descriptions.Item>
        <Descriptions.Item label="Loại Chi Phí">
          <Tag color="purple">
            {expenseData.category || "Nguyên liệu & Thực phẩm"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Nhà Cung Cấp">
          {expenseData.supplier || "NPP Thực Phẩm Sạch Hải Đăng"}
        </Descriptions.Item>
        <Descriptions.Item label="Người Tạo Phiếu">
          {expenseData.createdBy || "Lê Hoàng Cường"}
        </Descriptions.Item>
        <Descriptions.Item label="Phương Thức TT">
          {expenseData.paymentMethod || "Chuyển khoản Ngân hàng"}
        </Descriptions.Item>
        <Descriptions.Item label="Mã Chứng Từ Gốc">
          {expenseData.docRef || "HD-NHAP-2026-088"}
        </Descriptions.Item>
        <Descriptions.Item label="Trạng Thái">
          <Tag color="success">
            {expenseData.status || "Đã duyệt & Chi tiền"}
          </Tag>
        </Descriptions.Item>
      </Descriptions>

      {/* Nội dung ghi chú */}
      <div
        style={{
          background: "#f8fafc",
          padding: 14,
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          marginBottom: 20,
        }}
      >
        <Text
          strong
          style={{ display: "block", marginBottom: 4, color: "#334155" }}
        >
          Ghi chú / Lý do chi:
        </Text>
        <Text type="secondary">
          {expenseData.notes ||
            "Thanh toán dứt điểm lô nguyên liệu thịt bò Mỹ & hải sản tươi nhập kho sáng ngày 01/08."}
        </Text>
      </div>

      <Divider style={{ margin: "16px 0" }} />

      {/* Tổng giá trị phiếu chi */}
      <div
        style={{
          background: "#fff5f5",
          padding: 16,
          borderRadius: 8,
          border: "1px solid #fecaca",
          textAlign: "right",
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: "#7f1d1d",
            display: "block",
            marginBottom: 4,
          }}
        >
          Tổng Giá Trị Chi Tiền:
        </Text>
        <Title level={3} style={{ margin: 0, color: "#dc2626" }}>
          {formatVND(expenseData.amount || 28000000)}
        </Title>
      </div>
    </Drawer>
  );
};

export default ExpenseDetailDrawer;
