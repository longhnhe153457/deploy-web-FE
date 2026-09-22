import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Select,
  Modal,
  Form,
  Input,
  InputNumber,
  Checkbox,
  Radio,
  message,
  Spin,
  Row,
  Col,
  Statistic,
  Space,
  Tooltip,
  DatePicker,
} from 'antd';
import {
  MessageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ReloadOutlined,
  EditOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getBranchShiftFeedbacks, processShiftFeedback } from '../api/shiftFeedbackApi';
import { getAllBranches } from '../api/branchApi';
import { useAuth } from '../context/AuthContext';

const formatOtStatus = (status) => {
  switch (status) {
    case 'Approved':
      return 'Đã duyệt';
    case 'Pending':
      return 'Chờ duyệt';
    case 'Rejected':
      return 'Từ chối';
    case 'None':
    default:
      return 'Không có';
  }
};

const ShiftFeedbackPage = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || null);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // Advanced Filters & Pagination
  const [searchKeyword, setSearchKeyword] = useState('');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [pageSize, setPageSize] = useState(10);

  // Process Modal State
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [processForm] = Form.useForm();
  const updateOTWatch = Form.useWatch('updateOT', processForm);

  const loadBranches = useCallback(async () => {
    try {
      const res = await getAllBranches();
      const branchData = res.data || [];
      setBranches(branchData);
      if (!selectedBranchId && branchData.length > 0) {
        setSelectedBranchId(branchData[0].id);
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách chi nhánh!');
    }
  }, [selectedBranchId]);

  const loadFeedbacks = useCallback(async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const res = await getBranchShiftFeedbacks(selectedBranchId);
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách phản hồi ca!');
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  const handleOpenProcessModal = (record) => {
    setSelectedFeedback(record);
    processForm.resetFields();
    processForm.setFieldsValue({
      status: 'Resolved',
      responseMessage: 'Đã kiểm tra và cập nhật lại ca làm việc.',
      updateOT: record.feedbackType === 'OTDispute' || record.feedbackType === 'HoursDispute',
      approvedOTHours: record.approvedOTHours || 0,
      otStatus: 'Approved',
      otNotes: 'Cập nhật theo phản hồi ca làm việc',
    });
    setProcessModalOpen(true);
  };

  const handleProcessSubmit = async (values) => {
    if (!selectedFeedback) return;
    setProcessLoading(true);
    try {
      const payload = {
        status: values.status,
        responseMessage: values.responseMessage,
        updateOT: !!values.updateOT,
        approvedOTHours: values.updateOT ? values.approvedOTHours : undefined,
        otStatus: values.updateOT ? values.otStatus : undefined,
        otNotes: values.updateOT ? values.otNotes : undefined,
      };

      await processShiftFeedback(selectedFeedback.id, payload);
      message.success('🟢 Đã xử lý phản hồi thành công!');
      setProcessModalOpen(false);
      loadFeedbacks();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi xử lý phản hồi!';
      message.error(errMsg);
    } finally {
      setProcessLoading(false);
    }
  };

  const getStatusTag = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'RESOLVED':
        return <Tag icon={<CheckCircleOutlined />} color="success">Đã giải quyết</Tag>;
      case 'REJECTED':
        return <Tag icon={<CloseCircleOutlined />} color="error">Từ chối</Tag>;
      case 'PENDING':
      default:
        return <Tag icon={<SyncOutlined spin />} color="warning">Chờ xử lý</Tag>;
    }
  };

  const getFeedbackTypeTag = (type) => {
    switch (type) {
      case 'OTDispute':
        return <Tag color="volcano">Quản lý duyệt sai OT</Tag>;
      case 'HoursDispute':
        return <Tag color="purple">Sai tổng giờ công</Tag>;
      case 'AttendanceDispute':
        return <Tag color="orange">Nhầm điểm danh</Tag>;
      default:
        return <Tag color="blue">Khác</Tag>;
    }
  };

  // Stats calculation
  const totalCount = feedbacks.length;
  const pendingCount = feedbacks.filter((f) => (f.status || '').toUpperCase() === 'PENDING').length;
  const resolvedCount = feedbacks.filter((f) => (f.status || '').toUpperCase() === 'RESOLVED').length;
  const rejectedCount = feedbacks.filter((f) => (f.status || '').toUpperCase() === 'REJECTED').length;

  // Filtered data calculation
  const filteredFeedbacks = feedbacks.filter((item) => {
    // Status filter
    if (selectedStatus !== 'ALL') {
      if ((item.status || '').toUpperCase() !== selectedStatus.toUpperCase()) return false;
    }
    // Type filter
    if (feedbackTypeFilter !== 'ALL') {
      if (item.feedbackType !== feedbackTypeFilter) return false;
    }
    // Month filter
    if (selectedMonth) {
      const workMonth = dayjs(item.workDate).format('YYYY-MM');
      if (workMonth !== selectedMonth.format('YYYY-MM')) return false;
    }
    // Search keyword filter
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      const empName = (item.employeeName || '').toLowerCase();
      const empCode = (item.employeeCode || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const content = (item.content || '').toLowerCase();
      if (!empName.includes(kw) && !empCode.includes(kw) && !title.includes(kw) && !content.includes(kw)) {
        return false;
      }
    }
    return true;
  });

  const columns = [
    {
      title: 'Mã & Nhân viên',
      key: 'employee',
      width: 120,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '12px' }}>{record.employeeName}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Mã: {record.employeeCode}</div>
        </div>
      ),
    },
    {
      title: 'Thông tin ca',
      key: 'shift',
      width: 140,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          <div>📅 {dayjs(record.workDate).format('DD/MM/YYYY')}</div>
          <div>🕒 <strong>{record.shiftName}</strong></div>
          {record.checkInAt && (
            <div style={{ fontSize: '10px', color: '#16a34a' }}>
              In: {dayjs(record.checkInAt).format('HH:mm')} | Out: {record.checkOutAt ? dayjs(record.checkOutAt).format('HH:mm') : '—'}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Giờ công & OT',
      key: 'ot',
      width: 110,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          <div>Công: <strong>{record.actualHours !== null ? `${record.actualHours}h` : '—'}</strong></div>
          <div style={{ marginTop: '2px' }}>
            <Tag color={record.approvedOTHours > 0 ? 'orange' : 'default'} style={{ fontSize: '10px', margin: 0, padding: '0 4px' }}>
              OT: {record.approvedOTHours || 0}h
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Nội dung phản hồi / Khiếu nại',
      key: 'content',
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {getFeedbackTypeTag(record.feedbackType)}
            <strong style={{ color: '#0f172a', fontSize: '13px' }}>{record.title}</strong>
          </div>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#334155',
              lineHeight: '1.4',
            }}
          >
            {record.content}
          </div>
        </div>
      ),
    },
    {
      title: 'Quản lý trả lời',
      key: 'managerResponse',
      render: (_, record) => {
        if (!record.responseMessage) {
          return <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Chưa có phản hồi</span>;
        }

        const isRejected = (record.status || '').toUpperCase() === 'REJECTED';
        return (
          <div
            style={{
              background: isRejected ? '#fef2f2' : '#f0fdf4',
              border: isRejected ? '1px solid #fecaca' : '1px solid #bbf7d0',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              color: isRejected ? '#991b1b' : '#166534',
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2px', fontSize: '11px' }}>
              <span>💬 Trả lời ({record.resolverName || 'Quản lý'}):</span>
              {record.resolvedAt && (
                <span style={{ opacity: 0.8 }}>
                  {dayjs(record.resolvedAt).format('HH:mm DD/MM')}
                </span>
              )}
            </div>
            <div style={{ lineHeight: '1.3' }}>{record.responseMessage}</div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <div>
          {getStatusTag(record.status)}
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
            {dayjs(record.createdAt).format('HH:mm DD/MM')}
          </div>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          style={{
            background: record.status === 'Pending' ? '#f97316' : '#0284c7',
            borderColor: record.status === 'Pending' ? '#f97316' : '#0284c7',
            fontWeight: '600',
            borderRadius: '6px',
            fontSize: '11px',
          }}
          onClick={() => handleOpenProcessModal(record)}
        >
          {record.status === 'Pending' ? 'Xử lý' : 'Xem/Sửa'}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Page Title Card */}
      <Card
        style={{
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #132238 0%, #1e293b 100%)',
          borderRadius: '12px',
          color: '#fff',
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MessageOutlined style={{ fontSize: '28px', color: '#f97316' }} />
            <div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '700' }}>
                QUẢN LÝ PHẢN HỒI CA LÀM VIỆC & DUYỆT OT
              </h2>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                Xử lý khiếu nại của nhân viên về kết quả ca làm, giờ công và thời gian duyệt OT.
              </div>
            </div>
          </div>

          <Space size="middle">
            <Select
              style={{ width: 220 }}
              placeholder="Chọn chi nhánh"
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadFeedbacks}
              loading={loading}
              style={{ background: '#f97316', borderColor: '#f97316', fontWeight: 'bold' }}
            >
              Làm mới
            </Button>
          </Space>
        </div>
      </Card>

      {/* Stats Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col xs={12} sm={6}>
          <Card bodyStyle={{ padding: '16px' }} style={{ borderRadius: '10px' }}>
            <Statistic title="Tổng số phản hồi" value={totalCount} valueStyle={{ color: '#0f172a', fontWeight: '700' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bodyStyle={{ padding: '16px' }} style={{ borderRadius: '10px', borderLeft: '4px solid #f59e0b' }}>
            <Statistic title="Chờ xử lý" value={pendingCount} valueStyle={{ color: '#d97706', fontWeight: '700' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bodyStyle={{ padding: '16px' }} style={{ borderRadius: '10px', borderLeft: '4px solid #22c55e' }}>
            <Statistic title="Đã giải quyết" value={resolvedCount} valueStyle={{ color: '#16a34a', fontWeight: '700' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bodyStyle={{ padding: '16px' }} style={{ borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
            <Statistic title="Đã từ chối" value={rejectedCount} valueStyle={{ color: '#dc2626', fontWeight: '700' }} />
          </Card>
        </Col>
      </Row>

      {/* Filter Bar */}
      <Card bodyStyle={{ padding: '12px 16px' }} style={{ marginBottom: '16px', borderRadius: '12px', background: '#ffffff' }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={10} md={8}>
            <Input
              placeholder="Tìm theo tên NV, mã NV, tiêu đề..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={7} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Loại phản hồi"
              value={feedbackTypeFilter}
              onChange={setFeedbackTypeFilter}
              options={[
                { value: 'ALL', label: 'Tất cả loại phản hồi' },
                { value: 'OTDispute', label: 'Quản lý duyệt sai OT' },
                { value: 'HoursDispute', label: 'Sai tổng giờ công' },
                { value: 'AttendanceDispute', label: 'Nhầm điểm danh' },
                { value: 'Other', label: 'Ý kiến / Khác' },
              ]}
            />
          </Col>
          <Col xs={12} sm={7} md={6}>
            <DatePicker
              picker="month"
              format="MM/YYYY"
              placeholder="Lọc theo tháng"
              style={{ width: '100%' }}
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
          </Col>
          {(searchKeyword || feedbackTypeFilter !== 'ALL' || selectedMonth) && (
            <Col xs={24} sm={24} md={4}>
              <Button
                type="link"
                danger
                onClick={() => {
                  setSearchKeyword('');
                  setFeedbackTypeFilter('ALL');
                  setSelectedMonth(null);
                }}
                style={{ padding: 0 }}
              >
                Xóa lọc
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      {/* Table Card */}
      <Card
        style={{ borderRadius: '12px' }}
        bodyStyle={{ padding: '16px' }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontWeight: '700', fontSize: '15px' }}>
              Danh sách phản hồi ({filteredFeedbacks.length})
            </span>
            <Radio.Group
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="ALL">Tất cả ({totalCount})</Radio.Button>
              <Radio.Button value="Pending">Chờ xử lý ({pendingCount})</Radio.Button>
              <Radio.Button value="Resolved">Đã giải quyết ({resolvedCount})</Radio.Button>
              <Radio.Button value="Rejected">Đã từ chối ({rejectedCount})</Radio.Button>
            </Radio.Group>
          </div>
        }
      >
        <Spin spinning={loading}>
          <Table
            dataSource={filteredFeedbacks}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: pageSize,
              onShowSizeChange: (_, size) => setPageSize(size),
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '25'],
              position: ['bottomRight'],
            }}
            locale={{ emptyText: 'Không tìm thấy phản hồi nào phù hợp.' }}
          />
        </Spin>
      </Card>

      {/* Process Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f97316', fontSize: '18px' }}>
            <EditOutlined />
            <span>XỬ LÝ PHẢN HỒI CA LÀM VIỆC</span>
          </div>
        }
        open={processModalOpen}
        onCancel={() => setProcessModalOpen(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        {selectedFeedback && (
          <div style={{ marginTop: '12px' }}>
            {/* Feedback Detail Summary Box */}
            <div
              style={{
                background: '#fff7ed',
                border: '1px solid #ffedd5',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: '700', color: '#ea580c', marginBottom: '4px' }}>
                Thông tin phản hồi từ: {selectedFeedback.employeeName} ({selectedFeedback.employeeCode})
              </div>
              <div>📅 <strong>Ngày ca:</strong> {dayjs(selectedFeedback.workDate).format('DD/MM/YYYY')} | <strong>Ca:</strong> {selectedFeedback.shiftName} ({selectedFeedback.shiftTime})</div>
              <div>⏱ <strong>Giờ làm thực tế:</strong> {selectedFeedback.actualHours !== null ? `${selectedFeedback.actualHours}h` : '—'}</div>
              <div>
                🔸 <strong>OT hiện tại:</strong> {selectedFeedback.approvedOTHours || 0} giờ ({formatOtStatus(selectedFeedback.otStatus)})
              </div>
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #fdba74' }}>
                <strong>Vấn đề phản hồi:</strong> <span style={{ color: '#c2410c', fontWeight: '600' }}>{selectedFeedback.title}</span>
                <div style={{ fontStyle: 'italic', color: '#475569', marginTop: '2px' }}>"{selectedFeedback.content}"</div>
              </div>
            </div>

            <Form form={processForm} layout="vertical" onFinish={handleProcessSubmit}>
              <Form.Item
                name="status"
                label={<span style={{ fontWeight: '600' }}>Quyết định xử lý:</span>}
                rules={[{ required: true, message: 'Vui lòng chọn quyết định!' }]}
              >
                <Radio.Group buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
                  <Radio.Button value="Resolved" style={{ flex: 1, textAlign: 'center', background: '#f0fdf4' }}>
                    🟢 Chấp nhận (Đã giải quyết)
                  </Radio.Button>
                  <Radio.Button value="Rejected" style={{ flex: 1, textAlign: 'center', background: '#fef2f2' }}>
                    🔴 Từ chối phản hồi
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="updateOT" valuePropName="checked">
                <Checkbox style={{ fontWeight: '600', color: '#ea580c' }}>
                  ⚡ Cập nhật lại số giờ OT cho ca làm việc này ngay lập tức
                </Checkbox>
              </Form.Item>

              {updateOTWatch && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                  }}
                >
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item
                        name="approvedOTHours"
                        label={<span style={{ fontWeight: '600' }}>Số giờ OT mới:</span>}
                        rules={[{ required: true, message: 'Nhập số giờ OT' }]}
                      >
                        <InputNumber min={0} max={24} step={0.5} style={{ width: '100%' }} suffix="giờ" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="otStatus"
                        label={<span style={{ fontWeight: '600' }}>Trạng thái OT:</span>}
                        rules={[{ required: true, message: 'Chọn trạng thái OT' }]}
                      >
                        <Select
                          options={[
                            { value: 'Approved', label: 'Đã duyệt' },
                            { value: 'Pending', label: 'Chờ duyệt' },
                            { value: 'Rejected', label: 'Từ chối OT' },
                            { value: 'None', label: 'Không có OT' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="otNotes" label={<span style={{ fontWeight: '600' }}>Ghi chú OT:</span>} style={{ marginBottom: 0 }}>
                    <Input placeholder="Nhập ghi chú điều chỉnh OT..." />
                  </Form.Item>
                </div>
              )}

              <Form.Item
                name="responseMessage"
                label={<span style={{ fontWeight: '600' }}>Lời nhắn trả lời nhân viên:</span>}
                rules={[{ required: true, message: 'Vui lòng nhập lời nhắn cho nhân viên!' }]}
              >
                <Input.TextArea rows={3} placeholder="Nhập câu trả lời cụ thể cho nhân viên..." />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <Button onClick={() => setProcessModalOpen(false)}>Hủy</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={processLoading}
                  style={{ background: '#f97316', borderColor: '#f97316', fontWeight: 'bold' }}
                >
                  Xác nhận & Gửi kết quả
                </Button>
              </div>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ShiftFeedbackPage;
