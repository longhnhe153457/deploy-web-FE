import { Tag } from "antd";
import {
  FireOutlined,
  AppstoreOutlined,
  CoffeeOutlined,
  SmileOutlined,
  CalendarOutlined,
} from "@ant-design/icons";

const defaultCategories = [
  { id: "all", name: "Tất cả", icon: <AppstoreOutlined /> },
  { id: "food", name: "Đồ ăn", icon: <FireOutlined /> },
  { id: "drink", name: "Đồ uống", icon: <CoffeeOutlined /> },
  { id: "dessert", name: "Tráng miệng", icon: <SmileOutlined /> },
  { id: "new", name: "Món mới", icon: <CalendarOutlined />, isNew: true },
];

const CustomerMenuFilter = ({
  categories = defaultCategories,
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <div className="customer-menu-filter">
      <div className="filter-pill-container">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              className={`filter-pill ${isActive ? "active" : ""} ${cat.isNew ? "pill-new" : ""}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              {cat.icon && <span className="pill-icon">{cat.icon}</span>}
              <span className="pill-text">{cat.name}</span>
              {cat.isNew && <Tag color="error" className="new-badge">Mới</Tag>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerMenuFilter;
