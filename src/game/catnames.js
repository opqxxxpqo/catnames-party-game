const MODE_TEXT = {
  duet_coop: "2人合作解谜",
  semi_coop: "3-5人半合作",
  team_vs_team: "6-8人阵营对抗",
};

const CATS = [
  { code: 200, name: "顺利猫", hint: "事情很顺，大家都点头了。" },
  { code: 201, name: "新朋友猫", hint: "刚刚加入，正在被介绍。" },
  { code: 204, name: "安静猫", hint: "它什么也没说，但事情办好了。" },
  { code: 300, name: "选择困难猫", hint: "面前有太多条路可以走。" },
  { code: 301, name: "搬家猫", hint: "它已经换到新地址住了。" },
  { code: 302, name: "临时搬家猫", hint: "只是短暂去了别的地方。" },
  { code: 304, name: "没变化猫", hint: "看来看去，还是老样子。" },
  { code: 400, name: "听不懂猫", hint: "别人说的话让它满头问号。" },
  { code: 401, name: "没带票猫", hint: "想进去，但少了通行凭证。" },
  { code: 403, name: "不准进门猫", hint: "门开着，但它被拦下了。" },
  { code: 404, name: "迷路猫", hint: "怎么找都找不到地方。" },
  { code: 405, name: "姿势不对猫", hint: "方法用错了，得换个方式。" },
  { code: 408, name: "等太久猫", hint: "它等到快睡着了。" },
  { code: 409, name: "吵架猫", hint: "两边说法对不上，卡住了。" },
  { code: 410, name: "消失猫", hint: "原本在这里，现在真的没了。" },
  { code: 413, name: "包太大猫", hint: "东西太大，怎么都塞不进去。" },
  { code: 418, name: "茶壶猫", hint: "它坚持自己是一个茶壶。" },
  { code: 423, name: "锁门猫", hint: "门被锁上，暂时打不开。" },
  { code: 425, name: "太早猫", hint: "它来得太早，大家还没准备好。" },
  { code: 429, name: "排队太长猫", hint: "人太多了，只能先等等。" },
  { code: 451, name: "规则禁止猫", hint: "因为规矩，不能让它通过。" },
  { code: 500, name: "崩溃猫", hint: "事情突然乱成一团。" },
  { code: 502, name: "传话失败猫", hint: "中间人把话传坏了。" },
  { code: 503, name: "临时关门猫", hint: "今天忙不过来，晚点再来。" },
  { code: 504, name: "没等到猫", hint: "等了很久，另一边一直没回。" },
  { code: 507, name: "塞满猫", hint: "空间不够，已经装不下了。" },
  { code: 508, name: "绕圈猫", hint: "它一直在同一个地方打转。" },
  { code: 511, name: "先登记猫", hint: "要先登记，才能继续往前。" },
  { code: 521, name: "店员不在猫", hint: "想办事，但对面没人接待。" },
  { code: 599, name: "断线猫", hint: "联系不上，像电话突然断了。" },
];

class CatnamesGame {
  constructor(players) {
    this.players = players.map((player) => ({
      id: player.id,
      name: player.name,
      role: "normal",
      team: null,
      score: 0,
    }));
    this.mode = getMode(this.players.length);
    if (!this.mode) throw new Error("当前游戏支持 2-8 人");
    this.status = "waiting";
    this.cards = [];
    this.currentPlayerIndex = 0;
    this.currentTeam = "red";
    this.round = 1;
    this.maxRounds = 9;
    this.mistakes = 0;
    this.maxMistakes = 3;
    this.clue = null;
    this.votes = {};
    this.message = "等待开始";
  }

  start() {
    this.assignRoles();
    this.cards = this.buildBoard();
    this.status = "playing";
    this.message = "游戏开始。提示者先给出一个线索。";
  }

  removePlayer(playerId) {
    this.players = this.players.filter((player) => player.id !== playerId);
    delete this.votes[playerId];
    if (this.players.length < 2) {
      this.status = "finished";
      this.message = "玩家不足，本局结束。";
    }
  }

