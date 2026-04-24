const assert = require("assert");
const { RoomRegistry } = require("./room");

(async () => {
  const rooms = new RoomRegistry();
  const room = rooms.createRoom();
  const alice = room.addClient("socket-a", "Alice");
  rooms.registerSocket("socket-a", room);
  assert.equal(room.hostId, alice.id);
  assert.equal(room.connectedPlayers.length, 1);

  const bob = room.addClient("socket-b", "Bob");
  rooms.registerSocket("socket-b", room);
  assert.equal(room.players.length, 2);

  rooms.disconnectSocket("socket-a");
  assert.equal(room.players.length, 2);
  assert.equal(room.connectedPlayers.length, 1);
  assert.equal(room.hostId, alice.id);

  const resumed = room.resumeClient("socket-a2", alice.id, "Alice");
  rooms.registerSocket("socket-a2", room);
  assert.equal(resumed.id, alice.id);
  assert.equal(room.connectedPlayers.length, 2);
  assert.equal(room.getStateFor(alice.id).meId, alice.id);

  await room.startGame(alice.id);
  assert.equal(room.game.players[0].id, alice.id);
  assert.ok(room.getStateFor(bob.id).game.cards.length > 0);
  assert.equal(room.game.boardMode, "classic");
  room.stopPhaseTimer();

  console.log("room reconnect tests passed");
})();
