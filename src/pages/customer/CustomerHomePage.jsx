import { useState, useEffect, useMemo, useCallback } from "react";
import { Pagination, Select } from "antd";
import {
  AppstoreOutlined,
  CoffeeOutlined,
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import { getMainChain } from "../../api/chainApi";
import { getAllBranches } from "../../api/branchApi";
import { getAllMenus } from "../../api/menuApi";
import { getBInventories } from "../../api/binventoryApi";
import configApi from "../../api/configApi";

import CustomerHeader from "../../components/customer/CustomerHeader";
import CustomerHeroBanner from "../../components/customer/CustomerHeroBanner";
import CustomerSearchBar from "../../components/customer/CustomerSearchBar";
import CustomerMenuFilter from "../../components/customer/CustomerMenuFilter";
import CustomerMenuSort from "../../components/customer/CustomerMenuSort";
import CustomerMenuGrid from "../../components/customer/CustomerMenuGrid";
import CustomerBranchSection from "../../components/customer/CustomerBranchSection";
import CustomerFooter from "../../components/customer/CustomerFooter";
import ProductDetailModal from "../../components/customer/ProductDetailModal";
import FloatingChatWidget from "../../components/chat/FloatingChatWidget";
import ToTop from "../../components/ToTop";

import "../../styles/CustomerHomePage.css";

//=======================================================================================================================Fake Data
const MOCK_CHAIN = {
  id: 1,
  name: "Cửa hàng",
  logoImage: "",
  backgroundImage: "",
  openTime: "08:00:00",
  closeTime: "22:30:00",
  newAddressName: "Địa chỉ",
};

const currentDate = new Date();
const currentMonthIsoString = currentDate.toISOString();

const MOCK_PRODUCTS = [
  {
    id: 101,
    name: "Tên món ăn mẫu (Mock)",
    price: 100000,
    imageLink: "",
    groupName: "Món ăn",
    description: "Mô tả.",
    createdAt: currentMonthIsoString,
    isNew: true,
  },
];

const MOCK_BRANCHES = [
  {
    id: 1,
    name: "nhánh mẫu ",
    newAddressName: "Địa chỉ ",
    openTime: "08:00",
    closeTime: "22:30",
    phone: "0123456789",
    isMain: true,
  },
];

//==========================================================================================================new menu item in month
const isCreatedInCurrentMonth = (dateStr) => {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  } catch {
    return false;
  }
};

const CustomerHomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryBranchId = searchParams.get("branchId");
  const [activeBranchId, setActiveBranchId] = useState(null);

  const [chainInfo, setChainInfo] = useState(MOCK_CHAIN);
  const [branches, setBranches] = useState(MOCK_BRANCHES);
  const [products, setProducts] = useState(MOCK_PRODUCTS);

  const [, setLoadingChain] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [totalCount, setTotalCount] = useState(0);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dynamicCategories, setDynamicCategories] = useState([
    { id: "all", name: "Tất cả", icon: <AppstoreOutlined /> },
    { id: "new", name: "Món mới", icon: <CalendarOutlined />, isNew: true }
  ]);
  const [sortOption, setSortOption] = useState("default");

  const [activeSection, setActiveSection] = useState("hero");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [consultProductItem, setConsultProductItem] = useState(null);

  // Cấu hình thứ tự ưu tiên nhóm hàng và thực đơn
  const [catalogPriority, setCatalogPriority] = useState(() => {
    const saved = localStorage.getItem("catalog_priority");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return { groupOrder: [], menuOrder: [], groupNames: [], menuNames: [] };
  });

  useEffect(() => {
    const loadPriority = async () => {
      try {
        const res = await configApi.getCatalogPriority();
        if (res && (res.groupOrder?.length > 0 || res.groupNames?.length > 0)) {
          setCatalogPriority(res);
          localStorage.setItem("catalog_priority", JSON.stringify(res));
        }
      } catch (err) {
        console.warn("Dùng cấu hình catalog priority từ cache hoặc mặc định:", err.message);
      }
    };
    loadPriority();
  }, []);

  //=================================================================================================================== Fetch Data
  const fetchChain = useCallback(async () => {
    setLoadingChain(true);
    try {
      const res = await getMainChain();
      console.log("getMainChain response:", res.data);
      if (res.data) {
        setChainInfo((prev) => ({
          ...prev,
          ...res.data,
          backgroundImage: res.data.backgroundImage || prev.backgroundImage,
          logoImage: res.data.logoImage || prev.logoImage,
        }));
      }
    } catch (err) {
      console.error("fetchChain error detailed:", err);
      console.warn("Dùng dữ liệu Chain mặc định:", err.message);
    } finally {
      setLoadingChain(false);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const res = await getAllBranches();
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const activeList = res.data.filter(b => !b.isDeleted && b.status !== "Ngừng kinh doanh");
        setBranches(res.data);
        
        // Xác định chi nhánh mặc định
        if (queryBranchId) {
          setActiveBranchId(parseInt(queryBranchId, 10));
        } else if (activeList.length > 0) {
          setActiveBranchId(activeList[0].id);
        } else {
          setActiveBranchId(res.data[0].id);
        }
      }
    } catch (err) {
      console.warn("Dùng dữ liệu Branch mặc định:", err.message);
    } finally {
      setLoadingBranches(false);
    }
  }, [queryBranchId]);

  const fetchProducts = useCallback(
    async (searchText = "", catId = "all", pageIdx = 1, size = 8, branchId) => {
      const bid = branchId || activeBranchId;
      if (!bid) return;
      setLoadingMenu(true);
      try {
        // Tải danh sách BInventory của chi nhánh (truyền mode 0 để lấy TẤT CẢ các món, không bị lọc mất Processed)
        const rawBInventory = await getBInventories(bid, '', '', 0);
        
        if (Array.isArray(rawBInventory)) {
          // Lọc lấy các sản phẩm bán được (Processed, Manufactured, Regular)
          const sellableList = rawBInventory.filter(
            (b) => b.type === "Processed" || b.type === "Manufactured" || b.type === "Regular"
          );

          // Map sang định dạng sản phẩm của Menu
          const mapped = sellableList.map((item) => {
            const finalPrice = item.sellPrice || 0;
            const originalPrice = item.originalPrice || finalPrice;

            return {
              id: item.productId, // ProductId để order
              bInventoryId: item.bInventoryId,
              name: item.name,
              price: finalPrice,
              originalPrice: originalPrice > finalPrice ? originalPrice : null,
              imageLink: item.imageLink || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
              groupName: item.groupName || "Món ăn",
              description: item.description || "",
              isNew: item.createdAt ? isCreatedInCurrentMonth(item.createdAt) : false,
            };
          });

          // Helper lấy vị trí ưu tiên của nhóm hàng
          const getGroupPriority = (groupName, groupId) => {
            const groupOrder = catalogPriority?.groupOrder || [];
            const groupNames = catalogPriority?.groupNames || [];

            if (groupId && groupOrder.length > 0) {
              const idx = groupOrder.indexOf(groupId);
              if (idx !== -1) return idx;
            }
            if (groupName && groupNames.length > 0) {
              const idx = groupNames.findIndex(
                (name) => name.toLowerCase() === groupName.toLowerCase()
              );
              if (idx !== -1) return idx;
            }
            return 9999;
          };

          // Sắp xếp các món ăn theo thứ tự ưu tiên của nhóm hàng (món chính trước, món phụ sau)
          mapped.sort((a, b) => {
            const prioA = getGroupPriority(a.groupName, a.groupId);
            const prioB = getGroupPriority(b.groupName, b.groupId);
            if (prioA !== prioB) return prioA - prioB;
            return (a.name || "").localeCompare(b.name || "");
          });

          // Trích xuất danh mục động từ nhóm hàng của các sản phẩm thực tế và sắp xếp theo thứ tự ưu tiên
          const uniqueGroups = Array.from(new Set(mapped.map((p) => p.groupName).filter(Boolean)));
          uniqueGroups.sort((a, b) => {
            const prioA = getGroupPriority(a);
            const prioB = getGroupPriority(b);
            if (prioA !== prioB) return prioA - prioB;
            return a.localeCompare(b);
          });

          const catList = [{ id: "all", name: "Tất cả", icon: <AppstoreOutlined /> }];
          uniqueGroups.forEach((g) => {
            catList.push({
              id: g,
              name: g,
              icon: <CoffeeOutlined />,
            });
          });
          catList.push({
            id: "new",
            name: "Món mới",
            icon: <CalendarOutlined />,
            isNew: true,
          });
          setDynamicCategories(catList);

          // Áp dụng bộ lọc tìm kiếm (searchText)
          let filtered = mapped;
          if (searchText.trim()) {
            const q = searchText.toLowerCase().trim();
            filtered = filtered.filter(
              (p) =>
                (p.name || "").toLowerCase().includes(q) ||
                (p.groupName || "").toLowerCase().includes(q)
            );
          }

          // Áp dụng bộ lọc danh mục (catId)
          if (catId && catId !== "all" && catId !== "new") {
            filtered = filtered.filter((p) => p.groupName === catId);
          } else if (catId === "new") {
            filtered = filtered.filter((p) => p.isNew);
          }

          setTotalCount(filtered.length);

          // Phân trang ở client
          const startIndex = (pageIdx - 1) * size;
          const paginated = filtered.slice(startIndex, startIndex + size);
          setProducts(paginated);
        } else {
          setProducts([]);
          setTotalCount(0);
        }
      } catch (err) {
        console.warn("Gọi API BInventory của chi nhánh lỗi:", err.message);
        setProducts([]);
        setTotalCount(0);
      } finally {
        setLoadingMenu(false);
      }
    },
    [activeBranchId, catalogPriority],
  );

  const fetchMenus = useCallback(async () => {
    try {
      const res = await getAllMenus();
      if (res.data && Array.isArray(res.data)) {
        setMenus(res.data);
        return res.data;
      }
    } catch (err) {
      console.warn("Lỗi lấy danh mục menu:", err.message);
    }
    return [];
  }, []);

  useEffect(() => {
    const initData = async () => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchChain();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchBranches();
    };
    initData();
  }, [fetchChain, fetchBranches]);

  useEffect(() => {
    if (activeBranchId) {
      const loadMenuData = async () => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        await fetchMenus();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchProducts(searchKeyword, selectedCategory, currentPage, pageSize, activeBranchId);
      };
      loadMenuData();
    }
  }, [activeBranchId, fetchMenus, fetchProducts, searchKeyword, selectedCategory, currentPage, pageSize]);

  //=================================================================================================================== filter data
  const handleBranchChange = (branchId) => {
    setActiveBranchId(branchId);
    setCurrentPage(1);
    setSelectedCategory("all");
    setSearchParams({ branchId: String(branchId) });
    fetchProducts(searchKeyword, "all", 1, pageSize, branchId);
  };

  const handleSearchChange = (val) => {
    setSearchKeyword(val);
    setCurrentPage(1);
    fetchProducts(val, selectedCategory, 1, pageSize, activeBranchId);
  };

  const handleSearchClear = () => {
    setSearchKeyword("");
    setCurrentPage(1);
    fetchProducts("", selectedCategory, 1, pageSize, activeBranchId);
  };

  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    setCurrentPage(1);
    fetchProducts(searchKeyword, catId, 1, pageSize, activeBranchId);
  };

  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
    fetchProducts(searchKeyword, selectedCategory, page, size, activeBranchId);
  };

  const [touchStartX, setTouchStartX] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    const totalPages = Math.ceil(totalCount / pageSize);

    if (diff > 60) {
      if (currentPage < totalPages) {
        handlePageChange(currentPage + 1, pageSize);
      }
    } else if (diff < -60) {
      if (currentPage > 1) {
        handlePageChange(currentPage - 1, pageSize);
      }
    }
  };

  const [mouseDownX, setMouseDownX] = useState(0);
  const [isMouseDownState, setIsMouseDownState] = useState(false);

  const handleMouseDown = (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    setIsMouseDownState(true);
    setMouseDownX(e.clientX);
  };

  const handleMouseUp = (e) => {
    if (!isMouseDownState) return;
    setIsMouseDownState(false);
    const diff = mouseDownX - e.clientX;
    const totalPages = Math.ceil(totalCount / pageSize);

    if (diff > 80) {
      if (currentPage < totalPages) {
        handlePageChange(currentPage + 1, pageSize);
      }
    } else if (diff < -80) {
      if (currentPage > 1) {
        handlePageChange(currentPage - 1, pageSize);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsMouseDownState(false);
  };

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase().trim();
      result = result.filter(
        (item) =>
          (item.name || "").toLowerCase().includes(q) ||
          (item.groupName || "").toLowerCase().includes(q),
      );
    }

    if (selectedCategory === "new") {
      result = result.filter(
        (item) =>
          item.isNew === true ||
          isCreatedInCurrentMonth(item.createdAt || item.CreatedAt),
      );
    }

    switch (sortOption) {
      case "price-asc":
        result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price-desc":
        result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "name-asc":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name-desc":
        result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      default:
        break;
    }

    return result;
  }, [products, searchKeyword, selectedCategory, sortOption]);

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -70;
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handleOpenDetailModal = (product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="customer-home-layout">
      <CustomerHeader
        chainInfo={chainInfo}
        activeSection={activeSection}
        onNavigate={scrollToSection}
      />

      <CustomerHeroBanner
        chainInfo={chainInfo}
        onExploreMenu={() => scrollToSection("menu")}
        onExploreBranches={() => scrollToSection("branches")}
      />

      <main id="menu" className="customer-menu-section">
        <div className="menu-container">
          <div className="menu-header-group">
            <span className="section-subtitle">Delicious Menu</span>
            <h2 className="section-title">Thực Đơn Đặc Sắc</h2>
            <div className="title-underline"></div>
          </div>

          <div className="menu-controls-bar">
            {/* Hàng 1: Bộ chọn chi nhánh, ô tìm kiếm và sắp xếp */}
            <div className="controls-top-row" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", width: "100%" }}>
              <div className="branch-menu-selector" style={{ minWidth: "220px", flex: "1 1 auto" }}>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", display: "block", marginBottom: "4px", fontWeight: 600 }}>Chi nhánh thực đơn:</span>
                <Select
                  style={{ width: "100%" }}
                  value={activeBranchId}
                  onChange={handleBranchChange}
                  placeholder="Chọn chi nhánh"
                  size="large"
                  options={branches.filter(b => !b.isDeleted && b.status !== "Ngừng kinh doanh").map(b => ({
                    label: b.name,
                    value: b.id
                  }))}
                />
              </div>

              <div className="search-bar-container" style={{ flex: "2 1 300px", minWidth: "260px" }}>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", display: "block", marginBottom: "4px", fontWeight: 600 }}>Tìm kiếm món ăn:</span>
                <CustomerSearchBar
                  value={searchKeyword}
                  onChange={handleSearchChange}
                  onClear={handleSearchClear}
                />
              </div>

              <div className="sort-container" style={{ flex: "1 1 180px", minWidth: "180px", display: "flex", justifyContent: "flex-end", alignSelf: "flex-end", marginBottom: "4px" }}>
                <CustomerMenuSort
                  value={sortOption}
                  onChange={(val) => setSortOption(val)}
                />
              </div>
            </div>

            {/* Đường phân cách nhẹ */}
            <div style={{ height: "1px", backgroundColor: "#f1f5f9", width: "100%", margin: "8px 0" }}></div>

            {/* Hàng 2: Bộ lọc danh mục (Cuộn ngang) */}
            <div className="controls-bottom-row" style={{ width: "100%" }}>
              <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", display: "block", marginBottom: "8px", fontWeight: 600 }}>Danh mục món ăn:</span>
              <CustomerMenuFilter
                categories={dynamicCategories}
                activeCategory={selectedCategory}
                onSelectCategory={handleCategorySelect}
              />
            </div>
          </div>

          <div
            className="menu-swiper-container"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: "grab" }}
          >
            {currentPage > 1 && (
              <button
                className="edge-nav-btn edge-left"
                onClick={() => handlePageChange(currentPage - 1, pageSize)}
                aria-label="Trang trước"
              >
                <LeftOutlined />
              </button>
            )}

            {currentPage < Math.ceil(totalCount / pageSize) && (
              <button
                className="edge-nav-btn edge-right"
                onClick={() => handlePageChange(currentPage + 1, pageSize)}
                aria-label="Trang sau"
              >
                <RightOutlined />
              </button>
            )}

            <CustomerMenuGrid
              products={filteredAndSortedProducts}
              loading={loadingMenu}
              onViewDetail={handleOpenDetailModal}
              onConsult={(product) => setConsultProductItem(product)}
            />
          </div>

          {totalCount > 0 && (
            <div className="menu-pagination-wrapper">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={totalCount}
                onChange={handlePageChange}
                showSizeChanger
                pageSizeOptions={["8", "20", "40", "100"]}
              />
            </div>
          )}
        </div>
      </main>

      <CustomerBranchSection
        branches={branches}
        loading={loadingBranches}
        chainInfo={chainInfo}
      />

      <CustomerFooter chainInfo={chainInfo} />

      <ProductDetailModal
        product={selectedProduct}
        open={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onConsult={(product) => setConsultProductItem(product)}
      />

      <FloatingChatWidget
        activeBranchId={activeBranchId}
        branches={branches}
        onSelectBranch={(branchId) => {
          setActiveBranchId(branchId);
          setSearchParams({ branchId: branchId });
        }}
        externalConsultationItem={consultProductItem}
        onClearExternalConsultation={() => setConsultProductItem(null)}
      />

      <ToTop />
    </div>
  );
};

export default CustomerHomePage;
