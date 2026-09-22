import React from 'react';
import { Tabs } from 'antd';
import PromotionManagementTab from '../components/catalog/PromotionManagementTab';
import VoucherPage from './VoucherPage';

const PromotionVoucherPage = () => {
  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ marginBottom: 16, fontSize: 24, fontWeight: 600, color: '#1e293b' }}>Khuyến Mãi & Marketing</h2>
      <div style={{ background: '#fff', padding: '16px 24px', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Tabs defaultActiveKey="1">
          <Tabs.TabPane tab="Chương trình Khuyến Mãi" key="1">
            <div style={{ paddingTop: 16 }}>
              <PromotionManagementTab />
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Mã giảm giá (Voucher)" key="2">
            <div style={{ paddingTop: 16 }}>
              <VoucherPage />
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default PromotionVoucherPage;
