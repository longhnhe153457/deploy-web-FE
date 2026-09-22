import { Select } from "antd";
import { SortAscendingOutlined } from "@ant-design/icons";

const sortOptions = [
  { value: "default", label: "Mặc định" },
  { value: "price-asc", label: "Giá tăng dần" },
  { value: "price-desc", label: "Giá giảm dần" },
  { value: "name-asc", label: "Tên A - Z" },
  { value: "name-desc", label: "Tên Z - A" },
];

const CustomerMenuSort = ({ value, onChange }) => {
  return (
    <div className="sort-dropdown-wrapper">
      <span className="sort-label">
        <SortAscendingOutlined /> Sắp xếp:
      </span>
      <Select
        value={value}
        onChange={onChange}
        options={sortOptions}
        className="customer-sort-select"
        dropdownClassName="customer-sort-dropdown"
        size="large"
      />
    </div>
  );
};

export default CustomerMenuSort;
