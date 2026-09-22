import React, { useState, useEffect } from 'react';
import {
  CloseOutlined,
  PlusOutlined,
  PictureOutlined,
  SettingOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { createToolProduct, updateToolProduct } from '../../../api/productApi';
import { uploadImage } from '../../../api/imageApi';
import UnitConversionBuilder from './UnitConversionBuilder';

const ToolProductModal = ({
  open,
  onCancel,
  editingProduct = null,
  groups = [],
  units = [],
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
    isManageQuantity: false,
    minStorage: 0,
    maxStorage: 1000000000,
    description: '',
    imageUrl: '',
    imageId: null,
    unitConversions: [],
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
          isManageQuantity: editingProduct.isManageQuantity || false,
          minStorage: editingProduct.minStorage || 0,
          maxStorage: editingProduct.maxStorage || 1000000000,
          description: editingProduct.description || '',
          imageUrl: editingProduct.imageUrl || editingProduct.imageLink || editingProduct.image?.imageLink || editingProduct.avatar || '',
          imageId: editingProduct.imageId || editingProduct.image?.id || null,
          unitConversions: editingProduct.unitConversions || [],
        });
      } else {
        setFormData({
          name: '',
          skuCode: '',
          groupId: groups.length > 0 ? groups[0].id : '',
          isManageQuantity: false,
          minStorage: 0,
          maxStorage: 1000000000,
          description: '',
          imageUrl: '',
          imageId: null,
          unitConversions: [],
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
      notifyError('Vui lòng nhập tên công cụ dụng cụ.');
      return;
    }
    if (!formData.groupId) {
      notifyError('Vui lòng chọn nhóm hàng.');
      return;
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
        isManageQuantity: formData.isManageQuantity,
        minStorage: Number(formData.minStorage),
        maxStorage: Number(formData.maxStorage),
        unitConversions: formData.unitConversions.map(u => ({
          unitId: Number(u.unitId),
          conversionPoint: u.isBase ? 1 : Number(u.conversionPoint),
          isBase: Boolean(u.isBase),
        })),
      };

      if (editingProduct && editingProduct.id) {
        payload.id = editingProduct.id;
        await updateToolProduct(payload);
        notifySuccess('Cập nhật công cụ dụng cụ thành công!');
      } else {
        await createToolProduct(payload);
        notifySuccess('Tạo mới công cụ dụng cụ thành công!');
      }
      onSuccess();
      onCancel();
    } catch (err) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu công cụ dụng cụ.';
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
          width: 760,
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
            background: '#ecfeff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#cff4fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0891b2',
                fontSize: 18,
              }}
            >
              <SettingOutlined />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#164e63' }}>
                {editingProduct ? 'Cập Nhật Công Cụ Dụng Cụ' : 'Thêm Công Cụ Dụng Cụ Mới'}
              </h3>
              <span style={{ fontSize: 12, color: '#0e7490' }}>TOOL - Vật tư / Tài sản kho (Không có giá bán & menu)</span>
            </div>
          </div>
          <button onClick={onCancel} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748b' }}>
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
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0891b2')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                >
                  {uploadingImage ? (
                    <div style={{ textAlign: 'center', color: '#0891b2', fontSize: 12 }}>
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
                    Tên công cụ dụng cụ <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Ly thủy tinh, Muỗng inox, Dao bếp"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>
                    Nhóm hàng <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={formData.groupId}
                      onChange={e => setFormData({ ...formData, groupId: e.target.value })}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, background: '#ffffff' }}
                    >
                      <option value="">-- Chọn nhóm --</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    {onOpenAddGroup && (
                      <button type="button" onClick={onOpenAddGroup} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>
                        <PlusOutlined />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>Mã SKU</label>
                  <input
                    type="text"
                    placeholder="Tự động tạo nếu trống"
                    value={formData.skuCode}
                    onChange={e => setFormData({ ...formData, skuCode: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2', marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={formData.isManageQuantity}
                      onChange={e => setFormData({ ...formData, isManageQuantity: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#0891b2' }}
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
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 4 }}>Mô tả công cụ dụng cụ</label>
              <textarea
                rows={3}
                placeholder="Nhập mô tả..."
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
            <button type="submit" disabled={loading} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#0891b2', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}>
              {loading ? 'Đang lưu...' : editingProduct ? 'Cập Nhật' : 'Tạo Mới công cụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ToolProductModal;
