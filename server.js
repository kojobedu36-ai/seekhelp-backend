const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db"); // Neon connection
const authMiddleware = require("./middleware/auth");

// Import routes
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const messageRoutes = require("./routes/messages");
const notificationRoutes = require("./routes/notifications");
const userRoutes = require("./routes/users");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Attach io to app so routes can use it
app.set("io", io);

// Socket.IO connection
io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);

  const { userId } = socket.handshake.query;

  if (userId) {
    try {
      await pool.query(
        "UPDATE Users SET last_seen=NOW(), online=true WHERE user_id=$1",
        [userId]
      );
      io.emit("updateLastSeen", { userId, time: new Date(), online: true });
    } catch (err) {
      console.error("Error updating user online status:", err);
    }
  }

  // Join user room for notifications
  socket.on("joinRoom", (userId) => {
    socket.join(userId.toString());
    console.log(`User ${userId} joined room`);
  });

  // Typing indicator events
  socket.on("typing", ({ senderId, receiverId }) => {
    io.to(receiverId.toString()).emit("showTyping", { senderId });
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    io.to(receiverId.toString()).emit("hideTyping", { senderId });
  });

  // 🔔 Follow/unfollow notifications
  socket.on("follow", ({ followerId, followingId, followerName }) => {
    io.to(followingId.toString()).emit("newNotification", {
      type: "follow",
      message: `${followerName} started following you`,
      followerId
    });
  });

  socket.on("unfollow", ({ followerId, followingId, followerName }) => {
    io.to(followingId.toString()).emit("newNotification", {
      type: "unfollow",
      message: `${followerName} unfollowed you`,
      followerId
    });
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);
    if (userId) {
      try {
        const result = await pool.query(
          "UPDATE Users SET last_seen=NOW(), online=false WHERE user_id=$1 RETURNING last_seen",
          [userId]
        );
        io.emit("updateLastSeen", {
          userId,
          time: result.rows[0].last_seen,
          online: false
        });
      } catch (err) {
        console.error("Error updating user offline status:", err);
      }
    }
  });
});

// Routes
app.use("/auth", authRoutes);
app.use("/posts", authMiddleware, postRoutes);
app.use("/messages", authMiddleware, messageRoutes);
app.use("/notifications", authMiddleware, notificationRoutes);
app.use("/users", userRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

