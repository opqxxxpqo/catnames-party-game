const MODE_TEXT = {
  duet_coop: "2人合作解谜",
  semi_coop: "3-5人半合作",
  team_vs_team: "6-8人阵营对抗",
};

const PHASE_TEXT = {
  clue: "提示者出牌",
  secretSelect: "秘密选词",
  reveal: "同步揭示",
  discuss: "分歧讨论",
  vote: "公开投票",
  decide: "提示者决定",
  quickContinue: "继续猜",
  settle: "结算中",
  finished: "已结束",
};

const DEFAULT_TIMERS = {
  clue: 60_000,
  secretSelect: 30_000,
  discuss: 30_000,
  vote: 20_000,
  decide: 20_000,
  quickContinue: 20_000,
  hardLimit: 20 * 60_000,
};

const BOARD_MODES = ["classic", "moreCats"];

const CATS = [
  // 1xx 启动 / 思考
  { code: 100, name: "跃跃欲试喵", hint: "刚看到开头就想动手。" },
  { code: 102, name: "思考中喵", hint: "还在想，先别催。" },
  { code: 103, name: "预告片喵", hint: "正片还没来，先甩几张剧照。" },

  // 2xx 成功 / 搞定
  { code: 200, name: "顺利喵", hint: "事情很顺，大家都点头了。" },
  { code: 201, name: "新朋友喵", hint: "刚刚加入，正在被介绍。" },
  { code: 202, name: "嗯嗯好好喵", hint: "答应得很爽，然后没有然后。" },
  { code: 204, name: "安静喵", hint: "它什么也没说，但事情办好了。" },
  { code: 206, name: "半成品喵", hint: "给你一半，剩下那半明天再说。" },
  { code: 207, name: "呼朋引伴喵", hint: "一次带了一整群过来。" },
  { code: 208, name: "重复表演喵", hint: "这个梗你已经讲过三次了。" },
  { code: 226, name: "终于用上喵", hint: "之前屯的东西，现在才派上用场。" },

  // 3xx 变道 / 转介
  { code: 300, name: "选择困难喵", hint: "面前有太多条路可以走。" },
  { code: 301, name: "搬家喵", hint: "它已经换到新地址住了。" },
  { code: 302, name: "临时搬家喵", hint: "只是短暂去了别的地方。" },
  { code: 303, name: "重新指路喵", hint: "哦，这事你得去那边问。" },
  { code: 304, name: "没变化喵", hint: "看来看去，还是老样子。" },
  { code: 305, name: "中间人喵", hint: "别直接找，先通过它。" },
  { code: 307, name: "今天走侧门喵", hint: "正门暂时不开，从边上绕。" },
  { code: 308, name: "永久跳转喵", hint: "旧路封了，以后都走新的。" },

  // 4xx 社交 / 玩家问题
  { code: 400, name: "听不懂喵", hint: "别人说的话让它满头问号。" },
  { code: 401, name: "没带票喵", hint: "想进去，但少了通行凭证。" },
  { code: 402, name: "先付钱喵", hint: "感情归感情，账还是要算的。" },
  { code: 403, name: "不准进门喵", hint: "门开着，但它被拦下了。" },
  { code: 404, name: "迷路喵", hint: "怎么找都找不到地方。" },
  { code: 405, name: "姿势不对喵", hint: "方法用错了，得换个方式。" },
  { code: 406, name: "不合口味喵", hint: "不是不行，是它看不上。" },
  { code: 408, name: "等太久喵", hint: "它等到快睡着了。" },
  { code: 409, name: "吵架喵", hint: "两边说法对不上，卡住了。" },
  { code: 410, name: "消失喵", hint: "原本在这里，现在真的没了。" },
  { code: 411, name: "说清楚喵", hint: "总量没讲明白，不让过。" },
  { code: 412, name: "条件不够喵", hint: "还没够资格线。" },
  { code: 413, name: "包太大喵", hint: "东西太大，怎么都塞不进去。" },
  { code: 414, name: "啰嗦喵", hint: "一口气讲到对方听不完。" },
  { code: 415, name: "格式不对喵", hint: "不吃你这一套。" },
  { code: 416, name: "过头了喵", hint: "刚好超出了边界。" },
  { code: 417, name: "想多了喵", hint: "期待和现实差得有点远。" },
  { code: 418, name: "茶壶喵", hint: "它坚持自己是一个茶壶。" },
  { code: 420, name: "冷静一下喵", hint: "别激动，先吸气。" },
  { code: 421, name: "发错人喵", hint: "这条消息本来是给别人的。" },
  { code: 422, name: "算不清喵", hint: "你写的它实在看不懂。" },
  { code: 423, name: "锁门喵", hint: "门被锁上，暂时打不开。" },
  { code: 424, name: "连累喵", hint: "上一环塌了，它也跟着黄。" },
  { code: 425, name: "太早喵", hint: "它来得太早，大家还没准备好。" },
  { code: 426, name: "该升级喵", hint: "版本太旧，先换新的。" },
  { code: 428, name: "先表态喵", hint: "没先签字，后面都不算。" },
  { code: 429, name: "排队太长喵", hint: "人太多了，只能先等等。" },
  { code: 431, name: "名片太长喵", hint: "头衔一堆，自我介绍没完。" },
  { code: 444, name: "已读不回喵", hint: "看见了，就是不接话。" },
  { code: 450, name: "家长在场喵", hint: "这话不能当着孩子讲。" },
  { code: 451, name: "规则禁止喵", hint: "因为规矩，不能让它通过。" },

  // 5xx 系统 / 生活崩溃
  { code: 500, name: "崩溃喵", hint: "事情突然乱成一团。" },
  { code: 501, name: "没学过喵", hint: "这活儿它还没学会呢。" },
  { code: 502, name: "传话失败喵", hint: "中间人把话传坏了。" },
  { code: 503, name: "临时关门喵", hint: "今天忙不过来，晚点再来。" },
  { code: 504, name: "没等到喵", hint: "等了很久，另一边一直没回。" },
  { code: 507, name: "塞满喵", hint: "空间不够，已经装不下了。" },
  { code: 508, name: "绕圈喵", hint: "它一直在同一个地方打转。" },
  { code: 509, name: "流量超限喵", hint: "这个月流量已经用光。" },
  { code: 511, name: "先登记喵", hint: "要先登记，才能继续往前。" },
  { code: 521, name: "店员不在喵", hint: "想办事，但对面没人接待。" },
  { code: 522, name: "熬夜断片喵", hint: "熬到最后已经失去意识。" },
  { code: 525, name: "聊不到一起喵", hint: "刚开头就发现对不上频道。" },
  { code: 599, name: "断线喵", hint: "联系不上，像电话突然断了。" },
];

