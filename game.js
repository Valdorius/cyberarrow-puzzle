// Основной игровой движок CyberArrow Canvas 60fps
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // DOM элементы
  const elLevelNum = document.getElementById('level-number');
  const elCorePercent = document.getElementById('core-percent');
  const elCoreFill = document.getElementById('core-progress-fill');
  const elCoreMilestone = document.getElementById('core-milestone-text');
  const elRemaining = document.getElementById('remaining-arrows');
  const elMoves = document.getElementById('moves-count');
  const elHintBadge = document.getElementById('hint-badge');
  const overlayClear = document.getElementById('level-clear-overlay');
  const btnNextLevel = document.getElementById('btn-next-level');
  const btnRestart = document.getElementById('btn-restart');
  const btnUndo = document.getElementById('btn-undo');
  const btnHint = document.getElementById('btn-hint');
  const btnSound = document.getElementById('btn-sound');
  const btnLang = document.getElementById('btn-lang');
  const btnTheme = document.getElementById('btn-theme');

  // Текстовые элементы локализации
  const txtLevelLabel = document.getElementById('txt-level-label');
  const txtCoreTitle = document.getElementById('txt-core-title');
  const txtClearTitle = document.getElementById('txt-clear-title');
  const txtClearStats = document.getElementById('txt-clear-stats');
  const txtClearReward = document.getElementById('txt-clear-reward');
  const txtRemainingLabel = document.getElementById('txt-remaining-label');
  const txtMovesLabel = document.getElementById('txt-moves-label');
  const txtBtnRestart = document.getElementById('txt-btn-restart');
  const txtBtnUndo = document.getElementById('txt-btn-undo');
  const txtBtnHint = document.getElementById('txt-btn-hint');

  // Словарь локализации (Русский / Английский)
  const I18N = {
    ru: {
      levelLabel: "УРОВЕНЬ",
      coreTitle: "🔋 Восстановление Ядра",
      clearTitle: "СЕКТОР ОЧИЩЕН!",
      clearSubtitle: "Все стрелки выведены без ошибок",
      clearReward: "+25 Энергии Ядра",
      nextBtn: "СЛЕДУЮЩИЙ УРОВЕНЬ ➔",
      remainingLabel: "ОСТАЛОСЬ:",
      movesLabel: "ХОДОВ:",
      resetBtn: "Сброс",
      undoBtn: "Назад",
      hintBtn: "Подсказка",
      levelPrompt: "Перейти к уровню (1-100):",
      milestones: [
        { threshold: 0, text: "Модуль 1: Питание шины данных" },
        { threshold: 100, text: "Модуль 2: Квантовый буфер маршрутизации" },
        { threshold: 250, text: "Модуль 3: Оптический коммутатор импульсов" },
        { threshold: 450, text: "Модуль 4: Синхронизатор потоков ядра" },
        { threshold: 750, text: "Модуль 5: Автономный нейроматричный шлюз" }
      ]
    },
    en: {
      levelLabel: "SECTOR",
      coreTitle: "🔋 Core Restoration",
      clearTitle: "SECTOR CLEARED!",
      clearSubtitle: "All data streams released successfully",
      clearReward: "+25 Core Energy",
      nextBtn: "NEXT SECTOR ➔",
      remainingLabel: "REMAINING:",
      movesLabel: "MOVES:",
      resetBtn: "Reset",
      undoBtn: "Undo",
      hintBtn: "Hint",
      levelPrompt: "Jump to sector (1-100):",
      milestones: [
        { threshold: 0, text: "Module 1: Bus Power Grid" },
        { threshold: 100, text: "Module 2: Quantum Route Buffer" },
        { threshold: 250, text: "Module 3: Optical Pulse Switch" },
        { threshold: 450, text: "Module 4: Core Stream Sync" },
        { threshold: 750, text: "Module 5: Autonomous Neural Gateway" }
      ]
    }
  };

  let currentLang = 'ru';
  function detectLanguage() {
    const saved = localStorage.getItem('cyberarrow_lang');
    if (saved === 'ru' || saved === 'en') return saved;
    const sysLang = (window.bridge && window.bridge.platform && window.bridge.platform.language) || navigator.language || 'en';
    return (sysLang.toLowerCase().startsWith('ru') || sysLang.toLowerCase().startsWith('be') || sysLang.toLowerCase().startsWith('uk')) ? 'ru' : 'en';
  }
  currentLang = detectLanguage();

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('cyberarrow_lang', lang);
    const t = I18N[lang] || I18N.en;

    if (btnLang) btnLang.textContent = lang.toUpperCase();
    if (txtLevelLabel) txtLevelLabel.textContent = t.levelLabel;
    if (txtCoreTitle) txtCoreTitle.textContent = t.coreTitle;
    if (txtClearTitle) txtClearTitle.textContent = t.clearTitle;
    if (txtClearStats) txtClearStats.textContent = t.clearSubtitle;
    if (txtClearReward) txtClearReward.textContent = t.clearReward;
    if (btnNextLevel) btnNextLevel.textContent = t.nextBtn;
    if (txtRemainingLabel) txtRemainingLabel.textContent = t.remainingLabel;
    if (txtMovesLabel) txtMovesLabel.textContent = t.movesLabel;
    if (txtBtnRestart) txtBtnRestart.textContent = t.resetBtn;
    if (txtBtnUndo) txtBtnUndo.textContent = t.undoBtn;
    if (txtBtnHint) txtBtnHint.textContent = t.hintBtn;
  }

  // Playgama Bridge SDK Wrapper
  const PG = {
    initialized: false,
    async init() {
      if (typeof window.bridge === 'undefined') {
        console.log('[Playgama] Bridge SDK not detected (standalone/offline mode).');
        return;
      }
      try {
        await window.bridge.initialize();
        this.initialized = true;
        console.log('[Playgama] Bridge initialized successfully!');

        // Сообщаем платформе, что игра готова
        if (window.bridge.platform && window.bridge.platform.sendMessage) {
          window.bridge.platform.sendMessage('game_ready');
        }

        // Автоматическая пауза и выключение звука при открытии рекламы/сворачивании
        if (window.bridge.platform && window.bridge.platform.on) {
          window.bridge.platform.on('pause_state_changed', (isPaused) => {
            if (window.soundEngine) {
              window.soundEngine.enabled = !isPaused;
            }
          });
        }

        // Слушатель Rewarded рекламы
        if (window.bridge.advertisement && window.bridge.advertisement.on) {
          window.bridge.advertisement.on('rewarded_state_changed', (state) => {
            console.log('[Playgama] Rewarded state changed:', state);
            if (state === 'rewarded' && window._onPlaygamaRewardCallback) {
              window._onPlaygamaRewardCallback();
              window._onPlaygamaRewardCallback = null;
            }
          });
        }

        // Загружаем облачный прогресс, если есть
        const cloudData = await this.loadProgress();
        if (cloudData && cloudData.lvl) {
          currentLevelIdx = Math.max(currentLevelIdx, cloudData.lvl);
          coreEnergy = Math.max(coreEnergy, cloudData.energy || 0);
          hintsAvailable = Math.max(hintsAvailable, cloudData.hints || 0);
          updateProgressionUI();
          updateStats();
        }
      } catch (err) {
        console.warn('[Playgama] Bridge init error:', err);
      }
    },

    showInterstitial(placement = 'level_completed') {
      if (this.initialized && window.bridge && window.bridge.advertisement) {
        try {
          window.bridge.advertisement.showInterstitial(placement);
        } catch (e) {
          console.warn('[Playgama] Interstitial error:', e);
        }
      }
    },

    showRewarded(placement = 'get_hint', onRewarded) {
      if (this.initialized && window.bridge && window.bridge.advertisement) {
        window._onPlaygamaRewardCallback = onRewarded;
        try {
          window.bridge.advertisement.showRewarded(placement);
        } catch (e) {
          console.warn('[Playgama] Rewarded failed, running fallback:', e);
          if (onRewarded) onRewarded();
        }
      } else {
        // Fallback если SDK недоступен
        if (onRewarded) onRewarded();
      }
    },

    async loadProgress() {
      if (this.initialized && window.bridge && window.bridge.storage) {
        try {
          const res = await window.bridge.storage.get(['cyberarrow_lvl', 'cyberarrow_energy', 'cyberarrow_hints']);
          if (res) {
            return {
              lvl: parseInt(res.cyberarrow_lvl, 10) || null,
              energy: parseInt(res.cyberarrow_energy, 10) || null,
              hints: parseInt(res.cyberarrow_hints, 10) || null
            };
          }
        } catch (e) {
          console.warn('[Playgama] Storage get error:', e);
        }
      }
      return null;
    },

    saveProgress(lvl, energy, hints) {
      localStorage.setItem('cyberarrow_lvl', lvl);
      localStorage.setItem('cyberarrow_energy', energy);
      localStorage.setItem('cyberarrow_hints', hints);

      if (this.initialized && window.bridge && window.bridge.storage) {
        try {
          window.bridge.storage.set({
            'cyberarrow_lvl': String(lvl),
            'cyberarrow_energy': String(energy),
            'cyberarrow_hints': String(hints)
          });
        } catch (e) {
          console.warn('[Playgama] Storage set error:', e);
        }
      }
    }
  };

  // Состояние игры
  let currentLevelIdx = parseInt(localStorage.getItem('cyberarrow_lvl') || '1', 10);
  let coreEnergy = parseInt(localStorage.getItem('cyberarrow_energy') || '0', 10);
  let hintsAvailable = parseInt(localStorage.getItem('cyberarrow_hints') || '5', 10);
  let movesCount = 0;
  let comboStreak = 0;

  let currentLevelData = null;
  let arrows = []; // Список стрелок
  let particles = [];
  let historyStack = []; // Стек ходов для Undo
  let hintedArrowId = null;
  let isLevelCompleted = false;

  // Темы оформления
  const themes = [
    { name: 'cyan', arrowColor: '#00f2fe', arrowGlow: 'rgba(0, 242, 254, 0.5)', bg: '#0d1117' },
    { name: 'amber', arrowColor: '#fbbf24', arrowGlow: 'rgba(251, 191, 36, 0.5)', bg: '#140f07' },
    { name: 'neon', arrowColor: '#39ff14', arrowGlow: 'rgba(57, 255, 20, 0.5)', bg: '#071408' }
  ];
  let themeIdx = 0;

  const MILESTONES = [
    { threshold: 0, text: "Модуль 1: Питание шины данных" },
    { threshold: 100, text: "Модуль 2: Квантовый буфер маршрутизации" },
    { threshold: 250, text: "Модуль 3: Оптический коммутатор импульсов" },
    { threshold: 450, text: "Модуль 4: Синхронизатор потоков ядра" },
    { threshold: 750, text: "Модуль 5: Автономный нейроматричный шлюз" }
  ];

  // Адаптивное масштабирование под экран телефона (High DPI)
  let dpr = window.devicePixelRatio || 1;
  let boardWidth = 0;
  let boardHeight = 0;
  let cellSize = 0;
  let offsetX = 0;
  let offsetY = 0;

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    boardWidth = rect.width;
    boardHeight = rect.height;

    if (currentLevelData) {
      calculateLayout();
    }
  }

  window.addEventListener('resize', resizeCanvas);

  function calculateLayout() {
    const pad = 24;
    const availW = boardWidth - pad * 2;
    const availH = boardHeight - pad * 2;

    const cellW = availW / currentLevelData.cols;
    const cellH = availH / currentLevelData.rows;

    cellSize = Math.min(cellW, cellH, 68); // Ограничение макс. размера клетки

    const totalGridW = cellSize * currentLevelData.cols;
    const totalGridH = cellSize * currentLevelData.rows;

    offsetX = (boardWidth - totalGridW) / 2;
    offsetY = (boardHeight - totalGridH) / 2;
  }

  // Загрузка уровня
  function loadLevel(idx) {
    currentLevelIdx = idx;
    PG.saveProgress(currentLevelIdx, coreEnergy, hintsAvailable);
    elLevelNum.textContent = currentLevelIdx;
    overlayClear.classList.add('hidden');
    isLevelCompleted = false;
    movesCount = 0;
    comboStreak = 0;
    elMoves.textContent = movesCount;
    historyStack = [];
    hintedArrowId = null;

    currentLevelData = window.levelManager.generateLevel(currentLevelIdx);
    calculateLayout();

    // Создаем объекты стрелок
    arrows = [];
    let idCounter = 1;

    for (let r = 0; r < currentLevelData.rows; r++) {
      for (let c = 0; c < currentLevelData.cols; c++) {
        const cell = currentLevelData.grid[r][c];
        if (cell) {
          arrows.push({
            id: idCounter++,
            r,
            c,
            dirKey: cell.dir,
            dir: DIRS[cell.dir],
            special: cell.special || null,
            state: 'IDLE', // 'IDLE', 'FLYING', 'BUMPING', 'GONE'
            x: 0,
            y: 0,
            bumpProgress: 0,
            bumpVector: { x: 0, y: 0 },
            flyX: 0,
            flyY: 0,
            speed: 0,
            opacity: 1,
            rotation: DIRS[cell.dir].angle,
            targetRotation: DIRS[cell.dir].angle
          });
        }
      }
    }

    updateStats();
    updateProgressionUI();
  }

  function updateStats() {
    const remaining = arrows.filter(a => a.state === 'IDLE' || a.state === 'BUMPING').length;
    elRemaining.textContent = remaining;
    elHintBadge.textContent = hintsAvailable;

    // Определение ситуации дедлока
    if (remaining > 0 && !isLevelCompleted) {
      const anyFree = arrows.some(a => a.state === 'IDLE' && canArrowEscape(a).clear);
      if (!anyFree) {
        btnRestart.style.boxShadow = '0 0 14px rgba(245, 158, 11, 0.7)';
        btnUndo.style.boxShadow = '0 0 14px rgba(245, 158, 11, 0.7)';
      } else {
        btnRestart.style.boxShadow = '';
        btnUndo.style.boxShadow = '';
      }
    }
  }

  function updateProgressionUI() {
    const maxEnergy = 1000;
    const pct = Math.min(Math.round((coreEnergy / maxEnergy) * 100), 100);
    elCorePercent.textContent = `${pct}%`;
    elCoreFill.style.width = `${Math.max(pct, 4)}%`;

    const msList = (I18N[currentLang] || I18N.en).milestones;
    let activeMilestone = msList[0].text;
    for (const m of msList) {
      if (coreEnergy >= m.threshold) {
        activeMilestone = m.text;
      }
    }
    elCoreMilestone.textContent = activeMilestone;
  }

  // Проверка пути стрелки
  function canArrowEscape(arrow) {
    let currR = arrow.r + arrow.dir.dr;
    let currC = arrow.c + arrow.dir.dc;

    while (
      currR >= 0 && currR < currentLevelData.rows &&
      currC >= 0 && currC < currentLevelData.cols
    ) {
      const blocking = arrows.find(a => a.r === currR && a.c === currC && a.state !== 'GONE');
      if (blocking) {
        return { clear: false, blocker: blocking };
      }
      currR += arrow.dir.dr;
      currC += arrow.dir.dc;
    }

    return { clear: true };
  }

  // Обработка тапа по стрелке
  function tapArrow(arrow) {
    if (arrow.state !== 'IDLE' || isLevelCompleted) return;

    window.soundEngine.init();
    movesCount++;
    elMoves.textContent = movesCount;
    hintedArrowId = null;

    const check = canArrowEscape(arrow);

    if (check.clear) {
      // Стрелка свободна - запускаем полет!
      arrow.state = 'FLYING';
      arrow.flyX = 0;
      arrow.flyY = 0;
      arrow.speed = 18;

      comboStreak++;
      window.soundEngine.playLaunch(comboStreak);

      // Сохраняем ход для Undo
      historyStack.push({
        type: 'LAUNCH',
        arrowId: arrow.id,
        r: arrow.r,
        c: arrow.c,
        dirKey: arrow.dirKey,
        special: arrow.special
      });

      // Если это ротатор - поворачиваем соседние стрелки
      if (arrow.special === 'rotator') {
        rotateNeighbors(arrow.r, arrow.c);
      }

    } else {
      // Путь заблокирован - столкновение!
      comboStreak = 0;
      arrow.state = 'BUMPING';
      arrow.bumpProgress = 0;
      arrow.bumpVector = {
        x: arrow.dir.dc * (cellSize * 0.28),
        y: arrow.dir.dr * (cellSize * 0.28)
      };

      // Блокирующая стрелка слегка вздрагивает
      if (check.blocker && check.blocker.state === 'IDLE') {
        check.blocker.bumpVector = {
          x: arrow.dir.dc * (cellSize * 0.1),
          y: arrow.dir.dr * (cellSize * 0.1)
        };
        check.blocker.bumpProgress = 0;
        check.blocker.state = 'BUMPING';
      }

      window.soundEngine.playBump();
      spawnSparkParticles(
        offsetX + (check.blocker.c + 0.5) * cellSize,
        offsetY + (check.blocker.r + 0.5) * cellSize,
        '#ef4444'
      );
    }
  }

  // Поворот соседних стрелок на 90 градусов по часовой стрелке
  function rotateNeighbors(r, c) {
    const neighborDeltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const turnOrder = { UP: 'RIGHT', RIGHT: 'DOWN', DOWN: 'LEFT', LEFT: 'UP' };

    neighborDeltas.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      const neighbor = arrows.find(a => a.r === nr && a.c === nc && a.state === 'IDLE');
      if (neighbor) {
        neighbor.dirKey = turnOrder[neighbor.dirKey];
        neighbor.dir = DIRS[neighbor.dirKey];
        neighbor.targetRotation += Math.PI / 2;
        spawnSparkParticles(
          offsetX + (nc + 0.5) * cellSize,
          offsetY + (nr + 0.5) * cellSize,
          '#b537f2'
        );
      }
    });
  }

  // Спавн искр / эффектов
  function spawnSparkParticles(x, y, color = '#00f2fe') {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.04,
        size: 2 + Math.random() * 3,
        color
      });
    }
  }

  // Undo (Отмена хода)
  function undoLastMove() {
    if (historyStack.length === 0 || isLevelCompleted) return;

    const last = historyStack.pop();
    const arrow = arrows.find(a => a.id === last.arrowId);
    if (arrow) {
      arrow.state = 'IDLE';
      arrow.flyX = 0;
      arrow.flyY = 0;
      arrow.opacity = 1;
      arrow.r = last.r;
      arrow.c = last.c;
      arrow.dirKey = last.dirKey;
      arrow.dir = DIRS[last.dirKey];
      arrow.rotation = arrow.dir.angle;
      arrow.targetRotation = arrow.dir.angle;

      spawnSparkParticles(
        offsetX + (arrow.c + 0.5) * cellSize,
        offsetY + (arrow.r + 0.5) * cellSize,
        '#4facfe'
      );
      window.soundEngine.playHint();
      updateStats();
    }
  }

  // Подсказка (Highlighting a safe arrow + Playgama Rewarded Video integration)
  function giveHint() {
    if (isLevelCompleted) return;

    if (hintsAvailable <= 0) {
      // Подсказок нет: предлагаем посмотреть Rewarded-видео за +3 подсказки
      PG.showRewarded('get_hint', () => {
        hintsAvailable += 3;
        PG.saveProgress(currentLevelIdx, coreEnergy, hintsAvailable);
        updateStats();
        window.soundEngine.playHint();
        triggerHint();
      });
      return;
    }

    triggerHint();
  }

  function triggerHint() {
    const availableArrows = arrows.filter(a => a.state === 'IDLE');
    const validArrow = availableArrows.find(a => canArrowEscape(a).clear);

    if (validArrow) {
      hintedArrowId = validArrow.id;
      hintsAvailable--;
      PG.saveProgress(currentLevelIdx, coreEnergy, hintsAvailable);
      updateStats();
      window.soundEngine.playHint();
    }
  }

  // Проверка завершения уровня
  function checkVictory() {
    const activeArrows = arrows.filter(a => a.state !== 'GONE');
    if (activeArrows.length === 0 && !isLevelCompleted) {
      isLevelCompleted = true;
      window.soundEngine.playWin();

      // Начисление энергии ядра
      coreEnergy += 25;
      PG.saveProgress(currentLevelIdx, coreEnergy, hintsAvailable);
      updateProgressionUI();

      // Показ Interstitial рекламы Playgama в паузе (каждые 2 уровня начиная с 3)
      if (currentLevelIdx >= 3 && currentLevelIdx % 2 === 0) {
        PG.showInterstitial('level_completed');
      }

      setTimeout(() => {
        overlayClear.classList.remove('hidden');
      }, 350);
    }
  }

  // Обработка ввода (Pointer/Touch)
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const touchY = e.clientY - rect.top;

    // Определяем клетку
    const col = Math.floor((touchX - offsetX) / cellSize);
    const row = Math.floor((touchY - offsetY) / cellSize);

    if (
      row >= 0 && row < currentLevelData.rows &&
      col >= 0 && col < currentLevelData.cols
    ) {
      const clicked = arrows.find(a => a.r === row && a.c === col && a.state === 'IDLE');
      if (clicked) {
        tapArrow(clicked);
      }
    }
  });

  // Главный цикл отрисовки и анимации (Render Loop)
  let lastTime = performance.now();

  function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    // Очистка холста
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, boardWidth, boardHeight);

    // Отрисовка сетки
    drawGrid();

    // Отрисовка стрелок
    drawArrows(time);

    // Отрисовка частиц
    updateAndDrawParticles();

    ctx.restore();

    requestAnimationFrame(gameLoop);
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(79, 172, 254, 0.08)';
    ctx.lineWidth = 1;

    for (let r = 0; r <= currentLevelData.rows; r++) {
      const y = offsetY + r * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + currentLevelData.cols * cellSize, y);
      ctx.stroke();
    }

    for (let c = 0; c <= currentLevelData.cols; c++) {
      const x = offsetX + c * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + currentLevelData.rows * cellSize);
      ctx.stroke();
    }
  }

  function drawArrows(time) {
    const theme = themes[themeIdx];

    arrows.forEach(arrow => {
      if (arrow.state === 'GONE') return;

      // Плавная ротация
      if (Math.abs(arrow.targetRotation - arrow.rotation) > 0.01) {
        arrow.rotation += (arrow.targetRotation - arrow.rotation) * 0.18;
      } else {
        arrow.rotation = arrow.targetRotation;
      }

      let centerX = offsetX + (arrow.c + 0.5) * cellSize;
      let centerY = offsetY + (arrow.r + 0.5) * cellSize;

      // Анимация полета
      if (arrow.state === 'FLYING') {
        arrow.flyX += arrow.dir.dc * arrow.speed;
        arrow.flyY += arrow.dir.dr * arrow.speed;
        arrow.speed *= 1.05; // Ускорение вылета

        centerX += arrow.flyX;
        centerY += arrow.flyY;

        // Частицы за летящей стрелкой
        if (Math.random() < 0.6) {
          particles.push({
            x: centerX,
            y: centerY,
            vx: -arrow.dir.dc * (1 + Math.random() * 2),
            vy: -arrow.dir.dr * (1 + Math.random() * 2),
            life: 0.6,
            decay: 0.05,
            size: 2,
            color: arrow.special === 'rotator' ? '#b537f2' : theme.arrowColor
          });
        }

        // Проверка выхода за экран
        if (
          centerX < -100 || centerX > boardWidth + 100 ||
          centerY < -100 || centerY > boardHeight + 100
        ) {
          arrow.state = 'GONE';
          updateStats();
          checkVictory();
        }
      }

      // Анимация упругого отскока (Bump)
      if (arrow.state === 'BUMPING') {
        arrow.bumpProgress += 0.12;
        const bumpSin = Math.sin(arrow.bumpProgress * Math.PI);

        centerX += arrow.bumpVector.x * bumpSin;
        centerY += arrow.bumpVector.y * bumpSin;

        if (arrow.bumpProgress >= 1.0) {
          arrow.state = 'IDLE';
          arrow.bumpProgress = 0;
        }
      }

      // Отрисовка стрелки
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(arrow.rotation);

      const size = cellSize * 0.72;
      const isHinted = arrow.id === hintedArrowId;

      // Свечение подсказки
      if (isHinted) {
        const pulse = 1 + Math.sin(time * 0.008) * 0.15;
        ctx.scale(pulse, pulse);
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 20;
      } else {
        ctx.shadowColor = arrow.special === 'rotator' ? '#b537f2' : theme.arrowGlow;
        ctx.shadowBlur = 10;
      }

      // Тело блока со стрелкой (закругленный гексагональный чип)
      ctx.fillStyle = arrow.special === 'rotator'
        ? 'rgba(181, 55, 242, 0.22)'
        : (isHinted ? 'rgba(251, 191, 36, 0.25)' : 'rgba(30, 41, 59, 0.9)');

      ctx.strokeStyle = arrow.special === 'rotator'
        ? '#b537f2'
        : (isHinted ? '#fbbf24' : theme.arrowColor);

      ctx.lineWidth = isHinted ? 2.5 : 1.8;

      // Рисуем скругленный прямоугольник блока
      roundRect(ctx, -size / 2, -size / 2, size, size, 12);
      ctx.fill();
      ctx.stroke();

      // Внутренний символ стрелки
      ctx.fillStyle = isHinted ? '#fbbf24' : (arrow.special === 'rotator' ? '#e9d5ff' : '#ffffff');
      ctx.beginPath();
      // Стрелка направлена вправо в локальной системе координат
      const headSize = size * 0.32;
      ctx.moveTo(headSize, 0);
      ctx.lineTo(-headSize * 0.7, -headSize * 0.75);
      ctx.lineTo(-headSize * 0.25, 0);
      ctx.lineTo(-headSize * 0.7, headSize * 0.75);
      ctx.closePath();
      ctx.fill();

      // Значок ротатора, если применимо
      if (arrow.special === 'rotator') {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('⚡', -headSize * 0.5, headSize * 0.5);
      }

      ctx.restore();
    });
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  // Кнопки интерфейса
  btnNextLevel.addEventListener('click', () => {
    loadLevel(currentLevelIdx + 1);
  });

  btnRestart.addEventListener('click', () => {
    loadLevel(currentLevelIdx);
  });

  btnUndo.addEventListener('click', () => {
    undoLastMove();
  });

  btnHint.addEventListener('click', () => {
    giveHint();
  });

  btnSound.addEventListener('click', () => {
    const isOn = window.soundEngine.toggleSound();
    btnSound.textContent = isOn ? '🔊' : '🔇';
  });

  btnTheme.addEventListener('click', () => {
    themeIdx = (themeIdx + 1) % themes.length;
    window.soundEngine.playHint();
  });

  // Переключение языка (RU / EN)
  if (btnLang) {
    btnLang.addEventListener('click', () => {
      const newLang = currentLang === 'ru' ? 'en' : 'ru';
      applyLanguage(newLang);
      updateProgressionUI();
      window.soundEngine.playHint();
    });
  }

  // Быстрый выбор уровня по клику на номер
  elLevelNum.parentElement.style.cursor = 'pointer';
  elLevelNum.parentElement.title = 'Нажмите для перехода к уровню';
  elLevelNum.parentElement.addEventListener('click', () => {
    const promptText = (I18N[currentLang] || I18N.en).levelPrompt;
    const target = prompt(promptText, currentLevelIdx);
    if (target) {
      const num = parseInt(target, 10);
      if (!isNaN(num) && num >= 1) {
        loadLevel(num);
      }
    }
  });

  // Применяем язык, ресайз и запуск первого уровня
  applyLanguage(currentLang);
  resizeCanvas();
  loadLevel(currentLevelIdx);
  PG.init();
  requestAnimationFrame(gameLoop);
});
