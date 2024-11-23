import express from "express";
import { createServer } from "http"; // Use HTTP server explicitly
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express and HTTP Server
const app = express();
const httpServer = createServer(app); // Create an HTTP server
const port = process.env.PORT || 3000;

// Serve static files from "dist"
app.use(express.static(path.resolve(__dirname, "dist")));

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// Socket.IO Connection Logic
const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  socket.on("room:join", (data) => {
    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    io.to(room).emit("user:joined", { email, id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  socket.on("move:made", ({ to, row, col, symbol: HUMAN_MOVE }) => {
    io.to(to).emit("move:remote", {
      from: socket.id,
      row,
      col,
      symbol: HUMAN_MOVE,
    });
  });
});

// Start Server
httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
