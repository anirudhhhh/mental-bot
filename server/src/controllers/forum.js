const Subspace = require("../models/Subspace");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

async function findSubspaceByIdentifier(rawIdentifier) {
  const identifier = (rawIdentifier || "").trim();
  const normalizedName = identifier.toLowerCase();
  return Subspace.findOne({
    $or: [{ slug: identifier }, { name: normalizedName }],
  });
}

async function syncSubspacePostCount(subspace) {
  const accurateCount = await Post.countDocuments({ subspace: subspace._id });

  if (subspace.postCount !== accurateCount) {
    await Subspace.updateOne(
      { _id: subspace._id },
      { $set: { postCount: accurateCount } },
    );
  }

  return accurateCount;
}

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
    if (!slug) {
      return res.status(400).json({ error: "Invalid subspace name" });
    }

    const existing = await Subspace.findOne({
      $or: [{ name: baseName }, { slug }],
    });
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
  } catch (err) {
    res.status(500).json({ error: "Failed to create subspace" });
  }
}

async function getSubspaces(req, res) {
  try {
    const subspaces = await Subspace.find({ isPrivate: false })
      .sort({ memberCount: -1 })
      .limit(50)
      .select("name slug memberCount postCount description");
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
    }).select("name slug memberCount description createdBy postCount");

    // Get subspaces user posted in
    const userPosts = await Post.find({ author: userId }).distinct("subspace");
    const postedIn = await Subspace.find({
      _id: { $in: userPosts },
    }).select("name slug memberCount description createdBy postCount");

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

    const subspacesWithPostCount = await Promise.all(
      subspaces.map(async (subspace) => ({
        ...subspace,
        postCount: await syncSubspacePostCount(subspace),
      })),
    );

    res.json(subspacesWithPostCount);
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
    })
      .select("name slug memberCount postCount")
      .limit(10);

    res.json(subspaces);
  } catch (err) {
    res.status(500).json({ error: "Failed to search subspaces" });
  }
}

async function deleteSubspace(req, res) {
  try {
    const subspace = await findSubspaceByIdentifier(req.params.name);
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

    // Delete all posts and comments in this subspace, including legacy
    // records that may have stored the subspace as a slug/name string.
    const postFilter = {
      $or: [
        { subspace: subspace._id },
        { subspace: subspace._id.toString() },
        { subspace: subspace.slug },
        { subspace: subspace.name },
      ],
    };

    const posts = await Post.collection
      .find(postFilter)
      .project({ _id: 1 })
      .toArray();
    const postIds = posts.map((p) => p._id);

    if (postIds.length > 0) {
      await Comment.collection.deleteMany({
        $or: [
          { post: { $in: postIds } },
          { post: { $in: postIds.map((id) => id.toString()) } },
        ],
      });
    }

    await Post.collection.deleteMany(postFilter);
    await Subspace.deleteOne({ _id: subspace._id });

    res.json({ deleted: true });
  } catch (err) {
    console.error("deleteSubspace error:", err);
    res.status(500).json({ error: "Failed to delete subspace" });
  }
}

async function getSubspace(req, res) {
  try {
    const subspace = await findSubspaceByIdentifier(req.params.name);
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
    const subspace = await findSubspaceByIdentifier(req.params.name);
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
    const subspace = await findSubspaceByIdentifier(req.params.name);

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

    subspace.postCount = (subspace.postCount || 0) + 1;
    await subspace.save();

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to create post" });
  }
}

async function getPosts(req, res) {
  try {
    const subspace = await findSubspaceByIdentifier(req.params.name);
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
      .populate("subspace", "name slug");

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

    const subspace = await Subspace.findById(post.subspace);

    await Comment.deleteMany({ post: post._id });
    await Post.deleteOne({ _id: post._id });

    if (subspace) {
      subspace.postCount = Math.max(0, (subspace.postCount || 0) - 1);
      await subspace.save();
    }

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
      .populate("subspace", "name slug");

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
