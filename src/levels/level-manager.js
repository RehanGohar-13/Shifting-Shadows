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
  candlePickups: [],
  bones: [],
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
  levelState.candlePickups = [];
  levelState.bones = [];
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
            readyToEscape: false,
            justBecameReady: false,
          };
          break;
      }
    }
  }

  spawnSouls(levelState.soulsNeeded);
  spawnCandles();
  spawnRockPickups();
  spawnCandlePickups();
  spawnBones();

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

function spawnBones() {
  // Scatter skulls on floor for atmosphere
  const boneCount = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < boneCount; i++) {
    let attempts = 0;
    while (attempts < 50) {
      const rx =
        2 + Math.floor(Math.random() * (levelState.currentMapCols - 4));
      const ry =
        2 + Math.floor(Math.random() * (levelState.currentMapRows - 4));
      const x = rx * TILE_SIZE + Math.random() * 20 - 10;
      const y = ry * TILE_SIZE + Math.random() * 20 - 10;

      if (!collidesWithWalls(x, y, 16, 16, levelState.walls)) {
        levelState.bones.push({
          x,
          y,
          rotation: Math.random() * Math.PI * 2,
          whispered: false, // For random whisper events
        });
        break;
      }
      attempts++;
    }
  }
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

  const placed = [];
  const minDistCells = 5;
  let attempts = 0;

  while (placed.length < count && attempts < 3000 && candidates.length > 0) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
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

  for (const p of placed) {
    const x = p.c * TILE_SIZE + 12;
    const y = p.r * TILE_SIZE + 12;
    levelState.souls.push({ x, y, width: 24, height: 24, collected: false });
  }
}

function spawnCandles() {
  const candleCount = 3 + Math.floor(Math.random() * 3);
  const placed = [];
  const minDist = 200;
  for (let i = 0; i < candleCount; i++) {
    let att = 0,
      done = false;
    while (att < 150 && !done) {
      const rx =
        2 + Math.floor(Math.random() * (levelState.currentMapCols - 4));
      const ry =
        2 + Math.floor(Math.random() * (levelState.currentMapRows - 4));
      const x = rx * TILE_SIZE + 24;
      const y = ry * TILE_SIZE + 24;
      if (!collidesWithWalls(x - 12, y - 12, 24, 24, levelState.walls)) {
        let tc = false;
        for (const o of placed)
          if (Math.hypot(o.x - x, o.y - y) < minDist) {
            tc = true;
            break;
          }
        if (!tc) {
          const c = { x, y, radius: 110, life: 99999, permanent: true };
          levelState.candles.push(c);
          placed.push(c);
          done = true;
        }
      }
      att++;
    }
  }
}

function spawnRockPickups() {
  const placed = [];
  for (const candle of levelState.candles) {
    if (Math.random() > 0.6) continue;
    let att = 0,
      done = false;
    while (att < 30 && !done) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 50;
      const x = candle.x + Math.cos(angle) * distance;
      const y = candle.y + Math.sin(angle) * distance;
      if (!collidesWithWalls(x - 8, y - 8, 16, 16, levelState.walls)) {
        const distToP = Math.hypot(x - player.x, y - player.y);
        if (distToP > 150) {
          const p = { x, y, collected: false };
          levelState.rockPickups.push(p);
          placed.push(p);
          done = true;
        }
      }
      att++;
    }
  }
  if (levelState.rockPickups.length < 2) {
    let att = 0;
    while (levelState.rockPickups.length < 2 && att < 100) {
      const rx =
        3 + Math.floor(Math.random() * (levelState.currentMapCols - 6));
      const ry =
        3 + Math.floor(Math.random() * (levelState.currentMapRows - 6));
      const x = rx * TILE_SIZE + 24;
      const y = ry * TILE_SIZE + 24;
      if (!collidesWithWalls(x - 8, y - 8, 16, 16, levelState.walls)) {
        if (Math.hypot(x - player.x, y - player.y) > 200) {
          levelState.rockPickups.push({ x, y, collected: false });
        }
      }
      att++;
    }
  }
}

function spawnCandlePickups() {
  const count = 4 + Math.floor(Math.random() * 3);
  const placed = [];
  for (let i = 0; i < count; i++) {
    let att = 0,
      done = false;
    while (att < 100 && !done) {
      const rx =
        3 + Math.floor(Math.random() * (levelState.currentMapCols - 6));
      const ry =
        3 + Math.floor(Math.random() * (levelState.currentMapRows - 6));
      const x = rx * TILE_SIZE + 24;
      const y = ry * TILE_SIZE + 24;
      if (!collidesWithWalls(x - 8, y - 8, 16, 16, levelState.walls)) {
        let tc = false;
        for (const p of placed)
          if (Math.hypot(p.x - x, p.y - y) < 150) {
            tc = true;
            break;
          }
        if (Math.hypot(x - player.x, y - player.y) < 150) tc = true;
        if (!tc) {
          const p = { x, y, collected: false };
          levelState.candlePickups.push(p);
          placed.push(p);
          done = true;
        }
      }
      att++;
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
      if (!reachable[r][c] || grid[r][c] !== ".") continue;
      if (Math.abs(c - start.c) + Math.abs(r - start.r) < 8) continue;
      candidates.push({ c, r });
    }
  }
  if (!candidates.length) return;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  levelState.exitRift.x = pick.c * TILE_SIZE;
  levelState.exitRift.y = pick.r * TILE_SIZE;
  levelState.exitRift.active = true;
}

function buildGridFromWalls() {
  const rows = levelState.currentMapRows,
    cols = levelState.currentMapCols;
  const grid = Array.from({ length: rows }, () => Array(cols).fill("."));
  for (const w of levelState.walls) {
    const c = Math.floor(w.x / TILE_SIZE),
      r = Math.floor(w.y / TILE_SIZE);
    if (grid[r] && grid[r][c] !== undefined) grid[r][c] = "#";
  }
  return grid;
}

function floodFill(grid, startC, startR) {
  const rows = grid.length,
    cols = grid[0].length;
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
      const nc = cur.c + d.dc,
        nr = cur.r + d.dr;
      if (
        nr < 0 ||
        nr >= rows ||
        nc < 0 ||
        nc >= cols ||
        seen[nr][nc] ||
        grid[nr][nc] === "#"
      )
        continue;
      seen[nr][nc] = true;
      q.push({ c: nc, r: nr });
    }
  }
  return seen;
}

function worldToCell(x, y) {
  return { c: Math.floor(x / TILE_SIZE), r: Math.floor(y / TILE_SIZE) };
}
