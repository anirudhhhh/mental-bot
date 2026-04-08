const Subspace = require("../models/Subspace");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

async function createSubspace(req, res) {
  try {
    const { name, description, icon, isPrivate } = req.body;

    if (!name || name.length < 3) {
      return res
        .status(400)
        .json({ error: "Name must be at least 3 characters" });
    }

    const existing = await Subspace.findOne({ name: name.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: "Subspace already exists" });
    }

    const subspace = await Subspace.create({
      name: name.toLowerCase(),
      description,
      icon: icon || "💭",
      isPrivate: isPrivate || false,
      createdBy: req.user._id,
      members: [req.user._id],
      memberCount: 1,
    });

    res.status(201).json(subspace);
  } catch (err) {
    res.status(500).json({ error: "Failed to create subspace" });
  }
}

async function getSubspaces(req, res) {
  try {
    const subspaces = await Subspace.find({ isPrivate: false })
      .sort({ memberCount: -1 })
      .limit(50);
    res.json(subspaces);
  } catch (err) {
    res.status(500).json({ error: "Failed to get subspaces" });
  }
}

async function getUserSubspaces(req, res) {
  try {
    const userId = req.user._id;

    // Get subspaces user created (if createdBy exists)
    const created = await Subspace.find({
      createdBy: { $exists: true },
      createdBy: userId,
    });

    // Get subspaces user posted in
    const userPosts = await Post.find({ author: userId }).distinct("subspace");
    const postedIn = await Subspace.find({
      _id: { $in: userPosts },
    });

    // Combine and deduplicate, adding isOwner flag
    const subspaceMap = new Map();
    [...created, ...postedIn].forEach((s) => {
      const existing = subspaceMap.get(s._id.toString());
      if (!existing) {
        subspaceMap.set(s._id.toString(), {
          ...s.toObject(),
          isOwner: s.createdBy?.toString() === userId.toString(),
        });
      }
    });

    const subspaces = Array.from(subspaceMap.values());
    res.json(subspaces);
  } catch (err) {
    console.error("getUserSubspaces error:", err);
    res.status(500).json({ error: "Failed to get user subspaces" });
  }
}

async function searchSubspaces(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const subspaces = await Subspace.find({
      name: { $regex: q, $options: "i" },
      isPrivate: false,
    }).limit(10);

    res.json(subspaces);
  } catch (err) {
    res.status(500).json({ error: "Failed to search subspaces" });
  }
}

async function deleteSubspace(req, res) {
  try {
    const subspace = await Subspace.findOne({ name: req.params.name });
    if (!subspace) {
      return res.status(404).json({ error: "Subspace not found" });
    }

    // Check if user is creator (if createdBy exists)
    if (subspace.createdBy && !subspace.createdBy.equals(req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only the creator can delete this subspace" });
    }

    // If no createdBy, allow deletion (legacy data)
    if (!subspace.createdBy) {
      return res.status(403).json({ error: "Cannot delete legacy subspaces" });
    }

    // Delete all posts and comments in this subspace
    const posts = await Post.find({ subspace: subspace._id });
    const postIds = posts.map((p) => p._id);
    await Comment.deleteMany({ post: { $in: postIds } });
    await Post.deleteMany({ subspace: subspace._id });
    await Subspace.deleteOne({ _id: subspace._id });

    res.json({ deleted: true });
  } catch (err) {
    console.error("deleteSubspace error:", err);
    res.status(500).json({ error: "Failed to delete subspace" });
  }
}

async function getSubspace(req, res) {
  try {
    const subspace = await Subspace.findOne({ name: req.params.name });
    if (!subspace) {
      return res.status(404).json({ error: "Subspace not found" });
    }
    res.json(subspace);
  } catch (err) {
    res.status(500).json({ error: "Failed to get subspace" });
  }
}

async function joinSubspace(req, res) {
  try {
    const subspace = await Subspace.findOne({ name: req.params.name });
    if (!subspace) {
      return res.status(404).json({ error: "Subspace not found" });
    }

    if (!subspace.members.includes(req.user._id)) {
      subspace.members.push(req.user._id);
      subspace.memberCount = subspace.members.length;
      await subspace.save();
    }

    res.json({ joined: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to join subspace" });
  }
}

async function createPost(req, res) {
  try {
    const { title, content, isAnonymous, tags } = req.body;
    const subspace = await Subspace.findOne({ name: req.params.name });

    if (!subspace) {
      return res.status(404).json({ error: "Subspace not found" });
    }

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content required" });
    }

    const post = await Post.create({
      title,
      content,
      author: req.user._id,
      subspace: subspace._id,
      isAnonymous: isAnonymous !== false,
      tags: tags || [],
    });

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to create post" });
  }
}

async function getPosts(req, res) {
  try {
    const subspace = await Subspace.findOne({ name: req.params.name });
    if (!subspace) {
      return res.status(404).json({ error: "Subspace not found" });
    }

    const sort =
      req.query.sort === "new" ? { createdAt: -1 } : { upvoteCount: -1 };

    const posts = await Post.find({ subspace: subspace._id })
      .sort(sort)
      .limit(50)
      .populate("author", "displayName");

    const sanitized = posts.map((p) => ({
      ...p.toObject(),
      author: p.isAnonymous ? { displayName: "Anonymous" } : p.author,
      hasUpvoted: req.user ? p.upvotes.includes(req.user._id) : false,
    }));

    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: "Failed to get posts" });
  }
}

