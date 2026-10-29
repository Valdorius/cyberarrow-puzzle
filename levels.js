// Модуль генерации уровней с математической гарантией проходимости (Reverse Step Algorithm)

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
      // Уровень 3: Замкнутые цепочки (4x4)
      {
        rows: 4,
        cols: 4,
        name: "Лабиринт шин",
        grid: [
          [{ dir: 'RIGHT' }, { dir: 'DOWN' }, { dir: 'DOWN' }, { dir: 'RIGHT' }],
          [{ dir: 'UP' }, { dir: 'LEFT' }, { dir: 'RIGHT' }, { dir: 'DOWN' }],
          [{ dir: 'UP' }, { dir: 'UP' }, { dir: 'DOWN' }, { dir: 'RIGHT' }],
          [{ dir: 'LEFT' }, { dir: 'LEFT' }, { dir: 'RIGHT' }, { dir: 'UP' }]
        ]
      },
      // Уровень 4: Введение поворотного элемента (Rotator)
      {
        rows: 4,
        cols: 4,
        name: "Квантовый ротатор",
        grid: [
          [{ dir: 'RIGHT' }, { dir: 'DOWN', special: 'rotator' }, { dir: 'DOWN' }, null],
          [{ dir: 'LEFT' }, { dir: 'UP' }, { dir: 'RIGHT' }, { dir: 'RIGHT' }],
          [{ dir: 'UP' }, { dir: 'LEFT' }, { dir: 'DOWN' }, { dir: 'DOWN' }],
          [null, { dir: 'LEFT' }, { dir: 'RIGHT' }, { dir: 'UP' }]
        ]
      }
    ];
  }

  // Генератор уровня с обратной прокруткой (Reverse Solve)
  generateLevel(levelIndex) {
    if (levelIndex <= this.handcrafted.length) {
      return this.cloneLevel(this.handcrafted[levelIndex - 1]);
    }

    // Параметры сетки растут плавно с уровнем
    const sizeProgress = Math.min(levelIndex - this.handcrafted.length, 30);
    const rows = 4 + Math.floor(sizeProgress / 8); // 4x4 -> 5x5 -> 6x6 max
    const cols = 4 + Math.floor(sizeProgress / 10);
    const targetArrows = Math.floor(rows * cols * 0.75);

    // Создаем пустую сетку
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
    const emptyCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        emptyCells.push({ r, c });
      }
    }

    let placedCount = 0;
    let attempts = 0;

    // В реверсном алгоритме стрелка залетает с края на свободную клетку.
    // Чтобы стрелка с направлением D могла залететь на клетку (r, c),
    // путь от границы в направлении D до (r, c) должен быть СВОБОДЕН в момент прилета.
    while (placedCount < targetArrows && attempts < 400 && emptyCells.length > 0) {
      attempts++;
      const randIdx = Math.floor(Math.random() * emptyCells.length);
      const { r, c } = emptyCells[randIdx];

      // Проверяем все 4 направления, откуда стрелка могла бы вылететь
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
        
        // 10% шанс создать поворотную стрелку на уровнях выше 5
        const isRotator = levelIndex >= 5 && Math.random() < 0.12;

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
