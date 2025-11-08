import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://real-time-communication-with-socket-io-jfaw.onrender.com";
const TOKEN_TEMPLATE = import.meta.env.VITE_CLERK_JWT_TEMPLATE || "integration_fallback";

const createAuthenticatedClient = (getToken) => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json"
    },
    timeout: 10000,
    withCredentials: true
  });

  instance.interceptors.request.use(async (config) => {
    if (typeof getToken !== "function") {
      console.error("getToken is not a function");
      return Promise.reject(new Error("Authentication not initialized"));
    }

    try {
      // Try to get session token
      let token = null;
      try {
        token = await getToken();
      } catch (err) {
        console.error("Failed to get session token:", err);
        return Promise.reject(new Error("Failed to get authentication token"));
      }

      if (!token) {
        return Promise.reject(new Error("No authentication token available"));
      }

      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
        "X-Request-Id": Math.random().toString(36).substring(7)
      };
      
      return config;
    } catch (error) {
      console.error("Request interceptor error:", error);
      return Promise.reject(error);
    }

    return config;
  });

  return instance;
};

export function createApiClient(getToken) {
  const client = createAuthenticatedClient(getToken);

  return {
    users: {
      async list() {
        const res = await client.get("/api/users");
        return res.data;
      },
      async syncProfile(payload) {
        const res = await client.post("/api/users/sync", payload);
        return res.data;
      }
    },
    conversations: {
      async list() {
        const res = await client.get("/api/conversations");
        return res.data;
      },
      async ensureConversation(targetUserId) {
        const res = await client.post("/api/conversations", { targetUserId });
        return res.data;
      },
      async getDetail(conversationId) {
        const res = await client.get(`/api/conversations/${conversationId}`);
        return res.data;
      }
    },
    messages: {
      async list(conversationId) {
        const res = await client.get(`/api/messages/${conversationId}`);
        return res.data;
      },
      async send(conversationId, text) {
        const res = await client.post("/api/messages", {
          conversationId,
          text
        });
        return res.data;
      }
    }
  };
}
