const compression = require("compression");
const express = require("express");
const http = require("http");
const os = require("os");
const path = require("path");
const { Server } = require("socket.io");
const { RoomRegistry } = require("./src/room");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = new RoomRegistry();
const port = Number(process.env.PORT || 3000);

app.use(compression());
app.use(
  express.static(path.join(__dirname, "public"), {
    etag: true,
    maxAge: 0,
  }),
);

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name }, ack) => {
    tryAction(ack, () => {
      leaveExistingRoom(socket);
      const room = rooms.createRoom();
      const player = room.addClient(socket.id, cleanName(name));
      rooms.socketToRoom.set(socket.id, room.code);
      socket.join(room.code);
      broadcastRoom(room);
      return { roomCode: room.code, playerId: player.id };
    });
  });

  socket.on("joinRoom", ({ roomCode, name }, ack) => {
    tryAction(ack, () => {
      leaveExistingRoom(socket);
      const room = rooms.getRoom(roomCode);
      if (!room) throw new Error("没有找到这个房间");
      const player = room.addClient(socket.id, cleanName(name));
      rooms.socketToRoom.set(socket.id, room.code);
      socket.join(room.code);
      broadcastRoom(room);
      return { roomCode: room.code, playerId: player.id };
    });
  });

  socket.on("startGame", (ack) => {
    tryRoomAction(socket, ack, (room) => {
      room.startGame(socket.id);
      broadcastRoom(room);
    });
  });

  socket.on("submitClue", ({ word, count }, ack) => {
    tryRoomAction(socket, ack, (room) => {
      room.game.submitClue(socket.id, word, count);
      broadcastRoom(room);
    });
  });

  socket.on("revealCard", ({ cardId }, ack) => {
    tryRoomAction(socket, ack, (room) => {
      room.game.revealCard(socket.id, cardId);
      broadcastRoom(room);
    });
  });

  socket.on("castVote", ({ cardId }, ack) => {
    tryRoomAction(socket, ack, (room) => {
      room.game.castVote(socket.id, cardId);
      broadcastRoom(room);
    });
  });

  socket.on("resolveVote", (ack) => {
    tryRoomAction(socket, ack, (room) => {
      room.game.resolveVote(socket.id);
      broadcastRoom(room);
    });
  });

  socket.on("endTurn", (ack) => {
    tryRoomAction(socket, ack, (room) => {
      room.game.endTurn(socket.id);
      broadcastRoom(room);
    });
  });

  socket.on("backToLobby", (ack) => {
    tryRoomAction(socket, ack, (room) => {
      room.backToLobby(socket.id);
      broadcastRoom(room);
    });
  });

  socket.on("disconnect", () => {
    const room = rooms.removeClient(socket.id);
    if (room) broadcastRoom(room);
  });
});

function cleanName(name) {
  const value = String(name || "").trim();
  if (!value) throw new Error("请输入玩家名字");
  return value.slice(0, 10);
}

function tryAction(ack, fn) {
  try {
    const data = fn();
    ack?.({ ok: true, ...data });
  } catch (error) {
    ack?.({ ok: false, error: error.message });
  }
}

function tryRoomAction(socket, ack, fn) {
  tryAction(ack, () => {
    const room = rooms.findBySocket(socket.id);
    if (!room) throw new Error("你还没有加入房间");
    fn(room);
    return {};
  });
}

function broadcastRoom(room) {
  for (const client of room.players) {
    io.to(client.id).emit("state", room.getStateFor(client.id));
  }
}

function leaveExistingRoom(socket) {
  const oldRoom = rooms.findBySocket(socket.id);
  if (!oldRoom) return;
  socket.leave(oldRoom.code);
  rooms.removeClient(socket.id);
  if (oldRoom.players.length > 0) broadcastRoom(oldRoom);
}

server.listen(port, () => {
  console.log(`Catnames server running at http://localhost:${port}`);
  for (const address of getLanAddresses()) {
    console.log(`LAN URL: http://${address}:${port}`);
  }
});

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => item.address);
}