class CatnamesGame {
  constructor(players, options = {}) {
    this.players = players.map((player) => ({
      id: player.id,
      name: player.name,
      role: "normal",
      team: null,
      score: 0,
    }));
    this.mode = options.mode || getDefaultMode(this.players.length);
    if (!this.mode) throw new Error("当前游戏支持 2-8 人");
    if (!isModeAllowed(this.mode, this.players.length)) {
      throw new Error("这个人数不支持选定的模式");
    }
    this.boardMode = BOARD_MODES.includes(options.boardMode) ? options.boardMode : "classic";
    this.imageIds = Array.isArray(options.imageIds) ? [...options.imageIds] : null;
    if (this.boardMode === "moreCats" && (!this.imageIds || this.imageIds.length < 25)) {
      throw new Error("更多喵模式需要 25 张图片，请稍后重试");
    }
    this.timers = { ...DEFAULT_TIMERS, ...(options.timers || {}) };
    this.status = "waiting";
    this.cards = [];
    this.currentPlayerIndex = 0;
    this.currentTeam = "red";
    this.round = 1;
    this.maxRounds = 9;
    this.mistakes = 0;
    this.maxMistakes = 3;
    this.clue = null;
    this.guessesLeft = 0;
    this.votes = {};
    this.secretSelections = {};
    this.revealedSelections = null;
    this.phase = null;
    this.phaseEndsAt = null;
    this.gameEndsAt = null;
    this.continueOffered = false;
    this.message = "等待开始";
    this.lastResolution = null;
    this.history = [];
    this._historySeq = 0;
  }

  _logHistory(entry) {
    this._historySeq += 1;
    this.history.push({
      seq: this._historySeq,
      round: this.round,
      team: this.mode === "team_vs_team" ? this.currentTeam : null,
      ...entry,
    });
    if (this.history.length > 60) this.history = this.history.slice(-60);
  }

  _nameOf(playerId) {
    return this.players.find((p) => p.id === playerId)?.name || "玩家";
  }

