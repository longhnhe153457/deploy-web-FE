import React, { useState, useEffect } from 'react';
import { Empty, Badge, Button } from 'antd';
import { CloseOutlined, BellOutlined, EyeOutlined } from '@ant-design/icons';
import { useSignalR } from '../../context/SignalRContext';
import '../../styles/waiter-feed.css';

const WaiterActionFeed = ({ tables, onSelectTable }) => {
  const connection = useSignalR();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (connection) {
      const handleNotification = (notif) => {
        if (notif.type === 'new-order' || (notif.type === 'cooking-status-changed' && notif.cookingStatus === 'Ready')) {
          setNotifications((prev) => [
            {
              id: Date.now() + Math.random(),
              ...notif,
              isHandled: false,
            },
            ...prev
          ].slice(0, 50));
        }
      };

      connection.on("ReceiveNotification", handleNotification);
      return () => {
        connection.off("ReceiveNotification", handleNotification);
      };
    }
  }, [connection]);

  const handleViewTable = (notifId, tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (table && onSelectTable) {
      onSelectTable(table);
      removeNotification(notifId);
    }
  };

  const removeNotification = (notifId) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  const activeNotifications = notifications.filter(n => !n.isHandled);

  return (
    <div className="waiter-feed-container">
      <div className="waiter-feed-header">
        <h3 style={{ margin: 0 }}><BellOutlined /> Công việc cần xử lý</h3>
        <Badge count={activeNotifications.length} style={{ backgroundColor: '#ff4d4f' }} />
      </div>

      <div className="waiter-feed-list">
        {activeNotifications.length === 0 ? (
          <Empty description="Chưa có yêu cầu nào mới" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          activeNotifications.map(notif => {
            const isCookingReady = notif.type === 'cooking-status-changed' && notif.cookingStatus === 'Ready';
            const isNewOrder = notif.type === 'new-order';

            return (
              <div key={notif.id} className={`waiter-feed-card ${isCookingReady ? 'ready' : 'pending'}`}>
                <div className="card-close" onClick={() => removeNotification(notif.id)}>
                  <CloseOutlined />
                </div>

                <div className="card-content">
                  {isNewOrder && (
                    <>
                      <div className="card-title">
                        Món Mới (Bàn {notif.tableName})
                      </div>
                      <div className="card-desc">
                        {notif.productName} <strong>x{notif.quantity}</strong>
                      </div>
                      <div className="card-actions">
                        {notif.tableId ? (
                          <Button 
                            type="default" 
                            size="small" 
                            icon={<EyeOutlined />}
                            onClick={() => handleViewTable(notif.id, notif.tableId)}
                          >
                            Xem Bàn
                          </Button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#888' }}>*Lỗi: Không tìm thấy bàn*</span>
                        )}
                      </div>
                    </>
                  )}

                  {isCookingReady && (
                    <>
                      <div className="card-title">
                        Đã nấu xong (Bàn {notif.tableName})
                      </div>
                      <div className="card-desc">
                        {notif.productName}
                      </div>
                      <div className="card-actions">
                        <Button 
                          type="default" 
                          size="small" 
                          icon={<EyeOutlined />}
                          onClick={() => handleViewTable(notif.id, notif.tableId)}
                        >
                          Xem Bàn
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <div className="waiter-card-time">
                  {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WaiterActionFeed;
