const CHARACTERS = [
  ["耶宝", "01-yebao.png"], ["诺白菜", "02-nuobaicai.png"], ["小小狸", "03-xiaoxiaoli.png"],
  ["小马叽", "04-xiaomaji.png"], ["唐小田", "05-tangxiaotian.png"], ["小飞酱", "06-xiaofeijiang.png"],
  ["龙宝", "07-longbao.png"], ["杨桃七仔", "08-yangtaoqizai.png"], ["猪小钎", "09-zhuxiaoqian.png"],
  ["胖达亨亨", "10-pangdahengheng.png"], ["mini酱", "11-minijiang.png"], ["猫不E", "12-maobuyi.png"]
];

const QUIZZES = [
  { q: "Fly拥有三款FMVP皮肤，下面哪一个不属于他？", o: ["冠军飞将（花木兰）", "云鹰飞将（曜）", "无双飞将（马超）", "炽阳神光（镜）"], a: 3 },
  { q: "下列组合中，哪一组选手全部都拥有FMVP皮肤？", o: ["Fly、清融、花海、Cat、小胖", "Fly、清融、花海、九尾、钎城", "清融、花海、无畏、小胖、Cat", "Fly、清清、Cat、一诺、无畏"], a: 0 },
  { q: "花海整个职业生涯一直效力的俱乐部是？", o: ["武汉eStarPro", "重庆狼队", "成都AG超玩会", "南京Hero久竞"], a: 0 },
  { q: "梦之队里，哪位选手曾在Hero久竞拿过冠军，后来和无畏在梦之队重逢？", o: ["清融", "花海", "Fly", "小胖"], a: 0 },
  { q: "一诺的公孙离FMVP皮肤名字是？", o: ["云诺千山", "游龙清影", "无双飞将", "逐花归海"], a: 0 },
  { q: "一诺职业生涯没有效力过下面哪个战队？", o: ["BA黑凤梨", "成都AG超玩会", "武汉eStarPro", "以上都不是"], a: 2 },
  { q: "以下哪位梦之队选手没有FMVP皮肤？", o: ["小胖", "无畏", "Fly", "清融"], a: 1 },
  { q: "一诺的真实姓名是？", o: ["彭云飞", "徐必成", "黄垚钦", "罗思源"], a: 1 },
  { q: "Fly的真实姓名是？", o: ["李达亨", "杨涛", "彭云飞", "周诣涛"], a: 2 },
  { q: "小胖的真实姓名是？", o: ["李达亨", "罗思源", "陈正正", "吴金翔"], a: 0 },
  { q: "清融的真实姓名是？", o: ["徐必成", "黄垚钦", "许鑫蓁", "周诣涛"], a: 1 },
  { q: "梦之队团综的名字是什么？", o: ["时差五小时", "巅峰相见", "王者出征", "并肩而战"], a: 0 },
  { q: "哪两位是2024 KPL梦之队的教练？", o: ["Gemini和爱思", "久哲和花楼", "奶茶和SK", "黎洛和林"], a: 0 },
  { q: "2024 KPL梦之队参加的电竞世界杯在哪座城市举办？", o: ["巴黎", "利雅得", "伦敦", "迪拜"], a: 1 }
];

const ROWS = 8;
const COLS = 8;
const DIFFICULTIES = {
  easy: { label: "轻松", moves: 20, targetPercentile: .22, detail: "容错较高" },
  normal: { label: "标准", moves: 16, targetPercentile: .42, detail: "需要一点取舍" },
  hard: { label: "挑战", moves: 13, targetPercentile: .62, detail: "更看重消除顺序" }
};
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const state = {
  selectedTypes: [], level: 1, unlocked: Number(localStorage.getItem("mengjiTapUnlocked") || 1),
  difficulty: localStorage.getItem("mengjiTapDifficulty") || "normal",
  board: [], highlighted: [], score: 0, levelStartScore: 0, target: 650, moves: 16, expectedScore: 0,
  busy: false, finished: false, hammerMode: false, undoSnapshot: null,
  tools: { undo: 2, hammer: 2 }, usedQuestions: []
};
if (!DIFFICULTIES[state.difficulty]) state.difficulty = "normal";

