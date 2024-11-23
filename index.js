const express = require("express");
const path = require("path");
const { Server } = require("socket.io");
require("dotenv").config();

// Set up Express
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the "dist" folder
app.use(express.static(path.resolve(__dirname, "dist")));

// Serve index.html (or other entry point) for any other route
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "dist"));
});

// Initialize Socket.IO
const io = new Server(app.listen(port), {
  cors: {
    origin: "*",
  },
});

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);

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
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  // Human move
  socket.on("move:made", ({ to, row, col, symbol: HUMAN_MOVE }) => {
    console.log("move:made", { to, row, col, symbol: HUMAN_MOVE });
    io.to(to).emit("move:remote", {
      from: socket.id,
      row,
      col,
      symbol: HUMAN_MOVE,
    });
  });
});
