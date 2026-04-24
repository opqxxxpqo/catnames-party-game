const assert = require("assert");
const { CatnamesGame, getMode } = require("./catnames");

const players = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `玩家${index + 1}`,
  }));

assert.equal(getMode(2), "duet_coop");
assert.equal(getMode(4), "semi_coop");
assert.equal(getMode(8), "team_vs_team");
assert.equal(getMode(9), null);

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

{
  const game = new CatnamesGame(players(4));
  game.start();
  assert.equal(game.mode, "semi_coop");
  assert.throws(() => game.revealCard("p2", game.cards[0].id), /投票/);
  game.submitClue("p1", "学校", 1);
  game.castVote("p2", game.cards[0].id);
  game.resolveVote("p1");
  assert.ok(game.cards.some((card) => card.revealed));
}

{
  const game = new CatnamesGame(players(6));
  game.start();
  assert.equal(game.mode, "team_vs_team");
  const spy = game.getCurrentClueGiver();
  const guesser = game.getCurrentGuessers()[0];
  assert.ok(game.getStateFor(spy.id).cards.some((card) => card.secretType));
  assert.ok(game.getStateFor(guesser.id).cards.every((card) => !card.secretType));
}

console.log("catnames game tests passed");
