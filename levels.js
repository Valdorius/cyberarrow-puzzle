// Модуль генерации уровней с математической гарантией проходимости и валидатором

const DIRS = {
  UP: { name: 'UP', dr: -1, dc: 0, angle: -Math.PI / 2, icon: '▲' },
  DOWN: { name: 'DOWN', dr: 1, dc: 0, angle: Math.PI / 2, icon: '▼' },
  LEFT: { name: 'LEFT', dr: 0, dc: -1, angle: Math.PI, icon: '◀' },
  RIGHT: { name: 'RIGHT', dr: 0, dc: 1, angle: 0, icon: '▶' }
};

const DIR_KEYS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

class LevelManager {
  constructor() {
    this.handcrafted = [
      // Уровень 1: Интуитивное введение (3x3)
      {
        rows: 3,
        cols: 3,
        name: "Инициализация потока",
        grid: [
          [null, { dir: 'UP' }, null],
          [{ dir: 'LEFT' }, null, { dir: 'RIGHT' }],
          [null, { dir: 'DOWN' }, null]
        ]
      },
      // Уровень 2: Первые блокировки (3x3)
      {
        rows: 3,
        cols: 3,
        name: "Порядок очереди",
        grid: [
          [{ dir: 'RIGHT' }, { dir: 'DOWN' }, null],
          [{ dir: 'UP' }, { dir: 'RIGHT' }, { dir: 'RIGHT' }],
          [null, { dir: 'DOWN' }, { dir: 'DOWN' }]
        ]
      },
      // Уровень 3: Каскадные разблокировки (4x4) - Проверен и 100% проходим
      {
        rows: 4,
        cols: 4,
        name: "Лабиринт шин",
        grid: [
          [{ dir: 'UP' },   { dir: 'RIGHT' }, { dir: 'DOWN' },  { dir: 'RIGHT' }],
          [{ dir: 'LEFT' }, { dir: 'UP' },    { dir: 'DOWN' },  { dir: 'RIGHT' }],
          [{ dir: 'LEFT' }, { dir: 'LEFT' },  { dir: 'RIGHT' }, { dir: 'DOWN' }],
          [{ dir: 'DOWN' }, { dir: 'LEFT' },  { dir: 'DOWN' },  { dir: 'DOWN' }]
        ]
      },
      // Уровень 4: Введение поворотного элемента (Rotator) - Проверен и 100% проходим
      {
        rows: 4,
        cols: 4,
        name: "Квантовый ротатор",
        grid: [
          [{ dir: 'LEFT' }, { dir: 'UP', special: 'rotator' }, { dir: 'UP' },   { dir: 'RIGHT' }],
          [{ dir: 'LEFT' }, { dir: 'RIGHT' },                  { dir: 'DOWN' }, { dir: 'RIGHT' }],
          [{ dir: 'LEFT' }, { dir: 'UP' },                     { dir: 'DOWN' }, { dir: 'RIGHT' }],
          [{ dir: 'LEFT' }, { dir: 'DOWN' },                   { dir: 'DOWN' }, { dir: 'RIGHT' }]
        ]
      }
    ];
  }

  // Математический валидатор: проверяет, что поле можно полностью очистить
  isSolvable(lvl) {
    const grid = lvl.grid.map(row => row.map(cell => cell ? { ...cell } : null));
    let total = 0;
    let removed = 0;

    for (let r = 0; r < lvl.rows; r++) {
      for (let c = 0; c < lvl.cols; c++) {
        if (grid[r][c]) total++;
      }
    }

    let progress = true;
    while (progress) {
      progress = false;
      for (let r = 0; r < lvl.rows; r++) {
        for (let c = 0; c < lvl.cols; c++) {
          const cell = grid[r][c];
          if (!cell) continue;

          const dir = DIRS[cell.dir];
          let clear = true;
          let cr = r + dir.dr;
          let cc = c + dir.dc;

          while (cr >= 0 && cr < lvl.rows && cc >= 0 && cc < lvl.cols) {
            if (grid[cr][cc] !== null) {
              clear = false;
              break;
            }
            cr += dir.dr;
            cc += dir.dc;
          }

          if (clear) {
            grid[r][c] = null;
            removed++;
            progress = true;
          }
        }
      }
    }

    return total === removed;
  }

