// ============================================
// Endless Mode — Procedural Floors
// ============================================

const ENDLESS_MUTATIONS = [
  "canSense",
  "canManifest",
  "canTrace",
  "canPhase",
  "canSplit",
];

export function generateEndlessMap(floor) {
  const cols = 26;
  const rows = 20;
  const map = [];

  for (let r = 0; r < rows; r++) {
    let row = "";

    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) row += "#";
      else row += ".";
    }

    map.push(row);
  }

  // Horizontal broken walls
  const wallRows = 3 + Math.floor(floor / 3);

  for (let i = 0; i < wallRows; i++) {
    const wy = 3 + Math.floor(Math.random() * (rows - 6));
    const startX = 2 + Math.floor(Math.random() * 6);
    const len = 3 + Math.floor(Math.random() * 5);
    const gapPos = startX + Math.floor(Math.random() * len);

    for (let j = 0; j < len && startX + j < cols - 2; j++) {
      const cx = startX + j;

      if (cx !== gapPos && cx !== gapPos + 1) {
        map[wy] = replaceAt(map[wy], cx, "#");
      }
    }
  }

  // Vertical broken walls
  const vWalls = 2 + Math.floor(floor / 4);

  for (let i = 0; i < vWalls; i++) {
    const wx = 3 + Math.floor(Math.random() * (cols - 6));
    const startY = 2 + Math.floor(Math.random() * 6);
    const len = 3 + Math.floor(Math.random() * 4);
    const gapPos = startY + Math.floor(Math.random() * len);

    for (let j = 0; j < len && startY + j < rows - 2; j++) {
      const cy = startY + j;

      if (cy !== gapPos && cy !== gapPos + 1) {
        map[cy] = replaceAt(map[cy], wx, "#");
      }
    }
  }

  // Clear spawn zones
  clearArea(map, 1, 1, 4, 4);
  clearArea(map, cols - 5, rows - 5, 4, 4);

  // Player
  map[2] = replaceAt(map[2], 2, "@");

  // Phantom
  map[rows - 3] = replaceAt(map[rows - 3], cols - 3, "P");

  // Souls
  const soulCount = 3 + Math.floor(floor / 2);
  let placed = 0;
  let attempts = 0;

  while (placed < soulCount && attempts < 300) {
    const sx = 2 + Math.floor(Math.random() * (cols - 4));
    const sy = 2 + Math.floor(Math.random() * (rows - 4));

    if (map[sy][sx] === ".") {
      map[sy] = replaceAt(map[sy], sx, "S");
      placed++;
    }

    attempts++;
  }

  // Exit
  map[rows - 2] = replaceAt(map[rows - 2], cols - 2, "E");

  return map;
}

export function createEndlessLevel(floor) {
  const mutationsForFloor = {};

  ENDLESS_MUTATIONS.forEach((mutation, i) => {
    if (floor >= (i + 1) * 5) {
      mutationsForFloor[mutation] = true;
    }
  });

  const ability =
    floor % 5 === 0
      ? ENDLESS_MUTATIONS[
          Math.min(Math.floor(floor / 5) - 1, ENDLESS_MUTATIONS.length - 1)
        ]
          .replace("can", "")
          .toUpperCase()
      : "DRIFT";

  return {
    name: "FLOOR " + floor,
    ability,
    description: `"Floor ${floor}. It grows stronger."`,
    mutations: mutationsForFloor,
    soulsNeeded: 3 + Math.floor(floor / 2),
    phantomSpeed: 50 + floor * 2,
    map: generateEndlessMap(floor),
  };
}

function replaceAt(str, index, char) {
  return str.substring(0, index) + char + str.substring(index + 1);
}

function clearArea(map, startX, startY, width, height) {
  for (let y = startY; y < startY + height; y++) {
    for (let x = startX; x < startX + width; x++) {
      if (map[y] && map[y][x]) {
        map[y] = replaceAt(map[y], x, ".");
      }
    }
  }
}
