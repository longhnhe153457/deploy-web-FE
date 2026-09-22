import React, { useEffect } from 'react';
import { notification } from 'antd';
import { useSignalR } from '../../context/SignalRContext';

const GlobalStockAlertListener = () => {
  const connection = useSignalR();

  useEffect(() => {
    if (!connection) return;

    const handleStockAlert = (data) => {
      // data: { type: "stock-alert", branchId: 1, productName: "...", message: "...", missingItems: [...] }
      
      const audio = new Audio('/sounds/alert.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));

      notification.error({
        key: `stock-alert-${new Date().getTime()}`,
        message: 'Cảnh Báo Hết Hàng',
        description: data.message,
        duration: 8,
        placement: 'topRight',
        style: {
          backgroundColor: '#fff1f0',
          border: '1px solid #ffa39e'
        }
      });
    };

    connection.on('ReceiveStockAlert', handleStockAlert);

    return () => {
      connection.off('ReceiveStockAlert', handleStockAlert);
    };
  }, [connection]);

  return null;
};

export default GlobalStockAlertListener;
