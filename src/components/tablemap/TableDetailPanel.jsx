import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Tag, Empty, Spin, Typography, message, Modal, AutoComplete } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CheckCircleOutlined, CloseCircleOutlined, CodeSandboxOutlined, DollarOutlined, BranchesOutlined, DisconnectOutlined, SwapOutlined } from '@ant-design/icons';
import PaymentModal from '../payment/PaymentModal';
import MergeTableModal from './MergeTableModal';
import MoveTableModal from './MoveTableModal';
import { unmergeOrder } from '../../api/orderApi';

const { Text } = Typography;

const TableDetailPanel = ({ branchId, table, summary, loading, onConfirm, onReject, onServe, onPaymentSuccess, tables, isPosHub, isWaiterMode }) => {
  const navigate = useNavigate();
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isMergeModalVisible, setIsMergeModalVisible] = useState(false);
  const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);

  const [editedQuantities, setEditedQuantities] = useState({});
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const REJECT_REASONS = [
    { value: 'Hết nguyên liệu', label: 'Hết nguyên liệu' },
    { value: 'Món đang tạm ngưng phục vụ', label: 'Món đang tạm ngưng phục vụ' },
    { value: 'Không đủ số lượng khách yêu cầu', label: 'Không đủ số lượng khách yêu cầu' },
    { value: 'Không thể đáp ứng yêu cầu đặc biệt', label: 'Không thể đáp ứng yêu cầu đặc biệt' },
    { value: 'Khách báo hủy / Đổi món khác', label: 'Khách báo hủy / Đổi món khác' },
  ];

  const getDisplayQuantity = (item) => {
    return editedQuantities[item.orderDetailId] !== undefined
      ? editedQuantities[item.orderDetailId]
      : item.quantity;
  };

  const handleQuantityChange = (item, delta) => {
    const current = getDisplayQuantity(item);
    const next = current + delta;
    
    if (next <= 0) {
      setRejectingItem(item);
    } else {
      setEditedQuantities(prev => ({ ...prev, [item.orderDetailId]: next }));
    }
  };

  const handleUnmerge = () => {
    Modal.confirm({
      title: 'Xác nhận tách bàn',
      content: `Bạn có chắc chắn muốn tách ${table.name} ra khỏi nhóm đã gộp không?`,
      okText: 'Tách bàn',
      okType: 'danger',
      cancelText: 'Huỷ',
      onOk: async () => {
        try {
          if (!summary?.originalOrderId) {
            message.error("Không tìm thấy thông tin đơn hàng gốc của bàn này.");
            return;
          }
          await unmergeOrder(summary.originalOrderId);
          message.success("Tách bàn thành công!");
          if (onPaymentSuccess) onPaymentSuccess(table.id);
        } catch (err) {
          console.error(err);
          message.error(err.response?.data?.message || "Lỗi khi tách bàn");
        }
      }
    });
  };

  if (!table) {
    return (
      <div className="tablemap-detail-empty">
        <Empty description="Chọn một bàn để xem chi tiết" />
      </div>
    );
  }

  const qrUrl = `${window.location.origin}/customer-order/${table.id}`;

  const renderStatusTag = (item) => {
    if (item.returnedQuantity === item.quantity && item.quantity > 0) return <Tag color="red">Đã trả toàn bộ</Tag>;
    if (item.status === 'Cancelled') return <Tag color="red">Đã huỷ</Tag>;
    if (item.status === 'CustomerPending') return <Tag color="default">Chờ xác nhận</Tag>;

    switch (item.cookingStatus) {
      case 'Waiting': return <Tag color="orange">Chờ bếp</Tag>;
      case 'Cooking': return <Tag color="blue">Đang nấu</Tag>;
      case 'Ready': return <Tag color="green">Sẵn sàng</Tag>;
      case 'Served': return <Tag color="purple">Đã phục vụ</Tag>;
      default: return <Tag color="default">{item.cookingStatus}</Tag>;
    }
  };

  const currentTableOrderId = summary?.originalOrderId || summary?.activeOrderId;
  const activeItems = summary?.items?.filter(i => i.status !== 'Cancelled') || [];
  const displayItems = summary?.items || [];
  const hasUnservedItems = activeItems.some(i => i.cookingStatus !== 'Served');

  const handlePaymentClick = () => {
    if (hasUnservedItems) {
      Modal.warning({
        title: 'Cảnh báo: Bàn chưa lên hết món',
        content: 'Vẫn còn món chưa được phục vụ (đang chờ hoặc đang nấu). Vui lòng phục vụ hoặc huỷ món trước khi thanh toán.',
        okText: 'Đã hiểu',
      });
    } else {
      setIsPaymentModalVisible(true);
    }
  };

  return (
    <div className="tablemap-detail-panel">
      <div className="tablemap-detail-header">
        <h3>{table.name} {table.areaName ? `(${table.areaName})` : ''}</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {summary?.activeOrderId && table.status === 'Occupied' && (
            <>
              {summary?.isMerged && (
                <Button
                  danger
                  icon={<DisconnectOutlined />}
                  onClick={handleUnmerge}
                >
                  Tách bàn
                </Button>
              )}
              <Button
                type="dashed"
                icon={<BranchesOutlined />}
                onClick={() => setIsMergeModalVisible(true)}
              >
                Gộp bàn
              </Button>
              {!isPosHub && (
                <Button
                  type="default"
                  icon={<SwapOutlined />}
                  onClick={() => setIsMoveModalVisible(true)}
                >
                  Chuyển bàn
                </Button>
              )}
              {!isWaiterMode && (
                <Button
                  danger
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={handlePaymentClick}
                >
                  Thanh toán
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="tablemap-qr-section">
        <div className="tablemap-qr-container">
          <QRCodeSVG value={qrUrl} size={120} />
        </div>
        <div className="tablemap-qr-info">
          <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Mã QR quét đặt món</p>
          <small style={{ color: '#666', display: 'block', marginBottom: '8px' }}>Khách quét mã này để tự order tại bàn</small>
          <div style={{
            background: '#f5f5f5',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid #e0e0e0',
            wordBreak: 'break-all'
          }}>
            <Text copyable style={{ fontSize: '13px' }}>{qrUrl}</Text>
          </div>
        </div>
      </div>

      <div className="tablemap-order-list">
        <h4>Danh sách món ({displayItems?.length || 0})</h4>
        {loading ? (
          <div className="tablemap-loading">
            <Spin />
          </div>
        ) : displayItems?.length > 0 ? (
          <div className="tablemap-items">
            {displayItems.map((item) => (
              <div key={item.orderDetailId} className="tablemap-item-row">
                <div className="tablemap-item-info">
                  <div className="tablemap-item-name">
                    {item.status === 'CustomerPending' && !isPosHub ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Button size="small" onClick={() => handleQuantityChange(item, -1)}>-</Button>
                        <strong>{getDisplayQuantity(item)}</strong>
                        <Button size="small" onClick={() => handleQuantityChange(item, 1)}>+</Button>
                        <span style={{ marginLeft: '4px' }}>{item.productName}</span>
                      </div>
                    ) : (
                      <><strong>{item.quantity}x</strong> {item.productName}</>
                    )}
                  </div>
                  {item.note && <div className="tablemap-item-note">Ghi chú: {item.note}</div>}
                  <div className="tablemap-item-status">
                    {renderStatusTag(item)}
                  </div>
                </div>

                {!isPosHub && (
                  <div className="tablemap-item-actions">
                    {item.status === 'CustomerPending' && (
                      <>
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckCircleOutlined />}
                          onClick={() => onConfirm(item.orderDetailId, getDisplayQuantity(item))}
                        >
                          Xác nhận
                        </Button>
                        <Button
                          danger
                          size="small"
                          icon={<CloseCircleOutlined />}
                          onClick={() => setRejectingItem(item)}
                          style={{ marginLeft: '8px' }}
                        >
                          Từ chối
                        </Button>
                      </>
                    )}
                    {item.status === 'Confirmed' && item.cookingStatus === 'Ready' && (
                      <Button
                        type="default"
                        size="small"
                        icon={<CodeSandboxOutlined />}
                        onClick={() => onServe(item.orderDetailId)}
                      >
                        Đã phục vụ
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty description="Chưa có món nào được gọi" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>

      <PaymentModal
        visible={isPaymentModalVisible}
        branchId={branchId}
        orderId={summary?.activeOrderId}
        tableName={summary?.tableName || table?.name}
        items={summary?.items}
        onCancel={() => setIsPaymentModalVisible(false)}
        onSuccess={() => {
          setIsPaymentModalVisible(false);
          if (onPaymentSuccess) onPaymentSuccess(table.id);
        }}
      />

      {isMergeModalVisible && (
        <MergeTableModal
          visible={isMergeModalVisible}
          onClose={() => setIsMergeModalVisible(false)}
          tables={tables}
          currentTable={table}
          onMerged={onPaymentSuccess}
        />
      )}

      {isMoveModalVisible && (
        <MoveTableModal
          visible={isMoveModalVisible}
          onClose={() => setIsMoveModalVisible(false)}
          tables={tables}
          currentTable={table}
          summary={summary}
          onMoved={onPaymentSuccess}
        />
      )}

      <Modal
        title={rejectingItem ? `Từ chối món: ${rejectingItem.productName}` : 'Từ chối món'}
        open={!!rejectingItem}
        onOk={() => {
          if (!rejectReason) {
            message.error("Vui lòng chọn hoặc nhập lý do từ chối");
            return;
          }
          onReject(rejectingItem.orderDetailId, rejectReason);
          setRejectingItem(null);
          setRejectReason('');
        }}
        onCancel={() => {
          setRejectingItem(null);
          setRejectReason('');
        }}
        okText="Xác nhận từ chối"
        cancelText="Huỷ"
        okButtonProps={{ danger: true }}
      >
        <p>Vui lòng chọn hoặc gõ lý do từ chối món này:</p>
        <AutoComplete
          style={{ width: '100%' }}
          placeholder="Chọn hoặc nhập lý do"
          value={rejectReason}
          onChange={setRejectReason}
          options={REJECT_REASONS}
          filterOption={(inputValue, option) =>
            option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
          }
        />
      </Modal>
    </div>
  );
};

export default TableDetailPanel;
