const digits = Array.from({ length: 10 }, (_, i) => i);
const maxRounds = 5;

const difficultyMap = {
  calm: { label: "Calm", min: 1200, max: 2000 },
  normal: { label: "Normal", min: 850, max: 1500 },
  intense: { label: "Intense", min: 520, max: 1100 },
};

const goalForRound = (round) => Math.min(10 + (round - 1) * 2, 20);
const enemyHPForRound = (round) => Math.min(10 + (round - 1) * 2, 20);
const damagePerHit = 1;

export function initReactionLights({
  stage,
  setStats,
  setStatus,
  setHistory,
  setRoundProgress,
}) {
  stage.innerHTML = `
    <div class="game-area reaction-area">
      <div class="reaction-hud">
        <div class="meter">
          <div class="meter-fill"></div>
        </div>
        <div class="hud-stat">
          <p class="current-speed">--</p>
          <span>last ms</span>
        </div>
        <div class="combo-badge">x0</div>
      </div>
      <div class="enemy-battle-area">
        <div class="enemy-container">
          <div class="enemy-character" data-enemy-type="1">
            <div class="enemy-face">
              <div class="enemy-eye left"></div>
              <div class="enemy-eye right"></div>
              <div class="enemy-mouth"></div>
            </div>
            <div class="enemy-body"></div>
          </div>
          <div class="enemy-hp-bar">
            <div class="enemy-hp-fill"></div>
            <span class="enemy-hp-text">HP: 100 / 100</span>
          </div>
          <div class="enemy-name">Round 1 Enemy</div>
        </div>
      </div>
      <div class="keypad-grid"></div>
      <div class="celebration-layer" aria-live="polite">
        <div class="celebration-content">
          <p class="celebration-title"></p>
          <p class="celebration-sub"></p>
          <div class="celebration-scores"></div>
        </div>
      </div>
    </div>
    <div class="game-controls reactive">
      <div class="control-row">
        <button class="primary" data-action="start">セッション開始</button>
        <button class="secondary" data-action="stop">一時停止</button>
        <button class="secondary ghost" data-action="reset">リセット</button>
      </div>
      <label class="difficulty-picker">
        テンポ
        <select data-action="difficulty">
          <option value="calm">Calm</option>
          <option value="normal" selected>Normal</option>
          <option value="intense">Intense</option>
        </select>
      </label>
    </div>
  `;

  const keypad = stage.querySelector(".keypad-grid");
  const startBtn = stage.querySelector('[data-action="start"]');
  const stopBtn = stage.querySelector('[data-action="stop"]');
  const resetBtn = stage.querySelector('[data-action="reset"]');
  const difficultySelect = stage.querySelector('[data-action="difficulty"]');
  const meterFill = stage.querySelector(".meter-fill");
  const currentSpeedEl = stage.querySelector(".current-speed");
  const comboBadge = stage.querySelector(".combo-badge");
  const enemyContainer = stage.querySelector(".enemy-container");
  const enemyCharacter = stage.querySelector(".enemy-character");
  const enemyHPFill = stage.querySelector(".enemy-hp-fill");
  const enemyHPText = stage.querySelector(".enemy-hp-text");
  const enemyName = stage.querySelector(".enemy-name");
  const celebrationLayer = stage.querySelector(".celebration-layer");
  const celebrationTitle = celebrationLayer.querySelector(".celebration-title");
  const celebrationSub = celebrationLayer.querySelector(".celebration-sub");
  const celebrationScores = celebrationLayer.querySelector(".celebration-scores");

  const cells = [];
  digits.forEach((digit) => {
    const cell = document.createElement("div");
    cell.className = "key-pill";
    cell.dataset.key = String(digit);
    cell.innerHTML = `<strong>${digit}</strong>`;
    keypad.appendChild(cell);
    cells.push(cell);
  });

  let timeoutId = 0;
  let activeDigit = null;
  let startTime = 0;
  let playing = false;
  let hits = 0;
  let misses = 0;
  let totalReaction = 0;
  let bestReaction = null;
  let combo = 0;
  let attempts = 0;
  let round = 1;
  let goalCount = goalForRound(1);
  let hitsThisRound = 0;
  let enemyMaxHP = enemyHPForRound(1);
  let enemyCurrentHP = enemyMaxHP;
  let celebrationTimer = 0;
  const recentReactions = [];
  const celebrationTones = ["tone-s", "tone-pop"];

  const getDifficulty = () => difficultyMap[difficultySelect.value];

  const updateEnemyHP = () => {
    const hpPercent = Math.max(0, enemyCurrentHP / enemyMaxHP);
    enemyHPFill.style.setProperty("--hp-percent", hpPercent);
    enemyHPText.textContent = `HP: ${Math.max(0, Math.ceil(enemyCurrentHP))} / ${enemyMaxHP}`;
    
    // ダメージを受けた時のアニメーション
    if (enemyCurrentHP < enemyMaxHP) {
      enemyCharacter.classList.add("damaged");
      setTimeout(() => enemyCharacter.classList.remove("damaged"), 300);
    }
    
    // HPが低い時の警告表示
    if (hpPercent <= 0.3) {
      enemyCharacter.classList.add("low-hp");
    } else {
      enemyCharacter.classList.remove("low-hp");
    }
    
    reportRoundProgress();
  };

  const updateEnemyAppearance = () => {
    const enemyType = Math.min(round, 5);
    enemyCharacter.setAttribute("data-enemy-type", enemyType);
    enemyName.textContent = `Round ${round} Enemy`;
  };

  const initRoundState = () => {
    goalCount = goalForRound(round);
    hitsThisRound = 0;
    enemyMaxHP = enemyHPForRound(round);
    enemyCurrentHP = enemyMaxHP;
    updateEnemyHP();
    updateEnemyAppearance();
    reportRoundProgress();
  };

  const reportRoundProgress = () => {
    if (typeof setRoundProgress !== "function") return;
    const items = Array.from({ length: maxRounds }, (_, index) => {
      const roundNumber = index + 1;
      let status = "upcoming";
      if (roundNumber < round) status = "completed";
      if (roundNumber === round) status = playing ? "current" : "pending";
      if (round > maxRounds && roundNumber === maxRounds) status = "completed";
      let caption = "";
      if (roundNumber < round) {
        caption = "defeated";
      } else if (roundNumber === round) {
        caption = `${Math.max(0, Math.ceil(enemyCurrentHP))}/${enemyMaxHP} HP`;
      } else {
        caption = `${enemyHPForRound(roundNumber)} HP`;
      }
      return {
        label: `R${roundNumber}`,
        status,
        caption,
      };
    });
    setRoundProgress(items);
  };

  const updateHud = (reaction = null) => {
    if (reaction === null) {
      currentSpeedEl.textContent = "--";
      meterFill.style.setProperty("--fill", 0);
      comboBadge.textContent = "x0";
      return;
    }
    currentSpeedEl.textContent = `${reaction.toFixed(0)} ms`;
    const normalized = Math.min(reaction / 600, 1.2);
    meterFill.style.setProperty("--fill", Math.max(0, 1.2 - normalized));
    comboBadge.textContent = `x${combo}`;
  };

  const showCelebration = (title, subtitle, tone = "tone-pop", showScores = false) => {
    celebrationTones.forEach((cls) => celebrationLayer.classList.remove(cls));
    celebrationLayer.classList.add("show", tone);
    celebrationTitle.textContent = title;
    celebrationSub.textContent = subtitle;
    
    if (showScores) {
      const accuracyTotal = hits + misses;
      const hitRate = accuracyTotal === 0 ? 0 : Math.round((hits / accuracyTotal) * 100);
      const avgReaction = hits === 0 ? 0 : Math.round(totalReaction / hits);
      
      celebrationScores.innerHTML = `
        <div class="score-item">
          <span>平均反応速度</span>
          <strong>${avgReaction} ms</strong>
        </div>
        <div class="score-item">
          <span>最速反応</span>
          <strong>${bestReaction !== null ? bestReaction.toFixed(0) : "-"} ms</strong>
        </div>
        <div class="score-item">
          <span>命中率</span>
          <strong>${hitRate}%</strong>
        </div>
        <div class="score-item">
          <span>最大コンボ</span>
          <strong>x${combo}</strong>
        </div>
      `;
      celebrationScores.style.display = "grid";
    } else {
      celebrationScores.style.display = "none";
    }
    
    clearTimeout(celebrationTimer);
    celebrationTimer = setTimeout(() => {
      celebrationLayer.classList.remove("show");
    }, showScores ? 4000 : 1600);
  };

  const hideCelebration = () => {
    celebrationLayer.classList.remove("show");
    celebrationTones.forEach((cls) => celebrationLayer.classList.remove(cls));
    celebrationScores.style.display = "none";
    clearTimeout(celebrationTimer);
  };

  const pushHistory = (reaction, correct = true) => {
    recentReactions.unshift({
      label: `#${attempts} ${correct ? `${reaction.toFixed(0)}ms` : "Miss"}`,
      value: correct ? `Combo x${combo}` : "Key mismatch",
      tone: correct
        ? reaction < 260
          ? "tone-positive"
          : "tone-bright"
        : "tone-warn",
    });
    if (recentReactions.length > 6) recentReactions.pop();
    setHistory(recentReactions);
  };

  const renderStats = (last = null) => {
    const accuracyTotal = hits + misses;
    const hitRate =
      accuracyTotal === 0 ? "-" : `${Math.round((hits / accuracyTotal) * 100)}%`;
    const avgReaction = hits === 0 ? "-" : `${Math.round(totalReaction / hits)} ms`;

    setStats([
      { label: "Stage", value: `Round ${round}` },
      { label: "Enemy HP", value: `${Math.max(0, Math.ceil(enemyCurrentHP))}/${enemyMaxHP}` },
      { label: "Hits", value: hits },
      { label: "Avg", value: avgReaction },
      {
        label: "Fastest",
        value: bestReaction !== null ? `${bestReaction.toFixed(0)} ms` : "-",
      },
      { label: "Hit Rate", value: hitRate },
    ]);
    if (last !== null) updateHud(last);
  };

  const clearKeys = () => {
    cells.forEach((cell) => cell.classList.remove("active", "blast", "wrong"));
    activeDigit = null;
  };

  const triggerKey = () => {
    clearKeys();
    activeDigit = digits[Math.floor(Math.random() * digits.length)];
    const cell = cells.find((item) => Number(item.dataset.key) === activeDigit);
    cell?.classList.add("active");
    startTime = performance.now();
    setStatus(`数字 ${activeDigit} をタイプ！`);
  };

  const scheduleNext = () => {
    if (!playing) return;
    const { min, max } = getDifficulty();
    const delay = min + Math.random() * (max - min);
    timeoutId = setTimeout(triggerKey, delay);
  };

  const resetSession = ({ keepRound = false } = {}) => {
    clearTimeout(timeoutId);
    clearKeys();
    playing = false;
    hits = 0;
    misses = 0;
    combo = 0;
    attempts = 0;
    totalReaction = 0;
    bestReaction = null;
    recentReactions.length = 0;
    if (!keepRound) {
      round = 1;
    }
    initRoundState();
    renderStats();
    setHistory([]);
    updateHud();
    hideCelebration();
    updateEnemyHP();
  };

  const start = () => {
    resetSession();
    playing = true;
    setStatus(`${getDifficulty().label} モードでスタート！数字キーに指を添えて。`);
    scheduleNext();
  };

  const stop = () => {
    playing = false;
    clearTimeout(timeoutId);
    clearKeys();
    setStatus("一時停止中。スタートで再開。");
  };

  const handleKeydown = (event) => {
    if (!playing) return;
    if (!/^\d$/.test(event.key)) return;
    if (activeDigit === null) {
      setStatus("ライトが点灯するまで待とう。");
      return;
    }
    attempts += 1;
    const pressed = Number(event.key);
    const targetCell = cells.find((item) => Number(item.dataset.key) === pressed);
    targetCell?.classList.add("pressed");
    setTimeout(() => targetCell?.classList.remove("pressed"), 120);

    if (pressed === activeDigit) {
      const reaction = performance.now() - startTime;
      hits += 1;
      totalReaction += reaction;
      bestReaction = bestReaction === null ? reaction : Math.min(bestReaction, reaction);
      combo += 1;
      hitsThisRound += 1;
      
      // 敵にダメージを与える
      enemyCurrentHP = Math.max(0, enemyCurrentHP - damagePerHit);
      updateEnemyHP();
      
      renderStats(reaction);
      pushHistory(reaction, true);
      setStatus(`ダメージ！${reaction.toFixed(0)} ms`);
      const cell = cells.find((item) => Number(item.dataset.key) === activeDigit);
      cell?.classList.add("blast");
      clearKeys();
      
      // 敵のHPが0になったらラウンドクリア
      if (enemyCurrentHP <= 0) {
        const roundHits = hitsThisRound;
        const roundMisses = misses - (hits - hitsThisRound);
        const roundAccuracy = roundHits + roundMisses === 0 ? 0 : Math.round((roundHits / (roundHits + roundMisses)) * 100);
        
        if (round >= maxRounds) {
          showCelebration(
            "All Clear!",
            "全ラウンド達成！お疲れさま！",
            "tone-s",
            true
          );
          setStatus("全ラウンドクリア！リセットで再挑戦可能。");
          playing = false;
          reportRoundProgress();
          return;
        }
        showCelebration(
          `Round ${round} Clear!`,
          "敵を倒した！次のラウンドへ。",
          "tone-s",
          true
        );
        round += 1;
        initRoundState();
        setStatus(`Round ${round} スタート！新しい敵が現れた！`);
      } else {
        scheduleNext();
      }
    } else {
      misses += 1;
      combo = 0;
      renderStats();
      pushHistory(0, false);
      setStatus("おっと、違うキー！もう一度準備。");
      const wrongCell = cells.find((item) => Number(item.dataset.key) === pressed);
      wrongCell?.classList.add("wrong");
      setTimeout(() => wrongCell?.classList.remove("wrong"), 320);
    }
  };

  const handleDifficultyChange = () => {
    setStatus(`${getDifficulty().label} モードを選択しました。`);
  };

  startBtn.addEventListener("click", start);
  stopBtn.addEventListener("click", stop);
  resetBtn.addEventListener("click", resetSession);
  difficultySelect.addEventListener("change", handleDifficultyChange);
  window.addEventListener("keydown", handleKeydown);

  renderStats();
  setHistory([]);
  updateHud();
  reportRoundProgress();
  setStatus("スタートを押してライトアップを待とう。");

  return () => {
    clearTimeout(timeoutId);
    clearTimeout(celebrationTimer);
    startBtn.removeEventListener("click", start);
    stopBtn.removeEventListener("click", stop);
    resetBtn.removeEventListener("click", resetSession);
    difficultySelect.removeEventListener("change", handleDifficultyChange);
    window.removeEventListener("keydown", handleKeydown);
  };
}


