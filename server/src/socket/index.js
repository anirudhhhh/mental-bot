const jwt = require("jsonwebtoken");
const { config } = require("../config");
const User = require("../models/User");
const { detectEmotion, selectPersonality } = require("../services/emotion");
const { checkSafety } = require("../services/safety");
const { generateWithFallback } = require("../services/therapist");
const { addMessage, getMemoryContext } = require("../services/memory");
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

    socket.on("send_message", async (data) => {
      try {
        const { message } = data;
        const userId = socket.user._id;

        if (!message?.trim()) return;

        socket.emit("typing", { isTyping: true });

        const safety = checkSafety(message);

        if (safety.isCrisis) {
          await addMessage(userId, "user", message, {
            emotion: "hopeless",
            intensity: 1,
          });
          await addMessage(
            userId,
            "assistant",
            safety.response,
            null,
            "compassionate",
          );

          socket.emit("typing", { isTyping: false });
          socket.emit("receive_message", {
            reply: safety.response,
            emotion: { emotion: "crisis", intensity: 1 },
            personality: getPersonality("compassionate"),
            isCrisis: true,
          });
          return;
        }

        const emotion = detectEmotion(message);
        const userPreference =
          socket.user.preferences?.preferredPersonality || "auto";
        const personalityType = selectPersonality(
          emotion.emotion,
          emotion.intensity,
          userPreference,
        );
        const personality = getPersonality(personalityType);

        const memory = await getMemoryContext(userId);
        await addMessage(userId, "user", message, emotion.emotion, null);

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

        await addMessage(userId, "assistant", reply, null, personalityType);

        socket.emit("typing", { isTyping: false });
        socket.emit("receive_message", {
          reply,
          emotion,
          personality: {
            type: personalityType,
            name: personality.name,
            color: personality.color,
            icon: personality.icon,
          },
          isCrisis: false,
        });
      } catch (err) {
        console.error("Socket message error:", err);
        socket.emit("typing", { isTyping: false });
        socket.emit("error", { message: "Failed to process message" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user._id}`);
    });
  });
}

module.exports = { setupSocket };
