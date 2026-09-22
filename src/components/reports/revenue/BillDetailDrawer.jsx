import React from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import dayjs from "dayjs";
import {
  Drawer,
  Descriptions,
  Table,
  Tag,
  Typography,
  Divider,
  Space,
  Button,
} from "antd";
import { PrinterOutlined, CheckCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0,
  );

/**
 * Revenue Report Component: BillDetailDrawer
 * Drawer xem chi tiết đầy đủ 1 hóa đơn bán hàng khi click vào bất kỳ dòng nào trong Báo cáo Doanh thu.
 */
const BillDetailDrawer = ({ visible, onClose, billData }) => {
  if (!billData) return null;

  const itemsColumns = [
    { title: "STT", key: "idx", width: 50, render: (_, __, i) => i + 1 },
    { title: "Tên món / Sản phẩm", dataIndex: "name", key: "name" },
    {
      title: "Đơn giá",
      dataIndex: "price",
      key: "price",
      align: "right",
      render: (v) => formatVND(v),
    },
    { title: "SL", dataIndex: "qty", key: "qty", align: "center" },
    {
      title: "Thành tiền",
      dataIndex: "total",
      key: "total",
      align: "right",
      render: (v) => <strong>{formatVND(v)}</strong>,
    },
  ];

  const mockItems = billData.items || [
    { name: "Lẩu Thái Hải Sản Thập Cẩm", price: 350000, qty: 1, total: 350000 },
    { name: "Mực Chấy Tỏi Nước Mắm", price: 165000, qty: 1, total: 165000 },
    { name: "Bia Heineken Silver (Lon)", price: 28000, qty: 6, total: 168000 },
    { name: "Khăn lạnh cao cấp", price: 3000, qty: 4, total: 12000 },
  ];

  return (
    <Drawer
      title={
        <Space>
          <CheckCircleOutlined style={{ color: "#16a34a" }} />
          <span>
            Chi Tiết Hóa Đơn:{" "}
            <strong>{billData.billCode || billData.id}</strong>
          </span>
        </Space>
      }
      width={640}
      open={visible}
      onClose={onClose}
      extra={
        <Button
          icon={<PrinterOutlined />}
          onClick={() => window.print()}
          type="primary"
          style={{ borderRadius: 6 }}
        >
          In lại bill
        </Button>
      }
    >
      {/* Thông tin hóa đơn */}
      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="Mã Hóa Đơn">
          {billData.billCode || billData.id}
        </Descriptions.Item>
        <Descriptions.Item label="Thời gian">
          {billData.date} {billData.time}
        </Descriptions.Item>
        <Descriptions.Item label="Khách hàng">
          {billData.customer || "Khách lẻ"}
        </Descriptions.Item>
        <Descriptions.Item label="Bàn / Khu vực">
          {billData.tableName || "Bàn 12 - Tầng 1"}
        </Descriptions.Item>
        <Descriptions.Item label="Thu ngân">
          {billData.cashier || "Nguyễn Văn An"}
        </Descriptions.Item>
        <Descriptions.Item label="Phương thức TT">
          <Tag color="blue">{billData.paymentMethod || "Tiền mặt"}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <Tag color="success">Đã thanh toán</Tag>
        </Descriptions.Item>
      </Descriptions>

      <Divider style={{ margin: "16px 0" }}>Danh mục món đã chọn</Divider>

      {/* Bảng danh sách món */}
      <Table
        columns={itemsColumns}
        dataSource={mockItems}
        pagination={false}
        size="small"
        rowKey="name"
        bordered
      />

      <Divider style={{ margin: "16px 0" }} />

      {/* Tổng kết tiền */}
      <div
        style={{
          background: "#f8fafc",
          padding: 16,
          borderRadius: 8,
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Text type="secondary">Tiền món ăn:</Text>
          <Text>{formatVND(billData.dishTotal || 695000)}</Text>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Text type="secondary">Phụ thu (Dịch vụ):</Text>
          <Text>{formatVND(billData.surcharge || 0)}</Text>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Text type="secondary">Giảm giá / Voucher:</Text>
          <Text type="danger">-{formatVND(billData.discount || 20000)}</Text>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Text type="secondary">Thuế VAT (8%):</Text>
          <Text>{formatVND(billData.vat || 54000)}</Text>
        </div>
        <Divider style={{ margin: "8px 0" }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Title level={5} style={{ margin: 0 }}>
            Tổng Tiền Thanh Toán:
          </Title>
          <Title level={4} style={{ margin: 0, color: "var(--color-primary)" }}>
            {formatVND(billData.total || 729000)}
          </Title>
        </div>
      </div>

      {/* Receipt Portal for Printing */}
      {createPortal(
        <div className="invoice-print-only">
          <style dangerouslySetInnerHTML={{__html: `
            @media screen {
              .invoice-print-only {
                display: none !important;
              }
            }
            @media print {
              #root {
                display: none !important;
              }
              body {
                background: #fff !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .invoice-print-only {
                display: block !important;
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 auto !important;
                padding: 4mm 2mm !important;
                color: #000 !important;
                font-family: 'Courier New', Courier, monospace !important;
                font-size: 11px !important;
                line-height: 1.4 !important;
              }
              .text-center {
                text-align: center !important;
              }
              .text-right {
                text-align: right !important;
              }
              .text-left {
                text-align: left !important;
              }
              .font-bold {
                font-weight: bold !important;
              }
            }
          `}} />
          
          <div className="text-center font-bold" style={{ fontSize: 13, textTransform: 'uppercase', marginBottom: 2 }}>
            Chi nhánh MenuGo
          </div>
          <div className="text-center" style={{ fontSize: 10, marginBottom: 8, whiteSpace: 'normal', wordBreak: 'break-word' }}>
            Hệ thống nhà hàng MenuGo
          </div>
          
          <div className="text-center font-bold" style={{ fontSize: 14, margin: '10px 0 15px 0', letterSpacing: '0.5px' }}>
            HÓA ĐƠN BÁN HÀNG
          </div>

          <div style={{ marginBottom: 10, fontSize: 10.5 }}>
            <div>Mã HD: <span className="font-bold">{billData.billCode || billData.id}</span></div>
            <div>Thời gian: {billData.date} {billData.time}</div>
            <div>Bàn: {billData.tableName || 'Mang về'}</div>
            <div style={{ height: 4 }} />
            <div>Khách Hàng: {billData.customer || 'Khách lẻ'}</div>
            <div>NVBH: {billData.cashier || 'Thu ngân'}</div>
          </div>

          {/* ITEM TABLE */}
          <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '5px 0', marginBottom: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr className="font-bold" style={{ borderBottom: '1px dashed #000' }}>
                  <th className="text-left" style={{ width: '45%', paddingBottom: 4 }}>Tên món</th>
                  <th className="text-right" style={{ width: '20%', paddingBottom: 4 }}>Giá</th>
                  <th className="text-center" style={{ width: '15%', paddingBottom: 4 }}>SL</th>
                  <th className="text-right" style={{ width: '20%', paddingBottom: 4 }}>T.Tiền</th>
                </tr>
              </thead>
              <tbody>
                {mockItems.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="text-left" style={{ padding: '4px 0', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {item.name || item.productName}
                    </td>
                    <td className="text-right" style={{ padding: '4px 0', verticalAlign: 'top' }}>
                      {Math.round(item.price || item.unitPrice || 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="text-center" style={{ padding: '4px 0', verticalAlign: 'top' }}>
                      {item.qty || item.quantity}
                    </td>
                    <td className="text-right" style={{ padding: '4px 0', verticalAlign: 'top', fontWeight: 'bold' }}>
                      {Math.round(item.total || item.totalPrice || 0).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER SECTION: QR & TOTALS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', marginTop: 12 }}>
            {/* Left: QR Code SVG */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: 8 }}>
              <QRCodeSVG value={billData.billCode || billData.id} size={85} />
            </div>
            
            {/* Right: Totals list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 10, paddingLeft: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Tổng tiền hàng</span>
                <span className="font-bold">{Math.round(billData.dishTotal || billData.total || 0).toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Trừ tiền</span>
                <span>-{Math.round(billData.discount || 0).toLocaleString('vi-VN')} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #000', paddingTop: 4 }}>
                <span className="font-bold">Tổng thanh toán</span>
                <span className="font-bold" style={{ fontSize: 12 }}>{Math.round(billData.total || 0).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>
          
          <div className="text-center" style={{ marginTop: 25, fontSize: 9, fontStyle: 'italic', borderTop: '1px dashed #000', paddingTop: 8 }}>
            Cảm ơn quý khách. Hẹn gặp lại!
          </div>
        </div>,
        document.body
      )}
    </Drawer>
  );
};

export default BillDetailDrawer;
