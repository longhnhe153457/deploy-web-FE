import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Input,
  Select,
  Badge,
  Avatar,
  Spin,
  Typography,
  Tooltip,
  Modal,
  Form,
  message as antMessage
} from 'antd';
import {
  MessageOutlined,
  CloseOutlined,
  SendOutlined,
  ShopOutlined,
  AppstoreAddOutlined,
  CustomerServiceOutlined,
  UserOutlined,
  PlusOutlined
} from '@ant-design/icons';
import {
  initGuestSession,
  getGuestConversations,
  getGuestConversationDetails,
  sendGuestChatMessage,
  sendGuestProductConsultation,
  getStoredGuestToken,
  getStoredGuestId,
  setStoredGuestSession,
  sendCustomerProductConsultation
} from '../../api/guestChatApi';
import {
  getCustomerConversations,
  getCustomerConversationDetails,
  sendCustomerChatMessage,
  openCustomerConversation
} from '../../api/customerPortalApi';
import { useSignalR } from '../../context/SignalRContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useNavigate } from 'react-router-dom';
import ProductConsultationCard from './ProductConsultationCard';
import SelectProductConsultationModal from './SelectProductConsultationModal';

const { Text } = Typography;
const { Option } = Select;

const formatPrice = (price) => {
  if (price === undefined || price === null) return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

const FloatingChatWidget = ({
  activeBranchId,
  branches = [],
  onSelectBranch,
  externalConsultationItem = null,
  onClearExternalConsultation = () => {}
}) => {
  const connection = useSignalR();
  const { customer, isAuthenticated } = useCustomerAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [guestSession, setGuestSession] = useState(null);
  const [currentBranchId, setCurrentBranchId] = useState(activeBranchId || null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuModalOpen, setMenuModalOpen] = useState(false);

  // States cho modal tạo yêu cầu mới và chọn chi nhánh tư vấn
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [submittingNewChat, setSubmittingNewChat] = useState(false);
  const [newChatForm] = Form.useForm();
  const [branchSelectModalOpen, setBranchSelectModalOpen] = useState(false);
  const [selectedBranchForConsult, setSelectedBranchForConsult] = useState(null);
  const [pendingConsultProduct, setPendingConsultProduct] = useState(null);

  const messagesEndRef = useRef(null);

  const activeBranches = branches.filter(b => !b.isDeleted && b.status !== "Ngừng kinh doanh");

  // Sync activeBranchId from parent
  useEffect(() => {
    if (activeBranchId && activeBranches.some(b => b.id === activeBranchId)) {
      setCurrentBranchId(activeBranchId);
    } else if (activeBranches.length > 0 && !currentBranchId) {
      setCurrentBranchId(activeBranches[0].id);
    }
  }, [activeBranchId, activeBranches]);

  // Khởi tạo phiên
  useEffect(() => {
    if (isAuthenticated) {
      loadConversations(currentBranchId);
    } else {
      initSession();
    }
  }, [currentBranchId, isAuthenticated]);

  const initSession = async () => {
    try {
      const storedToken = getStoredGuestToken();
      const storedGuestId = getStoredGuestId();

      const res = await initGuestSession({
        guestId: storedGuestId || null,
        token: storedToken || null,
        branchId: currentBranchId || null
      });

      if (res.data) {
        setGuestSession(res.data);
        setStoredGuestSession(res.data);
        loadConversations(currentBranchId);
      }
    } catch {
      // Fallback
    }
  };

  // SignalR Hub listener
  useEffect(() => {
    if (!connection) return;

    let groupId = null;
    let joinMethod = '';
    let leaveMethod = '';

    if (isAuthenticated && customer?.id) {
      groupId = customer.id;
      joinMethod = 'JoinCustomerGroup';
      leaveMethod = 'LeaveCustomerGroup';
    } else if (!isAuthenticated && guestSession?.guestId) {
      groupId = guestSession.guestId;
      joinMethod = 'JoinGuestGroup';
      leaveMethod = 'LeaveGuestGroup';
    }

    if (!groupId) return;

    connection
      .invoke(joinMethod, groupId)
      .catch((err) => console.warn(joinMethod + ' SignalR error:', err));

    const handleNewMessage = (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    };

    connection.on('ReceiveNewMessage', handleNewMessage);

    return () => {
      if (connection && groupId) {
        connection
          .invoke(leaveMethod, groupId)
          .catch(() => {});
        connection.off('ReceiveNewMessage', handleNewMessage);
      }
    };
  }, [connection, guestSession?.guestId, isAuthenticated, customer?.id, isOpen]);

  // Tải danh sách hội thoại của chi nhánh hiện tại
  const loadConversations = async (branchId) => {
    if (!isAuthenticated) {
      const token = getStoredGuestToken();
      if (!token) return;
    }

    setLoading(true);
    try {
      const res = isAuthenticated 
        ? await getCustomerConversations()
        : await getGuestConversations();
        
      if (res.data) {
        setConversations(res.data);
        const targetConv = res.data.find((c) => c.branchId === branchId);
        if (targetConv) {
          setActiveConversation(targetConv);
          loadConversationDetails(targetConv.id);
        } else {
          setActiveConversation(null);
          setMessages([]);
        }
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetails = async (convId) => {
    try {
      const res = isAuthenticated 
        ? await getCustomerConversationDetails(convId)
        : await getGuestConversationDetails(convId);
      if (res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch {
      // Ignored
    }
  };

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Xử lý khi có yêu cầu tư vấn món từ bên ngoài (card món ăn)
  useEffect(() => {
    if (externalConsultationItem) {
      setPendingConsultProduct(externalConsultationItem);
      setSelectedBranchForConsult(currentBranchId || (activeBranches[0]?.id) || null);
      setBranchSelectModalOpen(true);
      onClearExternalConsultation();
    }
  }, [externalConsultationItem, currentBranchId, activeBranches]);

  const handleConfirmBranchForConsult = () => {
    if (!selectedBranchForConsult) {
      antMessage.warning("Vui lòng chọn một chi nhánh!");
      return;
    }
    const targetBid = selectedBranchForConsult;
    setBranchSelectModalOpen(false);
    setCurrentBranchId(targetBid);
    if (onSelectBranch) onSelectBranch(targetBid);

    const hasConv = conversations.some(c => c.branchId === targetBid);
    if (hasConv) {
      setIsOpen(true);
      loadConversations(targetBid);
      if (pendingConsultProduct) {
        handleSendProductConsultation([pendingConsultProduct.productId || pendingConsultProduct.id]);
      }
    } else {
      // Chi nhánh chưa có cuộc trò chuyện nào -> Mở popup Tạo Yêu Cầu Hỗ Trợ / Tư Vấn Mới với nội dung món ăn
      newChatForm.setFieldsValue({
        branchId: targetBid,
        topic: "Menu",
        subject: `Tư vấn món: ${pendingConsultProduct?.name || "Món ăn"}`,
        firstMessageContent: `Tôi cần tư vấn về món ăn "${pendingConsultProduct?.name || ''}"${pendingConsultProduct?.price ? ` - Giá: ${formatPrice(pendingConsultProduct.price)}` : ''}. Vui lòng hỗ trợ thông tin giúp tôi!`
      });
      setNewChatModalOpen(true);
    }
  };

  const handleOpenNewChatModal = (bid = currentBranchId) => {
    newChatForm.setFieldsValue({
      branchId: bid,
      topic: "Menu",
      subject: "",
      firstMessageContent: ""
    });
    setNewChatModalOpen(true);
  };

  const handleCreateNewChat = async (values) => {
    setSubmittingNewChat(true);
    try {
      const bid = values.branchId || currentBranchId;
      if (isAuthenticated) {
        await openCustomerConversation({
          branchId: bid,
          topic: values.topic || "Menu",
          subject: values.subject?.trim() || null,
          firstMessageContent: values.firstMessageContent?.trim(),
          preferredContactMethod: "Chat"
        });
      } else {
        await sendGuestChatMessage({
          branchId: bid,
          content: values.firstMessageContent?.trim(),
          topic: values.topic || "Menu",
          subject: values.subject?.trim() || null,
          messageType: "Text"
        });
      }
      antMessage.success("Đã gửi yêu cầu tư vấn thành công!");
      setNewChatModalOpen(false);
      newChatForm.resetFields();
      setCurrentBranchId(bid);
      setIsOpen(true);
      await loadConversations(bid);
    } catch (err) {
      console.error("Lỗi tạo yêu cầu:", err);
      antMessage.error("Không thể gửi yêu cầu tư vấn. Vui lòng thử lại!");
    } finally {
      setSubmittingNewChat(false);
    }
  };

  // Chuyển đổi chi nhánh
  const handleBranchChange = (newBranchId) => {
    setCurrentBranchId(newBranchId);
    if (onSelectBranch) onSelectBranch(newBranchId);
    loadConversations(newBranchId);
  };

  // Gửi tin nhắn văn bản
  const handleSendMessage = async () => {
    if (!inputText.trim() || sending || !currentBranchId) return;

    // Nếu chi nhánh chưa có cuộc trò chuyện nào, mở popup Tạo Yêu Cầu Hỗ Trợ Mới
    const hasConv = conversations.some(c => c.branchId === currentBranchId);
    if (!hasConv && !activeConversation) {
      newChatForm.setFieldsValue({
        branchId: currentBranchId,
        topic: "Other",
        subject: "Yêu cầu hỗ trợ",
        firstMessageContent: inputText.trim()
      });
      setInputText('');
      setNewChatModalOpen(true);
      return;
    }

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      let res;
      if (isAuthenticated) {
        let convId = activeConversation?.id;
        if (!convId) {
          const newConvRes = await openCustomerConversation({
            branchId: currentBranchId,
            topic: 'Khác',
            subject: 'Khách hàng liên hệ'
          });
          convId = newConvRes.data.id;
        }
        res = await sendCustomerChatMessage(convId, content);
      } else {
        res = await sendGuestChatMessage({
          branchId: currentBranchId,
          conversationId: activeConversation?.id || null,
          content: content,
          messageType: 'Text'
        });
      }

      if (res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        if (!activeConversation) {
          loadConversations(currentBranchId);
        }
      }
    } catch {
      antMessage.error('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  // Gửi tư vấn món ăn
  const handleSendProductConsultation = async (productIds) => {
    if (!productIds || productIds.length === 0 || !currentBranchId || sending) return;

    // Nếu chi nhánh chưa có cuộc trò chuyện nào, mở popup Tạo Yêu Cầu Hỗ Trợ Mới
    const hasConv = conversations.some(c => c.branchId === currentBranchId);
    if (!hasConv && !activeConversation) {
      newChatForm.setFieldsValue({
        branchId: currentBranchId,
        topic: "Menu",
        subject: "Tư vấn món ăn từ thực đơn",
        firstMessageContent: "Tôi muốn được tư vấn thêm về các món ăn trong thực đơn của chi nhánh."
      });
      setNewChatModalOpen(true);
      return;
    }

    setSending(true);
    try {
      let res;
      if (isAuthenticated) {
        let convId = activeConversation?.id;
        if (!convId) {
          const newConvRes = await openCustomerConversation({
            branchId: currentBranchId,
            topic: 'Khác',
            subject: 'Khách hàng liên hệ'
          });
          convId = newConvRes.data.id;
        }
        res = await sendCustomerProductConsultation({
          branchId: currentBranchId,
          conversationId: convId,
          productIds: productIds
        });
      } else {
        res = await sendGuestProductConsultation({
          branchId: currentBranchId,
          conversationId: activeConversation?.id || null,
          productIds: productIds
        });
      }

      if (res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        antMessage.success('Đã gửi yêu cầu tư vấn món ăn tới nhân viên.');
        if (!activeConversation) {
          loadConversations(currentBranchId);
        }
      }
    } catch {
      antMessage.error('Không thể gửi yêu cầu tư vấn. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const handleToggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setUnreadCount(0);
      if (currentBranchId) {
        loadConversations(currentBranchId);
      }
    }
  };

  const currentBranchName =
    branches.find((b) => b.id === currentBranchId)?.name || 'Chi nhánh';

  return (
    <>
      {/* Nút Chat nổi cố định */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1050 }}>
        {!isOpen && (
          <Badge count={unreadCount} overflowCount={99}>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<CustomerServiceOutlined style={{ fontSize: 26 }} />}
              onClick={handleToggleOpen}
              style={{
                width: 60,
                height: 60,
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                borderColor: '#ea580c',
                boxShadow: '0 8px 24px rgba(234, 88, 12, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </Badge>
        )}

        {/* Khung Chat nổi */}
        {isOpen && (
          <div
            style={{
              width: 380,
              maxWidth: 'calc(100vw - 32px)',
              height: 520,
              maxHeight: 520,
              background: '#ffffff',
              borderRadius: 16,
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18)',
              border: '1px solid #fed7aa',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Header Khung Chat */}
            <div
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                padding: '12px 16px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <Avatar
                  style={{ background: '#ffffff', color: '#ea580c' }}
                  icon={<CustomerServiceOutlined />}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                    Hỗ trợ trực tuyến
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
                    {isAuthenticated ? (customer?.fullName || 'Khách hàng') : (guestSession?.guestName || 'Khách vãng lai')}
                  </div>
                </div>
              </div>

              <Button
                type="text"
                shape="circle"
                icon={<CloseOutlined style={{ color: '#fff', fontSize: 16 }} />}
                onClick={handleToggleOpen}
              />
            </div>

            {/* Chi nhánh Chat Selector */}
            <div
              style={{
                padding: '8px 12px',
                background: '#fffaf5',
                borderBottom: '1px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <ShopOutlined style={{ color: '#ea580c', fontSize: 15 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', flexShrink: 0 }}>
                Chi nhánh:
              </span>
              <Select
                value={currentBranchId}
                onChange={handleBranchChange}
                size="small"
                style={{ flex: 1, borderRadius: 6 }}
                placeholder="Chọn chi nhánh chat"
              >
                {activeBranches.map((b) => (
                  <Option key={b.id} value={b.id}>
                    {b.name}
                  </Option>
                ))}
              </Select>
            </div>

            {/* Vùng hiển thị tin nhắn (Locked Height Scroll) */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 14px',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <Spin tip="Đang tải tin nhắn..." />
                </div>
              ) : messages.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px 14px',
                    color: '#64748b',
                    fontSize: 13,
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px dashed #fed7aa',
                    margin: 'auto 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <CustomerServiceOutlined style={{ fontSize: 36, color: '#ea580c', marginBottom: 10 }} />
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                    Chào mừng bạn đến với MenuGo!
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#64748b', lineHeight: 1.5, maxWidth: 280, marginBottom: 16 }}>
                    Chi nhánh này chưa có cuộc trò chuyện nào. Bấm nút dưới để tạo yêu cầu tư vấn mới.
                  </div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenNewChatModal(currentBranchId)}
                    style={{
                      background: '#ea580c',
                      borderColor: '#ea580c',
                      fontWeight: 600,
                      borderRadius: 8,
                      height: 38,
                      boxShadow: '0 2px 8px rgba(234, 88, 12, 0.3)'
                    }}
                  >
                    Tạo yêu cầu tư vấn mới
                  </Button>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = isAuthenticated ? (m.customerId === customer?.id) : (!m.employeeName);
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        marginBottom: 4
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: '#94a3b8',
                          marginBottom: 3,
                          padding: '0 4px'
                        }}
                      >
                        {isMe ? 'Bạn' : (m.employeeName || `MenuGo - ${currentBranchName}`)}
                      </div>

                      <div
                        style={{
                          maxWidth: '85%',
                          padding: '10px 14px',
                          borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          background: isMe ? '#ea580c' : '#ffffff',
                          color: isMe ? '#ffffff' : '#1e293b',
                          boxShadow: isMe
                            ? '0 2px 8px rgba(234, 88, 12, 0.25)'
                            : '0 1px 3px rgba(0, 0, 0, 0.08)',
                          fontSize: 13,
                          lineHeight: 1.45,
                          wordBreak: 'break-word',
                          border: isMe ? 'none' : '1px solid #f1f5f9'
                        }}
                      >
                        {m.content}
                        {m.messageType === 'ProductReference' && (
                          <ProductConsultationCard metadataJson={m.metadataJson} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Action Toolbar & Input Area */}
            <div style={{ background: '#ffffff', borderTop: '1px solid #f1f5f9', padding: '8px 10px' }}>
              {/* Quick actions */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <Button
                  size="small"
                  icon={<AppstoreAddOutlined style={{ color: '#ea580c' }} />}
                  onClick={() => setMenuModalOpen(true)}
                  style={{
                    borderRadius: 6,
                    fontSize: 12,
                    borderColor: '#fed7aa',
                    background: '#fffaf5',
                    color: '#ea580c',
                    fontWeight: 600
                  }}
                >
                  Chọn món tư vấn
                </Button>
              </div>

              {/* Input Form */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  placeholder="Nhập tin nhắn..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onPressEnter={handleSendMessage}
                  disabled={sending || !currentBranchId}
                  style={{ borderRadius: 8, fontSize: 13 }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  loading={sending}
                  disabled={!inputText.trim() || !currentBranchId}
                  style={{
                    background: '#ea580c',
                    borderColor: '#ea580c',
                    borderRadius: 8
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Chọn Món Ăn Tư Vấn */}
      <SelectProductConsultationModal
        open={menuModalOpen}
        onClose={() => setMenuModalOpen(false)}
        branchId={currentBranchId}
        onConfirmSend={handleSendProductConsultation}
        loading={sending}
      />

      {/* Modal Chọn Chi Nhánh Tư Vấn */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
            <ShopOutlined style={{ color: '#ea580c' }} /> Chọn chi nhánh tư vấn
          </div>
        }
        open={branchSelectModalOpen}
        onCancel={() => setBranchSelectModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setBranchSelectModalOpen(false)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleConfirmBranchForConsult}
            style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 600 }}
          >
            Tiếp tục
          </Button>
        ]}
        destroyOnClose
        centered
        width={450}
      >
        {pendingConsultProduct && (
          <div style={{ padding: '10px', background: '#fffaf5', borderRadius: 8, border: '1px solid #fed7aa', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={pendingConsultProduct.imageLink || pendingConsultProduct.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80'}
              alt={pendingConsultProduct.name}
              style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }}
            />
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{pendingConsultProduct.name}</div>
              <div style={{ fontWeight: 600, color: '#ea580c', fontSize: 13 }}>{formatPrice(pendingConsultProduct.price)}</div>
            </div>
          </div>
        )}
        <div style={{ marginBottom: 8, fontWeight: 600, color: '#334155', fontSize: 13 }}>
          Vui lòng chọn chi nhánh bạn muốn nhận tư vấn:
        </div>
        <Select
          style={{ width: '100%' }}
          size="large"
          value={selectedBranchForConsult}
          onChange={(val) => setSelectedBranchForConsult(val)}
          placeholder="Chọn chi nhánh nhà hàng..."
        >
          {activeBranches.map(b => (
            <Option key={b.id} value={b.id}>
              {b.name} ({b.addressText || 'Chi nhánh MenuGo'})
            </Option>
          ))}
        </Select>
      </Modal>

      {/* Modal Tạo Yêu Cầu Hỗ Trợ / Tư Vấn Mới */}
      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>
            Tạo Yêu Cầu Hỗ Trợ / Tư Vấn Mới
          </span>
        }
        open={newChatModalOpen}
        onCancel={() => setNewChatModalOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width={480}
      >
        <Form
          form={newChatForm}
          layout="vertical"
          onFinish={handleCreateNewChat}
          initialValues={{ topic: 'Menu', preferredContactMethod: 'Chat' }}
          size="large"
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="branchId"
            label={<span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>Chi nhánh cần tư vấn</span>}
            rules={[{ required: true, message: 'Vui lòng chọn chi nhánh!' }]}
          >
            <Select placeholder="Chọn chi nhánh nhà hàng...">
              {activeBranches.map(b => (
                <Option key={b.id} value={b.id}>
                  {b.name} ({b.addressText || 'Chi nhánh MenuGo'})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="topic"
            label={<span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>Chủ đề yêu cầu</span>}
            rules={[{ required: true, message: 'Vui lòng chọn chủ đề!' }]}
          >
            <Select>
              <Option value="Menu">Thực đơn & Món ăn</Option>
              <Option value="Booking">Lịch đặt bàn</Option>
              <Option value="Event">Đặt tiệc / Sự kiện</Option>
              <Option value="Pricing">Báo giá & Ưu đãi</Option>
              <Option value="Allergy">Dị ứng & Ghi chú món</Option>
              <Option value="Other">Yêu cầu khác</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label={<span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>Tiêu đề tóm tắt (Tùy chọn)</span>}
          >
            <Input placeholder="Ví dụ: Tư vấn món lẩu, đặt bàn..." maxLength={100} />
          </Form.Item>

          <Form.Item
            name="firstMessageContent"
            label={<span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>Nội dung lời nhắn</span>}
            rules={[{ required: true, message: 'Vui lòng nhập nội dung tin nhắn!' }]}
          >
            <Input.TextArea
              placeholder="Nhập nội dung cần chi nhánh hỗ trợ giải đáp..."
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <Button onClick={() => setNewChatModalOpen(false)}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submittingNewChat}
                style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 600 }}
              >
                Gửi yêu cầu
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default FloatingChatWidget;
