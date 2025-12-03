import { useState } from "react";

const initialState = { fullName: "", email: "", password: "" };

const AuthPanel = ({ onLogin, onSignup }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isSignup) {
        await onSignup(form);
      } else {
        await onLogin(form);
      }
      setForm(initialState);
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(isSignup ? "login" : "signup");
    setError("");
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{isSignup ? "Create Account" : "Welcome Back"}</h1>
          <p>{isSignup ? "Sign up to start chatting." : "Log in to join the conversation."}</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignup && (
            <label className="field">
              <span>Full name</span>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Jane Doe"
                required
              />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading} className="primary">
            {loading ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>
        <button className="ghost" onClick={switchMode} type="button">
          {isSignup ? "Already have an account? Log in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
};

export default AuthPanel;
