import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card,
  Form,
  Select,
  InputNumber,
  Input,
  DatePicker,
  Button,
  Table,
  Tag,
  Space,
  message,
  Popconfirm,
  Typography,
  Tabs,
  Switch,
} from 'antd';
import { DeleteOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getCancelledHistory, getReturnableOrders, requestReturnItem } from '../api/orderApi';
import { getLeftoverRecordsByBranch, createLeftoverRecord, deleteLeftoverRecord } from '../api/leftoverApi';
import { getAllProducts } from '../api/productApi';
import { getAllShifts } from '../api/shiftApi';
import { getChefs } from '../api/accountApi';
import { getAllBranches } from '../api/branchApi';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';

const { Title } = Typography;

const HANDLING_ACTION_LABELS = {
  Discard: 'Huỷ',
  StaffUse: 'Nhân viên dùng',
  Reuse: 'Tái sử dụng',
};

// RoleId 5 = Bếp (Chef) — theo ROLES_MAP dùng chung trong WorkSchedulePage.jsx.
const LeftoverPage = () => {
  const { user, role } = useAuth();
  const { currentBranchId } = useBranch();
  const branchId = currentBranchId || user?.branchId;

  // useBranch().branches chỉ được nạp cho Admin/Owner (dùng cho bộ chọn chi
  // nhánh) — các role còn lại (Waiter/Cashier/Chef/Manager) không có sẵn danh
  // sách này, nên tự tải riêng ở đây để lấy tên chi nhánh hiển thị ở heading.
  const [allBranches, setAllBranches] = useState([]);
  useEffect(() => {
    getAllBranches()
      .then((res) => setAllBranches(res.data || []))
      .catch(() => {});
  }, []);
  const branchName = allBranches.find((b) => b.id === branchId)?.name;

  // Chỉ Phục vụ (Waiter) mới trực tiếp trả món cho khách nên chỉ role này được
  // điền form ghi nhận — Thu ngân/Bếp/Quản lý/Chủ sở hữu/Admin chỉ xem lịch sử.
  const canCreate = ['Waiter', 'Phục vụ'].includes(role) || user?.roleId === 6;

  const [products, setProducts] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [chefAccounts, setChefAccounts] = useState([]);
  const [tableOrderOptions, setTableOrderOptions] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Hai form độc lập: "Trả món" và "Bếp làm dư" không dùng chung dữ liệu nhập.
  const [returnForm] = Form.useForm();
  const [extraForm] = Form.useForm();
  const selectedOrderId = Form.useWatch('orderId', returnForm);
  const selectedOrderDetailId = Form.useWatch('orderDetailId', returnForm);
  const selectedProductId = Form.useWatch('productId', returnForm);
  const isHandlingReuse = Form.useWatch('handlingAction', returnForm) === true;
  const returnReason = Form.useWatch('reason', returnForm);
  const productType = products.find((p) => p.id === selectedProductId)?.type;

  const maxReturnable = useMemo(() => {
    if (!selectedOrderDetailId) return undefined;
    for (const group of tableOrderOptions) {
      const item = group.items.find((i) => i.value === selectedOrderDetailId);
      if (item) return item.maxReturnable;
    }
    return undefined;
  }, [selectedOrderDetailId, tableOrderOptions]);

  const getReasonOptions = () => {
    if (!productType) return [];
    if ((productType === 'Regular' || productType === 'Manufactured') && isHandlingReuse) {
      return [
        { value: 'Khách gọi dư', label: 'Khách gọi dư' },
        { value: 'Nhân viên bấm nhầm', label: 'Nhân viên bấm nhầm' },
        { value: 'Bàn hủy món phút chót', label: 'Bàn hủy món phút chót' },
        { value: 'Lý do khác', label: 'Lý do khác' }
      ];
    }
    return [
      { value: 'Ra món chậm', label: 'Ra món chậm' },
      { value: 'Thức ăn nguội/kém chất lượng', label: 'Thức ăn nguội/kém chất lượng' },
      { value: 'Có dị vật', label: 'Có dị vật' },
      { value: 'Nhân viên làm đổ', label: 'Nhân viên làm đổ' },
      { value: 'Lên sai món', label: 'Lên sai món' },
      { value: 'Bao bì rách/hỏng', label: 'Bao bì rách/hỏng' },
      { value: 'Lý do khác', label: 'Lý do khác' }
    ];
  };

  const handleHandlingChange = (checked) => {
    returnForm.setFieldsValue({
      handlingAction: checked,
    });
  };



  // ── Lịch sử hủy món (đơn đã hoàn thành vs đơn chờ xác nhận) ──────────
  const [cancelledHistory, setCancelledHistory] = useState([]);
  const [cancelledLoading, setCancelledLoading] = useState(false);
  const [cancelledCategoryFilter, setCancelledCategoryFilter] = useState(undefined);

  const fetchCancelledHistory = useCallback(async () => {
    if (!branchId) return;
    setCancelledLoading(true);
    try {
      const res = await getCancelledHistory(branchId);
      setCancelledHistory(res.data || []);
    } catch {
      message.error('Không thể tải lịch sử hủy món.');
    } finally {
      setCancelledLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchCancelledHistory();
  }, [fetchCancelledHistory]);

  const fetchRecords = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await getLeftoverRecordsByBranch(branchId);
      setRecords(res.data || []);
    } catch {
      message.error('Không thể tải danh sách món thừa.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!canCreate) return;
    (async () => {
      try {
        const [prodRes, shiftRes, chefRes] = await Promise.all([getAllProducts(), getAllShifts(), getChefs(branchId)]);
        setProducts(prodRes.data || []);
        setShifts(shiftRes.data || []);
        setChefAccounts(chefRes.data || []);
      } catch (err) {
        message.error('Không thể tải danh mục sản phẩm/ca làm việc.');
      }
    })();
  }, [canCreate, branchId]);

  const fetchOrderDetailOptions = useCallback(async () => {
    if (!branchId || !canCreate) return;
    try {
      const res = await getReturnableOrders(branchId);
      const orders = res.data || [];
      const grouped = [];
      orders.forEach((order) => {
        const items = (order.orderDetails || []).map((d) => {
          const maxReturnable = d.quantity - (d.returnedQuantity || 0);
          return {
            value: d.id,
            label: `${d.productName} (gọi: ${d.quantity}, có thể trả: ${maxReturnable})`,
            productId: d.productId,
            quantity: d.quantity,
            maxReturnable,
          };
        });

        if (items.length === 0) return;
        grouped.push({ 
          orderId: order.id, 
          tableName: order.tableName ? `${order.tableName} (Đơn #${order.id})` : `Mang đi (Đơn #${order.id})`, 
          items 
        });
      });
      setTableOrderOptions(grouped);
    } catch {
      message.error('Không thể tải danh sách chi tiết đơn hàng.');
    }
  }, [branchId, canCreate]);

  useEffect(() => {
    fetchOrderDetailOptions();
    // Poll để món tự rớt khỏi danh sách khi quá 1 tiếng, không cần tải lại trang.
    const interval = setInterval(fetchOrderDetailOptions, 60000);
    return () => clearInterval(interval);
  }, [fetchOrderDetailOptions]);

  const handleSubmitReturn = async (values) => {
    if (!branchId) {
      message.error('Không xác định được chi nhánh hiện tại.');
      return;
    }
    setSaving(true);
    try {
      const finalReason = values.reason === 'Lý do khác' ? values.otherReason : values.reason;
      const isReuse = values.handlingAction === true;
      await requestReturnItem(values.orderDetailId, {
        returnQuantity: values.quantity,
        returnReason: finalReason,
        // Backend chỉ cộng lại kho khi IsIntact && Reuse — phải gửi cả hai.
        isIntact: isReuse,
        handlingAction: isReuse ? 'Reuse' : 'Discard',
        atFaultAccountId: values.atFaultAccountId ?? null,
      });
      message.success('Đã xử lý trả món và ghi nhận thành công');
      returnForm.resetFields();
      fetchRecords();
      fetchOrderDetailOptions(); // Cập nhật lại dropdown Bàn/Món để ẩn món vừa trả
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lỗi khi ghi nhận trả món.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitExtra = async (values) => {
    if (!branchId) {
      message.error('Không xác định được chi nhánh hiện tại.');
      return;
    }
    setSaving(true);
    try {
      await createLeftoverRecord({
        branchId,
        type: 'Extra',
        productId: values.productId,
        quantity: values.quantity,
        reason: values.reason,
        shiftId: values.shiftId ?? null,
        recordDate: (values.recordDate || dayjs()).format('YYYY-MM-DD'),
      });
      message.success('Đã ghi nhận món dư thừa');
      extraForm.resetFields();
      extraForm.setFieldsValue({ recordDate: dayjs() });
      fetchRecords();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lỗi khi ghi nhận bếp làm dư.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteLeftoverRecord(id);
      message.success('Đã xóa bản ghi');
      fetchRecords();
    } catch {
      message.error('Không thể xóa bản ghi.');
    }
  };

  const returnRecords = useMemo(() => records.filter((r) => r.type === 'Return'), [records]);
  const extraRecords = useMemo(() => records.filter((r) => r.type === 'Extra'), [records]);

  const actionsColumn = {
    title: '',
    key: 'actions',
    width: 50,
    render: (_, r) => (
      <Popconfirm title="Xóa bản ghi này?" onConfirm={() => handleDelete(r.id)} okText="Đồng ý" cancelText="Hủy">
        <Button type="text" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    ),
  };

  const returnColumns = [
    { title: 'Món', dataIndex: 'productName', key: 'productName' },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 60 },
    { title: 'Lý do', dataIndex: 'reason', key: 'reason' },
    {
      title: 'Bàn / Xử lý',
      key: 'detail',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          {r.tableName && <span>Bàn: {r.tableName}</span>}
          {r.handlingAction && <Tag>{HANDLING_ACTION_LABELS[r.handlingAction] || (r.handlingAction === 'Reuse' ? 'Tái sử dụng' : 'Huỷ')}</Tag>}
          {r.atFaultAccountName && (
            <span style={{ color: '#cf1322', fontSize: 12 }}>Bếp làm sai: {r.atFaultAccountName}</span>
          )}
          {r.usedAt && <Tag color="blue">Đã dùng lại</Tag>}
        </Space>
      ),
    },
    { title: 'Ngày', dataIndex: 'recordDate', key: 'recordDate' },
    { title: 'Người ghi', dataIndex: 'createdByName', key: 'createdByName' },
    actionsColumn,
  ];

  const extraColumns = [
    { title: 'Món', dataIndex: 'productName', key: 'productName' },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 60 },
    { title: 'Lý do', dataIndex: 'reason', key: 'reason' },
    { title: 'Ca làm việc', dataIndex: 'shiftName', key: 'shiftName', render: (v) => v || '—' },
    { title: 'Ngày', dataIndex: 'recordDate', key: 'recordDate' },
    { title: 'Người ghi', dataIndex: 'createdByName', key: 'createdByName' },
    actionsColumn,
  ];

  const cancelledColumns = [
    {
      title: 'Trạng thái khi huỷ',
      dataIndex: 'category',
      key: 'category',
      render: (c) =>
        c === 'Completed' ? (
          <Tag color="red">Món đã làm xong (bếp làm chậm)</Tag>
        ) : (
          <Tag color="default">Món chưa chế biến</Tag>
        ),
    },
    { title: 'Món', dataIndex: 'productName', key: 'productName' },
    { title: 'Bàn', dataIndex: 'tableName', key: 'tableName' },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 60 },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
  ];

  const filteredCancelledHistory = cancelledCategoryFilter
    ? cancelledHistory.filter((r) => r.category === cancelledCategoryFilter)
    : cancelledHistory;

  const completedCancelCount = cancelledHistory.filter((r) => r.category === 'Completed').length;

  const orderDetailOptionsForOrder = tableOrderOptions.find((t) => t.orderId === selectedOrderId)?.items || [];

  const returnTab = (
    <>
      {canCreate && (
        <Card title="Ghi nhận trả món" style={{ marginBottom: 20, borderRadius: 12 }}>
          <Form
            form={returnForm}
            layout="vertical"
            onFinish={handleSubmitReturn}
            initialValues={{ recordDate: dayjs() }}
          >
            <Space style={{ display: 'flex' }} size="large" align="start" wrap>
              <Form.Item
                name="orderId"
                label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 220 }}>
                    <span>Đơn hàng / Bàn</span>
                    <SyncOutlined
                      style={{ cursor: 'pointer', color: '#1890ff' }}
                      onClick={() => fetchOrderDetailOptions()}
                      title="Làm mới danh sách bàn"
                    />
                  </div>
                }
                rules={[{ required: true, message: 'Chọn đơn hàng' }]}
                style={{ width: 220 }}
              >
                <Select
                  showSearch
                  placeholder="Chọn bàn/đơn"
                  optionFilterProp="label"
                  options={tableOrderOptions.map((t) => ({ value: t.orderId, label: t.tableName }))}
                  onChange={() => {
                    returnForm.setFieldsValue({ orderDetailId: undefined, productId: undefined, quantity: undefined });
                  }}
                />
              </Form.Item>

              <Form.Item name="orderDetailId" label="Món trong đơn hàng" rules={[{ required: true, message: 'Chọn món khách trả trong đơn' }]} style={{ width: 320 }}>
                <Select
                  showSearch
                  disabled={!selectedOrderId}
                  placeholder={selectedOrderId ? 'Chọn món' : 'Chọn bàn/đơn trước'}
                  optionFilterProp="label"
                  options={orderDetailOptionsForOrder}
                  onChange={(value, option) => {
                    if (option) {
                      returnForm.setFieldsValue({ productId: option.productId, quantity: 1 });
                    }
                  }}
                />
              </Form.Item>

              {/* Món được điền tự động theo "Món trong đơn hàng", chỉ giữ giá trị để xác định loại món */}
              <Form.Item name="productId" hidden>
                <Input />
              </Form.Item>

              <Form.Item
                name="quantity"
                label="Số lượng"
                rules={[
                  { required: true, message: 'Nhập số lượng' },
                  ...(maxReturnable !== undefined
                    ? [{ type: 'number', max: maxReturnable, message: `Tối đa ${maxReturnable}` }]
                    : []),
                ]}
                style={{ width: 120 }}
              >
                <InputNumber min={1} max={maxReturnable} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="recordDate" label="Ngày" style={{ width: 160 }}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Space>

            <Space style={{ display: 'flex' }} size="large" align="start" wrap>
              <Form.Item name="handlingAction" valuePropName="checked" label="Hướng xử lý" style={{ width: 220 }}>
                <Switch
                  checkedChildren="Tái sử dụng"
                  unCheckedChildren="Không sử dụng"
                  onChange={handleHandlingChange}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                  Hàng tái sử dụng sẽ được cộng lại vào kho nếu là mặt hàng Thường.
                </div>
              </Form.Item>
              {productType !== 'Regular' && productType !== 'Manufactured' && (
                <Form.Item name="atFaultAccountId" label="Bếp làm sai (nếu có)" style={{ width: 220 }}>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Chọn tài khoản bếp"
                    optionFilterProp="label"
                    options={chefAccounts.map((a) => ({ value: a.id, label: a.name }))}
                  />
                </Form.Item>
              )}
            </Space>

            <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Chọn lý do' }]}>
              <Select
                disabled={!selectedProductId}
                placeholder={selectedProductId ? 'Chọn lý do trả món...' : 'Vui lòng chọn món trước'}
                options={getReasonOptions()}
              />
            </Form.Item>
            {returnReason === 'Lý do khác' && (
              <Form.Item name="otherReason" rules={[{ required: true, message: 'Nhập chi tiết lý do' }]}>
                <Input.TextArea rows={2} placeholder="Vui lòng nhập chi tiết lý do..." />
              </Form.Item>
            )}

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Button type="primary" icon={<PlusOutlined />} htmlType="submit" loading={saving}>
                Ghi nhận
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Card title="Lịch sử trả món" style={{ borderRadius: 12 }}>
        <Table
          rowKey="id"
          columns={returnColumns}
          dataSource={returnRecords}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </>
  );

  const extraTab = (
    <>
      {canCreate && (
        <Card title="Ghi nhận bếp làm dư" style={{ marginBottom: 20, borderRadius: 12 }}>
          <Form
            form={extraForm}
            layout="vertical"
            onFinish={handleSubmitExtra}
            initialValues={{ recordDate: dayjs() }}
          >
            <Space style={{ display: 'flex' }} size="large" align="start" wrap>
              <Form.Item name="productId" label="Món" rules={[{ required: true, message: 'Chọn món' }]} style={{ width: 260 }}>
                <Select
                  showSearch
                  placeholder="Chọn món"
                  optionFilterProp="label"
                  options={products.map((p) => ({ value: p.id, label: p.name }))}
                />
              </Form.Item>

              <Form.Item name="quantity" label="Số lượng" rules={[{ required: true, message: 'Nhập số lượng' }]} style={{ width: 120 }}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="shiftId" label="Ca làm việc" style={{ width: 200 }}>
                <Select allowClear placeholder="Chọn ca" options={shifts.map((s) => ({ value: s.id, label: s.name }))} />
              </Form.Item>

              <Form.Item name="recordDate" label="Ngày" style={{ width: 160 }}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Space>

            <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Nhập lý do' }]}>
              <Input.TextArea rows={2} placeholder="VD: làm dư, ước tính sai..." />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Button type="primary" icon={<PlusOutlined />} htmlType="submit" loading={saving}>
                Ghi nhận
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Card title="Lịch sử bếp làm dư" style={{ borderRadius: 12 }}>
        <Table
          rowKey="id"
          columns={extraColumns}
          dataSource={extraRecords}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </>
  );

  const cancelledHistoryTab = (
    <Card
      title="Lịch sử hủy món"
      style={{ borderRadius: 12 }}
      extra={
        <Select
          allowClear
          placeholder="Lọc theo trạng thái"
          style={{ width: 220 }}
          value={cancelledCategoryFilter}
          onChange={setCancelledCategoryFilter}
          options={[
            { value: 'Completed', label: 'Món đã làm xong' },
            { value: 'Pending', label: 'Món chưa chế biến' },
          ]}
        />
      }
    >
      {completedCancelCount > 0 && (
        <div style={{ marginBottom: 12, color: '#cf1322' }}>
          Bếp làm chậm (khách không nhận món đã hoàn thành): <strong>{completedCancelCount}</strong> lần
        </div>
      )}
      <Table
        rowKey="orderDetailId"
        columns={cancelledColumns}
        dataSource={filteredCancelledHistory}
        loading={cancelledLoading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>Trả món &amp; Lịch sử huỷ món</Title>
        {branchName && <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px' }}>Chi nhánh: {branchName}</Tag>}
      </div>

      <Tabs
        defaultActiveKey="return"
        items={[
          { key: 'return', label: 'Trả món', children: returnTab },
          { key: 'extra', label: 'Bếp làm dư', children: extraTab },
          { key: 'cancelled', label: 'Lịch sử hủy món', children: cancelledHistoryTab },
        ]}
      />
    </div>
  );
};

export default LeftoverPage;
