const socket = io();
let roomState = null;
let selectedVoteCardId = null;
let timerInterval = null;
let lastPhaseKey = null;
const sessionKey = "catnames.session.v1";

const MODE_LABEL = {
  duet_coop: "2 人合作",
  semi_coop: "3–5 人半合作",
  team_vs_team: "6–8 人阵营对抗",
};

const PHASE_LABEL = {
  clue: "提示",
  secretSelect: "秘密选词",
  reveal: "翻牌",
  discuss: "讨论",
  vote: "投票",
  decide: "决定",
  quickContinue: "继续猜",
  settle: "结算",
  finished: "已结束",
};

const els = {
  connectScreen: document.querySelector("#connectScreen"),
  lobbyScreen: document.querySelector("#lobbyScreen"),
  gameScreen: document.querySelector("#gameScreen"),
  connectForm: document.querySelector("#connectForm"),
  createButton: document.querySelector("#createButton"),
  playerName: document.querySelector("#playerName"),
  joinCode: document.querySelector("#joinCode"),
  toast: document.querySelector("#toast"),
  roomCode: document.querySelector("#roomCode"),
  playerCount: document.querySelector("#playerCount"),
  modeName: document.querySelector("#modeName"),
  modePicker: document.querySelector("#modePicker"),
  boardModePicker: document.querySelector("#boardModePicker"),
  boardModeHint: document.querySelector("#boardModeHint"),
  playerList: document.querySelector("#playerList"),
  startButton: document.querySelector("#startButton"),
  leaveButton: document.querySelector("#leaveButton"),
  leftStatLabel: document.querySelector("#leftStatLabel"),
  leftStat: document.querySelector("#leftStat"),
  rightStatLabel: document.querySelector("#rightStatLabel"),
  rightStat: document.querySelector("#rightStat"),
  turnLabel: document.querySelector("#turnLabel"),
  messageLabel: document.querySelector("#messageLabel"),
  timerBarFill: document.querySelector("#timerBarFill"),
  phasePill: document.querySelector("#phasePill"),
  phaseHeading: document.querySelector("#phaseHeading"),
  phaseBody: document.querySelector("#phaseBody"),
  phaseInput: document.querySelector("#phaseInput"),
  phaseActions: document.querySelector("#phaseActions"),
  clueDisplay: document.querySelector("#clueDisplay"),
  viewerHint: document.querySelector("#viewerHint"),
  board: document.querySelector("#board"),
  keyPanel: document.querySelector("#keyPanel"),
  keyGrid: document.querySelector("#keyGrid"),
  keyLegend: document.querySelector("#keyLegend"),
  cardTemplate: document.querySelector("#cardTemplate"),
  scoreList: document.querySelector("#scoreList"),
  modeRules: document.querySelector("#modeRules"),
  backToLobbyButton: document.querySelector("#backToLobbyButton"),
  restartButton: document.querySelector("#restartButton"),
};

socket.on("state", (state) => {
  roomState = state;
  render();
});

socket.on("disconnect", () => showToast("连接断开，正在尝试重连。"));
socket.on("connect", () => {
  const session = loadSession();
  if (!session?.roomCode || !session?.playerId) {
    showToast("");
    return;
  }
  showToast("已重新连接，正在恢复房间。");
  emitWithAck("resumeRoom", session, (response) => {
    saveSession({ ...session, roomCode: response.roomCode, playerId: response.playerId });
    showToast("");
  });
});

els.createButton.addEventListener("click", () => {
  emitWithAck("createRoom", { name: els.playerName.value }, (response) => {
    if (response.ok) {
      els.joinCode.value = response.roomCode;
      saveSession({
        roomCode: response.roomCode,
        playerId: response.playerId,
        name: els.playerName.value.trim(),
      });
      showToast("房间已创建，把房间码发给朋友。");
    }
  });
});

