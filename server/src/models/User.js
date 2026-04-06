const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    displayName: {
      type: String,
      default: "Anonymous",
    },
    preferences: {
      preferredPersonality: {
        type: String,
        enum: [
          "compassionate",
          "motivational",
          "understanding",
          "brutal_truth",
          "auto",
        ],
        default: "auto",
      },
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: Date,
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
