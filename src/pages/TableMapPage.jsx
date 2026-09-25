import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { message, Spin, Select, Button } from 'antd';
import { CheckCircleOutlined, FireOutlined } from '@ant-design/icons';
import RequestRestockModal from '../components/order/RequestRestockModal';
import InternalPickupModal from '../components/order/InternalPickupModal';
import { getAllTables, getTablesByBranch, updateTable } from '../api/tableApi';
import { getAllBranches } from '../api/branchApi';
import { getAreasByBranchId } from '../api/areaApi';
import { getTableOrderSummary, confirmOrderItem, updateCookingStatus, rejectOrderItem } from '../api/tableMapApi';
import { cancelOrderDetail } from '../api/orderApi';
import { useAuth } from '../context/AuthContext';
import { useSignalR } from '../context/SignalRContext';
import { useBranch } from '../context/BranchContext';
import { getStatusConfig } from '../data/tableConstants';
import TableDetailPanel from '../components/tablemap/TableDetailPanel';
import WaiterActionFeed from '../components/tablemap/WaiterActionFeed';
import { useDevice } from '../context/DeviceContext';
import '../styles/tablemap.css';

const TableMapPage = ({ isPosHub, isWaiterMode, isDeviceMode }) => {
  const { currentBranchId } = useBranch();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedArea, setSelectedArea] = useState('all');
  const [areas, setAreas] = useState([]);

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isBranchesLoaded, setIsBranchesLoaded] = useState(false);

  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [orderSummary, setOrderSummary] = useState(null);
  const [isRestockModalVisible, setIsRestockModalVisible] = useState(false);
  const [isInternalPickupModalVisible, setIsInternalPickupModalVisible] = useState(false);

  const { user } = useAuth();
  const { deviceEmployee, deviceInfo } = useDevice();
  const connection = useSignalR();

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await getAllBranches();
        const allBranches = res.data;

        if (deviceInfo) {
          // Locked to the device's assigned branch
          const deviceBranch = allBranches.find(b => b.id === deviceInfo.branchId);
          if (deviceBranch) {
            setBranches([deviceBranch]);
            setSelectedBranch(deviceBranch.id);
          } else {
            setBranches([]);
            setSelectedBranch(null);
          }
          setIsBranchesLoaded(true);
          return;
        }

        let availableBranches = allBranches;
        const isAdminOrOwner = user?.roles?.includes('Admin') || user?.roles?.includes('Owner') || 
                               user?.role === 'Admin' || user?.role === 'Owner' || 
                               user?.roleName === 'Admin' || user?.roleName === 'Owner';

        if (!isAdminOrOwner && user?.branchIds && user.branchIds.length > 0) {
          availableBranches = allBranches.filter(b => user.branchIds.includes(b.id));
        }

        setBranches(availableBranches);
        if (currentBranchId) {
          setSelectedBranch(currentBranchId);
        } else if (availableBranches.length > 0) {
          setSelectedBranch(availableBranches[0].id);
        }
      } catch (err) {
        message.error('Lỗi khi tải danh sách chi nhánh');
      } finally {
        setIsBranchesLoaded(true);
      }
    };
    fetchBranches();
  }, [user, deviceInfo]);

  useEffect(() => {
    if (selectedBranch) {
      const fetchAreas = async () => {
        try {
          const res = await getAreasByBranchId(selectedBranch);
          setAreas(res.data);
        } catch (err) {
          console.error('Lỗi khi tải danh sách khu vực', err);
        }
      };
      fetchAreas();
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (currentBranchId && isBranchesLoaded) {
      setSelectedBranch(currentBranchId);
    }
  }, [currentBranchId, isBranchesLoaded]);

  const loadTables = useCallback(async () => {
    if (!isBranchesLoaded) return;
    if (!selectedBranch && branches.length > 0) return;

    if (!selectedBranch && branches.length === 0) {
      setTables([]);
      return;
    }

    setLoadingTables(true);
    try {
      const areaIdToFetch = selectedArea === 'all' ? null : selectedArea;
      const res = await getTablesByBranch([selectedBranch], areaIdToFetch);
      const data = res?.data;
      setTables(Array.isArray(data) ? data : []);
    } catch {
      message.error('Không thể tải danh sách bàn. Kiểm tra kết nối server.');
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, [isBranchesLoaded, selectedBranch, branches.length, selectedArea]);

  const loadOrderSummary = useCallback(async (tableId) => {
    setLoadingSummary(true);
    try {
      const res = await getTableOrderSummary(tableId);
      setOrderSummary(res.data);

      setTables(prev => prev.map(t => {
        if (t.id === tableId) {
          return {
            ...t,
            pendingCount: res.data.pendingConfirmCount,
            readyCount: res.data.readyToServeCount
          };
        }
        return t;
      }));
    } catch (err) {
      console.error(err);
      setOrderSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const selectedTableRef = useRef(selectedTable);
  useEffect(() => {
    selectedTableRef.current = selectedTable;
  }, [selectedTable]);

  useEffect(() => {
    if (connection) {
      const handleNotification = (data) => {
        if (data.tableId) {
          if (data.type === 'Payment') {
            loadTables();
          } else {
            setTables(prev => prev.map(t => {
              if (String(t.id) === String(data.tableId)) {
                return { ...t, isBlinking: true };
              }
              return t;
            }));
          }

          if (String(selectedTableRef.current?.id) === String(data.tableId)) {
            loadOrderSummary(data.tableId);
          }
        }
      };
      connection.on('ReceiveNotification', handleNotification);
      return () => connection.off('ReceiveNotification', handleNotification);
    }
  }, [connection, loadTables, loadOrderSummary]);

  useEffect(() => { loadTables(); }, [loadTables]);

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    loadOrderSummary(table.id);
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, isBlinking: false } : t));
  };

  const handleConfirmItem = async (orderDetailId, quantity) => {
    try {
      await confirmOrderItem(orderDetailId, quantity);
      message.success('Đã xác nhận món!');

      if (selectedTable) {
        if (selectedTable.status?.toLowerCase() === 'empty') {
          await updateTable({
            id: selectedTable.id,
            areaId: selectedTable.areaId,
            name: selectedTable.name,
            status: 'Occupied',
            isActive: selectedTable.isActive ?? true,
          });
          loadTables();
        }
        loadOrderSummary(selectedTable.id);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Xác nhận thất bại');
    }
  };

  const handleRejectItem = async (orderDetailId, reason) => {
    try {
      await rejectOrderItem(orderDetailId, reason);
      message.success('Đã từ chối món!');
      if (selectedTable) loadOrderSummary(selectedTable.id);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Từ chối thất bại');
    }
  };

  const handleServeItem = async (orderDetailId) => {
    try {
      await updateCookingStatus(orderDetailId, 'Served');
      message.success('Đã phục vụ!');
      if (selectedTable) loadOrderSummary(selectedTable.id);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  return (
    <div className="tablemap-page">
      <div className="tablemap-left-col">
        <div className="tablemap-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '15px' }}>
            <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>Sơ đồ Bàn</h2>
            {isWaiterMode && (
              <>
                <Button 
                  type="primary"
                  icon={<FireOutlined />}
                  style={{ backgroundColor: '#f5222d', borderColor: '#f5222d', fontWeight: 'bold' }}
                  onClick={() => setIsRestockModalVisible(true)}
                >
                  Yêu cầu Bếp
                </Button>
                <Button 
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 'bold' }}
                  onClick={() => setIsInternalPickupModalVisible(true)}
                >
                  Nhận đồ nội bộ
                </Button>
              </>
            )}
            {!currentBranchId && branches.length > 1 && (
              <Select
                style={{ width: 200 }}
                value={selectedBranch}
                onChange={val => setSelectedBranch(val)}
                placeholder="Chọn chi nhánh"
              >
                {branches.map(b => (
                  <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                ))}
              </Select>
            )}
          </div>
          <div className="tablemap-area-tabs">
            <button
              className={`tablemap-tab ${selectedArea === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedArea('all')}
            >
              Tất cả
            </button>
            {areas.map((area) => (
              <button
                key={area.id}
                className={`tablemap-tab ${selectedArea === area.id ? 'active' : ''}`}
                onClick={() => setSelectedArea(area.id)}
              >
                {area.name}
              </button>
            ))}
          </div>
        </div>

        {loadingTables ? (
          <div className="tablemap-loading-full">
            <Spin size="large" />
            <p>Đang tải sơ đồ bàn...</p>
          </div>
        ) : (
          <div className="tablemap-grid">
            {tables.map(table => {
              const cfg = getStatusConfig(table.status);
              const isSelected = selectedTable?.id === table.id;

              const badgeCount = (table.pendingCount || 0) + (table.readyCount || 0);
              const hasAlert = badgeCount > 0;

              return (
                <div
                  key={table.id}
                  className={`tablemap-card ${isSelected ? 'selected' : ''} ${hasAlert ? 'has-alert' : ''} ${table.isBlinking ? 'blinking' : ''}`}
                  style={{
                    borderColor: cfg.border,
                    backgroundColor: cfg.bg,
                    color: cfg.textColor
                  }}
                  onClick={() => handleSelectTable(table)}
                >
                  <div className="tablemap-card-name">{table.name}</div>
                  <div className="tablemap-card-status">
                    <span className="dot" style={{ backgroundColor: cfg.dotColor }}></span>
                    {cfg.label}
                  </div>

                  {hasAlert && (
                    <div className="tablemap-card-badge">
                      {badgeCount}
                    </div>
                  )}
                </div>
              );
            })}

            {tables.length === 0 && (
              <div className="tablemap-empty">
                Không có bàn nào trong khu vực này.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="tablemap-right-col">
        {selectedTable ? (
          <TableDetailPanel
            branchId={selectedBranch}
            table={selectedTable}
            summary={orderSummary}
            loading={loadingSummary}
            onConfirm={handleConfirmItem}
            onReject={handleRejectItem}
            onServe={handleServeItem}
            tables={tables}
            isPosHub={isPosHub}
            isWaiterMode={isWaiterMode}
            onPaymentSuccess={(tableId) => {
              loadTables();
              loadOrderSummary(tableId);
            }}
          />
        ) : (
          <WaiterActionFeed tables={tables} onSelectTable={handleSelectTable} />
        )}
      </div>
      
      <RequestRestockModal 
        visible={isRestockModalVisible} 
        onClose={() => setIsRestockModalVisible(false)} 
        branchId={selectedBranch}
      />
      <InternalPickupModal 
        visible={isInternalPickupModalVisible} 
        onClose={() => setIsInternalPickupModalVisible(false)} 
        branchId={selectedBranch}
      />
    </div>
  );
};

export default TableMapPage;
