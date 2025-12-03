import { useCallback, useEffect, useMemo, useState } from "react";
import { messageApi } from "../api";

const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const Sidebar = ({ users, selectedUserId, onSelect, online }) => (
  <aside className="sidebar">
    <div className="sidebar-header">
      <h2>Chats</h2>
      <p>Select a person to start messaging.</p>
    </div>
    <div className="user-list">
      {users.map((u) => {
        const isActive = selectedUserId === u._id;
        const isOnline = online.has(u._id);
        return (
          <button
            key={u._id}
            className={`user-row ${isActive ? "active" : ""}`}
            onClick={() => onSelect(u)}
          >
            <div className="avatar">{u.fullName?.[0]?.toUpperCase()}</div>
            <div className="user-meta">
              <div className="user-name">
                {u.fullName}
                {isOnline && <span className="status-dot" title="Online" />}
              </div>
              <div className="user-email">{u.email}</div>
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

const MessageList = ({ messages, currentUser }) => (
  <div className="messages">
    <div className="messages-inner">
      {messages.map((msg) => {
        const isMine = msg.senderId === currentUser._id;
        return (
          <div key={msg._id} className={`message ${isMine ? "mine" : ""}`}>
            <div className="bubble">
              {msg.text && <p>{msg.text}</p>}
              {msg.image && <img src={msg.image} alt="attachment" />}
            </div>
            <span className="timestamp">{formatTime(msg.createdAt || msg.timestamp)}</span>
          </div>
        );
      })}
      {messages.length === 0 && <div className="empty">No messages yet. Say hello!</div>}
    </div>
  </div>
);

const MessageInput = ({ onSend, disabled }) => {
  const [text, setText] = useState("");
  const [imageData, setImageData] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imageData) return;
    await onSend({ text, image: imageData });
    setText("");
    setImageData("");
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

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <label className="file-input">
        <input type="file" accept="image/*" onChange={handleFile} disabled={disabled} />
        <span>{uploading ? "Uploading..." : "Add image"}</span>
      </label>
      <input
        placeholder="Write a message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
      <button type="submit" className="primary" disabled={disabled || uploading}>
        Send
      </button>
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

  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      if (message?._id && prev.some((m) => m._id === message._id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

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

  const loadMessages = useCallback(
    async (partnerId) => {
      setLoadingMessages(true);
      setError("");
      try {
        const data = await messageApi.getMessages(partnerId);
        setMessages(data);
      } catch (err) {
        setError(err?.message || "Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedUser) return;
    loadMessages(selectedUser._id);
  }, [selectedUser, loadMessages]);

  const handleSend = async ({ text, image }) => {
    if (!selectedUser) return;
    setSending(true);
    try {
      const newMessage = await messageApi.sendMessage(selectedUser._id, { text, image });
      addMessage(newMessage);
    } catch (err) {
      setError(err?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (message) => {
      const relevant =
        message.senderId === selectedUser?._id || message.receiverId === selectedUser?._id;
      if (relevant) {
        addMessage(message);
      }
    };

    const handleOnline = (ids) => setOnlineUsers(new Set(ids));

    socket.on("message:new", handleIncoming);
    socket.on("users:online", handleOnline);
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("message:new", handleIncoming);
      socket.off("users:online", handleOnline);
    };
  }, [socket, selectedUser, addMessage]);

  const pageTitle = useMemo(() => {
    if (!selectedUser) return "Select a conversation";
    return selectedUser.fullName;
  }, [selectedUser]);

  return (
    <div className="chat-shell">
      <Sidebar
        users={users}
        selectedUserId={selectedUser?._id}
        onSelect={setSelectedUser}
        online={onlineUsers}
      />
      <main className="chat-pane">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Chatting as {user.fullName}</p>
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
            <MessageList messages={messages} currentUser={user} />
          )}
        </div>
        <MessageInput onSend={handleSend} disabled={!selectedUser || sending} />
      </main>
    </div>
  );
};

export default ChatLayout;
