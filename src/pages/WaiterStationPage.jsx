import React from 'react';
import TableMapPage from './TableMapPage';

const WaiterStationPage = () => {
  return (
    <div style={{ height: '100vh', overflowY: 'auto' }}>
      <TableMapPage isWaiterMode={true} isDeviceMode={true} />
    </div>
  );
};

export default WaiterStationPage;
