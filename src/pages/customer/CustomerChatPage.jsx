import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Layout,
  Input,
  Button,
  Card,
  Avatar,
  List,
  Badge,
  Modal,
  Form,
  Select,
  Spin,
  Typography,
  Space,
  Tag,
  message
} from 'antd';
import {
  MessageOutlined,
  SendOutlined,
  ArrowLeftOutlined,
  ShopOutlined,
  PlusOutlined,
  EllipsisOutlined,
  AppstoreOutlined,
  HomeOutlined,
  SearchOutlined,
  UpOutlined,
  DownOutlined,
  CloseOutlined,
  AppstoreAddOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useSignalR } from '../../context/SignalRContext';
import { getAllBranches } from '../../api/branchApi';
import {
  getCustomerConversations,
  getCustomerConversationDetails,
  openCustomerConversation,
  sendCustomerChatMessage
} from '../../api/customerPortalApi';
import { sendCustomerProductConsultation } from '../../api/guestChatApi';
import ProductConsultationCard from '../../components/chat/ProductConsultationCard';
import SelectProductConsultationModal from '../../components/chat/SelectProductConsultationModal';
import dayjs from 'dayjs';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// Helper chuyển thứ trong tuần sang tiếng Việt (CN, T2, T3, T4, T5, T6, T7)
const getVietnameseDayOfWeek = (date) => {
  const day = dayjs(date).day();
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return dayNames[day] || '';
};

// Helper hiển thị tên chủ đề tiếng Việt
const formatTopicLabel = (topic, subject) => {
  let topicText = 'Yêu cầu hỗ trợ';
  switch (topic) {
    case 'Booking':
      topicText = 'Lịch đặt bàn';
      break;
    case 'Event':
      topicText = 'Đặt tiệc/ sự kiện';
      break;
    case 'Menu':
      topicText = 'Thực đơn';
      break;
    case 'Pricing':
      topicText = 'Báo giá';
      break;
    case 'Allergy':
      topicText = 'Dị ứng thực phẩm';
      break;
    case 'Other':
      topicText = 'Khác';
      break;
    case 'General':
      topicText = 'Yêu cầu hỗ trợ';
      break;
    default:
      topicText = topic || 'Yêu cầu hỗ trợ';
      break;
  }
  return subject ? `${topicText}: ${subject}` : topicText;
};

// Helper làm nổi bật từ khóa bên trong nội dung tin nhắn
const renderHighlightedText = (content, keyword) => {
  if (!keyword || !keyword.trim() || !content) return content;
  const escapedKeyword = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  const parts = content.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <span
        key={i}
        style={{
          backgroundColor: '#fde047',
          color: '#0f172a',
          fontWeight: 700,
          padding: '1px 4px',
          borderRadius: 4,
          boxShadow: '0 0 0 1px #eab308'
        }}
      >
        {part}
      </span>
    ) : (
      part
    )
  );
};

