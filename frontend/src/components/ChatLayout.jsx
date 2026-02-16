import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { messageApi } from "../api";

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value._id === "string") return value._id;
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value.toString === "function") return value.toString();
  }
  return String(value);
};

const getMessagePreview = (message) => {
  if (message?.text?.trim()) return message.text.trim();
  if (message?.image) return "Photo";
  return "Message";
};

const Sidebar = ({ users, selectedUserId, onSelect, online }) => (
  <aside className="sidebar">
    <div className="sidebar-header">
      <h2>Chats</h2>
      <p>Select a person to start messaging.</p>
    </div>
    <div className="user-list">
      {users.map((u) => {
        const userId = normalizeId(u._id);
        const isActive = selectedUserId === userId;
        const isOnline = online.has(userId);
        const initial = u.fullName?.[0]?.toUpperCase() || "?";
        const timeStr = u.meta?.lastMessageTime ? formatTime(u.meta.lastMessageTime) : "";
        const unread = u.meta?.unreadCount || 0;
        return (
          <button
            key={userId}
            className={`user-row ${isActive ? "active" : ""}`}
            onClick={() => onSelect(u)}
          >
            <div className="user-info">
              <div className="avatar">
                {u.profilePic ? <img src={u.profilePic} alt={u.fullName} /> : initial}
              </div>
              <div className="user-meta">
                <div className="user-name">
                  <span className="user-name-text">{u.fullName}</span>
                  {isOnline && <span className="status-dot" title="Online" />}
                </div>
                <div className="user-email">{u.email}</div>
              </div>
            </div>
            <div className="user-trail">
              {timeStr && <span className="time">{timeStr}</span>}
              {unread > 0 && <span className="badge">{unread}</span>}
            </div>
          </button>
        );
      })}
      {users.length === 0 && (
        <div className="empty">No other users yet. Create another account to chat.</div>
      )}
    </div>
  </aside>
);

