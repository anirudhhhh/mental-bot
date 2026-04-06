const { detectEmotion, selectPersonality } = require("../services/emotion");
const { checkSafety } = require("../services/safety");
const { generateWithFallback } = require("../services/therapist");
const {
  addMessage,
  getMemoryContext,
  getEmotionTrends,
  clearHistory,
} = require("../services/memory");
const { getPersonality } = require("../services/personality");

async function sendMessage(req, res) {
  try {
    const { message } = req.body;
    const userId = req.user._id;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

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

      return res.json({
        reply: safety.response,
        emotion: { emotion: "crisis", intensity: 1 },
        personality: "compassionate",
        isCrisis: true,
      });
    }

    const emotion = detectEmotion(message);
    const userPreference = req.user.preferences?.preferredPersonality || "auto";
    const personalityType = selectPersonality(
      emotion.emotion,
      emotion.intensity,
      userPreference,
    );
    const personality = getPersonality(personalityType);

    const memory = await getMemoryContext(userId);

    await addMessage(userId, "user", message, emotion, null);

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

    res.json({
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
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to process message" });
  }
}

async function getHistory(req, res) {
  try {
    const memory = await getMemoryContext(req.user._id);
    res.json({ messages: memory.conversationHistory });
  } catch (err) {
    res.status(500).json({ error: "Failed to get history" });
  }
}

async function getTrends(req, res) {
  try {
    const trends = await getEmotionTrends(req.user._id);
    res.json(trends);
  } catch (err) {
    res.status(500).json({ error: "Failed to get trends" });
  }
}

async function deleteHistory(req, res) {
  try {
    await clearHistory(req.user._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear history" });
  }
}

module.exports = { sendMessage, getHistory, getTrends, deleteHistory };
