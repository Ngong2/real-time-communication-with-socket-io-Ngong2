import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;

export function useSocket(getToken) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  useEffect(() => {
    let cancelled = false;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    async function initSocket() {
      try {
        if (typeof getToken !== "function") {
          throw new Error("Authentication not initialized");
        }

        setConnectionStatus("authenticating");
        
        // Get authentication token
        const token = await getToken();

        if (cancelled) return;

        if (!token) {
          throw new Error("No authentication token available");
        }

        console.log("🔌 Initializing socket connection...", { SOCKET_URL });

        // Close existing connection
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }

        const socket = io(SOCKET_URL, {
          withCredentials: true,
          transports: ["websocket", "polling"],
          auth: { 
            token 
          },
          query: {
            token: token
          },
          timeout: 10000,
          reconnectionAttempts: maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("✅ Socket.IO connected", socket.id);
          setIsConnected(true);
          setSocketError(null);
          setConnectionStatus("connected");
          reconnectAttempts = 0;
        });

        socket.on("disconnect", (reason) => {
          console.log("🔌 Socket.IO disconnected:", reason);
          setIsConnected(false);
          setConnectionStatus("disconnected");
          
          if (reason === "io server disconnect") {
            // Server deliberately disconnected, may need to reconnect with new auth
            setTimeout(() => {
              if (!cancelled && socketRef.current) {
                socketRef.current.connect();
              }
            }, 1000);
          }
        });

        socket.on("connect_error", (error) => {
          console.error("❌ Socket connection error:", error.message);
          setSocketError(error.message);
          setIsConnected(false);
          setConnectionStatus("error");
          
          reconnectAttempts++;
          if (reconnectAttempts >= maxReconnectAttempts) {
            console.error("Max reconnection attempts reached");
          }
        });

        socket.on("reconnect_attempt", (attempt) => {
          console.log(`🔄 Reconnection attempt ${attempt}`);
          setConnectionStatus("reconnecting");
        });

        socket.on("reconnect", (attempt) => {
          console.log("✅ Reconnected successfully");
          setConnectionStatus("connected");
        });

        socket.on("reconnect_failed", () => {
          console.error("❌ Reconnection failed");
          setConnectionStatus("failed");
        });

        // Debug events
        socket.on("ping", () => {
          console.log("🏓 Ping received");
        });

        socket.on("pong", () => {
          console.log("🏓 Pong sent");
        });

      } catch (error) {
        console.error("❌ Socket initialization failed", error);
        setSocketError(error.message);
        setConnectionStatus("error");
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
        socketRef.current = null;
      }
      setIsConnected(false);
      setConnectionStatus("disconnected");
      setSocketError(null);
    };
  }, [getToken]);

  return { 
    socket: socketRef.current, 
    isConnected, 
    socketError,
    connectionStatus
  };
}