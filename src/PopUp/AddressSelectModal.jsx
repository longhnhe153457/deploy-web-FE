import { useState, useEffect } from "react";
import { Modal, Select, Form, Button, Space, Typography, Spin, message } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import {
  getNewProvinces,
  getNewWards,
  getOldProvinces,
  getOldDistricts,
  getOldWards,
} from "../api/addressApi";

const { Text } = Typography;

/**
 * AddressSelectModal - Modal chọn địa chỉ dùng API Backend C# trả về ID chính xác của NewWard / OldWard
 * @param {boolean} open Trạng thái mở Modal
 * @param {function} onClose Callback khi đóng Modal
 * @param {function} onSelect Callback khi bấm Xác nhận: (wardId, fullAddressName) => void
 * @param {"new" | "old"} mode Mode "new" (Tỉnh -> Phường/Xã) hoặc "old" (Tỉnh -> Huyện -> Xã)
 * @param {string} title Tiêu đề Modal
 */
const AddressSelectModal = ({ open, onClose, onSelect, mode = "new", title }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // State lưu trữ dữ liệu từ Backend
  const [provinces, setProvinces] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [allWards, setAllWards] = useState([]);

  // State filtered cho dropdown
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [filteredWards, setFilteredWards] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);

  // 1. Tải toàn bộ dữ liệu từ Backend khi mở Modal
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setLoading(true);
      try {
        if (mode === "new") {
          // Mode NEW: Tải NewProvince & NewWard
          const [resProvinces, resWards] = await Promise.all([
            getNewProvinces(),
            getNewWards(),
          ]);

          setProvinces(resProvinces.data || []);
          setAllWards(resWards.data || []);
        } else {
          // Mode OLD: Tải OldProvince, OldDistrict & OldWard
          const [resProvinces, resDistricts, resWards] = await Promise.all([
            getOldProvinces(),
            getOldDistricts(),
            getOldWards(),
          ]);

          setProvinces(resProvinces.data || []);
          setAllDistricts(resDistricts.data || []);
          setAllWards(resWards.data || []);
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu địa chỉ từ Backend:", err);
        message.error("Không thể kết nối đến máy chủ địa chỉ.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, mode]);

  // 2. Xử lý khi chọn Tỉnh / Thành phố
  const handleProvinceChange = (provinceId) => {
    const provinceObj = provinces.find((p) => p.id === provinceId);
    setSelectedProvince(provinceObj);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setFilteredDistricts([]);
    setFilteredWards([]);
    form.setFieldsValue({ districtId: undefined, wardId: undefined });

    if (mode === "new") {
      // Trong Mode "new": Lọc các NewWard thuộc newProvinceId
      const wardsInProvince = allWards.filter((w) => w.newProvinceId === provinceId);
      setFilteredWards(wardsInProvince);
    } else {
      // Trong Mode "old": Lọc các OldDistrict thuộc oldProvinceId
      const districtsInProvince = allDistricts.filter((d) => d.oldProvinceId === provinceId);
      setFilteredDistricts(districtsInProvince);
    }
  };

  // 3. Xử lý khi chọn Quận / Huyện (Chỉ áp dụng cho mode === "old")
  const handleDistrictChange = (districtId) => {
    const districtObj = filteredDistricts.find((d) => d.id === districtId);
    setSelectedDistrict(districtObj);
    setSelectedWard(null);
    setFilteredWards([]);
    form.setFieldsValue({ wardId: undefined });

    // Trong Mode "old": Lọc các OldWard thuộc oldDistrictId
    const wardsInDistrict = allWards.filter((w) => w.oldDistrictId === districtId);
    setFilteredWards(wardsInDistrict);
  };

  // 4. Xử lý khi chọn Phường / Xã
  const handleWardChange = (wardId) => {
    const wardObj = filteredWards.find((w) => w.id === wardId);
    setSelectedWard(wardObj);
  };

  // 5. Xác nhận chọn địa chỉ
  const handleConfirm = () => {
    if (!selectedWard) {
      message.warning("Vui lòng chọn Phường/Xã");
      return;
    }

    const fullName =
      mode === "new"
        ? `${selectedWard.name}, ${selectedProvince?.name || ""}`
        : `${selectedWard.name}, ${selectedDistrict?.name || ""}, ${selectedProvince?.name || ""}`;

    // Trả về đúng ID chính xác của NewWard / OldWard trong Database C#
    onSelect(selectedWard.id, fullName);
    handleCloseModal();
  };

  const handleCloseModal = () => {
    form.resetFields();
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setFilteredDistricts([]);
    setFilteredWards([]);
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <EnvironmentOutlined style={{ color: "#1890ff" }} />
          <span>{title || (mode === "new" ? "Chọn Địa chỉ mới" : "Chọn Địa chỉ cũ")}</span>
        </Space>
      }
      open={open}
      onCancel={handleCloseModal}
      footer={[
        <Button key="cancel" onClick={handleCloseModal}>
          Hủy
        </Button>,
        <Button
          key="confirm"
          type="primary"
          disabled={!selectedWard}
          onClick={handleConfirm}
        >
          Xác nhận
        </Button>,
      ]}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {/* Bước 1: Chọn Tỉnh / Thành phố */}
          <Form.Item
            label="Tỉnh / Thành phố"
            name="provinceId"
            rules={[{ required: true, message: "Vui lòng chọn Tỉnh / Thành phố" }]}
          >
            <Select
              showSearch
              placeholder="Chọn Tỉnh / Thành phố"
              optionFilterProp="children"
              onChange={handleProvinceChange}
              options={provinces.map((p) => ({
                label: p.name,
                value: p.id,
              }))}
            />
          </Form.Item>

          {/* Bước 2 (Chỉ dành cho Địa chỉ cũ): Chọn Quận / Huyện */}
          {mode === "old" && (
            <Form.Item
              label="Quận / Huyện"
              name="districtId"
              rules={[{ required: true, message: "Vui lòng chọn Quận / Huyện" }]}
            >
              <Select
                showSearch
                placeholder="Chọn Quận / Huyện"
                optionFilterProp="children"
                disabled={!selectedProvince}
                onChange={handleDistrictChange}
                options={filteredDistricts.map((d) => ({
                  label: d.name,
                  value: d.id,
                }))}
              />
            </Form.Item>
          )}

          {/* Chọn Phường / Xã */}
          <Form.Item
            label="Phường / Xã"
            name="wardId"
            rules={[{ required: true, message: "Vui lòng chọn Phường / Xã" }]}
          >
            <Select
              showSearch
              placeholder="Chọn Phường / Xã"
              optionFilterProp="children"
              disabled={mode === "old" ? !selectedDistrict : !selectedProvince}
              onChange={handleWardChange}
              options={filteredWards.map((w) => ({
                label: w.name,
                value: w.id,
              }))}
            />
          </Form.Item>

          {selectedWard && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                borderRadius: 8,
              }}
            >
              <Text type="success" strong>
                Địa chỉ đã chọn (ID: {selectedWard.id}):
              </Text>
              <div>
                <Text>
                  {mode === "new"
                    ? `${selectedWard.name}, ${selectedProvince?.name || ""}`
                    : `${selectedWard.name}, ${selectedDistrict?.name || ""}, ${selectedProvince?.name || ""}`}
                </Text>
              </div>
            </div>
          )}
        </Form>
      </Spin>
    </Modal>
  );
};

export default AddressSelectModal;
