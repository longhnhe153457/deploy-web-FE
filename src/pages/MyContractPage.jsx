import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tag,
  Spin,
  Button,
  Descriptions,
  Empty,
  Typography,
  Divider,
  Space,
  Row,
  Col,
  Alert,
  message,
} from 'antd';
import {
  FileProtectOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  BankOutlined,
  UserOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getMyContracts } from '../api/contractApi';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const CONTRACT_TYPES = {
  'Full-time': 'Toàn thời gian',
  'Part-time': 'Bán thời gian',
};

const SALARY_TYPES = {
  'Monthly': 'Theo tháng',
  'Fixed': 'Theo tháng',
  'Hourly': 'Lương theo giờ',
};

const STATUS_TAGS = {
  'Active': { label: 'Đang hiệu lực', color: 'success', icon: <CheckCircleOutlined /> },
  'Expired': { label: 'Đã hết hạn', color: 'warning', icon: <ClockCircleOutlined /> },
  'Terminated': { label: 'Đã chấm dứt', color: 'error', icon: <InfoCircleOutlined /> },
};

const ROLE_NAMES = {
  'Admin': 'Chủ sở hữu',
  'Owner': 'Chủ sở hữu',
  'Manager': 'Quản lý',
  'Cashier': 'Thu ngân',
  'Chef': 'Bếp trưởng',
  'HeadChef': 'Bếp trưởng',
  'Waiter': 'Phục vụ',
  'Staff': 'Phục vụ',
  1: 'Chủ sở hữu',
  2: 'Chủ sở hữu',
  3: 'Quản lý',
  4: 'Thu ngân',
  5: 'Bếp trưởng',
  6: 'Phục vụ',
};

const getRoleDisplayName = (roleName, roleId) => {
  if (roleName && ROLE_NAMES[roleName]) return ROLE_NAMES[roleName];
  if (roleId && ROLE_NAMES[roleId]) return ROLE_NAMES[roleId];
  return roleName || (roleId ? `Chức vụ #${roleId}` : '—');
};

const MyContractPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMyContracts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyContracts();
      setContracts(res.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải thông tin hợp đồng của bạn!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyContracts();
  }, [fetchMyContracts]);

  // Find active contract or latest contract
  const activeContract = contracts.find((c) => c.status === 'Active') || (contracts.length > 0 ? contracts[0] : null);
  const otherContracts = contracts.filter((c) => c !== activeContract);

  return (
    <div className="my-contract-page animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: '20px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined style={{ fontSize: '18px' }} />}
          onClick={() => navigate('/home')}
          style={{ position: 'absolute', left: 0 }}
        />
        <h2 style={{ width: '100%', textAlign: 'center', margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#000' }}>
          Hợp Đồng Của Tôi
        </h2>
        <Button
          type="text"
          icon={<ReloadOutlined style={{ fontSize: '16px' }} />}
          onClick={fetchMyContracts}
          loading={loading}
          style={{ position: 'absolute', right: 0 }}
        />
      </div>

      <Spin spinning={loading}>
        {contracts.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text strong style={{ fontSize: '16px', color: '#595959' }}>
                    Bạn chưa có hợp đồng lao động nào
                  </Text>
                  <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '6px' }}>
                    Vui lòng liên hệ Quản lý hoặc Bộ phận Nhân sự nếu có thắc mắc.
                  </div>
                </div>
              }
            />
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Active Contract Main Card */}
            {activeContract && (
              <Card
                style={{
                  borderRadius: '16px',
                  border: '1px solid #ffd8d3',
                  background: 'linear-gradient(135deg, #ffffff 0%, #fff9f8 100%)',
                  boxShadow: '0 4px 16px rgba(232, 68, 42, 0.08)',
                  overflow: 'hidden',
                }}
                bodyStyle={{ padding: '24px' }}
              >
                {/* Contract Badge Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: '#ffefed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#e8442a',
                        fontSize: '24px',
                      }}
                    >
                      <FileProtectOutlined />
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e8442a' }}>
                        Hợp Đồng Lao Động #{activeContract.id}
                      </div>
                      <Text type="secondary" style={{ fontSize: '13px' }}>
                        Ngày tạo: {dayjs(activeContract.createdAt).format('DD/MM/YYYY')}
                      </Text>
                    </div>
                  </div>

                  <div>
                    {STATUS_TAGS[activeContract.status] ? (
                      <Tag
                        icon={STATUS_TAGS[activeContract.status].icon}
                        color={STATUS_TAGS[activeContract.status].color}
                        style={{ padding: '4px 12px', fontSize: '14px', borderRadius: '20px', fontWeight: '600' }}
                      >
                        {STATUS_TAGS[activeContract.status].label}
                      </Tag>
                    ) : (
                      <Tag style={{ padding: '4px 12px', fontSize: '14px', borderRadius: '20px' }}>
                        {activeContract.status}
                      </Tag>
                    )}
                  </div>
                </div>

                <Divider style={{ margin: '16px 0' }} />

                {/* Main Information Highlights */}
                <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
                  <Col xs={24} sm={12}>
                    <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8c8c8c', marginBottom: '4px' }}>
                        <UserOutlined />
                        <span style={{ fontSize: '13px' }}>Nhân viên & Chức danh</span>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#262626' }}>
                        {activeContract.accountName || user?.name || `Tài khoản #${activeContract.accountId}`}
                      </div>
                      <Tag color="blue" style={{ marginTop: '6px', borderRadius: '4px' }}>
                        {getRoleDisplayName(activeContract.roleName, activeContract.roleId)}
                      </Tag>
                    </div>
                  </Col>

                  <Col xs={24} sm={12}>
                    <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8c8c8c', marginBottom: '4px' }}>
                        <BankOutlined />
                        <span style={{ fontSize: '13px' }}>Chi nhánh làm việc</span>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#262626' }}>
                        {activeContract.branchName || `Chi nhánh #${activeContract.branchId}`}
                      </div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Áp dụng theo hợp đồng hiện tại
                      </Text>
                    </div>
                  </Col>
                </Row>

                {/* Salary & Term Details */}
                <Card
                  type="inner"
                  title={
                    <Space style={{ color: '#e8442a', fontWeight: 'bold' }}>
                      <DollarOutlined />
                      <span>Chế Độ Lương & Ngày Công</span>
                    </Space>
                  }
                  style={{ borderRadius: '12px', marginBottom: '20px', background: '#fafafa' }}
                >
                  <Row gutter={[16, 16]}>
                    {(() => {
                      const hideDay = activeContract.type === 'Part-time' || activeContract.salaryType === 'Hourly' || activeContract.roleId === 3 || !activeContract.baseWorkDay;
                      const colSpan = hideDay ? 12 : 8;
                      return (
                        <>
                          <Col xs={24} sm={colSpan}>
                            <Text type="secondary">Mức lương cơ bản:</Text>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a', marginTop: '4px' }}>
                              {new Intl.NumberFormat('vi-VN').format(activeContract.baseSalary)} đ
                            </div>
                          </Col>
                          <Col xs={24} sm={colSpan}>
                            <Text type="secondary">Hình thức lương:</Text>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#262626', marginTop: '4px' }}>
                              {SALARY_TYPES[activeContract.salaryType] || activeContract.salaryType}
                            </div>
                          </Col>
                          {!hideDay && (
                            <Col xs={24} sm={colSpan}>
                              <Text type="secondary">Ngày công chuẩn / tháng:</Text>
                              <div style={{ fontSize: '15px', fontWeight: '600', color: '#262626', marginTop: '4px' }}>
                                {activeContract.baseWorkDay} ngày
                              </div>
                            </Col>
                          )}
                        </>
                      );
                    })()}
                  </Row>
                </Card>

                {/* Contract Duration */}
                <Card
                  type="inner"
                  title={
                    <Space style={{ color: '#1890ff', fontWeight: 'bold' }}>
                      <CalendarOutlined />
                      <span>Thời Gian & Loại Hợp Đồng</span>
                    </Space>
                  }
                  style={{ borderRadius: '12px', background: '#fafafa' }}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <Text type="secondary">Loại hợp đồng:</Text>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#262626', marginTop: '4px' }}>
                        {CONTRACT_TYPES[activeContract.type] || activeContract.type}
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text type="secondary">Thời hạn hợp đồng:</Text>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#262626', marginTop: '4px' }}>
                        {activeContract.startDate ? dayjs(activeContract.startDate).format('DD/MM/YYYY') : 'Chưa xác định'} 
                        {'  ➔  '} 
                        {activeContract.endDate ? dayjs(activeContract.endDate).format('DD/MM/YYYY') : 'Không thời hạn'}
                      </div>
                    </Col>
                  </Row>
                  {activeContract.note && (
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #d9d9d9' }}>
                      <Text type="secondary">Ghi chú bổ sung:</Text>
                      <div style={{ fontSize: '14px', color: '#595959', fontStyle: 'italic', marginTop: '4px' }}>
                        "{activeContract.note}"
                      </div>
                    </div>
                  )}
                </Card>
              </Card>
            )}

            {/* Other Contracts History */}
            {otherContracts.length > 0 && (
              <Card
                title={
                  <Space style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    <SolutionOutlined />
                    <span>Lịch Sử Hợp Đồng Trước Đây ({otherContracts.length})</span>
                  </Space>
                }
                style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {otherContracts.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0',
                        background: '#fafafa',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <Space>
                          <Text strong>Hợp đồng #{c.id}</Text>
                          <Tag>{CONTRACT_TYPES[c.type] || c.type}</Tag>
                        </Space>
                        <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '2px' }}>
                          Thời gian: {dayjs(c.startDate).format('DD/MM/YYYY')} - {c.endDate ? dayjs(c.endDate).format('DD/MM/YYYY') : 'N/A'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Text strong style={{ color: '#595959' }}>
                          {new Intl.NumberFormat('vi-VN').format(c.baseSalary)} đ
                        </Text>
                        {STATUS_TAGS[c.status] ? (
                          <Tag color={STATUS_TAGS[c.status].color}>{STATUS_TAGS[c.status].label}</Tag>
                        ) : (
                          <Tag>{c.status}</Tag>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </Spin>
    </div>
  );
};

export default MyContractPage;
