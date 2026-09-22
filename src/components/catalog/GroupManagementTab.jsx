import React, { useState, useEffect } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined, CloseOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getAllGroups, createGroup, updateGroup, deleteGroup } from '../../api/groupApi';

const GroupManagementTab = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [formValues, setFormValues] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await getAllGroups();
      setGroups(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleOpenModal = (group = null) => {
    setEditingGroup(group);
    if (group) {
      setFormValues({ name: group.name || '', description: group.description || '' });
    } else {
      setFormValues({ name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteGroup(id);
      fetchGroups();
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
      if (editingGroup) {
        await updateGroup({ ...formValues, id: editingGroup.id });
      } else {
        await createGroup(formValues);
      }
      setIsModalOpen(false);
      fetchGroups();
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderOutlined style={{ color: '#ea580c' }} />
          Quản lý Nhóm Sản phẩm (Group)
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
          Thêm Nhóm mới
        </button>
      </div>

      {/* TABLE */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', width: 80 }}>ID</th>
              <th style={{ padding: '10px 12px' }}>Tên Nhóm</th>
              <th style={{ padding: '10px 12px' }}>Mô tả</th>
              <th style={{ padding: '10px 12px', width: 100, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                  Đang tải danh sách nhóm sản phẩm...
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                  Chưa có nhóm sản phẩm nào
                </td>
              </tr>
            ) : (
              groups.map((g, idx) => (
                <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b' }}>{g.id}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{g.name}</td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>{g.description || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <button
                        onClick={() => handleOpenModal(g)}
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
                        onClick={() => setDeleteConfirmId(g.id)}
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
          <div style={{ background: '#ffffff', borderRadius: 12, width: 420, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                {editingGroup ? 'Chỉnh sửa Nhóm' : 'Thêm Nhóm mới'}
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <CloseOutlined style={{ fontSize: 12 }} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: 16 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Tên Nhóm <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đồ uống, Khai vị..."
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 6, outline: 'none' }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Mô tả</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả chi tiết nhóm..."
                  value={formValues.description}
                  onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 6, outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#475569', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving || !formValues.name.trim()}
                  style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#ffffff', background: saving ? '#94a3b8' : '#ea580c', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Đang lưu...' : editingGroup ? 'Lưu' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, padding: 20, width: 360, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <ExclamationCircleOutlined style={{ fontSize: 24, color: '#ef4444' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Xác nhận xóa nhóm sản phẩm?</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Hành động này không thể hoàn tác.</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#475569', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>
                Hủy
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#ffffff', background: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagementTab;
