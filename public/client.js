const socket = io();
let roomState = null;
let selectedVoteCardId = null;

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
  playerList: document.querySelector("#playerList"),
  startButton: document.querySelector("#startButton"),
  leaveButton: document.querySelector("#leaveButton"),
  leftStatLabel: document.querySelector("#leftStatLabel"),
  leftStat: document.querySelector("#leftStat"),
  rightStatLabel: document.querySelector("#rightStatLabel"),
  rightStat: document.querySelector("#rightStat"),
  turnLabel: document.querySelector("#turnLabel"),
  messageLabel: document.querySelector("#messageLabel"),
  viewerHint: document.querySelector("#viewerHint"),
  cluePanel: document.querySelector("#cluePanel"),
  clueWord: document.querySelector("#clueWord"),
  clueCount: document.querySelector("#clueCount"),
  setClueButton: document.querySelector("#setClueButton"),
  endTurnButton: document.querySelector("#endTurnButton"),
  clueDisplay: document.querySelector("#clueDisplay"),
  votePanel: document.querySelector("#votePanel"),
  voteHint: document.querySelector("#voteHint"),
  voteList: document.querySelector("#voteList"),
  resolveVoteButton: document.querySelector("#resolveVoteButton"),
  board: document.querySelector("#board"),
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
socket.on("connect", () => showToast(""));

els.createButton.addEventListener("click", () => {
  emitWithAck("createRoom", { name: els.playerName.value }, (response) => {
    if (response.ok) {
      els.joinCode.value = response.roomCode;
      showToast("房间已创建，把房间码发给朋友。");
    }
  });
});

els.connectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  emitWithAck("joinRoom", { roomCode: els.joinCode.value, name: els.playerName.value });
});

els.startButton.addEventListener("click", () => emitWithAck("startGame"));
els.restartButton.addEventListener("click", () => emitWithAck("startGame"));
els.backToLobbyButton.addEventListener("click", () => emitWithAck("backToLobby"));
els.leaveButton.addEventListener("click", () => window.location.reload());

els.setClueButton.addEventListener("click", () => {
  emitWithAck("submitClue", {
    word: els.clueWord.value,
    count: els.clueCount.value,
  });
});

els.endTurnButton.addEventListener("click", () => emitWithAck("endTurn"));
els.resolveVoteButton.addEventListener("click", () => emitWithAck("resolveVote"));

function emitWithAck(eventName, payload, after) {
  const data = typeof payload === "function" || payload == null ? {} : payload;
  const callback = typeof payload === "function" ? payload : after;
  socket.emit(eventName, data, (response) => {
    if (!response?.ok) {
      showToast(response?.error || "操作失败");
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
  if (game) renderGame(game);
}

function renderLobby() {
  els.playerCount.textContent = roomState.players.length;
  els.modeName.textContent = getModeName(roomState.players.length);
  els.startButton.disabled = roomState.meId !== roomState.hostId || !getMode(roomState.players.length);
  els.playerList.innerHTML = "";
  roomState.players.forEach((player, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${index + 1}. ${escapeHtml(player.name)}</span><span class="tag">${player.isHost ? "房主" : "已加入"}</span>`;
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
  els.clueDisplay.textContent = game.clue ? `线索：${game.clue.word}，${game.clue.count} 只` : "还没有线索";
  els.setClueButton.disabled = !isClueGiver || game.status !== "playing" || Boolean(game.clue);
  els.endTurnButton.disabled = game.status !== "playing" || (!isClueGiver && !(game.mode === "team_vs_team" && isGuesser));
  els.restartButton.disabled = !isHost;
  els.backToLobbyButton.disabled = !isHost;
  els.viewerHint.textContent = makeViewerHint(game, me, clueGiver);
  els.modeRules.textContent = makeModeRules(game.mode);

  renderBoard(game, isGuesser);
  renderVotes(game, isClueGiver, isGuesser);
  renderScores(game);
}

function renderBoard(game, isGuesser) {
  els.board.innerHTML = "";
  game.cards.forEach((card) => {
    const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
    const type = card.revealedType || card.secretType;
    if (type) node.classList.add(`secret-${type}`);
    node.classList.toggle("secret-visible", Boolean(card.secretType));
    node.classList.toggle("revealed", card.revealed);
    node.disabled = card.revealed || game.status !== "playing" || !isGuesser || !game.clue || game.mode === "semi_coop";
    node.querySelector(".secret-marker").textContent = labelForType(card.secretType);
    node.querySelector("img").src = `https://http.cat/${card.code}.jpg`;
    node.querySelector("img").alt = card.name;
    node.querySelector("strong").textContent = card.name;
    node.querySelector("small").textContent = card.hint;
    node.addEventListener("click", () => emitWithAck("revealCard", { cardId: card.id }));
    els.board.append(node);
  });
}

function renderVotes(game, isClueGiver, isGuesser) {
  const shouldShow = game.mode === "semi_coop" && game.status === "playing" && game.clue;
  els.votePanel.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) return;

  const myVote = Object.prototype.hasOwnProperty.call(game.votes, roomState.meId);
  els.voteHint.textContent = isGuesser ? "选择一张猫牌投票。投票后由提示者结算多数票。" : "等待猜测者投票，提示者可以结算多数票。";
  els.resolveVoteButton.disabled = !isClueGiver || Object.keys(game.votes).length === 0;
  els.voteList.innerHTML = "";

  if (isGuesser) {
    game.cards.filter((card) => !card.revealed).forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `vote-option ${selectedVoteCardId === card.id || game.votes[roomState.meId] === card.name ? "selected" : ""}`;
      button.textContent = card.name;
      button.disabled = myVote && game.votes[roomState.meId] !== card.name;
      button.addEventListener("click", () => {
        selectedVoteCardId = card.id;
        emitWithAck("castVote", { cardId: card.id });
      });
      els.voteList.append(button);
    });
  }

  Object.entries(game.votes).forEach(([playerId, cardName]) => {
    const player = game.players.find((item) => item.id === playerId);
    const item = document.createElement("div");
    item.className = "score-row";
    item.innerHTML = `<span>${escapeHtml(player?.name || "玩家")}</span><strong>${escapeHtml(cardName)}</strong>`;
    els.voteList.append(item);
  });
}

