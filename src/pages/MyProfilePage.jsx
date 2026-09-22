import { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Avatar,
  Typography,
  Space,
  Spin,
  message,
  Row,
  Col,
  Tag,
  Upload,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  LockOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getMe, updateMe, changePassword } from '../api/accountApi';
import { uploadImage } from '../api/imageApi';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const GENDER_OPTIONS = [
  { value: 'Nam', label: 'Nam' },
  { value: 'Nữ', label: 'Nữ' },
  { value: 'Khác', label: 'Khác' },
];

const MyProfilePage = () => {
  const { updateUser, role } = useAuth();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleCustomImageUpload = async ({ file, onSuccess, onError }) => {
    setUploadingImage(true);
    try {
      const res = await uploadImage(file);
      if (res.data) {
        const imgObj = res.data;
        form.setFieldsValue({
          avatarImage: imgObj.imageLink,
        });
        // We also need to update the form's internal state to trigger re-render of the Upload component
        // so that it shows the uploaded image immediately. Form.Item will automatically read from form's value if we use shouldUpdate or if we force update.
        // Actually, just setFieldsValue should be enough if the Form.Item listens properly, but sometimes it doesn't without a rerender.
        // Let's also update the profile state locally so the header avatar updates instantly or rely on the form value.
        setProfile((prev) => ({ ...prev, avatarImage: imgObj.imageLink }));
        
        message.success('Tải ảnh lên thành công!');
        if (onSuccess) onSuccess(imgObj);
      }
    } catch (err) {
      console.error('Upload Error:', err);
      message.error('Không thể tải ảnh lên.');
      if (onError) onError(err);
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await getMe();
      setProfile(res.data);
      form.setFieldsValue({
        name: res.data.name,
        email: res.data.email,
        phone: res.data.phone,
        gender: res.data.gender || undefined,
        dateOfBirth: res.data.dateOfBirth ? dayjs(res.data.dateOfBirth) : null,
        citizenIdCode: res.data.citizenIdCode,
        avatarImage: res.data.avatarImage,
      });
    } catch {
      message.error('Không thể tải thông tin cá nhân.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (values) => {
    if (!profile) return;
    setSaving(true);
    try {
      const payload = {
        ...values,
        id: profile.id,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
        isActive: profile.isActive,
        addressId: profile.addressId ?? null,
      };
      await updateMe(payload);
      message.success('Cập nhật thông tin cá nhân thành công');
      updateUser({
        name: values.name,
        email: values.email,
        phone: values.phone,
        avatarImage: values.avatarImage,
      });
      fetchProfile();
    } catch (err) {
      console.error('Submit Profile Error:', err);
      const responseData = err.response?.data;
      let fieldErrorSet = false;

      if (responseData?.errors && typeof responseData.errors === 'object') {
        const fieldsToSet = [];
        const unmappedMessages = [];

        Object.entries(responseData.errors).forEach(([fieldKey, messages]) => {
          const fieldName = fieldKey.charAt(0).toLowerCase() + fieldKey.slice(1);
          const rawErrorList = Array.isArray(messages) ? messages : [messages];
          const errorTextList = rawErrorList.filter(
            (msg) => typeof msg === 'string' && !/^The\s+.*\s+field\b/i.test(msg) && !/field is required/i.test(msg)
          );

          if (errorTextList.length > 0) {
            if (['name', 'email', 'phone', 'gender', 'dateOfBirth', 'citizenIdCode', 'avatarImage'].includes(fieldName)) {
              fieldsToSet.push({ name: fieldName, errors: errorTextList });
              fieldErrorSet = true;
            } else {
              unmappedMessages.push(...errorTextList);
            }
          }
        });

        if (fieldsToSet.length > 0) {
          form.setFields(fieldsToSet);
        }
        if (unmappedMessages.length > 0) {
          unmappedMessages.forEach((msg) => message.error(msg));
        }
      }

      if (!fieldErrorSet) {
        const errorMsg = responseData?.message || (typeof responseData === 'string' ? responseData : null);
        if (errorMsg && errorMsg !== 'One or more validation errors occurred.') {
          message.error(errorMsg);
        } else if (!responseData?.errors) {
          message.error('Cập nhật thất bại. Vui lòng thử lại.');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (values) => {
    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Đổi mật khẩu thành công');
      passwordForm.resetFields();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Đổi mật khẩu thất bại.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" tip="Đang tải thông tin..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', maxWidth: 900, margin: '0 auto' }}>
      {/* ── Header: Avatar + Tên + Vai trò ─────────────────────────── */}
      <Card style={{ borderRadius: 12, marginBottom: 20 }}>
        <Space size="large" align="center">
          <Avatar
            size={72}
            src={profile?.avatarImage || undefined}
            icon={!profile?.avatarImage ? <UserOutlined /> : undefined}
            style={{ backgroundColor: profile?.avatarImage ? undefined : '#e8442a', flexShrink: 0 }}
          />
          <div>
            <Title level={3} style={{ margin: 0 }}>{profile?.name}</Title>
            <Text type="secondary">{profile?.email}</Text>
            <div style={{ marginTop: 6 }}>
              {role && <Tag color="volcano">{role}</Tag>}
            </div>
          </div>
        </Space>
      </Card>

      {/* ── Form: Thông tin cá nhân ─────────────────────────── */}
      <Card title="Thông tin cá nhân" style={{ borderRadius: 12, marginBottom: 20 }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Họ và tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Nhập họ và tên..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email!' },
                  { type: 'email', message: 'Email không hợp lệ!' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Nhập email..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="phone"
                label="Số điện thoại"
                rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="gender" label="Giới tính">
                <Select placeholder="Chọn giới tính...">
                  {GENDER_OPTIONS.map((g) => (
                    <Select.Option key={g.value} value={g.value}>
                      {g.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="dateOfBirth" label="Ngày sinh">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="citizenIdCode" label="Số CMND/CCCD">
                <Input prefix={<IdcardOutlined />} placeholder="Nhập số CMND/CCCD..." />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Ảnh đại diện">
                <Form.Item name="avatarImage" noStyle>
                  <Input type="hidden" />
                </Form.Item>
                <Upload
                  name="file"
                  listType="picture-card"
                  showUploadList={false}
                  customRequest={handleCustomImageUpload}
                >
                  {form.getFieldValue('avatarImage') || profile?.avatarImage ? (
                    <img
                      src={form.getFieldValue('avatarImage') || profile?.avatarImage}
                      alt="avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div>
                      {uploadingImage ? <Spin /> : <UploadOutlined style={{ fontSize: 26, color: '#1890ff' }} />}
                      <div style={{ marginTop: 8 }}>{uploadingImage ? 'Đang tải...' : 'Tải ảnh lên'}</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving}>
              Lưu thay đổi
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* ── Form: Đổi mật khẩu ─────────────────────────── */}
      <Card title="Đổi mật khẩu" style={{ borderRadius: 12 }}>
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="currentPassword"
                label="Mật khẩu hiện tại"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu hiện tại..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} />
            <Col xs={24} md={12}>
              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                  { min: 6, message: 'Mật khẩu mới phải có ít nhất 6 ký tự!' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="confirmPassword"
                label="Xác nhận mật khẩu mới"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button danger htmlType="submit" loading={changingPassword}>
              Đổi mật khẩu
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default MyProfilePage;