  submitClue(playerId, word, count) {
    this.assertPlaying();
    this.assertCurrentClueGiver(playerId);
    const cleanWord = String(word || "").trim().slice(0, 12);
    const cleanCount = Math.max(1, Math.min(9, Number(count) || 1));
    if (!cleanWord) throw new Error("请输入线索");
    this.clue = { word: cleanWord, count: cleanCount };
    this.votes = {};
    this.message = "线索已公布，猜测者开始选择。";
  }

  revealCard(playerId, cardId) {
    this.assertPlaying();
    if (this.mode === "semi_coop") throw new Error("这个模式需要先投票再结算");
    this.assertCanGuess(playerId);
    this.reveal(cardId, [playerId]);
  }

  castVote(playerId, cardId) {
    this.assertPlaying();
    if (this.mode !== "semi_coop") throw new Error("当前模式不使用投票");
    if (!this.clue) throw new Error("提示者还没有给线索");
    if (this.getCurrentClueGiver().id === playerId) throw new Error("提示者不能投票");
    const card = this.findOpenCard(cardId);
    this.votes[playerId] = card.id;
    this.message = "投票已更新。";
  }

  resolveVote(playerId) {
    this.assertPlaying();
    if (this.mode !== "semi_coop") throw new Error("当前模式不使用投票");
    this.assertCurrentClueGiver(playerId);
    const entries = Object.entries(this.votes);
    if (entries.length === 0) throw new Error("还没有人投票");
    const counts = new Map();
    for (const [, cardId] of entries) counts.set(cardId, (counts.get(cardId) || 0) + 1);
    const winner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const voters = entries.filter(([, cardId]) => cardId === winner).map(([id]) => id);
    this.reveal(winner, voters);
  }

  endTurn(playerId) {
    this.assertPlaying();
    const current = this.getCurrentClueGiver();
    const isTeamGuesser = this.mode === "team_vs_team" && this.getCurrentGuessers().some((player) => player.id === playerId);
    if (playerId !== current.id && !isTeamGuesser) throw new Error("现在不能由你结束回合");
    this.advanceTurn("当前回合结束。");
  }

  getStateFor(playerId) {
    const viewer = this.players.find((player) => player.id === playerId);
    return {
      mode: this.mode,
      modeName: MODE_TEXT[this.mode],
      status: this.status,
      message: this.message,
      round: this.round,
      maxRounds: this.maxRounds,
      mistakes: this.mistakes,
      maxMistakes: this.maxMistakes,
      currentTeam: this.currentTeam,
      clue: this.clue,
      votes: this.getPublicVotes(),
      players: this.players,
      currentClueGiverId: this.getCurrentClueGiver()?.id || null,
      guesserIds: this.getCurrentGuessers().map((player) => player.id),
      stats: this.getStats(),
      cards: this.cards.map((card) => this.getCardFor(card, viewer)),
    };
  }

  assignRoles() {
    this.players.forEach((player) => {
      player.role = "normal";
      player.team = null;
      player.score = 0;
    });

    if (this.mode === "duet_coop") {
      this.players[0].role = "clue_giver";
      this.players[1].role = "guesser";
      return;
    }

    if (this.mode === "semi_coop") {
      this.players[0].role = "clue_giver";
      this.players.slice(1).forEach((player) => {
        player.role = "guesser";
      });
      return;
    }

    this.players.forEach((player, index) => {
      player.team = index % 2 === 0 ? "red" : "blue";
      player.role = index < 2 ? "spymaster" : "guesser";
    });
    this.currentTeam = this.players[0].team;
  }

