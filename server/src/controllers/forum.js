const Subspace = require("../models/Subspace");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

// ================= UTILS =================
async function findSubspaceByIdentifier(rawIdentifier) {
  const identifier = (rawIdentifier || "").trim();
  const normalizedName = identifier.toLowerCase();

  return Subspace.findOne({
    $or: [{ slug: identifier }, { name: normalizedName }],
  }).lean();
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

async function searchSubspaces(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const subspaces = await Subspace.find({
      name: { $regex: q, $options: "i" },
      isPrivate: false,
    })
      .limit(10)
      .select("name slug memberCount postCount")
      .lean();

    res.json(subspaces);
  } catch {
    res.status(500).json({ error: "Failed to search" });
  }
}

async function getSubspace(req, res) {
  try {
    const subspace = await findSubspaceByIdentifier(req.params.name);
    if (!subspace) return res.status(404).json({ error: "Not found" });

    res.json(subspace);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
}

async function deleteSubspace(req, res) {
  try {
    const subspace = await Subspace.findOne({
      $or: [{ slug: req.params.name }, { name: req.params.name }],
    });

    if (!subspace) return res.status(404).json({ error: "Not found" });

    if (!subspace.createdBy.equals(req.user._id)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await Post.deleteMany({ subspace: subspace._id });
    await Comment.deleteMany({ subspace: subspace._id });
    await Subspace.deleteOne({ _id: subspace._id });

    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
}

async function joinSubspace(req, res) {
  try {
    const subspace = await Subspace.findOne({
      $or: [{ slug: req.params.name }, { name: req.params.name }],
    });

    if (!subspace) return res.status(404).json({ error: "Not found" });

    if (!subspace.members.includes(req.user._id)) {
      subspace.members.push(req.user._id);
      subspace.memberCount = subspace.members.length;
      await subspace.save();
    }

    res.json({ joined: true });
  } catch {
    res.status(500).json({ error: "Failed" });
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
    res.status(500).json({ error: "Failed" });
  }
}

async function getPost(req, res) {
  try {
    const post = await Post.findById(req.params.postId)
      .populate("author", "displayName")
      .populate("subspace", "name slug")
      .lean();

    if (!post) return res.status(404).json({ error: "Not found" });

    res.json(post);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
}

async function upvotePost(req, res) {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Not found" });

    const userId = req.user._id;
    const has = post.upvotes.includes(userId);

    post.upvotes = has
      ? post.upvotes.filter((id) => !id.equals(userId))
      : [...post.upvotes, userId];

    post.upvoteCount = post.upvotes.length;
    await post.save();

    res.json({ upvoted: !has });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
}

async function deletePost(req, res) {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Not found" });

    if (!post.author.equals(req.user._id)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await Comment.deleteMany({ post: post._id });
    await Post.deleteOne({ _id: post._id });

    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
}

// ================= COMMENTS =================
async function createComment(req, res) {
  try {
    const { content, isAnonymous } = req.body;

    const comment = await Comment.create({
      content,
      author: req.user._id,
      post: req.params.postId,
      isAnonymous: isAnonymous !== false,
    });

    res.status(201).json(comment);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
}

async function getComments(req, res) {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate("author", "displayName")
      .lean();

    res.json(comments);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
}

// ================= FEED =================
async function getFeed(req, res) {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("author", "displayName")
      .populate("subspace", "name slug")
      .lean();

    res.json(posts);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
}

module.exports = {
  createSubspace,
  getSubspaces,
  getUserSubspaces,
  searchSubspaces,
  deleteSubspace,
  getSubspace,
  joinSubspace,
  createPost,
  getPosts,
  getPost,
  upvotePost,
  deletePost,
  createComment,
  getComments,
  getFeed,
};
