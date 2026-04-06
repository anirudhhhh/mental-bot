const { GoogleGenerativeAI } = require("@google/generative-ai");
const { config } = require("../config");
const { buildSystemPrompt } = require("./personality");

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

async function generateResponse(
  userMessage,
  personalityType,
  memory,
  conversationHistory = [],
) {
  const systemPrompt = buildSystemPrompt(personalityType, memory);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const chatHistory = conversationHistory.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: chatHistory,
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 500,
    },
  });

  const result = await chat.sendMessage(userMessage);
  const response = result.response.text();

  return response.trim();
}

async function generateWithFallback(
  userMessage,
  personalityType,
  memory,
  conversationHistory,
) {
  try {
    return await generateResponse(
      userMessage,
      personalityType,
      memory,
      conversationHistory,
    );
  } catch (error) {
    console.error("Gemini API error:", error.message);

    if (error.message?.includes("quota") || error.message?.includes("rate")) {
      return "I'm taking a moment to gather my thoughts. Could you give me a second and try again?";
    }

    return "I'm here with you. Could you share a bit more about what's on your mind?";
  }
}

module.exports = {
  generateResponse,
  generateWithFallback,
};
