import React, { useState } from "react";
import {
  Table,
  Tag,
  Button,
  Card,
  Typography,
  Tooltip,
  Dropdown,
  Space,
  Input,
  Collapse,
  Empty,
} from "antd";
import {
  DownloadOutlined,
  PrinterOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  AlertOutlined,
  DownOutlined,
  SearchOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { exportToExcelCSV, printReportTable } from "../../homePage/exportUtils";

const { Title, Text } = Typography;
const { Panel } = Collapse;

const ConsumptionVarianceTable = ({
  items = [],
  varianceThreshold = 5,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [searchText, setSearchText] = useState("");

  // 1. Lọc bất thường: |Sai số %| > 5%
  const abnormalItems = items.filter(
    (item) => Math.abs(item.variancePercent || 0) > varianceThreshold,
  );

  // 2. Tìm kiếm (case-insensitive) theo Tên hoặc Mã nguyên liệu
  const searchedItems = abnormalItems.filter((item) => {
    if (!searchText) return true;
    const term = searchText.toLowerCase();
    const nameMatch = (item.name || "").toLowerCase().includes(term);
    const idMatch = (item.id || "").toLowerCase().includes(term);
    return nameMatch || idMatch;
  });

  // 3. Sắp xếp mặc định: |Sai số %| giảm dần (DESC)
  const sortedData = [...searchedItems].sort((a, b) => {
    return Math.abs(b.variancePercent || 0) - Math.abs(a.variancePercent || 0);
  });

  // Đổi tiêu đề cột xuất/in
  const exportColumnDefs = [
    { title: "Mã NL", field: "id" },
    { title: "Tên nguyên liệu", field: "name" },
    { title: "Nhóm", field: "category" },
    { title: "Đơn vị", field: "unit" },
    {
      title: "Tồn đầu kỳ",
      field: (r) => `${(r.openingStock || 0).toLocaleString()} ${r.unit}`,
      align: "right",
    },
    {
      title: "Nhập",
      field: (r) =>
        `${(r.import || 0) > 0 ? "+" : ""}${(r.import || 0).toLocaleString()} ${r.unit}`,
      align: "right",
    },
    {
      title: "Nhận",
      field: (r) =>
        `${(r.transferIn || 0) > 0 ? "+" : ""}${(r.transferIn || 0).toLocaleString()} ${r.unit}`,
      align: "right",
    },
    {
      title: "Gửi",
      field: (r) =>
        `${(r.transferOut || 0) > 0 ? "-" : ""}${(r.transferOut || 0).toLocaleString()} ${r.unit}`,
      align: "right",
    },
    {
      title: "Tiêu hao định mức",
      field: (r) =>
        `${(r.expectedConsumption || 0) > 0 ? "-" : ""}${(r.expectedConsumption || 0).toLocaleString()} ${r.unit}`,
      align: "right",
    },
    {
      title: "Xuất hủy",
      field: (r) =>
        `${(r.destruction || 0) > 0 ? "-" : ""}${(r.destruction || 0).toLocaleString()} ${r.unit}`,
      align: "right",
    },
    {
      title: "Tồn cuối",
      field: (r) => `${(r.closingStock || 0).toLocaleString()} ${r.unit}`,
      align: "right",
    },
    {
      title: "Chênh lệch",
      field: (r) =>
        `${(r.variance || 0) > 0 ? "+" : ""}${(r.variance || 0).toLocaleString()} ${r.unit}`,
      align: "right",
    },
    {
      title: "Tồn lý thuyết",
      field: (r) => `${(r.theoreticalStock || 0).toLocaleString()} ${r.unit}`,
      align: "right",
    },
    {
      title: "Sai số (%)",
      field: (r) =>
        `${(r.variancePercent || 0) > 0 ? "+" : ""}${r.variancePercent}%`,
      align: "center",
    },
  ];

  const handleExportExcel = () => {
    exportToExcelCSV(
      "Bao_Cao_Tieu_Thu_Bat_Thuong",
      exportColumnDefs,
      sortedData,
    );
  };

  const handleExportPDF = () => {
    printReportTable(
      "Bao_Cao_Tieu_Thu_Bat_Thuong_IN_PDF",
      exportColumnDefs,
      sortedData,
    );
  };

  const handlePrint = () => {
    printReportTable(
      "Bao_Cao_Tieu_Thu_Bat_Thuong",
      exportColumnDefs,
      sortedData,
    );
  };

  const exportMenuItems = [
    {
      key: "excel",
      icon: <FileExcelOutlined style={{ color: "#16a34a" }} />,
      label: "Xuất Excel (.xlsx / .csv)",
      onClick: handleExportExcel,
    },
    {
      key: "pdf",
      icon: <FilePdfOutlined style={{ color: "#dc2626" }} />,
      label: "Xuất PDF (.pdf)",
      onClick: handleExportPDF,
    },
    {
      type: "divider",
    },
    {
      key: "print",
      icon: <PrinterOutlined style={{ color: "#2563eb" }} />,
      label: "In trang báo cáo",
      onClick: handlePrint,
    },
  ];

  const columns = [
    {
      title: "Nguyên liệu",
      dataIndex: "name",
      key: "name",
      minWidth: 160,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a" }}>{text}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Mã: {record.id} | Nhóm: {record.category || "N/A"}
          </div>
        </div>
      ),
    },
    {
      title: "Tồn đầu",
      dataIndex: "openingStock",
      key: "openingStock",
      align: "right",
      render: (val, record) => (
        <span style={{ fontWeight: 500, color: "#475569" }}>
          {val.toLocaleString()} {record.unit}
        </span>
      ),
    },
    {
      title: "Nhập",
      dataIndex: "import",
      key: "import",
      align: "right",
      render: (val, record) => (
        <span style={{ fontWeight: 500, color: "#16a34a" }}>
          {val > 0 ? "+" : ""}
          {val.toLocaleString()} {record.unit}
        </span>
      ),
    },
    {
      title: "Nhận",
      dataIndex: "transferIn",
      key: "transferIn",
      align: "right",
      render: (val, record) => (
        <span style={{ fontWeight: 500, color: "#0ea5e9" }}>
          {val > 0 ? "+" : ""}
          {val.toLocaleString()} {record.unit}
        </span>
      ),
    },
    {
      title: "Gửi",
      dataIndex: "transferOut",
      key: "transferOut",
      align: "right",
      render: (val, record) => (
        <span style={{ fontWeight: 500, color: "#f59e0b" }}>
          {val > 0 ? "-" : ""}
          {val.toLocaleString()} {record.unit}
        </span>
      ),
    },
    {
      title: "Tiêu hao định mức",
      dataIndex: "expectedConsumption",
      key: "expectedConsumption",
      align: "right",
      render: (val, record) => (
        <span style={{ fontWeight: 600, color: "#2563eb" }}>
          {val > 0 ? "-" : ""}
          {val.toLocaleString()} {record.unit}
        </span>
      ),
    },
    {
      title: "Xuất hủy",
      dataIndex: "destruction",
      key: "destruction",
      align: "right",
      render: (val, record) => (
        <span style={{ fontWeight: 500, color: "#dc2626" }}>
          {val > 0 ? "-" : ""}
          {(val || 0).toLocaleString()} {record.unit}
        </span>
      ),
    },
    {
      title: "Tồn lý thuyết",
      dataIndex: "theoreticalStock",
      key: "theoreticalStock",
      align: "right",
      render: (val, record) => (
        <span style={{ fontWeight: 600, color: "#64748b" }}>
          {(val || 0).toLocaleString()} {record.unit}
        </span>
      ),
    },
    {
      title: "Tồn cuối",
      dataIndex: "closingStock",
      key: "closingStock",
      align: "right",
      render: (val, record) => {
        const isZero = val === 0;
        return (
          <span
            style={{ fontWeight: 700, color: isZero ? "#dc2626" : "#16a34a" }}
          >
            {val.toLocaleString()} {record.unit}
          </span>
        );
      },
    },
    {
      title: "Chênh lệch",
      dataIndex: "variance",
      key: "variance",
      align: "right",
      render: (val, record) => {
        const isPos = val > 0;
        return (
          <span
            style={{
              fontWeight: 700,
              color: val === 0 ? "#475569" : isPos ? "#dc2626" : "#2563eb",
            }}
          >
            {val === 0 ? "" : isPos ? "+" : ""}
            {val.toLocaleString()} {record.unit}
          </span>
        );
      },
    },

    {
      title: "Sai số (%)",
      dataIndex: "variancePercent",
      key: "variancePercent",
      align: "center",
      render: (val) => {
        const isPos = val > 0;
        return (
          <Tag
            color={val === 0 ? "default" : isPos ? "error" : "processing"}
            style={{
              fontWeight: 700,
              fontSize: 12,
              padding: "2px 8px",
              borderRadius: 12,
            }}
          >
            {val !== 0 && <AlertOutlined style={{ marginRight: 4 }} />}
            {val === 0 ? "0%" : isPos ? "+" : ""}
            {val}%
          </Tag>
        );
      },
    },
  ];

  return (
    <Card
      style={{
        borderRadius: isFullscreen ? 0 : 16,
        marginBottom: isFullscreen ? 0 : 24,
        boxShadow: isFullscreen ? "none" : "0 2px 12px rgba(0,0,0,0.03)",
        border: isFullscreen ? "none" : "1px solid #e2e8f0",
      }}
      bodyStyle={{ padding: isFullscreen ? 16 : "20px 24px" }}
    >
      {/* Title */}
      {!isFullscreen && (
        <div style={{ marginBottom: 16 }}>
          <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
            🍽️ Báo cáo Tiêu thụ & Biến động Sai số Nguyên liệu
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Giám sát mức độ bất thường về tiêu hao của các nguyên liệu có sai số
            tuyệt đối lớn hơn <strong>{varianceThreshold}%</strong>.
          </Text>
        </div>
      )}

      {/* 📖 Hướng dẫn đọc báo cáo */}
      <Collapse
        ghost
        style={{
          marginBottom: 16,
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
        }}
      >
        <Panel
          header={
            <Space>
              <InfoCircleOutlined style={{ color: "#3b82f6" }} />
              <strong style={{ color: "#1e293b" }}>
                Cách đọc báo cáo (Nhấp để xem hướng dẫn)
              </strong>
            </Space>
          }
          key="1"
        >
          <div style={{ fontSize: 13, lineHeight: "1.6", color: "#475569" }}>
            {/* Mục đích báo cáo */}
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderLeft: "4px solid #0284c7", padding: "10px 14px", borderRadius: 6, marginBottom: 14 }}>
              <strong style={{ color: "#0c4a6e" }}>🎯 Mục đích của báo cáo này là gì?</strong>
              <div style={{ color: "#075985", marginTop: 6 }}>
                Báo cáo giúp bạn <strong>theo dõi hiệu quả quản lý nguyên liệu trong từng kỳ</strong> — phản ánh trung thực mức độ khớp giữa lượng nguyên liệu tiêu hao theo định mức và tồn kho thực tế.
                <ul style={{ paddingLeft: 20, margin: "8px 0 0" }}>
                  <li style={{ marginBottom: 4 }}>
                    <strong>Sai số thuộc về kỳ phát sinh:</strong> Mỗi kỳ báo cáo có Tồn đầu kỳ độc lập. Nếu trong kỳ xảy ra sai số, sai số đó <em>được ghi nhận và giữ nguyên tại kỳ đó</em> — không tự động chuyển sang kỳ tiếp theo.
                  </li>
                  <li style={{ marginBottom: 4 }}>
                    <strong>Ví dụ:</strong> Bạn chọn kỳ xem là cả năm. Nếu tháng 3 có 1 tháng quản lý bất thường (sai số lớn), báo cáo của cả năm đó sẽ phản ánh sai số đó. Nhưng sang năm sau, nếu vận hành tốt, sai số sẽ không còn xuất hiện.
                  </li>
                  <li>
                    <strong>Kỳ sau bắt đầu từ thực tế:</strong> Tồn đầu kỳ tiếp theo được tính từ Tồn cuối thực tế của kỳ này (hoặc kết quả Kiểm kho gần nhất), đảm bảo mỗi kỳ theo dõi độc lập và minh bạch.
                  </li>
                </ul>
              </div>
            </div>

            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li>
                Báo cáo chỉ hiển thị nguyên liệu có sai số vượt ngưỡng 5%.
              </li>
              <li>
                Sai số được tính dựa trên chênh lệch giữa Tồn cuối thực tế và Tồn lý thuyết (tính từ tồn đầu kỳ, nhập, xuất và tiêu hao định mức theo các món bán ra).
              </li>
              <li>
                Sai số dương (+): Tồn cuối <em>cao hơn</em> lý thuyết — có thể có hàng nhận chưa lập phiếu hoặc bếp dùng ít hơn định mức.
              </li>
              <li>
                Sai số âm (-): Tồn cuối <em>thấp hơn</em> lý thuyết — có thể có hao hụt, thất thoát hoặc bếp dùng nhiều hơn định mức.
              </li>
              <li>
                Các nguyên liệu được sắp xếp theo mức độ bất thường từ cao xuống
                thấp (dựa trên trị tuyệt đối của sai số %).
              </li>
              <li>
                Quản lý chi nhánh nên ưu tiên kiểm tra các nguyên liệu ở đầu
                bảng trước.
              </li>
              <li>
                <strong>Khi nào báo cáo sẽ hiển thị sai số?</strong>
                <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderLeft: "3px solid #f59e0b", borderRadius: 6, padding: "8px 10px", fontSize: 12, marginTop: 6 }}>
                  <div style={{ fontWeight: 600, color: "#92400e", marginBottom: 4 }}>💡 Nguyên tắc quan trọng cần hiểu trước:</div>
                  <div style={{ color: "#78350f" }}>
                    Khi mọi phiếu nghiệp vụ được lập đầy đủ, <strong>Tồn cuối và Tồn lý thuyết luôn bằng nhau</strong> vì cả hai đều tính từ cùng một tập giao dịch. Vì vậy, <strong>sai số chỉ xuất hiện khi có phiếu Kiểm kho</strong> với số đếm thực tế khác Tồn lý thuyết.
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderLeft: "3px solid #ef4444", borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>🔻 Kiểm kho ra sai số ÂM</div>
                    <div style={{ color: "#7f1d1d", marginBottom: 4 }}>Số đếm thực tế <strong>thấp hơn</strong> Tồn lý thuyết. Điều này có nghĩa là trong kỳ đã xảy ra một hoặc nhiều tình huống:</div>
                    <ul style={{ paddingLeft: 14, margin: 0, color: "#7f1d1d" }}>
                      <li>Bếp dùng nhiều hơn định mức công thức (nêm nếm, rơi vãi)</li>
                      <li>Nguyên liệu hỏng, ôi thiu đã bị bỏ đi nhưng <em>chưa lập phiếu Xuất hủy trước khi Kiểm kho</em></li>
                      <li>Đã sản xuất mẻ bán sẵn nhưng <em>chưa lập phiếu Sản xuất trước khi Kiểm kho</em></li>
                      <li>Thất thoát, mất mát không rõ nguyên nhân</li>
                    </ul>
                  </div>
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderLeft: "3px solid #22c55e", borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "#15803d", marginBottom: 4 }}>🔺 Kiểm kho ra sai số DƯƠNG</div>
                    <div style={{ color: "#14532d", marginBottom: 4 }}>Số đếm thực tế <strong>cao hơn</strong> Tồn lý thuyết. Điều này có nghĩa là trong kỳ đã xảy ra một hoặc nhiều tình huống:</div>
                    <ul style={{ paddingLeft: 14, margin: 0, color: "#14532d" }}>
                      <li>Đã nhận hàng nhưng <em>chưa lập phiếu Nhập kho trước khi Kiểm kho</em></li>
                      <li>Đã nhận chuyển kho nhưng <em>chưa xác nhận phiếu trước khi Kiểm kho</em></li>
                      <li>Bếp dùng ít hơn định mức công thức (tiết kiệm, đong thiếu)</li>
                      <li>Kỳ trước Kiểm kho đếm thiếu, Tồn đầu kỳ này thấp hơn thực tế</li>
                    </ul>
                  </div>
                </div>
                <div style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", fontSize: 12, marginTop: 8, color: "#475569" }}>
                  📌 <strong>Tóm lại:</strong> Báo cáo này có ý nghĩa nhất khi bạn thực hiện <strong>Kiểm kho định kỳ</strong>. Không có Kiểm kho → không có sai số → báo cáo trống không có nghĩa là quản lý tốt, mà là chưa đối chiếu thực tế.
                </div>
              </li>
            </ol>

            <div style={{ marginTop: 8, fontWeight: 600, color: "#1e293b" }}>
              📋 Giải thích các cột dữ liệu & công thức tính:
            </div>
            <ul style={{ paddingLeft: 20, margin: 0, fontSize: 12 }}>
              <li>
                <strong>Tồn đầu</strong>: Tồn kho nguyên liệu tại thời điểm bắt
                đầu kỳ báo cáo.
              </li>
              <li>
                <strong>Nhập (+)</strong>: Tổng lượng nguyên liệu nhập kho mua
                từ Nhà cung cấp trong kỳ báo cáo.
              </li>
              <li>
                <strong>Nhận (+)</strong>: Lượng nguyên liệu nhận chuyển kho từ
                các chi nhánh khác gửi đến.
              </li>
              <li>
                <strong>Gửi (-)</strong>: Lượng nguyên liệu xuất chuyển kho gửi
                đi các chi nhánh khác.
              </li>
              <li>
                <strong>Tiêu hao định mức (-)</strong>: Lượng tiêu hao lý thuyết
                tính theo hóa đơn bán hàng nhân với định lượng công thức món ăn
                (Recipe).
              </li>
              <li>
                <strong>Xuất hủy (-)</strong>: Lượng nguyên liệu bị hỏng, mất
                hoặc hủy bỏ trong quá trình vận hành.
              </li>
              <li>
                <strong>Tồn lý thuyết</strong>: Tồn cuối lẽ ra phải còn trong
                kho theo lý thuyết tính theo công thức:{" "}
                <code>
                  Tồn đầu + Nhập + Nhận - Gửi - Tiêu hao định mức - Xuất hủy - Sản xuất - Trả hàng
                </code>
                .
              </li>
              <li>
                <strong>Tồn cuối</strong>: Tồn kho thực tế còn lại tại thời điểm
                kết thúc kỳ báo cáo.
              </li>
              <li>
                <strong>Chênh lệch</strong>: Lượng chênh lệch giữa Tồn cuối
                và Tồn lý thuyết được tính theo công thức:{" "}
                <code>Tồn cuối - Tồn lý thuyết</code>.
              </li>
              <li>
                <strong>Sai số (%)</strong>: Tỷ lệ chênh lệch phần trăm tính
                theo công thức:{" "}
                <code>(Chênh lệch / Tiêu hao định mức) * 100</code>.
              </li>
            </ul>
          </div>
        </Panel>
      </Collapse>

      {/* Toolbar: Refresh, Search Box, Export/Print Actions, Fullscreen */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          background: "#f8fafc",
          padding: "12px 16px",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            flex: 1,
          }}
        >
          {/* Refresh Button */}
          <Tooltip title="Làm mới bảng">
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              style={{ borderRadius: 8 }}
            />
          </Tooltip>

          {/* Search Box */}
          <Input
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            placeholder="Tìm kiếm nguyên liệu..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280, borderRadius: 8 }}
            allowClear
          />
        </div>

        {/* Right Actions */}
        <Space size={8}>
          <Dropdown menu={{ items: exportMenuItems }} trigger={["click"]}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              style={{
                backgroundColor: "var(--color-primary)",
                borderColor: "var(--color-primary)",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              Xuất / In <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
            </Button>
          </Dropdown>

          <Tooltip
            title={isFullscreen ? "Thoát toàn màn hình" : "Xem toàn màn hình"}
          >
            <Button
              icon={
                isFullscreen ? (
                  <FullscreenExitOutlined />
                ) : (
                  <FullscreenOutlined />
                )
              }
              onClick={onToggleFullscreen}
              style={{ borderRadius: 8 }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Empty State / Table */}
      {abnormalItems.length === 0 ? (
        <Empty
          description={
            <div style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
              Không có nguyên liệu nào có sai số vượt ngưỡng 5%.
            </div>
          }
          style={{ padding: "40px 0" }}
        />
      ) : sortedData.length === 0 ? (
        <Empty
          description={
            <div style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
              Tìm thấy 0 nguyên liệu bất thường.
            </div>
          }
          style={{ padding: "40px 0" }}
        />
      ) : (
        <div style={{ height: "450px", overflow: "auto" }}>
          <Table
            columns={columns}
            dataSource={sortedData}
            rowKey="id"
            pagination={false}
            bordered={false}
            style={{ minWidth: 1600 }}
          />
        </div>
      )}
    </Card>
  );
};

export default ConsumptionVarianceTable;
