import { message } from "antd";

const getExportFormattedDate = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
};

const escapeXml = (str) => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const createExcelXML = (sheets) => {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
`;
  sheets.forEach((sheet) => {
    const cleanSheetName = escapeXml(sheet.name.replace(/[:\\/?*\[\]]/g, "").trim().slice(0, 31) || "Sheet");
    xml += ` <Worksheet ss:Name="${cleanSheetName}">\n  <Table>\n`;
    (sheet.rows || []).forEach((row) => {
      xml += "   <Row>\n";
      (row || []).forEach((cell) => {
        const val = escapeXml(cell);
        const isNum = typeof cell === "number";
        xml += `    <Cell><Data ss:Type="${isNum ? "Number" : "String"}">${val}</Data></Cell>\n`;
      });
      xml += "   </Row>\n";
    });
    xml += "  </Table>\n </Worksheet>\n";
  });
  xml += "</Workbook>";
  return xml;
};

const triggerDownload = (content, filename, mimeType = "application/vnd.ms-excel;charset=utf-8;") => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Utility Xuất file Excel chuẩn (.xls/SpreadsheetML)
 * Mở trực tiếp bằng Microsoft Excel, hiển thị chuẩn các cột
 */
export const exportToExcelCSV = (filename, columnDefs, data, summaryRow = null) => {
  try {
    const dateStr = getExportFormattedDate();
    let cleanName = filename.replace(/^MenuGo_/i, "");
    const finalFilename = `MenuGo_${cleanName}_${dateStr}`;

    const headers = columnDefs.map((col) => col.title || "");
    const rows = [headers];

    if (summaryRow && Array.isArray(summaryRow)) {
      const summary = summaryRow.map((val) => (val === null || val === undefined ? "-" : val));
      rows.push(summary);
    }

    (data || []).forEach((row) => {
      const rowData = columnDefs.map((col) => {
        let val = typeof col.field === "function" ? col.field(row) : row[col.field];
        if (val === null || val === undefined) return "-";
        return val;
      });
      rows.push(rowData);
    });

    const xmlContent = createExcelXML([{ name: "Báo cáo", rows }]);
    triggerDownload(xmlContent, `${finalFilename}.xls`);

    message.success(`Đã xuất file Excel: ${finalFilename}.xls`);
  } catch (err) {
    console.error("Lỗi xuất file Excel:", err);
    message.error("Không thể xuất file. Vui lòng thử lại!");
  }
};

/**
 * Utility Xuất nhiều bảng tổng hợp chung 1 file Excel (.xlsx)
 */
export const exportMultipleTablesToExcel = (filename, tablesArray) => {
  try {
    const dateStr = getExportFormattedDate();
    let cleanName = filename.replace(/^MenuGo_/i, "");
    const finalFilename = `MenuGo_${cleanName}_${dateStr}`;

    const sheets = [];

    // Sheet 1: Tổng hợp tất cả các bảng
    const combinedRows = [];

    tablesArray.forEach((tbl) => {
      if (tbl.title) {
        combinedRows.push([`=== ${tbl.title.toUpperCase()} ===`]);
      }
      const headers = tbl.columnDefs.map((col) => col.title || "");
      combinedRows.push(headers);

      (tbl.data || []).forEach((row) => {
        const rowData = tbl.columnDefs.map((col) => {
          let val = typeof col.field === "function" ? col.field(row) : row[col.field];
          if (val === null || val === undefined) return "-";
          return val;
        });
        combinedRows.push(rowData);
      });

      combinedRows.push([]);
    });

    sheets.push({ name: "Tổng hợp", rows: combinedRows });

    // Thêm từng Sheet riêng cho mỗi bảng để xem chi tiết
    tablesArray.forEach((tbl, idx) => {
      const headers = tbl.columnDefs.map((col) => col.title || "");
      const sheetRows = [headers];

      (tbl.data || []).forEach((row) => {
        const rowData = tbl.columnDefs.map((col) => {
          let val = typeof col.field === "function" ? col.field(row) : row[col.field];
          if (val === null || val === undefined) return "-";
          return val;
        });
        sheetRows.push(rowData);
      });

      let sheetName = (tbl.title || `Bảng ${idx + 1}`).trim();
      sheets.push({ name: sheetName, rows: sheetRows });
    });

    const xmlContent = createExcelXML(sheets);
    triggerDownload(xmlContent, `${finalFilename}.xls`);

    message.success(`Đã xuất file Excel: ${finalFilename}.xls`);
  } catch (err) {
    console.error("Lỗi xuất Excel tổng hợp:", err);
    message.error("Không thể xuất file. Vui lòng thử lại!");
  }
};

/**
 * Utility Mở cửa sổ In xem trước (Browser Native Print Dialog)
 */
export const printReportTable = (reportTitle, columnDefs, data, summaryRow = null) => {
  try {
    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
      message.error("Vui lòng cho phép bật cửa sổ bật lên (popup) trên trình duyệt để in!");
      return;
    }

    const dateStr = getExportFormattedDate();
    const todayStr = new Date().toLocaleDateString("vi-VN");
    const docTitle = `MenuGo_${reportTitle.replace(/[\/\s]+/g, "_")}_${dateStr}`;

    const headerHtml = columnDefs
      .map(
        (col) =>
          `<th style="padding: 8px 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: 700; text-align: ${
            col.align || "left"
          }">${col.title}</th>`
      )
      .join("");

    const summaryHtml = summaryRow
      ? `<tr style="background: #fff7ed; font-weight: 700; border-top: 2px solid #ea580c;">
          ${columnDefs
            .map((col, idx) => {
              const val = summaryRow[idx] || "-";
              return `<td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: ${
                col.align || "left"
              }">${val}</td>`;
            })
            .join("")}
        </tr>`
      : "";

    const rowsHtml = data
      .map(
        (row) =>
          `<tr>
            ${columnDefs
              .map((col) => {
                let val = typeof col.field === "function" ? col.field(row) : row[col.field];
                if (val === null || val === undefined) val = "-";
                return `<td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: ${
                  col.align || "left"
                }">${val}</td>`;
              })
              .join("")}
          </tr>`
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>

          <style>
            @media print {
              @page {
                size: A4 landscape;
                margin: 15mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                font-family: Arial, Roboto, sans-serif;
              }
            }
            body {
              font-family: Arial, Roboto, sans-serif;
              color: #0f172a;
              padding: 20px;
            }
            .header-info {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .brand-title {
              font-size: 24px;
              font-weight: 800;
              color: #e8442a;
            }
            .report-title {
              font-size: 20px;
              font-weight: 700;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 13px;
            }
            .footer-sign {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              text-align: center;
            }
            .sign-box {
              width: 200px;
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <div>
              <div class="brand-title">MenuGo Restaurant</div>
              <div class="report-title">${reportTitle}</div>
            </div>
            <div style="text-align: right; font-size: 13px; color: #64748b;">
              <div>Ngày in: <strong>${todayStr}</strong></div>
              <div>Hệ thống quản lý MenuGo</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>${headerHtml}</tr>
            </thead>
            <tbody>
              ${summaryHtml}
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-sign">
            <div class="sign-box">
              <strong>Người lập báo cáo</strong><br/>
              <span style="font-size: 12px; color: #64748b;">(Ký & ghi rõ họ tên)</span>
            </div>
            <div class="sign-box">
              <strong>Quản lý chi nhánh</strong><br/>
              <span style="font-size: 12px; color: #64748b;">(Ký & ghi rõ họ tên)</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } catch (err) {
    console.error("Lỗi khi mở cửa sổ in:", err);
    message.error("Không thể mở cửa sổ xem trước máy in!");
  }
};

/**
 * Utility In chung nhiều Bảng Tổng hợp vào 1 trang in / PDF
 */
export const printMultipleReportTables = (reportTitle, tablesArray) => {
  try {
    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
      message.error("Vui lòng cho phép bật cửa sổ bật lên (popup) trên trình duyệt để in!");
      return;
    }

    const dateStr = getExportFormattedDate();
    const todayStr = new Date().toLocaleDateString("vi-VN");
    const docTitle = `MenuGo_${reportTitle.replace(/[\/\s]+/g, "_")}_${dateStr}`;

    const tablesHtml = tablesArray
      .map((tbl) => {
        const headerHtml = tbl.columnDefs
          .map(
            (col) =>
              `<th style="padding: 8px 10px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: 700; text-align: ${
                col.align || "left"
              }">${col.title}</th>`
          )
          .join("");

        const rowsHtml = tbl.data
          .map(
            (row) =>
              `<tr>
                ${tbl.columnDefs
                  .map((col) => {
                    let val = typeof col.field === "function" ? col.field(row) : row[col.field];
                    if (val === null || val === undefined) val = "-";
                    return `<td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: ${
                      col.align || "left"
                    }">${val}</td>`;
                  })
                  .join("")}
              </tr>`
          )
          .join("");

        return `
          <div style="margin-bottom: 24px;">
            <h3 style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 8px; border-left: 4px solid #ea580c; padding-left: 8px;">
              ${tbl.title}
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead><tr>${headerHtml}</tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        `;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @media print {
              @page { size: A4 landscape; margin: 15mm; }
              body { -webkit-print-color-adjust: exact; font-family: Arial, Roboto, sans-serif; }
            }
            body { font-family: Arial, Roboto, sans-serif; color: #0f172a; padding: 20px; }
            .header-info {
              display: flex; justify-content: space-between; align-items: flex-end;
              border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px;
            }
            .brand-title { font-size: 24px; font-weight: 800; color: #e8442a; }
            .report-title { font-size: 20px; font-weight: 700; margin-top: 4px; }
            .footer-sign { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
            .sign-box { width: 200px; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <div>
              <div class="brand-title">MenuGo Restaurant</div>
              <div class="report-title">${reportTitle}</div>
            </div>
            <div style="text-align: right; font-size: 13px; color: #64748b;">
              <div>Ngày in: <strong>${todayStr}</strong></div>
              <div>Hệ thống quản lý MenuGo</div>
            </div>
          </div>

          ${tablesHtml}

          <div class="footer-sign">
            <div class="sign-box">
              <strong>Người lập báo cáo</strong><br/>
              <span style="font-size: 12px; color: #64748b;">(Ký & ghi rõ họ tên)</span>
            </div>
            <div class="sign-box">
              <strong>Quản lý chi nhánh</strong><br/>
              <span style="font-size: 12px; color: #64748b;">(Ký & ghi rõ họ tên)</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } catch (err) {
    console.error("Lỗi khi in tổng hợp:", err);
    message.error("Không thể mở cửa sổ xem trước máy in!");
  }
};
