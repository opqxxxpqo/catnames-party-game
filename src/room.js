const { CatnamesGame } = require("./game/catnames");

class RoomRegistry {
  constructor() {
    this.rooms = new Map();
    this.socketToRoom = new Map();
  }

  createRoom() {
    let code = "";
    do {
      code = Math.random().toString(36).slice(2, 6).toUpperCase();
    } while (this.rooms.has(code));

    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(String(code || "").trim().toUpperCase());
  }

  findBySocket(socketId) {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : null;
  }

  removeClient(socketId) {
    const room = this.findBySocket(socketId);
    if (!room) return null;
    room.removeClient(socketId);
    this.socketToRoom.delete(socketId);
    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return null;
    }
    return room;
  }
}

class Room {
  constructor(code) {
    this.code = code;
    this.hostId = null;
    this.clients = new Map();
    this.game = null;
  }

  get players() {
    return [...this.clients.values()];
  }

  addClient(socketId, name) {
    if (this.clients.size >= 8) throw new Error("房间已满");
    if (this.game?.status === "playing") throw new Error("游戏已经开始");
    const player = { id: socketId, name, score: 0 };
    this.clients.set(socketId, player);
    if (!this.hostId) this.hostId = socketId;
    return player;
  }

  removeClient(socketId) {
    this.clients.delete(socketId);
    if (this.hostId === socketId) {
      this.hostId = this.players[0]?.id || null;
    }
    if (this.game) {
      this.game.removePlayer(socketId);
      if (this.players.length < 2) this.game = null;
    }
  }

  startGame(socketId) {
    this.assertHost(socketId);
    this.game = new CatnamesGame(this.players);
    this.game.start();
  }

  backToLobby(socketId) {
    this.assertHost(socketId);
    this.game = null;
  }

  getStateFor(playerId) {
    return {
      roomCode: this.code,
      hostId: this.hostId,
      meId: playerId,
      players: this.players.map((player) => ({
        id: player.id,
        name: player.name,
        isHost: player.id === this.hostId,
      })),
      game: this.game ? this.game.getStateFor(playerId) : null,
    };
  }

  assertHost(socketId) {
    if (socketId !== this.hostId) throw new Error("只有房主可以执行这个操作");
  }
}

module.exports = { RoomRegistry, Room };
