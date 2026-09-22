import React, { useState, useEffect } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined, CloseOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getAllMenus, createMenu, updateMenu, deleteMenu } from '../../api/menuApi';

const MenuManagementTab = () => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [formValues, setFormValues] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const res = await getAllMenus();
      setMenus(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const handleOpenModal = (menu = null) => {
    setEditingMenu(menu);
    if (menu) {
      setFormValues({ name: menu.name || '', description: menu.description || '' });
    } else {
      setFormValues({ name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteMenu(id);
      fetchMenus();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formValues.name.trim()) return;
    setSaving(true);
    try {
      if (editingMenu) {
        await updateMenu({ ...formValues, id: editingMenu.id });
      } else {
        await createMenu(formValues);
      }
      setIsModalOpen(false);
      fetchMenus();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: 20,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOutlined style={{ color: '#ea580c' }} />
          Quản lý Thực đơn (Menu)
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 700,
            color: '#ffffff',
            background: '#ea580c',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          <PlusOutlined style={{ fontSize: 12 }} />
          Tạo Thực đơn mới
        </button>
      </div>

      {/* TABLE */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr
              style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                color: '#475569',
                fontWeight: 700,
                fontSize: 11,
                textTransform: 'uppercase',
                textAlign: 'left',
              }}
            >
              <th style={{ padding: '10px 12px', width: 80 }}>ID</th>
              <th style={{ padding: '10px 12px' }}>Tên Thực Đơn</th>
              <th style={{ padding: '10px 12px' }}>Mô tả</th>
              <th style={{ padding: '10px 12px', width: 130 }}>Số món ăn</th>
              <th style={{ padding: '10px 12px', width: 100, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                  Đang tải danh sách thực đơn...
                </td>
              </tr>
            ) : menus.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                  Chưa có thực đơn nào
                </td>
              </tr>
            ) : (
              menus.map((m, idx) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b' }}>{m.id}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BookOutlined style={{ color: '#ea580c' }} />
                      {m.name}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>{m.description || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 12,
                        background: '#fff7ed',
                        color: '#ea580c',
                        border: '1px solid #ffedd5',
                      }}
                    >
                      {m.menuProducts?.length || 0} sản phẩm
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <button
                        onClick={() => handleOpenModal(m)}
                        style={{
                          background: '#fff7ed',
                          border: '1px solid #ffedd5',
                          borderRadius: 4,
                          width: 26,
                          height: 26,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ea580c',
                          cursor: 'pointer',
                        }}
                      >
                        <EditOutlined style={{ fontSize: 12 }} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(m.id)}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: 4,
                          width: 26,
                          height: 26,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        <DeleteOutlined style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              width: 420,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                {editingMenu ? 'Chỉnh sửa Thực đơn' : 'Tạo Thực đơn mới'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <CloseOutlined style={{ fontSize: 12 }} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: 16 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Tên Thực đơn <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thực đơn Sáng, Thực đơn Tiệc..."
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: 12,
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    outline: 'none',
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Mô tả
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả chi tiết thực đơn..."
                  value={formValues.description}
                  onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: 12,
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#475569',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving || !formValues.name.trim()}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#ffffff',
                    background: saving ? '#94a3b8' : '#ea580c',
                    border: 'none',
                    borderRadius: 6,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Đang lưu...' : editingMenu ? 'Lưu' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 20,
              width: 360,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <ExclamationCircleOutlined style={{ fontSize: 24, color: '#ef4444' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Xác nhận xóa thực đơn?</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Hành động này không thể hoàn tác.</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#475569',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#ffffff',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagementTab;
