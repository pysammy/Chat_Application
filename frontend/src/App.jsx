import { useEffect, useState } from "react";
import "./App.css";
import { authApi } from "./api";
import AuthPanel from "./components/AuthPanel";
import ChatLayout from "./components/ChatLayout";
import { createSocket } from "./socket";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const me = await authApi.check();
        setUser(me);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }
    const instance = createSocket();
    instance.on("connect_error", (err) => setError(err?.message || "Socket error"));
    setSocket(instance);
    return () => instance.disconnect();
  }, [user]);

  const handleLogin = async (payload) => {
    setError("");
    const loggedIn = await authApi.login(payload);
    setUser(loggedIn);
  };

  const handleSignup = async (payload) => {
    setError("");
    const registered = await authApi.signup(payload);
    setUser(registered);
  };

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loader" />
        <p>Starting chat...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {user ? (
        <ChatLayout user={user} socket={socket} onLogout={handleLogout} />
      ) : (
        <AuthPanel onLogin={handleLogin} onSignup={handleSignup} />
      )}
      {error && <div className="error floating">{error}</div>}
    </div>
  );
}

export default App;
