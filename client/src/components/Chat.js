import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../hooks/useSocket";
import "./Chat.css";

const PERSONALITIES = {
  compassionate: { name: "Listening", type: "compassionate" },
  motivational: { name: "Listening", type: "motivational" },
  understanding: { name: "Listening", type: "understanding" },
  brutal_truth: { name: "Listening", type: "brutal_truth" },
};

export default function Chat({ onOpenForum }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentPersonality, setCurrentPersonality] = useState(
    PERSONALITIES.understanding,
  );
  const messagesEndRef = useRef(null);
  const { user, token, logout } = useAuth();
  const { sendMessage, onMessage, onTyping, isConnected } = useSocket(token);

  useEffect(() => {
    if (!isConnected) return;
    
    const unsubMessage = onMessage((data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          personality: data.personality,
          emotion: data.emotion,
          timestamp: new Date(),
        },
      ]);

      if (data.personality?.type) {
        setCurrentPersonality({
          ...PERSONALITIES[data.personality.type],
          type: data.personality.type,
        });
      }
    });

    const unsubTyping = onTyping((data) => {
      setIsTyping(data.isTyping);
    });

    return () => {
      unsubMessage?.();
      unsubTyping?.();
    };
  }, [isConnected, onMessage, onTyping]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: input,
        timestamp: new Date(),
      },
    ]);

    sendMessage(input);
    setInput("");
  };

  const getPersonalityIcon = (type) => {
    switch (type) {
      case 'compassionate': return '♡';
      case 'motivational': return '↑';
      case 'understanding': return '◐';
      case 'brutal_truth': return '◆';
      default: return '○';
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="therapist-info">
          <span className={`personality-icon ${currentPersonality.type || 'understanding'}`}>
            {getPersonalityIcon(currentPersonality.type)}
          </span>
          <div>
            <h2>{currentPersonality.name || "Listening"}</h2>
            <span className="status">present</span>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={onOpenForum} className="forum-btn">Forum</button>
          <button onClick={logout} className="logout-btn">Sign Out</button>
        </div>
      </header>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h3>Welcome, {user?.displayName || "friend"}</h3>
            <p>I'm here to listen. Share what's on your mind.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">
              <p>{msg.content}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message assistant">
            <div className="message-content typing">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Share what's on your mind..."
          className="message-input"
        />
        <button type="submit" className="send-btn" disabled={!input.trim()}>
          →
        </button>
      </form>
    </div>
  );
}