  start() {
    this.assignRoles();
    this.cards = this.buildBoard();
    this.status = "playing";
    this.round = 1;
    this.gameEndsAt = this.mode === "semi_coop" ? now() + this.timers.hardLimit : null;
    this.enterClue("游戏开始。提示者出牌。");
  }

  removePlayer(playerId) {
    this.players = this.players.filter((player) => player.id !== playerId);
    delete this.votes[playerId];
    delete this.secretSelections[playerId];
    if (this.players.length < 2) {
      this.finish("玩家不足，本局结束。", { abort: true });
    }
  }

  submitClue(playerId, word, count) {
    this.assertPlaying();
    this.assertPhase("clue");
    this.assertCurrentClueGiver(playerId);
    const cleanWord = String(word || "").trim().slice(0, 12);
    const cleanCount = clampCount(count);
    if (!cleanWord) throw new Error("请输入线索");
    const error = validateClueWord(cleanWord, this.cards);
    if (error) throw new Error(error);
    this.clue = { word: cleanWord, count: cleanCount };
    this.guessesLeft = cleanCount === 0 ? 1 : cleanCount + 1;
    this._logHistory({
      kind: "clue",
      actorId: playerId,
      actorName: this._nameOf(playerId),
      word: cleanWord,
      count: cleanCount,
    });
    this.votes = {};
    this.secretSelections = {};
    this.revealedSelections = null;
    if (this.mode === "semi_coop") {
      this.enterPhase("secretSelect", this.timers.secretSelect, "线索已公布，所有猜测者秘密选词。");
    } else {
      this.phase = "reveal";
      this.phaseEndsAt = null;
      this.message = "线索已公布，猜测者开始选择。";
    }
  }

  submitSelection(playerId, cardId) {
    this.assertPlaying();
    if (this.mode !== "semi_coop") throw new Error("当前模式不使用秘密选词");
    this.assertPhase("secretSelect");
    if (this.getCurrentClueGiver().id === playerId) throw new Error("提示者不能选词");
    if (!this.getCurrentGuessers().some((player) => player.id === playerId)) {
      throw new Error("现在不是你选词");
    }
    const card = this.findOpenCard(cardId);
    this.secretSelections[playerId] = card.id;
    const expected = this.getCurrentGuessers().length;
    if (Object.keys(this.secretSelections).length >= expected) {
      this.revealSelections();
    } else {
      this.message = "秘密选择已更新，等待其他人。";
    }
  }

