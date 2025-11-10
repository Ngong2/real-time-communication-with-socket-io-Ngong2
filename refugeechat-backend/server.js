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

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length
      ? allowedOrigins
      : ["https://real-time-communication-with-socket-pink.vercel.app", "http://localhost:5173"],
    credentials: true
  }
});

const userPresence = new Map();

io.use(socketAuthMiddleware);

const httpCorsOrigins = allowedOrigins.length
  ? allowedOrigins
  : ["https://real-time-communication-with-socket-pink.vercel.app", "http://localhost:5173"];

const corsOptions = {
  origin: httpCorsOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
};

app.use(cors(corsOptions));

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
