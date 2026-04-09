if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({
    path: require("path").resolve(__dirname, "../../../.env"),
  });
}

const mongoose = require("mongoose");
const Redis = require("ioredis");

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 1000),
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/safespace",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterModel: process.env.OPENROUTER_MODEL || "minimax/minimax-m2.5:free",
  openRouterTimeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS || 20000),
  openRouterRetryCount: Number(process.env.OPENROUTER_RETRY_COUNT || 2),
  openRouterRetryBaseDelayMs: Number(
    process.env.OPENROUTER_RETRY_BASE_DELAY_MS || 1200,
  ),
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  corsOrigin:
    process.env.CORS_ORIGIN ||
    process.env.CLIENT_URL ||
    "http://localhost:3000",
};

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

let redis = null;
let redisWarned = false;

try {
  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  redis.on("connect", () => console.log("Redis connected"));
  redis.on("error", () => {
    if (!redisWarned) {
      console.warn("Redis unavailable - running without cache");
      redisWarned = true;
    }
  });
} catch (err) {
  console.warn("Redis disabled");
}

module.exports = { config, connectDB, redis };
