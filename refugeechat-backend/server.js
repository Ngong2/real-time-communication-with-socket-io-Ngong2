const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const { connectDB } = require("./config/db");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");
const { socketAuthMiddleware } = require("./middleware/socketAuth");

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

connectDB();

// --- CORS: dynamic origin handling and explicit preflight support ---
const rawAllowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultOrigins = [
  "https://real-time-communication-with-socket-pink.vercel.app",
  "http://localhost:5173"
];

const allowedOrigins = rawAllowedOrigins.length ? rawAllowedOrigins : defaultOrigins;

// Helper to decide if origin is allowed
function isOriginAllowed(origin) {
  if (!origin) return true; // non-browser or same-origin
  if (allowedOrigins.includes(origin)) return true;

  // Allow all Vercel subdomains to support preview deployments
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith(".vercel.app")) return true;
  } catch {
    // ignore URL parse errors
  }
  return false;
}

// Socket.IO CORS
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      console.warn(`Socket.IO CORS blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST"]
  }
});

const userPresence = new Map();

io.use(socketAuthMiddleware);

// HTTP CORS
const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    console.warn(`HTTP CORS blocked origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  // IMPORTANT: allow custom headers used by the frontend (e.g., X-Request-Id)
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Request-Id", "Accept"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Explicitly handle preflight requests for all routes
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.send("AREL TECH Chat API OK"));
app.get("/healthz", (req, res) => res.json({ status: "ok" }));

app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.statusCode || 500;
  const response = {
    message: err.message || "Internal server error"
  };
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }
  console.error("API error:", err);
  res.status(status).json(response);
});

io.on("connection", (socket) => {
  const { userId } = socket.data;
  if (userId) {
    userPresence.set(userId, socket.id);
    socket.join(userId);
  }

  // io.to(userId).emit("NewMessage", message)

  socket.on("conversation:join", (conversationId) => {
    if (conversationId) {
      socket.join(conversationId);
    }
  });

  socket.on("conversation:leave", (conversationId) => {
    if (conversationId) {
      socket.leave(conversationId);
    }
  });

  socket.on("message:new", ({ conversationId, message }) => {
    if (conversationId && message) {
      socket.to(conversationId).emit("message:new", { conversationId, message });
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      userPresence.delete(userId);
    }
  });
});

const PORT = process.env.PORT || 5001;  // Changed to 5001

const startServer = (port) => {
  try {
    httpServer.listen(port, () => {
      console.log(`Chat API + Socket.IO are running on http://localhost:${port}`);
    });
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  }
};

startServer(PORT);