els.connectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  emitWithAck("joinRoom", { roomCode: els.joinCode.value, name: els.playerName.value }, (response) => {
    saveSession({
      roomCode: response.roomCode,
      playerId: response.playerId,
      name: els.playerName.value.trim(),
    });
  });
});

els.startButton.addEventListener("click", () => emitWithAck("startGame"));
els.restartButton.addEventListener("click", () => emitWithAck("startGame"));
els.backToLobbyButton.addEventListener("click", () => emitWithAck("backToLobby"));
els.leaveButton.addEventListener("click", () => {
  clearSession();
  window.location.reload();
});

function emitWithAck(eventName, payload, after) {
  const data = typeof payload === "function" || payload == null ? {} : payload;
  const callback = typeof payload === "function" ? payload : after;
  socket.timeout(10_000).emit(eventName, data, (error, response) => {
    if (error) {
      showToast("连接超时，稍后会自动重试。");
      return;
    }
    if (!response?.ok) {
      showToast(response?.error || "操作失败");
      if (eventName === "resumeRoom") clearSession();
      return;
    }
    showToast("");
    callback?.(response);
  });
}

function render() {
  if (!roomState) return;
  const game = roomState.game;
  els.roomCode.textContent = roomState.roomCode;
  els.connectScreen.classList.add("hidden");
  els.lobbyScreen.classList.toggle("hidden", Boolean(game));
  els.gameScreen.classList.toggle("hidden", !game);

  renderLobby();
  if (game) {
    renderGame(game);
  } else {
    stopTimer();
  }
}

function renderLobby() {
  const count = roomState.players.length;
  els.playerCount.textContent = count;
  const allowed = getAllowedModes(count);
  const pref = roomState.modePreference;
  const activeMode = pref && allowed.includes(pref) ? pref : allowed[0] || null;
  els.modeName.textContent = activeMode ? MODE_LABEL[activeMode] : "需要 2-8 人";

  const amHost = roomState.meId === roomState.hostId;
  els.modePicker.innerHTML = "";
  const MODE_OPTIONS = [
    { mode: "duet_coop", label: "2 人合作" },
    { mode: "semi_coop", label: "3–5 人半合作" },
    { mode: "team_vs_team", label: "6–8 人对抗" },
  ];
  MODE_OPTIONS.forEach(({ mode, label }) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `mode-chip ${activeMode === mode ? "active" : ""}`;
    chip.textContent = label;
    const enabled = allowed.includes(mode) && amHost && allowed.length > 1;
    chip.disabled = !enabled;
    chip.addEventListener("click", () => {
      emitWithAck("setModePreference", { mode });
    });
    els.modePicker.append(chip);
  });
  const boardMode = roomState.boardMode || "classic";
  els.boardModePicker.innerHTML = "";
  const BOARD_OPTIONS = [
    { mode: "classic", label: "经典 · 配字版" },
    { mode: "moreCats", label: "更多喵 · 纯图" },
  ];
  BOARD_OPTIONS.forEach(({ mode, label }) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `mode-chip ${boardMode === mode ? "active" : ""}`;
    chip.textContent = label;
    chip.disabled = !amHost;
    chip.addEventListener("click", () => {
      emitWithAck("setBoardMode", { boardMode: mode });
    });
    els.boardModePicker.append(chip);
  });
  if (boardMode === "moreCats") {
    els.boardModeHint.textContent = "每局从 CATAAS 实时抓取 25 张猫片，无配字。图片池偶尔抖动时会自动回退到经典模式。";
  } else {
    els.boardModeHint.textContent = "63 只有名字有梗的猫卡（HTTP 猫主题），每局随机 25 只。";
  }
  if (roomState.lastBoardError) {
    showToast(roomState.lastBoardError);
  }

  els.startButton.disabled = !amHost || allowed.length === 0;
  els.playerList.innerHTML = "";
  roomState.players.forEach((player, index) => {
    const li = document.createElement("li");
    const status = player.connected ? (player.isHost ? "房主" : "在线") : "断线";
    li.innerHTML = `<span>${index + 1}. ${escapeHtml(player.name)}</span><span class="tag">${status}</span>`;
    els.playerList.append(li);
  });
}

