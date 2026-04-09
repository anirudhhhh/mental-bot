const { config } = require("../config");
const { buildSystemPrompt } = require("./personality");

const RETRIABLE_STATUS_CODES = new Set([
  408, 409, 425, 429, 500, 502, 503, 504,
]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetriableError(error) {
  if (RETRIABLE_STATUS_CODES.has(error.status)) {
    return true;
  }

  const message = `${error.message || ""}`.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("quota") ||
    message.includes("rate") ||
    message.includes("temporar") ||
    message.includes("network") ||
    message.includes("fetch failed")
  );
}

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

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort("OpenRouter request timed out");
  }, config.openRouterTimeoutMs);

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
        temperature: 0.85,
        max_tokens: 500,
      }),
      signal: controller.signal,
    },
  ).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    const err = await response.text();
    const error = new Error(`OpenRouter error (${response.status}): ${err}`);
    error.status = response.status;
    throw error;
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
  const maxAttempts = Math.max(1, config.openRouterRetryCount + 1);
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await generateResponse(
        userMessage,
        personalityType,
        memory,
        conversationHistory,
      );
    } catch (error) {
      lastError = error;
      const canRetry = isRetriableError(error) && attempt < maxAttempts;

      console.error(
        `OpenRouter API error (attempt ${attempt}/${maxAttempts}):`,
        error.message,
      );

      if (!canRetry) {
        break;
      }

      const delay =
        config.openRouterRetryBaseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  if (
    lastError?.message?.includes("quota") ||
    lastError?.message?.includes("rate") ||
    lastError?.status === 429
  ) {
    return "I'm taking a moment to gather my thoughts. Could you give me a second and try again?";
  }

  return "I'm here with you. Could you share a bit more about what's on your mind?";
}

module.exports = {
  generateResponse,
  generateWithFallback,
};
