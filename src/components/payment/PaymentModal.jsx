import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Modal, Table, Typography, Button, message, Divider, Input, Checkbox, Row, Col, Radio, QRCode, Select } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { payOrder, getOrderById } from '../../api/orderApi';
import { createPaymentLink, checkPaymentStatus } from '../../api/paymentApi';
import { checkVoucher, getAllVouchers } from '../../api/voucherApi';
import { configApi } from '../../api/configApi';
import CustomerSearchInput from '../common/CustomerSearchInput';
import { useSignalR } from '../../context/SignalRContext';

const { Text, Title } = Typography;

const formatPrice = (price) => Number(price).toLocaleString('vi-VN') + 'đ';

const PaymentModal = ({ visible, orderId, tableName, items, branchId, onCancel, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerDeclined, setCustomerDeclined] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [qrCodeData, setQrCodeData] = useState(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [usePoints, setUsePoints] = useState(false);
  const [allVouchers, setAllVouchers] = useState([]);
  const [cashTendered, setCashTendered] = useState('');
  const [pointConfig, setPointConfig] = useState({ minPointsToUse: 50000, maxDiscountPercentage: 50 });

  const connection = useSignalR();

  useEffect(() => {
    if (visible) {
      setCustomerPhone('');
      setCustomerName('');
      setCustomerData(null);
      setCustomerDeclined(false);
      setPaymentMethod('Cash');
      setQrCodeData(null);
      setVoucherCode('');
      setAppliedVoucher(null);
      setUsePoints(false);
      setCashTendered('');

      const fetchVouchers = async () => {
        try {
          const data = await getAllVouchers();
          setAllVouchers(data || []);
        } catch (error) {
          console.error('Lỗi khi tải voucher:', error);
        }
      };
      const fetchConfig = async () => {
        try {
          const config = await configApi.getPointSystemConfig();
          setPointConfig(config || { minPointsToUse: 50000, maxDiscountPercentage: 50 });
        } catch (error) {
          console.error('Lỗi khi tải cấu hình điểm:', error);
        }
      };

      const fetchOrderValidation = async () => {
        if (!orderId) return;
        try {
          const res = await getOrderById(orderId);
          if (res.data && res.data.status === 'Paid') {
            message.success('Bàn này đã được thanh toán xong!');
            if (onCancel) onCancel();
            if (onSuccess) onSuccess();
          }
        } catch (error) {
          if (error?.response?.status === 404) {
            message.warning('Bàn này đã được thanh toán xong hoặc không còn đơn hàng! Hệ thống sẽ làm mới.');
            if (onCancel) onCancel();
            if (onSuccess) onSuccess();
          }
        }
      };

      fetchVouchers();
      fetchConfig();
      fetchOrderValidation();
    }
  }, [visible, orderId]);

  useEffect(() => {
    if (connection && visible && paymentMethod === 'PayOS') {
      const handleNotification = (data) => {
        if (!data) return;
        const isWebhook = data.type === 'PaymentWebhook' || data.Type === 'PaymentWebhook';
        const eventOrderId = data.orderId || data.OrderId;

        if (isWebhook && Number(eventOrderId) === Number(orderId)) {
          message.success(data.message || data.Message || 'Thanh toán thành công qua PayOS!');
          if (onSuccess) onSuccess();
        }
      };
      connection.on('ReceiveNotification', handleNotification);
      return () => connection.off('ReceiveNotification', handleNotification);
    }
  }, [connection, visible, paymentMethod, onSuccess, orderId]);

  useEffect(() => {
    // Xóa mã QR cũ nếu người dùng thay đổi giảm giá hoặc đổi phương thức thanh toán
    setQrCodeData(null);
  }, [appliedVoucher, usePoints, paymentMethod, customerData]);

  const handleSelectCustomer = (customer) => {
    setCustomerName(customer.name);
    setCustomerData(customer);
  };

  const groupedItems = useMemo(() => {
    if (!items) return [];
    const map = new Map();
    items.forEach((item) => {
      if (item.status === 'Cancelled') return;

      const effectiveQuantity = item.quantity - (item.returnedQuantity || 0);
      if (effectiveQuantity <= 0) return;

      const key = `${item.productId || item.productName}-${item.price}`;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.quantity += effectiveQuantity;
        existing.totalPrice += effectiveQuantity * item.price;
      } else {
        map.set(key, {
          key: key,
          name: item.productName,
          price: item.price,
          quantity: effectiveQuantity,
          totalPrice: effectiveQuantity * item.price,
        });
      }
    });
    return Array.from(map.values());
  }, [items]);

  const subTotal = useMemo(() => {
    return groupedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [groupedItems]);

  const vat = Math.round(subTotal * 0.08);
  const baseTotal = subTotal + vat;

  const applicableVouchers = useMemo(() => {
    const now = new Date();
    return allVouchers.filter((v) => {
      if (!v.isActive) return false;
      if (v.usedCount >= v.quantity) return false;
      if (v.startDate && new Date(v.startDate) > now) return false;
      if (v.endDate && new Date(v.endDate) < now) return false;
      if (v.branchId && branchId && Number(v.branchId) !== Number(branchId)) return false;
      if (v.minOrderValue && baseTotal < Number(v.minOrderValue)) return false;
      return true;
    });
  }, [allVouchers, baseTotal, branchId]);

  const handleSelectVoucher = async (code) => {
    setVoucherCode(code || '');
    if (!code) {
      setAppliedVoucher(null);
      return;
    }
    try {
      setLoading(true);
      const res = await checkVoucher(code, branchId || 0, baseTotal, customerData?.id);
      setAppliedVoucher({
        discountAmount: res.discountAmount,
        message: res.message,
      });
      message.success(res.message);
    } catch (error) {
      setAppliedVoucher(null);
      message.error(error.response?.data?.message || 'Voucher không hợp lệ');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVoucher = async () => {
    if (!voucherCode) return;
    try {
      setLoading(true);
      const res = await checkVoucher(voucherCode, branchId || 0, baseTotal, customerData?.id);
      setAppliedVoucher({
        discountAmount: res.discountAmount,
        message: res.message,
      });
      message.success(res.message);
    } catch (error) {
      setAppliedVoucher(null);
      message.error(error.response?.data?.message || 'Voucher không hợp lệ');
    } finally {
      setLoading(false);
    }
  };

  const voucherDiscount = appliedVoucher ? appliedVoucher.discountAmount : 0;
  const pointsAvailable = customerData?.point || 0;

  let pointsDiscount = 0;
  if (usePoints && pointsAvailable > 0 && pointsAvailable >= pointConfig.minPointsToUse) {
    const afterVoucher = baseTotal - voucherDiscount;
    const maxPointsAllowed = afterVoucher * (pointConfig.maxDiscountPercentage / 100);
    pointsDiscount = Math.min(pointsAvailable, Math.round(maxPointsAllowed)); // 1 point = 1 VND
  }

  const grandTotalRaw = baseTotal - voucherDiscount - pointsDiscount;
  const isCash = paymentMethod === 'Cash';
  const grandTotal = isCash ? Math.round(grandTotalRaw / 1000) * 1000 : grandTotalRaw;
  const roundingDiscount = isCash ? grandTotalRaw - grandTotal : 0;

  const cashNum = parseInt(cashTendered?.toString().replace(/\D/g, ''), 10) || 0;
  const changeAmount = Math.max(0, cashNum - grandTotal);

  const isCashInsufficient = paymentMethod === 'Cash' && cashNum < grandTotal;

  const isPayingRef = useRef(false);

  const handlePay = async () => {
    if (!orderId) {
      message.error('Không tìm thấy mã hoá đơn hợp lệ!');
      return;
    }

    if (!customerDeclined && (!customerName || customerName.trim() === '')) {
      message.error('Vui lòng nhập Tên khách hàng (hoặc chọn "Khách không cung cấp")!');
      return;
    }

    if (isPayingRef.current) return;

    isPayingRef.current = true;
    setLoading(true);
    try {
      const payload = {
        customerName: customerDeclined ? null : customerName,
        customerPhone: customerDeclined ? null : customerPhone,
        voucherCode: appliedVoucher ? voucherCode : null,
        pointsUsed: pointsDiscount,
      };

      if (paymentMethod === 'Cash') {
        await payOrder(orderId, payload, 'Cash');
        message.success('Thanh toán tiền mặt thành công. Bàn đã chuyển sang trạng thái cần dọn dẹp!');
        if (onSuccess) onSuccess();
      } else {
        // PayOS
        const data = await createPaymentLink(orderId, payload);
        if (data && data.qrCode) {
          setQrCodeData(data.qrCode);
          message.success('Đã tạo mã QR PayOS. Vui lòng đưa khách quét mã!');
        } else {
          message.error('Không thể tạo mã QR PayOS!');
        }
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        message.warning('Bàn này đã được thanh toán xong hoặc không còn đơn hàng! Hệ thống sẽ làm mới.');
        if (onCancel) onCancel();
        if (onSuccess) onSuccess();
      } else {
        message.error(error?.response?.data?.message || 'Có lỗi xảy ra khi thanh toán!');
      }
    } finally {
      setLoading(false);
      isPayingRef.current = false;
    }
  };

  // Print Pre-Bill Action directly inside PaymentModal with exact discounts
  const handlePrintPreBill = () => {
    if (!groupedItems || groupedItems.length === 0) return;
    const printWindow = window.open('', '_blank');
    const itemsHtml = groupedItems
      .map(
        (item) =>
          `<tr>
            <td>${item.name || 'Món ăn'}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${formatPrice(item.price)}</td>
            <td style="text-align: right;">${formatPrice(item.totalPrice)}</td>
          </tr>`
      )
      .join('');

    const voucherText = voucherDiscount > 0 ? `<p>Voucher giảm: -${formatPrice(voucherDiscount)}</p>` : '';
    const pointsText = pointsDiscount > 0 ? `<p>Dùng điểm: -${formatPrice(pointsDiscount)}</p>` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>PHIẾU TẠM TÍNH - ${tableName || 'BÀN'}</title>
          <style>
            body { font-family: monospace; padding: 20px; width: 320px; margin: 0 auto; }
            h2, h3 { text-align: center; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 4px 0; font-size: 12px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .summary { font-size: 12px; text-align: right; margin-top: 6px; }
            .total { font-weight: bold; font-size: 15px; text-align: right; margin-top: 10px; color: #000; }
          </style>
        </head>
        <body>
          <h2>NHÀ HÀNG MENUGO</h2>
          <h3>PHIẾU TẠM TÍNH</h3>
          <p>Mã HĐ: #${orderId} | ${tableName || 'N/A'}</p>
          <p>Thời gian: ${new Date().toLocaleString('vi-VN')}</p>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Món</th>
                <th style="text-align: center;">SL</th>
                <th style="text-align: right;">Đ.Giá</th>
                <th style="text-align: right;">T.Tiền</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="divider"></div>
          <div class="summary">
            <p>Tạm tính: ${formatPrice(subTotal)}</p>
            <p>VAT (8%): ${formatPrice(vat)}</p>
            ${voucherText}
            ${pointsText}
          </div>
          <div class="divider"></div>
          <div class="total">TỔNG CỘNG THANH TOÁN: ${formatPrice(grandTotal > 0 ? grandTotal : 0)}</div>
          <p style="text-align: center; margin-top: 20px; font-size: 11px;">Cảm ơn quý khách và hẹn gặp lại!</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCancel = () => {
    Modal.confirm({
      title: 'Xác nhận đóng',
      content: 'Bạn có chắc chắn muốn thoát khỏi màn hình thanh toán không?',
      okText: 'Có, thoát',
      cancelText: 'Không',
      onOk: () => {
        if (onCancel) onCancel();
      },
    });
  };

  const columns = [
    {
      title: 'Tên món',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      width: 60,
    },
    {
      title: 'Đơn giá',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: (val) => formatPrice(val),
    },
    {
      title: 'Thành tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      align: 'right',
      render: (val) => <strong>{formatPrice(val)}</strong>,
    },
  ];

  return (
    <Modal
      title={
        <Title level={4} style={{ margin: 0 }}>
          Xác nhận thanh toán #{orderId} {tableName ? `(${tableName})` : ''}
        </Title>
      }
      open={visible}
      onCancel={handleCancel}
      maskClosable={false}
      footer={[
        <Button key="print" icon={<PrinterOutlined />} onClick={handlePrintPreBill} style={{ float: 'left' }}>
          In Phiếu Tạm Tính
        </Button>,
        <Button key="back" onClick={handleCancel} disabled={loading}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          onClick={handlePay}
          loading={loading}
          disabled={(qrCodeData && paymentMethod === 'PayOS') || isCashInsufficient}
        >
          {paymentMethod === 'PayOS' ? (qrCodeData ? 'Đang chờ thanh toán...' : 'Tạo mã QR PayOS') : 'Thanh toán hoá đơn'}
        </Button>,
      ]}
      width={560}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">Vui lòng kiểm tra kỹ danh sách món và chọn giảm giá/tích điểm trước khi thanh toán.</Text>
      </div>

      <Table
        dataSource={groupedItems}
        columns={columns}
        pagination={false}
        size="small"
        bordered
      />

      <Divider style={{ margin: '16px 0' }} />

      <div style={{ marginBottom: 16 }}>
        <Text strong>Phương thức thanh toán:</Text>
        <Radio.Group
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setQrCodeData(null);
          }}
          style={{ marginLeft: 16 }}
        >
          <Radio value="Cash">Tiền mặt</Radio>
          <Radio value="PayOS">Chuyển khoản (PayOS)</Radio>
        </Radio.Group>
      </div>

      {qrCodeData && paymentMethod === 'PayOS' && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Title level={5}>Quét mã để thanh toán</Title>
          <QRCode value={qrCodeData} size={200} />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">Vui lòng đợi hệ thống xác nhận thanh toán tự động (SignalR)...</Text>
          </div>
          <Button
            type="dashed"
            onClick={async () => {
              setLoading(true);
              try {
                const data = await checkPaymentStatus(orderId);
                if (data && data.status === 'Success') {
                  message.success(data.message || 'Thanh toán thành công!');
                  if (onSuccess) onSuccess();
                } else {
                  message.info(data.message || 'Chưa thanh toán hoặc đã huỷ.');
                }
              } catch (error) {
                message.error(error?.response?.data?.message || 'Không thể kiểm tra trạng thái thanh toán!');
              } finally {
                setLoading(false);
              }
            }}
            style={{ marginTop: 8 }}
            loading={loading}
          >
            Kiểm tra thanh toán
          </Button>
        </div>
      )}

      {/* Cash Tendered Section */}
      {paymentMethod === 'Cash' && (
        <div style={{ marginBottom: 16, padding: '12px', background: '#e6f7ff', borderRadius: '8px', border: '1px solid #91caff' }}>
          <Text strong>Tiền khách đưa (VNĐ):</Text>
          <Input
            value={cashTendered}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setCashTendered(val ? Number(val).toLocaleString('vi-VN') : '');
            }}
            placeholder="Nhập số tiền khách đưa"
            style={{ marginTop: 8, marginBottom: 8, fontSize: 16, fontWeight: 'bold' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Button size="small" onClick={() => setCashTendered(grandTotal.toLocaleString('vi-VN'))}>Vừa đủ</Button>
            <Button size="small" onClick={() => setCashTendered((50000).toLocaleString('vi-VN'))}>50,000</Button>
            <Button size="small" onClick={() => setCashTendered((100000).toLocaleString('vi-VN'))}>100,000</Button>
            <Button size="small" onClick={() => setCashTendered((200000).toLocaleString('vi-VN'))}>200,000</Button>
            <Button size="small" onClick={() => setCashTendered((500000).toLocaleString('vi-VN'))}>500,000</Button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>Tiền thừa trả khách:</Text>
            <Text strong style={{ fontSize: 18, color: changeAmount > 0 ? '#52c41a' : (isCashInsufficient ? '#f5222d' : 'inherit') }}>
              {isCashInsufficient ? 'Chưa đủ tiền' : formatPrice(changeAmount)}
            </Text>
          </div>
        </div>
      )}

      {/* Customer Info Section */}
      <div style={{ marginBottom: 16, padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong>Thông tin khách hàng</Text>
          <Checkbox
            checked={customerDeclined}
            onChange={(e) => {
              setCustomerDeclined(e.target.checked);
              if (e.target.checked) {
                setCustomerPhone('');
                setCustomerName('');
                setCustomerData(null);
                setUsePoints(false);
              }
            }}
          >
            Khách không cung cấp
          </Checkbox>
        </div>
        <Row gutter={12}>
          <Col span={12}>
            <Input
              placeholder="Tên khách hàng"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={customerDeclined}
            />
          </Col>
          <Col span={12}>
            <CustomerSearchInput
              value={customerPhone}
              onChange={setCustomerPhone}
              onSelectCustomer={handleSelectCustomer}
              disabled={customerDeclined}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
        {customerData && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">
              Điểm tích luỹ: <strong style={{ color: '#52c41a' }}>{customerData.point || 0} điểm</strong>
            </Text>
            {customerData.point > 0 && (
              <div style={{ marginTop: 4 }}>
                <Checkbox
                  checked={usePoints}
                  onChange={(e) => setUsePoints(e.target.checked)}
                  disabled={customerData.point < pointConfig.minPointsToUse}
                >
                  Sử dụng điểm trừ vào hoá đơn (Tối đa {pointConfig.maxDiscountPercentage}%)
                </Checkbox>
                {customerData.point < pointConfig.minPointsToUse && (
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px', color: '#ff4d4f' }}>
                      * Cần tối thiểu {pointConfig.minPointsToUse.toLocaleString('vi-VN')} điểm để sử dụng
                    </Text>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <Row gutter={8}>
          <Col flex="auto">
            <Select
              showSearch
              placeholder="Chọn hoặc nhập mã Voucher (nếu có)"
              value={voucherCode || null}
              onChange={(val) => handleSelectVoucher(val || '')}
              disabled={!!appliedVoucher}
              style={{ width: '100%' }}
              allowClear
              notFoundContent="Không có mã giảm giá phù hợp"
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase()) ||
                (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {applicableVouchers.map((v) => (
                <Select.Option key={v.code} value={v.code}>
                  {v.name} ({v.code}) - {v.discountType === 'Fixed' ? formatPrice(v.discountValue) : `${v.discountValue}%`}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            {appliedVoucher ? (
              <Button
                type="dashed"
                danger
                onClick={() => {
                  setVoucherCode('');
                  setAppliedVoucher(null);
                }}
              >
                Huỷ mã
              </Button>
            ) : (
              <Button type="primary" onClick={handleCheckVoucher} loading={loading} disabled={!voucherCode}>
                Áp dụng
              </Button>
            )}
          </Col>
        </Row>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px' }}>
          <Text>Cộng tiền hàng:</Text>
          <Text>{formatPrice(subTotal)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px' }}>
          <Text>VAT (8%):</Text>
          <Text>{formatPrice(vat)}</Text>
        </div>
        {voucherDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', marginBottom: 8, color: '#ff4d4f' }}>
            <Text style={{ color: '#ff4d4f' }}>Khuyến mãi (Voucher):</Text>
            <Text style={{ color: '#ff4d4f' }}>-{formatPrice(voucherDiscount)}</Text>
          </div>
        )}
        {pointsDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', marginBottom: 8, color: '#faad14' }}>
            <Text style={{ color: '#faad14' }}>Trừ điểm ({pointsDiscount} điểm):</Text>
            <Text style={{ color: '#faad14' }}>-{formatPrice(pointsDiscount)}</Text>
          </div>
        )}
        {roundingDiscount !== 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', marginBottom: 8, color: roundingDiscount > 0 ? '#52c41a' : '#1890ff' }}>
            <Text style={{ color: roundingDiscount > 0 ? '#52c41a' : '#1890ff' }}>
              {roundingDiscount > 0 ? 'Giảm giá làm tròn:' : 'Phụ phí làm tròn:'}
            </Text>
            <Text style={{ color: roundingDiscount > 0 ? '#52c41a' : '#1890ff' }}>
              {roundingDiscount > 0 ? `-${formatPrice(roundingDiscount)}` : `+${formatPrice(Math.abs(roundingDiscount))}`}
            </Text>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '250px', borderTop: '1px solid #d9d9d9', paddingTop: 8, marginTop: 8 }}>
          <Text strong style={{ fontSize: 16 }}>Tổng cộng:</Text>
          <Text strong style={{ fontSize: 18, color: '#f5222d' }}>
            {formatPrice(grandTotal > 0 ? grandTotal : 0)}
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentModal;
