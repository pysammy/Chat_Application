const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const jsonHeaders = { "Content-Type": "application/json" };

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || "Request failed";
    throw new Error(message);
  }
  return data;
};

const request = (path, options = {}) =>
  fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...jsonHeaders,
      ...(options.headers || {}),
    },
  }).then(handleResponse);

export const authApi = {
  signup: (payload) => request("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  check: () => request("/auth/check", { method: "GET" }),
};

export const messageApi = {
  getUsers: () => request("/message/users", { method: "GET" }),
  getMessages: (userId) => request(`/message/${userId}`, { method: "GET" }),
  searchMessages: ({ query, partnerId } = {}) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (partnerId) params.set("partnerId", partnerId);
    const qs = params.toString();
    return request(`/message/search${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  sendMessage: (userId, payload) =>
    request(`/message/send/${userId}`, { method: "POST", body: JSON.stringify(payload) }),
  deleteMessage: (messageId, payload) =>
    request(`/message/${messageId}`, { method: "DELETE", body: JSON.stringify(payload) }),
};
