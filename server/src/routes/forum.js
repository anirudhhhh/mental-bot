const express = require("express");
const { protect } = require("../middleware/auth");
const {
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
} = require("../controllers/forum");

const router = express.Router();

router.get("/feed", getFeed);
router.get("/subspaces/search", searchSubspaces);
router.get("/subspaces", getSubspaces);
router.get("/s/:name", getSubspace);
router.get("/s/:name/posts", getPosts);
router.get("/post/:postId", getPost);
router.get("/post/:postId/comments", getComments);

router.use(protect);

router.get("/subspaces/mine", getUserSubspaces);
router.post("/subspaces", createSubspace);
router.delete("/s/:name", deleteSubspace);
router.post("/s/:name/join", joinSubspace);
router.post("/s/:name/posts", createPost);
router.post("/post/:postId/upvote", upvotePost);
router.delete("/post/:postId", deletePost);
router.post("/post/:postId/comments", createComment);

module.exports = router;
