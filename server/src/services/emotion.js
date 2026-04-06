const EMOTION_KEYWORDS = {
  sad: [
    "sad",
    "depressed",
    "unhappy",
    "miserable",
    "down",
    "blue",
    "crying",
    "tears",
    "heartbroken",
    "grief",
    "loss",
    "lonely",
    "empty",
    "numb",
    "hopeless",
    "worthless",
    "disappointed",
    "hurt",
    "pain",
    "suffering",
  ],
  anxious: [
    "anxious",
    "worried",
    "nervous",
    "scared",
    "afraid",
    "panic",
    "stress",
    "overwhelmed",
    "tense",
    "uneasy",
    "restless",
    "dread",
    "fear",
    "terrified",
    "paranoid",
    "on edge",
    "cant sleep",
    "racing thoughts",
    "overthinking",
  ],
  angry: [
    "angry",
    "mad",
    "furious",
    "frustrated",
    "annoyed",
    "irritated",
    "rage",
    "hate",
    "resent",
    "bitter",
    "fed up",
    "pissed",
    "livid",
    "outraged",
    "hostile",
    "aggressive",
    "violent thoughts",
  ],
  happy: [
    "happy",
    "joy",
    "excited",
    "grateful",
    "thankful",
    "blessed",
    "amazing",
    "wonderful",
    "great",
    "fantastic",
    "good news",
    "proud",
    "accomplished",
    "relieved",
    "hopeful",
    "optimistic",
    "better",
    "improving",
  ],
  confused: [
    "confused",
    "lost",
    "dont know",
    "uncertain",
    "unsure",
    "mixed feelings",
    "torn",
    "conflicted",
    "cant decide",
    "stuck",
    "unclear",
    "puzzled",
    "bewildered",
    "disoriented",
    "questioning",
  ],
  fearful: [
    "fear",
    "terrified",
    "scared",
    "phobia",
    "nightmare",
    "trauma",
    "ptsd",
    "flashback",
    "haunted",
    "triggered",
    "unsafe",
    "threatened",
    "danger",
  ],
  hopeless: [
    "hopeless",
    "no point",
    "give up",
    "cant go on",
    "whats the point",
    "nothing matters",
    "no future",
    "no way out",
    "trapped",
    "doomed",
    "finished",
    "over",
    "done",
  ],
};

const INTENSITY_MODIFIERS = {
  high: [
    "very",
    "extremely",
    "so",
    "really",
    "incredibly",
    "absolutely",
    "completely",
    "totally",
    "cant take",
  ],
  low: [
    "slightly",
    "a bit",
    "somewhat",
    "kind of",
    "a little",
    "maybe",
    "sort of",
  ],
};

function detectEmotion(text) {
  const lowerText = text.toLowerCase();
  const scores = {};

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    scores[emotion] = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        scores[emotion]++;
      }
    }
  }

  let maxEmotion = "neutral";
  let maxScore = 0;

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = emotion;
    }
  }

  let intensity = 0.5;

  for (const modifier of INTENSITY_MODIFIERS.high) {
    if (lowerText.includes(modifier)) {
      intensity = Math.min(1, intensity + 0.2);
    }
  }

  for (const modifier of INTENSITY_MODIFIERS.low) {
    if (lowerText.includes(modifier)) {
      intensity = Math.max(0.1, intensity - 0.15);
    }
  }

  if (maxScore === 0) {
    return { emotion: "neutral", intensity: 0.3, confidence: 0.2 };
  }

  const confidence = Math.min(1, maxScore / 3);

  return {
    emotion: maxEmotion,
    intensity: Math.round(intensity * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
  };
}

function selectPersonality(emotion, intensity, userPreference = "auto") {
  if (userPreference !== "auto") {
    return userPreference;
  }

  const mapping = {
    sad: intensity > 0.7 ? "compassionate" : "understanding",
    anxious: "understanding",
    angry: intensity > 0.7 ? "understanding" : "brutal_truth",
    happy: "motivational",
    confused: "understanding",
    fearful: "compassionate",
    hopeless: "compassionate",
    neutral: "understanding",
  };

  return mapping[emotion] || "understanding";
}

module.exports = {
  detectEmotion,
  selectPersonality,
};
