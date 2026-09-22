import React, { useState, useEffect } from 'react';
import { Modal, List, Button, InputNumber, message, Skeleton, Avatar, Typography, Alert } from 'antd';
import { SendOutlined, FireOutlined } from '@ant-design/icons';
import { getAllProducts } from '../../api/productApi';
import { requestRestock } from '../../api/kitchenApi';
import { getTablesByBranch } from '../../api/tableApi';
import { getTableOrderSummary } from '../../api/tableMapApi';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;

const RequestRestockModal = ({ visible, onClose, branchId }) => {
  const [loading, setLoading] = useState(false);
  const [requestingId, setRequestingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [pendingQuantities, setPendingQuantities] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    if (visible && branchId) {
      fetchData();
    }
  }, [visible, branchId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch products
      const res = await getAllProducts('Manufactured');
      const activeProducts = (res.data || []).filter(p => p.isSellable !== false);
      setProducts(activeProducts);
      
      const initQ = {};
      activeProducts.forEach(p => {
        initQ[p.id] = 1;
      });
      setQuantities(initQ);

      // 2. Fetch pending kitchen internal items to count pending batches
      const tablesRes = await getTablesByBranch([branchId], null, true);
      const internalTable = tablesRes.data?.find(t => t.status === 'Internal');
      
      const pendingMap = {};
      if (internalTable) {
        const summaryRes = await getTableOrderSummary(internalTable.id);
        const allItems = summaryRes.data?.items || [];
        // Only count items that are NOT cancelled and NOT served
        const pendingItems = allItems.filter(item => item.status !== 'Cancelled' && item.cookingStatus !== 'Served');
        
        pendingItems.forEach(item => {
          if (!pendingMap[item.productId]) pendingMap[item.productId] = 0;
          pendingMap[item.productId] += item.quantity;
        });
      }
      setPendingQuantities(pendingMap);

    } catch (error) {
      console.error(error);
      message.error("Lỗi khi tải dữ liệu yêu cầu bếp.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (id, value) => {
    if (value > 5) value = 5; // Hard limit 5 Ca
    setQuantities(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleRequest = async (productId) => {
    const qty = quantities[productId];
    if (!qty || qty <= 0) {
      message.warning("Vui lòng nhập số lượng hợp lệ.");
      return;
    }

    if (!branchId) {
      message.error("Không xác định được Chi nhánh hiện tại.");
      return;
    }

    setRequestingId(productId);
    try {
      await requestRestock({
        branchId,
        productId,
        quantity: qty
      });
      message.success("Đã gửi yêu cầu xuống Bếp thành công!");
      // Reload pending quantities silently
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi khi gửi yêu cầu.");
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FireOutlined style={{ color: '#f5222d', fontSize: '20px' }} />
          <span>Yêu cầu Bếp (Theo Ca)</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      maskClosable={false}
      bodyStyle={{ padding: '8px 0' }}
      width={700}
    >
      <div style={{ padding: '0 24px', marginBottom: 16 }}>
        <Text type="secondary">Gửi yêu cầu trực tiếp xuống bếp (ví dụ: nước chấm, sốt, đồ dùng...)</Text>
        <br />
        <Text type="warning" style={{ fontSize: '13px', fontWeight: 500 }}>
          *Lưu ý: Bếp chuẩn bị theo Ca/Mẻ (1 Ca = 10 Phần). Tối đa 3 Ca/lần gọi. Tổng chờ không quá 5 Ca.
        </Text>
      </div>
      <Skeleton loading={loading} active paragraph={{ rows: 4 }}>
        <List
          itemLayout="horizontal"
          dataSource={products}
          renderItem={(item) => {
            const pendingQty = pendingQuantities[item.id] || 0;
            return (
              <List.Item
                style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <List.Item.Meta
                    avatar={<Avatar src={item.imageUrl} shape="square" size="large" />}
                    title={<span style={{ fontWeight: 500 }}>{item.name}</span>}
                    description={item.description || "Thực hiện tại bếp"}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <InputNumber
                      min={1}
                      max={3}
                      value={quantities[item.id]}
                      onChange={(val) => handleQuantityChange(item.id, val)}
                      style={{ width: '60px' }}
                    />
                    <Text strong>Ca</Text>
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />} 
                      loading={requestingId === item.id}
                      disabled={requestingId !== null && requestingId !== item.id}
                      onClick={() => handleRequest(item.id)}
                      style={{ backgroundColor: '#1890ff', borderColor: '#1890ff', marginLeft: '4px' }}
                    >
                      Gửi
                    </Button>
                  </div>
                </div>
                {pendingQty >= 3 && (
                  <div style={{ marginTop: '12px', width: '100%' }}>
                    <Alert 
                      message={`Bếp đang thực hiện ${pendingQty} Ca món này. Vui lòng cân nhắc trước khi gọi thêm! (Tối đa 5 Ca)`} 
                      type="warning" 
                      showIcon 
                      style={{ padding: '4px 12px' }}
                    />
                  </div>
                )}
              </List.Item>
            );
          }}
          locale={{ emptyText: "Chưa có mặt hàng nào được cấu hình." }}
        />
      </Skeleton>
    </Modal>
  );
};

export default RequestRestockModal;
