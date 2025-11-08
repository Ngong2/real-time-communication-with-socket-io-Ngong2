import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;

export function useSocket(getToken) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function initSocket() {
      try {
        if (typeof getToken !== "function") {
          throw new Error("Authentication not initialized");
        }

        // Get token without template
        const token = await getToken();

        if (cancelled) return;

        if (!token) {
          throw new Error("No authentication token available");
        }

        console.log("🔌 Initializing socket connection...");
        const socket = io(SOCKET_URL, {
          withCredentials: true,
          transports: ["websocket", "polling"],
          auth: { token }
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("✅ Socket.IO connected", socket.id);
          setIsConnected(true);
          setSocketError(null);
        });

        socket.on("disconnect", () => {
          console.log("🔌 Socket.IO disconnected");
          setIsConnected(false);
        });

        socket.on("connect_error", (error) => {
          console.error("❌ Socket connection error:", error.message);
          setSocketError(error.message);
          setIsConnected(false);
        });

      } catch (error) {
        console.error("❌ Socket initialization failed", error);
        setSocketError(error.message);
      }
    }

    initSocket();

    return () => {
      cancelled = true;
      const socket = socketRef.current;
      if (socket) {
        console.log("🧹 Cleaning up socket connection");
        socket.removeAllListeners();
        socket.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [getToken]);

  return { 
    socket: socketRef.current, 
    isConnected, 
    socketError 
  };
}