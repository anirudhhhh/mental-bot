const jwt = require("jsonwebtoken");
const { config } = require("../config");
const User = require("../models/User");
const { detectEmotion, selectPersonality } = require("../services/emotion");
const { checkSafety } = require("../services/safety");
const { generateWithFallback } = require("../services/therapist");
const {
  addMessage,
  getMemoryContext,
  getUserSessions,
  getSessionMessages,
  deleteSession,
} = require("../services/memory");
const { getPersonality } = require("../services/personality");

function setupSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user._id}`);

    socket.join(`user:${socket.user._id}`);

    // Get user's sessions
    socket.on("get_sessions", async () => {
      try {
        const sessions = await getUserSessions(socket.user._id);
        socket.emit("sessions_list", { sessions });
      } catch (err) {
        console.error("Get sessions error:", err);
      }
    });

    // Load session messages
    socket.on("load_session", async (data) => {
      try {
        const { sessionId } = data;
        const messages = await getSessionMessages(socket.user._id, sessionId);
        socket.emit("session_loaded", {
          sessionId,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            personality: m.personality ? { type: m.personality } : null,
            timestamp: m.timestamp,
          })),
        });
      } catch (err) {
        console.error("Load session error:", err);
      }
    });

    // Delete session
    socket.on("delete_session", async (data) => {
      try {
        const { sessionId } = data;
        await deleteSession(socket.user._id, sessionId);
        const sessions = await getUserSessions(socket.user._id);
        socket.emit("session_deleted", { sessionId });
        socket.emit("sessions_list", { sessions });
      } catch (err) {
        console.error("Delete session error:", err);
      }
    });

    socket.on("send_message", async (data) => {
      try {
        const { message, sessionId, personalityPreference } = data;
        const userId = socket.user._id;

        if (!message?.trim() || !sessionId) return;

        socket.emit("typing", { sessionId, isTyping: true });

        const safety = checkSafety(message);

        if (safety.isCrisis) {
          await addMessage(userId, sessionId, "user", message, {
            emotion: "hopeless",
            intensity: 1,
          });
          await addMessage(
            userId,
            sessionId,
            "assistant",
            safety.response,
            null,
            "compassionate",
          );

          socket.emit("typing", { sessionId, isTyping: false });
          socket.emit("receive_message", {
            sessionId,
            reply: safety.response,
            emotion: { emotion: "crisis", intensity: 1 },
            personality: getPersonality("compassionate"),
            isCrisis: true,
          });
          return;
        }

        const emotion = detectEmotion(message);
        const allowedPreferences = new Set([
          "auto",
          "compassionate",
          "motivational",
          "understanding",
          "brutal_truth",
        ]);
        const preferenceFromClient = allowedPreferences.has(
          personalityPreference,
        )
          ? personalityPreference
          : null;
        const userPreference =
          preferenceFromClient ||
          socket.user.preferences?.preferredPersonality ||
          "auto";
        const personalityType = selectPersonality(
          emotion.emotion,
          emotion.intensity,
          userPreference,
        );
        const personality = getPersonality(personalityType);

        const memory = await getMemoryContext(userId, sessionId);
        await addMessage(
          userId,
          sessionId,
          "user",
          message,
          emotion.emotion,
          null,
        );

        let reply;
        if (safety.riskLevel === "moderate") {
          reply = safety.response;
        } else {
          reply = await generateWithFallback(
            message,
            personalityType,
            memory,
            memory.conversationHistory,
          );
        }

        await addMessage(
          userId,
          sessionId,
          "assistant",
          reply,
          null,
          personalityType,
        );

        // Get updated sessions to refresh sidebar
        const sessions = await getUserSessions(userId);

        socket.emit("typing", { sessionId, isTyping: false });
        socket.emit("receive_message", {
          sessionId,
          reply,
          emotion,
          personality: {
            type: personalityType,
            name: personality.name,
            color: personality.color,
          },
          isCrisis: false,
        });
        socket.emit("sessions_list", { sessions });
      } catch (err) {
        console.error("Socket message error:", err);
        socket.emit("typing", { sessionId, isTyping: false });
        socket.emit("error", { message: "Failed to process message" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user._id}`);
    });
  });
}

module.exports = { setupSocket };
