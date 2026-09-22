import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, Select, Button, Space, Typography, Table, Spin, message, Alert } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { createReservation, searchCustomersOData, getAvailableTablesForReservation } from '../../api/reservationApi';
import { getAllTables, getTablesByBranch } from '../../api/tableApi';
import { getAllBranches } from '../../api/branchApi';
import { useAuth } from '../../context/AuthContext';
import MenuSelectionModal from './MenuSelectionModal';
import CustomerSearchInput from '../common/CustomerSearchInput';

const { Title, Text } = Typography;

const ReservationFormModal = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [preOrderItems, setPreOrderItems] = useState([]);
  const [isMenuModalVisible, setIsMenuModalVisible] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setPreOrderItems([]);
      fetchBranchesAndData();
    }
  }, [visible, form]);

  const fetchBranchesAndData = async () => {
    setFetchingData(true);
    try {
      const branchesRes = await getAllBranches();
      const allBranches = branchesRes.data;

      let availableBranches = allBranches;
      const isAdminOrOwner = user?.roles?.some(r => r === 'Admin' || r === 'Owner');
      if (!isAdminOrOwner && user?.branchIds && user.branchIds.length > 0) {
        availableBranches = allBranches.filter(b => user.branchIds.includes(b.id));
      }
      setBranches(availableBranches);

      const defaultBranch = availableBranches.length > 0 ? availableBranches[0].id : null;
      setSelectedBranch(defaultBranch);

      if (defaultBranch) {
        await fetchTablesAndProducts(defaultBranch);
      }
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu chi nhánh');
    } finally {
      setFetchingData(false);
    }
  };

  const fetchTablesAndProducts = async (branchId, resTime = null) => {
    setFetchingData(true);
    try {
      let tablesRes;
      if (resTime) {
        tablesRes = { data: await getAvailableTablesForReservation(branchId, resTime.toISOString()) };
      } else {
        tablesRes = await getTablesByBranch([branchId]);
      }

      setTables(tablesRes.data);
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu bàn');
    } finally {
      setFetchingData(false);
    }
  };

  const handleBranchChange = (val) => {
    setSelectedBranch(val);
    form.setFieldsValue({ tableIds: [] });
    const currentResTime = form.getFieldValue('reservationTime');
    fetchTablesAndProducts(val, currentResTime);
  };

  const handleReservationTimeChange = (val) => {
    form.setFieldsValue({ tableIds: [] });
    if (selectedBranch) {
      fetchTablesAndProducts(selectedBranch, val);
    }
  };

  const handleSelectCustomer = (customer) => {
    form.setFieldsValue({ customerName: customer.name });
  };

  const handleAddPreOrderItem = (productId) => {
    if (!productId) return;
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setPreOrderItems(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.sellPrice, quantity: 1, note: '' }];
    });
  };

  const handleUpdateItemQuantity = (productId, qty) => {
    setPreOrderItems(prev =>
      prev.map(item => item.productId === productId ? { ...item, quantity: qty } : item)
    );
  };

  const handleUpdateItemNote = (productId, note) => {
    setPreOrderItems(prev =>
      prev.map(item => item.productId === productId ? { ...item, note } : item)
    );
  };

  const handleRemoveItem = (productId) => {
    setPreOrderItems(prev => prev.filter(item => item.productId !== productId));
  };

  const isSubmittingRef = useRef(false);

  const submitCreate = async (payload, confirmUpdateCustomer = false, ignoreWarning = false) => {
    try {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setLoading(true);

      const dataToSubmit = { ...payload, confirmUpdateCustomer, ignoreWarning };
      await createReservation(dataToSubmit);
      message.success('Đã tạo đặt bàn thành công!');
      onSuccess();
    } catch (error) {
      if (error.response?.status === 409) {
        Modal.confirm({
          title: 'Trùng số điện thoại',
          content: error.response.data.message,
          okText: 'Cập nhật',
          cancelText: 'Hủy',
          onOk: async () => {
            isSubmittingRef.current = false;
            await submitCreate(payload, true, ignoreWarning);
          },
          onCancel: () => {
            isSubmittingRef.current = false;
          }
        });
      } else if (error.response?.status === 422 && error.response.data?.isWarning) {
        Modal.confirm({
          title: 'Cảnh báo trùng bàn',
          content: error.response.data.message,
          okText: 'Vẫn đặt',
          cancelText: 'Hủy',
          onOk: async () => {
            isSubmittingRef.current = false;
            await submitCreate(payload, confirmUpdateCustomer, true);
          },
          onCancel: () => {
            isSubmittingRef.current = false;
          }
        });
      } else {
        if (error.errorFields) return;
        message.error(error.response?.data?.message || 'Tạo đặt bàn thất bại');
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        reservationTime: values.reservationTime.toISOString(),
        numberOfGuests: values.numberOfGuests,
        tableCount: values.tableIds ? values.tableIds.length : 1,
        note: values.note || '',
        tableIds: values.tableIds || [],
        preOrderItems: preOrderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          note: item.note
        }))
      };

      await submitCreate(payload, false);
    } catch (error) {
      // Validation error
    }
  };

  const productColumns = [
    {
      title: 'Tên Món',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Đơn giá',
      dataIndex: 'price',
      key: 'price',
      render: val => Number(val).toLocaleString('vi-VN') + 'đ'
    },
    {
      title: 'Số lượng',
      key: 'quantity',
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={val => handleUpdateItemQuantity(record.productId, val)}
        />
      )
    },
    {
      title: 'Ghi chú',
      key: 'note',
      render: (_, record) => (
        <Input
          placeholder="Ghi chú món..."
          value={record.note}
          onChange={e => handleUpdateItemNote(record.productId, e.target.value)}
        />
      )
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(record.productId)}
        />
      )
    }
  ];

  const handleCancel = () => {
    if (form.isFieldsTouched()) {
      Modal.confirm({
        title: 'Cảnh báo chưa lưu dữ liệu',
        content: 'Bạn có dữ liệu đang nhập dở. Bạn có chắc chắn muốn thoát và hủy bỏ toàn bộ không?',
        okText: 'Thoát',
        cancelText: 'Tiếp tục nhập',
        onOk: () => {
          form.resetFields();
          onCancel();
        }
      });
    } else {
      form.resetFields();
      onCancel();
    }
  };

  return (
    <Modal
      title="Thêm Đặt Bàn Mới"
      open={visible}
      maskClosable={false}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="back" onClick={handleCancel}>Hủy</Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Tạo Đặt Bàn
        </Button>
      ]}
    >
      <Spin spinning={fetchingData}>
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="customerName"
              label="Tên Khách Hàng"
              rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="Nguyễn Văn A" />
            </Form.Item>
            <Form.Item
              name="customerPhone"
              label="Số Điện Thoại"
              rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
              style={{ flex: 1 }}
            >
              <CustomerSearchInput onSelectCustomer={handleSelectCustomer} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="reservationTime"
              label="Thời Gian Đến"
              rules={[
                { required: true, message: 'Vui lòng chọn thời gian' },
                {
                  validator: (_, value) => {
                    if (value && value.isBefore(dayjs())) {
                      return Promise.reject(new Error('Phải sau thời gian hiện tại'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              style={{ flex: 1 }}
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
                disabledDate={current => current && current < dayjs().startOf('day')}
                onChange={handleReservationTimeChange}
              />
            </Form.Item>
            <Form.Item
              name="numberOfGuests"
              label="Số Người"
              rules={[{ required: true, message: 'Vui lòng nhập số lượng người' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="note" label="Ghi Chú Đặt Bàn">
            <Input.TextArea rows={2} placeholder="Yêu cầu đặc biệt..." />
          </Form.Item>

          {branches.length > 0 && (
            <Form.Item label="Chi Nhánh">
              <Select
                value={selectedBranch}
                onChange={handleBranchChange}
                placeholder="Chọn chi nhánh"
              >
                {branches.map(b => (
                  <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="tableIds"
            label="Xếp Bàn"
            rules={[
              { required: true, message: 'Vui lòng chọn bàn!' },
              { type: 'array', min: 1, message: 'Vui lòng chọn ít nhất 1 bàn!' }
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn bàn..."
              optionFilterProp="children"
              style={{ width: '100%' }}
              onChange={(value) => {
                if (!value || value.length <= 1) return;
                const selectedAreas = new Set(
                  value.map(id => tables.find(t => t.id === id)?.areaName)
                );
                if (selectedAreas.size > 1) {
                  message.warning('Khuyến cáo: Các bàn đã chọn thuộc các khu vực khác nhau!');
                }
              }}
            >
              {Object.entries(
                tables.reduce((acc, table) => {
                  const areaName = table.areaName || 'Khu vực khác';
                  acc[areaName] = acc[areaName] || [];
                  acc[areaName].push(table);
                  return acc;
                }, {})
              ).map(([areaName, areaTables]) => (
                <Select.OptGroup key={areaName} label={`Khu vực: ${areaName}`}>
                  {areaTables.map(t => (
                    <Select.Option key={t.id} value={t.id}>
                      {t.name}
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>

          <div style={{ marginTop: 24, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={5} style={{ margin: 0 }}>Đặt Món Trước (Tùy chọn)</Title>
            <Button type="primary" onClick={() => setIsMenuModalVisible(true)}>
              Chọn Món
            </Button>
          </div>

          {preOrderItems.length > 0 ? (
            <>
              <Alert 
                message="Lưu ý về giá" 
                description="Giá hiển thị hiện tại là giá tham khảo. Giá và các chương trình khuyến mãi thực tế sẽ được áp dụng tự động tại thời điểm khách đến nhận bàn." 
                type="info" 
                showIcon 
                style={{ marginBottom: 12 }} 
              />
              <Table
                dataSource={preOrderItems}
                columns={productColumns}
                rowKey="productId"
                pagination={false}
                size="small"
                bordered
              />
            </>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', background: '#fafafa', borderRadius: 8, border: '1px dashed #d9d9d9' }}>
              <Text type="secondary">Chưa có món nào được đặt trước</Text>
            </div>
          )}
        </Form>
      </Spin>
      <MenuSelectionModal
        visible={isMenuModalVisible}
        onCancel={() => setIsMenuModalVisible(false)}
        initialSelectedItems={preOrderItems}
        onConfirm={(items) => {
          setPreOrderItems(items);
          setIsMenuModalVisible(false);
        }}
      />
    </Modal>
  );
};

export default ReservationFormModal;
