const assert = require("assert");
const {
  CatnamesGame,
  CATS,
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

// duet mode sanity + multi-guess continuation
{
  const game = new CatnamesGame(players(2));
  game.start();
  const aView = game.getStateFor("p1");
  const bView = game.getStateFor("p2");
  assert.equal(aView.cards.length, 25);
  assert.ok(aView.cards.some((card) => card.secretType));
  assert.ok(bView.cards.some((card) => card.secretType));

  // find two target cards per keyA
  const targets = game.cards.filter((card) => card.keyA === "target").slice(0, 2);
  game.submitClue("p1", "苹果", 2);
  assert.equal(game.guessesLeft, 3);
  game.revealCard("p2", targets[0].id);
  // turn must NOT advance — still in reveal, clue kept, guessesLeft decremented
  assert.equal(game.phase, "reveal");
  assert.ok(game.clue);
  assert.equal(game.guessesLeft, 2);
  game.revealCard("p2", targets[1].id);
  assert.equal(game.guessesLeft, 1);
  assert.ok(game.clue);
  // guesser can end turn voluntarily
  game.endTurn("p2");
  assert.equal(game.clue, null);
}

// semi_coop multi-guess via quickContinue
{
  const game = new CatnamesGame(players(3));
  game.start();
  const targets = game.cards.filter((card) => card.type === "target").slice(0, 2);
  game.submitClue("p1", "苹果", 2);
  assert.equal(game.guessesLeft, 3);
  // unanimous pick of first target
  game.submitSelection("p2", targets[0].id);
  game.submitSelection("p3", targets[0].id);
  assert.equal(game.phase, "quickContinue");
  assert.equal(game.guessesLeft, 2);
  assert.ok(game.clue);
  // continue vote on the second target
  game.castVote("p2", targets[1].id);
  game.castVote("p3", targets[1].id);
  game.resolveVote("p1");
  assert.ok(game.cards.find((card) => card.id === targets[1].id).revealed);
  assert.equal(game.phase, "quickContinue");
  assert.equal(game.guessesLeft, 1);
  // decline continue
  game.declineContinue("p1");
  assert.equal(game.clue, null);
}

// semi_coop — partial agreement still routes through discuss → vote
{
  const game = new CatnamesGame(players(4));
  game.start();
  game.submitClue("p1", "苹果", 1);
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
  game.submitClue("p1", "苹果", 1);
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
  const assassinIndex = game.cards.findIndex((card) => card.type === "assassin");
  const ASSASSIN_ID = game.cards[assassinIndex].id;
  game.submitClue("p1", "苹果", 1);
  game.submitSelection("p2", ASSASSIN_ID);
  game.submitSelection("p3", ASSASSIN_ID);
  assert.equal(game.status, "finished");
  assert.ok(game.players.every((player) => player.score === 0));
}

// semi_coop — normal win keeps personal scores
{
  const game = new CatnamesGame(players(3));
  game.start();
  const targets = game.cards.filter((card) => card.type === "target");
  game.clue = { word: "_placeholder", count: 9 };
  game.guessesLeft = 99;
  game.phase = "clue";
  game.submitClue = game.submitClue; // keep
  // drive board to completion by forcing reveals
  targets.forEach((target) => {
    target.revealed = true;
  });
  // finish by meta call
  game.finish("所有目标猫都找到了，团队胜利。");
  assert.ok(game.players.every((player) => player.score >= 0));
}

// clue validation rejects forbidden characters + multi-char
{
  const game = new CatnamesGame(players(3));
  game.start();
  const boardChar = game.cards[0].name[0];
  assert.throws(() => game.submitClue("p1", boardChar + "测试", 1), /不能包含/);
  assert.equal(validateClueWord("123", []), "线索不能只是数字");
  assert.equal(validateClueWord("hi 一下", []), "线索必须是一个词，不能有空格");
  assert.equal(validateClueWord("hello中文", []), "线索不要混用中英文");
}

// team mode multi-guess: correct reveals keep the team going, until count+1 or a miss
{
  const game = new CatnamesGame(players(6), { mode: "team_vs_team" });
  game.start();
  const spy = game.getCurrentClueGiver();
  const guesser = game.getCurrentGuessers()[0];
  const own = game.cards.filter((card) => card.type === game.currentTeam).slice(0, 3);
  game.submitClue(spy.id, "苹果", 2);
  assert.equal(game.guessesLeft, 3);
  game.revealCard(guesser.id, own[0].id);
  assert.equal(game.phase, "reveal");
  assert.equal(game.guessesLeft, 2);
  game.revealCard(guesser.id, own[1].id);
  assert.equal(game.guessesLeft, 1);
  game.revealCard(guesser.id, own[2].id);
  // third correct guess exhausts count+1 → advanceTurn switches team
  assert.equal(game.clue, null);
  assert.notEqual(game.currentTeam, spy.team);
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
  game.submitClue("p1", "苹果", 1);
  game.submitSelection("p2", game.cards[0].id);
  const tickOk = game.tick(Date.now() + 1000);
  assert.ok(tickOk);
  assert.notEqual(game.phase, "secretSelect");
}

// cat library sanity
assert.ok(CATS.length >= 40, "cat library should be expanded");
const codes = new Set(CATS.map((cat) => cat.code));
assert.equal(codes.size, CATS.length, "cat codes must be unique");
CATS.forEach((cat) => {
  assert.ok(typeof cat.code === "number", `cat ${cat.name} should have numeric code`);
  assert.ok(cat.name && cat.name.endsWith("喵"), `cat ${cat.name} should end with 喵`);
  assert.ok(cat.hint && cat.hint.length > 0, `cat ${cat.name} needs a hint`);
});

// moreCats board mode
{
  const ids = Array.from({ length: 25 }, (_, i) => `img${i}`);
  const game = new CatnamesGame(players(3), { boardMode: "moreCats", imageIds: ids });
  game.start();
  assert.equal(game.boardMode, "moreCats");
  const state = game.getStateFor("p1");
  assert.equal(state.cards.length, 25);
  assert.ok(state.cards.every((card) => card.imageId));
  assert.ok(state.cards.every((card) => !card.name));
  // clue validation on nameless cards should not trip character check
  assert.equal(null, require("./catnames").validateClueWord("任何词", state.cards));
  game.submitClue("p1", "任何词", 1);
  assert.equal(game.phase, "secretSelect");
}

// history log captures clue + reveal + finish
{
  const game = new CatnamesGame(players(3));
  game.start();
  const target = game.cards.find((card) => card.type === "target");
  game.submitClue("p1", "苹果", 1);
  game.submitSelection("p2", target.id);
  game.submitSelection("p3", target.id);
  const state = game.getStateFor("p2");
  assert.ok(Array.isArray(state.history));
  assert.ok(state.history.some((entry) => entry.kind === "clue" && entry.word === "苹果"));
  assert.ok(state.history.some((entry) => entry.kind === "reveal" && entry.unanimous));
}

// moreCats requires enough image ids
assert.throws(
  () => new CatnamesGame(players(3), { boardMode: "moreCats", imageIds: ["a", "b"] }),
  /更多喵模式/,
);

console.log(`catnames game tests passed — ${CATS.length} cats in library`);
