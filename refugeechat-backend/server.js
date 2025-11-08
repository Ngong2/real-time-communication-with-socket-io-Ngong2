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

// Enhanced CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

// Add common development and production origins
const defaultOrigins = [
  "https://real-time-communication-with-socket-pink.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://real-time-communication-with-socket-io-jfaw.onrender.com"
];

const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;

console.log("🛡️  CORS allowed origins:", corsOrigins);

// HTTP CORS middleware - apply to all routes
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Socket.IO configuration with enhanced CORS
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

const userPresence = new Map();

// Apply socket authentication
io.use(socketAuthMiddleware);

// Routes
app.get("/", (req, res) => res.send("AREL TECH Chat API OK"));
app.get("/healthz", (req, res) => res.json({ status: "ok" }));

app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  // CORS error handling
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      message: "CORS policy: Origin not allowed",
      allowedOrigins: corsOrigins 
    });
  }

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

// Socket.IO event handlers
io.on("connection", (socket) => {
  const { userId } = socket.data;
  console.log(`🔗 User ${userId} connected with socket ${socket.id}`);
  
  if (userId) {
    userPresence.set(userId, socket.id);
    socket.join(userId);
    
    // Notify others that user came online
    socket.broadcast.emit("user:online", { userId });
  }

  socket.on("conversation:join", (conversationId) => {
    if (conversationId) {
      socket.join(conversationId);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    }
  });

  socket.on("conversation:leave", (conversationId) => {
    if (conversationId) {
      socket.leave(conversationId);
      console.log(`User ${userId} left conversation ${conversationId}`);
    }
  });

  socket.on("message:new", ({ conversationId, message }) => {
    if (conversationId && message) {
      console.log(`New message in conversation ${conversationId} from user ${userId}`);
      socket.to(conversationId).emit("message:new", { 
        conversationId, 
        message,
        senderId: userId
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔌 User ${userId} disconnected: ${reason}`);
    if (userId) {
      userPresence.delete(userId);
      // Notify others that user went offline
      socket.broadcast.emit("user:offline", { userId });
    }
  });
});

const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Chat API + Socket.IO running on port ${PORT}`);
  console.log(`🛡️  CORS enabled for:`, corsOrigins);
});

module.exports = { app, io };