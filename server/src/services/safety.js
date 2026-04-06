const CRISIS_KEYWORDS = [
  "kill myself",
  "suicide",
  "suicidal",
  "end my life",
  "want to die",
  "dont want to live",
  "better off dead",
  "end it all",
  "no reason to live",
  "self harm",
  "cut myself",
  "hurt myself",
  "harm myself",
  "overdose",
  "pills",
  "jump off",
  "hang myself",
  "nobody would miss me",
  "burden to everyone",
  "goodbye forever",
  "final goodbye",
  "last message",
  "ending it",
];

const CRISIS_RESPONSE = `I hear you, and I'm really glad you're reaching out right now. What you're feeling is serious, and you deserve immediate support from someone trained to help.

Please reach out to a crisis line right now:
• **988** - Suicide & Crisis Lifeline (US) - Call or text
• **Crisis Text Line** - Text HOME to 741741
• **International**: findahelpline.com

I'm here to talk, but please also connect with a crisis counselor who can provide the support you need right now. You matter, and there are people who want to help you through this.

Are you safe right now? Can you tell me where you are?`;

const MODERATE_RISK_KEYWORDS = [
  "hopeless",
  "no point",
  "give up",
  "cant go on",
  "exhausted from life",
  "tired of everything",
  "wish i wasnt here",
  "disappear",
  "escape everything",
];

const MODERATE_RISK_RESPONSE = `I can hear that you're going through something really heavy right now. Thank you for sharing that with me.

What you're feeling matters, and I want you to know that support is available:
• 988 Lifeline - For any emotional distress, not just crisis
• Crisis Text Line - Text HOME to 741741

Would you like to tell me more about what's been going on?`;

function checkSafety(text) {
  const lowerText = text.toLowerCase().replace(/['']/g, "");

  for (const keyword of CRISIS_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return {
        isCrisis: true,
        riskLevel: "high",
        response: CRISIS_RESPONSE,
        triggerKeyword: keyword,
      };
    }
  }

  for (const keyword of MODERATE_RISK_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return {
        isCrisis: false,
        riskLevel: "moderate",
        response: MODERATE_RISK_RESPONSE,
        triggerKeyword: keyword,
      };
    }
  }

  return {
    isCrisis: false,
    riskLevel: "low",
    response: null,
    triggerKeyword: null,
  };
}

module.exports = {
  checkSafety,
  CRISIS_RESPONSE,
  MODERATE_RISK_RESPONSE,
};