async function getPost(req, res) {
  try {
    const post = await Post.findById(req.params.postId)
      .populate("author", "displayName")
      .populate("subspace", "name icon");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const sanitized = {
      ...post.toObject(),
      author: post.isAnonymous ? { displayName: "Anonymous" } : post.author,
      hasUpvoted: req.user ? post.upvotes.includes(req.user._id) : false,
    };

    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: "Failed to get post" });
  }
}

async function upvotePost(req, res) {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userId = req.user._id;
    const hasUpvoted = post.upvotes.includes(userId);

    if (hasUpvoted) {
      post.upvotes = post.upvotes.filter((id) => !id.equals(userId));
    } else {
      post.upvotes.push(userId);
    }
    post.upvoteCount = post.upvotes.length;
    await post.save();

    res.json({ upvoted: !hasUpvoted, upvoteCount: post.upvoteCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to upvote" });
  }
}

async function deletePost(req, res) {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!post.author.equals(req.user._id)) {
      return res
        .status(403)
        .json({ error: "Only the author can delete this post" });
    }

    await Comment.deleteMany({ post: post._id });
    await Post.deleteOne({ _id: post._id });

    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
}

async function createComment(req, res) {
  try {
    const { content, isAnonymous, parentComment } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!content) {
      return res.status(400).json({ error: "Content required" });
    }

    const comment = await Comment.create({
      content,
      author: req.user._id,
      post: post._id,
      parentComment: parentComment || null,
      isAnonymous: isAnonymous !== false,
    });

    post.commentCount += 1;
    await post.save();

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to create comment" });
  }
}

async function getComments(req, res) {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: 1 })
      .populate("author", "displayName");

    const sanitized = comments.map((c) => ({
      ...c.toObject(),
      author: c.isAnonymous ? { displayName: "Anonymous" } : c.author,
    }));

    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: "Failed to get comments" });
  }
}

async function getFeed(req, res) {
  try {
    const sort =
      req.query.sort === "new" ? { createdAt: -1 } : { upvoteCount: -1 };

    const posts = await Post.find()
      .sort(sort)
      .limit(50)
      .populate("author", "displayName")
      .populate("subspace", "name icon");

    const sanitized = posts.map((p) => ({
      ...p.toObject(),
      author: p.isAnonymous ? { displayName: "Anonymous" } : p.author,
      hasUpvoted: req.user ? p.upvotes.includes(req.user._id) : false,
    }));

    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: "Failed to get feed" });
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
