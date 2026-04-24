const assert = require("assert");
const {
  CatnamesGame,
  getDefaultMode,
  getAllowedModes,
  isModeAllowed,
  validateClueWord,
} = require("./catnames");

const players = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `玩家${index + 1}`,
  }));

// mode resolution
assert.equal(getDefaultMode(2), "duet_coop");
assert.equal(getDefaultMode(4), "semi_coop");
assert.equal(getDefaultMode(5), "semi_coop");
assert.equal(getDefaultMode(7), "team_vs_team");
assert.equal(getDefaultMode(9), null);
assert.deepEqual(getAllowedModes(5), ["semi_coop", "team_vs_team"]);
assert.deepEqual(getAllowedModes(6), ["semi_coop", "team_vs_team"]);
assert.deepEqual(getAllowedModes(3), ["semi_coop"]);
assert.ok(isModeAllowed("team_vs_team", 6));
assert.ok(!isModeAllowed("team_vs_team", 4));

// duet mode sanity
{
  const game = new CatnamesGame(players(2));
  game.start();
  const aView = game.getStateFor("p1");
  const bView = game.getStateFor("p2");
  assert.equal(aView.cards.length, 25);
  assert.equal(bView.cards.length, 25);
  assert.ok(aView.cards.some((card) => card.secretType));
  assert.ok(bView.cards.some((card) => card.secretType));
}

// semi_coop simultaneous reveal — unanimous auto-flip
{
  const game = new CatnamesGame(players(4));
  game.start();
  assert.equal(game.mode, "semi_coop");
  assert.equal(game.phase, "clue");
  assert.throws(() => game.submitSelection("p2", game.cards[0].id), /秘密选词/);
  // use a clue that doesn't clash with board card names
  game.submitClue("p1", "学校", 1);
  assert.equal(game.phase, "secretSelect");
  const target = game.cards[0];
  game.submitSelection("p2", target.id);
  game.submitSelection("p3", target.id);
  game.submitSelection("p4", target.id);
  // last selection should auto-reveal via unanimous path → card is revealed
  assert.ok(game.cards.find((card) => card.id === target.id).revealed);
}

// semi_coop — partial agreement goes to discuss → vote
{
  const game = new CatnamesGame(players(4));
  game.start();
  game.submitClue("p1", "学校", 1);
  const [first, second] = game.cards;
  game.submitSelection("p2", first.id);
  game.submitSelection("p3", first.id);
  game.submitSelection("p4", second.id);
  assert.equal(game.phase, "discuss");
  game.advanceToVote("p1");
  assert.equal(game.phase, "vote");
  game.castVote("p2", first.id);
  game.castVote("p3", first.id);
  game.castVote("p4", second.id);
  game.resolveVote("p1");
  assert.ok(game.cards.find((card) => card.id === first.id).revealed);
}

// semi_coop — scattered goes to decide, clue-giver picks from options
{
  const game = new CatnamesGame(players(3));
  game.start();
  game.submitClue("p1", "学校", 1);
  const [a, b] = game.cards;
  game.submitSelection("p2", a.id);
  game.submitSelection("p3", b.id);
  assert.equal(game.phase, "decide");
  const state = game.getStateFor("p1");
  assert.equal(state.decideOptions.length, 2);
  assert.throws(() => game.decideFromSelections("p1", game.cards[10].id), /猜测者/);
  game.decideFromSelections("p1", a.id);
  assert.ok(game.cards.find((card) => card.id === a.id).revealed);
}

// semi_coop — team failure zeroes personal scores
{
  const game = new CatnamesGame(players(3));
  game.start();
  // force assassin reveal path
  const assassinIndex = game.cards.findIndex((card) => card.type === "assassin");
  const ASSASSIN_ID = game.cards[assassinIndex].id;
  game.submitClue("p1", "学校", 1);
  game.submitSelection("p2", ASSASSIN_ID);
  game.submitSelection("p3", ASSASSIN_ID);
  assert.equal(game.status, "finished");
  assert.ok(game.players.every((player) => player.score === 0));
}

// clue validation rejects forbidden characters
{
  const game = new CatnamesGame(players(3));
  game.start();
  const boardChar = game.cards[0].name[0];
  assert.throws(() => game.submitClue("p1", boardChar + "测试", 1), /不能包含/);
  assert.equal(validateClueWord("123", []), "线索不能只是数字");
  assert.equal(validateClueWord("hi 一下", []), "线索必须是一个词，不能有空格");
  assert.equal(validateClueWord("hello中文", []), "线索不要混用中英文");
}

// team mode still works and spymaster sees types
{
  const game = new CatnamesGame(players(6), { mode: "team_vs_team" });
  game.start();
  assert.equal(game.mode, "team_vs_team");
  const spy = game.getCurrentClueGiver();
  const guesser = game.getCurrentGuessers()[0];
  assert.ok(game.getStateFor(spy.id).cards.some((card) => card.secretType));
  assert.ok(game.getStateFor(guesser.id).cards.every((card) => !card.secretType));
}

// mode override via constructor option
{
  const game = new CatnamesGame(players(6), { mode: "semi_coop" });
  game.start();
  assert.equal(game.mode, "semi_coop");
  assert.throws(() => new CatnamesGame(players(4), { mode: "team_vs_team" }), /不支持/);
}

// semi_coop timer tick from secretSelect → auto-reveals
{
  const game = new CatnamesGame(players(3), { timers: { secretSelect: 1, clue: 1 } });
  game.start();
  game.submitClue("p1", "学校", 1);
  game.submitSelection("p2", game.cards[0].id);
  // one guesser still missing; wait for timeout
  const tickOk = game.tick(Date.now() + 1000);
  assert.ok(tickOk);
  // should have left secretSelect phase
  assert.notEqual(game.phase, "secretSelect");
}

console.log("catnames game tests passed");