function setupPicker() {
  $("characterPicker").innerHTML = CHARACTERS.map(([name, file], i) => `
    <button class="character-option" data-type="${i}" aria-label="${name}" aria-pressed="false">
      <img src="./assets/${file}" alt="${name}" draggable="false">
      <span class="character-name">${name}</span>
    </button>`).join("");
  $("characterPicker").addEventListener("click", event => {
    const button = event.target.closest(".character-option");
    if (!button) return;
    const type = Number(button.dataset.type);
    const index = state.selectedTypes.indexOf(type);
    if (index >= 0) state.selectedTypes.splice(index, 1);
    else if (state.selectedTypes.length < 6) state.selectedTypes.push(type);
    updatePicker();
  });
  $("randomPick").addEventListener("click", () => {
    state.selectedTypes = [...CHARACTERS.keys()].sort(() => Math.random() - .5).slice(0, 6);
    updatePicker();
  });
  $("startGame").addEventListener("click", startCampaign);
  $("prevLevel").addEventListener("click", () => changeLevel(-1));
  $("nextLevel").addEventListener("click", () => changeLevel(1));
  $("backButton").addEventListener("click", showPicker);
  $("restartButton").addEventListener("click", retryLevel);
  $("retryButton").addEventListener("click", retryLevel);
  $("continueButton").addEventListener("click", nextLevel);
  $("undoTool").addEventListener("click", () => state.undoSnapshot && openQuiz("undo"));
  $("hammerTool").addEventListener("click", () => openQuiz("hammer"));
  $("difficultyPicker").addEventListener("click", event => {
    const button = event.target.closest(".difficulty-option");
    if (!button) return;
    state.difficulty = button.dataset.difficulty;
    localStorage.setItem("mengjiTapDifficulty", state.difficulty);
    updateDifficultyPicker();
  });
  updatePicker();
  updateDifficultyPicker();
}

function changeLevel(delta) {
  state.level = Math.max(1, Math.min(state.unlocked, state.level + delta));
  updatePicker();
  updateDifficultyPicker();
}

function updatePicker() {
  document.querySelectorAll(".character-option").forEach(button => {
    const selectedIndex = state.selectedTypes.indexOf(Number(button.dataset.type));
    const selected = selectedIndex >= 0;
    button.classList.toggle("selected", selected);
    button.classList.toggle("limit", !selected && state.selectedTypes.length === 6);
    if (selected) button.dataset.order = selectedIndex + 1;
    else delete button.dataset.order;
    button.setAttribute("aria-pressed", String(selected));
  });
  $("selectedCount").textContent = `${state.selectedTypes.length} / 6`;
  $("startGame").disabled = state.selectedTypes.length !== 6;
  $("pickLevel").textContent = `第 ${state.level} 关`;
  $("prevLevel").disabled = state.level <= 1;
  $("nextLevel").disabled = state.level >= state.unlocked;
}

function moveLimit() {
  const base = DIFFICULTIES[state.difficulty].moves;
  const interval = 6;
  const floor = state.difficulty === "easy" ? 16 : state.difficulty === "normal" ? 13 : 10;
  return Math.max(floor, base - Math.floor((state.level - 1) / interval));
}

function updateDifficultyPicker() {
  document.querySelectorAll(".difficulty-option").forEach(button => {
    const active = button.dataset.difficulty === state.difficulty;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(active));
  });
  const mode = DIFFICULTIES[state.difficulty];
  $("difficultyDetail").textContent = `${moveLimit()} 步 · 随机局面 · ${mode.detail}`;
}

