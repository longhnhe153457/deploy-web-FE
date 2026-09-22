import React, { useState, useMemo, useCallback } from 'react';
import { Row, Col, Card, Statistic, Select, Table, Tag, Typography, Space } from 'antd';
import { PayCircleOutlined, CreditCardOutlined, MoneyCollectOutlined, MoneyCollectFilled, DollarCircleOutlined, WalletOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ShiftStatsPanel = ({ shifts, paidTodayOrders, loading }) => {
  const [selectedShiftId, setSelectedShiftId] = useState('all');

  // Helper to determine shift for an order
  const getOrderShift = useCallback(
    (orderTimeStr) => {
      if (!orderTimeStr || shifts.length === 0) return null;
      const orderDate = new Date(orderTimeStr);
      const hours = orderDate.getHours();
      const minutes = orderDate.getMinutes();
      const timeInMins = hours * 60 + minutes;

      for (const shift of shifts) {
        if (!shift.startTime || !shift.endTime) continue;
        const [sh, sm] = shift.startTime.split(':').map(Number);
        const [eh, em] = shift.endTime.split(':').map(Number);
        const startMins = sh * 60 + (sm || 0);
        let endMins = eh * 60 + (em || 0);

        if (endMins <= startMins) endMins += 24 * 60;

        if (timeInMins >= startMins && timeInMins <= endMins) {
          return shift;
        }
      }
      return null;
    },
    [shifts]
  );

  // Filter paid orders by selected shift
  const filteredPaidOrders = useMemo(() => {
    if (selectedShiftId === 'all') return paidTodayOrders;
    return paidTodayOrders.filter((o) => {
      const shift = getOrderShift(o.createdAt);
      return shift && String(shift.id) === String(selectedShiftId);
    });
  }, [paidTodayOrders, selectedShiftId, getOrderShift]);

  // Shift Statistics Calculations
  const shiftStats = useMemo(() => {
    let cashRevenue = 0;
    let transferRevenue = 0;

    filteredPaidOrders.forEach((o) => {
      const amount = o.totalAmount || o.finalAmount || 0;
      const method = o.paymentMethod || o.method || 'Cash';
      if (method.toLowerCase().includes('cash') || method === 'Tiền mặt') {
        cashRevenue += amount;
      } else {
        transferRevenue += amount;
      }
    });

    return {
      totalRevenue: cashRevenue + transferRevenue,
      cashRevenue,
      transferRevenue,
      paidCount: filteredPaidOrders.length,
    };
  }, [filteredPaidOrders]);

  return (
    <>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Thống Kê Ca Thu Ngân Hôm Nay
          </Title>
          <Text type="secondary">
            Doanh thu và danh sách đơn hàng đã thanh toán phân theo ca làm việc & phương thức thanh toán
          </Text>
        </Col>
        <Col>
          <Space>
            <Text strong>Chọn Ca Làm Việc:</Text>
            <Select
              value={selectedShiftId}
              onChange={setSelectedShiftId}
              style={{ width: 200 }}
              options={[
                { value: 'all', label: 'Tất cả các ca hôm nay' },
                ...shifts.map((s) => ({
                  value: String(s.id),
                  label: `${s.name} (${s.startTime} - ${s.endTime})`,
                })),
              ]}
            />
          </Space>
        </Col>
      </Row>

      {/* KPI CARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card style={{ background: '#f6ffed', borderColor: '#b7eb8f', borderRadius: 8 }}>
            <Statistic
              title="Tổng Doanh Thu Ca"
              value={shiftStats.totalRevenue}
              formatter={(val) => new Intl.NumberFormat('vi-VN').format(val)}
              suffix="đ"
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={{ background: '#e6f7ff', borderColor: '#91d5ff', borderRadius: 8 }}>
            <Statistic
              title="Doanh Thu Tiền Mặt"
              value={shiftStats.cashRevenue}
              formatter={(val) => new Intl.NumberFormat('vi-VN').format(val)}
              suffix="đ"
              prefix={<WalletOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={{ background: '#f9f0ff', borderColor: '#d3ade6', borderRadius: 8 }}>
            <Statistic
              title="Doanh Thu Chuyển Khoản / PayOS"
              value={shiftStats.transferRevenue}
              formatter={(val) => new Intl.NumberFormat('vi-VN').format(val)}
              suffix="đ"
              prefix={<CreditCardOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card style={{ background: '#fff7e6', borderColor: '#ffd591', borderRadius: 8 }}>
            <Statistic
              title="Số Hóa Đơn Đã Hoàn Thành"
              value={shiftStats.paidCount}
              suffix="hóa đơn"
              valueStyle={{ color: '#fa8c16', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Title level={5} style={{ marginBottom: 12 }}>
        Danh sách hóa đơn đã thu tiền ({selectedShiftId === 'all' ? 'Tất cả ca' : 'Theo ca đã chọn'}):
      </Title>
      <Table
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={filteredPaidOrders}
        columns={[
          { title: 'Mã HĐ', dataIndex: 'id', key: 'id', render: (id) => `#${id}` },
          { title: 'Bàn', dataIndex: 'tableName', key: 'tableName', render: (name) => name || 'N/A' },
          {
            title: 'Ca làm việc',
            key: 'shiftName',
            render: (_, record) => {
              const s = getOrderShift(record.createdAt);
              return s ? <Tag color="blue">{s.name}</Tag> : <Tag color="default">N/A</Tag>;
            },
          },
          {
            title: 'Thời gian thanh toán',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (t) => (t ? new Date(t).toLocaleTimeString('vi-VN') : 'N/A'),
          },
          {
            title: 'Phương thức thanh toán',
            key: 'method',
            render: (_, record) => {
              const m = record.paymentMethod || record.method || 'Cash';
              const isCash = m.toLowerCase().includes('cash') || m === 'Tiền mặt';
              return (
                <Tag color={isCash ? 'cyan' : 'purple'} icon={isCash ? <DollarCircleOutlined /> : <CreditCardOutlined />}>
                  {isCash ? 'Tiền mặt' : 'Chuyển khoản / PayOS'}
                </Tag>
              );
            },
          },
          {
            title: 'Tổng tiền',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            align: 'right',
            render: (val, record) => (
              <Text strong style={{ color: '#52c41a' }}>
                {(val || record.finalAmount || 0).toLocaleString('vi-VN')}đ
              </Text>
            ),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: () => <Tag color="green">Đã hoàn thành</Tag>,
          },
        ]}
        locale={{ emptyText: 'Chưa có hóa đơn nào được thanh toán trong ca này.' }}
      />
    </>
  );
};

export default ShiftStatsPanel;
