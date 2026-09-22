import { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Row,
  Col,
  TimePicker,
  message,
  Typography,
  Tag,
  Space,
  Divider,
} from "antd";
import {
  ShopOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  AimOutlined,
  GlobalOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { createBranch, updateBranch } from "../api/branchApi";
import AddressSelectModal from "./AddressSelectModal";
import MapPickerModal from "./MapPickerModal";

const { Text } = Typography;

const parseTime = (timeStr) => {
  if (!timeStr) return null;
  if (dayjs.isDayjs(timeStr)) return timeStr;
  const parsed = dayjs(`2000-01-01T${timeStr}`);
  return parsed.isValid() ? parsed : null;
};

const CreateUpdateBranchFormPopup = ({
  open,
  onClose,
  branchObject,
  mainChainId,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const [newAddressState, setNewAddressState] = useState({
    wardId: null,
    name: "",
  });
  const [oldAddressState, setOldAddressState] = useState({
    wardId: null,
    name: "",
  });

  const [addressModalConfig, setAddressModalConfig] = useState({
    open: false,
    mode: "new",
    title: "",
  });

  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapCoords, setCoords] = useState({ lat: null, lng: null });

  useEffect(() => {
    if (open) {
      if (branchObject) {
        form.setFieldsValue({
          id: branchObject.id,
          name: branchObject.name,
          type: branchObject.type || "Main",
          openTime: parseTime(branchObject.openTime),
          closeTime: parseTime(branchObject.closeTime),
          latitude: branchObject.latitude ?? "",
          longitude: branchObject.longitude ?? "",
          checkinRadiusMeters: branchObject.checkinRadiusMeters ?? 100,
          payrollPayday: branchObject.payrollPayday ?? branchObject.PayrollPayday ?? 15,
        });

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNewAddressState({
          wardId: branchObject.newWardId || null,
          name: branchObject.newAddressName || "Chưa thiết lập",
        });
        setOldAddressState({
          wardId: branchObject.oldWardId || null,
          name: branchObject.oldAddressName || "Chưa thiết lập",
        });
        setCoords({
          lat: branchObject.latitude || branchObject.Latitude || null,
          lng: branchObject.longitude || branchObject.Longitude || null,
        });
      } else {
        form.resetFields();
        setNewAddressState({ wardId: null, name: "" });

        setOldAddressState({ wardId: null, name: "" });

        setCoords({ lat: null, lng: null });
      }
    }
  }, [open, branchObject, form]);

  // Xử lý khi chọn địa chỉ xong từ AddressSelectModal
  const handleAddressSelected = (wardId, fullAddressName) => {
    if (addressModalConfig.mode === "new") {
      setNewAddressState({
        wardId: wardId,
        name: fullAddressName,
      });
      message.success("Đã chọn địa chỉ mới cho chi nhánh");
    } else {
      setOldAddressState({
        wardId: wardId,
        name: fullAddressName,
      });
      message.success("Đã chọn địa chỉ cũ cho chi nhánh");
    }
  };

  const openNewAddressModal = () => {
    setAddressModalConfig({
      open: true,
      mode: "new",
      title: "Chọn Địa chỉ mới (Phường / Xã)",
    });
  };

  const openOldAddressModal = () => {
    setAddressModalConfig({
      open: true,
      mode: "old",
      title: "Chọn Địa chỉ cũ (Tỉnh -> Huyện -> Xã)",
    });
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const dto = {
        id: branchObject?.id ?? 0,
        chainId: mainChainId,
        name: values.name,
        type: values.type || "Main",
        openTime: values.openTime
          ? values.openTime.format("HH:mm:ss")
          : "08:00:00",
        closeTime: values.closeTime
          ? values.closeTime.format("HH:mm:ss")
          : "22:00:00",
        status: branchObject?.status || "Hoạt động",
        latitude: values.latitude !== "" && values.latitude != null ? Number(values.latitude) : null,
        longitude: values.longitude !== "" && values.longitude != null ? Number(values.longitude) : null,
        checkinRadiusMeters: values.checkinRadiusMeters ? Number(values.checkinRadiusMeters) : 100,
        payrollPayday: values.payrollPayday ? Number(values.payrollPayday) : 15,
        address: {
          newWardId: newAddressState.wardId
            ? Number(newAddressState.wardId)
            : null,
        },
      };

      if (branchObject) {
        await updateBranch(dto);
        message.success("Cập nhật thông tin chi nhánh thành công!");
      } else {
        await createBranch(dto);
        message.success("Tạo mới chi nhánh thành công!");
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      const errors = err.response?.data?.errors;

      if (errors) {
        const errorList = Object.values(errors).flatMap((e) =>
          Array.isArray(e) ? e : [e],
        );
        errorList.forEach((msg) => message.error(String(msg)));
      } else {
        const errorMsg = err.response?.data?.error
          ? `${err.response.data.message || "Lỗi"}: ${err.response.data.error}`
          : (err.response?.data?.message || "Có lỗi xảy ra khi lưu chi nhánh.");
        message.error(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        width={720}
        style={{ top: 24 }}
        title={
          <Space>
            <ShopOutlined style={{ color: "#1890ff", fontSize: 20 }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              {branchObject
                ? "Cập nhật thông tin chi nhánh"
                : "Thêm mới chi nhánh"}
            </span>
          </Space>
        }
        footer={[
          <Button key="cancel" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submitting}
            disabled={!branchObject && !mainChainId}
            onClick={() => form.submit()}
          >
            {branchObject ? "Cập nhật" : "Tạo mới"}
          </Button>,
        ]}
        onCancel={onClose}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 12 }}
        >
          <Row gutter={16}>
            {/* Tên chi nhánh */}
            <Col span={24}>
              <Form.Item
                label="Tên chi nhánh"
                name="name"
                style={{ marginBottom: 14 }}
                rules={[
                  { required: true, message: "Vui lòng nhập tên chi nhánh" },
                  {
                    whitespace: true,
                    message: "Tên chi nhánh không được để trống",
                  },
                  { max: 100, message: "Tên chi nhánh tối đa 100 ký tự" },
                ]}
              >
                <Input
                  placeholder="Nhập tên chi nhánh (ví dụ: Chi nhánh Quận 1)..."
                  size="large"
                />
              </Form.Item>
            </Col>

            {/* Giờ mở cửa */}
            <Col span={8}>
              <Form.Item
                label={
                  <Space size={4}>
                    <ClockCircleOutlined style={{ color: "#1890ff" }} />
                    <span style={{ whiteSpace: "nowrap" }}>Giờ mở cửa</span>
                  </Space>
                }
                name="openTime"
                rules={[{ required: true, message: "Chọn giờ mở cửa" }]}
                style={{ marginBottom: 14 }}
              >
                <TimePicker
                  style={{ width: "100%" }}
                  size="large"
                  format="HH:mm"
                  needConfirm={false}
                  placeholder="Chọn giờ mở cửa"
                />
              </Form.Item>
            </Col>

            {/* Giờ đóng cửa */}
            <Col span={8}>
              <Form.Item
                label={
                  <Space size={4}>
                    <ClockCircleOutlined style={{ color: "#ff4d4f" }} />
                    <span style={{ whiteSpace: "nowrap" }}>Giờ đóng cửa</span>
                  </Space>
                }
                name="closeTime"
                rules={[{ required: true, message: "Chọn giờ đóng cửa" }]}
                style={{ marginBottom: 14 }}
              >
                <TimePicker
                  style={{ width: "100%" }}
                  size="large"
                  format="HH:mm"
                  needConfirm={false}
                  placeholder="Chọn giờ đóng cửa"
                />
              </Form.Item>
            </Col>

            {/* Ngày trả lương hàng tháng */}
            <Col span={8}>
              <Form.Item
                label={
                  <Space size={4}>
                    <CalendarOutlined style={{ color: "#722ed1" }} />
                    <span style={{ whiteSpace: "nowrap" }}>Ngày trả lương (1 - 31)</span>
                  </Space>
                }
                name="payrollPayday"
                initialValue={15}
                rules={[
                  { required: true, message: "Vui lòng chọn ngày trả lương hàng tháng" },
                  { type: "number", min: 1, max: 31, message: "Ngày trả lương phải từ 1 đến 31" }
                ]}
                style={{ marginBottom: 14 }}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                  max={31}
                  placeholder="15"
                  size="large"
                  addonBefore="Ngày"
                  addonAfter="hàng tháng"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "6px 0 14px 0" }}>
            <Space>
              <EnvironmentOutlined style={{ color: "#52c41a" }} />
              <Text type="secondary">Thông tin địa chỉ chi nhánh</Text>
            </Space>
          </Divider>

          {/* Nhóm Địa chỉ Chi nhánh */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
            }}
          >
            {/* Tỉnh / Huyện / Xã */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Tag color="blue">Khu vực</Tag>
                <Text strong>Tỉnh / Thành phố, Phường / Xã</Text>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <Button
                  icon={<EnvironmentOutlined />}
                  size="large"
                  onClick={openNewAddressModal}
                  style={{ height: 42 }}
                >
                  Chọn Tỉnh/Xã
                </Button>
                <div
                  style={{
                    flex: 1,
                    background: "#fff",
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    minHeight: 42,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, display: "block", lineHeight: "14px" }}
                  >
                    Khu vực đã chọn:
                  </Text>
                  <Text strong style={{ fontSize: 13, lineHeight: "18px" }}>
                    {newAddressState.name || "Chưa thiết lập"}
                  </Text>
                </div>
              </div>
            </div>

            {/* GPS Vị trí và điểm danh */}
            <div
              style={{
                paddingTop: 12,
                borderTop: "1px dashed #cbd5e1",
              }}
            >
              <div
                style={{
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Tag color="green">GPS</Tag>
                <Text strong>Vị trí và điểm danh</Text>
              </div>
              <div style={{ marginBottom: 10, fontSize: 12, color: "#64748b" }}>
                Đặt tọa độ GPS để hệ thống xác minh vị trí khi nhân viên điểm danh. Nếu chưa cài đặt, hệ thống bỏ qua kiểm tra.
              </div>

              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item
                    name="latitude"
                    label={<Text strong style={{ fontSize: 13 }}>Vĩ độ</Text>}
                    style={{ marginBottom: 12 }}
                    rules={[
                      {
                        validator: (_, value) => {
                          if (value === "" || value == null) return Promise.resolve();
                          const n = Number(value);
                          if (isNaN(n) || n < -90 || n > 90)
                            return Promise.reject("Vĩ độ phải từ -90 đến 90");
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input
                      placeholder="10.7769"
                      size="large"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCoords((prev) => ({ ...prev, lat: isNaN(val) ? null : val }));
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="longitude"
                    label={<Text strong style={{ fontSize: 13 }}>Kinh độ</Text>}
                    style={{ marginBottom: 12 }}
                    rules={[
                      {
                        validator: (_, value) => {
                          if (value === "" || value == null) return Promise.resolve();
                          const n = Number(value);
                          if (isNaN(n) || n < -180 || n > 180)
                            return Promise.reject("Kinh độ phải từ -180 đến 180");
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input
                      placeholder="106.7009"
                      size="large"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCoords((prev) => ({ ...prev, lng: isNaN(val) ? null : val }));
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="checkinRadiusMeters"
                    label={<Text strong style={{ fontSize: 13 }}>Phạm vi (mét)</Text>}
                    style={{ marginBottom: 12 }}
                  >
                    <Input placeholder="100" size="large" suffix="m" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Button
                    icon={<GlobalOutlined style={{ color: "#1890ff" }} />}
                    size="large"
                    onClick={() => setMapModalOpen(true)}
                    style={{
                      width: "100%",
                      borderColor: "#91caff",
                      color: "#0958d9",
                      fontWeight: 500,
                    }}
                  >
                    GGMap
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    icon={<AimOutlined />}
                    size="large"
                    style={{
                      background: "#16a34a",
                      borderColor: "#16a34a",
                      color: "#fff",
                      width: "100%",
                      fontWeight: 500,
                    }}
                    onClick={() => {
                      if (!navigator.geolocation) {
                        message.error("Trình duyệt không hỗ trợ GPS");
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const lat = Number(pos.coords.latitude.toFixed(6));
                          const lng = Number(pos.coords.longitude.toFixed(6));
                          form.setFieldsValue({
                            latitude: lat,
                            longitude: lng,
                          });
                          setCoords({ lat, lng });
                          message.success("Đã lấy vị trí GPS hiện tại!");
                        },
                        () => message.error("Vui lòng cấp quyền GPS trong cài đặt trình duyệt.")
                      );
                    }}
                  >
                    GPS
                  </Button>
                </Col>
              </Row>
            </div>
          </div>
        </Form>
      </Modal>

      {/* Map Picker Modal */}
      <MapPickerModal
        open={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        initialLat={
          !isNaN(Number(form.getFieldValue("latitude"))) &&
          form.getFieldValue("latitude") !== "" &&
          form.getFieldValue("latitude") != null
            ? Number(form.getFieldValue("latitude"))
            : mapCoords.lat
        }
        initialLng={
          !isNaN(Number(form.getFieldValue("longitude"))) &&
          form.getFieldValue("longitude") !== "" &&
          form.getFieldValue("longitude") != null
            ? Number(form.getFieldValue("longitude"))
            : mapCoords.lng
        }
        onSelect={(lat, lng) => {
          const latFixed = Number(lat.toFixed(6));
          const lngFixed = Number(lng.toFixed(6));
          setCoords({ lat: latFixed, lng: lngFixed });
          form.setFieldsValue({
            latitude: latFixed,
            longitude: lngFixed,
          });
          message.success("Đã ghi nhận tọa độ GPS!");
        }}
      />

      {/* Address Select Modal */}
      <AddressSelectModal
        open={addressModalConfig.open}
        mode={addressModalConfig.mode}
        title={addressModalConfig.title}
        onClose={() =>
          setAddressModalConfig((prev) => ({ ...prev, open: false }))
        }
        onSelect={handleAddressSelected}
      />
    </>
  );
};

export default CreateUpdateBranchFormPopup;
