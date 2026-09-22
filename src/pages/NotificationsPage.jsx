import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Typography, Button, Space, message } from 'antd';
import { CheckCircleOutlined, WarningOutlined, InfoCircleOutlined, ShopOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getNotifications as getPagedNotifications, markAsRead } from '../api/notificationApi';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const NotificationsPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();
  const { user } = useAuth();

  const loadData = useCallback(async (pageIndex = page, size = pageSize) => {
    setLoading(true);
    try {
      const res = await getPagedNotifications({
        page: pageIndex,
        pageSize: size
      });
      if (res.data) {
        setData(res.data.items || []);
        setTotal(res.data.totalCount || 0);
      }
    } catch (err) {
      console.error(err);
      message.error("Lỗi tải danh sách thông báo");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (user) {
      loadData(page, pageSize);
    }
  }, [page, pageSize, user, loadData]);

  const handleTableChange = (pagination) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const handleMarkAsRead = async (record) => {
    try {
      await markAsRead(record.id);
      message.success("Đã đánh dấu đã đọc");
      loadData(page, pageSize);
      // Phát event để chuông cập nhật lại số lượng
      window.dispatchEvent(new Event('notification-updated'));
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi cập nhật trạng thái");
    }
  };

  const handleRowClick = (record) => {
    if (!record.isRead) {
      handleMarkAsRead(record);
    }
    if (record.redirectUrl) {
      navigate(record.redirectUrl);
    }
  };

  const getIconForType = (type, priority) => {
    if (type === 'Operational' && priority === 'Critical') return <WarningOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />;
    if (type === 'Inventory') return <ShopOutlined style={{ color: '#faad14', fontSize: 18 }} />;
    if (type === 'Quality') return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />;
    return <InfoCircleOutlined style={{ color: '#1677ff', fontSize: 18 }} />;
  };

  const getTypeLabel = (type) => {
    const map = {
      Operational: "Hoạt động",
      Inventory: "Tồn kho",
      Quality: "Chất lượng",
      ShelfLife: "Hạn sử dụng"
    };
    return map[type] || type;
  };

  const columns = [
    {
      title: 'Loại',
      key: 'type',
      width: 120,
      render: (_, record) => (
        <Space>
          {getIconForType(record.type, record.priority)}
          <Text strong={!record.isRead}>{getTypeLabel(record.type)}</Text>
        </Space>
      )
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong={!record.isRead}>{text}</Text>
          {record.isImportant && <Tag color="error">Quan trọng</Tag>}
        </Space>
      )
    },
    {
      title: 'Nội dung',
      dataIndex: 'message',
      key: 'message',
      render: (text, record) => <Text style={{ fontWeight: record.isRead ? 'normal' : 500 }}>{text}</Text>
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) => (
        record.isRead ? (
          <Tag color="default">Đã đọc</Tag>
        ) : (
          <Tag color="processing">Chưa đọc</Tag>
        )
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_, record) => (
        !record.isRead ? (
          <Button 
            type="text" 
            icon={<CheckOutlined />} 
            onClick={(e) => {
              e.stopPropagation();
              handleMarkAsRead(record);
            }}
          >
            Đánh dấu
          </Button>
        ) : null
      )
    }
  ];

  return (
    <Card 
      title={<Title level={4} style={{ margin: 0 }}>Tất cả thông báo</Title>} 
      bordered={false} 
      style={{ margin: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        onChange={handleTableChange}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng số ${total} mục`
        }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: record.redirectUrl ? 'pointer' : 'default', backgroundColor: record.isRead ? 'transparent' : '#f0f5ff' }
        })}
      />
    </Card>
  );
};

export default NotificationsPage;
