import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import "./Forum.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

export default function Forum() {
  const navigate = useNavigate();
  const { subspaceSlug } = useParams();
  const { token, logout, user } = useAuth();

  const [view, setView] = useState("feed");
  const [subspaces, setSubspaces] = useState([]);
  const [posts, setPosts] = useState([]);
  const [currentSubspace, setCurrentSubspace] = useState(null);
  const [currentPost, setCurrentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postSubspaceSelection, setPostSubspaceSelection] = useState("");
  const [subspaceSearchQuery, setSubspaceSearchQuery] = useState("");
  const [pickerSearchResults, setPickerSearchResults] = useState([]);
  const [postFormError, setPostFormError] = useState("");
  const [sortBy, setSortBy] = useState("hot");

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchUserSubspaces();
    if (subspaceSlug) fetchSubspacePosts(subspaceSlug);
    else fetchFeed();
  }, [subspaceSlug]);

  useEffect(() => {
    if (view === "feed") fetchFeed();
    if (view === "subspace" && currentSubspace) {
      fetchSubspacePosts(currentSubspace);
    }
  }, [sortBy]);

  useEffect(() => {
    if (subspaceSearchQuery.length >= 2) {
      axios
        .get(
          `${API_URL}/forum/subspaces/search?q=${subspaceSearchQuery}`,
          authHeaders
        )
        .then((res) => setPickerSearchResults(res.data))
        .catch(() => setPickerSearchResults([]));
    } else {
      setPickerSearchResults([]);
    }
  }, [subspaceSearchQuery]);

  const fetchUserSubspaces = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/forum/subspaces/mine`,
        authHeaders
      );
      setSubspaces(res.data);
    } catch {
      setSubspaces([]);
    }
  };

  const fetchFeed = async () => {
    setView("feed");
    setCurrentSubspace(null);
    const res = await axios.get(
      `${API_URL}/forum/feed?sort=${sortBy}`,
      authHeaders
    );
    setPosts(res.data);
  };

  const fetchSubspacePosts = async (slug) => {
    setView("subspace");
    setCurrentSubspace(slug);
    const res = await axios.get(
      `${API_URL}/forum/s/${encodeURIComponent(slug)}/posts?sort=${sortBy}`,
      authHeaders
    );
    setPosts(res.data);
  };

  const fetchPost = async (id) => {
    setView("post");
    const res = await axios.get(
      `${API_URL}/forum/post/${id}`,
      authHeaders
    );
    setCurrentPost(res.data);

    const c = await axios.get(
      `${API_URL}/forum/post/${id}/comments`,
      authHeaders
    );
    setComments(c.data);
  };

  const isPostOwner = (post) => {
    return (
      post.authorId === user?.id ||
      post.author?._id === user?.id
    );
  };

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  const handleUpvote = async (id) => {
    await axios.post(
      `${API_URL}/forum/post/${id}/upvote`,
      {},
      authHeaders
    );

    if (view === "feed") fetchFeed();
    else if (view === "subspace") fetchSubspacePosts(currentSubspace);
    else fetchPost(id);
  };

  const handleDeletePost = async (id) => {
    await axios.delete(
      `${API_URL}/forum/post/${id}`,
      authHeaders
    );

    if (view === "feed") fetchFeed();
    else if (view === "subspace") fetchSubspacePosts(currentSubspace);
    else navigate("/forum");
  };

  const createPost = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    let subspaceSlugValue =
      view === "subspace"
        ? currentSubspace
        : postSubspaceSelection;

    if (!subspaceSlugValue) {
      setPostFormError("Please choose a space.");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/forum/s/${encodeURIComponent(subspaceSlugValue)}/posts`,
        {
          title: formData.get("title"),
          content: formData.get("content"),
          isAnonymous: formData.get("anonymous") === "on",
        },
        authHeaders
      );

      setShowCreatePost(false);
      setPostSubspaceSelection("");
      setSubspaceSearchQuery("");
      setPickerSearchResults([]);
      setPostFormError("");

      if (view === "subspace") fetchSubspacePosts(currentSubspace);
      else fetchFeed();
    } catch {
      setPostFormError("Failed to create post.");
    }
  };

  return (
    <div className="forum-container">
      <aside className="forum-sidebar">
        <div className="forum-logo" onClick={() => navigate("/forum")}>
          SafeSpace
        </div>

        {subspaces.map((s) => (
          <div
            key={s._id}
            className="subspace-item"
            onClick={() =>
              navigate(`/forum/s/${encodeURIComponent(s.slug || s.name)}`)
            }
          >
            #{s.name}
          </div>
        ))}
      </aside>

      <div className="forum-main">
        <header className="forum-header">
          <h1>
            {view === "feed"
              ? "home feed"
              : view === "subspace"
              ? `s/${currentSubspace}`
              : currentPost?.title}
          </h1>
          <button onClick={logout}>Logout</button>
        </header>

        <div className="forum-feed">
          {(view === "feed" || view === "subspace") && (
            <>
              <div
                className="post-composer"
                onClick={() => setShowCreatePost(true)}
              >
                Share what's on your mind...
              </div>

              {posts.map((post) => (
                <div
                  key={post._id}
                  className="post-card"
                  onClick={() => fetchPost(post._id)}
                >
                  <h3 className="post-title">{post.title}</h3>

                  <p className="post-content">
                    {post.content.slice(0, 200)}
                  </p>

                  <div className="post-meta">
                    u/{post.isAnonymous ? "anonymous" : post.author?.displayName}
                    {" • "}
                    {timeAgo(post.createdAt)}
                  </div>

                  <div className="post-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpvote(post._id);
                      }}
                    >
                      ▲ {post.upvoteCount}
                    </button>

                    {isPostOwner(post) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePost(post._id);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {view === "post" && currentPost && (
            <div className="post-detail">
              <h2>{currentPost.title}</h2>
              <p>{currentPost.content}</p>

              <div>
                u/{currentPost.isAnonymous
                  ? "anonymous"
                  : currentPost.author?.displayName}
              </div>

              {isPostOwner(currentPost) && (
                <button onClick={() => handleDeletePost(currentPost._id)}>
                  Delete
                </button>
              )}

              {comments.map((c) => (
                <div key={c._id}>
                  u/{c.isAnonymous ? "anonymous" : c.author?.displayName}
                  <p>{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreatePost && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreatePost(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={createPost}>
              <input name="title" placeholder="Title" required />
              <textarea name="content" required />

              {view !== "subspace" && (
                <>
                  <input
                    placeholder="Search space..."
                    value={subspaceSearchQuery}
                    onChange={(e) =>
                      setSubspaceSearchQuery(e.target.value)
                    }
                  />

                  {(subspaceSearchQuery.length >= 2
                    ? pickerSearchResults
                    : subspaces
                  ).map((s) => (
                    <div
                      key={s._id}
                      className={`subspace-option ${
                        postSubspaceSelection === (s.slug || s.name)
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setPostSubspaceSelection(s.slug || s.name)
                      }
                    >
                      {s.name}
                    </div>
                  ))}
                </>
              )}

              <label>
                <input type="checkbox" name="anonymous" />
                Post anonymously
              </label>

              {postFormError && <div>{postFormError}</div>}

              <button type="submit">Post</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}