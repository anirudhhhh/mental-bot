import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import "./Forum.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";
const CREATE_NEW_SUBSPACE_OPTION = "__create_new_subspace__";

export default function Forum() {
  const navigate = useNavigate();
  const { subspaceSlug } = useParams();
  const [view, setView] = useState("feed");
  const [subspaces, setSubspaces] = useState([]);
  const [posts, setPosts] = useState([]);
  const [currentSubspace, setCurrentSubspace] = useState(null);
  const [currentPost, setCurrentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateSubspace, setShowCreateSubspace] = useState(false);
  const [postSubspaceSelection, setPostSubspaceSelection] = useState("");
  const [isSubspacePickerOpen, setIsSubspacePickerOpen] = useState(false);
  const [newPostSubspaceName, setNewPostSubspaceName] = useState("");
  const [newPostSubspaceDescription, setNewPostSubspaceDescription] = useState("");
  const [subspaceFormError, setSubspaceFormError] = useState("");
  const [postFormError, setPostFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [sortBy, setSortBy] = useState("hot");
  const [subspaceSearchQuery, setSubspaceSearchQuery] = useState("");
  const [pickerSearchResults, setPickerSearchResults] = useState([]);
  const { token, logout, user } = useAuth();

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const normalizeSubspaceKey = (value) => {
    if (!value) return "";
    const raw = String(value).trim().toLowerCase();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  };

  const doesSubspaceMatch = (subspace, identifier) => {
    const target = normalizeSubspaceKey(identifier);
    if (!target) return false;

    return [subspace?._id, subspace?.slug, subspace?.name]
      .map(normalizeSubspaceKey)
      .includes(target);
  };

  const updateSubspacePostCount = (identifier, delta) => {
    if (!identifier || !delta) return;

    setSubspaces((prev) =>
      prev.map((s) => {
        if (!doesSubspaceMatch(s, identifier)) return s;

        const nextCount = Math.max(0, (Number(s.postCount) || 0) + delta);
        return { ...s, postCount: nextCount };
      }),
    );
  };

  const formatCompactCount = (value) => {
    const numeric = Number(value) || 0;
    if (numeric < 1000) return String(numeric);

    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    })
      .format(numeric)
      .replace(/([A-Z])$/, (match) => match.toLowerCase());
  };

  useEffect(() => {
    fetchUserSubspaces();
    if (subspaceSlug) {
      fetchSubspacePosts(subspaceSlug, "hot");
    } else {
      fetchFeed("hot");
    }
  }, [subspaceSlug]);

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

  useEffect(() => {
    if (subspaceSearchQuery.length >= 2) {
      const delayDebounceFn = setTimeout(async () => {
        try {
          const res = await axios.get(
            `${API_URL}/forum/subspaces/search?q=${subspaceSearchQuery}`,
            authHeaders,
          );
          setPickerSearchResults(res.data);
        } catch (err) {
          setPickerSearchResults([]);
        }
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setPickerSearchResults([]);
    }
  }, [subspaceSearchQuery]);

  useEffect(() => {
    if (subspaceSlug) {
      setView("subspace");
      setCurrentSubspace(subspaceSlug);
    } else if (view === "subspace") {
      setView("feed");
      setCurrentSubspace(null);
    }
  }, [subspaceSlug]);

  useEffect(() => {
    if (!showCreatePost) return;
    setPostSubspaceSelection(currentSubspace || "");
    setIsSubspacePickerOpen(false);
    setNewPostSubspaceName("");
    setNewPostSubspaceDescription("");
    setPostFormError("");
    setSubspaceSearchQuery("");
    setPickerSearchResults([]);
  }, [showCreatePost, currentSubspace]);

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
      setCurrentPost(null);
      setPosts([]);
      const res = await axios.get(
        `${API_URL}/forum/feed?sort=${sort}`,
        authHeaders,
      );
      setPosts(res.data);
    } catch (err) {
      console.error("Failed to fetch feed:", err);
    }
  };

  const fetchSubspacePosts = async (slug, sort = sortBy) => {
    try {
      setView("subspace");
      setCurrentSubspace(slug);
      setCurrentPost(null);
      setPosts([]);
      const identifier = encodeURIComponent(slug);
      const res = await axios.get(
        `${API_URL}/forum/s/${identifier}/posts?sort=${sort}`,
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
      if (view === "feed") fetchFeed(sortBy);
      else if (view === "subspace") fetchSubspacePosts(currentSubspace, sortBy);
      else if (view === "post") fetchPost(currentPost._id);
    } catch (err) {
      console.error("Failed to upvote:", err);
    }
  };

  const handleDeletePost = async (postId) => {
    const postToDelete =
      posts.find((p) => p._id === postId) ||
      (currentPost?._id === postId ? currentPost : null);

    const targetSubspaceIdentifier =
      postToDelete?.subspace?.slug ||
      postToDelete?.subspace?.name ||
      postToDelete?.subspace?._id ||
      currentSubspace;

    try {
      updateSubspacePostCount(targetSubspaceIdentifier, -1);
      await axios.delete(`${API_URL}/forum/post/${postId}`, authHeaders);
      if (view === "feed") fetchFeed(sortBy);
      else if (view === "subspace") fetchSubspacePosts(currentSubspace, sortBy);
      else if (view === "post") {
        if (currentSubspace) fetchSubspacePosts(currentSubspace, sortBy);
        else fetchFeed(sortBy);
      }
    } catch (err) {
      updateSubspacePostCount(targetSubspaceIdentifier, 1);
    }
  };

  const handleDeleteSubspace = async (slug) => {
    try {
      const identifier = encodeURIComponent(slug);
      await axios.delete(`${API_URL}/forum/s/${identifier}`, authHeaders);
      await fetchUserSubspaces();
      if (view === "subspace" && currentSubspace === slug) {
        navigate("/forum");
      }
    } catch (err) {
      console.error("Failed to delete subspace:", err);
    }
  };

  const openCreateSubspaceModal = () => {
    setSubspaceFormError("");
    setShowCreateSubspace(true);
  };

  const closeCreateSubspaceModal = () => {
    setSubspaceFormError("");
    setShowCreateSubspace(false);
  };

  const createSubspace = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();

    setSubspaceFormError("");

    if (name.length < 3) {
      setSubspaceFormError("Space name must be at least 3 characters.");
      return;
    }

    if (!description) {
      setSubspaceFormError("Please add a short description for the space.");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/forum/subspaces`,
        { name, description },
        authHeaders,
      );
      closeCreateSubspaceModal();
      fetchUserSubspaces();
    } catch (err) {
      const apiError = err.response?.data?.error;
      setSubspaceFormError(apiError || "Could not create space. Try again.");
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setPostFormError("");

    let subspaceSlugValue = postSubspaceSelection || currentSubspace;

    if (!subspaceSlugValue) {
      setPostFormError("Please choose a space for this post.");
      return;
    }

    if (subspaceSlugValue === CREATE_NEW_SUBSPACE_OPTION) {
      const trimmedName = newPostSubspaceName.trim();
      const trimmedDescription = newPostSubspaceDescription.trim();

      if (!trimmedName || !trimmedDescription) {
        setPostFormError("Please add a name and description for the new space.");
        return;
      }

      try {
        const createdSubspaceRes = await axios.post(
          `${API_URL}/forum/subspaces`,
          { name: trimmedName, description: trimmedDescription, isPrivate: false },
          authHeaders,
        );

        const createdSubspace = createdSubspaceRes.data;
        subspaceSlugValue = createdSubspace.slug || createdSubspace.name;

        setSubspaces((prev) => {
          const exists = prev.some((s) => doesSubspaceMatch(s, subspaceSlugValue));
          if (exists) return prev;
          return [{ ...createdSubspace, postCount: createdSubspace.postCount || 0 }, ...prev];
        });
      } catch (err) {
        setPostFormError(err.response?.data?.error || "Failed to create the new space.");
        return;
      }
    }

    try {
      await axios.post(
        `${API_URL}/forum/s/${encodeURIComponent(subspaceSlugValue)}/posts`,
        {
          title: formData.get("title"),
          content: formData.get("content"),
          isAnonymous: formData.get("anonymous") === "on",
        },
        authHeaders,
      );
      updateSubspacePostCount(subspaceSlugValue, 1);
      setShowCreatePost(false);
      setIsSubspacePickerOpen(false);
      setNewPostSubspaceName("");
      setNewPostSubspaceDescription("");
      setPostFormError("");
      fetchUserSubspaces();

      if (subspaceSlugValue) {
        navigate(`/forum/s/${encodeURIComponent(subspaceSlugValue)}`);
        fetchSubspacePosts(subspaceSlugValue, sortBy);
      } else if (view === "feed") {
        fetchFeed(sortBy);
      } else if (view === "subspace") {
        fetchSubspacePosts(currentSubspace, sortBy);
      }
    } catch (err) {
      setPostFormError(err.response?.data?.error || "Failed to create post.");
    }
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

  const currentSubspaceData = subspaces.find(
    (s) => (s.slug || s.name) === currentSubspace,
  );

  const selectedSubspaceData = [...subspaces, ...pickerSearchResults].find(
    (s) => (s.slug || s.name) === postSubspaceSelection,
  );

  const selectedSubspaceLabel =
    postSubspaceSelection === CREATE_NEW_SUBSPACE_OPTION
      ? "Create new space"
      : selectedSubspaceData?.name ||
        currentSubspaceData?.name ||
        (postSubspaceSelection
          ? `s/${postSubspaceSelection}`
          : "Select a space");

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

      <aside className={`forum-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="forum-sidebar-top">
          <div
            className="forum-logo"
            onClick={() => {
              navigate("/forum");
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
                      navigate(`/forum/s/${encodeURIComponent(s.slug || s.name)}`);
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
              className={`subspace-item ${
                currentSubspace === (s.slug || s.name) ? "active" : ""
              }`}
              onClick={() => {
                navigate(`/forum/s/${encodeURIComponent(s.slug || s.name)}`);
                setSidebarOpen(false);
              }}
              onContextMenu={(e) => handleContextMenu(e, s.slug || s.name, true)}
            >
              <span className="subspace-prefix">#</span>
              <span className="subspace-name">{s.name}</span>
              <div className="subspace-count-menu">
                <span className="member-count">{formatCompactCount(s.postCount ?? 0)}</span>
                <button
                  className="subspace-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === (s.slug || s.name) ? null : s.slug || s.name);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </div>
              {menuOpen === (s.slug || s.name) && (
                <div className="subspace-menu" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="delete-option"
                    onClick={() => {
                      handleDeleteSubspace(s.slug || s.name);
                      setMenuOpen(null);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete space
                  </button>
                </div>
              )}
            </div>
          ))}

          <button className="new-space-btn" onClick={openCreateSubspaceModal}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Space
          </button>
        </div>

        <div className="gentle-reminder">
          <h4>Gentle reminder</h4>
          <p>Share at your own pace. You can post anonymously and find moderated subspaces designed to feel calm and safe.</p>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{user?.displayName?.[0]?.toUpperCase() || "U"}</div>
          <div className="user-info">
            <div className="user-name">{user?.displayName || "Anonymous"}</div>
            <div className="user-status">Community Member</div>
          </div>
        </div>
      </aside>

      <div className="forum-main">
        <header className="forum-header">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <h1>
            {view === "feed" ? "home feed" : view === "subspace" ? `s/${currentSubspace || subspaceSlug || ""}` : currentPost?.title}
          </h1>

          <div className="header-pills">
            {["hot", "new", "top"].map((s) => (
              <button
                key={s}
                className={`header-pill ${sortBy === s ? "active" : ""}`}
                onClick={() => {
                  setSortBy(s);
                  if (view === "post") window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="header-actions-right">
            <button className="header-action-btn" onClick={() => navigate("/chat")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Chat
            </button>
            <button className="header-action-btn accent" onClick={openCreateSubspaceModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              SubSpace
            </button>
            <button className="header-action-btn logout" onClick={logout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        <div className="forum-feed">
          {view === "feed" && (
            <>
              <div className="post-composer">
                <div className="composer-avatar">{user?.displayName?.[0]?.toUpperCase() || "U"}</div>
                <input
                  type="text"
                  placeholder="Share what's on your mind..."
                  onClick={() => setShowCreatePost(true)}
                  readOnly
                />
                <button className="post-btn" onClick={() => setShowCreatePost(true)}>Post</button>
              </div>

              <div className="guidelines-banner">
                <div className="banner-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div className="banner-content">
                  <h3>Community Guidelines & Crisis Resources</h3>
                  <p>SafeSpace is a supportive environment for sharing stories, asking for comfort, and finding trusted resources.</p>
                </div>
              </div>

              {posts.map((post) => (
                <div key={post._id} className="post-card" onClick={() => fetchPost(post._id)}>
                  <div className="post-header">
                    <span className="subspace-tag">s/{post.subspace?.name}</span>
                    <span className="post-meta">Posted by u/{post.author?.displayName}</span>
                    <span className="post-time">{timeAgo(post.createdAt)}</span>
                  </div>
                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-content">{post.content.slice(0, 200)}{post.content.length > 200 ? "..." : ""}</p>
                  <div className="post-actions">
                    <button
                      className={`action-btn upvote-btn ${post.hasUpvoted ? "upvoted" : ""}`}
                      onClick={(e) => { e.stopPropagation(); handleUpvote(post._id); }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
                      {post.upvoteCount}
                    </button>
                    <button className="action-btn comment-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      {post.commentCount || 0} Comments
                    </button>
                    {isPostOwner(post) && (
                      <button className="action-btn delete-btn" onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {view === "subspace" && (
            <>
              <div className="subspace-header">
                <button className="new-post-btn" onClick={() => setShowCreatePost(true)}>
                  <svg viewBox="2 2 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>New Post</span>
                </button>
              </div>
              {posts.map((post) => (
                <div key={post._id} className="post-card" onClick={() => fetchPost(post._id)}>
                  <div className="post-header">
                    <span className="post-meta">Posted by u/{post.author?.displayName}</span>
                    <span className="post-time">{timeAgo(post.createdAt)}</span>
                  </div>
                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-content">{post.content.slice(0, 200)}{post.content.length > 200 ? "..." : ""}</p>
                  <div className="post-actions">
                    <button
                      className={`action-btn upvote-btn ${post.hasUpvoted ? "upvoted" : ""}`}
                      onClick={(e) => { e.stopPropagation(); handleUpvote(post._id); }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
                      {post.upvoteCount}
                    </button>
                    <button className="action-btn comment-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      {post.commentCount || 0} Comments
                    </button>
                    {isPostOwner(post) && (
                      <button className="action-btn delete-btn" onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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
              <button className="back-btn" onClick={() => (currentSubspace ? fetchSubspacePosts(currentSubspace, sortBy) : fetchFeed(sortBy))}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                Back
              </button>
              <div className="post-card detail">
                <div className="post-header">
                  <span className="subspace-tag">s/{currentPost.subspace?.name}</span>
                  <span className="post-meta">Posted by u/{currentPost.author?.displayName}</span>
                  <span className="post-time">{timeAgo(currentPost.createdAt)}</span>
                </div>
                <h1 className="post-title">{currentPost.title}</h1>
                <div className="post-content">{currentPost.content}</div>
                <div className="post-actions">
                  <button className={`action-btn upvote-btn ${currentPost.hasUpvoted ? "upvoted" : ""}`} onClick={() => handleUpvote(currentPost._id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
                    {currentPost.upvoteCount}
                  </button>
                  <span className="comment-count">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    {comments.length} Comments
                  </span>
                  {isPostOwner(currentPost) && (
                    <button className="action-btn delete-btn" onClick={() => handleDeletePost(currentPost._id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <div className="comments-section">
                <h4>Comments</h4>
                <form className="comment-form" onSubmit={createComment}>
                  <textarea name="content" placeholder="Share your thoughts..." required rows={3} />
                  <div className="form-row">
                    <label className="forum-form-checkbox"><input type="checkbox" name="anonymous" /> <span>Post anonymously</span></label>
                    <button type="submit">Reply</button>
                  </div>
                </form>
                <div className="comments-list">
                  {comments.map((c) => (
                    <div key={c._id} className="comment">
                      <div className="comment-meta"><span>u/{c.author?.displayName}</span><span>{timeAgo(c.createdAt)}</span></div>
                      <p>{c.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateSubspace && (
        <div className="modal-overlay" onClick={closeCreateSubspaceModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Space</h3>
            <form onSubmit={createSubspace}>
              <input name="name" placeholder="Space name" required />
              <textarea name="description" placeholder="Description" required />
              {subspaceFormError && <div className="modal-form-error">{subspaceFormError}</div>}
              <div className="modal-actions">
                <button type="button" onClick={closeCreateSubspaceModal}>Cancel</button>
                <button type="submit">Create Space</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreatePost && (
        <div className="modal-overlay" onClick={() => setShowCreatePost(false)}>
          <div className="modal create-post-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Post</h3>
            <form onSubmit={createPost}>
              <input name="title" placeholder="Post title" required />
              <textarea name="content" placeholder="Share your thoughts..." required rows={5} />
              
              {view !== "subspace" && (
                <div className="subspace-picker">
                  <button
                    type="button"
                    className={`subspace-picker-trigger ${!postSubspaceSelection ? "placeholder" : ""}`}
                    onClick={() => setIsSubspacePickerOpen((prev) => !prev)}
                  >
                    <span>{selectedSubspaceLabel}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>

                  {isSubspacePickerOpen && (
                    <div className="subspace-picker-menu" onClick={(e) => e.stopPropagation()}>
                      <div className="subspace-picker-search">
                        <input
                          type="text"
                          placeholder="Search spaces..."
                          value={subspaceSearchQuery}
                          onChange={(e) => setSubspaceSearchQuery(e.target.value)}
                        />
                      </div>
                      {(subspaceSearchQuery.length >= 2 ? pickerSearchResults : subspaces).map((s) => (
                        <button
                          key={s._id}
                          type="button"
                          className={`subspace-picker-option ${postSubspaceSelection === (s.slug || s.name) ? "active" : ""}`}
                          onClick={() => { setPostSubspaceSelection(s.slug || s.name); setIsSubspacePickerOpen(false); }}
                        >
                          <span className="picker-opt-prefix">#</span>{s.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`subspace-picker-option create-new ${postSubspaceSelection === CREATE_NEW_SUBSPACE_OPTION ? "active" : ""}`}
                        onClick={() => { setPostSubspaceSelection(CREATE_NEW_SUBSPACE_OPTION); setIsSubspacePickerOpen(false); }}
                      >
                        + Create new space
                      </button>
                    </div>
                  )}
                </div>
              )}

              {postSubspaceSelection === CREATE_NEW_SUBSPACE_OPTION && (
                <>
                  <input name="newSubspaceName" placeholder="New space name" value={newPostSubspaceName} onChange={(e) => setNewPostSubspaceName(e.target.value)} required />
                  <textarea name="newSubspaceDescription" placeholder="New space description" value={newPostSubspaceDescription} onChange={(e) => setNewPostSubspaceDescription(e.target.value)} rows={3} required />
                </>
              )}

              {postFormError && <div className="modal-form-error">{postFormError}</div>}
              <label className="forum-form-checkbox"><input type="checkbox" name="anonymous" /> <span>Post anonymously</span></label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreatePost(false)}>Cancel</button>
                <button type="submit">Create Post</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
