const { config } = require("../config");
const { buildSystemPrompt } = require("./personality");

async function generateResponse(
  userMessage,
  personalityType,
  memory,
  conversationHistory = [],
) {
  const systemPrompt = buildSystemPrompt(personalityType, memory);

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "minimax/minimax-m2.5:free",
        messages,
        temperature: 0.85,
        max_tokens: 500,
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || "";
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
    console.error("OpenRouter API error:", error.message);

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
