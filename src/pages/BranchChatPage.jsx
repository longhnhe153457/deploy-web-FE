import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layout,
  Input,
  Button,
  Card,
  Avatar,
  List,
  Badge,
  Spin,
  Typography,
  Modal,
  Tabs,
  Divider,
  Tag,
  Select,
  message,
  Tooltip,
  InputNumber,
  Result,
  Alert,
} from "antd";
import {
  MessageOutlined,
  SendOutlined,
  UserOutlined,
  EllipsisOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  SearchOutlined,
  UpOutlined,
  DownOutlined,
  CloseOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { useSignalR } from "../context/SignalRContext";
import { useShiftSession } from "../hooks/useShiftSession";
import axiosInstance from "../api/axiosInstance";
import { getBranchRetentionSettings, updateBranchRetentionSettings } from "../api/guestChatApi";
import ProductConsultationCard from "../components/chat/ProductConsultationCard";
import dayjs from "dayjs";

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

// Helper chuyển thứ trong tuần sang tiếng Việt (CN, T2, T3, T4, T5, T6, T7)
const getVietnameseDayOfWeek = (date) => {
  const day = dayjs(date).day();
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return dayNames[day] || "";
};

// Helper hiển thị tên chủ đề tiếng Việt
const formatTopicLabel = (topic, subject) => {
  let topicText = "Yêu cầu hỗ trợ";
  switch (topic) {
    case "Booking":
      topicText = "Lịch đặt bàn";
      break;
    case "Event":
      topicText = "Đặt tiệc/ sự kiện";
      break;
    case "Menu":
      topicText = "Thực đơn";
      break;
    case "Pricing":
      topicText = "Báo giá";
      break;
    case "Allergy":
      topicText = "Dị ứng thực phẩm";
      break;
    case "Other":
      topicText = "Khác";
      break;
    case "General":
      topicText = "Yêu cầu hỗ trợ";
      break;
    default:
      topicText = topic || "Yêu cầu hỗ trợ";
      break;
  }
  return subject ? `${topicText}: ${subject}` : topicText;
};

// Helper làm nổi bật từ khóa bên trong nội dung tin nhắn
const renderHighlightedText = (content, keyword) => {
  if (!keyword || !keyword.trim() || !content) return content;
  const escapedKeyword = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedKeyword})`, "gi");
  const parts = content.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <span
        key={i}
        style={{
          backgroundColor: "#fde047",
          color: "#0f172a",
          fontWeight: 700,
          padding: "1px 4px",
          borderRadius: 4,
          boxShadow: "0 0 0 1px #eab308",
        }}
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
};

const BranchChatPage = () => {
  const { user } = useAuth();
  const { currentBranchId } = useBranch();
  const connection = useSignalR();
  const navigate = useNavigate();

  const handleDisconnect = () => {
    navigate('/home');
  };

  const { loading: shiftLoading, authorized: shiftAuthorized, shiftInfo, denyReason } = useShiftSession(handleDisconnect);

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Quick navigation modal (Nhân viên / Chủ đề)
  const [quickNavOpen, setQuickNavOpen] = useState(false);
  const [quickNavTab, setQuickNavTab] = useState("staff");
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  // Retention setting modal state
  const [retentionModalOpen, setRetentionModalOpen] = useState(false);
  const [retentionInputVal, setRetentionInputVal] = useState(30);
  const [retentionUnit, setRetentionUnit] = useState(1440);
  const [savingRetention, setSavingRetention] = useState(false);
  const [loadingRetention, setLoadingRetention] = useState(false);

  // In-chat message search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const searchInputRef = useRef(null);

  const messagesContainerRef = useRef(null);

  // Danh sách các ID tin nhắn khớp với từ khóa tìm kiếm (Sắp xếp từ gần nhất tới xa nhất)
  const matchedMessageIds = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.trim().toLowerCase();
    return messages
      .filter((m) => m.content && m.content.toLowerCase().includes(term))
      .map((m) => m.id)
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
    if (!currentBranchId) return;
    setLoadingList(true);
    try {
      const res = await axiosInstance.get(`/api/BranchChat/conversations`, {
        params: { branchId: currentBranchId },
      });
      const currentActive = selectId || activeConvId;
      const mapped = (res.data || []).map((c) =>
        c.id === currentActive ? { ...c, unreadCount: 0 } : c
      );
      setConversations(mapped);
      const total = mapped.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      window.dispatchEvent(new CustomEvent("chat-unread-updated", { detail: total }));

      if (res.data.length > 0 && !activeConvId && !selectId) {
        handleSelectConversation(res.data[0].id);
      } else if (selectId) {
        handleSelectConversation(selectId);
      }
    } catch (error) {
      message.error("Không thể tải danh sách cuộc trò chuyện.");
      console.warn("Fetch conversations error:", error);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConversations();
  }, [currentBranchId]);

  // Real-time listener via SignalR
  useEffect(() => {
    if (connection && currentBranchId) {
      // Connect to branch group
      connection
        .invoke("JoinBranchGroup", currentBranchId)
        .catch((err) => console.warn("JoinBranchGroup SignalR error:", err));

      const handleNewConversation = (conv) => {
        if (conv.branchId === currentBranchId) {
          setConversations((prev) => {
            if (prev.some((c) => c.id === conv.id)) return prev;
            return [conv, ...prev];
          });
          message.info(
            `Có cuộc trò chuyện mới từ khách hàng: ${conv.customerName || conv.guestName || "Khách hàng"}`,
          );
        }
      };

      const handleNewMessage = (msg) => {
        if (msg.conversationId === activeConvId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();
        }
        fetchConversations(activeConvId);
      };

      connection.on("ReceiveNewConversation", handleNewConversation);
      connection.on("ReceiveNewMessage", handleNewMessage);

      return () => {
        connection.off("ReceiveNewConversation", handleNewConversation);
        connection.off("ReceiveNewMessage", handleNewMessage);
      };
    }
  }, [connection, activeConvId, currentBranchId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  const fetchMessages = async (convId, targetMessageId = null) => {
    setLoadingDetail(true);
    try {
      const res = await axiosInstance.get(
        `/api/BranchChat/conversations/${convId}`,
      );
      setMessages(res.data.messages || []);
      if (targetMessageId) {
        scrollToMessage(targetMessageId);
      } else {
        scrollToBottom();
      }
    } catch (error) {
      message.error("Không thể tải nội dung tin nhắn.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectConversation = (id, targetMessageId = null) => {
    setActiveConvId(id);
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c));
      const total = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      window.dispatchEvent(new CustomEvent("chat-unread-updated", { detail: total }));
      return updated;
    });
    fetchMessages(id, targetMessageId);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText("");

    try {
      const res = await axiosInstance.post(
        `/api/BranchChat/conversations/${activeConvId}/messages`,
        {
          content: textToSend,
        },
      );
      // Append locally
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      scrollToBottom();
      fetchConversations(activeConvId);
    } catch (error) {
      message.error("Không thể gửi tin nhắn.");
      setInputText(textToSend);
    }
  };

  const handleOpenRetentionModal = async () => {
    if (!currentBranchId) {
      message.warning("Vui lòng chọn chi nhánh trước.");
      return;
    }
    setRetentionModalOpen(true);
    setLoadingRetention(true);
    try {
      const res = await getBranchRetentionSettings(currentBranchId);
      if (res.data && res.data.anonymousChatRetentionMinutes !== undefined) {
        const mins = res.data.anonymousChatRetentionMinutes;
        if (mins % 1440 === 0) {
          setRetentionInputVal(mins / 1440);
          setRetentionUnit(1440);
        } else if (mins % 60 === 0) {
          setRetentionInputVal(mins / 60);
          setRetentionUnit(60);
        } else {
          setRetentionInputVal(mins);
          setRetentionUnit(1);
        }
      }
    } catch {
      // Dùng giá trị mặc định 1 giờ
      setRetentionInputVal(1);
      setRetentionUnit(60);
    } finally {
      setLoadingRetention(false);
    }
  };

  const handleSaveRetention = async () => {
    if (!currentBranchId) return;
    const finalMinutes = retentionInputVal * retentionUnit;
    setSavingRetention(true);
    try {
      await updateBranchRetentionSettings({
        branchId: currentBranchId,
        anonymousChatRetentionMinutes: finalMinutes,
      });
      message.success("Đã cập nhật thời gian lưu trữ tin nhắn thành công!");
      setRetentionModalOpen(false);
    } catch {
      message.error("Không thể cập nhật cấu hình lưu trữ tin nhắn.");
    } finally {
      setSavingRetention(false);
    }
  };

  // Cuộn tới vị trí tin nhắn cụ thể và highlight
  const scrollToMessage = (msgId, isFromSearch = false) => {
    setQuickNavOpen(false);
    setHighlightedMessageId(msgId);
    setTimeout(() => {
      const el = document.getElementById(`msg-item-${msgId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 200);

    // Nếu không phải đang trong chế độ tìm kiếm thì mới tự tắt highlight sau 3s
    if (!isFromSearch && !showSearch && !searchTerm) {
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Danh sách các nhân viên đã gửi tin nhắn trong cuộc trò chuyện hiện tại
  const staffMessageLogs = messages.filter((m) => m.customerId === null && (m.employeeId || m.employeeName));

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

    // Cách nhau >= 5 phút hoặc khác ngày
    const isDifferentDay = !currTime.isSame(prevTime, "day");
    const diffMinutes = Math.abs(currTime.diff(prevTime, "minute"));

    return isDifferentDay || diffMinutes >= 5;
  };

  const getSeparatorText = (currMsg, index) => {
    const currTime = dayjs(currMsg.createdAt);
    const isToday = currTime.isSame(dayjs(), "day");
    const dow = getVietnameseDayOfWeek(currTime);
    const timeStr = currTime.format("HH:mm");
    const dateStr = currTime.format("DD/MM/YY");

    // Mốc chủ đề của tin nhắn hiện tại hoặc của tin nhắn đầu tiên
    const topicToUse = currMsg.topic || (index === 0 ? activeConversation?.topic : null);
    const subjectToUse = currMsg.subject || (index === 0 ? activeConversation?.subject : null);
    const hasSpecificTopic = Boolean(topicToUse && topicToUse !== "General");

    // Có chủ đề mới hoặc tin nhắn đầu có chủ đề cụ thể: Hiển thị kèm Chủ đề
    if (hasSpecificTopic) {
      const topicLabel = formatTopicLabel(topicToUse, subjectToUse);
      if (isToday) {
        return `${topicLabel} - ${timeStr}`;
      } else {
        return `${topicLabel} - ${timeStr} - ${dow} - ${dateStr}`;
      }
    }

    // Nếu là ngày hôm nay: chỉ hiển thị Giờ
    if (isToday) {
      return timeStr;
    }

    // Nếu là các ngày trước: hiển thị Giờ - Thứ - Ngày
    return `${timeStr} - ${dow} - ${dateStr}`;
  };

  if (shiftLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" tip="Đang kiểm tra dữ liệu ca làm việc..." />
      </div>
    );
  }

  if (!shiftAuthorized) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '40px auto' }}>
        <Result
          status="403"
          title="Chưa Thể Kết Nối Trò Chuyện Khách"
          subTitle={denyReason || "Chức năng trò chuyện với khách chỉ khả dụng khi bạn đang trong ca làm việc tại nhà hàng."}
          extra={[
            <Button type="primary" key="schedule" onClick={() => navigate('/work-schedule')}>
              Vào Lịch Làm Việc & Điểm Danh
            </Button>,
            <Button key="cashier" onClick={() => navigate('/cashier-session')}>
              Vào Phiên Thu Ngân
            </Button>,
            <Button key="home" onClick={() => navigate('/home')}>
              Trang Chủ
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
        padding: 16,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {shiftInfo && shiftInfo.time !== 'Không giới hạn' && (
        <Alert
          message={
            <span>
              <strong>Phiên Trò Chuyện Thu Ngân</strong> | Nhân viên: {user?.name || user?.fullName} | Ca: {shiftInfo.name} ({shiftInfo.time}) | Ngắt kết nối lúc: {shiftInfo.disconnectTime?.format ? shiftInfo.disconnectTime.format('HH:mm') : ''}
            </span>
          }
          type="info"
          showIcon
          banner
          style={{ marginBottom: 12, borderRadius: 8, flexShrink: 0 }}
        />
      )}
      <Card
        styles={{
          body: {
            padding: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
          },
        }}
        bodyStyle={{
          padding: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
        style={{
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          flex: 1,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <Layout style={{ background: "#fff", height: "100%", overflow: "hidden", display: "flex", flexDirection: "row", flex: 1 }}>
          {/* Sider (Conversations list) */}
          <Sider
            width={320}
            theme="light"
            style={{
              borderRight: "1px solid #e2e8f0",
              background: "#fff",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
              }}
            >
              {/* Header cố định */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #f1f5f9",
                  fontWeight: 700,
                  color: "#1e293b",
                  fontSize: 16,
                  flexShrink: 0,
                  background: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Khách Hàng Đang Chat</span>
                <Button
                  type="text"
                  icon={<SettingOutlined style={{ fontSize: 18, color: "#64748b" }} />}
                  onClick={handleOpenRetentionModal}
                  title="Cài đặt thời gian lưu trữ chat của khách chưa đăng nhập"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                  }}
                />
              </div>

              {/* Danh sách khách hàng cuộn độc lập */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                }}
              >
                {loadingList ? (
                  <div style={{ textAlign: "center", padding: 24 }}>
                    <Spin />
                  </div>
                ) : (
                  <List
                    style={{ height: "100%" }}
                    dataSource={conversations}
                    renderItem={(item) => (
                      <List.Item
                        onClick={() => handleSelectConversation(item.id)}
                        style={{
                          padding: "12px 16px",
                          cursor: "pointer",
                          background:
                            item.id === activeConvId ? "#fff7ed" : "transparent",
                          borderLeft:
                            item.id === activeConvId
                              ? "4px solid #ea580c"
                              : "4px solid transparent",
                          transition: "all 0.2s",
                        }}
                        className="chat-thread-item"
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              icon={<UserOutlined />}
                              style={{ background: "#ffedd5", color: "#ea580c" }}
                            />
                          }
                          title={
                            <div
                              style={{
                                display: "flex",
                                justifyItems: "center",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: item.id === activeConvId ? 700 : 600,
                                  color: "#1e293b",
                                }}
                              >
                                {item.customerName || item.guestName || "Khách hàng"}
                              </span>
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                {dayjs(item.updatedAt).format("HH:mm")}
                              </span>
                            </div>
                          }
                          description={
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginTop: 4,
                                }}
                              >
                                <Text
                                  type="secondary"
                                  ellipsis
                                  style={{ fontSize: 12, maxWidth: 200 }}
                                >
                                  {formatTopicLabel(item.topic, item.subject)}
                                </Text>
                                {item.unreadCount > 0 && (
                                  <Badge
                                    count={item.unreadCount}
                                    style={{ backgroundColor: "#ef4444" }}
                                  />
                                )}
                              </div>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                    locale={{
                      emptyText: (
                        <div
                          style={{
                            padding: 24,
                            textAlign: "center",
                            color: "#94a3b8",
                          }}
                        >
                          Chưa có tin nhắn hỗ trợ nào
                        </div>
                      ),
                    }}
                  />
                )}
              </div>
            </div>
          </Sider>

          {/* Chat details layout */}
          <Layout
            style={{
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
              flex: 1,
              minWidth: 0,
            }}
          >
            {activeConvId ? (
              <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", flex: 1, minHeight: 0 }}>
                {/* Active chat header (CỐ ĐỊNH) */}
                <div
                  style={{
                    padding: "12px 24px",
                    background: "#fff",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexShrink: 0,
                    zIndex: 10,
                  }}
                >
                  {/* Bên trái: Tên khách & Chủ đề */}
                  <div>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#0f172a",
                        display: "block",
                      }}
                    >
                      {activeConversation?.customerName || activeConversation?.guestName || "Khách hàng"}
                    </span>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Chủ đề: {formatTopicLabel(activeConversation?.topic, activeConversation?.subject)}
                    </Text>
                  </div>

                  {/* Bên phải: Nút 3 chấm mở tùy chọn Nhân viên / Chủ đề */}
                  <Button
                    type="text"
                    icon={<EllipsisOutlined style={{ fontSize: 22, color: "#334155" }} />}
                    onClick={() => setQuickNavOpen(true)}
                    title="Xem danh sách Nhân viên & Chủ đề"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      cursor: "pointer",
                    }}
                  />
                </div>

                {/* Message display pane (CHỈ CUỘN NỘI DUNG NÀY) */}
                <Content
                  ref={messagesContainerRef}
                  onClick={() => {
                    if (activeConvId) {
                      setConversations((prev) => {
                        const updated = prev.map((c) => (c.id === activeConvId ? { ...c, unreadCount: 0 } : c));
                        const total = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                        window.dispatchEvent(new CustomEvent("chat-unread-updated", { detail: total }));
                        return updated;
                      });
                    }
                  }}
                  style={{
                    padding: "20px 24px",
                    overflowY: "auto",
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {loadingDetail ? (
                    <div style={{ textAlign: "center", margin: "auto" }}>
                      <Spin size="large" />
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, index) => {
                        const isCustomer = !msg.employeeId; // Sent by customer or guest
                        const prevMsg = index > 0 ? messages[index - 1] : null;
                        const renderSeparator = shouldRenderSeparator(msg, prevMsg, index);
                        const separatorText = renderSeparator ? getSeparatorText(msg, index) : "";
                        const isHighlighted = highlightedMessageId === msg.id;
                        const isMatchedInSearch = showSearch && Boolean(searchTerm.trim()) && matchedMessageIds.includes(msg.id);

                        return (
                          <React.Fragment key={msg.id || index}>
                            {/* Thanh ngắt hiển thị Chủ đề / Thời gian */}
                            {renderSeparator && (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  margin: index === 0 ? "4px 0 12px 0" : "16px 0 12px 0",
                                }}
                              >
                                <span
                                  style={{
                                    background: "#f1f5f9",
                                    color: "#475569",
                                    padding: "4px 14px",
                                    borderRadius: 16,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    border: "1px solid #e2e8f0",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                                    textAlign: "center",
                                    letterSpacing: "0.2px",
                                  }}
                                >
                                  {separatorText}
                                </span>
                              </div>
                            )}

                            {/* Bong bóng tin nhắn */}
                            <div
                              id={`msg-item-${msg.id}`}
                              style={{
                                display: "flex",
                                justifyContent: isCustomer
                                  ? "flex-start"
                                  : "flex-end",
                                width: "100%",
                                transition: "all 0.4s ease",
                              }}
                            >
                              <div
                                style={{
                                  maxWidth: "70%",
                                  background: isCustomer
                                    ? "#fff"
                                    : "#ea580c",
                                  color: isCustomer ? "#1e293b" : "#fff",
                                  borderRadius: isCustomer
                                    ? "16px 16px 16px 4px"
                                    : "16px 16px 4px 16px",
                                  padding: "10px 16px",
                                  boxShadow: isHighlighted
                                    ? "0 0 0 4px #93c5fd, 0 4px 16px rgba(37, 99, 235, 0.45)"
                                    : isMatchedInSearch
                                      ? "0 0 0 2px #dbeafe"
                                      : "0 1px 2px rgba(0, 0, 0, 0.05)",
                                  border: isHighlighted
                                    ? "2.5px solid #2563eb"
                                    : isMatchedInSearch
                                      ? "2px dashed #3b82f6"
                                      : isCustomer
                                        ? "1px solid #e2e8f0"
                                        : "none",
                                  position: "relative",
                                  transform: isHighlighted ? "scale(1.02)" : "scale(1)",
                                  transition: "all 0.3s ease",
                                }}
                              >
                                {!isCustomer && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: "#ffedd5",
                                      marginBottom: 4,
                                    }}
                                  >
                                    {msg.employeeName || "Nhân viên"}
                                  </div>
                                )}
                                {isCustomer && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: "#ea580c",
                                      marginBottom: 4,
                                    }}
                                  >
                                    {activeConversation?.customerName || activeConversation?.guestName || msg.customerName || msg.guestName || "Khách hàng"}
                                  </div>
                                )}
                                <div
                                  style={{
                                    fontSize: 14,
                                    wordBreak: "break-word",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {renderHighlightedText(msg.content, showSearch ? searchTerm : "")}
                                </div>
                                {msg.messageType === "ProductReference" && (
                                  <ProductConsultationCard metadataJson={msg.metadataJson} />
                                )}
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: isCustomer ? "#94a3b8" : "#ffedd5",
                                    textAlign: "right",
                                    marginTop: 4,
                                    fontWeight: 500,
                                  }}
                                >
                                  {dayjs(msg.createdAt).format("HH:mm")}
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
                      padding: "10px 20px",
                      background: "#fff7ed",
                      borderTop: "1px solid #fed7aa",
                      borderBottom: "1px solid #fed7aa",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexShrink: 0,
                    }}
                  >
                    <Input
                      ref={searchInputRef}
                      placeholder="Tìm kiếm từ khóa trong đoạn chat..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      prefix={<SearchOutlined style={{ color: "#ea580c" }} />}
                      allowClear
                      style={{ flex: 1, borderRadius: 6 }}
                      onPressEnter={handleNextMatch}
                    />
                    {searchTerm.trim() && (
                      <span style={{ fontSize: 13, color: "#9a3412", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {matchedMessageIds.length > 0 ? `${searchIndex + 1}/${matchedMessageIds.length} kết quả` : "Không tìm thấy"}
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
                        setSearchTerm("");
                        setHighlightedMessageId(null);
                      }}
                      title="Đóng tìm kiếm"
                    />
                  </div>
                )}

                {/* Bottom Input Area (CỐ ĐỊNH Ở ĐÁY) */}
                {activeConversation?.status !== "Closed" ? (
                  <div
                    style={{
                      padding: "16px 24px",
                      background: "#fff",
                      borderTop: "1px solid #f1f5f9",
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {/* Nút Kính Lúp bên trái Nhập tin nhắn */}
                    <Button
                      icon={<SearchOutlined />}
                      onClick={() => {
                        setShowSearch((prev) => {
                          const next = !prev;
                          if (next) {
                            setTimeout(() => searchInputRef.current?.focus(), 150);
                          } else {
                            setSearchTerm("");
                            setHighlightedMessageId(null);
                          }
                          return next;
                        });
                      }}
                      style={{
                        height: 38,
                        width: 38,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 8,
                        borderColor: showSearch ? "#ea580c" : "#cbd5e1",
                        color: showSearch ? "#ea580c" : "#64748b",
                        background: showSearch ? "#fff7ed" : "#fff",
                      }}
                      title="Tìm kiếm tin nhắn trong đoạn chat"
                    />
                    <Input.TextArea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Nhập tin nhắn trả lời khách hàng..."
                      autoSize={{ minRows: 1, maxRows: 3 }}
                      onPressEnter={(e) => {
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
                        background: "#ea580c",
                        borderColor: "#ea580c",
                        borderRadius: 8,
                        padding: "0 20px",
                        fontWeight: 600,
                      }}
                    >
                      Gửi
                    </Button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "16px 24px",
                      background: "#f1f5f9",
                      textAlign: "center",
                      color: "#64748b",
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    Cuộc trò chuyện này đã đóng.
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  margin: "auto",
                  textAlign: "center",
                  color: "#94a3b8",
                  padding: 48,
                }}
              >
                <MessageOutlined
                  style={{ fontSize: 64, color: "#cbd5e1", marginBottom: 16 }}
                />
                <Title level={5} style={{ color: "#64748b", margin: 0 }}>
                  Hãy chọn một cuộc trò chuyện từ danh sách bên trái.
                </Title>
              </div>
            )}
          </Layout>
        </Layout>
      </Card>

      {/* Modal Lựa chọn Nhân viên / Chủ đề */}
      <Modal
        open={quickNavOpen}
        onCancel={() => setQuickNavOpen(false)}
        footer={null}
        width={520}
        centered
        title={
          <span style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
            Tra Cứu Nhanh Theo Nhân Viên & Chủ Đề
          </span>
        }
      >
        <Tabs
          activeKey={quickNavTab}
          onChange={setQuickNavTab}
          items={[
            {
              key: "staff",
              label: (
                <span style={{ fontWeight: 600 }}>
                  <UserOutlined /> Nhân viên tương tác ({staffMessageLogs.length})
                </span>
              ),
              children: (
                <div style={{ maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
                  {staffMessageLogs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
                      Chưa có tin nhắn nào từ nhân viên trong cuộc hội thoại này.
                    </div>
                  ) : (
                    <List
                      dataSource={staffMessageLogs}
                      renderItem={(item, idx) => (
                        <React.Fragment key={item.id || idx}>
                          <div
                            onClick={() => scrollToMessage(item.id)}
                            style={{
                              padding: "12px 14px",
                              borderRadius: 8,
                              cursor: "pointer",
                              transition: "background 0.2s",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              marginBottom: 8,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#fff7ed";
                              e.currentTarget.style.borderColor = "#fed7aa";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#f8fafc";
                              e.currentTarget.style.borderColor = "#e2e8f0";
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: 700, color: "#ea580c", fontSize: 14 }}>
                                {item.employeeName || "Nhân viên"}
                              </span>
                              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                                <ClockCircleOutlined style={{ marginRight: 4 }} />
                                {dayjs(item.createdAt).format("HH:mm DD/MM")}
                              </span>
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 13,
                                color: "#334155",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.content}
                            </div>
                          </div>
                        </React.Fragment>
                      )}
                    />
                  )}
                </div>
              ),
            },
            {
              key: "topic",
              label: (
                <span style={{ fontWeight: 600 }}>
                  <AppstoreOutlined /> Chủ đề của khách ({topicMilestones.length})
                </span>
              ),
              children: (
                <div style={{ maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
                  {topicMilestones.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
                      Chưa có chủ đề nào.
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
                              padding: "12px 14px",
                              borderRadius: 8,
                              cursor: "pointer",
                              transition: "all 0.2s",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              marginBottom: 8,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#fff7ed";
                              e.currentTarget.style.borderColor = "#fed7aa";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#f8fafc";
                              e.currentTarget.style.borderColor = "#e2e8f0";
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
                                {formatTopicLabel(m.topic, m.subject)}
                              </span>
                              <span style={{ fontSize: 12, color: "#64748b" }}>
                                {dayjs(m.createdAt).format("HH:mm DD/MM")}
                              </span>
                            </div>
                            {m.content && (
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 12,
                                  color: "#64748b",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {m.content}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Modal>

      {/* Modal Cài đặt thời gian lưu trữ đoạn chat khách ẩn danh */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
            <SettingOutlined style={{ color: "#ea580c" }} />
            <span>Cài đặt</span>
          </div>
        }
        open={retentionModalOpen}
        onCancel={() => setRetentionModalOpen(false)}
        onOk={handleSaveRetention}
        confirmLoading={savingRetention}
        okText="Lưu cài đặt"
        cancelText="Hủy"
        okButtonProps={{ style: { background: "#ea580c", borderColor: "#ea580c", fontWeight: 600 } }}
        centered
        width={550}
      >
        <div style={{ padding: "12px 0" }}>
          {loadingRetention ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <Spin />
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Tooltip title="Hệ thống sẽ tự động dọn dẹp các đoạn chat và phiên làm việc của khách hàng chưa đăng nhập nếu không có hoạt động mới sau khoảng thời gian đã thiết lập.">
                  <QuestionCircleOutlined style={{ color: "#94a3b8", fontSize: 16, cursor: "pointer" }} />
                </Tooltip>

                <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 13, flexShrink: 0 }}>
                  Xóa đoạn chat của khách chưa đăng nhập:
                </span>

                <InputNumber
                  min={1}
                  value={retentionInputVal}
                  onChange={(val) => setRetentionInputVal(val)}
                  style={{ width: 80 }}
                />

                <Select
                  value={retentionUnit}
                  onChange={(val) => setRetentionUnit(val)}
                  style={{ width: 100 }}
                  options={[
                    { value: 1, label: "Phút" },
                    { value: 60, label: "Giờ" },
                    { value: 1440, label: "Ngày" },
                  ]}
                />
              </div>

              <div style={{ marginTop: 24, fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                * Áp dụng riêng cho chi nhánh hiện tại.
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default BranchChatPage;
