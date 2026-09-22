import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, DatePicker, Button, Card, Select, Typography, Row, Col, Space, message, Modal } from 'antd';
import { CalendarOutlined, ArrowLeftOutlined, ShopOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getAllBranches } from '../../api/branchApi';
import { createCustomerReservation } from '../../api/customerPortalApi';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const CustomerReservationPage = () => {
  const [form] = Form.useForm();
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const res = await getAllBranches();
        const activeList = res.data.filter(b => !b.isDeleted && b.status !== "Ngừng kinh doanh");
        setBranches(activeList);
      } catch (error) {
        message.error('Không thể tải danh sách chi nhánh');
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        branchId: values.branchId,
        reservationTime: values.reservationTime.toISOString(),
        numberOfGuests: values.numberOfGuests,
        note: values.note || '',
        tableIds: [], // Customers don't pick table IDs directly; staff assigns them
        preOrderItems: []
      };

      await createCustomerReservation(payload);

      Modal.success({
        title: 'Đặt bàn thành công!',
        content: 'Yêu cầu đặt bàn của bạn đã được gửi tới chi nhánh. Chúng tôi sẽ duyệt thông tin và gửi thông báo xác nhận cho bạn sớm nhất có thể.',
        okText: 'Xem lịch sử đặt bàn',
        onOk: () => {
          navigate('/customer/dashboard');
        }
      });
    } catch (error) {
      message.error(error.response?.data?.message || 'Gửi yêu cầu đặt bàn thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: '#f8fafc',
        minHeight: '100vh',
        padding: '24px',
        fontFamily: "'Be Vietnam Pro', sans-serif"
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/customer/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#475569' }}
          >
            Quay lại bảng điều khiển
          </Button>
        </div>

        <Card
          style={{ borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
          bodyStyle={{ padding: '36px 32px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <CalendarOutlined style={{ fontSize: 40, color: '#ea580c', marginBottom: 12 }} />
            <Title level={3} style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: 700 }}>
              Đặt Bàn Trực Tuyến
            </Title>
            <Text type="secondary">
              Vui lòng điền thông tin đặt bàn của bạn dưới đây. Chi nhánh sẽ xác nhận lịch hẹn của bạn.
            </Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            size="large"
            onFinish={onFinish}
          >
            <Form.Item
              name="branchId"
              label={<span style={{ fontWeight: 600, color: '#334155' }}>Chọn chi nhánh</span>}
              rules={[{ required: true, message: 'Vui lòng chọn chi nhánh muốn đặt bàn!' }]}
            >
              <Select
                placeholder="Chọn chi nhánh nhà hàng..."
                loading={loadingBranches}
                suffixIcon={<ShopOutlined />}
              >
                {branches.map(b => (
                  <Option key={b.id} value={b.id}>
                    {b.name} - {b.newAddressName || 'Địa chỉ chung'}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="reservationTime"
                  label={<span style={{ fontWeight: 600, color: '#334155' }}>Thời gian</span>}
                  rules={[
                    { required: true, message: 'Vui lòng chọn thời gian nhận bàn!' },
                    {
                      validator: (_, value) => {
                        if (value && value.isBefore(dayjs().add(15, 'minute'))) {
                          return Promise.reject(new Error('Thời gian đặt bàn phải cách hiện tại ít nhất 15 phút'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <DatePicker
                    showTime
                    format="DD/MM/YYYY HH:mm"
                    style={{ width: '100%' }}
                    disabledDate={current => current && current.isBefore(dayjs().startOf('day'))}
                    placeholder="Chọn ngày & giờ"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="numberOfGuests"
                  label={<span style={{ fontWeight: 600, color: '#334155' }}>Số lượng khách</span>}
                  rules={[{ required: true, message: 'Vui lòng nhập số lượng khách!' }]}
                >
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    placeholder="Số lượng khách đi"
                    addonBefore={<UserOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="note"
              label={<span style={{ fontWeight: 600, color: '#334155' }}>Ghi chú đặt bàn</span>}
            >
              <Input.TextArea
                placeholder="Ví dụ: Đặt bàn gần cửa sổ, tổ chức sinh nhật, cần ghế cho trẻ em..."
                rows={3}
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 8,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                  borderColor: '#ea580c',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.2)'
                }}
              >
                Gửi Yêu Cầu Đặt Bàn
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default CustomerReservationPage;