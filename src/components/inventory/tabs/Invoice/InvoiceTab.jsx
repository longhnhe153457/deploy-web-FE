import React, { useState, useEffect, useCallback } from 'react';
import InvoiceTable from './InvoiceTable';
import { getPaidInvoices } from '../../../../api/orderApi';

const InvoiceTab = ({ selectedBranchId }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const res = await getPaidInvoices(selectedBranchId);
      const data = res.data || [];
      const mapped = data.map((ord) => ({
        id: ord.id,
        code: ord.orderCode || `HD${ord.id}`,
        date: ord.createdAt,
        customer: ord.customerName || (ord.customerId ? `Khách hàng #${ord.customerId}` : 'Khách lẻ'),
        customerPhone: ord.customerPhone || '',
        total: ord.totalAmount || 0,
        discountAmount: ord.discountAmount || 0,
        pointsUsed: ord.pointsUsed || 0,
        voucherCode: ord.voucherCode || '',
        createdByName: ord.createdByName || 'Thu ngân',
        tableName: ord.tableName || (ord.tableId ? `Bàn #${ord.tableId}` : 'Mang về'),
        areaName: ord.areaName || '',
        paymentMethod: ord.paymentMethod || 'Tiền mặt',
        status: ord.status || 'Paid',
        details: ord.orderDetails || [],
        ...ord
      }));
      setInvoices(mapped);
    } catch (err) {
      console.error('Failed to load paid invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      <InvoiceTable
        invoices={invoices}
        loading={loading}
        onRefresh={fetchInvoices}
      />
    </div>
  );
};

export default InvoiceTab;