function makePuzzleBoard() {
  let fallback = [];
  for (let attempt = 0; attempt < 120; attempt++) {
    const board = Array.from({ length: ROWS * COLS }, () => state.selectedTypes[Math.floor(Math.random() * state.selectedTypes.length)]);
    const plantedPairs = state.difficulty === "easy" ? 13 : state.difficulty === "normal" ? 11 : 9;
    for (let pair = 0; pair < plantedPairs; pair++) {
      const index = Math.floor(Math.random() * board.length);
      const row = Math.floor(index / COLS), col = index % COLS;
      const neighbors = [];
      if (row > 0) neighbors.push(index - COLS);
      if (row + 1 < ROWS) neighbors.push(index + COLS);
      if (col > 0) neighbors.push(index - 1);
      if (col + 1 < COLS) neighbors.push(index + 1);
      board[neighbors[Math.floor(Math.random() * neighbors.length)]] = board[index];
    }
    const groups = listGroups(board);
    fallback = board;
    const largest = Math.max(0, ...groups.map(group => group.length));
    if (groups.length >= 7 && groups.length <= 17 && largest <= 10) return board;
  }
  return fallback;
}

function listGroups(board) {
  const seen = new Set();
  const groups = [];
  for (let start = 0; start < board.length; start++) {
    if (seen.has(start) || board[start] == null) continue;
    const type = board[start];
    const group = [];
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const index = queue.shift();
      group.push(index);
      const row = Math.floor(index / COLS), col = index % COLS;
      const neighbors = [];
      if (row > 0) neighbors.push(index - COLS);
      if (row + 1 < ROWS) neighbors.push(index + COLS);
      if (col > 0) neighbors.push(index - 1);
      if (col + 1 < COLS) neighbors.push(index + 1);
      for (const next of neighbors) if (!seen.has(next) && board[next] === type) { seen.add(next); queue.push(next); }
    }
    if (group.length >= 2) groups.push(group);
  }
  return groups;
}

function collapseBoardWithOrigins(board) {
  const next = board.map((value, index) => value == null ? null : { value, from: index });
  for (let col = 0; col < COLS; col++) {
    const values = [];
    for (let row = ROWS - 1; row >= 0; row--) {
      const value = next[row * COLS + col];
      if (value != null) values.push(value);
    }
    for (let row = ROWS - 1, i = 0; row >= 0; row--, i++) next[row * COLS + col] = i < values.length ? values[i] : null;
  }
  const columns = Array.from({ length: COLS }, (_, col) => Array.from({ length: ROWS }, (_, row) => next[row * COLS + col]));
  const occupied = columns.filter(column => column.some(entry => entry != null));
  if (!occupied.length) return { board: Array(ROWS * COLS).fill(null), origins: new Map() };
  const leftCount = columns.slice(0, COLS / 2).filter(column => column.some(value => value != null)).length;
  const rightCount = occupied.length - leftCount;
  const startCol = leftCount >= rightCount ? 0 : COLS - occupied.length;
  const packed = Array(ROWS * COLS).fill(null);
  occupied.forEach((column, offset) => column.forEach((entry, row) => { packed[row * COLS + startCol + offset] = entry; }));
  const origins = new Map();
  const collapsed = packed.map((entry, index) => {
    if (entry == null) return null;
    origins.set(index, entry.from);
    return entry.value;
  });
  return { board: collapsed, origins };
}

function collapseBoard(board) {
  return collapseBoardWithOrigins(board).board;
}

function boardAfterRemoval(board, group) {
  const next = board.slice();
  group.forEach(index => { next[index] = null; });
  return collapseBoard(next);
}

function scoreFor(count) { return count * count * 5; }

function playSample(initialBoard, moves, style) {
  let board = initialBoard.slice();
  let score = 0;
  for (let step = 0; step < moves; step++) {
    const groups = listGroups(board);
    if (!groups.length) break;
    let group;
    if (style === "largest") group = groups.reduce((best, item) => item.length > best.length ? item : best);
    else if (style === "patient") {
      const ranked = groups.slice().sort((a, b) => b.length - a.length);
      group = ranked[Math.min(ranked.length - 1, Math.floor(Math.random() * Math.min(3, ranked.length)))];
    } else group = groups[Math.floor(Math.random() * groups.length)];
    score += scoreFor(group.length);
    board = boardAfterRemoval(board, group);
  }
  return score;
}

