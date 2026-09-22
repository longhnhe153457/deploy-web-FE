import { Input } from "antd";
import { SearchOutlined, CloseCircleOutlined } from "@ant-design/icons";

const CustomerSearchBar = ({ value, onChange, onClear }) => {
  return (
    <div className="search-bar-wrapper">
      <Input
        prefix={<SearchOutlined className="search-icon" />}
        suffix={
          value ? (
            <CloseCircleOutlined
              className="clear-icon"
              onClick={onClear}
            />
          ) : null
        }
        placeholder="Tìm kiếm món ăn yêu thích..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        allowClear={false}
        className="customer-search-input"
        size="large"
      />
    </div>
  );
};

export default CustomerSearchBar;
