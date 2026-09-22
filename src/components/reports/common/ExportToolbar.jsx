import { Dropdown, Button } from "antd";
import {
  DownloadOutlined,
  DownOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { exportToExcelCSV, printReportTable } from "../../homePage/exportUtils";

const ExportToolbar = ({
  reportTitle = "Báo_Cáo",
  columnDefs = [],
  data = [],
  summaryRow = null,
}) => {
  const handleExportExcel = () => {
    exportToExcelCSV(reportTitle, columnDefs, data, summaryRow);
  };

  const handleExportPDF = () => {
    printReportTable(`${reportTitle} IN/PDF`, columnDefs, data, summaryRow);
  };

  const handlePrint = () => {
    printReportTable(reportTitle, columnDefs, data, summaryRow);
  };

  const menuItems = [
    {
      key: "excel",
      icon: <FileExcelOutlined style={{ color: "#16a34a" }} />,
      label: "Xuất file Excel (.csv / .xlsx)",
      onClick: handleExportExcel,
    },
    {
      key: "pdf",
      icon: <FilePdfOutlined style={{ color: "#dc2626" }} />,
      label: "Xuất file PDF (.pdf)",
      onClick: handleExportPDF,
    },
    {
      type: "divider",
    },
    {
      key: "print",
      icon: <PrinterOutlined style={{ color: "#2563eb" }} />,
      label: "Xem trước trang in & Máy in",
      onClick: handlePrint,
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={["click"]}
      placement="bottomRight"
      getPopupContainer={(trigger) => trigger.parentElement}
    >
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        style={{ borderRadius: 6 }}
      >
        Xuất/In <DownOutlined />
      </Button>
    </Dropdown>
  );
};

export default ExportToolbar;
