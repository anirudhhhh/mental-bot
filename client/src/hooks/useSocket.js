import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5001";

export function useSocket(token) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      console.log("No token, skipping socket connection");
      return;
    }

    console.log("Connecting to socket with token...");
    
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("Socket connected!", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
    });

    socketRef.current = socket;

    return () => {
      console.log("Cleaning up socket");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const sendMessage = useCallback((message) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      console.log("Sending message:", message);
      socket.emit("send_message", { message });
    } else {
      console.error("Socket not connected, cannot send");
    }
  }, []);

  const onMessage = useCallback((callback) => {
    const socket = socketRef.current;
    if (socket) {
      socket.on("receive_message", callback);
      return () => socket.off("receive_message", callback);
    }
    return () => {};
  }, [isConnected]);

  const onTyping = useCallback((callback) => {
    const socket = socketRef.current;
    if (socket) {
      socket.on("typing", callback);
      return () => socket.off("typing", callback);
    }
    return () => {};
  }, [isConnected]);

  return { sendMessage, onMessage, onTyping, isConnected };
}