function estimateTarget(initialBoard, moves) {
  const scores = [];
  for (let i = 0; i < 90; i++) {
    const style = i % 5 === 0 ? "largest" : i % 2 === 0 ? "patient" : "random";
    scores.push(playSample(initialBoard, moves, style));
  }
  scores.sort((a, b) => a - b);
  const percentile = DIFFICULTIES[state.difficulty].targetPercentile;
  const sampled = scores[Math.floor((scores.length - 1) * percentile)] || 100;
  return Math.max(150, Math.floor(sampled / 25) * 25);
}

function startGame() {
  if (state.selectedTypes.length !== 6) return;
  state.moves = moveLimit();
  state.board = makePuzzleBoard();
  const requiredThisLevel = estimateTarget(state.board, state.moves);
  state.expectedScore = requiredThisLevel;
  state.target = state.levelStartScore + requiredThisLevel;
  state.highlighted = [];
  state.busy = false;
  state.finished = false;
  state.hammerMode = false;
  state.undoSnapshot = null;
  state.tools = { undo: 2, hammer: 2 };
  $("pickScreen").classList.remove("active");
  $("gameScreen").classList.add("active");
  $("gameLevel").textContent = `第 ${state.level} 关 · ${DIFFICULTIES[state.difficulty].label}`;
  renderBoard();
  updateHUD();
}

function startCampaign() {
  state.score = 0;
  state.levelStartScore = 0;
  startGame();
}

function retryLevel() {
  closeModal();
  state.score = state.levelStartScore;
  startGame();
}

function showPicker() {
  state.highlighted = [];
  state.hammerMode = false;
  $("gameScreen").classList.remove("active");
  $("pickScreen").classList.add("active");
  updatePicker();
  updateDifficultyPicker();
}

function renderBoard() {
  $("board").innerHTML = state.board.map((type, index) => {
    const selected = state.highlighted.includes(index) ? " selected" : "";
    const hammer = state.hammerMode && type != null ? " hammer-ready" : "";
    if (type == null) return `<div class="cell empty" data-index="${index}"></div>`;
    const [name, file] = CHARACTERS[type];
    return `<div class="cell${selected}${hammer}" data-index="${index}" data-type="${type}"><img class="piece" src="./assets/${file}" alt="${name}" draggable="false"></div>`;
  }).join("");
}

function captureCellRects() {
  return new Map([...document.querySelectorAll("#board .cell")].map(cell => [Number(cell.dataset.index), cell.getBoundingClientRect()]));
}

function animateBoardMovement(previousRects, origins) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
  const animations = [];
  origins.forEach((oldIndex, newIndex) => {
    if (oldIndex === newIndex) return;
    const piece = document.querySelector(`#board .cell[data-index="${newIndex}"] .piece`);
    const from = previousRects.get(oldIndex);
    const to = piece?.closest(".cell")?.getBoundingClientRect();
    if (!piece || !from || !to) return;
    const x = from.left - to.left;
    const y = from.top - to.top;
    const distance = Math.abs(oldIndex % COLS - newIndex % COLS) + Math.abs(Math.floor(oldIndex / COLS) - Math.floor(newIndex / COLS));
    const animation = piece.animate([
      { transform: `translate(${x}px, ${y}px) scale(1.02)`, opacity: .72 },
      { transform: "translate(0, 0) scale(1.02)", opacity: 1 }
    ], {
      duration: Math.min(520, 285 + distance * 24),
      easing: "cubic-bezier(.22,.78,.2,1)",
      fill: "both"
    });
    animations.push(animation.finished.catch(() => {}));
  });
  return Promise.all(animations);
}