function renderGame(game) {
  const me = game.players.find((player) => player.id === roomState.meId);
  const clueGiver = game.players.find((player) => player.id === game.currentClueGiverId);
  const isHost = roomState.meId === roomState.hostId;
  const isClueGiver = roomState.meId === game.currentClueGiverId;
  const isGuesser = game.guesserIds.includes(roomState.meId);

  els.leftStatLabel.textContent = game.stats.leftLabel;
  els.leftStat.textContent = game.stats.leftValue;
  els.rightStatLabel.textContent = game.stats.rightLabel;
  els.rightStat.textContent = game.stats.rightValue;
  els.turnLabel.textContent = makeTurnLabel(game, clueGiver);
  els.messageLabel.textContent = game.message;
  if (game.clue) {
    els.clueDisplay.classList.remove("empty");
    const guesses = typeof game.guessesLeft === "number" && game.guessesLeft > 0
      ? ` <span class="count">${game.clue.count}</span><span class="tag" style="margin-left:6px">还能猜 ${game.guessesLeft}</span>`
      : ` <span class="count">${game.clue.count}</span>`;
    els.clueDisplay.innerHTML = `${escapeHtml(game.clue.word)}${guesses}`;
  } else {
    els.clueDisplay.classList.add("empty");
    els.clueDisplay.textContent = "无";
  }
  els.restartButton.disabled = !isHost;
  els.backToLobbyButton.disabled = !isHost;
  els.viewerHint.textContent = makeViewerHint(game, me, clueGiver);
  els.modeRules.textContent = makeModeRules(game.mode);

  if (game.phase !== lastPhaseKey) {
    selectedVoteCardId = null;
    lastPhaseKey = game.phase;
  }

  renderPhasePanel(game, me, isClueGiver, isGuesser);
  renderBoard(game, isClueGiver, isGuesser);
  renderKeyPanel(game);
  renderScores(game);
  startTimer(game.phaseEndsAt);
}

function renderKeyPanel(game) {
  const hasKey = game.cards.some((card) => card.secretType);
  if (!hasKey) {
    els.keyPanel.classList.add("hidden");
    els.keyGrid.innerHTML = "";
    els.keyLegend.innerHTML = "";
    return;
  }
  els.keyPanel.classList.remove("hidden");
  els.keyGrid.innerHTML = "";
  game.cards.forEach((card) => {
    const tile = document.createElement("div");
    tile.className = `key-tile type-${card.secretType || "neutral"}`;
    if (card.revealed) tile.classList.add("revealed");
    const label = card.name || `#${card.cardIndex}`;
    tile.textContent = label;
    tile.title = `${label}（${labelForType(card.secretType)}）`;
    els.keyGrid.append(tile);
  });
  els.keyLegend.innerHTML = buildLegend(game);
}

function buildLegend(game) {
  const map = {
    target: { label: "目标", var: "--accent" },
    red: { label: "红队", var: "--red" },
    blue: { label: "蓝队", var: "--blue" },
    neutral: { label: "路过", color: "#2a2a26" },
    danger: { label: "危险", var: "--danger" },
    assassin: { label: "失败", color: "#000" },
  };
  const present = new Set(game.cards.map((card) => card.secretType).filter(Boolean));
  return Array.from(present)
    .map((type) => {
      const item = map[type];
      if (!item) return "";
      const color = item.var ? `var(${item.var})` : item.color;
      return `<span><span class="dot" style="background:${color}"></span>${item.label}</span>`;
    })
    .join("");
}

