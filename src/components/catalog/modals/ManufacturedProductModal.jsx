import React, { useState, useEffect } from 'react';
import {
  CloseOutlined,
  PlusOutlined,
  PictureOutlined,
  BuildOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { createManufacturedProduct, updateManufacturedProduct } from '../../../api/productApi';
import { uploadImage } from '../../../api/imageApi';
import RecipeBuilder from './RecipeBuilder';
import UnitConversionBuilder from './UnitConversionBuilder';

const ManufacturedProductModal = ({
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
  onOpenAddUnit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    skuCode: '',
    groupId: '',
    sellPrice: 0,
    isSellable: true,
    isManageQuantity: false,
    minStorage: 0,
    maxStorage: 1000000000,
    description: '',
    imageUrl: '',
    imageId: null,
    menuIds: [],
    unitConversions: [],
    recipe: [],
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
          isManageQuantity: editingProduct.isManageQuantity || false,
          minStorage: editingProduct.minStorage || 0,
          maxStorage: editingProduct.maxStorage || 1000000000,
          description: editingProduct.description || '',
          imageUrl: editingProduct.imageUrl || editingProduct.imageLink || editingProduct.image?.imageLink || editingProduct.avatar || '',
          imageId: editingProduct.imageId || editingProduct.image?.id || null,
          menuIds: editingProduct.menuIds || [],
          unitConversions: editingProduct.unitConversions || [],
          recipe: editingProduct.recipeItems
            ? editingProduct.recipeItems.map(item => ({ productId: item.ingredientProductId || item.productId, quantity: item.quantity }))
            : [],
        });
      } else {
        setFormData({
          name: '',
          skuCode: '',
          groupId: groups.length > 0 ? groups[0].id : '',
          sellPrice: 0,
          isSellable: true,
          isManageQuantity: false,
          minStorage: 0,
          maxStorage: 1000000000,
          description: '',
          imageUrl: '',
          imageId: null,
          menuIds: [],
          unitConversions: [],
          recipe: [],
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
    if (formData.recipe.length === 0) {
      notifyError('Hàng Sản Xuất bắt buộc phải có công thức.');
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
    if (formData.unitConversions.length > 0) {
      const hasBase = formData.unitConversions.some(u => u.isBase);
      if (!hasBase) {
        notifyError('Bắt buộc phải chọn 1 đơn vị tính gốc.');
        return;
      }
      for (const u of formData.unitConversions) {
        if (!u.isBase) {
          const cp = Number(u.conversionPoint);
          if (!Number.isInteger(cp) || cp < 2 || cp > 1000000) {
            notifyError('Đơn vị quy đổi phải là số nguyên từ 2 đến 1.000.000.');
            return;
          }
        }
      }
    }

    setLoading(true);
    try {
      const payload = {
        chainId: 1,
        groupId: Number(formData.groupId),
        imageId: formData.imageId,
        imageUrl: formData.imageUrl,
        name: formData.name.trim(),
        skuCode: formData.skuCode.trim(),
        description: formData.description,
        isSellable: formData.isSellable,
        isManageQuantity: formData.isManageQuantity,
        minStorage: Number(formData.minStorage),
        maxStorage: Number(formData.maxStorage),
        sellPrice: Number(formData.sellPrice),
        menuIds: formData.menuIds.map(Number),
        unitConversions: formData.unitConversions.map(u => ({
          unitId: Number(u.unitId),
          conversionPoint: u.isBase ? 1 : Number(u.conversionPoint),
          isBase: Boolean(u.isBase),
        })),
        recipe: formData.recipe.map(r => ({
          productId: Number(r.productId),
          quantity: Number(r.quantity),
        })),
      };

      if (editingProduct && editingProduct.id) {
        payload.id = editingProduct.id;
        await updateManufacturedProduct(payload);
        notifySuccess('Cập nhật hàng sản xuất thành công!');
      } else {
        await createManufacturedProduct(payload);
        notifySuccess('Tạo mới hàng sản xuất thành công!');
      }
      onSuccess();
      onCancel();
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu hàng sản xuất.';
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
          width: 820,
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
            background: '#eff6ff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                fontSize: 18,
              }}
            >
              <BuildOutlined />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1e3a8a' }}>
                {editingProduct ? 'Cập Nhật Hàng Sản Xuất' : 'Thêm Hàng Sản Xuất Mới'}
              </h3>
              <span style={{ fontSize: 12, color: '#1d4ed8' }}>MANUFACTURED - Hàng sản xuất / đóng gói (Có tồn kho & công thức)</span>
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
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                >
                  {uploadingImage ? (
                    <div style={{ textAlign: 'center', color: '#2563eb', fontSize: 12 }}>
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
                    Tên món / sản phẩm <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Bánh mì đóng gói, Nước sốt đóng chai"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
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
                    placeholder="45000"
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={formData.isSellable}
                      onChange={e => setFormData({ ...formData, isSellable: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                    />
                    Cho phép bán trên Menu
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={formData.isManageQuantity}
                      onChange={e => setFormData({ ...formData, isManageQuantity: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#2563eb' }}
                    />
                    Quản lý tồn kho
                  </label>
                </div>
              </div>
            </div>

            {/* TỒN KHO & ĐỊNH MỨC */}
            {formData.isManageQuantity && (
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>Tồn kho tối thiểu</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStorage}
                    onChange={e => setFormData({ ...formData, minStorage: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>Tồn kho tối đa</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxStorage}
                    onChange={e => setFormData({ ...formData, maxStorage: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>
            )}

            {/* CÔNG THỨC (RECIPE) */}
            <RecipeBuilder
              recipe={formData.recipe}
              setRecipe={rec => setFormData({ ...formData, recipe: rec })}
              products={products}
              units={units}
              groups={groups}
              currentProductId={editingProduct?.id}
              allowedProductTypes={['Manufactured', 'Regular', 'Ingredient']}
              notifyError={notifyError}
            />

            {/* ĐƠN VỊ QUY ĐỔI */}
            <UnitConversionBuilder
              unitConversions={formData.unitConversions}
              setUnitConversions={ucs => setFormData(prev => ({
                ...prev,
                unitConversions: typeof ucs === 'function' ? ucs(prev.unitConversions || []) : ucs
              }))}
              units={units}
              onOpenAddUnit={onOpenAddUnit}
              notifyError={notifyError}
            />

            {/* MÔ TẢ */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>Mô tả sản phẩm</label>
              <textarea
                rows={3}
                placeholder="Nhập mô tả sản phẩm..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
              />
            </div>
          </div>

          {/* FOOTER */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc' }}>
            <button type="button" onClick={onCancel} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer' }}>
              Hủy
            </button>
            <button type="submit" disabled={loading} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}>
              {loading ? 'Đang lưu...' : editingProduct ? 'Cập Nhật' : 'Tạo Mới sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManufacturedProductModal;
