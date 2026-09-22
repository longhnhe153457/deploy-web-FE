import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductTable from './ProductTable';

const ProductTab = ({ dishes = [], selectedBranchId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get('search') || '';
  const subTabFromUrl = searchParams.get('subTab') || 'nguyenlieu';

  const [searchText, setSearchText] = useState(searchFromUrl);
  const [subTab, setSubTab] = useState(subTabFromUrl);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (currentSearch !== searchText) {
      setSearchText(currentSearch);
    }
    const currentSubTab = searchParams.get('subTab') || 'nguyenlieu';
    if (currentSubTab !== subTab) {
      setSubTab(currentSubTab);
    }
  }, [searchParams]);

  const handleSearchChange = (newVal) => {
    setSearchText(newVal);
    const newParams = new URLSearchParams(searchParams);
    if (newVal) {
      newParams.set('search', newVal);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const handleSubTabChange = (newTab) => {
    setSubTab(newTab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('subTab', newTab);
    setSearchParams(newParams);
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      <ProductTable
        dishes={dishes}
        selectedBranchId={selectedBranchId}
        searchText={searchText}
        setSearchText={handleSearchChange}
        subTab={subTab}
        setSubTab={handleSubTabChange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
    </div>
  );
};

export default ProductTab;
