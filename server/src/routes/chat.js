const express = require("express");
const {
  sendMessage,
  getHistory,
  getTrends,
  deleteHistory,
} = require("../controllers/chat");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.post("/", sendMessage);
router.get("/history", getHistory);
router.get("/trends", getTrends);
router.delete("/history", deleteHistory);

module.exports = router;
