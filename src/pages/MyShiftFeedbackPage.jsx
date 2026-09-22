import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Tag,
  Radio,
  Spin,
  Row,
  Col,
  Statistic,
  Space,
  Table,
  Typography,
} from 'antd';
import {
  MessageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getMyShiftFeedbacks } from '../api/shiftFeedbackApi';
import ShiftFeedbackModal from '../components/workSchedule/ShiftFeedbackModal';
import { getAllWorkSchedules, getMyWorkSchedules } from '../api/workScheduleApi';
import { getAllShifts } from '../api/shiftApi';
import { getAllBranches } from '../api/branchApi';

const { Text } = Typography;

const getDayName = (dateStr) => {
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const d = dayjs(dateStr).day();
  return days[d] || '';
};

const MyShiftFeedbackPage = () => {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Schedules, shifts, branches context for feedback modal
  const [allSchedules, setAllSchedules] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [branches, setBranches] = useState([]);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyShiftFeedbacks();
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error('Error fetching shift feedbacks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchScheduleContext = useCallback(async () => {
    try {
      let scheds = [];
      try {
        const resAll = await getAllWorkSchedules();
        scheds = resAll.data || [];
      } catch (e) {
        const resMine = await getMyWorkSchedules();
        scheds = resMine.data || [];
      }
      const [shiftsRes, branchesRes] = await Promise.all([
        getAllShifts(),
        getAllBranches(),
      ]);
      setAllSchedules(scheds);
      setShifts(shiftsRes.data || []);
      setBranches(branchesRes.data || []);
    } catch (err) {
      console.error('Error fetching schedule context:', err);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
    fetchScheduleContext();
  }, [fetchFeedbacks, fetchScheduleContext]);

  const getStatusTag = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'RESOLVED':
        return (
          <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: '12px', padding: '4px 10px' }}>
            Đã xử lý
          </Tag>
        );
      case 'REJECTED':
        return (
          <Tag icon={<CloseCircleOutlined />} color="error" style={{ fontSize: '12px', padding: '4px 10px' }}>
            Từ chối
          </Tag>
        );
      case 'PENDING':
      default:
        return (
          <Tag icon={<SyncOutlined spin />} color="processing" style={{ fontSize: '12px', padding: '4px 10px' }}>
            Chờ quản lý duyệt
          </Tag>
        );
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
        return <Tag color="blue">Ý kiến / Khác</Tag>;
    }
  };

  // Filter logic
  const filteredFeedbacks = feedbacks.filter((item) => {
    if (selectedStatus === 'ALL') return true;
    return (item.status || '').toUpperCase() === selectedStatus.toUpperCase();
  });

  const totalCount = feedbacks.length;
  const pendingCount = feedbacks.filter((f) => (f.status || '').toUpperCase() === 'PENDING').length;
  const resolvedCount = feedbacks.filter((f) => (f.status || '').toUpperCase() === 'RESOLVED').length;
  const rejectedCount = feedbacks.filter((f) => (f.status || '').toUpperCase() === 'REJECTED').length;

  const columns = [
    {
      title: 'Ngày gửi',
      key: 'createdAt',
      width: 110,
      render: (_, record) => (
        <div style={{ fontSize: '12px', color: '#334155', fontWeight: '500' }}>
          {dayjs(record.createdAt).format('HH:mm DD/MM')}
        </div>
      ),
    },
    {
      title: 'Thông tin ca làm việc',
      key: 'shiftInfo',
      width: 160,
      render: (_, record) => (
        <div style={{ fontSize: '12px' }}>
          <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
            <CalendarOutlined style={{ color: '#ea580c', marginRight: 4 }} />
            {dayjs(record.workDate).format('DD/MM/YYYY')}
          </div>
          <div style={{ color: '#475569', fontWeight: '600' }}>
            <ClockCircleOutlined style={{ color: '#ea580c', marginRight: 4 }} />
            Ca: {record.shiftName}
          </div>
          {record.branchName && (
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              <EnvironmentOutlined style={{ color: '#ea580c', marginRight: 4 }} />
              {record.branchName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Nội dung phản hồi / Khiếu nại',
      key: 'content',
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', flexWrap: 'wrap' }}>
            {getFeedbackTypeTag(record.feedbackType)}
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{record.title}</strong>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 8px', borderRadius: '6px', fontSize: '12px', color: '#334155', lineHeight: '1.4' }}>
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
              borderRadius: '6px',
              padding: '6px 8px',
              fontSize: '12px',
              color: isRejected ? '#991b1b' : '#166534',
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2px', fontSize: '11px' }}>
              <span>💬 Quản lý ({record.resolverName || 'Manager'}):</span>
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
      width: 120,
      align: 'center',
      render: (_, record) => getStatusTag(record.status),
    },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px', minHeight: '100vh', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* Header Bar */}
      <Card
        style={{
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #132238 0%, #1e293b 100%)',
          borderRadius: '14px',
          color: '#fff',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
        }}
        bodyStyle={{ padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined style={{ color: '#fff', fontSize: '18px' }} />}
              onClick={() => navigate('/work-schedule')}
              style={{ color: '#fff' }}
            >
              Quay lại
            </Button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageOutlined style={{ fontSize: '22px', color: '#ea580c' }} />
                <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '800' }}>
                  LỊCH SỬ PHẢN HỒI CA LÀM VIỆC
                </h2>
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                Theo dõi trạng thái và kết quả xử lý phản hồi/khiếu nại từ Quản lý.
              </div>
            </div>
          </div>

          <Space size="middle">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
              style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 'bold', borderRadius: '10px', height: '40px' }}
            >
              Gửi phản hồi mới
            </Button>
            <Button
              type="default"
              shape="circle"
              icon={<ReloadOutlined />}
              onClick={fetchFeedbacks}
              loading={loading}
            />
          </Space>
        </div>
      </Card>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col xs={12} sm={6}>
          <Card bodyStyle={{ padding: '16px' }} style={{ borderRadius: '12px', background: '#fff' }}>
            <Statistic title="Tổng số phản hồi" value={totalCount} valueStyle={{ color: '#0f172a', fontWeight: '700' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bodyStyle={{ padding: '16px' }} style={{ borderRadius: '12px', background: '#fff', borderLeft: '4px solid #0284c7' }}>
            <Statistic title="Chờ quản lý duyệt" value={pendingCount} valueStyle={{ color: '#0284c7', fontWeight: '700' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bodyStyle={{ padding: '16px' }} style={{ borderRadius: '12px', background: '#fff', borderLeft: '4px solid #22c55e' }}>
            <Statistic title="Đã giải quyết" value={resolvedCount} valueStyle={{ color: '#16a34a', fontWeight: '700' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bodyStyle={{ padding: '16px' }} style={{ borderRadius: '12px', background: '#fff', borderLeft: '4px solid #ef4444' }}>
            <Statistic title="Từ chối" value={rejectedCount} valueStyle={{ color: '#dc2626', fontWeight: '700' }} />
          </Card>
        </Col>
      </Row>

      {/* Main Table Section */}
      <Card
        style={{ borderRadius: '14px', background: '#ffffff' }}
        bodyStyle={{ padding: '20px' }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontWeight: '700', fontSize: '16px', color: '#1e293b' }}>
              Danh sách phản hồi ({filteredFeedbacks.length})
            </span>
            <Radio.Group
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              buttonStyle="solid"
              size="middle"
            >
              <Radio.Button value="ALL">Tất cả ({totalCount})</Radio.Button>
              <Radio.Button value="PENDING">Chờ xử lý ({pendingCount})</Radio.Button>
              <Radio.Button value="RESOLVED">Đã giải quyết ({resolvedCount})</Radio.Button>
              <Radio.Button value="REJECTED">Từ chối ({rejectedCount})</Radio.Button>
            </Radio.Group>
          </div>
        }
      >
        <Table
          dataSource={filteredFeedbacks}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['5', '10', '25'] }}
          bordered
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                <MessageOutlined style={{ fontSize: '36px', color: '#cbd5e1', marginBottom: '8px' }} />
                <div>Không tìm thấy phản hồi nào.</div>
              </div>
            ),
          }}
        />
      </Card>

      {/* Modal for creating new shift feedback */}
      <ShiftFeedbackModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        allSchedules={allSchedules}
        shifts={shifts}
        branches={branches}
        onSuccess={() => {
          setCreateModalOpen(false);
          fetchFeedbacks();
        }}
      />
    </div>
  );
};

export default MyShiftFeedbackPage;
