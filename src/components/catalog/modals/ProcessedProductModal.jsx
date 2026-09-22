import React, { useState, useEffect } from 'react';
import {
  CloseOutlined,
  PlusOutlined,
  PictureOutlined,
  ExperimentOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { createProcessedProduct, updateProcessedProduct } from '../../../api/productApi';
import { uploadImage } from '../../../api/imageApi';
import RecipeBuilder from './RecipeBuilder';

const ProcessedProductModal = ({
  open,
  onCancel,
  editingProduct = null,
  groups = [],
  units = [],
  menus = [],
  products = [],
  onSuccess,
  notifySuccess,
  notifyError,
  onOpenAddGroup,
  onOpenAddMenu,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    skuCode: '',
    groupId: '',
    sellPrice: 0,
    isSellable: true,
    description: '',
    imageUrl: '',
    imageId: null,
    menuIds: [],
    recipe: [],
    recommendedTimeMinutes: '',
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (open) {
      if (editingProduct) {
        setFormData({
          id: editingProduct.id,
          name: editingProduct.name || '',
          skuCode: editingProduct.skuCode || '',
          groupId: editingProduct.groupId || (groups.length > 0 ? groups[0].id : ''),
          sellPrice: editingProduct.sellPrice || 0,
          isSellable: editingProduct.isSellable !== undefined ? editingProduct.isSellable : true,
          description: editingProduct.description || '',
          imageUrl: editingProduct.imageUrl || editingProduct.imageLink || editingProduct.image?.imageLink || editingProduct.avatar || '',
          imageId: editingProduct.imageId || editingProduct.image?.id || null,
          menuIds: editingProduct.menuIds || [],
          recipe: editingProduct.recipeItems
            ? editingProduct.recipeItems.map(item => ({ productId: item.ingredientProductId || item.productId, quantity: item.quantity }))
            : [],
          recommendedTimeMinutes: editingProduct.recommendedTimeMinutes ?? '',
        });
      } else {
        setFormData({
          name: '',
          skuCode: '',
          groupId: groups.length > 0 ? groups[0].id : '',
          sellPrice: 0,
          isSellable: true,
          description: '',
          imageUrl: '',
          imageId: null,
          menuIds: [],
          recipe: [],
          recommendedTimeMinutes: '',
        });
      }
    }
  }, [open, editingProduct, groups]);

  if (!open) return null;

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadImage(file);
      const imgLink = res.data?.imageLink || res.data?.imageUrl || res.data?.secureUrl || (typeof res.data === 'string' ? res.data : '');
      const imgId = res.data?.id || res.data?.imageId || null;
      if (imgLink) {
        setFormData(prev => ({
          ...prev,
          imageUrl: imgLink,
          imageId: imgId,
        }));
        notifySuccess('Tải ảnh lên thành công!');
      }
    } catch (err) {
      notifyError('Tải ảnh lên thất bại.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setFormData(prev => ({
      ...prev,
      imageUrl: '',
      imageId: null,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      notifyError('Vui lòng nhập tên sản phẩm.');
      return;
    }
    if (!formData.groupId) {
      notifyError('Vui lòng chọn nhóm hàng.');
      return;
    }
    if (formData.sellPrice <= 0) {
      notifyError('Giá bán phải lớn hơn 0.');
      return;
    }
    if (formData.sellPrice > 10000000000) {
      notifyError('Giá bán không được vượt quá 10 tỷ.');
      return;
    }
    if (formData.recommendedTimeMinutes !== '' && (isNaN(Number(formData.recommendedTimeMinutes)) || Number(formData.recommendedTimeMinutes) < 1)) {
      notifyError('Thời gian chế biến gợi ý phải là số phút lớn hơn 0.');
      return;
    }
    if (formData.recipe.length === 0) {
      notifyError('Món Chế Biến bắt buộc phải có công thức.');
      return;
    }
    for (const item of formData.recipe) {
      const q = Number(item.quantity);
      if (isNaN(q) || q < 0.001 || q > 1000000) {
        notifyError('Định lượng thành phần trong công thức phải từ 0.001 đến 1.000.000.');
        return;
      }
      if (Math.trunc(q * 1000) / 1000 !== q) {
        notifyError('Định lượng thành phần trong công thức chỉ được tối đa 3 chữ số thập phân.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        chainId: 1, // Default chain
        groupId: Number(formData.groupId),
        imageId: formData.imageId,
        imageUrl: formData.imageUrl,
        name: formData.name.trim(),
        skuCode: formData.skuCode.trim(),
        description: formData.description,
        isSellable: formData.isSellable,
        sellPrice: Number(formData.sellPrice),
        recommendedTimeMinutes: formData.recommendedTimeMinutes === '' ? null : Number(formData.recommendedTimeMinutes),
        menuIds: formData.menuIds.map(Number),
        recipe: formData.recipe.map(r => ({
          productId: Number(r.productId),
          quantity: Number(r.quantity),
        })),
      };

      if (editingProduct && editingProduct.id) {
        payload.id = editingProduct.id;
        await updateProcessedProduct(payload);
        notifySuccess('Cập nhật món chế biến thành công!');
      } else {
        await createProcessedProduct(payload);
        notifySuccess('Tạo mới món chế biến thành công!');
      }
      onSuccess();
      onCancel();
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu món chế biến.';
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
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
          width: 800,
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#faf5ff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b5cf6',
                fontSize: 18,
              }}
            >
              <ExperimentOutlined />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#581c87' }}>
                {editingProduct ? 'Cập Nhật Món Chế Biến' : 'Thêm Món Chế Biến Mới'}
              </h3>
              <span style={{ fontSize: 12, color: '#7e22ce' }}>PROCESSED - Pha chế / Nấu tại chỗ (Cần có công thức)</span>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b' }}
          >
            <CloseOutlined />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* THÔNG TIN CƠ BẢN */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20 }}>
              {/* IMAGE UPLOAD */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>Hình ảnh</label>
                <div
                  onClick={() => !uploadingImage && fileInputRef.current?.click()}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 12,
                    border: '2px dashed #cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#f8fafc',
                    cursor: uploadingImage ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#8b5cf6')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                >
                  {uploadingImage ? (
                    <div style={{ textAlign: 'center', color: '#8b5cf6', fontSize: 12 }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>⏳</div>
                      <div>Đang tải...</div>
                    </div>
                  ) : formData.imageUrl ? (
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <img
                        src={formData.imageUrl}
                        alt="preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0.45)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          color: '#fff',
                          fontSize: 11,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <PictureOutlined /> Đổi ảnh
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          style={{
                            background: '#ef4444',
                            border: 'none',
                            borderRadius: 4,
                            color: '#fff',
                            fontSize: 10,
                            padding: '3px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            fontWeight: 600,
                          }}
                        >
                          <DeleteOutlined /> Xóa ảnh
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                      <PictureOutlined style={{ fontSize: 24, marginBottom: 4 }} />
                      <div style={{ fontSize: 11, fontWeight: 500 }}>Tải ảnh lên</div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onClick={(e) => { e.target.value = null; }}
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              {/* FORM FIELDS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>
                    Tên món <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Cà phê sữa đá, Trà đào cam sả"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>
                    Nhóm món <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={formData.groupId}
                      onChange={e => setFormData({ ...formData, groupId: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: 14,
                        background: '#ffffff',
                      }}
                    >
                      <option value="">-- Chọn nhóm --</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    {onOpenAddGroup && (
                      <button
                        type="button"
                        onClick={onOpenAddGroup}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          cursor: 'pointer',
                        }}
                      >
                        <PlusOutlined />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>
                    Giá bán (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000000000"
                    placeholder="35000"
                    value={formData.sellPrice}
                    onChange={e => setFormData({ ...formData, sellPrice: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>Mã SKU</label>
                  <input
                    type="text"
                    placeholder="Tự động tạo nếu trống"
                    value={formData.skuCode}
                    onChange={e => setFormData({ ...formData, skuCode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>
                    Thời gian chế biến gợi ý (phút)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="VD: 15"
                    value={formData.recommendedTimeMinutes}
                    onChange={e => setFormData({ ...formData, recommendedTimeMinutes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={formData.isSellable}
                      onChange={e => setFormData({ ...formData, isSellable: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#8b5cf6' }}
                    />
                    Cho phép bán trực tiếp trên POS/Menu
                  </label>
                </div>
              </div>
            </div>

            {/* CÔNG THỨC (RECIPE) */}
            <RecipeBuilder
              recipe={formData.recipe}
              setRecipe={rec => setFormData({ ...formData, recipe: rec })}
              products={products}
              units={units}
              groups={groups}
              currentProductId={editingProduct?.id}
              allowedProductTypes={['Processed', 'Manufactured', 'Regular', 'Ingredient']}
              notifyError={notifyError}
            />

            {/* PHÂN VÀO MENU */}
            {menus.length > 0 && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#334155' }}>Thực Đơn (Menu)</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {menus.map(menu => {
                    const isSelected = formData.menuIds.includes(menu.id);
                    return (
                      <button
                        type="button"
                        key={menu.id}
                        onClick={() => {
                          const newMenuIds = isSelected
                            ? formData.menuIds.filter(id => id !== menu.id)
                            : [...formData.menuIds, menu.id];
                          setFormData({ ...formData, menuIds: newMenuIds });
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: 13,
                          border: isSelected ? '1px solid #8b5cf6' : '1px solid #cbd5e1',
                          background: isSelected ? '#f3e8ff' : '#ffffff',
                          color: isSelected ? '#7e22ce' : '#475569',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        {menu.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MÔ TẢ */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>Mô tả sản phẩm</label>
              <textarea
                rows={3}
                placeholder="Nhập mô tả chi tiết về món chế biến..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* FOOTER */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              background: '#f8fafc',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#8b5cf6',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {loading ? 'Đang lưu...' : editingProduct ? 'Cập Nhật' : 'Tạo Mới món chế biến'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProcessedProductModal;