function renderPhasePanel(game, me, isClueGiver, isGuesser) {
  const phase = game.phase;
  els.phasePill.textContent = PHASE_LABEL[phase] || "等待";
  els.phaseHeading.textContent = phaseHeadingText(game, isClueGiver, isGuesser);
  els.phaseBody.textContent = phaseBodyText(game, isClueGiver, isGuesser);
  els.phaseInput.innerHTML = "";
  els.phaseActions.innerHTML = "";

  if (game.status !== "playing") return;

  if (phase === "clue") {
    renderCluePanel(game, isClueGiver);
  } else if (phase === "secretSelect") {
    renderSecretSelectPanel(game, isGuesser);
  } else if (phase === "reveal") {
    renderFreeRevealPanel(game, isClueGiver, isGuesser);
  } else if (phase === "discuss") {
    renderDiscussPanel(game, isClueGiver);
  } else if (phase === "vote" || phase === "quickContinue") {
    renderVotePanel(game, isClueGiver, isGuesser);
  } else if (phase === "decide") {
    renderDecidePanel(game, isClueGiver);
  }
}

function phaseHeadingText(game, isClueGiver, isGuesser) {
  const phase = game.phase;
  if (game.status === "finished") return "本局结束";
  if (phase === "clue") return isClueGiver ? "轮到你出提示" : "等待提示者出牌";
  if (phase === "secretSelect") return isGuesser ? "秘密选出一张猫牌" : "等待猜测者选词";
  if (phase === "reveal") return isGuesser ? "点击牌面翻牌" : "等待翻牌";
  if (phase === "discuss") return "讨论分歧 · 然后进入投票";
  if (phase === "vote") return isGuesser ? "公开投票" : "等待投票结果";
  if (phase === "quickContinue") return "继续猜一张？";
  if (phase === "decide") return isClueGiver ? "从猜测者的选择里挑一张" : "等待提示者决定";
  return "准备中";
}

function phaseBodyText(game, isClueGiver) {
  const phase = game.phase;
  if (game.status === "finished") return game.message;
  if (phase === "clue") {
    return isClueGiver
      ? "输入一个词和数字。提示不能包含棋盘上任何词的字符，也不能混用中英文。"
      : "等待提示者想好线索再继续。";
  }
  if (phase === "secretSelect") return "所有人同时秘密选一张。全员一致直接翻牌，部分一致进入投票，完全分歧由提示者决定。";
  if (phase === "reveal") return "对抗模式下直接点击想翻的猫牌。";
  if (phase === "discuss") return "出现分歧，大家快速讨论，然后由提示者开启公开投票。";
  if (phase === "vote") return "猜测者从剩余猫牌里投票，提示者结算多数票。";
  if (phase === "quickContinue") return "刚才猜中了。要不要带队再猜一张？提示者按投票或收手。";
  if (phase === "decide") return "每个人选的都不一样，只能从这些选择里挑一张。";
  return "";
}

function renderCluePanel(game, isClueGiver) {
  const container = document.createElement("div");
  container.className = "clue-form";
  container.innerHTML = `
    <label>
      <span>提示词</span>
      <input id="clueWord" type="text" maxlength="12" placeholder="例如：学校" ${isClueGiver ? "" : "disabled"} />
    </label>
    <label>
      <span>数量</span>
      <input id="clueCount" type="number" min="0" max="9" value="1" ${isClueGiver ? "" : "disabled"} />
    </label>
    <p class="clue-rules">单个词 + 0–9；不能包含棋盘词里任何字符；不能是谐音、拼音、英文翻译。</p>
  `;
  els.phaseInput.append(container);
  if (isClueGiver) {
    const submit = document.createElement("button");
    submit.type = "button";
    submit.textContent = "公布提示";
    submit.addEventListener("click", () => {
      const word = container.querySelector("#clueWord").value;
      const count = container.querySelector("#clueCount").value;
      emitWithAck("submitClue", { word, count });
    });
    els.phaseActions.append(submit);

    if (game.mode !== "semi_coop") {
      const endBtn = document.createElement("button");
      endBtn.type = "button";
      endBtn.className = "ghost";
      endBtn.textContent = "结束回合";
      endBtn.addEventListener("click", () => emitWithAck("endTurn"));
      els.phaseActions.append(endBtn);
    }
  }
}

