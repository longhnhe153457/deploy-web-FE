import { useEffect, useState, useCallback, useRef } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Row,
  Col,
  TimePicker,
  message,
  Spin,
  Typography,
  Tag,
  Descriptions,
  Space,
} from "antd";
import {
  CameraOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { getMainChain, updateChain } from "../api/chainApi";
import { uploadImage } from "../api/imageApi";
import AddressSelectModal from "../PopUp/AddressSelectModal";
import MapPickerModal from "../PopUp/MapPickerModal";
import "../styles/ChainPage.css";

const { Text } = Typography;

const parseTime = (timeStr) => {
  if (!timeStr) return null;
  if (dayjs.isDayjs(timeStr)) return timeStr;
  const parsed = dayjs(`2000-01-01T${timeStr}`);
  return parsed.isValid() ? parsed : null;
};

const ChainPage = () => {
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [chain, setChain] = useState(null);

  const [bannerPreview, setBannerPreview] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const bannerInputRef = useRef(null);
  const logoInputRef = useRef(null);

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

  // ===================================================================================================================Fetch Data
  const loadChain = useCallback(async () => {
    setLoading(true);

    try {
      const res = await getMainChain();
      const data = res.data;

      setChain(data);

      form.setFieldsValue({
        name: data.name,
        openTime: parseTime(data.openTime),
        closeTime: parseTime(data.closeTime),
      });

      setBannerPreview(data.backgroundImage || null);
      setLogoPreview(data.logoImage || null);
      setBannerFile(null);
      setLogoFile(null);

      setNewAddressState({
        wardId: null,
        name: data.newAddressName || "Chưa thiết lập",
      });
      setOldAddressState({
        wardId: null,
        name: data.oldAddressName || "Chưa thiết lập",
      });
      setCoords({
        lat: data.latitude || data.Latitude || null,
        lng: data.longitude || data.Longitude || null,
      });
    } catch (err) {
      console.error(err);
      message.error("Không thể tải thông tin chuỗi nhà hàng.");
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadChain();
  }, [loadChain]);

  // ==================================================================================================================Upload Image
  const handleBannerClick = () => {
    bannerInputRef.current?.click();
  };

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      message.error("Vui lòng chọn tệp hình ảnh hợp lệ!");
      return;
    }

    setBannerFile(file);
    const objectUrl = URL.createObjectURL(file);
    setBannerPreview(objectUrl);
    message.success("Đã chọn ảnh bìa mới (chưa tải lên máy chủ)");
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      message.error("Vui lòng chọn tệp hình ảnh hợp lệ!");
      return;
    }

    setLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    message.success("Đã chọn Logo mới (chưa tải lên máy chủ)");
  };

  // ===================================================================================================================== Address
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

  const handleAddressSelected = (wardId, fullAddressName) => {
    if (addressModalConfig.mode === "new") {
      setNewAddressState({
        wardId: wardId,
        name: fullAddressName,
      });
      message.success("Đã chọn địa chỉ mới");
    } else {
      setOldAddressState({
        wardId: wardId,
        name: fullAddressName,
      });
      message.success("Đã chọn địa chỉ cũ");
    }
  };

  const closeAddressModal = () => {
    setAddressModalConfig((prev) => ({ ...prev, open: false }));
  };

  //===================================================================================================================Filter data
  const handleSubmit = async (values) => {
    if (!chain) return;

    try {
      setSubmitting(true);

      let finalLogo = chain.logoImage || "";
      let finalBanner = chain.backgroundImage || "";

      if (logoFile) {
        message.loading({
          content: "Đang tải Logo lên Cloudinary...",
          key: "uploadLogo",
        });
        const logoRes = await uploadImage(logoFile);
        if (logoRes.data?.imageLink) {
          finalLogo = logoRes.data.imageLink;
          message.success({
            content: "Tải Logo lên Cloudinary thành công!",
            key: "uploadLogo",
          });
        }
      }

      if (bannerFile) {
        message.loading({
          content: "Đang tải ảnh bìa lên Cloudinary...",
          key: "uploadBanner",
        });
        const bannerRes = await uploadImage(bannerFile);
        if (bannerRes.data?.imageLink) {
          finalBanner = bannerRes.data.imageLink;
          message.success({
            content: "Tải ảnh bìa lên Cloudinary thành công!",
            key: "uploadBanner",
          });
        }
      }

      const dto = {
        id: chain.id,
        name: values.name,
        logoImage: finalLogo,
        backgroundImage: finalBanner,
        openTime: values.openTime
          ? values.openTime.format("HH:mm:ss")
          : chain.openTime,
        closeTime: values.closeTime
          ? values.closeTime.format("HH:mm:ss")
          : chain.closeTime,
        latitude: mapCoords.lat || null,
        longitude: mapCoords.lng || null,
        address: {
          type: "Chuỗi",
          newWardId: newAddressState.wardId
            ? Number(newAddressState.wardId)
            : null,
        },
      };

      await updateChain(dto);

      message.success("Cập nhật thông tin chuỗi nhà hàng thành công!");
      loadChain();
    } catch (err) {
      console.error("Lỗi khi gọi API updateChain:", err);
      const resData = err.response?.data;

      if (resData?.errors) {
        const errorList = Object.values(resData.errors).flatMap((e) =>
          Array.isArray(e) ? e : [e],
        );
        errorList.forEach((msg) => message.error(String(msg)));
      } else if (resData?.message) {
        message.error(resData.message);
      } else if (resData?.title) {
        message.error(resData.title);
      } else {
        message.error(err.message || "Có lỗi xảy ra khi cập nhật.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!chain) return;

    form.setFieldsValue({
      name: chain.name,
      openTime: parseTime(chain.openTime),
      closeTime: parseTime(chain.closeTime),
    });

    setBannerPreview(chain.backgroundImage || null);
    setLogoPreview(chain.logoImage || null);
    setCoords({
      lat: chain.latitude || chain.Latitude || null,
      lng: chain.longitude || chain.Longitude || null,
    });
    setBannerFile(null);
    setLogoFile(null);

    setNewAddressState({
      wardId: null,
      name: chain.newAddressName || "Chưa thiết lập",
    });
    setOldAddressState({
      wardId: null,
      name: chain.oldAddressName || "Chưa thiết lập",
    });

    message.info("Đã hủy bỏ các thay đổi.");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" tip="Đang tải thông tin chuỗi nhà hàng..." />
      </div>
    );
  }

  const formattedCreatedAt = chain?.createdAt
    ? dayjs(chain.createdAt).format("DD/MM/YYYY HH:mm")
    : "Chưa rõ";

  return (
    <div className="chain-profile-container">
      {/* Hidden File Inputs cho Banner & Logo */}
      <input
        type="file"
        ref={bannerInputRef}
        onChange={handleBannerFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />
      <input
        type="file"
        ref={logoInputRef}
        onChange={handleLogoFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />

      {/* ================================================================================================================ Form*/}
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* ============================================================================================================ BANNER*/}
        <div className="chain-banner-wrapper" onClick={handleBannerClick}>
          {bannerPreview ? (
            <img
              src={bannerPreview}
              alt="Chain Banner"
              className="chain-banner-img"
            />
          ) : (
            <div className="chain-banner-placeholder">
              <CameraOutlined style={{ fontSize: 36 }} />
              <span>Nhấp để thay đổi ảnh bìa chuỗi nhà hàng</span>
            </div>
          )}
          <div className="chain-banner-overlay">
            <CameraOutlined style={{ fontSize: 24 }} />
            <Text style={{ color: "#fff", fontWeight: 500 }}>
              Thay đổi ảnh bìa
            </Text>
          </div>
        </div>

        {/* =============================================================================Logo, Name, Open/Close Time, CreatedAt */}
        <div className="chain-header-card">
          <div className="chain-header-top-row">
            {/* Logo  */}
            <div className="chain-logo-wrapper" onClick={handleLogoClick}>
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Chain Logo"
                  className="chain-logo-img"
                />
              ) : (
                <div className="chain-logo-placeholder">
                  {chain?.name ? (
                    chain.name.charAt(0).toUpperCase()
                  ) : (
                    <ShopOutlined />
                  )}
                </div>
              )}
              <div className="chain-logo-overlay">
                <CameraOutlined style={{ fontSize: 18 }} />
                <span>Đổi Logo</span>
              </div>
            </div>

            {/*  Name  */}
            <div className="chain-title-container">
              <Form.Item
                name="name"
                style={{ marginBottom: 0 }}
                rules={[
                  {
                    required: true,
                    message: "Vui lòng nhập tên chuỗi nhà hàng",
                  },
                  { whitespace: true, message: "Tên không được để trống" },
                ]}
              >
                <Input
                  placeholder="Nhập tên chuỗi nhà hàng..."
                  className="chain-name-input"
                  size="large"
                />
              </Form.Item>
            </div>
          </div>

          {/* Time */}
          <div className="chain-meta-row">
            <div className="chain-meta-item">
              <ClockCircleOutlined style={{ color: "#1890ff" }} />
              <Text type="secondary">Giờ mở cửa:</Text>
              <Form.Item name="openTime" noStyle>
                <TimePicker
                  format="HH:mm"
                  needConfirm={false}
                  style={{ width: 110 }}
                />
              </Form.Item>
            </div>

            <div className="chain-meta-item">
              <ClockCircleOutlined style={{ color: "#ff4d4f" }} />
              <Text type="secondary">Giờ đóng cửa:</Text>
              <Form.Item name="closeTime" noStyle>
                <TimePicker
                  format="HH:mm"
                  needConfirm={false}
                  style={{ width: 110 }}
                />
              </Form.Item>
            </div>

            <div className="chain-meta-item">
              <CalendarOutlined style={{ color: "#52c41a" }} />
              <Text type="secondary">Ngày tạo:</Text>
              <Tag color="blue" icon={<CheckCircleOutlined />}>
                {formattedCreatedAt}
              </Tag>
            </div>
          </div>
        </div>

        {/* ========================================================================================================== Address */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={14}>
            <Card
              className="chain-section-card"
              title={
                <Space>
                  <EnvironmentOutlined style={{ color: "#1890ff" }} />
                  <span>Thông tin địa chỉ</span>
                </Space>
              }
            >
              {/* Khu vực Tỉnh / Huyện / Xã */}
              <div className="chain-address-box" style={{ marginBottom: 16 }}>
                <div className="chain-address-title" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <Tag color="blue">Khu vực</Tag>
                  <Text strong>Tỉnh / Thành phố, Phường / Xã</Text>
                </div>
                <div className="chain-address-content" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Button
                    type="primary"
                    ghost
                    icon={<EnvironmentOutlined />}
                    onClick={openNewAddressModal}
                  >
                    Chọn Tỉnh/Xã
                  </Button>
                  <div className="chain-address-display" style={{ flex: 1, background: "#f8fafc", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
                    <Text
                      type="secondary"
                      style={{ fontSize: 11, display: "block" }}
                    >
                      Khu vực đã chọn:
                    </Text>
                    <Text strong>
                      {newAddressState.name || "Chưa thiết lập"}
                    </Text>
                  </div>
                </div>
              </div>

              {/* Chọn tọa độ trực tiếp trên GGMap */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#f1f5f9",
                  padding: "10px 14px",
                  borderRadius: 8,
                  marginTop: 16,
                }}
              >
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Vị trí bản đồ (Tọa độ GPS):</Text>
                  <Text strong style={{ fontSize: 13 }}>
                    {mapCoords.lat && mapCoords.lng 
                      ? `Vĩ độ: ${mapCoords.lat.toFixed(5)}, Kinh độ: ${mapCoords.lng.toFixed(5)}`
                      : "Chưa cấu hình tọa độ trên bản đồ"
                    }
                  </Text>
                </div>
                <Button
                  type="primary"
                  ghost
                  icon={<GlobalOutlined />}
                  onClick={() => setMapModalOpen(true)}
                >
                  Chọn vị trí trên GGMap
                </Button>
              </div>

              {/* Old */}
              {/* 
              <div className="chain-address-box">
                <div className="chain-address-title">
                  <Tag color="default">CŨ</Tag>
                  <span>Khu vực Địa chỉ cũ</span>
                </div>
                <div className="chain-address-content">
                  <Button
                    icon={<EnvironmentOutlined />}
                    onClick={openOldAddressModal}
                  >
                    Chọn địa chỉ cũ
                  </Button>
                  <div className="chain-address-display">
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, display: "block" }}
                    >
                      Địa chỉ cũ:
                    </Text>
                    <Text type="secondary">
                      {oldAddressState.name || "Chưa thiết lập"}
                    </Text>
                  </div>
                </div>
              </div>
 */}
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card
              className="chain-section-card"
              title={
                <Space>
                  <ShopOutlined style={{ color: "#722ed1" }} />
                  <span>Thông tin chuỗi & Hệ thống</span>
                </Space>
              }
            >
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Mã ID Chuỗi">
                  <Text code>{chain?.id || "N/A"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color="success">Đang hoạt động</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Khung giờ kinh doanh">
                  <Text strong>
                    {typeof chain?.openTime === "string"
                      ? chain.openTime.substring(0, 5)
                      : String(chain?.openTime || "--:--")}
                    {" - "}
                    {typeof chain?.closeTime === "string"
                      ? chain.closeTime.substring(0, 5)
                      : String(chain?.closeTime || "--:--")}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo hệ thống">
                  <Text type="secondary">{formattedCreatedAt}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        {/* ======================================================================================================= BUTTONS  */}
        <div className="chain-action-bar">
          <Button
            size="large"
            icon={<ReloadOutlined />}
            onClick={handleCancel}
            disabled={submitting}
          >
            Hủy
          </Button>

          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            htmlType="submit"
            loading={submitting}
          >
            Cập nhật
          </Button>
        </div>
      </Form>

      <AddressSelectModal
        open={addressModalConfig.open}
        mode={addressModalConfig.mode}
        title={addressModalConfig.title}
        onClose={closeAddressModal}
        onSelect={handleAddressSelected}
      />

      {/* Map Picker Modal */}
      <MapPickerModal
        open={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        initialLat={mapCoords.lat}
        initialLng={mapCoords.lng}
        onSelect={(lat, lng) => {
          setCoords({ lat, lng });
          message.success("Đã ghi nhận tọa độ định vị chuỗi!");
        }}
      />
    </div>
  );
};

export default ChainPage;
