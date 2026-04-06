const mongoose = require("mongoose");

const subspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    memberCount: {
      type: Number,
      default: 1,
    },
    icon: {
      type: String,
      default: "💭",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

subspaceSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Subspace", subspaceSchema);
