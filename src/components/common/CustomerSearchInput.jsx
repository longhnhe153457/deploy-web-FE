import React, { useState, useRef, useMemo } from 'react';
import { AutoComplete, Spin } from 'antd';
import { searchCustomersOData } from '../../api/reservationApi';

const CustomerSearchInput = ({ value, onChange, onSelectCustomer, placeholder = "0912345678", disabled = false, style, ...rest }) => {
  const [options, setOptions] = useState([]);
  const [fetching, setFetching] = useState(false);

  const searchTimeout = useRef(null);

  const fetchOptions = useMemo(() => {
    return async (searchText) => {
      if (!searchText) {
        setOptions([]);
        return;
      }
      setFetching(true);
      try {
        const res = await searchCustomersOData(searchText);
        if (res && res.value) {
          setOptions(res.value.map(c => ({
            value: c.Phone,
            label: `${c.Phone} - ${c.Name}`,
            customer: { ...c, id: c.Id, name: c.Name, phone: c.Phone, point: c.Point }
          })));
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setFetching(false);
      }
    };
  }, []);

  const handleSearch = (searchText) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchOptions(searchText);
    }, 500);
  };

  const handleSelect = (val, option) => {
    if (onChange) onChange(val);
    if (onSelectCustomer) onSelectCustomer(option.customer);
  };

  const handleChange = (val) => {
    if (onChange) onChange(val);
  };

  return (
    <AutoComplete
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      onChange={handleChange}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      filterOption={false}
      {...rest}
    />
  );
};

export default CustomerSearchInput;
