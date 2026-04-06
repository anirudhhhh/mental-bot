import React, { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import Auth from "./components/Auth";
import Chat from "./components/Chat";
import Forum from "./components/Forum";

export default function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState("forum");

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) return <Auth />;

  return view === "chat" 
    ? <Chat onOpenForum={() => setView("forum")} />
    : <Forum onOpenChat={() => setView("chat")} />;
}
