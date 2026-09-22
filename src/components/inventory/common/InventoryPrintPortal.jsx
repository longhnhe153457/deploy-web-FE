import React from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';

const InventoryPrintPortal = ({
  title = 'PHIẾU KHO HÀNG HÓA',
  subTitle = '',
  docCode = '',
  branchName = '',
  branchAddress = '',
  metaItems = [], // Array of { label: string, value: any }
  signatures = [
    { title: 'Người lập phiếu', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
    { title: 'Người giao hàng', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
    { title: 'Thủ kho / Người nhận', subtitle: '(Ký, ghi rõ họ tên)', name: '' },
    { title: 'Kế toán / Quản lý duyệt', subtitle: '(Ký, ghi rõ họ tên)', name: '' }
  ],
  children
}) => {
  const currentBranch = branchName || localStorage.getItem('currentBranchName') || 'Chi nhánh MenuGo';
  const printTime = dayjs().format('DD/MM/YYYY HH:mm');

  return createPortal(
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media screen {
          .inventory-print-portal {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
          }
          body > :not(.inventory-print-portal) {
            display: none !important;
          }
          #root,
          .ant-message,
          .ant-notification,
          .ant-modal-root,
          .ant-drawer-root {
            display: none !important;
          }
          .inventory-print-portal {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            font-family: 'Times New Roman', Times, serif !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
            color: #000000 !important;
            background: #ffffff !important;
          }
          .inventory-print-portal * {
            box-sizing: border-box !important;
            color: #000000 !important;
          }
          .print-header-top {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            border-bottom: 1.5px solid #000000 !important;
            padding-bottom: 8px !important;
            margin-bottom: 12px !important;
          }
          .print-header-left {
            text-align: left !important;
            line-height: 1.3 !important;
          }
          .print-company-name {
            font-size: 13px !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
          }
          .print-branch-name {
            font-size: 12px !important;
            font-weight: 600 !important;
          }
          .print-header-right {
            text-align: right !important;
            font-size: 11.5px !important;
            line-height: 1.35 !important;
          }
          .print-doc-title {
            text-align: center !important;
            font-size: 18px !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            margin: 10px 0 4px 0 !important;
          }
          .print-doc-subtitle {
            text-align: center !important;
            font-size: 12px !important;
            font-style: italic !important;
            margin-bottom: 14px !important;
            color: #222222 !important;
          }
          .print-meta-box {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            column-gap: 20px !important;
            row-gap: 5px !important;
            border: 1px solid #111111 !important;
            border-radius: 3px !important;
            padding: 8px 12px !important;
            margin-bottom: 14px !important;
            font-size: 12px !important;
            background: #fafafa !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-meta-item {
            display: flex !important;
            justify-content: space-between !important;
            align-items: baseline !important;
          }
          .print-meta-label {
            font-weight: 600 !important;
            color: #333333 !important;
          }
          .print-meta-val {
            font-weight: 700 !important;
            text-align: right !important;
          }
          .print-section-heading {
            font-size: 12.5px !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            margin: 12px 0 5px 0 !important;
            letter-spacing: 0.2px !important;
          }
          .inventory-print-portal table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 4px !important;
            margin-bottom: 12px !important;
          }
          .inventory-print-portal th, 
          .inventory-print-portal td {
            border: 1px solid #000000 !important;
            padding: 5px 6px !important;
            font-size: 11.5px !important;
            word-break: break-word !important;
          }
          .inventory-print-portal th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-weight: 700 !important;
            text-align: center !important;
          }
          .print-text-center {
            text-align: center !important;
          }
          .print-text-right {
            text-align: right !important;
          }
          .print-text-left {
            text-align: left !important;
          }
          .print-font-bold {
            font-weight: 700 !important;
          }
          .print-signatures-container {
            display: flex !important;
            justify-content: space-between !important;
            margin-top: 24px !important;
            page-break-inside: avoid !important;
            text-align: center !important;
          }
          .print-signature-col {
            flex: 1 !important;
            font-size: 12px !important;
            padding: 0 4px !important;
          }
          .print-sig-title {
            font-weight: 700 !important;
            margin-bottom: 3px !important;
          }
          .print-sig-subtitle {
            font-size: 10.5px !important;
            font-style: italic !important;
            color: #444444 !important;
          }
          .print-sig-space {
            height: 52px !important;
          }
          .print-sig-name {
            font-weight: 700 !important;
            font-size: 12px !important;
          }
        }
      `}} />

      <div className="inventory-print-portal">
        <div className="print-header-top">
        <div className="print-header-left">
          <div className="print-company-name">HỆ THỐNG NHÀ HÀNG MENUGO</div>
          <div className="print-branch-name">Địa điểm: {currentBranch}</div>
          {branchAddress && <div style={{ fontSize: 11, color: '#333' }}>{branchAddress}</div>}
        </div>
        <div className="print-header-right">
          {docCode && <div><strong>Mã phiếu:</strong> {docCode}</div>}
          <div><strong>Ngày in:</strong> {printTime}</div>
        </div>
      </div>

      <div className="print-doc-title">{title}</div>
      {subTitle && <div className="print-doc-subtitle">{subTitle}</div>}

      {metaItems && metaItems.length > 0 && (
        <div className="print-meta-box">
          {metaItems.map((item, idx) => (
            <div key={idx} className="print-meta-item">
              <span className="print-meta-label">{item.label}:</span>
              <span className="print-meta-val">{item.value || '---'}</span>
            </div>
          ))}
        </div>
      )}

      {children}

      {signatures && signatures.length > 0 && (
        <div className="print-signatures-container">
          {signatures.map((sig, idx) => (
            <div key={idx} className="print-signature-col">
              <div className="print-sig-title">{sig.title}</div>
              <div className="print-sig-subtitle">{sig.subtitle || '(Ký, họ tên)'}</div>
              <div className="print-sig-space" />
              <div className="print-sig-name">{sig.name || ''}</div>
            </div>
          ))}
        </div>
      )}
      </div>
    </>,
    document.body
  );
};

export default InventoryPrintPortal;
