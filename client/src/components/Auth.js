import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

export default function Auth({ mode = "signup" }) {
  console.log("API URL:", process.env.REACT_APP_API_URL);

  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(mode === "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [motivation, setMotivation] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  useEffect(() => {
    setIsLogin(mode === "login");
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    console.log(`[auth] submit ${isLogin ? "login" : "signup"}`, {
      email,
      hasPassword: Boolean(password),
    });

    if (!email.trim()) {
      console.warn("[auth] blocked: missing email");
      setError("Email is required");
      return;
    }

    if (!password.trim()) {
      console.warn("[auth] blocked: missing password");
      setError("Password is required");
      return;
    }

    if (!isLogin) {
      if (!firstName.trim() && !displayName.trim()) {
        console.warn("[auth] blocked: missing first/display name");
        setError("First name or display name is required");
        return;
      }

      if (!agreeToTerms) {
        console.warn("[auth] blocked: terms checkbox not checked");
        setError("Please agree to the community guidelines");
        return;
      }
    }

    console.log(`[auth] request starting: ${isLogin ? "login" : "signup"}`);
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, displayName || firstName, motivation);
      }
    } catch (err) {
      console.error("[auth] submit failed:", err.message);
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-branding">
          <div className="auth-logo">
            <div className="logo-dot" />
            <span>SafeSpace</span>
          </div>
          <div className="auth-badge">
            <div className="badge-icon">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 10v2h3v8h2v-8h3v-2h-8zm5-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" />
              </svg>
            </div>
            <span>Serene, Stable, Contained</span>
          </div>
        </div>

        <div className="auth-hero">
          <h1>A gentle place to share, heal, and feel less alone.</h1>
          <p>
            Join a premium-feeling support space with guided forums, anonymous
            posting, trusted subspaces, and a calm companion chatbot designed
            for difficult days.
          </p>
          <div className="auth-gradient-bubbles">
            <div className="auth-gradient-bubble">
              <div className="bubble-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="bubble-text">Supportive conversations</div>
            </div>
            <div className="auth-gradient-bubble">
              <div className="bubble-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4" />
                  <line x1="8" y1="16" x2="8" y2="16" />
                  <line x1="16" y1="16" x2="16" y2="16" />
                </svg>
              </div>
              <div className="bubble-text">Companion chatbot</div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-toggle">
            <button
              type="button"
              className={!isLogin ? "active" : ""}
              onClick={() => setIsLogin(false)}
            >
              Sign up
            </button>
            <button
              type="button"
              className={isLogin ? "active" : ""}
              onClick={() => setIsLogin(true)}
            >
              Log in
            </button>
          </div>

          <div className="auth-form-header">
            <h2>{isLogin ? "Welcome back" : "Create your account"}</h2>
            <p>
              {isLogin
                ? "Sign in to continue your journey"
                : "Start with a calm profile. You can use a display name and choose to post anonymously inside the forum."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {!isLogin && (
              <div className="form-row">
                <div className="form-group">
                  <label>First name</label>
                  <div className="input-wrapper">
                    <div className="input-icon">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7C15 8 14.5 9 13 9C11.5 9 11 8 11 7H3V9H5V20H7V12H9.5V20H11.5V12H14V20H16V12H18.5V20H20.5V9H21Z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Sarah"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Display name</label>
                  <div className="input-wrapper">
                    <div className="input-icon">@</div>
                    <input
                      type="text"
                      placeholder="quiet_horizon"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" />
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder="sarah@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM9 6C9 4.34 10.34 3 12 3S15 4.34 15 6V8H9V6ZM18 20H6V10H18V20ZM12 17C13.1 17 14 16.1 14 15S13.1 13 12 13S10 13.9 10 15S10.9 17 12 17Z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="password-input"
                  placeholder="Choose a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.77 10.77 0 0 1 12 20C7 20 2.73 16.11 1 12c.73-1.74 1.81-3.31 3.12-4.59" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c5 0 9.27 3.89 11 8a18.5 18.5 0 0 1-2.23 3.18" />
                      <path d="m1 1 22 22" />
                      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.1 12c1.73-4.11 6-8 9.9-8s8.17 3.89 9.9 8c-1.73 4.11-6 8-9.9 8s-8.17-3.89-9.9-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>What brings you here?</label>
                <textarea
                  placeholder="I want a calm place to share my story, follow supportive subspaces, and use the chatbot when I feel overwhelmed."
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {!isLogin && (
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                />
                <label htmlFor="terms">
                  I agree to community guidelines and understand this platform
                  offers peer support and AI guidance, not emergency care.
                </label>
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? "..." : isLogin ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="auth-footer">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="auth-link"
            >
              {isLogin ? "Create account" : "Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
