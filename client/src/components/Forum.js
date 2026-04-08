import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import "./Forum.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

export default function Forum() {
  const navigate = useNavigate();
  const [view, setView] = useState("feed");
  const [subspaces, setSubspaces] = useState([]);
  const [posts, setPosts] = useState([]);
  const [currentSubspace, setCurrentSubspace] = useState(null);
  const [currentPost, setCurrentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateSubspace, setShowCreateSubspace] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [sortBy, setSortBy] = useState("hot");
  const { token, logout, user } = useAuth();

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchUserSubspaces();
    fetchFeed("hot");
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchSubspaces(searchQuery);
    } else if (searchQuery.length === 0) {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (view === "feed") fetchFeed(sortBy);
    if (view === "subspace" && currentSubspace)
      fetchSubspacePosts(currentSubspace, sortBy);
  }, [sortBy]);

  // All the existing functions (fetchUserSubspaces, fetchFeed, etc.) remain the same...
  const fetchUserSubspaces = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/forum/subspaces/mine`,
        authHeaders,
      );
      setSubspaces(res.data);
    } catch (err) {
      console.error("Failed to fetch user subspaces:", err);
      setSubspaces([]);
    }
  };

  const fetchFeed = async (sort = sortBy) => {
    try {
      setView("feed");
      setCurrentSubspace(null);
      const res = await axios.get(
        `${API_URL}/forum/feed?sort=${sort}`,
        authHeaders,
      );
      setPosts(res.data);
    } catch (err) {
      console.error("Failed to fetch feed:", err);
    }
  };

  const fetchSubspacePosts = async (name, sort = sortBy) => {
    try {
      setView("subspace");
      setCurrentSubspace(name);
      const res = await axios.get(
        `${API_URL}/forum/s/${name}/posts?sort=${sort}`,
        authHeaders,
      );
      setPosts(res.data);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    }
  };

  const fetchPost = async (id) => {
    try {
      setView("post");
      const res = await axios.get(`${API_URL}/forum/post/${id}`, authHeaders);
      setCurrentPost(res.data);
      const commentsRes = await axios.get(
        `${API_URL}/forum/post/${id}/comments`,
        authHeaders,
      );
      setComments(commentsRes.data);
    } catch (err) {
      console.error("Failed to fetch post:", err);
    }
  };

  const searchSubspaces = async (query) => {
    try {
      const res = await axios.get(
        `${API_URL}/forum/subspaces/search?q=${query}`,
        authHeaders,
      );
      setSearchResults(res.data);
    } catch (err) {
      setSearchResults([]);
    }
  };

  const handleUpvote = async (postId) => {
    try {
      await axios.post(
        `${API_URL}/forum/post/${postId}/upvote`,
        {},
        authHeaders,
      );
      if (view === "feed") fetchFeed();
      else if (view === "subspace") fetchSubspacePosts(currentSubspace);
      else if (view === "post") fetchPost(currentPost._id);
    } catch (err) {}
  };

  const handleDeletePost = async (postId) => {
    try {
      await axios.delete(`${API_URL}/forum/post/${postId}`, authHeaders);
      if (view === "feed") fetchFeed();
      else if (view === "subspace") fetchSubspacePosts(currentSubspace);
    } catch (err) {}
  };

  const handleDeleteSubspace = async (name) => {
    try {
      await axios.delete(`${API_URL}/forum/s/${name}`, authHeaders);
      fetchUserSubspaces();
      if (view === "subspace" && currentSubspace === name) {
        setView("feed");
        fetchFeed();
      }
    } catch (err) {}
  };

  const createSubspace = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await axios.post(
        `${API_URL}/forum/subspaces`,
        {
          name: formData.get("name"),
          description: formData.get("description"),
          isAnonymous: formData.get("anonymous") === "on",
        },
        authHeaders,
      );
      setShowCreateSubspace(false);
      fetchUserSubspaces();
    } catch (err) {}
  };

  const createPost = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const subspaceName = currentSubspace || formData.get("subspace");
    try {
      await axios.post(
        `${API_URL}/forum/s/${subspaceName}/posts`,
        {
          title: formData.get("title"),
          content: formData.get("content"),
          isAnonymous: formData.get("anonymous") === "on",
        },
        authHeaders,
      );
      setShowCreatePost(false);
      if (view === "feed") fetchFeed();
      else if (view === "subspace") fetchSubspacePosts(currentSubspace);
    } catch (err) {}
  };

  const createComment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await axios.post(
        `${API_URL}/forum/post/${currentPost._id}/comments`,
        {
          content: formData.get("content"),
          isAnonymous: formData.get("anonymous") === "on",
        },
        authHeaders,
      );
      e.target.reset();
      fetchPost(currentPost._id);
    } catch (err) {}
  };

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  const isPostOwner = (post) =>
    post.authorId === user?.id || post.author?._id === user?.id;

  const handleContextMenu = (e, subspaceName, isOwner) => {
    if (!isOwner) return;
    e.preventDefault();
    setMenuOpen(menuOpen === subspaceName ? null : subspaceName);
  };

  return (
    <div className="forum-container" onClick={() => setMenuOpen(null)}>
      <div
        className={`mobile-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`forum-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="forum-sidebar-top">
          <div
            className="forum-logo"
            onClick={() => {
              setView("feed");
              fetchFeed();
              setSidebarOpen(false);
            }}
          >
            <div className="logo-dot" />
            <span>SafeSpace</span>
          </div>

          <div className="search-box">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((s) => (
                  <div
                    key={s._id}
                    className="search-result-item"
                    onClick={() => {
                      fetchSubspacePosts(s.name);
                      setSidebarOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <span className="result-prefix">#</span>
                    <span className="result-name">{s.name}</span>
                    <span className="result-count">{s.memberCount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Your Subspaces</div>
          {subspaces.map((s) => (
            <div
              key={s._id}
              className={`subspace-item ${currentSubspace === s.name ? "active" : ""}`}
              onClick={() => {
                fetchSubspacePosts(s.name);
                setSidebarOpen(false);
              }}
              onContextMenu={(e) => handleContextMenu(e, s.name, true)}
            >
              <span className="subspace-prefix">#</span>
              <span className="subspace-name">{s.name}</span>
              <div className="subspace-count-menu">
                <span className="member-count">{s.memberCount}</span>
                <button
                  className="subspace-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === s.name ? null : s.name);
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </div>
              {menuOpen === s.name && (
                <div
                  className="subspace-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="delete-option"
                    onClick={() => {
                      handleDeleteSubspace(s.name);
                      setMenuOpen(null);
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete space
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            className="new-space-btn"
            onClick={() => setShowCreateSubspace(true)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Space
          </button>
        </div>

        <div className="gentle-reminder">
          <h4>Gentle reminder</h4>
          <p>
            Share at your own pace. You can post anonymously and find moderated
            subspaces designed to feel calm and safe.
          </p>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.displayName?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.displayName || "Anonymous"}</div>
            <div className="user-status">Community Member</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="forum-main">
        <header className="forum-header">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <h1>
            {view === "feed"
              ? "home feed"
              : view === "subspace"
                ? `s/${currentSubspace}`
                : currentPost?.title}
          </h1>

          <div className="header-pills">
            <button
              className={`header-pill ${sortBy === "hot" ? "active" : ""}`}
              onClick={() => {
                setSortBy("hot");
                if (view === "post")
                  window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Hot
            </button>
            <button
              className={`header-pill ${sortBy === "new" ? "active" : ""}`}
              onClick={() => {
                setSortBy("new");
                if (view === "post")
                  window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              New
            </button>
            <button
              className={`header-pill ${sortBy === "top" ? "active" : ""}`}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Top
            </button>
          </div>

          <div className="header-actions-right">
            <button
              className="header-action-btn"
              onClick={() => navigate("/chat")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Chat
            </button>
            <button
              className="header-action-btn accent"
              onClick={() => setShowCreateSubspace(true)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              SubSpace
            </button>
            <button className="header-action-btn logout" onClick={logout}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        <div className="forum-feed">
          {view === "feed" && (
            <>
              {/* Post Composer */}
              <div className="post-composer">
                <div className="composer-avatar">
                  {user?.displayName?.[0]?.toUpperCase() || "U"}
                </div>
                <input
                  type="text"
                  placeholder="Share what's on your mind..."
                  onClick={() => setShowCreatePost(true)}
                  readOnly
                />
                <button
                  className="post-btn"
                  onClick={() => setShowCreatePost(true)}
                >
                  Post
                </button>
              </div>

              {/* Community Guidelines Banner */}
              <div className="guidelines-banner">
                <div className="banner-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div className="banner-content">
                  <h3>Community Guidelines & Crisis Resources</h3>
                  <p>
                    SafeSpace is a supportive environment for sharing stories,
                    asking for comfort, and finding trusted resources when
                    things feel heavy.
                  </p>
                </div>
              </div>

              {/* Post Feed */}
              {posts.map((post) => (
                <div
                  key={post._id}
                  className="post-card"
                  onClick={() => fetchPost(post._id)}
                >
                  <div className="post-header">
                    <span className="subspace-tag">
                      s/{post.subspace?.name}
                    </span>
                    <span className="post-meta">
                      Posted by u/{post.author?.displayName}
                    </span>
                    <span className="post-time">{timeAgo(post.createdAt)}</span>
                  </div>

                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-content">
                    {post.content.slice(0, 200)}
                    {post.content.length > 200 ? "..." : ""}
                  </p>

                  <div className="post-actions">
                    <button
                      className={`action-btn upvote-btn ${post.hasUpvoted ? "upvoted" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpvote(post._id);
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      {post.upvoteCount}
                    </button>

                    <button className="action-btn comment-btn">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {post.commentCount || 0} Comments
                    </button>

                    {isPostOwner(post) && (
                      <button
                        className="action-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost(post._id);
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Subspace view - similar structure but for specific subspace */}
          {view === "subspace" && (
            <>
              <div className="subspace-header">
                <button
                  className="post-btn"
                  onClick={() => setShowCreatePost(true)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Post
                </button>
              </div>

              {posts.map((post) => (
                <div
                  key={post._id}
                  className="post-card"
                  onClick={() => fetchPost(post._id)}
                >
                  <div className="post-header">
                    <span className="post-meta">
                      Posted by u/{post.author?.displayName}
                    </span>
                    <span className="post-time">{timeAgo(post.createdAt)}</span>
                  </div>

                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-content">
                    {post.content.slice(0, 200)}
                    {post.content.length > 200 ? "..." : ""}
                  </p>

                  <div className="post-actions">
                    <button
                      className={`action-btn upvote-btn ${post.hasUpvoted ? "upvoted" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpvote(post._id);
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      {post.upvoteCount}
                    </button>

                    <button className="action-btn comment-btn">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {post.commentCount || 0} Comments
                    </button>

                    {isPostOwner(post) && (
                      <button
                        className="action-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost(post._id);
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Post detail view */}
          {view === "post" && currentPost && (
            <div className="post-detail">
              <button
                className="back-btn"
                onClick={() => {
                  if (currentSubspace) {
                    fetchSubspacePosts(currentSubspace);
                  } else {
                    fetchFeed();
                  }
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>

              <div className="post-card detail">
                <div className="post-header">
                  <span className="subspace-tag">
                    s/{currentPost.subspace?.name}
                  </span>
                  <span className="post-meta">
                    Posted by u/{currentPost.author?.displayName}
                  </span>
                  <span className="post-time">
                    {timeAgo(currentPost.createdAt)}
                  </span>
                </div>

                <h1 className="post-title">{currentPost.title}</h1>
                <div className="post-content">{currentPost.content}</div>

                <div className="post-actions">
                  <button
                    className={`action-btn upvote-btn ${currentPost.hasUpvoted ? "upvoted" : ""}`}
                    onClick={() => handleUpvote(currentPost._id)}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    {currentPost.upvoteCount}
                  </button>

                  <span className="comment-count">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {comments.length} Comments
                  </span>

                  {isPostOwner(currentPost) && (
                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDeletePost(currentPost._id)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Comments section */}
              <div className="comments-section">
                <h4>Comments</h4>

                <form className="comment-form" onSubmit={createComment}>
                  <textarea
                    name="content"
                    placeholder="Share your thoughts..."
                    required
                    rows={3}
                  />
                  <div className="form-row">
                    <label>
                      <input type="checkbox" name="anonymous" />
                      Post anonymously
                    </label>
                    <button type="submit">Reply</button>
                  </div>
                </form>

                <div className="comments-list">
                  {comments.map((comment) => (
                    <div key={comment._id} className="comment">
                      <div className="comment-meta">
                        <span>u/{comment.author?.displayName}</span>
                        <span>{timeAgo(comment.createdAt)}</span>
                      </div>
                      <p>{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateSubspace && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateSubspace(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Space</h3>
            <form onSubmit={createSubspace}>
              <input name="name" placeholder="Space name" required />
              <textarea name="description" placeholder="Description" required />
              <label>
                <input type="checkbox" name="anonymous" />
                Allow anonymous posts
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateSubspace(false)}
                >
                  Cancel
                </button>
                <button type="submit">Create Space</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreatePost && (
        <div className="modal-overlay" onClick={() => setShowCreatePost(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Post</h3>
            <form onSubmit={createPost}>
              <input name="title" placeholder="Post title" required />
              <textarea
                name="content"
                placeholder="Share your thoughts..."
                required
                rows={5}
              />
              {!currentSubspace && (
                <select name="subspace" required>
                  <option value="">Select a space</option>
                  {subspaces.map((s) => (
                    <option key={s._id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <label>
                <input type="checkbox" name="anonymous" />
                Post anonymously
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreatePost(false)}>
                  Cancel
                </button>
                <button type="submit">Create Post</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