function updateHUD(message = "") {
  $("scoreText").textContent = state.score;
  $("targetText").textContent = state.target;
  $("movesText").textContent = state.moves;
  const earnedThisLevel = state.score - state.levelStartScore;
  const requiredThisLevel = state.target - state.levelStartScore;
  $("progressBar").style.width = `${Math.min(100, earnedThisLevel / requiredThisLevel * 100)}%`;
  $("remainingText").textContent = `本关 +${earnedThisLevel} · 剩余 ${state.board.filter(type => type != null).length} 个`;
  if (message) $("comboHint").textContent = message;
  else if (!state.busy) $("comboHint").textContent = state.hammerMode ? "点击要敲掉的角色" : state.score >= state.target ? "已达标，继续消除可带分进下一关" : "点击相邻同类自动消除";
  $("undoCount").textContent = state.tools.undo;
  $("hammerCount").textContent = state.tools.hammer;
  $("undoTool").disabled = state.tools.undo <= 0 || !state.undoSnapshot || state.busy || state.finished || state.hammerMode;
  $("hammerTool").disabled = state.tools.hammer <= 0 || state.busy || state.finished || state.hammerMode;
  $("hammerTool").classList.toggle("active", state.hammerMode);
}

function snapshot() { return { board: state.board.slice(), score: state.score, moves: state.moves }; }

function restoreSnapshot(saved) {
  state.board = saved.board.slice();
  state.score = saved.score;
  state.moves = saved.moves;
  state.highlighted = [];
  state.hammerMode = false;
  state.undoSnapshot = null;
  renderBoard();
  updateHUD("已回到上一步");
}

