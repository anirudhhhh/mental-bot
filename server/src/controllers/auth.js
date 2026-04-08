const User = require("../models/User");
const { signToken } = require("../middleware/auth");

async function register(req, res) {
  try {
    const { email, password, displayName, whatBringsYou } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const user = await User.create({
      email,
      password,
      displayName: displayName || "Anonymous",
      whatBringsYou: whatBringsYou || "",
    });

    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        whatBringsYou: user.whatBringsYou,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        preferences: user.preferences,
        whatBringsYou: user.whatBringsYou,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
}

async function getProfile(req, res) {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      displayName: req.user.displayName,
      preferences: req.user.preferences,
      whatBringsYou: req.user.whatBringsYou,
    },
  });
}

async function updatePreferences(req, res) {
  try {
    const { preferredPersonality, theme } = req.body;

    if (preferredPersonality) {
      req.user.preferences.preferredPersonality = preferredPersonality;
    }
    if (theme) {
      req.user.preferences.theme = theme;
    }

    await req.user.save();

    res.json({ preferences: req.user.preferences });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
}

module.exports = { register, login, getProfile, updatePreferences };
