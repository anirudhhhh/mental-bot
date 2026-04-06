const Chat = require("../models/Chat");

async function getOrCreateChat(userId) {
  let chat = await Chat.findOne({ userId }).sort({ lastActivity: -1 });

  if (!chat) {
    chat = await Chat.create({ userId, messages: [], emotionHistory: [] });
  }

  return chat;
}

async function addMessage(
  userId,
  role,
  content,
  emotion = null,
  personality = null,
) {
  const chat = await getOrCreateChat(userId);

  let emotionString = null;
  let emotionData = null;
  
  if (typeof emotion === 'string') {
    emotionString = emotion;
  } else if (emotion && typeof emotion === 'object') {
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
  await chat.save();

  return chat;
}

async function getRecentMessages(userId, limit = 10) {
  const chat = await getOrCreateChat(userId);
  return chat.messages.slice(-limit);
}

async function getMemoryContext(userId) {
  const chat = await getOrCreateChat(userId);

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

async function getEmotionTrends(userId) {
  const chat = await getOrCreateChat(userId);

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
  clearHistory,
};
