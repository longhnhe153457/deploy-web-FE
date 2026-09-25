/**
 * OrderPage
 *
 * Layout 3 cột theo phong cách :
 *  [TablePanel] | [MenuPanel] | [OrderPanel]
 *
 * Tích hợp:
 *  - GET  /api/Table        → danh sách bàn (fallback mock nếu lỗi)
 *  - PUT  /api/Table        → cập nhật trạng thái bàn
 *  - POST /api/Order        → tạo đơn hàng
 *  - POST /api/Order/:id/details → tạo chi tiết món
 *
 * Quy tắc: Chỉ được gọi món khi bàn status = "Occupied" (kiểm tra ở BE)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message, Modal, Button } from 'antd';
import { FireOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getAllTables, getTablesByBranch, updateTable } from '../api/tableApi';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import { useBranch } from '../context/BranchContext';
import { createOrder, createBulkOrderDetail, updateCookingStatus, cancelOrder, payOrder } from '../api/orderApi';
import { getTableOrderSummary, confirmOrderItem, rejectOrderItem } from '../api/tableMapApi';
import { checkInReservation } from '../api/reservationApi';
import { TABLE_STATUS } from '../data/tableConstants';
import TablePanel from '../components/order/TablePanel';
import MenuPanel from '../components/order/MenuPanel';
import OrderPanel from '../components/order/OrderPanel';
import PaymentModal from '../components/payment/PaymentModal';
import MergeTableModal from '../components/tablemap/MergeTableModal';
import RequestRestockModal from '../components/order/RequestRestockModal';
import InternalPickupModal from '../components/order/InternalPickupModal';

const OrderPage = ({ isWaiterMode }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [refreshMenuTrigger, setRefreshMenuTrigger] = useState(0);
  const actionRef = useRef(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isMergeModalVisible, setIsMergeModalVisible] = useState(false);
  const [isRestockModalVisible, setIsRestockModalVisible] = useState(false);
  const [isInternalPickupModalVisible, setIsInternalPickupModalVisible] = useState(false);
  const [searchParams] = useSearchParams();
  const tableIdParam = searchParams.get('tableId');

  const { user } = useAuth();
  const { deviceInfo } = useDevice();
  const { currentBranchId } = useBranch();

  const loadTables = useCallback(async () => {
    setTableLoading(true);
    try {
      let res;
      if (deviceInfo) {
        res = await getTablesByBranch(deviceInfo.branchId);
      } else if (currentBranchId) {
        res = await getTablesByBranch(currentBranchId);
      } else {
        const isAdminOrOwner = user?.roles?.some(r => r === 'Admin' || r === 'Owner');
        const branchIds = user?.branchIds || [];
        res = (!isAdminOrOwner && branchIds.length > 0)
          ? await getTablesByBranch(branchIds)
          : await getAllTables();
      }
      const data = res?.data;
      const loadedTables = Array.isArray(data) ? data : [];
      setTables(loadedTables);

      if (tableIdParam && loadedTables.length > 0) {
        const t = loadedTables.find(x => x.id.toString() === tableIdParam);
        if (t) {
          setSelectedTable(t);
        }
      }
    } catch {
      message.error('Không thể tải danh sách bàn. Kiểm tra kết nối server.');
      setTables([]);
    } finally {
      setTableLoading(false);
    }
  }, [user, tableIdParam, deviceInfo, currentBranchId]);

  useEffect(() => { loadTables(); }, [loadTables]);

  const [orderSummary, setOrderSummary] = useState(null);

  const handleSelectTable = (table) => {
    if (selectedTable?.id === table.id) return;
    setSelectedTable(table);
    setCartItems([]);
  };

  useEffect(() => {
    if (!selectedTable) {
      setOrderSummary(null);
      return;
    }
    getTableOrderSummary(selectedTable.id)
      .then(res => setOrderSummary(res.data))
      .catch(err => {
        console.error(err);
        setOrderSummary(null);
      });
  }, [selectedTable]);

  const handleRefreshData = () => {
    loadTables();
    if (selectedTable) {
      getTableOrderSummary(selectedTable.id)
        .then(res => setOrderSummary(res.data))
        .catch(err => {
          console.error(err);
          setOrderSummary(null);
        });
    }
  };

  const handleAddItem = useCallback((item) => {
    // Món "dùng lại từ đồ thừa" luôn là một dòng riêng (khoá theo leftoverId) —
    // không gộp với dòng gọi món bình thường của cùng sản phẩm, vì số lượng phải
    // khớp đúng với món thừa gốc khi gửi lên BE.
    if (item.reuseLeftoverId) {
      const cartKey = `reuse-${item.reuseLeftoverId}`;
      setCartItems((prev) => [...prev, { ...item, cartKey, qty: item.qty || 1, note: item.note || '' }]);
      return;
    }
    setCartItems((prev) => {
      const cartKey = String(item.id);
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) => i.cartKey === cartKey ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, cartKey, qty: 1, note: '' }];
    });
  }, []);

  const handleUpdateQty = useCallback((cartKey, qty) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.cartKey !== cartKey));
    } else {
      setCartItems((prev) => prev.map((i) => i.cartKey === cartKey ? { ...i, qty } : i));
    }
  }, []);

  const handleRemoveItem = useCallback((cartKey) => {
    setCartItems((prev) => prev.filter((i) => i.cartKey !== cartKey));
  }, []);

  const handleNoteChange = useCallback((cartKey, note) => {
    setCartItems((prev) => prev.map((i) => i.cartKey === cartKey ? { ...i, note } : i));
  }, []);


  const handleChangeTableStatus = async (newStatus) => {
    if (!selectedTable) return;
    if (actionRef.current) return;
    actionRef.current = true;

    if (newStatus === 'CHECK_IN') {
      if (!orderSummary?.reservationId) {
        message.error("Không tìm thấy thông tin đặt bàn!");
        actionRef.current = false;
        return;
      }
      try {
        const res = await checkInReservation(orderSummary.reservationId);
        if (res.failedItems && res.failedItems.length > 0) {
          message.warning(`Khách đã đến! Tuy nhiên các món [${res.failedItems.join(', ')}] đã hết hàng/nguyên liệu và tự động bị hủy.`);
        } else {
          message.success("Đã xác nhận khách đến!");
        }
        const updated = { ...selectedTable, status: TABLE_STATUS.OCCUPIED };
        setSelectedTable(updated);
        setTables((prev) => prev.map((t) => String(t.id) === String(updated.id) ? updated : t));
        const summaryRes = await getTableOrderSummary(selectedTable.id);
        setOrderSummary(summaryRes.data);
      } catch (err) {
        console.error(err);
        message.error("Xác nhận khách đến thất bại!");
      } finally {
        actionRef.current = false;
      }
      return;
    }

    if (newStatus === TABLE_STATUS.CLEANING) {
      try {
        const summaryRes = await getTableOrderSummary(selectedTable.id);
        if (summaryRes.data?.activeOrderId) {
          const items = summaryRes.data.items || [];
          const activeItems = items.filter(i => i.status !== 'Cancelled');
          const allReturned = activeItems.every(i => i.quantity > 0 && i.returnedQuantity === i.quantity);

          if (activeItems.length > 0 && allReturned) {
            await payOrder(summaryRes.data.activeOrderId, {
              customerName: null, customerPhone: null, voucherCode: null, pointsUsed: 0
            });
            message.success('Đã tự động hoàn tất hoá đơn 0đ (do tất cả món đã được trả).');
          } else if (items.length === 0) {
            await cancelOrder(summaryRes.data.activeOrderId);
            message.success('Đã tự động huỷ hoá đơn rỗng.');
          } else {
            message.warning('Bàn đang có hoá đơn chưa thanh toán. Vui lòng thanh toán hoá đơn trước khi dọn bàn!');
            actionRef.current = false;
            return;
          }
        }
      } catch (err) {
        console.error('Lỗi kiểm tra hoá đơn của bàn:', err);
        actionRef.current = false;
        return;
      }
    }

    try {
      await updateTable({
        id: selectedTable.id,
        areaId: selectedTable.areaId,
        name: selectedTable.name,
        status: newStatus,
        isActive: selectedTable.isActive ?? true,
      });
      const updated = { ...selectedTable, status: newStatus };
      setSelectedTable(updated);
      setTables((prev) => prev.map((t) => String(t.id) === String(updated.id) ? updated : t));

      if (newStatus !== TABLE_STATUS.OCCUPIED) setCartItems([]);
      message.success('Đã cập nhật trạng thái bàn');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Lỗi khi cập nhật trạng thái bàn';
      message.error(msg);
    } finally {
      actionRef.current = false;
    }
  };


  const isConfirmingRef = useRef(false);

  const handleConfirmOrder = async () => {
    if (!selectedTable || cartItems.length === 0) return;
    if (isConfirmingRef.current) return;

    const isOccupied = selectedTable.status?.toLowerCase() === 'occupied';
    const isEmpty = selectedTable.status?.toLowerCase() === 'empty';
    if (!isOccupied && !isEmpty) {
      message.warning('Chỉ có thể gọi món khi bàn Trống hoặc Có khách');
      return;
    }

    const subTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
    const total = Math.round(subTotal * 1.08);

    isConfirmingRef.current = true;
    setOrderLoading(true);
    let createdOrderId = null;
    let wasTableEmpty = false;

    try {
      const summaryRes = await getTableOrderSummary(selectedTable.id);
      let orderId = summaryRes.data?.originalOrderId || summaryRes.data?.activeOrderId;

      if (isEmpty) {
        try {
          await updateTable({
            id: selectedTable.id,
            areaId: selectedTable.areaId,
            name: selectedTable.name,
            status: 'Occupied',
            isActive: selectedTable.isActive ?? true,
          });
          const updated = { ...selectedTable, status: 'Occupied' };
          setSelectedTable(updated);
          setTables((prev) => prev.map((t) => String(t.id) === String(updated.id) ? updated : t));
          wasTableEmpty = true;
        } catch (err) {
          message.error('Lỗi khi cập nhật trạng thái bàn sang Có khách');
          setOrderLoading(false);
          isConfirmingRef.current = false;
          return;
        }
      }

      if (!orderId) {
        const orderRes = await createOrder({
          tableId: selectedTable.id,
          fatherId: null,
          method: 'DineIn',
          status: 'Active',
          customerId: null,
          totalAmount: total,
          createdBy: 1,
        });
        orderId = orderRes?.data?.id ?? orderRes?.data;
        createdOrderId = orderId;
      }

      const dtos = cartItems.map((item) => ({
        productId: item.id,
        recipeId: null,
        quantity: item.qty,
        price: item.price,
        note: item.note || '',
        status: 'Confirmed',
        cookingStatus: item.reuseLeftoverId ? 'Ready' : 'Waiting',
        reuseLeftoverId: item.reuseLeftoverId || null,
      }));

      await createBulkOrderDetail(orderId, dtos);

      message.success(`Gọi thêm món thành công!`);
      setCartItems([]);
      setRefreshMenuTrigger(prev => prev + 1);

      const newSummaryRes = await getTableOrderSummary(selectedTable.id);
      setOrderSummary(newSummaryRes.data);
    } catch (err) {
      // Rollback nếu tạo Order mới nhưng thêm món lỗi
      if (createdOrderId) {
        try {
          await deleteOrder(createdOrderId);
        } catch (e) {
          console.error("Lỗi khi xoá order rỗng:", e);
        }
      }
      if (wasTableEmpty) {
        try {
          await updateTable({
            id: selectedTable.id,
            areaId: selectedTable.areaId,
            name: selectedTable.name,
            status: 'Empty',
            isActive: selectedTable.isActive ?? true,
          });
          const reverted = { ...selectedTable, status: 'Empty' };
          setSelectedTable(reverted);
          setTables((prev) => prev.map((t) => String(t.id) === String(reverted.id) ? reverted : t));
        } catch (e) {
          console.error("Lỗi khi hoàn tác trạng thái bàn:", e);
        }
      }
      if (err.response?.status === 400 && err.response?.data?.errors?.length > 0) {
        const errors = err.response.data.errors;
        Modal.confirm({
          title: 'Một số món không đủ số lượng',
          content: (
            <div>
              <p>Bếp không đủ nguyên liệu cho các món sau:</p>
              <ul style={{ paddingLeft: 20 }}>
                {errors.map((e, idx) => (
                  <li key={idx}>
                    <strong>{e.productName}</strong>: Chọn {e.requestedQuantity}, bếp còn {e.availableQuantity}
                  </li>
                ))}
              </ul>
              <p>Bạn có muốn tự động cập nhật giỏ hàng theo số lượng còn lại không?</p>
            </div>
          ),
          okText: 'Cập nhật giỏ hàng',
          cancelText: 'Hủy bỏ',
          onOk: () => {
            setCartItems(prev => {
              let newCart = [...prev];
              errors.forEach(errItem => {
                const index = newCart.findIndex(c => c.id === errItem.productId);
                if (index !== -1) {
                  if (errItem.availableQuantity <= 0) {
                    newCart.splice(index, 1);
                  } else {
                    newCart[index].qty = errItem.availableQuantity;
                  }
                }
              });
              return newCart;
            });
            message.info('Đã cập nhật giỏ hàng, vui lòng kiểm tra lại trước khi gọi món.');
          }
        });
      } else {
        message.error(err.response?.data?.message || 'Có lỗi khi đặt món!');
      }
    } finally {
      setOrderLoading(false);
      isConfirmingRef.current = false;
    }
  };

  const handleMarkAsServed = async (orderDetailId) => {
    if (actionRef.current) return;
    actionRef.current = true;
    try {
      await updateCookingStatus(orderDetailId, { cookingStatus: 'Served' });
      message.success('Đã xác nhận phục vụ món!');
      if (selectedTable) {
        const summaryRes = await getTableOrderSummary(selectedTable.id);
        setOrderSummary(summaryRes.data);
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi xác nhận phục vụ món');
    } finally {
      actionRef.current = false;
    }
  };

  const handleConfirmItem = async (orderDetailId, quantity) => {
    if (actionRef.current) return;
    actionRef.current = true;
    try {
      await confirmOrderItem(orderDetailId, quantity);
      message.success('Đã xác nhận món!');
      if (selectedTable) {
        const summaryRes = await getTableOrderSummary(selectedTable.id);
        setOrderSummary(summaryRes.data);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Xác nhận thất bại');
    } finally {
      actionRef.current = false;
    }
  };

  const handleRejectItem = async (orderDetailId, reason) => {
    if (actionRef.current) return;
    actionRef.current = true;
    try {
      await rejectOrderItem(orderDetailId, reason);
      message.success('Đã từ chối món!');
      if (selectedTable) {
        const summaryRes = await getTableOrderSummary(selectedTable.id);
        setOrderSummary(summaryRes.data);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Từ chối thất bại');
    } finally {
      actionRef.current = false;
    }
  };

  const handlePaymentClick = () => {
    const activeItems = orderSummary?.items?.filter(i => i.status !== 'Cancelled') || [];
    const hasUnservedItems = activeItems.some(i => i.cookingStatus !== 'Served');

    if (hasUnservedItems) {
      Modal.warning({
        title: 'Cảnh báo: Bàn chưa lên hết món',
        content: 'Vẫn còn món chưa được phục vụ (đang chờ hoặc đang nấu). Vui lòng phục vụ hoặc huỷ món trước khi thanh toán.',
        okText: 'Đã hiểu',
      });
    } else {
      setIsPaymentModalVisible(true);
    }
  };

  const handleCancelOrder = async (orderId) => {
    Modal.confirm({
      title: 'Xác nhận hủy hóa đơn',
      content: 'Bạn có chắc chắn muốn hủy hóa đơn này không? Bàn sẽ được dọn dẹp.',
      okText: 'Đồng ý',
      cancelText: 'Bỏ qua',
      onOk: async () => {
        try {
          await cancelOrder(orderId);
          message.success('Đã hủy hóa đơn thành công!');
          handleRefreshData();
        } catch (err) {
          message.error(err?.response?.data?.message || 'Lỗi khi hủy hóa đơn');
        }
      }
    });
  };

  const isOccupied = selectedTable?.status?.toLowerCase() === 'occupied';
  const canOrder = selectedTable?.status?.toLowerCase() === 'occupied' || selectedTable?.status?.toLowerCase() === 'empty';

  return (
    <div className="pos-page">
      <div className="pos-top-bar">
        <div className="pos-top-bar-left">
          <span className="pos-top-bar-icon"></span>
          <span className="pos-top-bar-title">MenuGo POS</span>
          <span className="pos-top-bar-divider">|</span>
          <span className="pos-top-bar-sub">Phục vụ</span>
          <Button 
            type="primary"
            icon={<FireOutlined />}
            style={{ marginLeft: 16, backgroundColor: '#f5222d', borderColor: '#f5222d', fontWeight: 'bold' }}
            onClick={() => setIsRestockModalVisible(true)}
          >
            Yêu cầu Bếp
          </Button>
          <Button 
            type="primary"
            icon={<CheckCircleOutlined />}
            style={{ marginLeft: 16, backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 'bold' }}
            onClick={() => setIsInternalPickupModalVisible(true)}
          >
            Nhận đồ nội bộ
          </Button>
        </div>
        <div className="pos-top-bar-right">
          <span className="pos-top-bar-time" suppressHydrationWarning>
            {new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
          <button className="pos-top-bar-refresh" onClick={handleRefreshData} title="Làm mới danh sách bàn và đơn hàng">
            🔄
          </button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="pos-layout">
        <TablePanel
          tables={tables}
          selectedTable={selectedTable}
          onSelectTable={handleSelectTable}
          loading={tableLoading}
        />

        <MenuPanel
          canOrder={canOrder}
          onAddItem={handleAddItem}
          branchId={deviceInfo?.branchId || currentBranchId || (user?.branchIds && user.branchIds[0]) || 1}
          showReuseSuggestions={false}
          refreshTrigger={refreshMenuTrigger}
        />

        <OrderPanel
          table={selectedTable}
          summary={orderSummary}
          cartItems={cartItems}
          canOrder={canOrder}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onNoteChange={handleNoteChange}
          onConfirm={handleConfirmOrder}
          onChangeStatus={handleChangeTableStatus}
          onPayment={handlePaymentClick}
          onMarkAsServed={handleMarkAsServed}
          onConfirmItem={handleConfirmItem}
          onRejectItem={handleRejectItem}
          onCancelOrder={handleCancelOrder}
          onMerge={() => setIsMergeModalVisible(true)}
          loading={orderLoading}
          isWaiterMode={isWaiterMode}
        />
      </div>

      <PaymentModal
        visible={isPaymentModalVisible}
        branchId={selectedTable?.branchId || selectedTable?.area?.branchId || deviceInfo?.branchId || currentBranchId || user?.branchId || (user?.branchIds && user.branchIds[0])}
        orderId={orderSummary?.activeOrderId}
        tableName={orderSummary?.tableName || selectedTable?.name}
        items={orderSummary?.items}
        onCancel={() => setIsPaymentModalVisible(false)}
        onSuccess={() => {
          setIsPaymentModalVisible(false);
          loadTables();
          if (selectedTable) {
            getTableOrderSummary(selectedTable.id)
              .then(res => setOrderSummary(res.data))
              .catch(() => setOrderSummary(null));
          }
        }}
      />

      {isMergeModalVisible && (
        <MergeTableModal
          visible={isMergeModalVisible}
          onClose={() => setIsMergeModalVisible(false)}
          tables={tables}
          currentTable={selectedTable}
          onMerged={() => {
            loadTables();
            if (selectedTable) {
              getTableOrderSummary(selectedTable.id)
                .then(res => setOrderSummary(res.data))
                .catch(() => setOrderSummary(null));
            }
          }}
        />
      )}

      <RequestRestockModal 
        visible={isRestockModalVisible} 
        onClose={() => setIsRestockModalVisible(false)} 
        branchId={deviceInfo?.branchId || currentBranchId || user?.branchIds?.[0]}
      />

      <InternalPickupModal 
        visible={isInternalPickupModalVisible} 
        onClose={() => setIsInternalPickupModalVisible(false)} 
        branchId={deviceInfo?.branchId || currentBranchId || user?.branchIds?.[0]}
      />
    </div>
  );
};

export default OrderPage;
