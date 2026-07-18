// ============================================
// Level Manager — Load & Parse Maps
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
        case "S":
          // Ignore S from templates (we spawn souls properly later)
          break;
        case "E":
          levelState.exitRift = {
            x,
            y,
            width: TILE_SIZE,
            height: TILE_SIZE,
            active: false,
          };
          break;
      }
    }
  }

  // Spawn candles STRATEGICALLY — spread evenly across map
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

      // Must be on floor
      if (!collidesWithWalls(x - 12, y - 12, 24, 24, levelState.walls)) {
        // Must be far from other candles
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
          // Must be at least one wall neighbor (candles look better against walls)
          const hasWallNeighbor =
            collidesWithWalls(x - TILE_SIZE, y, 24, 24, levelState.walls) ||
            collidesWithWalls(x + TILE_SIZE, y, 24, 24, levelState.walls) ||
            collidesWithWalls(x, y - TILE_SIZE, 24, 24, levelState.walls) ||
            collidesWithWalls(x, y + TILE_SIZE, 24, 24, levelState.walls);

          if (hasWallNeighbor || attempts > 80) {
            const newCandle = {
              x: x,
              y: y,
              radius: 110,
              life: 99999,
              permanent: true,
            };
            levelState.candles.push(newCandle);
            placedCandles.push(newCandle);
            placed = true;
          }
        }
      }
      attempts++;
    }
  }

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
  levelState.souls = [];

  const grid = buildGridFromWalls();
  const start = worldToCell(player.x, player.y);
  const reachable = floodFill(grid, start.c, start.r);

  const exitCell = levelState.exitRift
    ? worldToCell(levelState.exitRift.x, levelState.exitRift.y)
    : null;

  // candidates: reachable floor cells, not dead-ends, not too near player/exit
  const candidates = [];
  for (let r = 1; r < grid.length - 1; r++) {
    for (let c = 1; c < grid[0].length - 1; c++) {
      if (!reachable[r][c]) continue;
      if (grid[r][c] !== ".") continue;

      // avoid dead-ends/closed pockets: require >=2 open neighbors
      const openN =
        (grid[r - 1][c] === "." ? 1 : 0) +
        (grid[r + 1][c] === "." ? 1 : 0) +
        (grid[r][c - 1] === "." ? 1 : 0) +
        (grid[r][c + 1] === "." ? 1 : 0);
      if (openN < 2) continue;

      // keep away from player spawn
      if (Math.abs(c - start.c) + Math.abs(r - start.r) < 6) continue;

      // keep away from exit
      if (exitCell && Math.abs(c - exitCell.c) + Math.abs(r - exitCell.r) < 6)
        continue;

      candidates.push({ c, r });
    }
  }

  // place with spacing
  const placed = [];
  const minDistCells = 6; // ~288px (6*48) spacing

  let attempts = 0;
  while (placed.length < count && attempts < 2000 && candidates.length > 0) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    let ok = true;
    for (const p of placed) {
      const d = Math.abs(p.c - pick.c) + Math.abs(p.r - pick.r);
      if (d < minDistCells) {
        ok = false;
        break;
      }
    }

    if (ok) {
      placed.push(pick);
    }

    attempts++;
  }

  // convert to soul objects
  for (const p of placed) {
    const x = p.c * TILE_SIZE + 12;
    const y = p.r * TILE_SIZE + 12;
    levelState.souls.push({ x, y, width: 24, height: 24, collected: false });
  }
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

  const q = [];
  q.push({ c: startC, r: startR });
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