const MessageList = ({
  messages,
  currentUser,
  bottomRef,
  openActionMenuId,
  onToggleMenu,
  onReply,
  onDelete,
  onCopy,
}) => {
  const isEmpty = messages.length === 0;
  const currentUserId = normalizeId(currentUser?._id);

  return (
    <div className={`messages ${isEmpty ? "empty-state" : ""}`}>
      <div className="messages-inner">
        {isEmpty ? (
          <div className="empty centered">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg) => {
            const messageId = normalizeId(msg?._id);
            const isMine = normalizeId(msg.senderId) === currentUserId;
            const isMenuOpen = openActionMenuId === messageId;
            const replySenderId = normalizeId(msg?.replyTo?.senderId);
            const replyLabel = replySenderId === currentUserId ? "You" : "Reply";

            return (
              <div
                key={messageId}
                className={`message ${isMine ? "mine" : ""} ${isMenuOpen ? "menu-open" : ""}`}
              >
                <div className="message-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="message-menu-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMenu(messageId);
                    }}
                    aria-label="Message options"
                  >
                    ⋮
                  </button>
                  {isMenuOpen && (
                    <div className="message-action-menu">
                      <button type="button" onClick={() => onReply(msg)}>
                        Reply
                      </button>
                      <button type="button" onClick={() => onCopy(msg)}>
                        Copy
                      </button>
                      {isMine && (
                        <button type="button" onClick={() => onDelete(msg, "everyone")}>
                          Delete for everyone
                        </button>
                      )}
                      <button type="button" onClick={() => onDelete(msg, "me")}>
                        Delete for me
                      </button>
                    </div>
                  )}
                </div>

                <div className="bubble">
                  {msg?.replyTo?.messageId && (
                    <div className="reply-preview">
                      <span className="reply-author">{replyLabel}</span>
                      <span className="reply-text">{getMessagePreview(msg.replyTo)}</span>
                    </div>
                  )}
                  {msg.text && <p>{msg.text}</p>}
                  {msg.image && <img src={msg.image} alt="attachment" />}
                </div>
                <span className="timestamp">{formatTime(msg.createdAt || msg.timestamp)}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

const MessageInput = ({ onSend, disabled, replyingTo, currentUserId, onCancelReply }) => {
  const [text, setText] = useState("");
  const [imageData, setImageData] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const isReplyToMine = normalizeId(replyingTo?.senderId) === normalizeId(currentUserId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imageData) return;
    await onSend({ text, image: imageData });
    setText("");
    setImageData("");
    setShowEmojiPicker(false);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageData(reader.result.toString());
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleEmojiSelect = (emojiData) => {
    setText((prev) => `${prev}${emojiData?.emoji || ""}`);
    textInputRef.current?.focus();
  };

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleOutsideClick = (event) => {
      if (!emojiPickerRef.current?.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowEmojiPicker(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showEmojiPicker]);

  return (
    <form className="composer" onSubmit={handleSubmit}>
      {replyingTo && (
        <div className="composer-reply">
          <div className="composer-reply-content">
            <span className="composer-reply-label">Replying to {isReplyToMine ? "yourself" : "message"}</span>
            <span className="composer-reply-text">{getMessagePreview(replyingTo)}</span>
          </div>
          <button type="button" className="composer-reply-cancel" onClick={onCancelReply}>
            ✕
          </button>
        </div>
      )}

      <div className="composer-row">
        <label className="file-input icon-only" title="Attach image">
          <input type="file" accept="image/*" onChange={handleFile} disabled={disabled} />
          <span>{uploading ? "..." : "📎"}</span>
        </label>
        <div className="composer-input-wrap">
          <input
            type="text"
            ref={textInputRef}
            placeholder="Write a message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
          />
          <div className="emoji-picker-wrap" ref={emojiPickerRef}>
            <button
              type="button"
              className="emoji-trigger icon-only"
              title="Open emoji picker"
              aria-label="Open emoji picker"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              disabled={disabled}
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className="emoji-panel">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  width="100%"
                  height={320}
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>
        </div>
        <button type="submit" className="primary" disabled={disabled || uploading}>
          Send
        </button>
      </div>
    </form>
  );
};

const ChatLayout = ({ user, socket, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [error, setError] = useState("");
  const [messageMeta, setMessageMeta] = useState({});
  const [openActionMenuId, setOpenActionMenuId] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const shouldAutoScrollRef = useRef(false);
  const bottomRef = useRef(null);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const clearMessageActionState = useCallback(() => {
    setOpenActionMenuId("");
  }, []);

  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      const newMessageId = normalizeId(message?._id);
      if (newMessageId && prev.some((m) => normalizeId(m?._id) === newMessageId)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  const syncCurrentConversationMeta = useCallback(
    (conversationMessages) => {
      const selectedId = normalizeId(selectedUser?._id);
      if (!selectedId) return;
      const lastMsg = conversationMessages[conversationMessages.length - 1];
      setMessageMeta((prev) => ({
        ...prev,
        [selectedId]: {
          ...prev[selectedId],
          lastMessageTime: lastMsg?.createdAt || lastMsg?.timestamp || null,
          unreadCount: 0,
        },
      }));
    },
    [selectedUser]
  );

  const removeMessageFromCurrentView = useCallback(
    (messageId) => {
      const targetId = normalizeId(messageId);
      if (!targetId) return;

      setMessages((prev) => {
        const nextMessages = prev.filter((msg) => normalizeId(msg?._id) !== targetId);
        syncCurrentConversationMeta(nextMessages);
        return nextMessages;
      });

      if (normalizeId(replyingTo?._id) === targetId) {
        setReplyingTo(null);
      }
    },
    [replyingTo, syncCurrentConversationMeta]
  );

  const loadUsers = useCallback(async () => {
    try {
      const result = await messageApi.getUsers();
      setUsers(result);
      if (!selectedUser && result.length > 0) {
        setSelectedUser(result[0]);
      }
    } catch (err) {
      setError(err?.message || "Failed to load users");
    }
  }, [selectedUser]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const loadMessages = useCallback(async (partnerId) => {
    setLoadingMessages(true);
    setError("");
    try {
      const data = await messageApi.getMessages(partnerId);
      setMessages(data);
      const lastMsg = data[data.length - 1];
      const partnerKey = normalizeId(partnerId);
      setMessageMeta((prev) => ({
        ...prev,
        [partnerKey]: {
          lastMessageTime: lastMsg?.createdAt || lastMsg?.timestamp || prev[partnerKey]?.lastMessageTime,
          unreadCount: 0,
        },
      }));
      shouldAutoScrollRef.current = true;
    } catch (err) {
      setError(err?.message || "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    loadMessages(selectedUser._id);
  }, [selectedUser, loadMessages]);

  const handleSend = async ({ text, image }) => {
    if (!selectedUser) return;

    setSending(true);
    setError("");
    try {
      const selectedId = normalizeId(selectedUser._id);
      const newMessage = await messageApi.sendMessage(selectedId, {
        text,
        image,
        replyToMessageId: replyingTo ? normalizeId(replyingTo._id) : undefined,
      });

      addMessage(newMessage);
      shouldAutoScrollRef.current = true;
      setMessageMeta((prev) => ({
        ...prev,
        [selectedId]: {
          lastMessageTime: newMessage?.createdAt || prev[selectedId]?.lastMessageTime,
          unreadCount: prev[selectedId]?.unreadCount || 0,
        },
      }));
      setReplyingTo(null);
      clearMessageActionState();
    } catch (err) {
      setError(err?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (message, scope) => {
    const messageId = normalizeId(message?._id);
    if (!messageId) return;

    setError("");
    try {
      await messageApi.deleteMessage(messageId, { scope });
      removeMessageFromCurrentView(messageId);
      clearMessageActionState();
    } catch (err) {
      setError(err?.message || "Failed to delete message");
    }
  };

  const handleCopyMessage = async (message) => {
    const contentToCopy = message?.text?.trim() || message?.image || "";
    if (!contentToCopy) {
      setError("Nothing to copy for this message");
      return;
    }

    if (!navigator?.clipboard?.writeText) {
      setError("Clipboard API is not available in this browser");
      return;
    }

    try {
      await navigator.clipboard.writeText(contentToCopy);
      clearMessageActionState();
    } catch {
      setError("Failed to copy message");
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
    clearMessageActionState();
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (message) => {
      const myId = normalizeId(user?._id);
      const selectedId = normalizeId(selectedUser?._id);
      const senderId = normalizeId(message?.senderId);
      const receiverId = normalizeId(message?.receiverId);
      const relevant =
        selectedId &&
        ((senderId === selectedId && receiverId === myId) ||
          (senderId === myId && receiverId === selectedId));

      if (relevant) {
        addMessage(message);
        shouldAutoScrollRef.current = true;
        setMessageMeta((prev) => ({
          ...prev,
          [selectedId]: {
            lastMessageTime: message?.createdAt || message?.timestamp || prev[selectedId]?.lastMessageTime,
            unreadCount: 0,
          },
        }));
      } else {
        const otherId = senderId === myId ? receiverId : senderId;
        const shouldCountUnread = receiverId === myId;
        if (!otherId) return;

        setMessageMeta((prev) => ({
          ...prev,
          [otherId]: {
            lastMessageTime: message?.createdAt || message?.timestamp || prev[otherId]?.lastMessageTime,
            unreadCount: shouldCountUnread
              ? (prev[otherId]?.unreadCount || 0) + 1
              : prev[otherId]?.unreadCount || 0,
          },
        }));
      }
    };

    const handleDeleted = (payload) => {
      const eventScope = payload?.scope || "everyone";
      const myId = normalizeId(user?._id);
      const eventUserId = normalizeId(payload?.userId);
      if (eventScope === "everyone" || (eventScope === "me" && eventUserId === myId)) {
        removeMessageFromCurrentView(payload?.messageId);
      }
    };

    const handleOnline = (ids = []) =>
      setOnlineUsers(new Set(ids.map((id) => normalizeId(id))));

    socket.on("message:new", handleIncoming);
    socket.on("message:deleted", handleDeleted);
    socket.on("users:online", handleOnline);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("message:new", handleIncoming);
      socket.off("message:deleted", handleDeleted);
      socket.off("users:online", handleOnline);
    };
  }, [socket, selectedUser, addMessage, user, removeMessageFromCurrentView]);

  useEffect(() => {
    if (!selectedUser) return;
    if (!shouldAutoScrollRef.current) return;
    scrollToBottom();
    shouldAutoScrollRef.current = false;
  }, [messages, selectedUser, scrollToBottom]);

  useEffect(() => {
    if (!openActionMenuId) return;

    const closeMenu = () => setOpenActionMenuId("");
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [openActionMenuId]);

  const handleSelectUser = useCallback((nextUser) => {
    const nextId = normalizeId(nextUser?._id);
    setSelectedUser(nextUser);
    setReplyingTo(null);
    setOpenActionMenuId("");
    setMessageMeta((prev) => ({
      ...prev,
      [nextId]: {
        ...prev[nextId],
        unreadCount: 0,
      },
    }));
    shouldAutoScrollRef.current = true;
  }, []);

  const pageTitle = useMemo(() => {
    if (!selectedUser) return "Select a conversation";
    return selectedUser.fullName;
  }, [selectedUser]);

  return (
    <div className="chat-shell">
      <Sidebar
        users={users.map((u) => {
          const userId = normalizeId(u._id);
          return { ...u, meta: messageMeta[userId] || u.meta || {} };
        })}
        selectedUserId={normalizeId(selectedUser?._id)}
        onSelect={handleSelectUser}
        online={onlineUsers}
      />
      <main className="chat-pane">
        <header className="chat-header">
          <div className="chat-title">
            {selectedUser && (
              <div className="avatar large">
                {selectedUser.profilePic ? (
                  <img src={selectedUser.profilePic} alt={selectedUser.fullName} />
                ) : (
                  selectedUser.fullName?.[0]?.toUpperCase()
                )}
              </div>
            )}
            <h2>{pageTitle}</h2>
          </div>
          <button onClick={onLogout} className="ghost small">
            Log out
          </button>
        </header>
        {error && <div className="error">{error}</div>}
        <div className="conversation">
          {loadingMessages ? (
            <div className="empty">Loading messages...</div>
          ) : (
            <MessageList
              messages={messages}
              currentUser={user}
              bottomRef={bottomRef}
              openActionMenuId={openActionMenuId}
              onToggleMenu={(messageId) =>
                setOpenActionMenuId((prev) => (prev === messageId ? "" : messageId))
              }
              onReply={handleReplyToMessage}
              onCopy={handleCopyMessage}
              onDelete={handleDeleteMessage}
            />
          )}
        </div>
        <MessageInput
          onSend={handleSend}
          disabled={!selectedUser || sending}
          replyingTo={replyingTo}
          currentUserId={user?._id}
          onCancelReply={() => setReplyingTo(null)}
        />
      </main>
    </div>
  );
};

export default ChatLayout;