function renderSecretSelectPanel(game, isGuesser) {
  const container = document.createElement("div");
  container.className = "phase-list";
  game.players
    .filter((player) => game.guesserIds.includes(player.id))
    .forEach((player) => {
      const row = document.createElement("div");
      row.className = "row";
      const picked = game.secretSelectionIds.includes(player.id);
      const mine = player.id === roomState.meId;
      const status = picked ? "已选" : "选择中";
      row.innerHTML = `<span>${escapeHtml(player.name)}${mine ? " · 你" : ""}</span><strong>${status}</strong>`;
      container.append(row);
    });
  els.phaseInput.append(container);
  if (isGuesser) {
    const hint = document.createElement("p");
    hint.className = "muted";
    const myPick = game.mySecretSelection;
    hint.textContent = myPick
      ? "你已经选择。还可以在倒计时内点击其他猫牌更换。"
      : "点击下方棋盘里的一张猫牌提交秘密选择。";
    els.phaseInput.append(hint);
  }
}

function renderFreeRevealPanel(game, isClueGiver, isGuesser) {
  const hint = document.createElement("p");
  hint.className = "muted";
  const left = typeof game.guessesLeft === "number" ? game.guessesLeft : null;
  hint.textContent = isGuesser
    ? `点击下方棋盘里的一张猫牌翻牌${left ? `，还能再猜 ${left} 张` : ""}。猜错或收手会结束回合。`
    : `等待猜测者翻牌${left ? `（还剩 ${left} 次）` : ""}。`;
  els.phaseInput.append(hint);
  const endBtn = document.createElement("button");
  endBtn.type = "button";
  endBtn.className = "ghost";
  endBtn.textContent = "结束回合";
  endBtn.addEventListener("click", () => emitWithAck("endTurn"));
  els.phaseActions.append(endBtn);
}

function renderDiscussPanel(game, isClueGiver) {
  const reveal = game.revealedSelections || {};
  const container = document.createElement("div");
  container.className = "reveal-summary";
  game.players
    .filter((player) => game.guesserIds.includes(player.id))
    .forEach((player) => {
      const pick = reveal[player.id];
      const row = document.createElement("div");
      row.className = "reveal-row";
      row.innerHTML = `<span>${escapeHtml(player.name)}</span><strong>${escapeHtml(pick?.cardName || "未选")}</strong>`;
      container.append(row);
    });
  els.phaseInput.append(container);
  if (isClueGiver) {
    const voteBtn = document.createElement("button");
    voteBtn.type = "button";
    voteBtn.textContent = "开启公开投票";
    voteBtn.addEventListener("click", () => emitWithAck("advanceToVote"));
    els.phaseActions.append(voteBtn);
  }
}

function renderVotePanel(game, isClueGiver, isGuesser) {
  const openCards = game.cards.filter((card) => !card.revealed);
  const tallies = new Map();
  Object.values(game.votes).forEach((name) => {
    tallies.set(name, (tallies.get(name) || 0) + 1);
  });
  const myVoteName = game.votes[roomState.meId] || null;
  if (isGuesser) {
    const list = document.createElement("div");
    list.className = "vote-option-list";
    openCards.forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      const label = card.name || `第${card.cardIndex}张`;
      const isMine = myVoteName === label;
      button.className = `vote-option ${isMine ? "selected" : ""}`;
      const tally = tallies.get(label) || 0;
      button.innerHTML = `<strong>${escapeHtml(label)}</strong><span class="tally">${tally} 票</span>`;
      button.addEventListener("click", () => {
        selectedVoteCardId = card.id;
        emitWithAck("castVote", { cardId: card.id });
      });
      list.append(button);
    });
    els.phaseInput.append(list);
  } else {
    const summary = document.createElement("div");
    summary.className = "reveal-summary";
    Array.from(tallies.entries()).forEach(([name, count]) => {
      const row = document.createElement("div");
      row.className = "reveal-row";
      row.innerHTML = `<span>${escapeHtml(name)}</span><strong>${count} 票</strong>`;
      summary.append(row);
    });
    if (!tallies.size) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "还没有人投票。";
      summary.append(empty);
    }
    els.phaseInput.append(summary);
  }

  if (isClueGiver) {
    const resolveBtn = document.createElement("button");
    resolveBtn.type = "button";
    resolveBtn.textContent = game.phase === "quickContinue" ? "确认继续猜这张" : "结算投票";
    resolveBtn.disabled = Object.keys(game.votes).length === 0;
    resolveBtn.addEventListener("click", () => emitWithAck("resolveVote"));
    els.phaseActions.append(resolveBtn);

    if (game.phase === "quickContinue") {
      const stopBtn = document.createElement("button");
      stopBtn.type = "button";
      stopBtn.className = "ghost";
      stopBtn.textContent = "收手，结束回合";
      stopBtn.addEventListener("click", () => emitWithAck("declineContinue"));
      els.phaseActions.append(stopBtn);
    }
  }
}

