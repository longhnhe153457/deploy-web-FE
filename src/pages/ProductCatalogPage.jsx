import React from 'react';
import ProductCatalogView from '../components/catalog/ProductCatalogView';

const ProductCatalogPage = () => {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 64px)', overflow: 'hidden', background: '#f0f2f5', padding: '12px 16px' }}>
      <ProductCatalogView />
    </div>
  );
};

export default ProductCatalogPage;
