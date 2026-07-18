// ============================================
// Level Manager
// ============================================

import { player } from "../entities/player.js";
import {
  phantom,
  phantomAI,
  setSecondPhantom,
  clearSecondPhantom,
} from "../entities/phantom.js";
import { collidesWithWalls } from "../utils/helpers.js";
import { camera } from "../systems/camera.js";

const TILE_SIZE = 48;

export const levelState = {
  walls: [],
  souls: [],
  candles: [],
  rocks: [],
  rockPickups: [],
  exitRift: null,
  soulsNeeded: 0,
  currentMapCols: 24,
  currentMapRows: 18,
};

export function loadLevel(level) {
  levelState.walls = [];
  levelState.souls = [];
  levelState.candles = [];
  levelState.rocks = [];
  levelState.rockPickups = [];
  levelState.exitRift = null;
  levelState.soulsNeeded = level.soulsNeeded;
  clearSecondPhantom();

  phantom.canDrift = true;
  phantom.canSense = false;
  phantom.canManifest = false;
  phantom.canTrace = false;
  phantom.canPhase = false;
  phantom.canSplit = false;

  Object.keys(level.mutations).forEach((key) => {
    phantom[key] = level.mutations[key];
  });

  phantom.speed = level.phantomSpeed;

  const map = level.map;
  levelState.currentMapRows = map.length;
  levelState.currentMapCols = map[0].length;

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      const tile = map[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      switch (tile) {
        case "#":
          levelState.walls.push({ x, y, width: TILE_SIZE, height: TILE_SIZE });
          break;
        case "@":
          player.x = x + 6;
          player.y = y + 6;
          break;
        case "P":
          phantom.x = x + 6;
          phantom.y = y + 6;
          break;
        case "E":
          levelState.exitRift = {
            x,
            y,
            width: TILE_SIZE,
            height: TILE_SIZE,
            active: false,
            triggered: false,
          };
          break;
      }
    }
  }

  spawnSouls(levelState.soulsNeeded);
  spawnCandles();
  spawnRockPickups();

  player.reset();
  phantom.state = "IDLE";
  phantomAI.lastKnownPlayer = null;
  phantomAI.alertLevel = 0;
  phantomAI.lastPatrol = null;
  phantomAI.campPreventionTimer = 0;

  if (phantom.canSplit) {
    setSecondPhantom({
      x: (levelState.currentMapCols - 3) * TILE_SIZE,
      y: (levelState.currentMapRows - 3) * TILE_SIZE,
      width: phantom.width,
      height: phantom.height,
      speed: phantom.speed * 0.85,
      state: "IDLE",
      opacity: 0.4,
      pulseTimer: Math.random() * 10,
      wanderTarget: null,
      wanderTimer: 0,
    });
  }

  camera.snap();
}

function spawnSouls(count) {
  const grid = buildGridFromWalls();
  const start = worldToCell(player.x, player.y);
  const reachable = floodFill(grid, start.c, start.r);

  const exitCell = levelState.exitRift
    ? worldToCell(levelState.exitRift.x, levelState.exitRift.y)
    : null;

  const candidates = [];
  for (let r = 1; r < grid.length - 1; r++) {
    for (let c = 1; c < grid[0].length - 1; c++) {
      if (!reachable[r][c]) continue;
      if (grid[r][c] !== ".") continue;

      const openN =
        (grid[r - 1][c] === "." ? 1 : 0) +
        (grid[r + 1][c] === "." ? 1 : 0) +
        (grid[r][c - 1] === "." ? 1 : 0) +
        (grid[r][c + 1] === "." ? 1 : 0);
      if (openN < 2) continue;

      if (Math.abs(c - start.c) + Math.abs(r - start.r) < 6) continue;
      if (exitCell && Math.abs(c - exitCell.c) + Math.abs(r - exitCell.r) < 5)
        continue;

      candidates.push({ c, r });
    }
  }

  if (candidates.length === 0) return;

  const cols = levelState.currentMapCols;
  const rows = levelState.currentMapRows;
  const midC = Math.floor(cols / 2);
  const midR = Math.floor(rows / 2);

  const zones = {
    topLeft: [],
    topRight: [],
    bottomLeft: [],
    bottomRight: [],
    center: [],
  };

  for (const cand of candidates) {
    const inCenterC = Math.abs(cand.c - midC) < cols / 4;
    const inCenterR = Math.abs(cand.r - midR) < rows / 4;

    if (inCenterC && inCenterR) zones.center.push(cand);
    else if (cand.c < midC && cand.r < midR) zones.topLeft.push(cand);
    else if (cand.c >= midC && cand.r < midR) zones.topRight.push(cand);
    else if (cand.c < midC && cand.r >= midR) zones.bottomLeft.push(cand);
    else zones.bottomRight.push(cand);
  }

  const zoneOrder = [
    "topLeft",
    "topRight",
    "bottomRight",
    "bottomLeft",
    "center",
  ];
  const placed = [];
  const minDistCells = 6;
  let zoneIdx = 0;
  let attempts = 0;

  while (placed.length < count && attempts < 3000) {
    const currentZone = zones[zoneOrder[zoneIdx % zoneOrder.length]];
    zoneIdx++;

    if (currentZone.length === 0) {
      attempts++;
      continue;
    }

    const pick = currentZone[Math.floor(Math.random() * currentZone.length)];

    let ok = true;
    for (const p of placed) {
      const d = Math.abs(p.c - pick.c) + Math.abs(p.r - pick.r);
      if (d < minDistCells) {
        ok = false;
        break;
      }
    }

    if (ok) placed.push(pick);
    attempts++;
  }

  if (placed.length < count) {
    let attempts2 = 0;
    while (placed.length < count && attempts2 < 2000 && candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      let already = false;
      for (const p of placed) {
        if (p.c === pick.c && p.r === pick.r) {
          already = true;
          break;
        }
      }
      if (!already) placed.push(pick);
      attempts2++;
    }
  }

  for (const p of placed) {
    const x = p.c * TILE_SIZE + 12;
    const y = p.r * TILE_SIZE + 12;
    levelState.souls.push({ x, y, width: 24, height: 24, collected: false });
  }
}

