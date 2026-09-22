import React, { useState, useEffect } from 'react';
import { Modal, Button, Tag, Tooltip, Empty } from 'antd';
import {
  SettingOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  FolderOutlined,
  BookOutlined,
  InfoCircleOutlined,
  CheckOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const PriorityOrderModal = ({
  open,
  onClose,
  type = 'group', // 'group' | 'menu'
  items = [],
  currentOrder = [],
  onSave,
  loading = false,
}) => {
  const [orderedItems, setOrderedItems] = useState([]);

  const isGroup = type === 'group';
  const entityTitle = isGroup ? 'Nhóm hàng' : 'Thực đơn';
  const EntityIcon = isGroup ? FolderOutlined : BookOutlined;

  // Khởi tạo danh sách theo thứ tự ưu tiên hiện tại
  useEffect(() => {
    if (!open) return;

    const itemsCopy = [...items];
    if (Array.isArray(currentOrder) && currentOrder.length > 0) {
      itemsCopy.sort((a, b) => {
        const indexA = currentOrder.indexOf(a.id);
        const indexB = currentOrder.indexOf(b.id);
        const posA = indexA === -1 ? 9999 : indexA;
        const posB = indexB === -1 ? 9999 : indexB;
        if (posA !== posB) return posA - posB;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      // Mặc định sắp xếp theo tên
      itemsCopy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    setOrderedItems(itemsCopy);
  }, [open, items, currentOrder]);

  // Di chuyển lên 1 bậc
  const moveUp = (index) => {
    if (index <= 0) return;
    setOrderedItems((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Di chuyển xuống 1 bậc
  const moveDown = (index) => {
    if (index >= orderedItems.length - 1) return;
    setOrderedItems((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Di chuyển lên đầu danh sách
  const moveToTop = (index) => {
    if (index <= 0) return;
    setOrderedItems((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  };

  // Di chuyển xuống cuối danh sách
  const moveToBottom = (index) => {
    if (index >= orderedItems.length - 1) return;
    setOrderedItems((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.push(item);
      return next;
    });
  };

  // Đặt lại thứ tự theo tên A-Z
  const resetToAlphabetical = () => {
    setOrderedItems((prev) =>
      [...prev].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    );
  };

  const handleSave = () => {
    if (onSave) {
      onSave(orderedItems);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: '#fff7ed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ea580c',
            }}
          >
            <SettingOutlined />
          </div>
          <span>Thứ tự ưu tiên hiển thị {entityTitle}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={580}
      centered
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Button
            onClick={resetToAlphabetical}
            icon={<ReloadOutlined />}
            size="middle"
            style={{ fontSize: 13, color: '#64748b' }}
          >
            Sắp xếp theo A - Z
          </Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onClose} size="middle">
              Hủy
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={loading}
              icon={<CheckOutlined />}
              size="middle"
              style={{
                background: '#ea580c',
                borderColor: '#ea580c',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)',
              }}
            >
              Lưu thứ tự ưu tiên
            </Button>
          </div>
        </div>
      }
    >
      {/* HƯỚNG DẪN */}
      <div
        style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          fontSize: 13,
          color: '#1e40af',
          lineHeight: 1.5,
        }}
      >
        <InfoCircleOutlined style={{ fontSize: 15, marginTop: 2, flexShrink: 0, color: '#2563eb' }} />
        <div>
          {isGroup ? (
            <>
              <strong>Nhóm hàng ở trên cùng</strong> sẽ được ưu tiên hiển thị trước cho khách hàng trên thực đơn (ví dụ: món chính trước món phụ / đồ uống). Các thẻ danh mục tại trang chào mừng cũng sẽ theo thứ tự này.
            </>
          ) : (
            <>
              <strong>Thực đơn ở trên cùng</strong> sẽ được ưu tiên hiển thị trước khi khách hàng lựa chọn danh mục thực đơn.
            </>
          )}
        </div>
      </div>

      {/* DANH SÁCH MỤC CẦN SẮP XẾP */}
      <div
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
          paddingRight: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {orderedItems.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`Chưa có ${entityTitle.toLowerCase()} nào để sắp xếp`}
          />
        ) : (
          orderedItems.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === orderedItems.length - 1;

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: isFirst ? '#fffbeb' : '#ffffff',
                  border: isFirst ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* BÊN TRÁI: THỨ TỰ & TÊN */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tag
                    color={index < 3 ? 'orange' : 'default'}
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: 12,
                      minWidth: 32,
                      textAlign: 'center',
                      borderRadius: 4,
                    }}
                  >
                    #{index + 1}
                  </Tag>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <EntityIcon style={{ color: '#ea580c', fontSize: 15 }} />
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                      {item.name}
                    </span>
                    {isFirst && (
                      <Tag color="success" style={{ fontSize: 11, fontWeight: 600, margin: 0, borderRadius: 10 }}>
                        Ưu tiên hàng đầu
                      </Tag>
                    )}
                  </div>
                </div>

                {/* BÊN PHẢI: NÚT ĐIỀU HƯỚNG */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Tooltip title="Chuyển lên đầu danh sách">
                    <Button
                      size="small"
                      disabled={isFirst}
                      icon={<VerticalAlignTopOutlined />}
                      onClick={() => moveToTop(index)}
                      style={{ borderRadius: 4 }}
                    />
                  </Tooltip>
                  <Tooltip title="Lên 1 bậc">
                    <Button
                      size="small"
                      disabled={isFirst}
                      icon={<ArrowUpOutlined />}
                      onClick={() => moveUp(index)}
                      style={{ borderRadius: 4 }}
                    />
                  </Tooltip>
                  <Tooltip title="Xuống 1 bậc">
                    <Button
                      size="small"
                      disabled={isLast}
                      icon={<ArrowDownOutlined />}
                      onClick={() => moveDown(index)}
                      style={{ borderRadius: 4 }}
                    />
                  </Tooltip>
                  <Tooltip title="Chuyển xuống cuối danh sách">
                    <Button
                      size="small"
                      disabled={isLast}
                      icon={<VerticalAlignBottomOutlined />}
                      onClick={() => moveToBottom(index)}
                      style={{ borderRadius: 4 }}
                    />
                  </Tooltip>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
};

export default PriorityOrderModal;
