const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 3e6
});

const PORT = process.env.PORT || 3000;
const ROOMS = [
  "General",
  "Programación Web",
  "Base de Datos",
  "Trabajos y Tareas",
  "Avisos Académicos",
  "Ayuda Estudiantil"
];

// Los usuarios viven en memoria mientras el servidor está encendido.
const users = new Map();

app.use(express.static(path.join(__dirname, "public")));

function cleanText(value, maxLength = 800) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function getRoomUsers(room) {
  return [...users.values()]
    .filter((user) => user.room === room)
    .map(({ id, username }) => ({ id, username }))
    .sort((a, b) => a.username.localeCompare(b.username, "es"));
}

function emitRoomUsers(room) {
  io.to(room).emit("roomUsers", {
    room,
    users: getRoomUsers(room)
  });
}

function emitNotification(room, message, kind = "info") {
  io.to(room).emit("notification", {
    message,
    kind,
    room,
    timestamp: new Date().toISOString()
  });
}

function leaveCurrentRoom(socket, announce = true) {
  const user = users.get(socket.id);
  if (!user) return;

  const previousRoom = user.room;
  socket.leave(previousRoom);

  if (announce) {
    socket.to(previousRoom).emit("notification", {
      message: `${user.username} salió de la sala.`,
      kind: "leave",
      room: previousRoom,
      timestamp: new Date().toISOString()
    });
  }

  users.delete(socket.id);
  emitRoomUsers(previousRoom);
}

function joinRoom(socket, usernameValue, roomValue) {
  const username = cleanText(usernameValue, 30);
  const room = ROOMS.includes(roomValue) ? roomValue : "General";

  if (username.length < 3) {
    socket.emit("notification", {
      message: "El nombre de usuario debe tener al menos 3 caracteres.",
      kind: "error"
    });
    return;
  }

  const current = users.get(socket.id);
  if (current?.username === username && current.room === room) {
    socket.emit("roomChanged", { room });
    emitRoomUsers(room);
    return;
  }

  if (current) leaveCurrentRoom(socket, true);

  socket.join(room);
  users.set(socket.id, { id: socket.id, username, room });

  socket.emit("roomChanged", { room });
  emitNotification(room, `${username} entró a la sala.`, "join");
  emitRoomUsers(room);
}

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room } = {}) => {
    joinRoom(socket, username, room);
  });

  socket.on("changeRoom", ({ room } = {}) => {
    const user = users.get(socket.id);
    if (!user || !ROOMS.includes(room) || user.room === room) return;
    joinRoom(socket, user.username, room);
  });

  socket.on("chatMessage", ({ text } = {}) => {
    const user = users.get(socket.id);
    const messageText = cleanText(text);
    if (!user || !messageText) return;

    io.to(user.room).emit("chatMessage", {
      id: `${Date.now()}-${socket.id}-${Math.random().toString(16).slice(2)}`,
      type: "text",
      username: user.username,
      room: user.room,
      text: messageText,
      timestamp: new Date().toISOString()
    });
  });

  socket.on("fileMessage", ({ fileName, fileType, fileData } = {}) => {
    const user = users.get(socket.id);
    const safeName = cleanText(fileName, 120);
    const safeType = cleanText(fileType, 80);

    if (
      !user ||
      !safeName ||
      typeof fileData !== "string" ||
      !fileData.startsWith("data:") ||
      fileData.length > 2_800_000
    ) {
      return;
    }

    io.to(user.room).emit("fileMessage", {
      id: `${Date.now()}-${socket.id}-${Math.random().toString(16).slice(2)}`,
      type: "file",
      username: user.username,
      room: user.room,
      fileName: safeName,
      fileType: safeType,
      fileData,
      timestamp: new Date().toISOString()
    });
  });

  socket.on("typing", ({ isTyping } = {}) => {
    const user = users.get(socket.id);
    if (!user) return;

    socket.to(user.room).emit("typing", {
      username: user.username,
      room: user.room,
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(socket, true);
  });
});

server.listen(PORT, () => {
  console.log(`UniChat Institucional disponible en http://localhost:${PORT}`);
});
