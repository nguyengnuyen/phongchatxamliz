const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const MAX = 100;
let messages = [];
let nextId = 1;

app.use(express.json({ limit: "20kb" }));
app.use((req, res, next) => { res.set("Access-Control-Allow-Origin", "*"); res.set("Access-Control-Allow-Headers", "Content-Type"); if (req.method === "OPTIONS") return res.sendStatus(204); next(); });
app.use(express.static("public"));

function addMessage(sender, text) {
  const m = {
    id: nextId++,
    sender: String(sender || "Ẩn danh").slice(0, 24),
    text: String(text || "").slice(0, 500),
    ts: Date.now(),
  };
  if (!m.text.trim()) return null;
  messages.push(m);
  if (messages.length > MAX) messages = messages.slice(-MAX);
  io.emit("message", m);
  return m;
}

app.get("/api/messages", (req, res) => res.json(messages));
app.post("/api/messages", (req, res) => {
  const { sender, text } = req.body || {};
  const m = addMessage(sender, text);
  if (!m) return res.status(400).json({ error: "text is required" });
  res.status(201).json(m);
});

io.on("connection", (socket) => {
  io.emit("online", io.engine.clientsCount);
  socket.emit("history", messages);
  socket.on("message", ({ sender, text } = {}) => addMessage(sender, text));
  socket.on("clear", () => { messages = []; io.emit("history", messages); });
  socket.on("disconnect", () => io.emit("online", io.engine.clientsCount));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Chạy tại cổng " + PORT));
