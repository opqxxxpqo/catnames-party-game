const crypto = require("crypto");
const { CatnamesGame, isModeAllowed, getDefaultMode, BOARD_MODES } = require("./game/catnames");
const catPool = require("./catPool");

const DISCONNECT_GRACE_MS = 120_000;

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

  registerSocket(socketId, room) {
    this.socketToRoom.set(socketId, room.code);
  }

  findBySocket(socketId) {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : null;
  }

  disconnectSocket(socketId, onExpire) {
    const room = this.findBySocket(socketId);
    if (!room) return null;
    this.socketToRoom.delete(socketId);
    room.disconnectClient(socketId, () => {
      if (room.players.length === 0) {
        room.dispose();
        this.rooms.delete(room.code);
        return;
      }
      onExpire?.(room);
    });
    return room;
  }

  removeSocketNow(socketId) {
    const room = this.findBySocket(socketId);
    if (!room) return null;
    this.socketToRoom.delete(socketId);
    room.removeClientBySocket(socketId);
    if (room.players.length === 0) {
      room.dispose();
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
    this.disconnectTimers = new Map();
    this.game = null;
    this.modePreference = null;
    this.boardMode = "classic";
    this.lastBoardError = null;
    this.phaseTimer = null;
    this.onTick = null;
  }

  get players() {
    return [...this.clients.values()];
  }

  get connectedPlayers() {
    return this.players.filter((player) => player.connected && player.socketId);
  }

  addClient(socketId, name) {
    if (this.clients.size >= 8) throw new Error("房间已满");
    if (this.game?.status === "playing") throw new Error("游戏已经开始");
    const player = {
      id: crypto.randomUUID(),
      socketId,
      name,
      connected: true,
      score: 0,
    };
    this.clients.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    return player;
  }

  resumeClient(socketId, playerId, name) {
    const player = this.clients.get(playerId);
    if (!player) throw new Error("房间里没有这个玩家");
    this.clearDisconnectTimer(player.id);
    player.socketId = socketId;
    player.connected = true;
    if (name) player.name = name;
    return player;
  }

  disconnectClient(socketId, onExpire) {
    const player = this.getPlayerBySocket(socketId);
    if (!player) return;
    player.socketId = null;
    player.connected = false;
    this.clearDisconnectTimer(player.id);
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(player.id);
      this.removeClient(player.id);
      onExpire?.();
    }, DISCONNECT_GRACE_MS);
    if (typeof timer.unref === "function") timer.unref();
    this.disconnectTimers.set(player.id, timer);
  }

  removeClientBySocket(socketId) {
    const player = this.getPlayerBySocket(socketId);
    if (player) this.removeClient(player.id);
  }

  removeClient(playerId) {
    this.clearDisconnectTimer(playerId);
    this.clients.delete(playerId);
    if (this.hostId === playerId) {
      this.hostId = this.connectedPlayers[0]?.id || this.players[0]?.id || null;
    }
    if (this.game) {
      this.game.removePlayer(playerId);
      if (this.players.length < 2) {
        this.game = null;
        this.stopPhaseTimer();
      }
    }
  }

  setModePreference(playerId, mode) {
    this.assertHost(playerId);
    const count = this.connectedPlayers.length;
    if (mode == null) {
      this.modePreference = null;
      return;
    }
    if (!isModeAllowed(mode, count)) {
      throw new Error("当前人数不能选这个模式");
    }
    this.modePreference = mode;
  }

  setBoardMode(playerId, boardMode) {
    this.assertHost(playerId);
    if (!BOARD_MODES.includes(boardMode)) throw new Error("不支持的图片模式");
    this.boardMode = boardMode;
    this.lastBoardError = null;
  }

  async startGame(playerId) {
    this.assertHost(playerId);
    const players = this.connectedPlayers;
    if (players.length < 2) throw new Error("至少需要 2 名在线玩家");
    const count = players.length;
    let mode = this.modePreference;
    if (!mode || !isModeAllowed(mode, count)) {
      mode = getDefaultMode(count);
    }
    const options = { mode, boardMode: this.boardMode };
    if (this.boardMode === "moreCats") {
      try {
        options.imageIds = await catPool.pickRandom(25);
      } catch (error) {
        console.error("[moreCats] 图片池抓取失败，回退到经典模式:", error.message);
        this.lastBoardError = `更多喵图片池暂不可用：${error.message}`;
        options.boardMode = "classic";
        delete options.imageIds;
      }
    }
    this.game = new CatnamesGame(players, options);
    this.game.start();
    this.startPhaseTimer();
  }

  backToLobby(playerId) {
    this.assertHost(playerId);
    this.game = null;
    this.stopPhaseTimer();
  }

  startPhaseTimer() {
    this.stopPhaseTimer();
    if (!this.game || this.game.status !== "playing") return;
    this.phaseTimer = setInterval(() => {
      if (!this.game) {
        this.stopPhaseTimer();
        return;
      }
      const changed = this.game.tick();
      if (changed) {
        this.onTick?.();
      }
      if (this.game?.status !== "playing") {
        this.stopPhaseTimer();
      }
    }, 500);
    if (typeof this.phaseTimer.unref === "function") this.phaseTimer.unref();
  }

  stopPhaseTimer() {
    if (this.phaseTimer) {
      clearInterval(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  dispose() {
    this.stopPhaseTimer();
    for (const playerId of [...this.disconnectTimers.keys()]) {
      this.clearDisconnectTimer(playerId);
    }
  }

  getPlayerBySocket(socketId) {
    return this.players.find((player) => player.socketId === socketId);
  }

  getStateFor(playerId) {
    const game = this.game ? this.game.getStateFor(playerId) : null;
    if (game) {
      game.players = game.players.map((player) => ({
        ...player,
        connected: this.clients.get(player.id)?.connected ?? false,
      }));
    }
    return {
      roomCode: this.code,
      hostId: this.hostId,
      meId: playerId,
      modePreference: this.modePreference,
      boardMode: this.boardMode,
      lastBoardError: this.lastBoardError,
      players: this.players.map((player) => ({
        id: player.id,
        name: player.name,
        connected: player.connected,
        isHost: player.id === this.hostId,
      })),
      game,
    };
  }

  assertHost(playerId) {
    if (playerId !== this.hostId) throw new Error("只有房主可以执行这个操作");
  }

  clearDisconnectTimer(playerId) {
    const timer = this.disconnectTimers.get(playerId);
    if (timer) clearTimeout(timer);
    this.disconnectTimers.delete(playerId);
  }
}

module.exports = { RoomRegistry, Room };