function spawnCandles() {
  const candleCount = 6 + Math.floor(Math.random() * 4);
  const placedCandles = [];
  const minDistanceBetweenCandles = 200;

  for (let i = 0; i < candleCount; i++) {
    let attempts = 0;
    let placed = false;

    while (attempts < 150 && !placed) {
      const rx =
        2 + Math.floor(Math.random() * (levelState.currentMapCols - 4));
      const ry =
        2 + Math.floor(Math.random() * (levelState.currentMapRows - 4));
      const x = rx * TILE_SIZE + 24;
      const y = ry * TILE_SIZE + 24;

      if (!collidesWithWalls(x - 12, y - 12, 24, 24, levelState.walls)) {
        let tooClose = false;
        for (const other of placedCandles) {
          const dx = other.x - x;
          const dy = other.y - y;
          if (Math.sqrt(dx * dx + dy * dy) < minDistanceBetweenCandles) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          const newCandle = { x, y, radius: 110, life: 99999, permanent: true };
          levelState.candles.push(newCandle);
          placedCandles.push(newCandle);
          placed = true;
        }
      }
      attempts++;
    }
  }
}

function spawnRockPickups() {
  const placed = [];
  const minDistance = 100;

  for (const candle of levelState.candles) {
    if (Math.random() > 0.6) continue;

    let attempts = 0;
    let done = false;

    while (attempts < 30 && !done) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 50;
      const x = candle.x + Math.cos(angle) * distance;
      const y = candle.y + Math.sin(angle) * distance;

      if (!collidesWithWalls(x - 8, y - 8, 16, 16, levelState.walls)) {
        let tooClose = false;
        for (const p of placed) {
          const dx = p.x - x;
          const dy = p.y - y;
          if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
            tooClose = true;
            break;
          }
        }

        const distToPlayer = Math.sqrt(
          (x - player.x) ** 2 + (y - player.y) ** 2,
        );
        if (distToPlayer < 150) tooClose = true;

        if (!tooClose) {
          const pickup = { x, y, collected: false };
          levelState.rockPickups.push(pickup);
          placed.push(pickup);
          done = true;
        }
      }
      attempts++;
    }
  }

  if (levelState.rockPickups.length > 5) {
    levelState.rockPickups = levelState.rockPickups.slice(0, 5);
  }

  if (levelState.rockPickups.length < 2) {
    let attempts = 0;
    while (levelState.rockPickups.length < 2 && attempts < 100) {
      const rx =
        3 + Math.floor(Math.random() * (levelState.currentMapCols - 6));
      const ry =
        3 + Math.floor(Math.random() * (levelState.currentMapRows - 6));
      const x = rx * TILE_SIZE + 24;
      const y = ry * TILE_SIZE + 24;

      if (!collidesWithWalls(x - 8, y - 8, 16, 16, levelState.walls)) {
        const distToPlayer = Math.sqrt(
          (x - player.x) ** 2 + (y - player.y) ** 2,
        );
        if (distToPlayer > 200) {
          levelState.rockPickups.push({ x, y, collected: false });
        }
      }
      attempts++;
    }
  }
}

export function moveRiftRandomly() {
  if (!levelState.exitRift) return;

  const grid = buildGridFromWalls();
  const start = worldToCell(player.x, player.y);
  const reachable = floodFill(grid, start.c, start.r);

  const candidates = [];
  for (let r = 2; r < grid.length - 2; r++) {
    for (let c = 2; c < grid[0].length - 2; c++) {
      if (!reachable[r][c]) continue;
      if (grid[r][c] !== ".") continue;

      const distToPlayer = Math.abs(c - start.c) + Math.abs(r - start.r);
      if (distToPlayer < 8) continue;

      candidates.push({ c, r });
    }
  }

  if (candidates.length === 0) return;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  levelState.exitRift.x = pick.c * TILE_SIZE;
  levelState.exitRift.y = pick.r * TILE_SIZE;
  levelState.exitRift.active = true;
  levelState.exitRift.triggered = false;
}

function buildGridFromWalls() {
  const rows = levelState.currentMapRows;
  const cols = levelState.currentMapCols;
  const grid = Array.from({ length: rows }, () => Array(cols).fill("."));

  for (const w of levelState.walls) {
    const c = Math.floor(w.x / TILE_SIZE);
    const r = Math.floor(w.y / TILE_SIZE);
    if (grid[r] && grid[r][c] !== undefined) grid[r][c] = "#";
  }
  return grid;
}

function floodFill(grid, startC, startR) {
  const rows = grid.length;
  const cols = grid[0].length;
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));

  if (grid[startR][startC] === "#") return seen;

  const q = [{ c: startC, r: startR }];
  seen[startR][startC] = true;

  const dirs = [
    { dc: 1, dr: 0 },
    { dc: -1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: 0, dr: -1 },
  ];

  while (q.length) {
    const cur = q.shift();
    for (const d of dirs) {
      const nc = cur.c + d.dc;
      const nr = cur.r + d.dr;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (seen[nr][nc]) continue;
      if (grid[nr][nc] === "#") continue;
      seen[nr][nc] = true;
      q.push({ c: nc, r: nr });
    }
  }
  return seen;
}

function worldToCell(x, y) {
  return { c: Math.floor(x / TILE_SIZE), r: Math.floor(y / TILE_SIZE) };
}
