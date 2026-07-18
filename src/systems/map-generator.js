// ============================================
// Map Generator — Dungeon Rooms + Corridors
// ============================================

export function generateStoryMap(levelIndex) {
  const configs = [
    {
      cols: 26,
      rows: 18,
      rooms: 5,
      minRoomSize: 3,
      maxRoomSize: 6,
      soulCount: 4,
    },
    {
      cols: 28,
      rows: 20,
      rooms: 6,
      minRoomSize: 3,
      maxRoomSize: 6,
      soulCount: 5,
    },
    {
      cols: 30,
      rows: 20,
      rooms: 7,
      minRoomSize: 4,
      maxRoomSize: 7,
      soulCount: 5,
    },
    {
      cols: 32,
      rows: 22,
      rooms: 8,
      minRoomSize: 4,
      maxRoomSize: 7,
      soulCount: 6,
    },
    {
      cols: 34,
      rows: 24,
      rooms: 9,
      minRoomSize: 4,
      maxRoomSize: 8,
      soulCount: 6,
    },
    {
      cols: 36,
      rows: 26,
      rooms: 10,
      minRoomSize: 5,
      maxRoomSize: 8,
      soulCount: 7,
    },
  ];

  const config = configs[levelIndex] || configs[5];
  return buildDungeon(config);
}

function buildDungeon(config) {
  const {
    cols,
    rows,
    rooms: roomCount,
    minRoomSize,
    maxRoomSize,
    soulCount,
  } = config;

  // Fill map entirely with walls
  const map = [];
  for (let r = 0; r < rows; r++) {
    let row = "";
    for (let c = 0; c < cols; c++) {
      row += "#";
    }
    map.push(row);
  }

  const rooms = [];
  let attempts = 0;

  // Generate rooms that don't overlap
  while (rooms.length < roomCount && attempts < 100) {
    const w =
      minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize));
    const h =
      minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize));
    const x = 1 + Math.floor(Math.random() * (cols - w - 2));
    const y = 1 + Math.floor(Math.random() * (rows - h - 2));

    const newRoom = {
      x,
      y,
      w,
      h,
      cx: x + Math.floor(w / 2),
      cy: y + Math.floor(h / 2),
    };

    let overlaps = false;
    for (const room of rooms) {
      if (roomsOverlap(newRoom, room, 1)) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      rooms.push(newRoom);
      carveRoom(map, newRoom);
    }
    attempts++;
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1];
    const curr = rooms[i];
    carveCorridor(map, prev.cx, prev.cy, curr.cx, curr.cy);
  }

  // Sometimes add extra corridors for loops
  const extraCorridors = Math.floor(rooms.length / 3);
  for (let i = 0; i < extraCorridors; i++) {
    const a = rooms[Math.floor(Math.random() * rooms.length)];
    const b = rooms[Math.floor(Math.random() * rooms.length)];
    if (a !== b) {
      carveCorridor(map, a.cx, a.cy, b.cx, b.cy);
    }
  }

  // Sort rooms by distance from top-left
  const sortedByDist = [...rooms].sort((a, b) => {
    return a.cx + a.cy - (b.cx + b.cy);
  });

  // Place player in first room
  const playerRoom = sortedByDist[0];
  map[playerRoom.cy] = replaceAt(map[playerRoom.cy], playerRoom.cx, "@");

  // Place exit in furthest room
  const exitRoom = sortedByDist[sortedByDist.length - 1];
  map[exitRoom.cy] = replaceAt(map[exitRoom.cy], exitRoom.cx, "E");

  // Place phantom in a middle-far room (not too close to player, not on exit)
  const phantomCandidates = sortedByDist.slice(
    Math.floor(sortedByDist.length * 0.5),
    sortedByDist.length - 1,
  );
  const phantomRoom =
    phantomCandidates[Math.floor(Math.random() * phantomCandidates.length)] ||
    sortedByDist[Math.floor(sortedByDist.length * 0.7)];
  map[phantomRoom.cy] = replaceAt(map[phantomRoom.cy], phantomRoom.cx, "P");

  // Place souls strategically - spread across rooms
  const soulRooms = distributeItems(rooms, soulCount, [
    playerRoom,
    exitRoom,
    phantomRoom,
  ]);
  for (const room of soulRooms) {
    const sx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
    const sy = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
    if (map[sy][sx] === ".") {
      map[sy] = replaceAt(map[sy], sx, "S");
    }
  }

  return map;
}

function roomsOverlap(a, b, padding = 0) {
  return !(
    a.x + a.w + padding <= b.x ||
    b.x + b.w + padding <= a.x ||
    a.y + a.h + padding <= b.y ||
    b.y + b.h + padding <= a.y
  );
}

function carveRoom(map, room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      map[y] = replaceAt(map[y], x, ".");
    }
  }
}

function carveCorridor(map, x1, y1, x2, y2) {
  // L-shaped corridor: horizontal then vertical (or vice versa)
  const horizontalFirst = Math.random() > 0.5;

  if (horizontalFirst) {
    carveHorizontal(map, x1, x2, y1);
    carveVertical(map, y1, y2, x2);
  } else {
    carveVertical(map, y1, y2, x1);
    carveHorizontal(map, x1, x2, y2);
  }
}

function carveHorizontal(map, x1, x2, y) {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  for (let x = start; x <= end; x++) {
    map[y] = replaceAt(map[y], x, ".");
    // Widen corridor to 2 wide occasionally
    if (Math.random() > 0.7 && y + 1 < map.length - 1) {
      map[y + 1] = replaceAt(map[y + 1], x, ".");
    }
  }
}

function carveVertical(map, y1, y2, x) {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);
  for (let y = start; y <= end; y++) {
    map[y] = replaceAt(map[y], x, ".");
    // Widen corridor occasionally
    if (Math.random() > 0.7 && x + 1 < map[0].length - 1) {
      map[y] = replaceAt(map[y], x + 1, ".");
    }
  }
}

function distributeItems(rooms, count, excludeRooms) {
  const validRooms = rooms.filter((r) => !excludeRooms.includes(r));
  const shuffled = [...validRooms].sort(() => Math.random() - 0.5);
  const selected = [];

  // Distribute items across different rooms
  for (let i = 0; i < count; i++) {
    selected.push(shuffled[i % shuffled.length]);
  }

  return selected;
}

function replaceAt(str, index, char) {
  return str.substring(0, index) + char + str.substring(index + 1);
}