function renderDecidePanel(game, isClueGiver) {
  const reveal = game.revealedSelections || {};
  const summary = document.createElement("div");
  summary.className = "reveal-summary";
  Object.entries(reveal).forEach(([playerId, pick]) => {
    const player = game.players.find((p) => p.id === playerId);
    const row = document.createElement("div");
    row.className = "reveal-row";
    row.innerHTML = `<span>${escapeHtml(player?.name || "玩家")}</span><strong>${escapeHtml(pick.cardName)}</strong>`;
    summary.append(row);
  });
  els.phaseInput.append(summary);
  if (isClueGiver && game.decideOptions.length) {
    const list = document.createElement("div");
    list.className = "vote-option-list";
    game.decideOptions.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "vote-option";
      button.innerHTML = `<strong>${escapeHtml(option.cardName)}</strong><span class="tally">候选</span>`;
      button.addEventListener("click", () => {
        emitWithAck("decideFromSelections", { cardId: option.cardId });
      });
      list.append(button);
    });
    els.phaseActions.append(list);
  }
}

function renderBoard(game, isClueGiver, isGuesser) {
  els.board.innerHTML = "";
  const phase = game.phase;
  const boardMode = game.boardMode || "classic";
  els.board.classList.toggle("board-more-cats", boardMode === "moreCats");
  game.cards.forEach((card) => {
    const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
    node.classList.toggle("revealed", card.revealed);
    if (card.revealedType) node.classList.add(`reveal-${card.revealedType}`);
    if (boardMode === "moreCats") {
      node.classList.add("image-only");
      node.setAttribute("data-index", `#${card.cardIndex}`);
    }

    const mySecret = game.mySecretSelection;
    if (mySecret === card.id && phase === "secretSelect") node.classList.add("picked");

    const canClick = cardClickable(game, card, isClueGiver, isGuesser);
    node.disabled = !canClick;
    node.querySelector(".selection-marker").textContent = mySecret === card.id ? "我的选择" : "";
    const img = node.querySelector("img");
    if (boardMode === "moreCats" && card.imageId) {
      img.src = `https://cataas.com/cat/${encodeURIComponent(card.imageId)}?width=320&height=240`;
      img.alt = `第${card.cardIndex}张喵`;
    } else if (card.code) {
      img.src = `https://http.cat/${card.code}.jpg`;
      img.alt = card.name;
    }
    const strong = node.querySelector("strong");
    const small = node.querySelector("small");
    if (boardMode === "moreCats") {
      strong.textContent = `#${card.cardIndex}`;
      small.textContent = "";
    } else {
      strong.textContent = card.name;
      small.textContent = card.hint;
    }
    if (canClick) {
      node.addEventListener("click", () => handleCardClick(game, card));
    }
    els.board.append(node);
  });
}

