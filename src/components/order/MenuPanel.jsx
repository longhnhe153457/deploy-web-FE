/**
 * MenuPanel — Panel danh sách món ăn (cột giữa)
 * Lấy dữ liệu trực tiếp từ BE qua API /api/Menu/{menuId}/products
 * Các tab danh mục được tạo động từ trường GroupName trả về từ DB
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { Spin, message } from 'antd';
import { getAllGroups, searchProductsOData } from '../../api/menuApi';
import { getBInventories } from '../../api/binventoryApi';
import { getMenuAvailableQuantities } from '../../api/orderApi';
import { getReusableLeftovers } from '../../api/leftoverApi';

const formatPrice = (price) =>
  Number(price).toLocaleString('vi-VN') + 'đ';

const REUSE_POLL_MS = 20000;

const MenuPanel = ({ onAddItem, canOrder, branchId, showReuseSuggestions = true, refreshTrigger = 0 }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([{ id: 'all', name: 'Tất cả' }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeGroup, setActiveGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [reusableLeftovers, setReusableLeftovers] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  const searchTimeout = useRef(null);

  /* ── Gợi ý dùng lại món thừa (Return, Processed, còn trong 30p) ───────────
     Chỉ dành cho nhân viên gọi món (OrderPage) — đây là gợi ý vận hành nội bộ
     bếp/phục vụ, KHÔNG được lộ ra màn hình khách tự gọi món (CustomerOrderPage). */
  useEffect(() => {
    if (!branchId || !showReuseSuggestions) return undefined;
    let cancelled = false;
    const fetchReusable = () => {
      getReusableLeftovers(branchId)
        .then((res) => { if (!cancelled) setReusableLeftovers(res.data || []); })
        .catch(() => { });
    };
    fetchReusable();
    const poll = setInterval(fetchReusable, REUSE_POLL_MS);
    return () => { cancelled = true; clearInterval(poll); };
  }, [branchId, showReuseSuggestions]);

  // Đếm ngược phút còn lại của từng gợi ý
  useEffect(() => {
    if (reusableLeftovers.length === 0) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, [reusableLeftovers.length]);

  const handleReuseClick = (item) => {
    if (!canOrder) return;
    const product = products.find((p) => p.id === item.productId);
    onAddItem({
      id: item.productId,
      name: item.productName,
      price: product ? Number(product.sellPrice) : 0,
      desc: product?.description || '',
      category: product?.groupName || 'Món thừa',
      qty: item.quantity,
      reuseLeftoverId: item.id,
      reuseTableName: item.tableName,
    });
    // Bỏ khỏi danh sách gợi ý ngay để tránh bấm dùng lại 2 lần trước khi gọi món;
    // nếu không xác nhận gọi món, lần poll kế tiếp sẽ tự hiện lại (BE vẫn coi là chưa dùng).
    setReusableLeftovers((prev) => prev.filter((l) => l.id !== item.id));
  };

  /* ── Fetch sản phẩm từ API ─────────────────────────────────────────────── */
  /* ── Lấy danh sách danh mục lúc ban đầu ────────────────────────────────── */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getAllGroups(branchId);
        if (res.data) {
          const dynamic = res.data.map(g => ({
            id: String(g.id),
            name: g.name
          }));
          setCategories([{ id: 'all', name: 'Tất cả' }, ...dynamic]);
        }
      } catch (err) {
        console.error('Lỗi tải danh mục:', err);
      }
    };
    fetchCategories();
  }, [branchId]);

  const fetchProducts = async (searchText, groupId) => {
    setLoading(true);
    setError(null);
    try {
      if (branchId) {
        // Lấy theo BInventory chi nhánh, truyền mode = 0 để lấy TẤT CẢ (bao gồm cả Processed)
        const res = await getBInventories(branchId, '', '', 0);
        const rawBInventory = Array.isArray(res) ? res : (res?.Items || []);
        if (Array.isArray(rawBInventory)) {
          const sellable = rawBInventory.filter(
            p => p.type === 'Processed' || p.type === 'Manufactured' || p.type === 'Regular'
          );
          let mappedProducts = sellable.map(p => ({
            id: p.productId, // ProductId
            bInventoryId: p.bInventoryId,
            name: p.name,
            sellPrice: p.sellPrice || 0,
            originalPrice: p.originalPrice || null,
            description: p.description || '',
            groupId: null,
            groupName: p.groupName || 'Khác',
            imageLink: p.imageLink || ''
          }));

          // Lọc tìm kiếm
          if (searchText.trim()) {
            const q = searchText.toLowerCase().trim();
            mappedProducts = mappedProducts.filter(
              p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
            );
          }

          // Filter by category
          if (groupId && groupId !== 'all') {
            const selectedCat = categories.find(c => c.id === String(groupId));
            if (selectedCat) {
              const catName = selectedCat.name.toLowerCase();
              mappedProducts = mappedProducts.filter(
                p => p.groupName.toLowerCase() === catName
              );
            }
          }

          // Gán mặc định null để không hiển thị 'Không giới hạn' giả trong lúc chờ API
          const initialProducts = mappedProducts.map(p => ({ ...p, availableQuantity: null }));
          setProducts(initialProducts);

          // Fetch Available Quantities chạy ngầm để không block UI (hiển thị UI ngay)
          // Sử dụng hàm bulk để tính toán một lần, tránh N+1 queries
          const productIds = initialProducts.map(p => p.id);
          if (productIds.length > 0) {
            getMenuAvailableQuantities(branchId).then(qtyRes => {
              const qtyMap = qtyRes.data || {};
              setProducts(currentProducts => currentProducts.map(p => ({
                ...p,
                availableQuantity: qtyMap[p.id] !== undefined ? qtyMap[p.id] : 999999
              })));
            }).catch(qtyErr => {
              console.error('Lỗi lấy số lượng khả dụng chạy ngầm:', qtyErr);
            });
          }
        } else {
          setProducts([]);
        }
      } else {
        // Fallback sang OData cũ nếu chưa xác định được branchId
        const res = await searchProductsOData(searchText, groupId);
        if (res && res.value) {
          const mappedProducts = res.value.map(p => ({
            id: p.Id,
            name: p.Name,
            sellPrice: p.SellPrice,
            description: p.Description,
            groupId: p.GroupId,
            groupName: p.Group ? p.Group.Name : 'Khác',
            imageLink: p.Image ? p.Image.ImageLink : ''
          }));
          setProducts(mappedProducts);
        } else {
          setProducts([]);
        }
      }
    } catch (err) {
      console.error('Lỗi tải thực đơn:', err);
      setError('Không thể tải thực đơn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(() => {
      fetchProducts(search, activeGroup);
    }, 500);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search, activeGroup, branchId, categories, refreshTrigger]);

  /* ── Loading state ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <section className="pos-menu-panel">
        <div className="pos-menu-loading">
          <Spin size="large" tip="Đang tải thực đơn..." />
        </div>
      </section>
    );
  }

  /* ── Error state ───────────────────────────────────────────────────────── */
  if (error) {
    return (
      <section className="pos-menu-panel">
        <div className="pos-menu-error">
          <span></span>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pos-menu-panel">
      {/* Search */}
      <div className="pos-menu-header">
        <div className="pos-menu-search-wrap">
          <span className="pos-menu-search-icon"></span>
          <input
            className="pos-menu-search"
            placeholder="Tìm món ăn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="pos-menu-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <span className="pos-menu-count">{products.length} món</span>
      </div>

      {/* Gợi ý dùng lại món thừa — món đã nấu xong bị trả trong 30p gần nhất.
          Chỉ dành cho nhân viên, không hiện ở màn hình khách tự gọi món. */}
      {showReuseSuggestions && reusableLeftovers.length > 0 && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 8,
          padding: '8px 10px',
          margin: '0 12px 10px',
        }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: '#b45309', marginBottom: 6 }}>
            Gợi ý dùng lại món thừa (còn trong 30 phút)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {reusableLeftovers.map((item) => {
              const minutesLeft = Math.max(0, Math.round((new Date(item.expiresAt).getTime() - now) / 60000));
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!canOrder}
                  onClick={() => handleReuseClick(item)}
                  title={canOrder ? `Dùng lại ${item.productName} thay vì gọi bếp làm mới` : 'Chọn bàn Có khách để gọi món'}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 2,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #f59e0b',
                    background: canOrder ? '#fff' : '#f3f4f6',
                    cursor: canOrder ? 'pointer' : 'not-allowed',
                    opacity: canOrder ? 1 : 0.6,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 12.5 }}>
                    {item.productName} x{item.quantity}
                  </span>
                  <span style={{ fontSize: 11, color: '#92400e' }}>
                    {item.tableName ? `Từ ${item.tableName} · ` : ''}còn {minutesLeft}p — Dùng lại
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Tabs — tạo động từ DB */}
      <div className="pos-menu-cats">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`pos-cat-btn ${activeGroup === cat.id ? 'pos-cat-btn--active' : ''}`}
            onClick={() => setActiveGroup(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Item Grid — wrapped to allow overlay */}
      <div className="pos-menu-grid-wrap">
        <div className="pos-menu-grid">
          {products.map((item) => (
            <button
              key={item.id}
              className={`pos-menu-item ${canOrder && item.availableQuantity !== 0 ? 'pos-menu-item--clickable' : ''}`}
              onClick={() => canOrder && item.availableQuantity !== 0 && onAddItem({
                id: item.id,
                name: item.name,
                price: Number(item.sellPrice),
                desc: item.description,
                category: item.groupName,
              })}
              disabled={!canOrder || item.availableQuantity === 0}
              title={!canOrder ? 'Chọn bàn Có khách để gọi món' : (item.availableQuantity === 0 ? 'Hết hàng' : `Thêm ${item.name}`)}
              style={{ opacity: item.availableQuantity === 0 ? 0.6 : 1, position: 'relative' }}
            >
              <div style={{
                height: '70px',
                width: '70px',
                minWidth: '70px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #f3f4f6',
                background: '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                position: 'relative'
              }}>
                {item.originalPrice && item.originalPrice > item.sellPrice && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#ea580c',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 4px',
                    borderBottomLeftRadius: '6px',
                    zIndex: 1
                  }}>
                    -{Math.round(((item.originalPrice - item.sellPrice) / item.originalPrice) * 100)}%
                  </div>
                )}
                {item.imageLink ? (
                  <img
                    src={item.imageLink}
                    alt={item.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80';
                    }}
                  />
                ) : (
                  <img
                    src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80"
                    alt={item.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
              <div className="pos-menu-item-info">
                <div className="pos-menu-item-name">{item.name}</div>
                <div className="pos-menu-item-desc">{item.description}</div>
                {item.availableQuantity !== null && (
                  <div style={{ fontSize: '11px', color: item.availableQuantity > 0 ? '#10b981' : '#ef4444', fontWeight: '500', marginTop: '2px', marginBottom: '2px' }}>
                    {item.availableQuantity >= 999999 ? 'Không giới hạn' : (item.availableQuantity > 0 ? `Còn lại: ${item.availableQuantity}` : 'Hết hàng')}
                  </div>
                )}
                <div className="pos-menu-item-tag">{item.groupName}</div>
              </div>
              <div className="pos-menu-item-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                {item.originalPrice && item.originalPrice > item.sellPrice && (
                  <span style={{ fontSize: '11px', textDecoration: 'line-through', color: '#9ca3af', fontWeight: 'normal', marginBottom: '-2px' }}>
                    {formatPrice(item.originalPrice)}
                  </span>
                )}
                <span style={{ fontSize: '14px', fontWeight: '800', color: item.originalPrice && item.originalPrice > item.sellPrice ? '#ea580c' : '#0f172a' }}>
                  {formatPrice(item.sellPrice)}
                </span>
              </div>
              <div className="pos-menu-item-add">+</div>
            </button>
          ))}

          {products.length === 0 && (
            <div className="pos-menu-no-result">
              <span></span>
              <p>Không tìm thấy món phù hợp</p>
            </div>
          )}
        </div>

        {/* Overlay khi bàn không phải Có khách */}
        {!canOrder && (
          <div className="pos-menu-overlay">
            <div className="pos-menu-overlay-card">
              <div className="pos-menu-overlay-icon">🪑</div>
              <p className="pos-menu-overlay-title">Chưa thể gọi món</p>
              <p className="pos-menu-overlay-sub">
                Chỉ có thể order khi bàn ở trạng thái<br />
                <strong style={{ color: '#f97316' }}>Có khách</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MenuPanel;