function renderScores(game) {
  els.scoreList.innerHTML = "";
  game.players.forEach((player) => {
    const row = document.createElement("div");
    row.className = "score-row";
    const teamTag = player.team ? `<span class="tag ${player.team}">${player.team === "red" ? "红队" : "蓝队"}</span>` : "";
    const roleName = player.role === "spymaster" || player.role === "clue_giver" ? "提示者" : "猜测者";
    row.innerHTML = `<span>${escapeHtml(player.name)} ${teamTag}<span class="tag">${roleName}</span></span><strong>${player.score}</strong>`;
    els.scoreList.append(row);
  });
}

function makeTurnLabel(game, clueGiver) {
  if (game.mode === "team_vs_team") {
    return `${game.currentTeam === "red" ? "红队" : "蓝队"}回合：${clueGiver?.name || "等待"}提示`;
  }
  return `第 ${game.round} 回合：${clueGiver?.name || "等待"}提示`;
}

function makeViewerHint(game, me, clueGiver) {
  if (!me) return "";
  const role = me.role === "spymaster" || me.role === "clue_giver" ? "提示者" : "猜测者";
  const team = me.team ? `，你在${me.team === "red" ? "红队" : "蓝队"}` : "";
  const canSee = game.cards.some((card) => card.secretType);
  return `你是 ${me.name}${team}，当前身份是${role}。${canSee ? "你能看到本回合隐藏答案。" : `本回合由 ${clueGiver?.name || "别人"} 看隐藏答案。`}`;
}

function makeModeRules(mode) {
  if (mode === "duet_coop") return "合作模式：两人轮流给提示，在限定回合内找出所有目标猫。点到失败猫会直接失败。";
  if (mode === "semi_coop") return "半合作模式：大家共同找目标猫，提示者轮换；猜测者投票，提示者结算。";
  return "阵营模式：红蓝轮流行动，各队提示者给线索，先找齐己方猫获胜，点到失败猫立刻输。";
}

function getMode(count) {
  if (count === 2) return "duet_coop";
  if (count >= 3 && count <= 5) return "semi_coop";
  if (count >= 6 && count <= 8) return "team_vs_team";
  return null;
}

function getModeName(count) {
  return {
    duet_coop: "2人合作解谜",
    semi_coop: "3-5人半合作",
    team_vs_team: "6-8人阵营对抗",
  }[getMode(count)] || "需要 2-8 人";
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}
