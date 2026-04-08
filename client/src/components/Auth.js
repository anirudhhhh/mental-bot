import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./Auth.css";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [motivation, setMotivation] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
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
        if (!agreeToTerms) {
          setError("Please agree to the community guidelines");
          setLoading(false);
          return;
        }
        await register(email, password, displayName || firstName, motivation);
      }
    } catch (err) {
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
            <span>Private, calm, moderated</span>
          </div>
        </div>

        <div className="auth-hero">
          <h1>A gentle place to share, heal, and feel less alone.</h1>
          <p>
            Join a premium-feeling support space with moderated forums,
            anonymous posting, trusted subspaces, and a calm companion chatbot
            designed for difficult days.
          </p>
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

          <form onSubmit={handleSubmit} className="auth-form">
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
                      required
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
                  required
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
                  type="password"
                  placeholder="Choose a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
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
                  required
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