const CustomerChatPage = () => {
  const { customer } = useCustomerAuth();
  const connection = useSignalR();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [branches, setBranches] = useState([]);
  const [inputText, setInputText] = useState('');
  
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [submittingNewChat, setSubmittingNewChat] = useState(false);
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultLoading, setConsultLoading] = useState(false);

  // Quick navigation modal (Chỉ Chủ đề)
  const [quickNavOpen, setQuickNavOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  // In-chat message search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const searchInputRef = useRef(null);

  const messagesContainerRef = useRef(null);
  const [form] = Form.useForm();

  // Danh sách các ID tin nhắn khớp với từ khóa tìm kiếm (Sắp xếp từ gần nhất tới xa nhất)
  const matchedMessageIds = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.trim().toLowerCase();
    return messages
      .filter(m => m.content && m.content.toLowerCase().includes(term))
      .map(m => m.id)
      .reverse(); // Ưu tiên từ tin nhắn gần nhất (mới nhất) tới xa nhất (cũ nhất)
  }, [messages, searchTerm]);

  // Tự động cuộn tới tin nhắn gần nhất khi có kết quả tìm kiếm mới
  useEffect(() => {
    if (matchedMessageIds.length > 0) {
      setSearchIndex(0);
      scrollToMessage(matchedMessageIds[0], true);
    } else if (showSearch) {
      setHighlightedMessageId(null);
    }
  }, [matchedMessageIds]);

  const handlePrevMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const newIndex = (searchIndex - 1 + matchedMessageIds.length) % matchedMessageIds.length;
    setSearchIndex(newIndex);
    scrollToMessage(matchedMessageIds[newIndex], true);
  };

  const handleNextMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const newIndex = (searchIndex + 1) % matchedMessageIds.length;
    setSearchIndex(newIndex);
    scrollToMessage(matchedMessageIds[newIndex], true);
  };

  // Fetch conversations list
  const fetchConversations = async (selectId = null) => {
    setLoadingList(true);
    try {
      const res = await getCustomerConversations();
      const currentActive = selectId || activeConvId;
      setConversations(
        (res.data || []).map((c) =>
          c.id === currentActive ? { ...c, unreadCount: 0 } : c
        )
      );
      if (res.data.length > 0 && !activeConvId && !selectId) {
        handleSelectConversation(res.data[0].id);
      } else if (selectId) {
        handleSelectConversation(selectId);
      }
    } catch (error) {
      message.error('Không thể tải danh sách cuộc trò chuyện');
    } finally {
      setLoadingList(false);
    }
  };

  // Fetch branches for new conversation selection
  const fetchBranches = async () => {
    try {
      const res = await getAllBranches();
      setBranches(res.data.filter(b => !b.isDeleted && b.status !== "Ngừng kinh doanh"));
    } catch (error) {
      message.error('Không thể tải danh sách chi nhánh');
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchBranches();
  }, []);

  // Real-time listener via SignalR
  useEffect(() => {
    if (connection && customer) {
      connection.invoke('JoinCustomerGroup', customer.id)
        .catch(err => console.warn('JoinCustomerGroup SignalR error:', err));

      const handleNewMessage = (msg) => {
        if (msg.conversationId === activeConvId) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();
        }
        fetchConversations(activeConvId);
      };

      const handleAssigned = (update) => {
        if (update.id === activeConvId) {
          fetchMessages(activeConvId);
        }
        fetchConversations(activeConvId);
      };

      connection.on('ReceiveNewMessage', handleNewMessage);
      connection.on('ConversationAssigned', handleAssigned);

      return () => {
        connection.off('ReceiveNewMessage', handleNewMessage);
        connection.off('ConversationAssigned', handleAssigned);
      };
    }
  }, [connection, activeConvId, customer]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const fetchMessages = async (convId, targetMessageId = null) => {
    setLoadingDetail(true);
    try {
      const res = await getCustomerConversationDetails(convId);
      setMessages(res.data.messages || []);
      if (targetMessageId) {
        scrollToMessage(targetMessageId);
      } else {
        scrollToBottom();
      }
    } catch (error) {
      message.error('Không thể tải nội dung tin nhắn');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectConversation = (id, targetMessageId = null) => {
    setActiveConvId(id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
    fetchMessages(id, targetMessageId);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const res = await sendCustomerChatMessage(activeConvId, textToSend);
      setMessages(prev => {
        if (prev.some(m => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      scrollToBottom();
      fetchConversations(activeConvId);
    } catch (error) {
      message.error('Không thể gửi tin nhắn.');
      setInputText(textToSend);
    }
  };

  const handleCreateNewConversation = async (values) => {
    setSubmittingNewChat(true);
    try {
      const res = await openCustomerConversation({
        branchId: values.branchId,
        topic: values.topic,
        subject: values.subject || null,
        preferredContactMethod: values.preferredContactMethod || 'Chat',
        firstMessageContent: values.firstMessageContent
      });

      const newId = res.data?.conversationId || res.data?.id;
      message.success('Đã tạo cuộc trò chuyện mới!');
      setNewChatModalOpen(false);
      form.resetFields();
      await fetchConversations(newId);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tạo cuộc trò chuyện.');
    } finally {
      setSubmittingNewChat(false);
    }
  };

  const handleSendProductConsultation = async (productIds) => {
    if (!activeConversation?.branchId || !productIds || productIds.length === 0) return;
    setConsultLoading(true);
    try {
      const res = await sendCustomerProductConsultation({
        branchId: activeConversation.branchId,
        conversationId: activeConvId,
        productIds: productIds
      });
      if (res.data) {
        setMessages(prev => {
          if (prev.some(m => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        scrollToBottom();
        message.success('Đã gửi thông tin món ăn vào cuộc trò chuyện!');
        fetchConversations(activeConvId);
      }
    } catch (error) {
      message.error('Không thể gửi thông tin món ăn.');
    } finally {
      setConsultLoading(false);
    }
  };

  // Cuộn tới vị trí tin nhắn và highlight
  const scrollToMessage = (msgId, isFromSearch = false) => {
    setQuickNavOpen(false);
    setHighlightedMessageId(msgId);
    setTimeout(() => {
      const el = document.getElementById(`customer-msg-item-${msgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);

    // Nếu không phải đang trong chế độ tìm kiếm thì mới tự tắt highlight sau 3s
    if (!isFromSearch && !showSearch && !searchTerm) {
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConvId);

  // Danh sách các mốc chủ đề trong cuộc trò chuyện gộp
  const topicMilestones = messages
    .filter((m, idx) => m.topic || idx === 0)
    .map((m, idx) => ({
      id: m.id,
      topic: m.topic || activeConversation?.topic,
      subject: m.subject || activeConversation?.subject,
      createdAt: m.createdAt,
      content: m.content
    }));

  // Logic tính toán Separator giữa 2 tin nhắn gần nhất
  const shouldRenderSeparator = (currMsg, prevMsg, index) => {
    if (index === 0) return true;
    if (currMsg.topic) return true; // Có mốc chủ đề mới
    if (!prevMsg) return true;

    const currTime = dayjs(currMsg.createdAt);
    const prevTime = dayjs(prevMsg.createdAt);

    const isDifferentDay = !currTime.isSame(prevTime, 'day');
    const diffMinutes = Math.abs(currTime.diff(prevTime, 'minute'));

    return isDifferentDay || diffMinutes >= 5;
  };

  const getSeparatorText = (currMsg, index) => {
    const currTime = dayjs(currMsg.createdAt);
    const isToday = currTime.isSame(dayjs(), 'day');
    const dow = getVietnameseDayOfWeek(currTime);
    const timeStr = currTime.format('HH:mm');
    const dateStr = currTime.format('DD/MM/YY');

    // Mốc chủ đề của tin nhắn hiện tại hoặc của tin nhắn đầu tiên
    const topicToUse = currMsg.topic || (index === 0 ? activeConversation?.topic : null);
    const subjectToUse = currMsg.subject || (index === 0 ? activeConversation?.subject : null);
    const hasSpecificTopic = Boolean(topicToUse && topicToUse !== 'General');

    if (hasSpecificTopic) {
      const topicLabel = formatTopicLabel(topicToUse, subjectToUse);
      if (isToday) {
        return `${topicLabel} - ${timeStr}`;
      } else {
        return `${topicLabel} - ${timeStr} - ${dow} - ${dateStr}`;
      }
    }

    if (isToday) {
      return timeStr;
    }

    return `${timeStr} - ${dow} - ${dateStr}`;
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        fontFamily: "'Be Vietnam Pro', sans-serif"
      }}
    >
      {/* Top Header */}
      <div
        style={{
          background: '#fff',
          padding: '12px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/customer/dashboard')}
            style={{ fontWeight: 600 }}
          >
            Về Dashboard
          </Button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
            💬 Hỗ Trợ & Tư Vấn Khách Hàng
          </span>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setNewChatModalOpen(true)}
          style={{ background: '#ea580c', borderColor: '#ea580c', fontWeight: 600, borderRadius: 8 }}
        >
          Tạo Yêu Cầu Tư Vấn Mới
        </Button>
      </div>

      {/* Main Workspace Layout */}
      <div style={{ flex: 1, padding: 16, overflow: 'hidden', display: 'flex' }}>
        <Card
          styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' } }}
          bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            flex: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <Layout style={{ background: '#fff', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'row', flex: 1 }}>
            {/* Left Conversations Sidebar */}
            <Sider
              width={320}
              theme="light"
              style={{
                borderRight: '1px solid #e2e8f0',
                background: '#fff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  fontWeight: 700,
                  color: '#1e293b',
                  fontSize: 16,
                  flexShrink: 0
                }}
              >
                Các Yêu Cầu Của Bạn
              </div>

              {loadingList ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
              ) : (
                <List
                  style={{ flex: 1, overflowY: 'auto' }}
                  dataSource={conversations}
                  renderItem={item => (
                    <List.Item
                      onClick={() => handleSelectConversation(item.id)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        background: item.id === activeConvId ? '#fff7ed' : 'transparent',
                        borderLeft: item.id === activeConvId ? '4px solid #ea580c' : '4px solid transparent',
                        transition: 'all 0.2s'
                      }}
                      className="chat-thread-item"
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<ShopOutlined />} style={{ background: '#ffedd5', color: '#ea580c' }} />}
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: item.id === activeConvId ? 700 : 600, color: '#1e293b' }}>
                              Chi nhánh {item.branchName}
                            </span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              {dayjs(item.updatedAt).format('HH:mm')}
                            </span>
                          </div>
                        }
                        description={
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                              <Text type="secondary" ellipsis style={{ display: 'block', fontSize: 12, maxWidth: 200 }}>
                                {formatTopicLabel(item.topic, item.subject)}
                              </Text>
                              {item.unreadCount > 0 && (
                                <Badge count={item.unreadCount} style={{ backgroundColor: '#ef4444' }} />
                              )}
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có cuộc trò chuyện nào</div> }}
                />
              )}
            </Sider>

            {/* Main Message Panel */}
            <Layout style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', flex: 1, minWidth: 0 }}>
              {activeConvId ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', flex: 1, minHeight: 0 }}>
                  {/* Active chat header (CỐ ĐỊNH) */}
                  <div
                    style={{
                      padding: '12px 24px',
                      background: '#fff',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexShrink: 0,
                      zIndex: 10
                    }}
                  >
                    {/* Bên trái: Tên chi nhánh & Chủ đề */}
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', display: 'block' }}>
                        MenuGo - Chi nhánh {activeConversation?.branchName}
                      </span>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Chủ đề: {formatTopicLabel(activeConversation?.topic, activeConversation?.subject)}
                      </Text>
                    </div>

                    {/* Bên phải: Nút 3 chấm mở danh sách Chủ đề */}
                    <Button
                      type="text"
                      icon={<EllipsisOutlined style={{ fontSize: 22, color: '#334155' }} />}
                      onClick={() => setQuickNavOpen(true)}
                      title="Xem danh sách Chủ đề của bạn"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  {/* Messages Display Area */}
                  <Content
                    ref={messagesContainerRef}
                    onClick={() => {
                      if (activeConvId) {
                        setConversations((prev) =>
                          prev.map((c) => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c))
                        );
                      }
                    }}
                    style={{
                      padding: '20px 24px',
                      overflowY: 'auto',
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    {loadingDetail ? (
                      <div style={{ textAlign: 'center', margin: 'auto' }}><Spin size="large" /></div>
                    ) : (
                      <>
                        {messages.map((msg, index) => {
                          const isMine = msg.customerId === customer?.id;
                          const prevMsg = index > 0 ? messages[index - 1] : null;
                          const renderSeparator = shouldRenderSeparator(msg, prevMsg, index);
                          const separatorText = renderSeparator ? getSeparatorText(msg, index) : '';
                          const isHighlighted = highlightedMessageId === msg.id;
                          const isMatchedInSearch = showSearch && Boolean(searchTerm.trim()) && matchedMessageIds.includes(msg.id);

                          return (
                            <React.Fragment key={msg.id || index}>
                              {/* Thanh ngắt hiển thị Chủ đề / Thời gian */}
                              {renderSeparator && (
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    margin: index === 0 ? '4px 0 12px 0' : '16px 0 12px 0'
                                  }}
                                >
                                  <span
                                    style={{
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      padding: '4px 14px',
                                      borderRadius: 16,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      border: '1px solid #e2e8f0',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                      textAlign: 'center',
                                      letterSpacing: '0.2px'
                                    }}
                                  >
                                    {separatorText}
                                  </span>
                                </div>
                              )}

                              {/* Bong bóng tin nhắn */}
                              <div
                                id={`customer-msg-item-${msg.id}`}
                                style={{
                                  display: 'flex',
                                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                                  width: '100%',
                                  transition: 'all 0.4s ease'
                                }}
                              >
                                <div
                                  style={{
                                    maxWidth: '70%',
                                    background: isMine ? '#ea580c' : '#fff',
                                    color: isMine ? '#fff' : '#1e293b',
                                    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    padding: '10px 16px',
                                    boxShadow: isHighlighted
                                      ? '0 0 0 4px #93c5fd, 0 4px 16px rgba(37, 99, 235, 0.45)'
                                      : isMatchedInSearch
                                        ? '0 0 0 2px #dbeafe'
                                        : '0 1px 2px rgba(0, 0, 0, 0.05)',
                                    border: isHighlighted
                                      ? '2.5px solid #2563eb'
                                      : isMatchedInSearch
                                        ? '2px dashed #3b82f6'
                                        : isMine
                                          ? 'none'
                                          : '1px solid #e2e8f0',
                                    position: 'relative',
                                    transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                                    transition: 'all 0.3s ease'
                                  }}
                                >
                                  {!isMine && (
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f97316', marginBottom: 4 }}>
                                      {msg.employeeName || 'MenuGo'}
                                    </div>
                                  )}
                                  <div style={{ fontSize: 14, wordBreak: 'break-word', lineHeight: 1.5 }}>
                                    {renderHighlightedText(msg.content, showSearch ? searchTerm : '')}
                                  </div>
                                  {msg.messageType === 'ProductReference' && (
                                    <ProductConsultationCard metadataJson={msg.metadataJson} />
                                  )}
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: isMine ? '#ffedd5' : '#94a3b8',
                                      textAlign: 'right',
                                      marginTop: 4,
                                      fontWeight: 500
                                    }}
                                  >
                                    {dayjs(msg.createdAt).format('HH:mm')}
                                  </div>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </>
                    )}
                  </Content>

                  {/* Search Bar nổi bật khi bật tìm kiếm */}
                  {showSearch && (
                    <div
                      style={{
                        padding: '10px 20px',
                        background: '#fff7ed',
                        borderTop: '1px solid #fed7aa',
                        borderBottom: '1px solid #fed7aa',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexShrink: 0
                      }}
                    >
                      <Input
                        ref={searchInputRef}
                        placeholder="Tìm kiếm từ khóa trong đoạn chat..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        prefix={<SearchOutlined style={{ color: '#ea580c' }} />}
                        allowClear
                        style={{ flex: 1, borderRadius: 6 }}
                        onPressEnter={handleNextMatch}
                      />
                      {searchTerm.trim() && (
                        <span style={{ fontSize: 13, color: '#9a3412', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {matchedMessageIds.length > 0 ? `${searchIndex + 1}/${matchedMessageIds.length} kết quả` : 'Không tìm thấy'}
                        </span>
                      )}
                      <Button
                        size="small"
                        icon={<UpOutlined />}
                        disabled={matchedMessageIds.length <= 1}
                        onClick={handleNextMatch}
                        title="Tin nhắn cũ hơn (ở trên)"
                      />
                      <Button
                        size="small"
                        icon={<DownOutlined />}
                        disabled={matchedMessageIds.length <= 1}
                        onClick={handlePrevMatch}
                        title="Tin nhắn mới hơn (ở dưới)"
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={() => {
                          setShowSearch(false);
                          setSearchTerm('');
                          setHighlightedMessageId(null);
                        }}
                        title="Đóng tìm kiếm"
                      />
                    </div>
                  )}

                  {/* Bottom Input Action Bar */}
                  {activeConversation?.status !== 'Closed' ? (
                    <div
                      style={{
                        padding: '16px 24px',
                        background: '#fff',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        flexShrink: 0
                      }}
                    >
                      {/* Nút Chọn món ăn tư vấn */}
                      <Button
                        icon={<AppstoreAddOutlined />}
                        onClick={() => setConsultModalOpen(true)}
                        style={{
                          height: 38,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          borderRadius: 8,
                          borderColor: '#fed7aa',
                          color: '#ea580c',
                          background: '#fffaf5',
                          fontWeight: 600
                        }}
                        title="Chọn món ăn từ thực đơn để gửi tư vấn"
                      >
                        Chọn món
                      </Button>

                      {/* Nút Kính Lúp bên trái Nhập tin nhắn */}
                      <Button
                        icon={<SearchOutlined />}
                        onClick={() => {
                          setShowSearch(prev => {
                            const next = !prev;
                            if (next) {
                              setTimeout(() => searchInputRef.current?.focus(), 150);
                            } else {
                              setSearchTerm('');
                              setHighlightedMessageId(null);
                            }
                            return next;
                          });
                        }}
                        style={{
                          height: 38,
                          width: 38,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 8,
                          borderColor: showSearch ? '#ea580c' : '#cbd5e1',
                          color: showSearch ? '#ea580c' : '#64748b',
                          background: showSearch ? '#fff7ed' : '#fff'
                        }}
                        title="Tìm kiếm tin nhắn trong đoạn chat"
                      />
                      <Input.TextArea
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder="Nhập tin nhắn phản hồi chi nhánh..."
                        autoSize={{ minRows: 1, maxRows: 3 }}
                        onPressEnter={e => {
                          if (!e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        style={{ borderRadius: 8, flex: 1 }}
                      />
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={handleSendMessage}
                        style={{
                          height: 38,
                          background: '#ea580c',
                          borderColor: '#ea580c',
                          borderRadius: 8,
                          padding: '0 20px',
                          fontWeight: 600
                        }}
                      >
                        Gửi
                      </Button>
                    </div>
                  ) : (
                    <div style={{ padding: '16px 24px', background: '#f1f5f9', textAlign: 'center', color: '#64748b', fontWeight: 500, flexShrink: 0 }}>
                      Cuộc trò chuyện này đã đóng. Nếu cần hỗ trợ thêm, vui lòng tạo yêu cầu tư vấn mới.
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    margin: 'auto',
                    textAlign: 'center',
                    color: '#94a3b8',
                    padding: 48
                  }}
                >
                  <MessageOutlined style={{ fontSize: 64, color: '#cbd5e1', marginBottom: 16 }} />
                  <Title level={5} style={{ color: '#64748b', margin: 0 }}>
                    Hãy chọn một cuộc trò chuyện từ danh sách bên trái hoặc tạo yêu cầu tư vấn mới.
                  </Title>
                </div>
              )}
            </Layout>
          </Layout>
        </Card>
      </div>

      {/* Modal Lựa chọn Chủ đề của Khách hàng (KHÔNG CÓ TAB NHÂN VIÊN) */}
      <Modal
        open={quickNavOpen}
        onCancel={() => setQuickNavOpen(false)}
        footer={null}
        width={480}
        centered
        title={
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            Chủ Đề Của Bạn ({topicMilestones.length})
          </span>
        }
      >
        <div style={{ maxHeight: 380, overflowY: 'auto', paddingRight: 4, marginTop: 12 }}>
          {topicMilestones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
              Bạn chưa có chủ đề nào.
            </div>
          ) : (
            <List
              dataSource={topicMilestones}
              renderItem={(m, idx) => {
                return (
                  <div
                    key={m.id || idx}
                    onClick={() => scrollToMessage(m.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      marginBottom: 8
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fff7ed';
                      e.currentTarget.style.borderColor = '#fed7aa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                        {formatTopicLabel(m.topic, m.subject)}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {dayjs(m.createdAt).format('HH:mm DD/MM')}
                      </span>
                    </div>
                    {m.content && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.content}
                      </div>
                    )}
                  </div>
                );
              }}
            />
          )}
        </div>
      </Modal>

      {/* Modal Tạo Yêu Cầu Hỗ Trợ Mới */}
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
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateNewConversation}
          initialValues={{ topic: 'Booking', preferredContactMethod: 'Chat' }}
          size="large"
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="branchId"
            label={<span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>Chi nhánh cần tư vấn</span>}
            rules={[{ required: true, message: 'Vui lòng chọn chi nhánh!' }]}
          >
            <Select placeholder="Chọn chi nhánh nhà hàng...">
              {branches.map(b => (
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
              <Option value="Booking">Lịch đặt bàn</Option>
              <Option value="Menu">Thực đơn & Món ăn</Option>
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
            <Input placeholder="Ví dụ: Đặt tiệc sinh nhật 15 người..." maxLength={100} />
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

      {/* Modal Chọn món ăn tư vấn */}
      <SelectProductConsultationModal
        open={consultModalOpen}
        onClose={() => setConsultModalOpen(false)}
        branchId={activeConversation?.branchId}
        onConfirmSend={handleSendProductConsultation}
        loading={consultLoading}
      />
    </div>
  );
};

export default CustomerChatPage;
