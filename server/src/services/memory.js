const Chat = require("../models/Chat");

async function getOrCreateChat(userId, sessionId) {
  let chat = await Chat.findOne({ userId, sessionId });

  if (!chat) {
    chat = await Chat.create({
      userId,
      sessionId,
      sessionName: "new session",
      messages: [],
      emotionHistory: [],
    });
  }

  return chat;
}

async function addMessage(
  userId,
  sessionId,
  role,
  content,
  emotion = null,
  personality = null,
) {
  const chat = await getOrCreateChat(userId, sessionId);

  let emotionString = null;
  let emotionData = null;

  if (typeof emotion === "string") {
    emotionString = emotion;
  } else if (emotion && typeof emotion === "object") {
    emotionString = emotion.emotion || null;
    emotionData = emotion;
  }

  chat.messages.push({
    role,
    content,
    emotion: emotionString,
    personality,
    timestamp: new Date(),
  });

  if (emotionData && role === "user" && emotionData.emotion) {
    chat.emotionHistory.push({
      emotion: emotionData.emotion,
      intensity: emotionData.intensity || 0.5,
      timestamp: new Date(),
    });
  }

  chat.lastActivity = new Date();

  // Auto-name session based on first user message
  if (
    chat.sessionName === "new session" &&
    role === "user" &&
    chat.messages.length === 1
  ) {
    chat.sessionName =
      content.slice(0, 30) + (content.length > 30 ? "..." : "");
  }

  await chat.save();

  return chat;
}

async function getRecentMessages(userId, sessionId, limit = 10) {
  const chat = await getOrCreateChat(userId, sessionId);
  return chat.messages.slice(-limit);
}

async function getMemoryContext(userId, sessionId) {
  const chat = await getOrCreateChat(userId, sessionId);

  const recentEmotions = chat.emotionHistory.slice(-5).map((e) => e.emotion);

  const recentMessages = chat.messages.slice(-6);

  return {
    recentEmotions: [...new Set(recentEmotions)],
    messageCount: chat.messages.length,
    conversationHistory: recentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };
}

async function getEmotionTrends(userId, sessionId) {
  const chat = await getOrCreateChat(userId, sessionId);

  const emotionCounts = {};
  chat.emotionHistory.forEach((e) => {
    emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
  });

  return {
    total: chat.emotionHistory.length,
    breakdown: emotionCounts,
    recent: chat.emotionHistory.slice(-10),
  };
}

async function getUserSessions(userId) {
  const sessions = await Chat.find({ userId })
    .sort({ lastActivity: -1 })
    .select("sessionId sessionName lastActivity messages")
    .lean();

  return sessions.map((s) => ({
    id: s.sessionId,
    name: s.sessionName,
    time: s.lastActivity,
    messageCount: s.messages?.length || 0,
  }));
}

async function getSessionMessages(userId, sessionId) {
  const chat = await Chat.findOne({ userId, sessionId });
  if (!chat) return [];
  return chat.messages;
}

async function deleteSession(userId, sessionId) {
  await Chat.deleteOne({ userId, sessionId });
  return { success: true };
}

async function clearHistory(userId) {
  await Chat.deleteMany({ userId });
  return { success: true };
}

module.exports = {
  getOrCreateChat,
  addMessage,
  getRecentMessages,
  getMemoryContext,
  getEmotionTrends,
  getUserSessions,
  getSessionMessages,
  deleteSession,
  clearHistory,
};
