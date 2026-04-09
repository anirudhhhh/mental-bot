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
  const { token, logout, user } = useAuth();

  const [view, setView] = useState("feed");
  const [subspaces, setSubspaces] = useState([]);
  const [posts, setPosts] = useState([]);
  const [currentSubspace, setCurrentSubspace] = useState(null);
  const [currentPost, setCurrentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postSubspaceSelection, setPostSubspaceSelection] = useState("");
  const [isSubspacePickerOpen, setIsSubspacePickerOpen] = useState(false);
  const [subspaceSearchQuery, setSubspaceSearchQuery] = useState("");
  const [pickerSearchResults, setPickerSearchResults] = useState([]);
  const [postFormError, setPostFormError] = useState("");
  const [sortBy, setSortBy] = useState("hot");

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // ------------------- FETCH -------------------
  useEffect(() => {
    fetchUserSubspaces();
    if (subspaceSlug) fetchSubspacePosts(subspaceSlug);
    else fetchFeed();
  }, [subspaceSlug]);

  const fetchUserSubspaces = async () => {
    try {
      const res = await axios.get(`${API_URL}/forum/subspaces/mine`, authHeaders);
      setSubspaces(res.data);
    } catch {
      setSubspaces([]);
    }
  };

  const fetchFeed = async () => {
    setView("feed");
    const res = await axios.get(`${API_URL}/forum/feed?sort=${sortBy}`, authHeaders);
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
    const res = await axios.get(`${API_URL}/forum/post/${id}`, authHeaders);
    setCurrentPost(res.data);

    const c = await axios.get(`${API_URL}/forum/post/${id}/comments`, authHeaders);
    setComments(c.data);
  };

  // ------------------- HELPERS -------------------
  const isPostOwner = (post) => post.authorId === user?.id;

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  // ------------------- ACTIONS -------------------
  const handleUpvote = async (id) => {
    await axios.post(`${API_URL}/forum/post/${id}/upvote`, {}, authHeaders);
    if (view === "feed") fetchFeed();
    else if (view === "subspace") fetchSubspacePosts(currentSubspace);
    else fetchPost(id);
  };

  const handleDeletePost = async (id) => {
    await axios.delete(`${API_URL}/forum/post/${id}`, authHeaders);
    if (view === "feed") fetchFeed();
    else if (view === "subspace") fetchSubspacePosts(currentSubspace);
    else navigate("/forum");
  };

  // ------------------- CREATE POST -------------------
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

      if (view === "subspace") fetchSubspacePosts(currentSubspace);
      else fetchFeed();
    } catch {
      setPostFormError("Failed to create post.");
    }
  };

  // ------------------- SEARCH -------------------
  useEffect(() => {
    if (subspaceSearchQuery.length >= 2) {
      axios
        .get(`${API_URL}/forum/subspaces/search?q=${subspaceSearchQuery}`, authHeaders)
        .then((res) => setPickerSearchResults(res.data))
        .catch(() => setPickerSearchResults([]));
    } else setPickerSearchResults([]);
  }, [subspaceSearchQuery]);

  const selectedSubspaceData = [...subspaces, ...pickerSearchResults].find(
    (s) => (s.slug || s.name) === postSubspaceSelection
  );

  const selectedSubspaceLabel =
    selectedSubspaceData?.name || "Search or choose a space";

  // ------------------- UI -------------------
  return (
    <div className="forum-container">

      {/* HEADER */}
      <header>
        <h1>
          {view === "feed"
            ? "home feed"
            : view === "subspace"
            ? `s/${currentSubspace}`
            : currentPost?.title}
        </h1>
        <button onClick={logout}>Logout</button>
      </header>

      {/* FEED */}
      {view === "feed" && (
        <>
          <button onClick={() => setShowCreatePost(true)}>Create Post</button>

          {posts.map((post) => (
            <div key={post._id} onClick={() => fetchPost(post._id)}>
              <h3>{post.title}</h3>
              <p>{post.content.slice(0, 120)}</p>

              <div>
                u/{post.isAnonymous ? "anonymous" : post.author?.displayName}
                {" • "}
                {timeAgo(post.createdAt)}
              </div>

              <button onClick={(e) => { e.stopPropagation(); handleUpvote(post._id); }}>
                ▲ {post.upvoteCount}
              </button>

              {isPostOwner(post) && (
                <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }}>
                  Delete
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {/* SUBSPACE */}
      {view === "subspace" && (
        <>
          <button onClick={() => setShowCreatePost(true)}>New Post</button>

          {posts.map((post) => (
            <div key={post._id} onClick={() => fetchPost(post._id)}>
              <h3>{post.title}</h3>
              <p>{post.content.slice(0, 120)}</p>

              <div>
                u/{post.isAnonymous ? "anonymous" : post.author?.displayName}
              </div>

              {isPostOwner(post) && (
                <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }}>
                  Delete
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {/* POST DETAIL */}
      {view === "post" && currentPost && (
        <div>
          <button onClick={() => navigate(-1)}>Back</button>

          <h2>{currentPost.title}</h2>
          <p>{currentPost.content}</p>

          <div>
            u/{currentPost.isAnonymous ? "anonymous" : currentPost.author?.displayName}
          </div>

          {isPostOwner(currentPost) && (
            <button onClick={() => handleDeletePost(currentPost._id)}>
              Delete
            </button>
          )}

          {/* COMMENTS */}
          {comments.map((c) => (
            <div key={c._id}>
              u/{c.isAnonymous ? "anonymous" : c.author?.displayName}
              <p>{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* CREATE POST MODAL */}
      {showCreatePost && (
        <div className="modal">
          <form onSubmit={createPost}>
            <input name="title" placeholder="Title" required />
            <textarea name="content" required />

            {/* ONLY SHOW PICKER ON HOME */}
            {view !== "subspace" && (
              <>
                <input
                  placeholder="Search space..."
                  value={subspaceSearchQuery}
                  onChange={(e) => setSubspaceSearchQuery(e.target.value)}
                />

                {(subspaceSearchQuery.length >= 2
                  ? pickerSearchResults
                  : subspaces
                ).map((s) => (
                  <div
                    key={s._id}
                    onClick={() => setPostSubspaceSelection(s.slug || s.name)}
                  >
                    {s.name}
                  </div>
                ))}
              </>
            )}

            <label>
              <input type="checkbox" name="anonymous" />
              Anonymous
            </label>

            {postFormError && <div>{postFormError}</div>}

            <button type="submit">Post</button>
          </form>
        </div>
      )}
    </div>
  );
}