  revealSelections() {
    this.assertPlaying();
    if (this.mode !== "semi_coop") throw new Error("当前模式不使用同步揭示");
    if (this.phase !== "secretSelect") throw new Error("还不能揭示");
    const entries = Object.entries(this.secretSelections);
    if (entries.length === 0) {
      this.advanceTurn("本轮无人选词，跳过。");
      return;
    }
    this.revealedSelections = { ...this.secretSelections };
    const counts = new Map();
    for (const [, cardId] of entries) counts.set(cardId, (counts.get(cardId) || 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const total = entries.length;
    const topCount = sorted[0][1];
    const uniqueChoices = sorted.length;

    if (topCount === total) {
      const winnerId = sorted[0][0];
      const voters = entries.filter(([, cardId]) => cardId === winnerId).map(([id]) => id);
      this.message = "全员默契，直接翻牌。";
      this.addScore(this.getCurrentClueGiver().id, 1);
      this.reveal(winnerId, voters, { unanimous: true });
      return;
    }

    if (uniqueChoices === total) {
      this.enterPhase("decide", this.timers.decide, "完全分歧，提示者从这些选择里挑一张。");
      return;
    }

    this.enterPhase("discuss", this.timers.discuss, "出现分歧，公开讨论后投票。");
    this.votes = {};
  }

  advanceToVote(playerId) {
    this.assertPlaying();
    if (this.mode !== "semi_coop") throw new Error("当前模式不使用投票");
    this.assertPhase("discuss");
    this.assertCurrentClueGiver(playerId);
    this.enterPhase("vote", this.timers.vote, "进入公开投票。");
  }

  castVote(playerId, cardId) {
    this.assertPlaying();
    if (!this.clue) throw new Error("提示者还没有给线索");
    if (this.mode !== "semi_coop") throw new Error("当前模式不使用投票");
    const allowedPhases = new Set(["vote", "quickContinue"]);
    if (!allowedPhases.has(this.phase)) throw new Error("现在不是投票阶段");
    if (this.getCurrentClueGiver().id === playerId) throw new Error("提示者不能投票");
    const card = this.findOpenCard(cardId);
    this.votes[playerId] = card.id;
    this.message = "投票已更新。";
  }

  resolveVote(playerId) {
    this.assertPlaying();
    if (this.mode !== "semi_coop") throw new Error("当前模式不使用投票");
    const allowedPhases = new Set(["vote", "quickContinue"]);
    if (!allowedPhases.has(this.phase)) throw new Error("现在不能结算");
    this.assertCurrentClueGiver(playerId);
    const entries = Object.entries(this.votes);
    if (entries.length === 0) throw new Error("还没有人投票");
    const counts = new Map();
    for (const [, cardId] of entries) counts.set(cardId, (counts.get(cardId) || 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const winnerId = sorted[0][0];
    const voters = entries.filter(([, cardId]) => cardId === winnerId).map(([id]) => id);
    this.reveal(winnerId, voters, { source: this.phase });
  }

  decideFromSelections(playerId, cardId) {
    this.assertPlaying();
    if (this.mode !== "semi_coop") throw new Error("当前模式不使用提示者决定");
    this.assertPhase("decide");
    this.assertCurrentClueGiver(playerId);
    const options = new Set(Object.values(this.revealedSelections || {}));
    if (!options.has(cardId)) throw new Error("只能从猜测者的选择里挑一张");
    const voters = Object.entries(this.revealedSelections || {})
      .filter(([, selected]) => selected === cardId)
      .map(([id]) => id);
    this.reveal(cardId, voters, { source: "decide" });
  }

  revealCard(playerId, cardId) {
    this.assertPlaying();
    if (this.mode === "semi_coop") throw new Error("这个模式需要先秘密选词");
    if (this.phase !== "reveal") throw new Error("现在不能翻牌");
    this.assertCanGuess(playerId);
    this.reveal(cardId, [playerId]);
  }

  declineContinue(playerId) {
    this.assertPlaying();
    if (this.mode !== "semi_coop") throw new Error("当前模式不使用继续猜");
    this.assertPhase("quickContinue");
    this.assertCurrentClueGiver(playerId);
    this._logHistory({ kind: "decline", actorName: this._nameOf(playerId) });
    this.advanceTurn("提示者选择本轮结束。");
  }

  setModePreference(mode) {
    if (!MODE_TEXT[mode]) throw new Error("不支持的模式");
    if (!isModeAllowed(mode, this.players.length)) {
      throw new Error("这个人数不能切换到该模式");
    }
    this.mode = mode;
  }

  endTurn(playerId) {
    this.assertPlaying();
    const current = this.getCurrentClueGiver();
    const isGuesser =
      this.mode === "team_vs_team"
        ? this.getCurrentGuessers().some((player) => player.id === playerId)
        : this.mode === "duet_coop"
          ? this.players.some((player) => player.id === playerId)
          : false;
    if (playerId !== current.id && !isGuesser) throw new Error("现在不能由你结束回合");
    this.advanceTurn("当前回合结束。");
  }

  tick(nowMs = now()) {
    if (this.status !== "playing") return false;
    if (this.gameEndsAt && nowMs >= this.gameEndsAt) {
      this.finish("总时长用尽，按当前进度判负。", { teamLost: true });
      return true;
    }
    if (!this.phaseEndsAt || nowMs < this.phaseEndsAt) return false;
    return this.handlePhaseTimeout();
  }

  handlePhaseTimeout() {
    switch (this.phase) {
      case "clue":
        this.advanceTurn("提示者超时，换人出牌。");
        return true;
      case "secretSelect":
        this.revealSelections();
        return true;
      case "discuss":
        this.enterPhase("vote", this.timers.vote, "讨论超时，直接投票。");
        return true;
      case "vote":
      case "quickContinue":
        this.resolveTimedVote();
        return true;
      case "decide":
        this.autoDecide();
        return true;
      default:
        return false;
    }
  }

  resolveTimedVote() {
    const entries = Object.entries(this.votes);
    if (entries.length === 0) {
      if (this.phase === "quickContinue") {
        this.advanceTurn("继续猜超时无人投票，回合结束。");
      } else {
        this.advanceTurn("投票超时且无人投票，回合结束。");
      }
      return;
    }
    const counts = new Map();
    for (const [, cardId] of entries) counts.set(cardId, (counts.get(cardId) || 0) + 1);
    const winnerId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const voters = entries.filter(([, cardId]) => cardId === winnerId).map(([id]) => id);
    this.reveal(winnerId, voters, { source: "timeout" });
  }

  autoDecide() {
    const options = Object.values(this.revealedSelections || {});
    if (options.length === 0) {
      this.advanceTurn("决定超时，回合结束。");
      return;
    }
    const winnerId = options[0];
    const voters = Object.entries(this.revealedSelections || {})
      .filter(([, selected]) => selected === winnerId)
      .map(([id]) => id);
    this.reveal(winnerId, voters, { source: "timeout" });
  }

  getStateFor(playerId) {
    const viewer = this.players.find((player) => player.id === playerId);
    return {
      mode: this.mode,
      modeName: MODE_TEXT[this.mode],
      boardMode: this.boardMode,
      phase: this.phase,
      phaseName: this.phase ? PHASE_TEXT[this.phase] : null,
      phaseEndsAt: this.phaseEndsAt,
      gameEndsAt: this.gameEndsAt,
      status: this.status,
      message: this.message,
      round: this.round,
      maxRounds: this.maxRounds,
      mistakes: this.mistakes,
      maxMistakes: this.maxMistakes,
      currentTeam: this.currentTeam,
      clue: this.clue,
      guessesLeft: this.guessesLeft,
      secretSelectionIds: this.getPublicSelectionIds(),
      mySecretSelection: this.secretSelections[playerId] || null,
      revealedSelections: this.getPublicRevealedSelections(),
      decideOptions: this.getDecideOptions(),
      continueOffered: this.continueOffered,
      lastResolution: this.lastResolution,
      votes: this.getPublicVotes(),
      players: this.players,
      currentClueGiverId: this.getCurrentClueGiver()?.id || null,
      guesserIds: this.getCurrentGuessers().map((player) => player.id),
      stats: this.getStats(),
      cards: this.cards.map((card) => this.getCardFor(card, viewer)),
      history: this.history.slice(-40),
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
    const cardCount = 25;
    const baseCards = this.boardMode === "moreCats"
      ? this.imageIds.slice(0, cardCount).map((imageId, index) => ({
          imageId,
          cardIndex: index + 1,
          name: "",
          hint: "",
          code: null,
        }))
      : shuffle(CATS)
          .slice(0, cardCount)
          .map((cat, index) => ({ ...cat, cardIndex: index + 1 }));

    if (this.mode === "duet_coop") {
      const keyA = shuffle([...Array(9).fill("target"), ...Array(13).fill("neutral"), ...Array(2).fill("danger"), "assassin"]);
      const keyB = shuffle([...Array(9).fill("target"), ...Array(13).fill("neutral"), ...Array(2).fill("danger"), "assassin"]);
      return baseCards.map((cat, index) => ({ ...cat, id: `card-${index}`, revealed: false, keyA: keyA[index], keyB: keyB[index] }));
    }
    if (this.mode === "semi_coop") {
      const types = shuffle([...Array(9).fill("target"), ...Array(13).fill("neutral"), ...Array(2).fill("danger"), "assassin"]);
      return baseCards.map((cat, index) => ({ ...cat, id: `card-${index}`, revealed: false, type: types[index] }));
    }
    const firstTeam = this.currentTeam;
    const secondTeam = otherTeam(firstTeam);
    const types = shuffle([...Array(9).fill(firstTeam), ...Array(8).fill(secondTeam), ...Array(7).fill("neutral"), "assassin"]);
    return baseCards.map((cat, index) => ({ ...cat, id: `card-${index}`, revealed: false, type: types[index] }));
  }

  reveal(cardId, scoringPlayerIds = [], meta = {}) {
    const card = this.findOpenCard(cardId);
    card.revealed = true;
    const type = this.getRevealType(card);
    const clueGiver = this.getCurrentClueGiver();
    this.lastResolution = {
      cardId,
      cardName: card.name || `第${card.cardIndex}张`,
      revealedType: type,
      scoringPlayerIds: [...scoringPlayerIds],
      source: meta.source || this.phase,
    };
    this._logHistory({
      kind: "reveal",
      actorIds: [...scoringPlayerIds],
      actorNames: scoringPlayerIds.map((id) => this._nameOf(id)),
      clueGiverName: clueGiver?.name || null,
      cardIndex: card.cardIndex,
      cardName: card.name || "",
      revealedType: type,
      source: meta.source || this.phase,
      unanimous: Boolean(meta.unanimous),
    });
    this.votes = {};
    this.secretSelections = {};
    this.revealedSelections = null;

    if (type === "assassin") {
      this.addScore(clueGiver.id, -3);
      if (this.mode === "team_vs_team") {
        this.finish(`${teamName(this.currentTeam)}翻到失败喵，${teamName(otherTeam(this.currentTeam))}获胜。`, { teamLost: true });
      } else {
        this.finish("翻到失败喵，本局失败。", { teamLost: true });
      }
      return;
    }

    if (this.mode === "team_vs_team") {
      this.revealTeamCard(type);
      return;
    }

    if (type === "target") {
      this.addScore(clueGiver.id, 2);
      scoringPlayerIds.forEach((id) => this.addScore(id, 1));
      if (meta.unanimous) {
        scoringPlayerIds.forEach((id) => this.addScore(id, 1));
      }
      if (this.countTargetsLeft() === 0) {
        this.finish("所有目标喵都找到了，团队胜利。");
        return;
      }
      this.guessesLeft = Math.max(0, (this.guessesLeft || 1) - 1);
      if (this.guessesLeft <= 0) {
        this.clue = null;
        this.advanceTurn("关键词次数用尽，回合结束。");
        return;
      }
      if (this.mode === "semi_coop") {
        this.enterPhase(
          "quickContinue",
          this.timers.quickContinue,
          `猜中目标喵。还能再猜 ${this.guessesLeft} 张，提示者带队投票或收手。`,
        );
        this.continueOffered = true;
        return;
      }
      this.phase = "reveal";
      this.phaseEndsAt = null;
      this.message = `猜中目标喵，还能再猜 ${this.guessesLeft} 张。`;
      return;
    }

    if (type === "danger") {
      this.mistakes += 1;
      this.addScore(clueGiver.id, -1);
      scoringPlayerIds.forEach((id) => this.addScore(id, -1));
      if (this.mistakes >= this.maxMistakes) {
        this.finish("危险喵次数用尽，本局失败。", { teamLost: true });
        return;
      }
      this.clue = null;
      this.advanceTurn("猜到危险喵，扣掉一次机会。");
      return;
    }

    this.clue = null;
    this.advanceTurn("这是路过喵，当前回合结束。");
  }

  revealTeamCard(type) {
    if (type === this.currentTeam) {
      this.addScore(this.getCurrentClueGiver().id, 2);
      if (this.cards.filter((card) => card.type === this.currentTeam && !card.revealed).length === 0) {
        this.finish(`${teamName(this.currentTeam)}找齐所有喵，获得胜利。`);
        return;
      }
      this.guessesLeft = Math.max(0, (this.guessesLeft || 1) - 1);
      if (this.guessesLeft <= 0) {
        this.clue = null;
        this.advanceTurn(`${teamName(this.currentTeam)}关键词次数用尽，换队行动。`);
        return;
      }
      this.phase = "reveal";
      this.message = `${teamName(this.currentTeam)}猜中，还能再猜 ${this.guessesLeft} 张。`;
      return;
    }
    if (type === otherTeam(this.currentTeam)) {
      this.addScore(this.getCurrentClueGiver().id, -1);
      if (this.cards.filter((card) => card.type === type && !card.revealed).length === 0) {
        this.finish(`${teamName(type)}被帮忙找齐了喵，获得胜利。`);
        return;
      }
    }
    this.clue = null;
    this.advanceTurn("猜错了，换队行动。");
  }

  advanceTurn(message) {
    if (this.clue || this.phase) {
      this._logHistory({ kind: "advance", reason: message });
    }
    this.clue = null;
    this.guessesLeft = 0;
    this.votes = {};
    this.secretSelections = {};
    this.revealedSelections = null;
    this.continueOffered = false;
    if (this.mode === "team_vs_team") {
      this.currentTeam = otherTeam(this.currentTeam);
      this.phase = "clue";
      this.phaseEndsAt = null;
      this.message = message;
      return;
    }
    this.round += 1;
    if (this.mode === "duet_coop" && this.round > this.maxRounds) {
      this.finish("回合数用尽，本局失败。", { teamLost: true });
      return;
    }
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.players.forEach((player, index) => {
      if (player.team) return;
      player.role = index === this.currentPlayerIndex ? "clue_giver" : "guesser";
    });
    this.enterClue(message);
  }

  enterClue(message) {
    if (this.mode === "semi_coop") {
      this.enterPhase("clue", this.timers.clue, message);
    } else {
      this.phase = "clue";
      this.phaseEndsAt = null;
      this.message = message;
    }
  }

  enterPhase(phase, duration, message) {
    this.phase = phase;
    this.phaseEndsAt = duration ? now() + duration : null;
    if (message) this.message = message;
  }

  assertPhase(phase) {
    if (this.phase !== phase) throw new Error(`现在不是${PHASE_TEXT[phase] || phase}阶段`);
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
      code: card.code || null,
      imageId: card.imageId || null,
      cardIndex: card.cardIndex,
      name: card.name || "",
      hint: card.hint || "",
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
        return [playerId, cardLabel(card)];
      }),
    );
  }

  getPublicSelectionIds() {
    if (this.phase !== "secretSelect") return [];
    return Object.keys(this.secretSelections);
  }

  getPublicRevealedSelections() {
    if (!this.revealedSelections) return null;
    return Object.fromEntries(
      Object.entries(this.revealedSelections).map(([playerId, cardId]) => {
        const card = this.cards.find((item) => item.id === cardId);
        return [playerId, { cardId, cardName: cardLabel(card) }];
      }),
    );
  }

  getDecideOptions() {
    if (this.phase !== "decide") return [];
    const unique = new Set(Object.values(this.revealedSelections || {}));
    return this.cards
      .filter((card) => unique.has(card.id))
      .map((card) => ({ cardId: card.id, cardName: cardLabel(card) }));
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

  finish(message, options = {}) {
    if (this.mode === "semi_coop" && options.teamLost) {
      this.players.forEach((player) => {
        player.score = 0;
      });
    }
    this._logHistory({ kind: "finish", message, teamLost: Boolean(options.teamLost) });
    this.status = "finished";
    this.phase = "finished";
    this.phaseEndsAt = null;
    this.gameEndsAt = null;
    this.message = message;
  }
}

function cardLabel(card) {
  if (!card) return "未知喵";
  if (card.name) return card.name;
  if (card.cardIndex) return `第${card.cardIndex}张`;
  return "未知喵";
}

function validateClueWord(word, cards) {
  if (/\s/.test(word)) return "线索必须是一个词，不能有空格";
  if (/^\d+$/.test(word)) return "线索不能只是数字";
  if (/[A-Za-z]/.test(word) && /[一-鿿]/.test(word)) {
    return "线索不要混用中英文";
  }
  if (/[A-Za-z]/.test(word)) {
    if (!/^[A-Za-z'-]+$/.test(word)) return "线索只能是一个词";
  } else if (!/^[一-鿿·]+$/.test(word)) {
    return "请使用一个合法的中文词";
  }
  const characters = new Set(word.replace(/\s/g, ""));
  for (const card of cards) {
    if (card.revealed) continue;
    if (!card.name) continue;
    for (const ch of card.name) {
      if (characters.has(ch)) {
        return `线索不能包含棋盘词里的字符"${ch}"`;
      }
    }
  }
  return null;
}

function clampCount(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(9, Math.floor(value)));
}

function getDefaultMode(count) {
  if (count === 2) return "duet_coop";
  if (count >= 3 && count <= 6) return "semi_coop";
  if (count >= 7 && count <= 8) return "team_vs_team";
  return null;
}

function getMode(count) {
  return getDefaultMode(count);
}

function getAllowedModes(count) {
  if (count === 2) return ["duet_coop"];
  if (count >= 3 && count <= 4) return ["semi_coop"];
  if (count === 5 || count === 6) return ["semi_coop", "team_vs_team"];
  if (count >= 7 && count <= 8) return ["team_vs_team"];
  return [];
}

function isModeAllowed(mode, count) {
  return getAllowedModes(count).includes(mode);
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

function now() {
  return Date.now();
}

module.exports = {
  CatnamesGame,
  CATS,
  BOARD_MODES,
  getMode,
  getDefaultMode,
  getAllowedModes,
  isModeAllowed,
  validateClueWord,
  MODE_TEXT,
  PHASE_TEXT,
  DEFAULT_TIMERS,
};
