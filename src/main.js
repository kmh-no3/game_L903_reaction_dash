import { initReactionLights } from "./reactionLights.js";

const stageEl = document.getElementById("game-container");
const panelEl = document.getElementById("game-panel");
const helpDialog = document.getElementById("help-dialog");
const showHelpBtn = document.getElementById("show-help");
const closeHelpBtn = document.getElementById("close-help");

const gameMeta = {
  title: "反応速度トレーニング",
  summary:
    "0〜9のキーがライトアップ。対応する数字を即キータイプして反応速度を鍛えよう！",
  controls: "キーボード（0〜9）",
  instructions: [
    "スタートで計測開始、ストップで一時停止。",
    "光った番号と同じ数字キーを素早くタイプ。",
    "テンポを切り替えてもOK。平均反応速度とコンボを更新しよう。",
  ],
};

const renderPanel = (meta) => {
  const listItems = meta.instructions.map((line) => `<li>${line}</li>`).join("");
  panelEl.innerHTML = `
    <div class="panel-head">
      <div>
        <p class="panel-kicker">Reaction Dash</p>
        <h3>${meta.title}</h3>
        <p class="lead">${meta.summary}</p>
      </div>
      <div class="tag-row">
        <span class="pill">Hand-eye</span>
        <span class="pill pill-muted">Speed Drill</span>
        <span class="pill pill-outline">Web Ready</span>
      </div>
    </div>
    <div class="panel-body">
      <div>
        <h4>操作</h4>
        <p>${meta.controls}</p>
        <h4>ルール</h4>
        <ol>${listItems}</ol>
      </div>
      <div>
        <div class="scoreboard metric-grid"></div>
        <div class="round-progress"></div>
      </div>
    </div>
    <div class="history-card">
      <div class="history-header">
        <h4>反応ログ</h4>
        <span>直近6件</span>
      </div>
      <ul class="history-list"></ul>
    </div>
    <div class="status-line"></div>
  `;
  return {
    scoreboard: panelEl.querySelector(".scoreboard"),
    statusLine: panelEl.querySelector(".status-line"),
    historyList: panelEl.querySelector(".history-list"),
    roundProgress: panelEl.querySelector(".round-progress"),
  };
};

const { scoreboard, statusLine, historyList, roundProgress } = renderPanel(gameMeta);

const setStats = (rows) => {
  scoreboard.innerHTML = rows
    .map(
      (row) => `
        <div class="score-row">
          <span>${row.label}</span>
          <strong>${row.value}</strong>
        </div>`
    )
    .join("");
};

const setStatus = (text) => {
  statusLine.textContent = text;
};

const setHistory = (items) => {
  if (!items.length) {
    historyList.innerHTML = `<li class="history-empty">まだ記録がありません。</li>`;
    return;
  }
  historyList.innerHTML = items
    .map(
      (item) => `
        <li class="history-item ${item.tone ?? ""}">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </li>`
    )
    .join("");
};

const setRoundProgress = (items) => {
  if (!items.length) {
    roundProgress.innerHTML = "";
    return;
  }
  roundProgress.innerHTML = items
    .map(
      (item) => `
        <div class="round-pill ${item.status}">
          <span>${item.label}</span>
          <strong>${item.caption}</strong>
        </div>`
    )
    .join("");
};

initReactionLights({
  stage: stageEl,
  setStats,
  setStatus,
  setHistory,
  setRoundProgress,
});

showHelpBtn?.addEventListener("click", () => {
  if (typeof helpDialog?.showModal === "function") {
    helpDialog.showModal();
  }
});

closeHelpBtn?.addEventListener("click", () => helpDialog?.close());

