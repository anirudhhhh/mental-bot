const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  emotion: {
    type: String,
    enum: [
      "neutral",
      "sad",
      "anxious",
      "angry",
      "happy",
      "confused",
      "fearful",
      "hopeless",
    ],
    default: "neutral",
  },
  personality: {
    type: String,
    enum: ["compassionate", "motivational", "understanding", "brutal_truth"],
    default: "understanding",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    sessionName: {
      type: String,
      default: "new session",
    },
    messages: [messageSchema],
    emotionHistory: [
      {
        emotion: String,
        intensity: Number,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    sessionStart: {
      type: Date,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

chatSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
chatSchema.index({ userId: 1, lastActivity: -1 });

module.exports = mongoose.model("Chat", chatSchema);
