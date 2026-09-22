import React from 'react';
import {
  ExperimentOutlined,
  BuildOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  SettingOutlined,
  CloseOutlined,
} from '@ant-design/icons';

const PRODUCT_TYPE_OPTIONS = [
  {
    type: 'Processed',
    title: 'Hàng Chế Biến',
    subtitle: 'Pha chế / Nấu tại chỗ',
    desc: 'Món ăn, đồ uống được chế biến trực tiếp tại cửa hàng có công thức định lượng (vd: Cà phê sữa, Trà đào, Phở bò).',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    icon: <ExperimentOutlined style={{ fontSize: 26, color: '#8b5cf6' }} />,
  },
  {
    type: 'Manufactured',
    title: 'Hàng Sản Xuất',
    subtitle: 'Làm sẵn / Đóng gói',
    desc: 'Món ăn, sản phẩm sản xuất đóng gói có công thức định lượng (vd: Bánh mì đóng gói, Nước sốt chai).',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    icon: <BuildOutlined style={{ fontSize: 26, color: '#2563eb' }} />,
  },
  {
    type: 'Regular',
    title: 'Món Thường',
    subtitle: 'Hàng hóa đóng gói bán lẻ',
    desc: 'Sản phẩm mua vào bán ra trực tiếp không cần công thức (vd: Lon Coca, Nước suối, Thuốc lá).',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    icon: <ShoppingOutlined style={{ fontSize: 26, color: '#16a34a' }} />,
  },
  {
    type: 'Ingredient',
    title: 'Nguyên Vật Liệu',
    subtitle: 'Nguyên liệu kho / bếp',
    desc: 'Nguyên liệu dùng để pha chế và nấu nướng, không bán trực tiếp cho khách (vd: Hạt cà phê, Sữa tươi, Thịt bò).',
    color: '#ea580c',
    bgColor: '#fff7ed',
    borderColor: '#ffedd5',
    icon: <AppstoreOutlined style={{ fontSize: 26, color: '#ea580c' }} />,
  },
  {
    type: 'Tool',
    title: 'Công Cụ Dụng Cụ',
    subtitle: 'Vật tư / Tài sản kho',
    desc: 'Dụng cụ phục vụ tại kho hoặc bếp, không có công thức và không bán lẻ (vd: Ly thủy tinh, Muỗng, Dao).',
    color: '#0891b2',
    bgColor: '#ecfeff',
    borderColor: '#cff4fc',
    icon: <SettingOutlined style={{ fontSize: 26, color: '#0891b2' }} />,
  },
];

const ProductTypeSelectModal = ({ open, onCancel, onSelectType }) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          width: 760,
          maxWidth: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Chọn loại hàng hóa / sản phẩm mới
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Vui lòng chọn loại sản phẩm để mở form cài đặt phù hợp
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            <CloseOutlined style={{ fontSize: 12 }} />
          </button>
        </div>

        {/* BODY CARDS GRID */}
        <div
          style={{
            padding: 20,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: 14,
          }}
        >
          {PRODUCT_TYPE_OPTIONS.map((opt) => (
            <div
              key={opt.type}
              onClick={() => onSelectType(opt.type)}
              style={{
                borderRadius: 12,
                border: `1.5px solid ${opt.borderColor}`,
                background: '#ffffff',
                padding: 16,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = opt.color;
                e.currentTarget.style.boxShadow = `0 6px 16px ${opt.color}25`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = opt.borderColor;
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: opt.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {opt.icon}
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{opt.title}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: opt.color, margin: '2px 0 4px 0' }}>
                  {opt.subtitle}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: '1.4' }}>{opt.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductTypeSelectModal;
