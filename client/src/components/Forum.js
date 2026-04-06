import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import "./Forum.css";

const API_URL = "http://localhost:5001/api";

export default function Forum({ onOpenChat }) {
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
  const { token, logout, user } = useAuth();

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchUserSubspaces();
    fetchFeed();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchSubspaces(searchQuery);
    } else if (searchQuery.length === 0) {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchUserSubspaces = async () => {
    try {
      const res = await axios.get(`${API_URL}/forum/subspaces/mine`, authHeaders);
      setSubspaces(res.data);
    } catch (err) {
      console.error('Failed to fetch user subspaces:', err);
      setSubspaces([]);
    }
  };

  const searchSubspaces = async (q) => {
    try {
      const res = await axios.get(`${API_URL}/forum/subspaces/search?q=${q}`);
      setSearchResults(res.data);
    } catch (err) {}
  };

  const fetchFeed = async () => {
    try {
      const res = await axios.get(`${API_URL}/forum/feed`);
      setPosts(res.data);
    } catch (err) {}
  };

  const fetchSubspacePosts = async (name) => {
    try {
      const res = await axios.get(`${API_URL}/forum/s/${name}/posts`);
      setPosts(res.data);
      setCurrentSubspace(name);
      setView("subspace");
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {}
  };

  const fetchPost = async (postId) => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        axios.get(`${API_URL}/forum/post/${postId}`),
        axios.get(`${API_URL}/forum/post/${postId}/comments`),
      ]);
      setCurrentPost(postRes.data);
      setComments(commentsRes.data);
      setView("post");
    } catch (err) {}
  };

  const handleUpvote = async (postId) => {
    try {
      const res = await axios.post(
        `${API_URL}/forum/post/${postId}/upvote`,
        {},
        authHeaders,
      );
      setPosts(
        posts.map((p) =>
          p._id === postId ? { ...p, upvoteCount: res.data.upvoteCount } : p,
        ),
      );
      if (currentPost?._id === postId) {
        setCurrentPost({ ...currentPost, upvoteCount: res.data.upvoteCount });
      }
    } catch (err) {}
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await axios.delete(`${API_URL}/forum/post/${postId}`, authHeaders);
      if (view === "post") {
        setView("subspace");
        fetchSubspacePosts(currentPost.subspace?.name);
      } else {
        setPosts(posts.filter(p => p._id !== postId));
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  };

  const handleDeleteSubspace = async (name) => {
    if (!window.confirm(`Delete subspace "${name}" and all its posts?`)) return;
    try {
      await axios.delete(`${API_URL}/forum/s/${name}`, authHeaders);
      fetchUserSubspaces();
      setView("feed");
      fetchFeed();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete");
    }
  };

  const handleCreateSubspace = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await axios.post(
        `${API_URL}/forum/subspaces`,
        {
          name: form.name.value,
          description: form.description.value,
          icon: form.icon.value || "○",
        },
        authHeaders,
      );
      fetchUserSubspaces();
      setShowCreateSubspace(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create");
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await axios.post(
        `${API_URL}/forum/s/${currentSubspace}/posts`,
        {
          title: form.title.value,
          content: form.content.value,
          isAnonymous: form.anonymous.checked,
        },
        authHeaders,
      );
      fetchSubspacePosts(currentSubspace);
      setShowCreatePost(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create");
    }
  };

  const handleCreateComment = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await axios.post(
        `${API_URL}/forum/post/${currentPost._id}/comments`,
        {
          content: form.content.value,
          isAnonymous: form.anonymous.checked,
        },
        authHeaders,
      );
      const res = await axios.get(
        `${API_URL}/forum/post/${currentPost._id}/comments`,
      );
      setComments(res.data);
      form.reset();
    } catch (err) {}
  };

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  const isPostOwner = (post) => post.authorId === user?.id || post.author?._id === user?.id;

  return (
    <div className="forum-container">
      <header className="forum-header">
        <div className="forum-nav">
          <h1
            onClick={() => {
              setView("feed");
              fetchFeed();
            }}
          >
            SafeSpace
          </h1>
          <div className="nav-buttons">
            <button onClick={onOpenChat} className="nav-btn">
              Chat
            </button>
            <button
              onClick={() => setShowCreateSubspace(true)}
              className="nav-btn"
            >
              + Space
            </button>
            <button onClick={logout} className="nav-btn logout">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="forum-layout">
        <aside className="sidebar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search spaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((s) => (
                  <div
                    key={s._id}
                    className="subspace-item"
                    onClick={() => fetchSubspacePosts(s.name)}
                  >
                    <span className="subspace-icon">{s.icon}</span>
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <h3>Your Spaces</h3>
          {subspaces.map((s) => (
            <div
              key={s._id}
              className="subspace-item"
              onClick={() => fetchSubspacePosts(s.name)}
            >
              <span className="subspace-icon">{s.icon}</span>
              <span>{s.name}</span>
              <span className="member-count">{s.memberCount}</span>
            </div>
          ))}
        </aside>

        <main className="main-content">
          {view === "feed" && (
            <>
              <h2>Home Feed</h2>
              {posts.map((post) => (
                <div
                  key={post._id}
                  className="post-card"
                  onClick={() => fetchPost(post._id)}
                >
                  <div className="post-meta">
                    <span className="subspace-tag">
                      {post.subspace?.name}
                    </span>
                    <span>
                      · {post.author?.displayName} · {timeAgo(post.createdAt)}
                    </span>
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.content.slice(0, 200)}...</p>
                  <div className="post-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpvote(post._id);
                      }}
                    >
                      {post.upvoteCount} upvotes
                    </button>
                    <span>{post.commentCount} replies</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {view === "subspace" && (
            <>
              <div className="subspace-header">
                <h2>s/{currentSubspace}</h2>
                <div className="subspace-actions">
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="create-btn"
                  >
                    + Post
                  </button>
                  <button
                    onClick={() => handleDeleteSubspace(currentSubspace)}
                    className="delete-btn"
                  >
                    Delete Space
                  </button>
                </div>
              </div>
              {posts.map((post) => (
                <div
                  key={post._id}
                  className="post-card"
                  onClick={() => fetchPost(post._id)}
                >
                  <div className="post-meta">
                    <span>
                      {post.author?.displayName} · {timeAgo(post.createdAt)}
                    </span>
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.content.slice(0, 200)}...</p>
                  <div className="post-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpvote(post._id);
                      }}
                    >
                      {post.upvoteCount} upvotes
                    </button>
                    <span>{post.commentCount} replies</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {view === "post" && currentPost && (
            <div className="post-detail">
              <button
                className="back-btn"
                onClick={() => {
                  setView("subspace");
                  fetchSubspacePosts(currentPost.subspace?.name);
                }}
              >
                ← back
              </button>
              <div className="post-meta">
                <span>
                  s/{currentPost.subspace?.name}
                </span>
                <span>
                  · {currentPost.author?.displayName} ·{" "}
                  {timeAgo(currentPost.createdAt)}
                </span>
              </div>
              <h2>{currentPost.title}</h2>
              <p className="post-content">{currentPost.content}</p>
              <div className="post-actions">
                <button onClick={() => handleUpvote(currentPost._id)}>
                  {currentPost.upvoteCount} upvotes
                </button>
                <span>{currentPost.commentCount} replies</span>
                <button
                  className="delete-post-btn"
                  onClick={() => handleDeletePost(currentPost._id)}
                >
                  Delete
                </button>
              </div>

              <div className="comments-section">
                <h4>Replies</h4>
                <form onSubmit={handleCreateComment} className="comment-form">
                  <textarea
                    name="content"
                    placeholder="Add a reply..."
                    required
                  />
                  <div className="form-row">
                    <label>
                      <input type="checkbox" name="anonymous" defaultChecked />{" "}
                      anonymous
                    </label>
                    <button type="submit">Reply</button>
                  </div>
                </form>
                {comments.map((c) => (
                  <div key={c._id} className="comment">
                    <div className="comment-meta">
                      {c.author?.displayName} · {timeAgo(c.createdAt)}
                    </div>
                    <p>{c.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {showCreateSubspace && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateSubspace(false)}
        >
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateSubspace}
          >
            <h3>Create Subspace</h3>
            <input name="name" placeholder="Name (e.g., anxiety)" required />
            <input name="icon" placeholder="Emoji icon (e.g., ○)" />
            <textarea name="description" placeholder="Description" />
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowCreateSubspace(false)}
              >
                Cancel
              </button>
              <button type="submit">Create</button>
            </div>
          </form>
        </div>
      )}

      {showCreatePost && (
        <div className="modal-overlay" onClick={() => setShowCreatePost(false)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreatePost}
          >
            <h3>Create Post in s/{currentSubspace}</h3>
            <input name="title" placeholder="Title" required />
            <textarea
              name="content"
              placeholder="Share your thoughts..."
              required
              rows={6}
            />
            <label>
              <input type="checkbox" name="anonymous" defaultChecked /> Post
              anonymously
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreatePost(false)}>
                Cancel
              </button>
              <button type="submit">Post</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
