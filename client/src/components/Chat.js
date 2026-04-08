import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../hooks/useSocket";
import "./Chat.css";

const STARTER_PROMPTS = [
  "i've been feeling overwhelmed",
  "i need to talk through something",
  "i'm not sure where to start",
  "things have been heavy lately",
];

const QUICK_MOODS = ["Numb", "Okay", "Sad", "Anxious", "Overwhelmed"];

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState(null);
  const [currentPersona, setCurrentPersona] = useState("compassionate");
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeMood, setActiveMood] = useState(null);
  const [isGentleToneEnabled, setIsGentleToneEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const activeSessionRef = useRef(null);
  const pendingSessionRef = useRef(null);
  const { user, token, logout } = useAuth();
  const {
    sendMessage,
    getSessions,
    loadSession,
    deleteSessionById,
    onMessage,
    onTyping,
    onSessionsList,
    onSessionLoaded,
    onSessionDeleted,
    isConnected,
  } = useSocket(token);

  // Load sessions on connect
  useEffect(() => {
    if (!isConnected) return;
    getSessions();
  }, [isConnected, getSessions]);

  useEffect(() => {
    activeSessionRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    pendingSessionRef.current = pendingSessionId;
  }, [pendingSessionId]);

  useEffect(() => {
    if (!isConnected) {
      setIsTyping(false);
      setPendingSessionId(null);
    }
  }, [isConnected]);

  // Set up socket listeners
  useEffect(() => {
    if (!isConnected) return;

    const unsubMessage = onMessage((data) => {
      const messageSessionId = data.sessionId || pendingSessionRef.current;

      if (messageSessionId && pendingSessionRef.current === messageSessionId) {
        setPendingSessionId(null);
      }

      if (
        messageSessionId &&
        activeSessionRef.current &&
        messageSessionId !== activeSessionRef.current
      ) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          personality: data.personality,
          timestamp: new Date(),
        },
      ]);

      if (data.personality?.type) {
        setCurrentPersona(data.personality.type);
      }
    });

    const unsubTyping = onTyping((data) => {
      const typingSessionId = data.sessionId || pendingSessionRef.current;
      if (!typingSessionId) return;

      if (
        pendingSessionRef.current &&
        typingSessionId !== pendingSessionRef.current
      ) {
        return;
      }

      if (
        activeSessionRef.current &&
        typingSessionId !== activeSessionRef.current
      ) {
        return;
      }

      setIsTyping(data.isTyping);
    });

    const unsubSessions = onSessionsList((data) => {
      if (data.sessions) {
        setSessions(data.sessions);
      }
    });

    const unsubSessionLoaded = onSessionLoaded((data) => {
      if (data.sessionId === activeSessionId) {
        setMessages(
          data.messages.map((m) => ({
            role: m.role,
            content: m.content,
            personality: m.personality,
            timestamp: new Date(m.timestamp),
          })),
        );
      }
    });

    const unsubSessionDeleted = onSessionDeleted((data) => {
      if (data.sessionId === activeSessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    });

    return () => {
      unsubMessage?.();
      unsubTyping?.();
      unsubSessions?.();
      unsubSessionLoaded?.();
      unsubSessionDeleted?.();
    };
  }, [
    isConnected,
    activeSessionId,
    onMessage,
    onTyping,
    onSessionsList,
    onSessionLoaded,
    onSessionDeleted,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const ensureSession = () => {
    let sessionId = activeSessionId;
    if (sessionId) return sessionId;

    sessionId = generateSessionId();
    setActiveSessionId(sessionId);
    setSessions((prev) => {
      const exists = prev.some((session) => session.id === sessionId);
      if (exists) return prev;
      return [
        {
          id: sessionId,
          name: "new session",
          time: new Date().toISOString(),
          messageCount: 0,
        },
        ...prev,
      ];
    });

    return sessionId;
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!input.trim() || !isConnected || pendingSessionId) return;

    const sessionId = ensureSession();
    setPendingSessionId(sessionId);
    setIsTyping(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: input.trim(), timestamp: new Date() },
    ]);

    sendMessage(input.trim(), sessionId, {
      personalityPreference: isGentleToneEnabled ? "compassionate" : "auto",
    });
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px";
  };

  const useStarter = (text) => {
    if (pendingSessionId) return;

    const sessionId = ensureSession();
    setPendingSessionId(sessionId);
    setIsTyping(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, timestamp: new Date() },
    ]);
    sendMessage(text, sessionId, {
      personalityPreference: isGentleToneEnabled ? "compassionate" : "auto",
    });
  };

  const handleMoodCheck = (mood) => {
    if (pendingSessionId) return;

    const isSameMood = activeMood === mood;
    setActiveMood(isSameMood ? null : mood);
    if (isSameMood) return;
    useStarter(`i am feeling ${mood.toLowerCase()}`);
  };

  const newSession = () => {
    const newId = generateSessionId();
    setActiveSessionId(newId);
    setSessions((prev) => {
      const exists = prev.some((session) => session.id === newId);
      if (exists) return prev;
      return [
        {
          id: newId,
          name: "new session",
          time: new Date().toISOString(),
          messageCount: 0,
        },
        ...prev,
      ];
    });
    setMessages([]);
    setIsTyping(false);
    setSidebarOpen(false);
  };

  const switchSession = (id) => {
    if (id === activeSessionId) return;
    setActiveSessionId(id);
    setMessages([]);
    setIsTyping(false);
    loadSession(id);
    setSidebarOpen(false);
  };

  const handleDeleteSession = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this session?")) {
      deleteSessionById(id);
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${mins} ${ampm}`;
  };

  const formatSessionTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="shell">
      <div
        className={`mobile-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <div className="logo-dot" />
            <span>SafeSpace Guide</span>
          </div>
          <button className="new-chat-btn" onClick={newSession}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Conversation
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Recent Conversations</div>
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`chat-item ${session.id === activeSessionId ? "active" : ""}`}
              onClick={() => switchSession(session.id)}
            >
              <div className="chat-item-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <div className="chat-item-text">
                <div className="chat-item-name">{session.name}</div>
              </div>
              <div className="chat-item-time">
                {formatSessionTime(session.time)}
              </div>
              <button
                className="chat-item-delete"
                onClick={(e) => handleDeleteSession(e, session.id)}
                title="Delete session"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-moods">
          <div className="mood-label">Quick Check-In</div>
          <div className="mood-pills">
            {QUICK_MOODS.map((mood) => (
              <button
                key={mood}
                className={`mood-pill ${activeMood === mood ? "active" : ""}`}
                onClick={() => handleMoodCheck(mood)}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="user-info">
            <div className="user-name">{user?.displayName || "you"}</div>
            <div className="user-plan">Community Member</div>
          </div>
        </div>
      </div>

      <div className="main">
        <div className="chat-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="therapist-avatar">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div className="therapist-meta">
            <div className="therapist-name">Aura · Wellness Guide</div>
            <div className="therapist-status">
              <span className="status-dot" />
              <span>Online, ready to listen</span>
            </div>
          </div>
          <div className="header-pills">
            <button
              className={`header-pill premium ${isGentleToneEnabled ? "active" : ""}`}
              onClick={() => setIsGentleToneEnabled((prev) => !prev)}
              aria-pressed={isGentleToneEnabled}
              title="When enabled, Aura uses a gentler compassionate tone"
            >
              Premium + gentle tone
            </button>
            <button className="header-pill" onClick={() => navigate("/forum")}>
              Forum
            </button>
            <button className="header-pill logout" onClick={logout}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="welcome-block">
              <div className="welcome-icon-wrap">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <h3>Hey, I'm Aura</h3>
              <p>
                This is your space — no judgment, no agenda. What's going on for
                you today?
              </p>
              <div className="starter-prompts">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    className="starter-btn"
                    onClick={() => useStarter(prompt)}
                    disabled={Boolean(pendingSessionId)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`msg ${msg.role}`}>
                  {msg.role === "assistant" && (
                    <button className="msg-like">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  )}
                  <div className="msg-content">
                    <div className="msg-bubble">{msg.content}</div>
                    <div className="msg-time">{formatTime(msg.timestamp)}</div>
                  </div>
                  {msg.role === "user" && (
                    <div className="msg-user-avatar">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="typing-msg">
                  <button className="msg-like">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  <div className="bars">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-zone">
          <div className="input-card">
            <textarea
              ref={inputRef}
              className="msg-input"
              placeholder="I think I need to step away from my desk for 5 minutes and"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              className={`send-btn ${input.trim() ? "ready" : ""}`}
              onClick={handleSend}
              disabled={
                !input.trim() || !isConnected || Boolean(pendingSessionId)
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
