const compression = require("compression");
const express = require("express");
const http = require("http");
const os = require("os");
const path = require("path");
const { Server } = require("socket.io");
const { RoomRegistry } = require("./src/room");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingInterval: 25_000,
  pingTimeout: 60_000,
});
const rooms = new RoomRegistry();
const port = Number(process.env.PORT || 3000);

process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[FATAL] unhandledRejection:", err);
});

app.use(compression());
app.use(
  express.static(path.join(__dirname, "public"), {
    etag: true,
    maxAge: 0,
  }),
);

io.on("connection", (socket) => {
  console.log("[connect]", socket.id);

  socket.on("createRoom", ({ name }, ack) => {
    tryAction(ack, () => {
      leaveExistingRoom(socket);
      const room = rooms.createRoom();
      const player = room.addClient(socket.id, cleanName(name));
      rooms.registerSocket(socket.id, room);
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
      rooms.registerSocket(socket.id, room);
      socket.join(room.code);
      broadcastRoom(room);
      return { roomCode: room.code, playerId: player.id };
    });
  });

  socket.on("resumeRoom", ({ roomCode, playerId, name }, ack) => {
    tryAction(ack, () => {
      leaveExistingRoom(socket);
      const room = rooms.getRoom(roomCode);
      if (!room) throw new Error("房间已经不存在");
      const player = room.resumeClient(socket.id, String(playerId || ""), String(name || "").trim().slice(0, 10));
      rooms.registerSocket(socket.id, room);
      socket.join(room.code);
      broadcastRoom(room);
      return { roomCode: room.code, playerId: player.id };
    });
  });

  socket.on("startGame", (ack) => {
    tryRoomAction(socket, ack, (room, player) => {
      room.startGame(player.id);
      broadcastRoom(room);
    });
  });

  socket.on("submitClue", ({ word, count }, ack) => {
    console.log("[submitClue]", socket.id, word, count);
    tryRoomAction(socket, ack, (room, player) => {
      if (!room.game) throw new Error("游戏还没有开始");
      room.game.submitClue(player.id, word, count);
      broadcastRoom(room);
    });
  });

  socket.on("revealCard", ({ cardId }, ack) => {
    tryRoomAction(socket, ack, (room, player) => {
      if (!room.game) throw new Error("游戏还没有开始");
      room.game.revealCard(player.id, cardId);
      broadcastRoom(room);
    });
  });

  socket.on("castVote", ({ cardId }, ack) => {
    tryRoomAction(socket, ack, (room, player) => {
      if (!room.game) throw new Error("游戏还没有开始");
      room.game.castVote(player.id, cardId);
      broadcastRoom(room);
    });
  });

  socket.on("resolveVote", (ack) => {
    tryRoomAction(socket, ack, (room, player) => {
      if (!room.game) throw new Error("游戏还没有开始");
      room.game.resolveVote(player.id);
      broadcastRoom(room);
    });
  });

  socket.on("endTurn", (ack) => {
    tryRoomAction(socket, ack, (room, player) => {
      if (!room.game) throw new Error("游戏还没有开始");
      room.game.endTurn(player.id);
      broadcastRoom(room);
    });
  });

  socket.on("backToLobby", (ack) => {
    tryRoomAction(socket, ack, (room, player) => {
      room.backToLobby(player.id);
      broadcastRoom(room);
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("[disconnect]", socket.id, reason);
    const room = rooms.disconnectSocket(socket.id, broadcastRoom);
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
    console.error("[tryAction]", error);
    ack?.({ ok: false, error: error.message });
  }
}

function tryRoomAction(socket, ack, fn) {
  tryAction(ack, () => {
    const room = rooms.findBySocket(socket.id);
    if (!room) throw new Error("你还没有加入房间");
    const player = room.getPlayerBySocket(socket.id);
    if (!player) throw new Error("连接状态已经失效，请重新加入房间");
    fn(room, player);
    return {};
  });
}

function broadcastRoom(room) {
  try {
    for (const client of room.connectedPlayers) {
      io.to(client.socketId).emit("state", room.getStateFor(client.id));
    }
  } catch (error) {
    console.error("[broadcastRoom]", error);
  }
}

function leaveExistingRoom(socket) {
  const oldRoom = rooms.findBySocket(socket.id);
  if (!oldRoom) return;
  socket.leave(oldRoom.code);
  rooms.removeSocketNow(socket.id);
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