  // Генератор уровня с обратной сборкой и автоматической верификацией
  generateLevel(levelIndex) {
    // 1. Проверяем ручные уровни
    if (levelIndex <= this.handcrafted.length) {
      const candidate = this.cloneLevel(this.handcrafted[levelIndex - 1]);
      if (this.isSolvable(candidate)) {
        return candidate;
      }
    }

    // 2. Процедурная генерация с гарантированной валидацией
    let attempts = 0;
    while (attempts < 20) {
      attempts++;
      const generated = this._createProceduralLevel(levelIndex);
      if (this.isSolvable(generated)) {
        return generated;
      }
    }

    // Fallback: безопасный гарантированный уровень
    return this._createSafeFallbackLevel(levelIndex);
  }

  _createProceduralLevel(levelIndex) {
    const sizeProgress = Math.min(Math.max(0, levelIndex - 4), 30);
    const rows = 4 + Math.floor(sizeProgress / 8); // 4 -> 5 -> 6
    const cols = 4 + Math.floor(sizeProgress / 10);
    const targetArrows = Math.floor(rows * cols * 0.72);

    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    const emptyCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        emptyCells.push({ r, c });
      }
    }

    let placedCount = 0;
    let placeAttempts = 0;

    while (placedCount < targetArrows && placeAttempts < 500 && emptyCells.length > 0) {
      placeAttempts++;
      const randIdx = Math.floor(Math.random() * emptyCells.length);
      const { r, c } = emptyCells[randIdx];

      const validDirections = [];

      for (const dKey of DIR_KEYS) {
        const dir = DIRS[dKey];
        let pathClear = true;
        let currR = r + dir.dr;
        let currC = c + dir.dc;

        while (currR >= 0 && currR < rows && currC >= 0 && currC < cols) {
          if (grid[currR][currC] !== null) {
            pathClear = false;
            break;
          }
          currR += dir.dr;
          currC += dir.dc;
        }

        if (pathClear) {
          validDirections.push(dKey);
        }
      }

      if (validDirections.length > 0) {
        const chosenDir = validDirections[Math.floor(Math.random() * validDirections.length)];
        const isRotator = levelIndex >= 4 && Math.random() < 0.1;

        grid[r][c] = {
          dir: chosenDir,
          special: isRotator ? 'rotator' : null
        };

        emptyCells.splice(randIdx, 1);
        placedCount++;
      }
    }

    return {
      rows,
      cols,
      name: `Сектор #${levelIndex}`,
      grid
    };
  }

  _createSafeFallbackLevel(levelIndex) {
    const rows = 4;
    const cols = 4;
    return {
      rows,
      cols,
      name: `Сектор #${levelIndex}`,
      grid: [
        [{ dir: 'UP' },   { dir: 'RIGHT' }, { dir: 'DOWN' },  { dir: 'RIGHT' }],
        [{ dir: 'LEFT' }, { dir: 'UP' },    { dir: 'DOWN' },  { dir: 'RIGHT' }],
        [{ dir: 'LEFT' }, { dir: 'LEFT' },  { dir: 'RIGHT' }, { dir: 'DOWN' }],
        [{ dir: 'DOWN' }, { dir: 'LEFT' },  { dir: 'DOWN' },  { dir: 'DOWN' }]
      ]
    };
  }

  cloneLevel(lvl) {
    return {
      rows: lvl.rows,
      cols: lvl.cols,
      name: lvl.name,
      grid: lvl.grid.map(row => row.map(cell => cell ? { ...cell } : null))
    };
  }
}

window.levelManager = new LevelManager();
