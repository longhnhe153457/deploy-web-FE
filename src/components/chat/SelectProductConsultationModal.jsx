import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Input, Select, Checkbox, List, Button, Spin, Tag, Empty, Typography, message } from 'antd';
import { SearchOutlined, CoffeeOutlined, SendOutlined } from '@ant-design/icons';
import { getBInventories } from '../../api/binventoryApi';
import { configApi } from '../../api/configApi';

const { Text } = Typography;
const { Option } = Select;

const formatPrice = (price) => {
  if (price === undefined || price === null) return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

const SelectProductConsultationModal = ({
  open,
  onClose,
  branchId,
  onConfirmSend,
  loading = false
}) => {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [catalogPriority, setCatalogPriority] = useState(() => {
    const saved = localStorage.getItem("catalog_priority");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return { groupOrder: [], menuOrder: [], groupNames: [], menuNames: [] };
  });

  // Tải cấu hình ưu tiên catalog nếu có
  useEffect(() => {
    if (open) {
      configApi.getCatalogPriority()
        .then((res) => {
          if (res && (res.groupOrder?.length > 0 || res.groupNames?.length > 0)) {
            setCatalogPriority(res);
            localStorage.setItem("catalog_priority", JSON.stringify(res));
          }
        })
        .catch(() => {});
    }
  }, [open]);

  // Tải danh sách món ăn từ BInventory của chi nhánh
  useEffect(() => {
    if (open && branchId) {
      fetchBranchProducts(branchId);
      setSelectedProductIds([]);
      setSearchText('');
      setSelectedCategory('all');
    }
  }, [open, branchId, catalogPriority]);

  const fetchBranchProducts = async (bid) => {
    setLoadingProducts(true);
    try {
      const raw = await getBInventories(bid, '', '', 0);
      if (Array.isArray(raw)) {
        const sellable = raw.filter(
          (b) => b.type === 'Processed' || b.type === 'Manufactured' || b.type === 'Regular'
        );
        const mapped = sellable.map((item) => ({
          id: item.productId,
          groupId: item.groupId,
          name: item.name,
          price: item.sellPrice || 0,
          imageLink: item.imageLink || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80',
          groupName: item.groupName || 'Món ăn'
        }));

        const getGroupPriority = (groupName, groupId) => {
          const groupOrder = catalogPriority?.groupOrder || [];
          const groupNames = catalogPriority?.groupNames || [];

          if (groupId && groupOrder.length > 0) {
            const idx = groupOrder.indexOf(groupId);
            if (idx !== -1) return idx;
          }
          if (groupName && groupNames.length > 0) {
            const idx = groupNames.findIndex(
              (name) => name.toLowerCase() === groupName.toLowerCase()
            );
            if (idx !== -1) return idx;
          }
          return 9999;
        };

        const getItemPriority = (id, name) => {
          const menuOrder = catalogPriority?.menuOrder || [];
          const menuNames = catalogPriority?.menuNames || [];
          if (id && menuOrder.length > 0) {
            const idx = menuOrder.indexOf(id);
            if (idx !== -1) return idx;
          }
          if (name && menuNames.length > 0) {
            const idx = menuNames.findIndex(n => n.toLowerCase() === name.toLowerCase());
            if (idx !== -1) return idx;
          }
          return 9999;
        };

        mapped.sort((a, b) => {
          const prioGroupA = getGroupPriority(a.groupName, a.groupId);
          const prioGroupB = getGroupPriority(b.groupName, b.groupId);
          if (prioGroupA !== prioGroupB) return prioGroupA - prioGroupB;

          const prioItemA = getItemPriority(a.id, a.name);
          const prioItemB = getItemPriority(b.id, b.name);
          if (prioItemA !== prioItemB) return prioItemA - prioItemB;

          return (a.name || "").localeCompare(b.name || "");
        });

        setProducts(mapped);
      } else {
        setProducts([]);
      }
    } catch {
      message.error('Không thể tải thực đơn của chi nhánh.');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Danh mục nhóm món sắp xếp theo cấu hình catalog priority
  const categories = useMemo(() => {
    const getGroupPriority = (groupName) => {
      const groupNames = catalogPriority?.groupNames || [];
      if (groupName && groupNames.length > 0) {
        const idx = groupNames.findIndex(
          (name) => name.toLowerCase() === groupName.toLowerCase()
        );
        if (idx !== -1) return idx;
      }
      return 9999;
    };

    const unique = Array.from(new Set(products.map((p) => p.groupName).filter(Boolean)));
    unique.sort((a, b) => {
      const prioA = getGroupPriority(a);
      const prioB = getGroupPriority(b);
      if (prioA !== prioB) return prioA - prioB;
      return a.localeCompare(b);
    });
    return ['all', ...unique];
  }, [products, catalogPriority]);

  // Lọc sản phẩm theo tìm kiếm và nhóm
  const filteredProducts = useMemo(() => {
    let result = products;
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter(
        (p) => (p.name || '').toLowerCase().includes(q) || (p.groupName || '').toLowerCase().includes(q)
      );
    }
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter((p) => p.groupName === selectedCategory);
    }
    return result;
  }, [products, searchText, selectedCategory]);

  const handleToggleSelect = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleConfirm = () => {
    if (loading || selectedProductIds.length === 0) {
      if (selectedProductIds.length === 0) {
        message.warning('Vui lòng chọn ít nhất một món ăn.');
      }
      return;
    }
    onConfirmSend(selectedProductIds);
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
          <CoffeeOutlined style={{ color: '#ea580c' }} /> Chọn món cần tư vấn từ thực đơn
        </div>
      }
      open={open}
      onCancel={onClose}
      width={560}
      footer={[
        <Button key="cancel" onClick={onClose} style={{ borderRadius: 6 }}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SendOutlined />}
          onClick={handleConfirm}
          loading={loading}
          disabled={selectedProductIds.length === 0 || loading}
          style={{ background: '#ea580c', borderColor: '#ea580c', borderRadius: 6, fontWeight: 600 }}
        >
          Gửi tư vấn ({selectedProductIds.length} món)
        </Button>
      ]}
      centered
      styles={{ body: { padding: '12px 0' } }}
      bodyStyle={{ padding: '12px 0' }}
    >
      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 10, padding: '0 16px 12px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <Input
          placeholder="Tìm tên món ăn..."
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ flex: 1, borderRadius: 6 }}
        />

        <Select
          value={selectedCategory}
          onChange={setSelectedCategory}
          style={{ width: 150, borderRadius: 6 }}
        >
          <Option value="all">Tất cả nhóm</Option>
          {categories.filter((c) => c !== 'all').map((cat) => (
            <Option key={cat} value={cat}>
              {cat}
            </Option>
          ))}
        </Select>
      </div>

      {/* Product List with locked height */}
      <div style={{ height: 360, maxHeight: 360, overflowY: 'auto', padding: '8px 16px' }}>
        {loadingProducts ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin tip="Đang tải thực đơn..." />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Empty description="Không tìm thấy món ăn phù hợp" />
          </div>
        ) : (
          <List
            dataSource={filteredProducts}
            renderItem={(item) => {
              const isSelected = selectedProductIds.includes(item.id);
              return (
                <List.Item
                  onClick={() => handleToggleSelect(item.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    userSelect: 'none',
                    background: isSelected ? '#fff7ed' : '#fff',
                    border: isSelected ? '1px solid #fdba74' : '1px solid #f1f5f9',
                    marginBottom: 8,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <Checkbox checked={isSelected} style={{ pointerEvents: 'none' }} />

                  <img
                    src={item.imageLink}
                    alt={item.name}
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80';
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                      {item.name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontWeight: 700, color: '#ea580c', fontSize: 13 }}>
                        {formatPrice(item.price)}
                      </span>
                      {item.groupName && (
                        <Tag color="orange" style={{ margin: 0, fontSize: 11, borderRadius: 4 }}>
                          {item.groupName}
                        </Tag>
                      )}
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </Modal>
  );
};

export default SelectProductConsultationModal;
