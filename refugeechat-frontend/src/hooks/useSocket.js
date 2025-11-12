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

        console.log("🔌 Initializing socket connection...", { SOCKET_URL });

        const socket = io(SOCKET_URL, {
          withCredentials: true,
          // try websocket first, then polling
          transports: ["websocket", "polling"],
          // tuning reconnection behavior for flaky networks / proxies
          timeout: 20000, // 20s connect timeout
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
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
          // socket.io may provide an Error object or plain string
          try {
            console.error("❌ Socket connection error:", error && error.message ? error.message : error);
            // some errors include additional data
            if (error && error.data) console.error("Socket error data:", error.data);
            setSocketError(error && error.message ? error.message : String(error));
          } catch (e) {
            console.error("Socket connect_error processing failed", e);
            setSocketError(String(error));
          }
          setIsConnected(false);
        });

        socket.on("reconnect_attempt", (attempt) => {
          console.log(`🔁 Socket reconnect attempt ${attempt}`);
        });

        socket.on("reconnect_failed", () => {
          console.warn("⚠️ Socket reconnect failed");
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