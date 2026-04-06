import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>SafeSpace</h1>
          <p>A quiet place to talk</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                placeholder="anonymous"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="auth-input"
              />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="auth-input"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading
              ? "..."
              : isLogin
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? "New here? " : "Already joined? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="auth-switch-btn"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}