$("board").addEventListener("click", event => {
  if (state.busy || state.finished) return;
  const cell = event.target.closest(".cell");
  if (!cell || state.board[Number(cell.dataset.index)] == null) return;
  const index = Number(cell.dataset.index);
  if (state.hammerMode) return useHammer(index);
  const group = listGroups(state.board).find(items => items.includes(index)) || [];
  if (group.length < 2) {
    cell.animate([{ transform: "translateX(0)" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(0)" }], { duration: 180 });
    updateHUD("它身边没有相同角色");
    setTimeout(() => { if (!state.busy) updateHUD(); }, 700);
    return;
  }
  removeGroup(group);
});

async function removeGroup(removed) {
  state.busy = true;
  state.undoSnapshot = snapshot();
  state.moves--;
  state.highlighted = [...removed];
  renderBoard();
  updateHUD(`自动消除 ${removed.length} 个 · +${scoreFor(removed.length)}`);
  await sleep(110);
  document.querySelectorAll(".cell.selected").forEach(cell => cell.classList.add("removing"));
  state.score += scoreFor(removed.length);
  await sleep(280);
  const previousRects = captureCellRects();
  removed.forEach(index => { state.board[index] = null; });
  state.highlighted = [];
  const origins = collapseColumns();
  renderBoard();
  updateHUD();
  await animateBoardMovement(previousRects, origins);
  state.busy = false;
  updateHUD();
  evaluateBoard();
}

function collapseColumns() {
  const collapsed = collapseBoardWithOrigins(state.board);
  state.board = collapsed.board;
  return collapsed.origins;
}

function evaluateBoard() {
  if (state.moves <= 0) return finishLevel(state.score >= state.target, "moves");
  if (!listGroups(state.board).length) finishLevel(state.score >= state.target, "no-moves");
}

function finishLevel(won, reason = "") {
  state.finished = true;
  if (won) {
    state.unlocked = Math.max(state.unlocked, state.level + 1);
    localStorage.setItem("mengjiTapUnlocked", state.unlocked);
  }
  $("resultIcon").textContent = won ? "★" : "↻";
  $("resultTitle").textContent = won ? "本关完成！" : reason === "moves" ? "步数用完了" : "没有可消除的组合了";
  $("resultText").textContent = won
    ? `累计得到 ${state.score} 分，将全部带入下一关。`
    : `累计得到 ${state.score} 分，本关累计目标是 ${state.target} 分。可以反悔调整顺序，或重试一张新的随机棋盘。`;
  $("continueButton").style.display = won ? "block" : "none";
  $("resultModal").classList.add("open");
  updateHUD();
}

function closeModal() { $("resultModal").classList.remove("open"); }
function nextLevel() {
  closeModal();
  state.level += 1;
  state.levelStartScore = state.score;
  startGame();
}

function pickQuiz() {
  if (state.usedQuestions.length >= QUIZZES.length) state.usedQuestions = [];
  const pool = QUIZZES.map((_, index) => index).filter(index => !state.usedQuestions.includes(index));
  const index = pool[Math.floor(Math.random() * pool.length)];
  state.usedQuestions.push(index);
  return QUIZZES[index];
}

function shuffleQuiz(quiz) {
  const correct = quiz.o[quiz.a];
  const options = [...quiz.o];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { q: quiz.q, o: options, a: options.indexOf(correct) };
}

function openQuiz(action) {
  if (state.busy || state.finished || state.tools[action] <= 0) return;
  if (action === "undo" && !state.undoSnapshot) return;
  state.tools[action]--;
  updateHUD();
  const quiz = shuffleQuiz(pickQuiz());
  $("quizTitle").textContent = quiz.q;
  $("quizFeedback").textContent = "";
  $("quizOptions").innerHTML = quiz.o.map((option, index) => `<button class="quiz-option" data-index="${index}">${String.fromCharCode(65 + index)}. ${option}</button>`).join("");
  $("quizModal").classList.add("open");
  $("quizOptions").onclick = async event => {
    const button = event.target.closest(".quiz-option");
    if (!button || button.disabled) return;
    const chosen = Number(button.dataset.index);
    document.querySelectorAll(".quiz-option").forEach((option, index) => {
      option.disabled = true;
      if (index === quiz.a) option.classList.add("correct");
    });
    if (chosen === quiz.a) {
      $("quizFeedback").textContent = "回答正确！";
      await sleep(650);
      $("quizModal").classList.remove("open");
      if (action === "undo") restoreSnapshot(state.undoSnapshot);
      if (action === "hammer") { state.hammerMode = true; renderBoard(); updateHUD(); }
    } else {
      button.classList.add("wrong");
      $("quizFeedback").textContent = "回答错误，本次道具没有生效";
      await sleep(1000);
      $("quizModal").classList.remove("open");
      updateHUD();
    }
  };
}

async function useHammer(index) {
  if (!state.hammerMode || state.board[index] == null) return;
  state.hammerMode = false;
  state.busy = true;
  state.undoSnapshot = snapshot();
  state.highlighted = [index];
  renderBoard();
  updateHUD("敲掉一个 · +10");
  await sleep(110);
  document.querySelectorAll(".cell.selected").forEach(cell => cell.classList.add("removing"));
  state.score += 10;
  await sleep(260);
  const previousRects = captureCellRects();
  state.board[index] = null;
  state.highlighted = [];
  const origins = collapseColumns();
  renderBoard();
  await animateBoardMovement(previousRects, origins);
  state.busy = false;
  updateHUD();
  evaluateBoard();
}

setupPicker();

function registerGameTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  void Promise.resolve(context.registerTool({
    name: "read_game_status", title: "查看游戏状态",
    description: "读取当前关卡、难度、得分、目标、剩余步数、道具和剩余图案数。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute() {
      return {
        screen: $("gameScreen").classList.contains("active") ? "game" : "character_picker",
        level: state.level, difficulty: state.difficulty, score: state.score, target: state.target,
        moves: state.moves, tools: { ...state.tools }, remaining: state.board.filter(type => type != null).length,
        levelStartScore: state.levelStartScore,
        targetMethod: "sampled_from_varied_play_styles"
      };
    }
  }, { signal: lifecycle.signal })).catch(error => console.warn("Game tool unavailable", error));
}

registerGameTools();