function cardClickable(game, card, isClueGiver, isGuesser) {
  if (game.status !== "playing") return false;
  if (card.revealed) return false;
  const phase = game.phase;
  if (phase === "secretSelect") return isGuesser;
  if (phase === "reveal") {
    if (game.mode === "semi_coop") return false;
    return isGuesser && Boolean(game.clue);
  }
  return false;
}

function handleCardClick(game, card) {
  const phase = game.phase;
  if (phase === "secretSelect") {
    emitWithAck("submitSelection", { cardId: card.id });
    return;
  }
  if (phase === "reveal") {
    emitWithAck("revealCard", { cardId: card.id });
  }
}

function renderScores(game) {
  els.scoreList.innerHTML = "";
  game.players.forEach((player) => {
    const row = document.createElement("div");
    row.className = "score-row";
    const teamTag = player.team ? `<span class="tag ${player.team}">${player.team === "red" ? "红队" : "蓝队"}</span>` : "";
    const roleLabel = player.role === "spymaster" || player.role === "clue_giver" ? "提示者" : "猜测者";
    const statusTag = player.connected ? "" : '<span class="tag">断线</span>';
    row.innerHTML = `<span>${escapeHtml(player.name)} ${teamTag}<span class="tag">${roleLabel}</span>${statusTag}</span><strong>${player.score}</strong>`;
    els.scoreList.append(row);
  });
}

function makeTurnLabel(game, clueGiver) {
  if (game.mode === "team_vs_team") {
    return `${game.currentTeam === "red" ? "红队" : "蓝队"}回合`;
  }
  return `第 ${game.round} 回合 · ${clueGiver?.name || "等待"} 出牌`;
}

function makeViewerHint(game, me, clueGiver) {
  if (!me) return "";
  const role = me.role === "spymaster" || me.role === "clue_giver" ? "提示者" : "猜测者";
  const team = me.team ? `，你在${me.team === "red" ? "红队" : "蓝队"}` : "";
  const canSee = game.cards.some((card) => card.secretType);
  return `你是 ${me.name}${team}，当前身份是${role}。${canSee ? "你能看到本回合隐藏答案。" : `本回合由 ${clueGiver?.name || "别人"} 看隐藏答案。`}`;
}

function makeModeRules(mode) {
  if (mode === "duet_coop") return "2 人合作：轮流给提示，在限定回合内找出所有目标猫。点到失败猫直接失败。";
  if (mode === "semi_coop") return "3–5 人半合作：同步揭示 → 投票 / 决定 → 翻牌。个人分只在团队胜利时结算。";
  return "6–8 人阵营对抗：红蓝轮流行动，先找齐己方猫获胜，点到失败猫立刻输。";
}

function getAllowedModes(count) {
  if (count === 2) return ["duet_coop"];
  if (count >= 3 && count <= 4) return ["semi_coop"];
  if (count === 5 || count === 6) return ["semi_coop", "team_vs_team"];
  if (count >= 7 && count <= 8) return ["team_vs_team"];
  return [];
}

function startTimer(endsAt) {
  stopTimer();
  if (!endsAt) {
    els.timerBarFill.style.width = "0%";
    return;
  }
  const start = Date.now();
  const total = endsAt - start;
  if (total <= 0) {
    els.timerBarFill.style.width = "0%";
    return;
  }
  timerInterval = setInterval(() => {
    const remaining = endsAt - Date.now();
    const pct = Math.max(0, Math.min(1, remaining / total));
    els.timerBarFill.style.width = `${(pct * 100).toFixed(1)}%`;
    els.timerBarFill.classList.toggle("warning", pct < 0.25);
    if (remaining <= 0) stopTimer();
  }, 200);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function labelForType(type) {
  return {
    target: "目标",
    neutral: "中立",
    danger: "危险",
    assassin: "失败",
    red: "红队",
    blue: "蓝队",
  }[type] || "";
}

function showToast(message) {
  els.toast.textContent = message || "";
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey) || "null");
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(sessionKey);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}