  buildBoard() {
    const cats = shuffle(CATS).slice(0, 25);
    if (this.mode === "duet_coop") {
      const keyA = shuffle([...Array(9).fill("target"), ...Array(13).fill("neutral"), ...Array(2).fill("danger"), "assassin"]);
      const keyB = shuffle([...Array(9).fill("target"), ...Array(13).fill("neutral"), ...Array(2).fill("danger"), "assassin"]);
      return cats.map((cat, index) => ({ ...cat, id: `card-${index}`, revealed: false, keyA: keyA[index], keyB: keyB[index] }));
    }
    if (this.mode === "semi_coop") {
      const types = shuffle([...Array(12).fill("target"), ...Array(8).fill("neutral"), ...Array(4).fill("danger"), "assassin"]);
      return cats.map((cat, index) => ({ ...cat, id: `card-${index}`, revealed: false, type: types[index] }));
    }
    const firstTeam = this.currentTeam;
    const secondTeam = otherTeam(firstTeam);
    const types = shuffle([...Array(9).fill(firstTeam), ...Array(8).fill(secondTeam), ...Array(7).fill("neutral"), "assassin"]);
    return cats.map((cat, index) => ({ ...cat, id: `card-${index}`, revealed: false, type: types[index] }));
  }

  reveal(cardId, scoringPlayerIds = []) {
    const card = this.findOpenCard(cardId);
    card.revealed = true;
    const type = this.getRevealType(card);
    this.clue = null;
    this.votes = {};

    if (type === "assassin") {
      this.addScore(this.getCurrentClueGiver().id, -3);
      if (this.mode === "team_vs_team") {
        this.finish(`${teamName(this.currentTeam)}翻到失败猫，${teamName(otherTeam(this.currentTeam))}获胜。`);
      } else {
        this.finish("翻到失败猫，本局失败。");
      }
      return;
    }

    if (this.mode === "team_vs_team") {
      this.revealTeamCard(type);
      return;
    }

    if (type === "target") {
      this.addScore(this.getCurrentClueGiver().id, 2);
      scoringPlayerIds.forEach((id) => this.addScore(id, 1));
      if (this.countTargetsLeft() === 0) {
        this.finish("所有目标猫都找到了，团队胜利。");
        return;
      }
      this.advanceTurn("猜中目标猫。");
      return;
    }

    if (type === "danger") {
      this.mistakes += 1;
      this.addScore(this.getCurrentClueGiver().id, -1);
      scoringPlayerIds.forEach((id) => this.addScore(id, -1));
      if (this.mistakes >= this.maxMistakes) {
        this.finish("危险猫次数用尽，本局失败。");
        return;
      }
      this.advanceTurn("猜到危险猫，扣掉一次机会。");
      return;
    }

    this.advanceTurn("这是路过猫，当前回合结束。");
  }

  revealTeamCard(type) {
    if (type === this.currentTeam) {
      this.addScore(this.getCurrentClueGiver().id, 2);
      if (this.cards.filter((card) => card.type === this.currentTeam && !card.revealed).length === 0) {
        this.finish(`${teamName(this.currentTeam)}找齐所有猫，获得胜利。`);
        return;
      }
      this.message = `${teamName(this.currentTeam)}猜中，可以继续猜。`;
      return;
    }
    if (type === otherTeam(this.currentTeam)) {
      this.addScore(this.getCurrentClueGiver().id, -1);
      if (this.cards.filter((card) => card.type === type && !card.revealed).length === 0) {
        this.finish(`${teamName(type)}被帮忙找齐了猫，获得胜利。`);
        return;
      }
    }
    this.advanceTurn("猜错了，换队行动。");
  }

  advanceTurn(message) {
    this.clue = null;
    this.votes = {};
    if (this.mode === "team_vs_team") {
      this.currentTeam = otherTeam(this.currentTeam);
      this.message = message;
      return;
    }
    this.round += 1;
    if (this.mode === "duet_coop" && this.round > this.maxRounds) {
      this.finish("回合数用尽，本局失败。");
      return;
    }
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.players.forEach((player, index) => {
      player.role = index === this.currentPlayerIndex ? "clue_giver" : "guesser";
    });
    this.message = message;
  }

  getCurrentClueGiver() {
    if (this.mode === "team_vs_team") {
      return this.players.find((player) => player.team === this.currentTeam && player.role === "spymaster");
    }
    return this.players[this.currentPlayerIndex];
  }

