import React from 'react';
import { Modal, Descriptions, Tag, Avatar, Button, Divider, Space, Typography, Badge } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  CalendarOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ManOutlined,
  WomanOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ROLES_MAP = {
  1: { label: 'Chủ hệ thống', color: 'gold' },
  2: { label: 'Chủ sở hữu', color: 'red' },
  3: { label: 'Quản lý', color: 'purple' },
  4: { label: 'Thu ngân', color: 'blue' },
  5: { label: 'Bếp trưởng', color: 'orange' },
  6: { label: 'Phục vụ', color: 'green' },
};

const formatGender = (gender) => {
  if (!gender) return 'Chưa cập nhật';
  const lower = gender.toLowerCase();
  if (lower === 'male' || lower === 'nam') return 'Nam';
  if (lower === 'female' || lower === 'nữ' || lower === 'nu') return 'Nữ';
  return gender;
};

const AccountDetailModal = ({ open, onClose, account, branches = [], onEdit }) => {
  if (!account) return null;

  // Resolve branch name if available
  const activeContract = account.contracts?.find((c) => c.status === 'Active' || c.status === 1);
  const branchId = activeContract?.branchId || account.branchId;
  const branchObj = branches.find((b) => b.id === branchId || b.id === Number(branchId));
  const branchName = branchObj ? branchObj.name : branchId ? `Chi nhánh #${branchId}` : 'Chưa phân công';

  return (
    <Modal
      maskClosable={false}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose} style={{ borderRadius: '6px' }}>
          Đóng
        </Button>,
        onEdit && (
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            style={{
              background: 'linear-gradient(135deg, #e8442a, #ff8c42)',
              border: 'none',
              borderRadius: '6px',
            }}
            onClick={() => {
              onClose();
              onEdit(account);
            }}
          >
            Chỉnh sửa thông tin
          </Button>
        ),
      ]}
      width={680}
      style={{ top: 20 }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, color: '#e8442a', fontWeight: 600 }}>
          <UserOutlined />
          <span>CHI TIẾT TÀI KHOẢN NHÂN VIÊN</span>
        </div>
      }
    >
      {/* Header Profile Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fffbfb 0%, #fff5f3 100%)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #ffdeda',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
        <Avatar
          size={72}
          src={account.avatarImage || undefined}
          icon={!account.avatarImage ? <UserOutlined /> : undefined}
          style={{
            backgroundColor: account.avatarImage ? undefined : '#e8442a',
            boxShadow: '0 4px 10px rgba(232, 68, 42, 0.2)',
            border: '2px solid #fff',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
              {account.name}
            </Title>
            <Tag color={account.isActive ? 'success' : 'error'} icon={account.isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
              {account.isActive ? 'Hoạt động' : 'Vô hiệu'}
            </Tag>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(account.roleIds || []).map((rid) => {
              const roleInfo = ROLES_MAP[rid] || { label: `Vai trò #${rid}`, color: 'default' };
              return (
                <Tag key={rid} color={roleInfo.color} style={{ borderRadius: '4px', fontWeight: 500 }}>
                  {roleInfo.label}
                </Tag>
              );
            })}
            {(!account.roleIds || account.roleIds.length === 0) && <Tag color="default">Chưa gán vai trò</Tag>}
          </div>
        </div>
      </div>

      {/* Information Details */}
      <Descriptions
        bordered
        column={{ xxl: 2, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 }}
        size="middle"
        labelStyle={{ fontWeight: 600, width: '150px', background: '#fafafa', color: '#4b5563' }}
        contentStyle={{ background: '#fff' }}
      >
        <Descriptions.Item label={<Space><MailOutlined style={{ color: '#1890ff' }} />Email</Space>}>
          {account.email || '—'}
        </Descriptions.Item>

        <Descriptions.Item label={<Space><PhoneOutlined style={{ color: '#52c41a' }} />Số điện thoại</Space>}>
          {account.phone || '—'}
        </Descriptions.Item>

        <Descriptions.Item label={<Space><IdcardOutlined style={{ color: '#fa8c16' }} />Số CMND / CCCD</Space>}>
          {account.citizenIdCode ? (
            <Text copyable>{account.citizenIdCode}</Text>
          ) : (
            'Chưa cập nhật'
          )}
        </Descriptions.Item>

        <Descriptions.Item label={<Space><CalendarOutlined style={{ color: '#eb2f96' }} />Ngày sinh</Space>}>
          {account.dateOfBirth ? dayjs(account.dateOfBirth).format('DD/MM/YYYY') : 'Chưa cập nhật'}
        </Descriptions.Item>

        <Descriptions.Item label={<Space>{formatGender(account.gender) === 'Nam' ? <ManOutlined style={{ color: '#1890ff' }} /> : <WomanOutlined style={{ color: '#eb2f96' }} />}Giới tính</Space>}>
          {formatGender(account.gender)}
        </Descriptions.Item>

        <Descriptions.Item label={<Space><BankOutlined style={{ color: '#722ed1' }} />Chi nhánh</Space>}>
          <Tag color="geekblue" style={{ borderRadius: 4 }}>
            {branchName}
          </Tag>
        </Descriptions.Item>

        <Descriptions.Item label={<Space><SafetyCertificateOutlined style={{ color: '#faad14' }} />Ngày tạo tài khoản</Space>}>
          {account.createdAt ? dayjs(account.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
        </Descriptions.Item>

        <Descriptions.Item label={<Space><CheckCircleOutlined style={{ color: account.isActive ? '#52c41a' : '#ff4d4f' }} />Trạng thái</Space>}>
          <Badge
            status={account.isActive ? 'success' : 'error'}
            text={account.isActive ? 'Đang hoạt động' : 'Tài khoản đã bị vô hiệu'}
          />
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default AccountDetailModal;
