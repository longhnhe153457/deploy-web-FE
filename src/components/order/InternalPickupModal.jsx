import React, { useState, useEffect } from 'react';
import { Modal, List, Button, message, Spin, Typography, Tag, Empty } from 'antd';
import { CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { getTablesByBranch } from '../../api/tableApi';
import { getTableOrderSummary, updateCookingStatus } from '../../api/tableMapApi';

const { Text } = Typography;

const InternalPickupModal = ({ visible, onClose, branchId }) => {
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [internalItems, setInternalItems] = useState([]);

  useEffect(() => {
    if (visible && branchId) {
      loadInternalItems();
    }
  }, [visible, branchId]);

  const loadInternalItems = async () => {
    setLoading(true);
    try {
      const tablesRes = await getTablesByBranch([branchId], null, true);
      const tables = tablesRes.data || [];
      const internalTable = tables.find(t => t.status === 'Internal');

      if (!internalTable) {
        setInternalItems([]);
        setLoading(false);
        return;
      }

      const summaryRes = await getTableOrderSummary(internalTable.id);
      const allItems = summaryRes.data?.items || [];

      const pendingItems = allItems.filter(item => item.status !== 'Cancelled' && item.cookingStatus !== 'Served');
      setInternalItems(pendingItems);
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi tải danh sách đồ nội bộ');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPickup = async (orderDetailId) => {
    setConfirmingId(orderDetailId);
    try {
      await updateCookingStatus(orderDetailId, 'Served');
      message.success('Đã xác nhận lấy đồ!');
      loadInternalItems();
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi xác nhận lấy đồ');
    } finally {
      setConfirmingId(null);
    }
  };

  const renderStatusTag = (status) => {
    switch (status) {
      case 'Waiting': return <Tag color="default">Chờ bếp nhận</Tag>;
      case 'Cooking': return <Tag color="processing" icon={<SyncOutlined spin />}>Đang chế biến</Tag>;
      case 'Ready': return <Tag color="success" icon={<CheckCircleOutlined />}>Đã xong - Chờ lấy</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  return (
    <Modal
      title="Nhận đồ nội bộ (Sốt, nước chấm, đồ dùng...)"
      open={visible}
      onCancel={onClose}
      maskClosable={false}
      footer={[
        <Button key="close" onClick={onClose}>Đóng</Button>
      ]}
      width={600}
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button icon={<SyncOutlined />} onClick={loadInternalItems} loading={loading}>Làm mới</Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin />
        </div>
      ) : internalItems.length === 0 ? (
        <Empty description="Chưa có món nội bộ nào đang chờ nhận" />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={internalItems}
          renderItem={(item) => (
            <List.Item
              actions={[
                item.cookingStatus === 'Ready' ? (
                  <Button
                    type="primary"
                    style={{ backgroundColor: '#52c41a' }}
                    loading={confirmingId === item.orderDetailId}
                    disabled={confirmingId !== null && confirmingId !== item.orderDetailId}
                    onClick={() => handleConfirmPickup(item.orderDetailId)}
                  >
                    Xác nhận lấy
                  </Button>
                ) : (
                  <Button disabled>
                    Chờ bếp làm
                  </Button>
                )
              ]}
            >
              <List.Item.Meta
                title={<Text strong>{item.productName}</Text>}
                description={
                  <div>
                    <div>Số lượng: <Text strong type="danger">{item.quantity}</Text></div>
                    {item.note && <div>Ghi chú: <Text type="secondary">{item.note}</Text></div>}
                  </div>
                }
              />
              <div style={{ marginRight: 16 }}>
                {renderStatusTag(item.cookingStatus)}
              </div>
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
};

export default InternalPickupModal;
