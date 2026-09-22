import React, { useState, useMemo, useEffect, useCallback } from 'react';
import CustomerTable from './CustomerTable';
import CustomerProfileModal from './CustomerProfileModal';
import CustomerPointModal from './CustomerPointModal';
import { getCustomers, deleteCustomer } from '../../../../api/customerManagementApi';
import { useSignalR } from '../../../../context/SignalRContext';

const CustomerTab = ({ selectedBranchId }) => {
  const connection = useSignalR();
  const [customers, setCustomers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal quản lý Profile (Thêm mới / Sửa thông tin)
  const [modalProfileOpen, setModalProfileOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Modal quản lý Điểm (Điều chỉnh / Sửa giao dịch / Xóa giao dịch)
  const [modalPointOpen, setModalPointOpen] = useState(false);
  const [pointModalCustomer, setPointModalCustomer] = useState(null);
  const [pointModalMode, setPointModalMode] = useState('adjust'); // 'adjust' | 'edit' | 'delete'
  const [targetPointTransaction, setTargetPointTransaction] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers(searchText);
      // Dữ liệu trả về có dạng { items: [...], totalCount: ... } hoặc mảng trực tiếp
      const list = Array.isArray(data) ? data : data?.items || [];
      setCustomers(list);
    } catch (err) {
      console.error('Lỗi khi tải danh sách khách hàng:', err);
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Lắng nghe SignalR để tự động cập nhật danh sách khách hàng theo thời gian thực
  useEffect(() => {
    if (!connection) return;

    if (selectedBranchId) {
      connection.invoke('JoinBranchGroup', selectedBranchId).catch(() => {});
    }

    const handleCustomerUpdate = () => {
      fetchCustomers();
    };

    const handleNotification = (notif) => {
      if (
        notif?.type === 'payment_completed' ||
        notif?.type === 'order_completed' ||
        notif?.type === 'order_status_changed' ||
        notif?.type === 'customer_updated' ||
        notif?.type === 'customer_point_changed'
      ) {
        fetchCustomers();
      }
    };

    connection.on('ReceiveCustomerUpdate', handleCustomerUpdate);
    connection.on('ReceiveNotification', handleNotification);

    return () => {
      connection.off('ReceiveCustomerUpdate', handleCustomerUpdate);
      connection.off('ReceiveNotification', handleNotification);
    };
  }, [connection, selectedBranchId, fetchCustomers]);

  // Bộ lọc khách hàng trên giao diện
  const filteredCustomers = useMemo(() => {
    if (!searchText.trim()) return customers;
    const lower = searchText.toLowerCase().trim();
    return customers.filter((c) => {
      const matchName = c.name?.toLowerCase().includes(lower);
      const matchPhone = c.phone?.toLowerCase().includes(lower);
      const matchEmail = c.email?.toLowerCase().includes(lower);
      return matchName || matchPhone || matchEmail;
    });
  }, [customers, searchText]);

  // Mở modal thêm khách hàng mới
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setModalProfileOpen(true);
  };

  // Mở modal chỉnh sửa profile khách hàng
  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setModalProfileOpen(true);
  };

  // Xóa khách hàng
  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khách hàng này khỏi hệ thống?')) return;
    try {
      await deleteCustomer(customerId);
      fetchCustomers();
    } catch (error) {
      console.error('Lỗi khi xóa khách hàng:', error);
      const msg = error.response?.data?.message || 'Không thể xóa khách hàng lúc này!';
      alert(msg);
    }
  };

  // Mở modal điều chỉnh điểm tích lũy
  const handleAdjustPoints = (customer) => {
    setPointModalCustomer(customer);
    setPointModalMode('adjust');
    setTargetPointTransaction(null);
    setModalPointOpen(true);
  };

  // Mở modal sửa giao dịch điểm thủ công
  const handleEditPointTransaction = (customer, transaction) => {
    setPointModalCustomer(customer);
    setPointModalMode('edit');
    setTargetPointTransaction(transaction);
    setModalPointOpen(true);
  };

  // Mở modal xóa / hoàn tác giao dịch điểm thủ công
  const handleDeletePointTransaction = (customer, transaction) => {
    setPointModalCustomer(customer);
    setPointModalMode('delete');
    setTargetPointTransaction(transaction);
    setModalPointOpen(true);
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      {loading && customers.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13 }}>
          Đang tải danh sách khách hàng...
        </div>
      ) : (
        <CustomerTable
          customers={filteredCustomers}
          searchText={searchText}
          setSearchText={setSearchText}
          onOpenAddModal={handleOpenAddModal}
          onEditCustomer={handleEditCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onAdjustPoints={handleAdjustPoints}
          onEditPointTransaction={handleEditPointTransaction}
          onDeletePointTransaction={handleDeletePointTransaction}
          onRefresh={fetchCustomers}
          loading={loading}
        />
      )}

      {/* MODAL THÊM / SỬA PROFILE KHÁCH HÀNG */}
      <CustomerProfileModal
        open={modalProfileOpen}
        onClose={() => {
          setModalProfileOpen(false);
          setEditingCustomer(null);
        }}
        onSuccess={fetchCustomers}
        customer={editingCustomer}
      />

      {/* MODAL ĐIỀU CHỈNH / SỬA / XÓA ĐIỂM */}
      <CustomerPointModal
        open={modalPointOpen}
        onClose={() => {
          setModalPointOpen(false);
          setPointModalCustomer(null);
          setTargetPointTransaction(null);
        }}
        onSuccess={fetchCustomers}
        customer={pointModalCustomer}
        mode={pointModalMode}
        targetTransaction={targetPointTransaction}
      />
    </div>
  );
};

export default CustomerTab;
