const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subspace",
      required: true,
    },
    isAnonymous: {
      type: Boolean,
      default: true,
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    upvoteCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true },
);

postSchema.index({ subspace: 1, createdAt: -1 });
postSchema.index({ upvoteCount: -1 });

module.exports = mongoose.model("Post", postSchema);