  getCurrentGuessers() {
    const giver = this.getCurrentClueGiver();
    if (!giver) return [];
    if (this.mode === "team_vs_team") {
      return this.players.filter((player) => player.team === this.currentTeam && player.role !== "spymaster");
    }
    return this.players.filter((player) => player.id !== giver.id);
  }

  getCardFor(card, viewer) {
    const secret = this.getSecretFor(card, viewer);
    return {
      id: card.id,
      code: card.code,
      name: card.name,
      hint: card.hint,
      revealed: card.revealed,
      revealedType: card.revealed ? this.getRevealType(card) : null,
      secretType: secret,
    };
  }

  getSecretFor(card, viewer) {
    if (!viewer) return null;
    if (this.mode === "duet_coop") {
      return viewer.id === this.players[0]?.id ? card.keyA : card.keyB;
    }
    if (this.mode === "semi_coop") {
      return viewer.id === this.getCurrentClueGiver()?.id ? card.type : null;
    }
    return viewer.role === "spymaster" ? card.type : null;
  }

  getRevealType(card) {
    if (this.mode === "duet_coop") {
      const giver = this.getCurrentClueGiver();
      return giver?.id === this.players[0]?.id ? card.keyA : card.keyB;
    }
    return card.type;
  }

  getStats() {
    if (this.mode === "team_vs_team") {
      return {
        leftLabel: "红队还剩",
        leftValue: this.cards.filter((card) => card.type === "red" && !card.revealed).length,
        rightLabel: "蓝队还剩",
        rightValue: this.cards.filter((card) => card.type === "blue" && !card.revealed).length,
      };
    }
    return {
      leftLabel: "目标还剩",
      leftValue: this.countTargetsLeft(),
      rightLabel: this.mode === "duet_coop" ? "剩余回合" : "错误机会",
      rightValue: this.mode === "duet_coop" ? Math.max(0, this.maxRounds - this.round + 1) : Math.max(0, this.maxMistakes - this.mistakes),
    };
  }

  countTargetsLeft() {
    if (this.mode === "duet_coop") {
      return this.cards.filter((card) => !card.revealed && (card.keyA === "target" || card.keyB === "target")).length;
    }
    return this.cards.filter((card) => card.type === "target" && !card.revealed).length;
  }

  getPublicVotes() {
    return Object.fromEntries(
      Object.entries(this.votes).map(([playerId, cardId]) => {
        const card = this.cards.find((item) => item.id === cardId);
        return [playerId, card?.name || "未知猫"];
      }),
    );
  }

  findOpenCard(cardId) {
    const card = this.cards.find((item) => item.id === cardId);
    if (!card) throw new Error("没有这张牌");
    if (card.revealed) throw new Error("这张牌已经翻开了");
    return card;
  }

  assertPlaying() {
    if (this.status !== "playing") throw new Error("游戏不在进行中");
  }

  assertCurrentClueGiver(playerId) {
    if (this.getCurrentClueGiver()?.id !== playerId) throw new Error("现在不是你给提示");
  }

  assertCanGuess(playerId) {
    if (!this.clue) throw new Error("提示者还没有给线索");
    if (!this.getCurrentGuessers().some((player) => player.id === playerId)) {
      throw new Error("现在不是你猜");
    }
  }

  addScore(playerId, points) {
    const player = this.players.find((item) => item.id === playerId);
    if (player) player.score += points;
  }

  finish(message) {
    this.status = "finished";
    this.message = message;
  }
}

function getMode(count) {
  if (count === 2) return "duet_coop";
  if (count >= 3 && count <= 5) return "semi_coop";
  if (count >= 6 && count <= 8) return "team_vs_team";
  return null;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function otherTeam(team) {
  return team === "red" ? "blue" : "red";
}

function teamName(team) {
  return team === "red" ? "红队" : "蓝队";
}

module.exports = { CatnamesGame, getMode, MODE_TEXT };
