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

/**
 * Sanitize a post for a given viewer.
 * - Always includes `isOwner` so the client can show/hide delete.
 * - For anonymous posts, replaces author displayName with "Anonymous"
 *   and strips author._id so other users can't identify the poster.
 *   The owner still sees their own post as deletable via `isOwner`.
 */
function sanitizePost(post, userId) {
  // author can be a populated object { _id, displayName } or a raw ObjectId
  const authorId = (
    post.author?._id?.toString() ??
    post.author?.toString() ??
    ""
  );
  const isOwner = !!userId && !!authorId && authorId === userId.toString();

  const hasUpvoted = userId
    ? (post.upvotes ?? []).some((id) => id.toString() === userId.toString())
    : false;

  // Always mask author identity for anonymous posts — no _id, no displayName leak
  const author = post.isAnonymous
    ? { displayName: "Anonymous" }
    : post.author ?? { displayName: "Unknown" };

  // Destructure the raw author out so it can never leak through the spread,
  // then rebuild with the sanitized author.
  const { author: _rawAuthor, upvotes: _up, ...rest } = post;

  return {
    ...rest,
    author,
    isOwner,   // client uses this for delete button — never exposes real authorId
    hasUpvoted,
  };
}

function sanitizeComment(comment, userId) {
  const authorId = (
    comment.author?._id?.toString() ??
    comment.author?.toString() ??
    ""
  );
  const isOwner = !!userId && !!authorId && authorId === userId.toString();

  if (comment.isAnonymous) {
    const { author: _rawAuthor, ...rest } = comment;
    return {
      ...rest,
      author: { displayName: "Anonymous" },
      isOwner,
    };
  }
  return { ...comment, isOwner };
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
      isAnonymous: isAnonymous === true || isAnonymous === "true",
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
      .populate("subspace", "name slug")
      .lean();

    const userId = req.user?._id?.toString();
    const sanitized = posts.map((p) => sanitizePost(p, userId));

    res.json(sanitized);
  } catch (err) {
    console.error("Error in getPosts:", err);
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

    const userId = req.user?._id?.toString();
    res.json(sanitizePost(post, userId));
  } catch (err) {
    console.error("Error in getPost:", err);
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

    // Authorization is always checked against the real author field in DB,
    // regardless of whether the post is anonymous
    if (!post.author.equals(req.user._id)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await Comment.deleteMany({ post: post._id });
    await Post.deleteOne({ _id: post._id });

    // Decrement post count
    Subspace.updateOne(
      { _id: post.subspace },
      { $inc: { postCount: -1 } },
    ).catch(() => {});

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
      isAnonymous: isAnonymous === true || isAnonymous === "true",
    });

    // Increment comment count on the post
    Post.updateOne(
      { _id: req.params.postId },
      { $inc: { commentCount: 1 } },
    ).catch(() => {});

    res.status(201).json(comment);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
}

async function deleteComment(req, res) {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Not found" });

    // Authorization checked against real author, regardless of anonymity
    if (!comment.author.equals(req.user._id)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    await Comment.deleteOne({ _id: comment._id });

    // Decrement comment count on the post
    Post.updateOne(
      { _id: comment.post },
      { $inc: { commentCount: -1 } },
    ).catch(() => {});

    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: "Failed" });
  }
}

async function getComments(req, res) {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate("author", "displayName")
      .lean();

    const userId = req.user?._id?.toString();
    const sanitized = comments.map((c) => sanitizeComment(c, userId));

    res.json(sanitized);
  } catch (err) {
    console.error("Error in getComments:", err);
    res.status(500).json({ error: "Failed" });
  }
}

// ================= FEED =================
async function getFeed(req, res) {
  try {
    const sort =
      req.query.sort === "new"
        ? { createdAt: -1 }
        : req.query.sort === "top"
          ? { upvoteCount: -1 }
          : { createdAt: -1 }; // hot fallback

    const posts = await Post.find()
      .sort(sort)
      .limit(50)
      .populate("author", "displayName")
      .populate("subspace", "name slug")
      .lean();

    const userId = req.user?._id?.toString();
    const sanitized = posts.map((p) => sanitizePost(p, userId));

    res.json(sanitized);
  } catch (err) {
    console.error("Error in getFeed:", err);
    res.status(500).json({ error: "Failed" });
  }
}

async function getUserSubspaces(req, res) {
  try {
    const userId = req.user._id;

    // Phase 1: two parallel queries instead of three sequential
    const [memberOrCreated, authoredPostSubspaceIds] = await Promise.all([
      Subspace.find({ $or: [{ members: userId }, { createdBy: userId }] })
        .select("name slug memberCount description createdBy")
        .lean(),
      Post.find({ author: userId }).distinct("subspace"),
    ]);

    // Collect IDs already found
    const map = new Map();
    memberOrCreated.forEach((s) => map.set(s._id.toString(), s));

    // Only fetch posted-in subspaces we don't already have
    const missingIds = authoredPostSubspaceIds.filter(
      (id) => !map.has(id.toString()),
    );

    // Phase 2: fetch any missing subspaces + post counts in parallel
    const [postedIn, counts] = await Promise.all([
      missingIds.length > 0
        ? Subspace.find({ _id: { $in: missingIds } })
            .select("name slug memberCount description createdBy")
            .lean()
        : [],
      Post.aggregate([
        {
          $match: {
            subspace: {
              $in: [
                ...memberOrCreated.map((s) => s._id),
                ...missingIds,
              ],
            },
          },
        },
        { $group: { _id: "$subspace", count: { $sum: 1 } } },
      ]),
    ]);

    postedIn.forEach((s) => map.set(s._id.toString(), s));

    const subspaceList = [...map.values()];
    if (subspaceList.length === 0) return res.json([]);

    const countMap = new Map(
      counts.map((c) => [c._id.toString(), c.count]),
    );

    // Fire-and-forget cache sync
    const bulkOps = subspaceList.map((s) => ({
      updateOne: {
        filter: { _id: s._id },
        update: { $set: { postCount: countMap.get(s._id.toString()) ?? 0 } },
      },
    }));
    Subspace.bulkWrite(bulkOps).catch(() => {});

    const result = subspaceList.map((s) => ({
      ...s,
      postCount: countMap.get(s._id.toString()) ?? 0,
      isOwner: s.createdBy?.toString() === userId.toString(),
    }));

    res.json(result);
  } catch (err) {
    console.error("getUserSubspaces error:", err);
    res.status(500).json({ error: "Failed to get user subspaces" });
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
  deleteComment,
  getComments,
  getFeed,
};