import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Input,
  Select,
  Table,
  DatePicker,
  Dropdown,
  Tooltip,
  message,
  Popconfirm,
  Modal,
  Tag,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { searchBranches, deleteBranch, updateBranch } from "../api/branchApi";
import { getBranchDashboardStats } from "../api/dashboardApi";
import "../styles/BranchPage.css";
import CreateUpdateBranchFormPopup from "../PopUp/CreateUpdateBranchFormPopup";
import { getMainChain } from "../api/chainApi";

const { RangePicker } = DatePicker;

const formatCurrency = (value) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const BranchPage = () => {
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [searchKeyword, setSearchKeyword] = useState("");
  // const [filterType, setFilterType] = useState(undefined);
  const [sortBy, setSortBy] = useState("Id");
  const [sortDesc, setSortDesc] = useState(false);

  const [dateRange, setDateRange] = useState("thisMonth");
  const [customDates, setCustomDates] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const [openModal, setOpenModal] = useState(false);
  const [editingBranchObject, setEditingBranchObject] = useState(null);

  const [mainChainId, setMainChainId] = useState(null);

  const [stats, setStats] = useState({ revenue: 0, expenses: 0, profit: 0 });
  // const [loadingStats, setLoadingStats] = useState(false);
  const [, setLoadingStats] = useState(false);

  //====================================================================================================================Fetch Data
  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        Keyword: searchKeyword || undefined,
        // Type: filterType || undefined,
        SortBy: sortBy,
        Desc: sortDesc,
        Page: currentPage,
        PageSize: pageSize,
      };

      const res = await searchBranches(params);
      const data = res.data || [];
      setBranches(data);

      if (data.length < pageSize) {
        setTotalItems((currentPage - 1) * pageSize + data.length);
      } else {
        setTotalItems(currentPage * pageSize + 10);
      }
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi lấy thông tin danh sách chi nhánh.");
    } finally {
      setLoading(false);
    }
  }, [
    searchKeyword,
    // filterType,
    sortBy,
    sortDesc,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    const loadMainChain = async () => {
      try {
        const res = await getMainChain();
        setMainChainId(res.data.id);
      } catch (err) {
        console.error(err);
        message.error("Không tải được thông tin chi nhánh chính");
      }
    };

    loadMainChain();
  }, []);

  // Fetch financial stats from Backend dynamically
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      let startStr = null;
      let endStr = null;
      if (
        dateRange === "custom" &&
        customDates &&
        customDates[0] &&
        customDates[1]
      ) {
        startStr = customDates[0].toISOString();
        endStr = customDates[1].toISOString();
      }
      const res = await getBranchDashboardStats(dateRange, startStr, endStr);
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải số liệu thống kê:", err);
    } finally {
      setLoadingStats(false);
    }
  }, [dateRange, customDates]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats();
  }, [loadStats]);

  const chartData = useMemo(() => {
    const total = stats.revenue + stats.expenses + stats.profit;
    const items = [
      {
        key: "revenue",
        label: "Doanh thu",
        value: stats.revenue,
        color: "#1890ff",
        className: "revenue",
      },
      {
        key: "expenses",
        label: "Chi phí",
        value: stats.expenses,
        color: "#ff4d4f",
        className: "expenses",
      },
      {
        key: "profit",
        label: "Lợi nhuận",
        value: stats.profit,
        color: "#52c41a",
        className: "profit",
      },
    ];

    let accumulatedPercent = 0;
    const circumference = 314.159;

    return items.map((item) => {
      const percent = total > 0 ? (item.value / total) * 100 : 0;
      const sliceLength = (percent * circumference) / 100;
      const strokeDasharray = `${sliceLength} ${circumference - sliceLength}`;
      const strokeDashoffset = `${circumference - (accumulatedPercent * circumference) / 100}`;
      accumulatedPercent += percent;
      return {
        ...item,
        percent,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [stats]);

  //===================================================================================================================Filter data
  const handleSearch = (e) => {
    setSearchKeyword(e.target.value);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    loadBranches();
    message.success("Làm mới thành công");
  };

  // const handleTableChange = (pagination, filters, sorter) => {
  //   setCurrentPage(pagination.current);
  //   setPageSize(pagination.pageSize);
  //   if (sorter.field) {
  //     setSortBy(sorter.field === "name" ? "Name" : "Id");
  //     setSortDesc(sorter.order === "descend");
  //   }
  // };

  const handleTableChange = (pagination, filters, sorter) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);

    if (sorter.field) {
      const fieldMap = {
        id: "Id",
        name: "Name",
        createdAt: "CreatedAt",
        openTime: "OpenTime",
        closeTime: "CloseTime",
        addressName: "NewAddressName",
        managerName: "ManagerName",
      };

      if (sorter.order) {
        setSortBy(fieldMap[sorter.field] || "Id");
        setSortDesc(sorter.order === "descend");
      } else {
        setSortBy("Id");
        setSortDesc(false);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBranch(id);

      message.success(
        "Chi nhánh đã được chuyển sang trạng thái Ngừng kinh doanh",
      );

      loadBranches();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message ?? "Xóa thất bại");
    }
  };

  const handleToggleStatus = async (record) => {
    if (record.isDeleted || record.status === "Ngừng kinh doanh") {
      message.warning(
        "Chi nhánh đã ngừng kinh doanh, liên hệ admin để thao tác mở chi nhánh.",
      );
      return;
    }

    const nextStatus = record.status === "Tạm dừng" ? "Hoạt động" : "Tạm dừng";
    try {
      await updateBranch({
        id: record.id,
        name: record.name,
        type: record.type || "Main",
        openTime: record.openTime,
        closeTime: record.closeTime,
        status: nextStatus,
      });
      message.success(
        `Đã chuyển trạng thái chi nhánh "${record.name}" sang "${nextStatus}"`,
      );
      loadBranches();
    } catch (err) {
      console.error(err);
      message.error(
        err.response?.data?.message ?? "Chuyển trạng thái thất bại",
      );
    }
  };

  const sortedBranches = useMemo(() => {
    const statusPriority = {
      "Hoạt động": 1,
      "Tạm dừng": 2,
      "Ngừng kinh doanh": 3,
    };

    return [...branches].sort((a, b) => {
      const statusA = a.isDeleted
        ? "Ngừng kinh doanh"
        : a.status || "Hoạt động";
      const statusB = b.isDeleted
        ? "Ngừng kinh doanh"
        : b.status || "Hoạt động";

      const prioA = statusPriority[statusA] || 1;
      const prioB = statusPriority[statusB] || 1;

      if (prioA !== prioB) {
        return prioA - prioB;
      }
      return (a.id || 0) - (b.id || 0);
    });
  }, [branches]);

  //====================================================================================================================data fomat
  const columns = [
    {
      title: "Tên chi nhánh",
      dataIndex: "name",
      key: "name",
      sorter: true,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Địa chỉ",
      dataIndex: "newAddressName",
      key: "newAddressName",
      sorter: true,
      render: (text, record) => {
        const fullAddr = text || record.oldAddressName || "Chưa có địa chỉ";
        return <span>{fullAddr}</span>;
      },
    },
    {
      title: "Giờ mở cửa",
      dataIndex: "openTime",
      key: "openTime",
      sorter: true,
      render: (text) => (
        <span className="branch-time-tag">{text?.slice(0, 5)}</span>
      ),
    },
    {
      title: "Giờ đóng cửa",
      dataIndex: "closeTime",
      key: "closeTime",
      sorter: true,
      render: (text) => (
        <span className="branch-time-tag">{text?.slice(0, 5)}</span>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: true,
      render: (text) => dayjs(text).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Quản lý",
      dataIndex: "managerName",
      key: "managerName",
      sorter: true,
      render: (text) =>
        text || <span style={{ color: "#aaa" }}>Chưa phân công</span>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      align: "center",
      width: 140,
      render: (_, record) => {
        if (record.isDeleted || record.status === "Ngừng kinh doanh") {
          return (
            <Tag color="error" style={{ fontWeight: 600 }}>
              Ngừng kinh doanh
            </Tag>
          );
        }
        if (record.status === "Tạm dừng") {
          return (
            <Tag color="warning" style={{ fontWeight: 600 }}>
              Tạm dừng
            </Tag>
          );
        }
        return (
          <Tag color="success" style={{ fontWeight: 600 }}>
            Hoạt động
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      align: "center",
      width: 120,
      render: (_, record) => {
        const isClosed =
          record.isDeleted || record.status === "Ngừng kinh doanh";
        const isPaused = record.status === "Tạm dừng";

        const ActionsMenu = (
          <div className="ant-dropdown-menu" style={{ padding: 4 }}>
            {!isClosed ? (
              <>
                <div className="ant-dropdown-menu-item">
                  <Button
                    type="text"
                    style={{ width: "100%", textAlign: "left" }}
                    onClick={() => {
                      setEditingBranchObject(record);
                      setOpenModal(true);
                    }}
                  >
                    Sửa thông tin
                  </Button>
                </div>

                <div className="ant-dropdown-menu-item">
                  <Button
                    type="text"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      color: isPaused ? "#16a34a" : "#fa8c16",
                    }}
                    onClick={() => handleToggleStatus(record)}
                  >
                    {isPaused ? "Hoạt động" : "Tạm dừng"}
                  </Button>
                </div>

                <div className="ant-dropdown-menu-item">
                  <Popconfirm
                    title="Xác nhận xóa (ngừng hoạt động) chi nhánh?"
                    okText="Tiếp tục"
                    cancelText="Hủy"
                    onConfirm={() => {
                      Modal.confirm({
                        title:
                          "Xác nhận? (Hệ thống sẽ khóa chi nhánh khỏi việc các thao tác)",
                        content: (
                          <div>
                            <div>
                              Bạn sắp chuyển chi nhánh{" "}
                              <strong>"{record.name}"</strong> sang trạng thái{" "}
                              <strong>Ngừng kinh doanh</strong>.
                            </div>
                            <div
                              style={{
                                marginTop: 8,
                                color: "#ff4d4f",
                                fontWeight: 700,
                              }}
                            >
                              ⚠️ Dữ liệu Chi nhánh vẫn sẽ được lưu trữ (liên hệ
                              chủ sở hữu để mở lại) ⚠️
                            </div>
                          </div>
                        ),
                        okText: "Xóa",
                        cancelText: "Hủy",
                        okType: "danger",
                        onOk: () => handleDelete(record.id),
                      });
                    }}
                  >
                    <Button
                      danger
                      type="text"
                      style={{ width: "100%", textAlign: "left" }}
                    >
                      Xóa
                    </Button>
                  </Popconfirm>
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: "8px 12px",
                  color: "#94a3b8",
                  fontSize: 12,
                  fontStyle: "italic",
                }}
              >
                Đã ngừng kinh doanh
              </div>
            )}
          </div>
        );

        return (
          <Dropdown popupRender={() => ActionsMenu} trigger={["click"]}>
            <span className="branch-action-btn">
              <MoreOutlined style={{ fontSize: 18 }} />
            </span>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="branch-page-container">
      {/*==========================================================================================================dashboard div*/}
      <div className="branch-dashboard-card">
        {/*=====================================================================================================dashboard header*/}
        <div className="branch-dashboard-header">
          <h2 className="branch-dashboard-title">
            Thống Kê Hoạt Động Hệ Thống
          </h2>
          <div className="branch-dashboard-filters">
            <Select
              value={dateRange}
              onChange={(value) => setDateRange(value)}
              style={{ width: 160 }}
            >
              <Select.Option value="7days">7 ngày gần đây</Select.Option>
              <Select.Option value="thisMonth">Tháng này</Select.Option>
              <Select.Option value="lastMonth">Tháng trước</Select.Option>
              <Select.Option value="thisYear">Năm nay</Select.Option>
              <Select.Option value="lastYear">Năm ngoái</Select.Option>
              <Select.Option value="custom">Thời gian khác</Select.Option>
            </Select>

            {dateRange === "custom" && (
              <RangePicker
                onChange={(dates) => setCustomDates(dates)}
                format="DD/MM/YYYY"
              />
            )}
          </div>
        </div>

        {/*============================================================================================================chart div*/}
        <div className="branch-dashboard-body">
          {/* Chart div */}
          <div className="branch-chart-wrapper">
            {/* Pie Chart */}
            <svg viewBox="0 0 220 220" className="branch-svg-chart">
              <circle
                cx="110"
                cy="110"
                r="50"
                fill="none"
                stroke="#f0f0f0"
                strokeWidth="32"
              />
              {chartData.map((slice) => {
                const isHighlighted = hoveredSlice?.key === slice.key;
                const isDimmed = hoveredSlice && hoveredSlice.key !== slice.key;
                return (
                  <circle
                    key={slice.key}
                    cx="110"
                    cy="110"
                    r="50"
                    className={`branch-svg-slice ${slice.className} ${isHighlighted ? "active" : ""} ${isDimmed ? "dimmed" : ""}`}
                    stroke={slice.color}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    onMouseEnter={() => setHoveredSlice(slice)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                );
              })}
            </svg>

            {/* Tổng số chi nhánh hiển thị dưới biểu đồ tròn */}
            <div className="branch-total-summary">
              Tổng số chi nhánh:{" "}
              <span className="branch-total-badge">{branches.length}</span>
            </div>

            {/* Legend */}
            <div className="branch-chart-legend">
              {chartData.map((slice) => {
                const isHighlighted = hoveredSlice?.key === slice.key;
                const isDimmed = hoveredSlice && hoveredSlice.key !== slice.key;
                return (
                  <div
                    key={slice.key}
                    className={`branch-legend-item ${isHighlighted ? "active" : ""} ${isDimmed ? "dimmed" : ""}`}
                    onMouseEnter={() => setHoveredSlice(slice)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    <span className={`branch-legend-dot ${slice.className}`} />
                    <span>
                      {slice.label} ({Math.round(slice.percent)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* report div (Dạng dọc: label trái, value phải để chống tràn) */}
          <div className="branch-stats-grid">
            <div
              className={`branch-stat-card revenue ${hoveredSlice?.key === "revenue" ? "active" : ""} ${hoveredSlice && hoveredSlice.key !== "revenue" ? "dimmed" : ""}`}
              onMouseEnter={() =>
                setHoveredSlice(chartData.find((s) => s.key === "revenue"))
              }
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div className="branch-stat-info">
                <span className="branch-stat-label">Tổng Doanh Thu</span>
                <span className="branch-stat-sub">
                  Ước tính từ hóa đơn thanh toán
                </span>
              </div>
              <span className="branch-stat-value">
                {formatCurrency(stats.revenue)}
              </span>
            </div>

            <div
              className={`branch-stat-card expenses ${hoveredSlice?.key === "expenses" ? "active" : ""} ${hoveredSlice && hoveredSlice.key !== "expenses" ? "dimmed" : ""}`}
              onMouseEnter={() =>
                setHoveredSlice(chartData.find((s) => s.key === "expenses"))
              }
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div className="branch-stat-info">
                <span className="branch-stat-label">Tổng Chi Phí</span>
                <span className="branch-stat-sub">
                  Nguyên vật liệu & vận hành
                </span>
              </div>
              <span className="branch-stat-value">
                {formatCurrency(stats.expenses)}
              </span>
            </div>

            <div
              className={`branch-stat-card profit ${hoveredSlice?.key === "profit" ? "active" : ""} ${hoveredSlice && hoveredSlice.key !== "profit" ? "dimmed" : ""}`}
              onMouseEnter={() =>
                setHoveredSlice(chartData.find((s) => s.key === "profit"))
              }
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div className="branch-stat-info">
                <span className="branch-stat-label">Tổng Lợi Nhuận</span>
                <span className="branch-stat-sub">
                  Doanh thu trừ đi chi phí
                </span>
              </div>
              <span className="branch-stat-value" style={{ color: "#52c41a" }}>
                {formatCurrency(stats.profit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/*===========================================================================================================table div*/}
      <div className="branch-list-card">
        {/* Toolbar */}
        <div className="branch-toolbar">
          <div className="branch-toolbar-left">
            <Input
              placeholder="Tìm kiếm chi nhánh..."
              prefix={<SearchOutlined style={{ color: "#aaa" }} />}
              value={searchKeyword}
              onChange={handleSearch}
              className="branch-search-input"
              allowClear
            />

            <Tooltip title="Làm mới dữ liệu">
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
            </Tooltip>
          </div>

          <div className="branch-toolbar-right">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{
                backgroundColor: "var(--color-primary)",
                borderColor: "var(--color-primary)",
              }}
              onClick={() => {
                setEditingBranchObject(null);
                setOpenModal(true);
              }}
            >
              Thêm Chi Nhánh
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="branch-table-wrapper">
          <Table
            dataSource={sortedBranches}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalItems,
              showSizeChanger: true,
              pageSizeOptions: ["10", "25", "50", "100"],
            }}
            onChange={handleTableChange}
            className="branch-custom-table"
            sticky
          />
        </div>

        <div>
          <CreateUpdateBranchFormPopup
            open={openModal}
            onClose={() => setOpenModal(false)}
            branchObject={editingBranchObject}
            mainChainId={mainChainId}
            onSuccess={loadBranches}
          />
        </div>
      </div>
    </div>
  );
};

export default BranchPage;
