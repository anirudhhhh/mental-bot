const { config } = require("../config");
const { buildSystemPrompt } = require("./personality");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateResponse(
  userMessage,
  personalityType,
  memory,
  conversationHistory = [],
) {
  const systemPrompt = buildSystemPrompt(personalityType, memory);

  // 🔥 limit history (huge performance gain)
  const trimmedHistory = conversationHistory.slice(-6);

  const messages = [
    { role: "system", content: systemPrompt },
    ...trimmedHistory.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort("OpenRouter request timed out");
  }, config.openRouterTimeoutMs || 4000);

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.openRouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.openRouterModel,
          messages,
          temperature: 0.7, // ↓ more stable & faster
          max_tokens: 200, // ↓ major speed boost
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error("OpenRouter error:", error.message);

    // graceful fallback (fast, no retries)
    if (error.message?.includes("quota") || error.message?.includes("rate")) {
      return "I'm taking a moment to gather my thoughts. Could you try again in a second?";
    }

    return "I'm here with you. Could you share a bit more about what's on your mind?";
  } finally {
    clearTimeout(timeout);
  }
}

async function generateWithFallback(
  userMessage,
  personalityType,
  memory,
  conversationHistory,
) {
  // 🔥 no retries → consistent latency
  return await generateResponse(
    userMessage,
    personalityType,
    memory,
    conversationHistory,
  );
}

module.exports = {
  generateResponse,
  generateWithFallback,
};
