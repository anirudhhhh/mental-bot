const Subspace = require("../models/Subspace");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

// ================= UTILS =================
async function findSubspaceByIdentifier(rawIdentifier) {
  const identifier = (rawIdentifier || "").trim();
  const normalizedName = identifier.toLowerCase();

  return Subspace.findOne({
    $or: [{ slug: identifier }, { name: normalizedName }],
  }).lean(); // 🔥 important
}

// ================= SUBSPACES =================
async function createSubspace(req, res) {
  try {
    const { name, description, isPrivate } = req.body;

    if (!name || name.length < 3) {
      return res
        .status(400)
        .json({ error: "Name must be at least 3 characters" });
    }

    const baseName = name.trim().toLowerCase();
    const slug = baseName.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await Subspace.findOne({
      $or: [{ name: baseName }, { slug }],
    }).lean();

    if (existing) {
      return res.status(400).json({ error: "Subspace already exists" });
    }

    const subspace = await Subspace.create({
      name: baseName,
      slug,
      description,
      isPrivate: isPrivate || false,
      createdBy: req.user._id,
      members: [req.user._id],
      memberCount: 1,
      postCount: 0,
    });

    res.status(201).json(subspace);
  } catch {
    res.status(500).json({ error: "Failed to create subspace" });
  }
}

async function getSubspaces(req, res) {
  try {
    const subspaces = await Subspace.find({ isPrivate: false })
      .sort({ memberCount: -1 })
      .limit(50)
      .select("name slug memberCount postCount description")
      .lean();

    res.json(subspaces);
  } catch {
    res.status(500).json({ error: "Failed to get subspaces" });
  }
}

// 🔥 REMOVED syncSubspacePostCount (huge perf win)
async function getUserSubspaces(req, res) {
  try {
    const userId = req.user._id;

    const [created, userPosts] = await Promise.all([
      Subspace.find({ createdBy: userId })
        .select("name slug memberCount description createdBy postCount")
        .lean(),

      Post.find({ author: userId }).distinct("subspace"),
    ]);

    const postedIn = await Subspace.find({
      _id: { $in: userPosts },
    })
      .select("name slug memberCount description createdBy postCount")
      .lean();

    const map = new Map();

    [...created, ...postedIn].forEach((s) => {
      if (!map.has(s._id.toString())) {
        map.set(s._id.toString(), {
          ...s,
          isOwner: s.createdBy?.toString() === userId.toString(),
        });
      }
    });

    res.json([...map.values()]);
  } catch (err) {
    console.error("getUserSubspaces error:", err);
    res.status(500).json({ error: "Failed to get user subspaces" });
  }
}

// ================= POSTS =================
async function createPost(req, res) {
  try {
    const { title, content, isAnonymous, tags } = req.body;

    const subspace = await findSubspaceByIdentifier(req.params.name);
    if (!subspace) return res.status(404).json({ error: "Subspace not found" });

    const post = await Post.create({
      title,
      content,
      author: req.user._id,
      subspace: subspace._id,
      isAnonymous: isAnonymous !== false,
      tags: tags || [],
    });

    // 🔥 atomic increment (no save)
    Subspace.updateOne({ _id: subspace._id }, { $inc: { postCount: 1 } }).catch(
      () => {},
    );

    res.status(201).json(post);
  } catch {
    res.status(500).json({ error: "Failed to create post" });
  }
}

async function getPosts(req, res) {
  try {
    const subspace = await findSubspaceByIdentifier(req.params.name);
    if (!subspace) return res.status(404).json({ error: "Subspace not found" });

    const sort =
      req.query.sort === "new" ? { createdAt: -1 } : { upvoteCount: -1 };

    const posts = await Post.find({ subspace: subspace._id })
      .sort(sort)
      .limit(50)
      .populate("author", "displayName")
      .lean();

    const userId = req.user?._id?.toString();

    const sanitized = posts.map((p) => ({
      ...p,
      author: p.isAnonymous ? { displayName: "Anonymous" } : p.author,
      hasUpvoted: userId
        ? p.upvotes?.some((id) => id.toString() === userId)
        : false,
    }));

    res.json(sanitized);
  } catch {
    res.status(500).json({ error: "Failed to get posts" });
  }
}

// ================= COMMENTS =================
async function createComment(req, res) {
  try {
    const { content, isAnonymous, parentComment } = req.body;

    const post = await Post.findById(req.params.postId).select("_id");
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = await Comment.create({
      content,
      author: req.user._id,
      post: post._id,
      parentComment: parentComment || null,
      isAnonymous: isAnonymous !== false,
    });

    // 🔥 atomic increment
    Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } }).catch(
      () => {},
    );

    res.status(201).json(comment);
  } catch {
    res.status(500).json({ error: "Failed to create comment" });
  }
}

async function getComments(req, res) {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: 1 })
      .populate("author", "displayName")
      .lean();

    const sanitized = comments.map((c) => ({
      ...c,
      author: c.isAnonymous ? { displayName: "Anonymous" } : c.author,
    }));

    res.json(sanitized);
  } catch {
    res.status(500).json({ error: "Failed to get comments" });
  }
}

// ================= FEED =================
async function getFeed(req, res) {
  try {
    const sort =
      req.query.sort === "new" ? { createdAt: -1 } : { upvoteCount: -1 };

    const posts = await Post.find()
      .sort(sort)
      .limit(50)
      .populate("author", "displayName")
      .populate("subspace", "name slug")
      .lean();

    const userId = req.user?._id?.toString();

    const sanitized = posts.map((p) => ({
      ...p,
      author: p.isAnonymous ? { displayName: "Anonymous" } : p.author,
      hasUpvoted: userId
        ? p.upvotes?.some((id) => id.toString() === userId)
        : false,
    }));

    res.json(sanitized);
  } catch {
    res.status(500).json({ error: "Failed to get feed" });
  }
}

module.exports = {
  createSubspace,
  getSubspaces,
  getUserSubspaces,
  createPost,
  getPosts,
  createComment,
  getComments,
  getFeed,
};
