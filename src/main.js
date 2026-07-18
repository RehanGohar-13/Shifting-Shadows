// ============================================
// SHIFTING SHADOWS — Main Game Engine
// ============================================

import { sound } from "./systems/sound-system.js";
import { sprites } from "./systems/sprites.js";
import { player } from "./entities/player.js";
import {
  phantom,
  phantomAI,
  secondPhantom,
  setSecondPhantom,
  clearSecondPhantom,
} from "./entities/phantom.js";
import {
  rectsCollide,
  distanceBetween,
  collidesWithWalls,
  hasLineOfSight,
} from "./utils/helpers.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1200;
canvas.height = 800;
ctx.imageSmoothingEnabled = false;

// ── Game Constants ──
const TILE_SIZE = 48;
let currentMapCols = 24;
let currentMapRows = 18;

// ── Camera ──
const camera = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,

  update(dt) {
    this.targetX = player.x + player.width / 2 - canvas.width / 2;
    this.targetY = player.y + player.height / 2 - canvas.height / 2;
    this.x += (this.targetX - this.x) * 0.08;
    this.y += (this.targetY - this.y) * 0.08;
  },

  snap() {
    this.x = player.x + player.width / 2 - canvas.width / 2;
    this.y = player.y + player.height / 2 - canvas.height / 2;
    this.targetX = this.x;
    this.targetY = this.y;
  },
};

// ── Game State ──
const GameState = {
  MENU: "menu",
  PLAYING: "playing",
  TRANSITION: "transition",
  GAMEOVER: "gameover",
  WIN: "win",
};

let currentState = GameState.MENU;
let currentLevel = 0;
let currentMode = "story";
let endlessFloor = 1;
let endlessScore = 0;
let gameTime = 0;
let lastTime = 0;
let soulFlashTimer = 0;
let storyQueue = [];
let waitingForStory = false;
let storyCallback = null;

// ── Input Manager ──
const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;

  if (e.code === "Space" && currentState === GameState.TRANSITION) {
    if (waitingForStory) {
      document.getElementById("story-overlay").classList.add("hidden");
      waitingForStory = false;
      if (storyCallback) {
        storyCallback();
        storyCallback = null;
      }
    } else {
      startLevel();
    }
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
  if (e.key.toLowerCase() === "e") keys["e"] = false;
  if (e.key.toLowerCase() === "f") keys["f"] = false;
});

// ── Game Objects ──
let walls = [];
let souls = [];
let exitRift = null;
let candles = [];
let rocks = [];
let soulsNeeded = 0;
const particles = [];

// ── Story Data ──
const STORY = {
  intro: `You were a knight.<br><br>
    The kingdom's finest blade.<br>
    They called you <span class="story-highlight">The Silver Shadow</span>.<br><br>
    You killed without mercy.<br>
    Soldiers. Rebels. Innocents.<br>
    You stopped counting after the first hundred.<br><br>
    Then one night, something followed you home.<br><br>
    Not a person.<br>
    <span class="story-danger">A phantom.</span><br><br>
    Born from every soul you took.<br>
    It doesn't want revenge.<br>
    It wants to <span class="story-highlight">become you</span>.`,

  chapters: [
    {
      before: [
        `The dungeon beneath the castle.<br>
        This is where they kept the prisoners.<br>
        <span class="story-highlight">Your</span> prisoners.<br><br>
        Something drifts through these halls now.<br>
        A shadow made of screams.<br><br>
        It can barely move. It's still learning<br>
        what it is.<br><br>
        <span class="story-danger">Collect the souls. Seal the rift. Escape.</span>`,

        `You ran.<br><br>
        Your armor clanked against the stone floor<br>
        and <span class="story-danger">it heard you</span>.<br><br>
        Every soul you took gave it a new sense.<br>
        First movement. Now hearing.<br><br>
        <span class="story-highlight">Walk slowly, knight.<br>
        Your victims are listening.</span>`,
      ],
    },
    {
      before: [
        `You lit a torch to find your way.<br><br>
        The light fell on the phantom's face<br>
        and you saw it clearly for the first time.<br><br>
        <span class="story-danger">It had your face.</span><br><br>
        An older version. Hollow eyes.<br>
        A mouth full of teeth that used to be words.<br><br>
        It sees you now. In the light.<br>
        <span class="story-highlight">The darkness is safer.</span>`,

        `You thought you escaped.<br>
        You hid behind a wall and held your breath.<br><br>
        But it found your footprints.<br>
        <span class="story-danger">The trail of blood you've always left behind.</span><br><br>
        Every step you take leaves a mark.<br>
        Every mark is a memory of someone who died.<br><br>
        <span class="story-highlight">You can't outrun your past.</span>`,
      ],
    },
    {
      before: [
        `The walls shook.<br><br>
        You pressed your back against cold stone<br>
        and felt something reach through it.<br><br>
        <span class="story-danger">Its hand came through the wall.</span><br>
        Made of smoke and sorrow.<br><br>
        The barriers between you and your sins<br>
        are dissolving.<br><br>
        <span class="story-highlight">There is nowhere left to hide.</span>`,

        `It split in two.<br><br>
        Two phantoms now. Two shadows.<br>
        Made from the lives you ended.<br><br>
        One for the soldiers you killed in battle.<br>
        <span class="story-danger">One for the innocents.</span><br><br>
        They move differently.<br>
        But they share one purpose.<br><br>
        <span class="story-highlight">To make you feel what they felt.</span>`,
      ],
    },
  ],

  ending: `The rift seals behind you.<br><br>
    You collapse on the other side.<br>
    Breathing. Alive. Free.<br><br>
    But you know the truth now.<br><br>
    The phantom wasn't a monster.<br>
    <span class="story-danger">It was a mirror.</span><br><br>
    Every soul you took lives inside it.<br>
    Every face you forgot — it remembers.<br><br>
    You escaped the dungeon.<br>
    But the dungeon is inside you.<br><br>
    And in the darkness behind your eyes,<br>
    <span class="story-highlight">it's still learning.</span><br><br>
    <span class="story-danger">SHIFTING SHADOWS</span>`,
};

// ── Level Data ──
const LEVELS = [
  {
    name: "PHANTOM CAN DRIFT",
    ability: "DRIFT",
    description: '"It wanders aimlessly. For now."',
    mutations: {},
    soulsNeeded: 4,
    phantomSpeed: 50,
    map: [
      "##########################",
      "#............##..........#",
      "#..@.........##..........#",
      "#............##....S.....#",
      "#....####..............###",
      "#....#.......##........#.#",
      "#....#.......##........#.#",
      "#............##..........#",
      "#..S.................S...#",
      "#............##..........#",
      "#...####.....##..........#",
      "#............##..........#",
      "#............##....####..#",
      "#....S.......##..........#",
      "#............##..........#",
      "####.........##..........#",
      "#............##........E.#",
      "#.......P....##..........#",
      "##########################",
    ],
  },
  {
    name: "PHANTOM CAN SENSE",
    ability: "SENSE",
    description: '"It heard you breathe."',
    mutations: { canSense: true },
    soulsNeeded: 5,
    phantomSpeed: 60,
    map: [
      "##########################",
      "#..@.....................#",
      "#.........S..............#",
      "#........................#",
      "####..####....####..####.#",
      "#........................#",
      "#........................#",
      "#..S.................S...#",
      "#........................#",
      "####..####....####..####.#",
      "#........................#",
      "#........................#",
      "#.........S..............#",
      "#........................#",
      "####..####....####..####.#",
      "#........................#",
      "#..S.................P...#",
      "#......................E.#",
      "##########################",
    ],
  },
  {
    name: "PHANTOM CAN MANIFEST",
    ability: "MANIFEST",
    description: '"It sees you in the light."',
    mutations: { canSense: true, canManifest: true },
    soulsNeeded: 5,
    phantomSpeed: 65,
    map: [
      "##########################",
      "#..@.....................#",
      "#..........S.............#",
      "#........................#",
      "#...######......######...#",
      "#...#..................#.#",
      "#...#..................#.#",
      "#...#......S.......S.....#",
      "#...#..................#.#",
      "#...#..................#.#",
      "#...######......######...#",
      "#........................#",
      "#.....S..................#",
      "#........................#",
      "#...######......######...#",
      "#........................#",
      "#..........S.........P...#",
      "#......................E.#",
      "##########################",
    ],
  },
  {
    name: "PHANTOM CAN TRACE",
    ability: "TRACE",
    description: '"It follows where you have been."',
    mutations: { canSense: true, canManifest: true, canTrace: true },
    soulsNeeded: 6,
    phantomSpeed: 68,
    map: [
      "##########################",
      "#..@..........S..........#",
      "#........................#",
      "#..####..............##..#",
      "#..#...................#.#",
      "#..#....S..............#.#",
      "#..#...................#.#",
      "#..####..............##..#",
      "#........................#",
      "#.......S........S.......#",
      "#........................#",
      "#..####..............##..#",
      "#..#...................#.#",
      "#..#....S..............#.#",
      "#..#...................#.#",
      "#..####..............##..#",
      "#...................P....#",
      "#......................E.#",
      "##########################",
    ],
  },
  {
    name: "PHANTOM CAN PHASE",
    ability: "PHASE",
    description: '"Walls cannot hold it."',
    mutations: {
      canSense: true,
      canManifest: true,
      canTrace: true,
      canPhase: true,
    },
    soulsNeeded: 6,
    phantomSpeed: 72,
    map: [
      "##########################",
      "#..@..........S..........#",
      "#........................#",
      "#..####....####....####..#",
      "#........................#",
      "#..S.....................#",
      "#........................#",
      "#....####....####....##..#",
      "#........................#",
      "#..............S.........#",
      "#........................#",
      "#..####....####....####..#",
      "#........................#",
      "#..S.....................#",
      "#........................#",
      "#....####....####....##..#",
      "#..S.................P...#",
      "#......................E.#",
      "##########################",
    ],
  },
  {
    name: "PHANTOM CAN SPLIT",
    ability: "SPLIT",
    description: '"There are two of them. There is one of you."',
    mutations: {
      canSense: true,
      canManifest: true,
      canTrace: true,
      canPhase: true,
      canSplit: true,
    },
    soulsNeeded: 7,
    phantomSpeed: 75,
    map: [
      "##############################",
      "#..@..........S..............#",
      "#............................#",
      "#....####.........####.......#",
      "#............................#",
      "#..S.........................#",
      "#............................#",
      "#........####.........####...#",
      "#............................#",
      "#..............S.............#",
      "#............................#",
      "#....####.........####.......#",
      "#............................#",
      "#..S.........................#",
      "#............................#",
      "#........####.........####...#",
      "#............................#",
      "#..S...........S.........P...#",
      "#............................#",
      "#..........................E.#",
      "##############################",
    ],
  },
];

// ── Parse Level Map ──
function loadLevel(levelIdx) {
  const level = LEVELS[levelIdx];
  walls = [];
  souls = [];
  candles = [];
  rocks = [];
  exitRift = null;
  secondPhantom = null;
  soulsNeeded = level.soulsNeeded;

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
  currentMapRows = map.length;
  currentMapCols = map[0].length;

  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      const tile = map[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      switch (tile) {
        case "#":
          walls.push({ x, y, width: TILE_SIZE, height: TILE_SIZE });
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
          souls.push({
            x: x + 12,
            y: y + 12,
            width: 24,
            height: 24,
            collected: false,
          });
          break;
        case "E":
          exitRift = {
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

  // Pre-placed candles
  const candleCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < candleCount; i++) {
    let attempts = 0;
    while (attempts < 100) {
      const rx = 2 + Math.floor(Math.random() * (currentMapCols - 4));
      const ry = 2 + Math.floor(Math.random() * (currentMapRows - 4));
      const x = rx * TILE_SIZE + 24;
      const y = ry * TILE_SIZE + 24;

      if (!collidesWithWalls(x - 12, y - 12, 24, 24)) {
        candles.push({ x: x, y: y, radius: 100, life: 99999, permanent: true });
        break;
      }
      attempts++;
    }
  }

  player.reset();
  phantom.state = "IDLE";
  phantomAI.lastKnownPlayer = null;
  phantomAI.alertLevel = 0;
  phantomAI.lastPatrol = null;

  if (phantom.canSplit) {
    secondPhantom = {
      x: (currentMapCols - 3) * TILE_SIZE,
      y: (currentMapRows - 3) * TILE_SIZE,
      width: phantom.width,
      height: phantom.height,
      speed: phantom.speed * 0.85,
      state: "IDLE",
      opacity: 0.4,
      pulseTimer: Math.random() * 10,
      wanderTarget: null,
      wanderTimer: 0,
    };
  }

  camera.snap();
}

// ── Player Update ──
function updatePlayer(dt) {
  let dx = 0;
  let dy = 0;

  if (keys["w"] || keys["arrowup"]) dy = -1;
  if (keys["s"] || keys["arrowdown"]) dy = 1;
  if (keys["a"] || keys["arrowleft"]) dx = -1;
  if (keys["d"] || keys["arrowright"]) dx = 1;

  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  player.isRunning = keys["shift"] && (dx !== 0 || dy !== 0);
  player.moving = dx !== 0 || dy !== 0;
  const speed = player.isRunning ? player.runSpeed : player.speed;

  if (dx !== 0 || dy !== 0) {
    player.direction = { x: dx, y: dy };
  }

  const newX = player.x + dx * speed * dt;
  if (!collidesWithWalls(newX, player.y, player.width, player.height)) {
    player.x = newX;
  }

  const newY = player.y + dy * speed * dt;
  if (!collidesWithWalls(player.x, newY, player.width, player.height)) {
    player.y = newY;
  }

  // Footsteps
  if (player.moving) {
    if (!player._stepTimer) player._stepTimer = 0;
    player._stepTimer += dt;
    const stepInterval = player.isRunning ? 0.2 : 0.35;
    if (player._stepTimer >= stepInterval) {
      player._stepTimer = 0;
      if (player.isRunning) sound.playRunStep();
      else sound.playFootstep();
    }
  }

  player.trailTimer += dt;
  if (player.trailTimer > 0.3) {
    player.soulTrail.push({ x: player.x, y: player.y });
    if (player.soulTrail.length > 40) player.soulTrail.shift();
    player.trailTimer = 0;
  }

  player.inLight = false;
  for (const candle of candles) {
    if (distanceBetween(player, candle) < candle.radius) {
      player.inLight = true;
      break;
    }
  }

  if (!player.inLight) {
    player.sanity -= 0.8 * dt;
  } else {
    player.sanity = Math.min(100, player.sanity + 5 * dt);
  }

  const distToPhantom = distanceBetween(player, phantom);
  if (distToPhantom < 150) {
    player.corruption += ((150 - distToPhantom) / 150) * 15 * dt;
  } else {
    player.corruption = Math.max(0, player.corruption - 2 * dt);
  }

  for (const soul of souls) {
    if (!soul.collected && rectsCollide(player, soul)) {
      soul.collected = true;
      player.souls++;
      soulFlashTimer = 0.3;
      sound.playSoulCollect();
      if (player.souls >= soulsNeeded) {
        exitRift.active = true;
        sound.playRiftOpen();
      }
    }
  }

  if (exitRift && exitRift.active && rectsCollide(player, exitRift)) {
    nextLevel();
  }

  if (keys["e"] && player.candles > 0) {
    keys["e"] = false;
    player.candles--;
    sound.playCandlePlace();
    candles.push({
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
      radius: 100,
      life: 30,
    });
  }

  if (keys["f"] && player.rocks > 0) {
    keys["f"] = false;
    player.rocks--;
    sound.playRockThrow();
    const throwDist = 200;
    rocks.push({
      x: player.x + player.direction.x * throwDist,
      y: player.y + player.direction.y * throwDist,
      timer: 3,
      noiseRadius: 200,
    });
  }

  if (player.sanity <= 0) gameOver("Your mind faded into nothing.");
  if (player.corruption >= 100) gameOver("You became one of them.");
  if (rectsCollide(player, phantom)) {
    sound.playJumpscare();
    gameOver("The shadow consumed you.");
  }

  document.getElementById("sanity-bar").style.width =
    Math.max(0, player.sanity) + "%";
  document.getElementById("corruption-bar").style.width =
    Math.min(100, player.corruption) + "%";
  document.getElementById("souls-text").textContent =
    player.souls + " / " + soulsNeeded;
  document.getElementById("candles-text").textContent = player.candles;
  document.getElementById("level-text").textContent =
    currentMode === "endless"
      ? "FLOOR " + endlessFloor
      : "LEVEL " + (currentLevel + 1);
}

// ── Move Phantom Toward Target ──
function moveToward(target, dt, speedMult) {
  const dx = target.x - phantom.x;
  const dy = target.y - phantom.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 4) {
    let moveX = (dx / dist) * phantom.speed * speedMult * dt;
    let moveY = (dy / dist) * phantom.speed * speedMult * dt;

    if (phantom.canPhase === true) {
      phantom.x += moveX;
      phantom.y += moveY;
      return;
    }

    const canMoveX = !collidesWithWalls(
      phantom.x + moveX,
      phantom.y,
      phantom.width,
      phantom.height,
    );
    const canMoveY = !collidesWithWalls(
      phantom.x,
      phantom.y + moveY,
      phantom.width,
      phantom.height,
    );

    if (canMoveX && canMoveY) {
      phantom.x += moveX;
      phantom.y += moveY;
    } else if (canMoveX) {
      phantom.x += moveX;
      const slideY = phantom.speed * speedMult * dt * 0.5;
      if (
        !collidesWithWalls(
          phantom.x,
          phantom.y + slideY,
          phantom.width,
          phantom.height,
        )
      ) {
        phantom.y += slideY;
      } else if (
        !collidesWithWalls(
          phantom.x,
          phantom.y - slideY,
          phantom.width,
          phantom.height,
        )
      ) {
        phantom.y -= slideY;
      }
    } else if (canMoveY) {
      phantom.y += moveY;
      const slideX = phantom.speed * speedMult * dt * 0.5;
      if (
        !collidesWithWalls(
          phantom.x + slideX,
          phantom.y,
          phantom.width,
          phantom.height,
        )
      ) {
        phantom.x += slideX;
      } else if (
        !collidesWithWalls(
          phantom.x - slideX,
          phantom.y,
          phantom.width,
          phantom.height,
        )
      ) {
        phantom.x -= slideX;
      }
    } else {
      const angles = [
        0,
        Math.PI / 2,
        Math.PI,
        Math.PI * 1.5,
        Math.PI / 4,
        (Math.PI * 3) / 4,
        (Math.PI * 5) / 4,
        (Math.PI * 7) / 4,
      ];
      for (const angle of angles) {
        const escapeX = Math.cos(angle) * phantom.speed * speedMult * dt;
        const escapeY = Math.sin(angle) * phantom.speed * speedMult * dt;
        if (
          !collidesWithWalls(
            phantom.x + escapeX,
            phantom.y + escapeY,
            phantom.width,
            phantom.height,
          )
        ) {
          phantom.x += escapeX;
          phantom.y += escapeY;
          break;
        }
      }
    }
  }
}

// ── Phantom AI Update ──
function updatePhantom(dt) {
  phantom.pulseTimer += dt;
  phantomAI.accelerationTimer += dt;
  phantom.opacity = 0.4 + Math.sin(phantom.pulseTimer * 2) * 0.15;

  switch (phantom.state) {
    case "IDLE":
      patrolWander(dt);
      checkPhantomSenses();
      phantomAI.alertLevel = Math.max(0, phantomAI.alertLevel - 10 * dt);
      break;
    case "ALERTED":
      if (phantomAI.lastKnownPlayer)
        moveToward(phantomAI.lastKnownPlayer, dt, 0.9);
      checkPhantomSenses();
      phantomAI.alertLevel += 20 * dt;
      if (phantomAI.alertLevel >= 100) {
        phantom.state = "HUNT";
        buildHuntGrid();
      }
      break;
    case "HUNT":
      huntPlayer(dt);
      checkPhantomSenses();
      break;
    case "CHASE":
      const chaseSpeed = Math.min(2.2, 1.5 + phantomAI.accelerationTimer * 0.1);
      moveToward(player, dt, chaseSpeed);
      phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
      if (!canDetectPlayer()) {
        phantom.state = "LOST";
        phantomAI.lostTimer = 5;
        phantomAI.accelerationTimer = 0;
      }
      break;
    case "LOST":
      if (phantomAI.lastKnownPlayer)
        moveToward(phantomAI.lastKnownPlayer, dt, 0.8);
      checkPhantomSenses();
      phantomAI.lostTimer -= dt;
      if (phantomAI.lostTimer <= 0) {
        phantomAI.alertLevel = 30;
        phantom.state = "IDLE";
      }
      break;
    case "SEARCH":
      patrolWander(dt);
      checkPhantomSenses();
      phantom.searchTimer -= dt;
      if (phantom.searchTimer <= 0) phantom.state = "IDLE";
      break;
  }

  for (let i = candles.length - 1; i >= 0; i--) {
    if (!candles[i].permanent) candles[i].life -= dt;
    if (candles[i].life <= 0) candles.splice(i, 1);
  }
  for (let i = rocks.length - 1; i >= 0; i--) {
    rocks[i].timer -= dt;
    if (rocks[i].timer <= 0) rocks.splice(i, 1);
  }
}

function patrolWander(dt) {
  phantom.wanderTimer -= dt;
  if (!phantomAI.lastPatrol || phantom.wanderTimer <= 0) {
    let found = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      const testX = phantom.x + (Math.random() - 0.5) * 400;
      const testY = phantom.y + (Math.random() - 0.5) * 400;
      if (!collidesWithWalls(testX, testY, phantom.width, phantom.height)) {
        phantomAI.lastPatrol = { x: testX, y: testY };
        found = true;
        break;
      }
    }
    if (!found)
      phantomAI.lastPatrol = {
        x: phantom.x + (Math.random() - 0.5) * 100,
        y: phantom.y + (Math.random() - 0.5) * 100,
      };
    phantom.wanderTimer = 2 + Math.random() * 3;
  }
  if (phantomAI.lastPatrol) moveToward(phantomAI.lastPatrol, dt, 0.5);
}

function buildHuntGrid() {
  if (!phantomAI.lastKnownPlayer) return;
  const cx = phantomAI.lastKnownPlayer.x;
  const cy = phantomAI.lastKnownPlayer.y;
  const spread = 100;
  phantomAI.huntGrid = [
    { x: cx, y: cy },
    { x: cx + spread, y: cy },
    { x: cx - spread, y: cy },
    { x: cx, y: cy + spread },
    { x: cx, y: cy - spread },
    { x: cx + spread, y: cy + spread },
    { x: cx - spread, y: cy - spread },
  ];
  phantomAI.huntIndex = 0;
}

function huntPlayer(dt) {
  if (phantomAI.huntGrid.length === 0) {
    phantom.state = "IDLE";
    return;
  }
  const target = phantomAI.huntGrid[phantomAI.huntIndex];
  moveToward(target, dt, 1.1);
  if (distanceBetween(phantom, target) < 30) {
    phantomAI.huntIndex++;
    if (phantomAI.huntIndex >= phantomAI.huntGrid.length) {
      phantom.state = "LOST";
      phantomAI.lostTimer = 3;
    }
  }
}

function canDetectPlayer() {
  if (distanceBetween(phantom, player) < 60) return true;
  if (
    phantom.canSense &&
    player.isRunning &&
    distanceBetween(phantom, player) < 180
  )
    return true;
  if (
    phantom.canManifest &&
    player.inLight &&
    distanceBetween(phantom, player) < 220 &&
    hasLineOfSight(phantom, player)
  )
    return true;
  if (
    phantom.canTrace &&
    player.soulTrail.length > 5 &&
    distanceBetween(phantom, player.soulTrail[0]) < 100
  )
    return true;
  return false;
}

function checkPhantomSenses() {
  for (const rock of rocks) {
    if (rock.timer > 0 && distanceBetween(phantom, rock) < rock.noiseRadius) {
      phantomAI.lastKnownPlayer = { x: rock.x, y: rock.y };
      phantom.target = { x: rock.x, y: rock.y };
      phantom.state = "ALERTED";
      phantomAI.alertLevel += 40;
      return;
    }
  }
  if (phantom.canSense && player.isRunning) {
    const dist = distanceBetween(phantom, player);
    if (dist < 180) {
      phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
      phantom.state = "ALERTED";
      phantomAI.alertLevel += 30 * (1 - dist / 180);
    }
  }
  if (phantom.canManifest && player.inLight) {
    const dist = distanceBetween(phantom, player);
    if (dist < 220 && hasLineOfSight(phantom, player)) {
      phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
      phantom.state = "CHASE";
      phantomAI.accelerationTimer = 0;
    }
  }
  if (phantom.canTrace && player.soulTrail.length > 3) {
    const trailPoint = player.soulTrail[0];
    if (distanceBetween(phantom, trailPoint) < 150) {
      phantomAI.lastKnownPlayer = { x: trailPoint.x, y: trailPoint.y };
      phantom.target = trailPoint;
      phantom.state = "ALERTED";
      phantomAI.alertLevel += 20;
      if (distanceBetween(phantom, trailPoint) < 20) player.soulTrail.shift();
    }
  }
  if (distanceBetween(phantom, player) < 80) {
    phantom.state = "CHASE";
    phantomAI.accelerationTimer = 0;
  }
}

// ── Second Phantom ──
function updateSecondPhantom(dt) {
  if (!secondPhantom) return;
  secondPhantom.pulseTimer += dt;
  secondPhantom.wanderTimer -= dt;
  const dist = distanceBetween(secondPhantom, player);

  if (dist < 200) {
    moveSecondPhantom(player, dt, 1.2);
    secondPhantom.state = "CHASE";
  } else {
    if (!secondPhantom.wanderTarget || secondPhantom.wanderTimer <= 0) {
      secondPhantom.wanderTarget = {
        x: secondPhantom.x + (Math.random() - 0.5) * 300,
        y: secondPhantom.y + (Math.random() - 0.5) * 300,
      };
      secondPhantom.wanderTimer = 3 + Math.random() * 2;
    }
    moveSecondPhantom(secondPhantom.wanderTarget, dt, 0.6);
    secondPhantom.state = "IDLE";
  }

  if (rectsCollide(player, secondPhantom)) {
    sound.playJumpscare();
    if (currentMode === "story") gameOver("A second shadow consumed you.");
    else endlessGameOver();
  }
}

function moveSecondPhantom(target, dt, speedMult) {
  const dx = target.x - secondPhantom.x;
  const dy = target.y - secondPhantom.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 4) {
    const moveX = (dx / dist) * secondPhantom.speed * speedMult * dt;
    const moveY = (dy / dist) * secondPhantom.speed * speedMult * dt;
    if (
      !collidesWithWalls(
        secondPhantom.x + moveX,
        secondPhantom.y,
        secondPhantom.width,
        secondPhantom.height,
      )
    ) {
      secondPhantom.x += moveX;
    }
    if (
      !collidesWithWalls(
        secondPhantom.x,
        secondPhantom.y + moveY,
        secondPhantom.width,
        secondPhantom.height,
      )
    ) {
      secondPhantom.y += moveY;
    }
  }
}

// ── Particles ──
function updateParticles(dt) {
  if (Math.random() < 0.1) {
    particles.push({
      x: camera.x + Math.random() * canvas.width,
      y: camera.y + canvas.height + 5,
      speed: 10 + Math.random() * 20,
      size: 1 + Math.random() * 2,
      opacity: 0.1 + Math.random() * 0.3,
      drift: (Math.random() - 0.5) * 15,
    });
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.y -= p.speed * dt;
    p.x += p.drift * dt;
    p.opacity -= 0.05 * dt;
    if (p.y < camera.y - 10 || p.opacity <= 0) particles.splice(i, 1);
  }
}

// ── RENDER ──
function render() {
  if (!sprites.loaded) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0a0812";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Floors
  if (sprites.sprites.floor) {
    for (let row = 0; row < currentMapRows; row++) {
      for (let col = 0; col < currentMapCols; col++) {
        ctx.drawImage(
          sprites.sprites.floor,
          col * TILE_SIZE,
          row * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE,
        );
      }
    }
    ctx.fillStyle = "rgba(10, 0, 20, 0.75)";
    ctx.fillRect(0, 0, currentMapCols * TILE_SIZE, currentMapRows * TILE_SIZE);
  }

  // Particles
  for (const p of particles) {
    ctx.fillStyle = `rgba(150, 130, 255, ${p.opacity})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Walls
  for (const wall of walls) {
    if (sprites.sprites.wall) {
      ctx.drawImage(sprites.sprites.wall, wall.x, wall.y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "rgba(20, 0, 30, 0.3)";
      ctx.fillRect(wall.x, wall.y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillStyle = "rgba(20, 0, 30, 0.3)";
      ctx.fillRect(wall.x, wall.y, TILE_SIZE, TILE_SIZE);
    } else {
      ctx.fillStyle = "#1a1425";
      ctx.fillRect(wall.x, wall.y, TILE_SIZE, TILE_SIZE);
    }
  }

  // Soul trail
  if (phantom.canTrace) {
    for (let i = 0; i < player.soulTrail.length; i++) {
      const t = player.soulTrail[i];
      const alpha = (i / player.soulTrail.length) * 0.3;
      ctx.fillStyle = `rgba(107, 0, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x + 16, t.y + 16, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Souls
  for (const soul of souls) {
    if (!soul.collected) {
      const bob = Math.sin(gameTime * 3 + soul.x) * 3;
      if (sprites.sprites.soul) {
        ctx.drawImage(sprites.sprites.soul, soul.x, soul.y + bob, 24, 24);
      } else {
        ctx.fillStyle = "#aaccff";
        ctx.beginPath();
        ctx.arc(soul.x + 12, soul.y + 12 + bob, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Exit Rift
  if (exitRift) {
    if (exitRift.active) {
      const riftPulse = 1.3 + Math.sin(gameTime * 4) * 0.15;
      const riftSize = TILE_SIZE * riftPulse;
      const riftOffset = (riftSize - TILE_SIZE) / 2;
      if (sprites.sprites.rift) {
        ctx.save();
        ctx.shadowColor = "#00ffaa";
        ctx.shadowBlur = 30;
        ctx.drawImage(
          sprites.sprites.rift,
          exitRift.x - riftOffset,
          exitRift.y - riftOffset,
          riftSize,
          riftSize,
        );
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    } else {
      if (sprites.sprites.rift) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.drawImage(
          sprites.sprites.rift,
          exitRift.x,
          exitRift.y,
          TILE_SIZE,
          TILE_SIZE,
        );
        ctx.restore();
      }
    }
  }

  // Candles
  for (const candle of candles) {
    if (sprites.sprites.candle)
      ctx.drawImage(sprites.sprites.candle, candle.x - 8, candle.y - 4, 16, 16);
    ctx.strokeStyle = "rgba(255, 170, 0, 0.05)";
    ctx.beginPath();
    ctx.arc(candle.x, candle.y, candle.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Rocks
  for (const rock of rocks) {
    if (sprites.sprites.rock) {
      ctx.drawImage(sprites.sprites.rock, rock.x - 6, rock.y - 6, 12, 12);
    }
    if (rock.timer > 0) {
      const wave = (3 - rock.timer) / 3;
      ctx.strokeStyle = `rgba(255, 255, 100, ${0.2 - wave * 0.2})`;
      ctx.beginPath();
      ctx.arc(rock.x, rock.y, wave * rock.noiseRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Player
  const playerSprite = sprites.sprites.player;
  if (playerSprite) {
    ctx.drawImage(
      playerSprite,
      player.x,
      player.y,
      player.width,
      player.height,
    );
  } else {
    ctx.fillStyle = "#c8d8ff";
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }

  if (player.isRunning) {
    ctx.strokeStyle = "rgba(255, 100, 100, 0.3)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(
      player.x + player.width / 2,
      player.y + player.height / 2,
      30,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Phantom
  const pcenterX = phantom.x + phantom.width / 2;
  const pcenterY = phantom.y + phantom.height / 2;
  const phantomSprite = sprites.sprites.phantom;
  const phantomAlpha = 0.7 + Math.sin(phantom.pulseTimer * 2) * 0.2;

  if (phantomSprite) {
    ctx.save();
    ctx.globalAlpha = phantomAlpha;
    ctx.shadowColor = phantom.state === "CHASE" ? "#ff0000" : "#8800ff";
    ctx.shadowBlur = phantom.state === "CHASE" ? 25 : 15;
    ctx.drawImage(
      phantomSprite,
      phantom.x - 4,
      phantom.y - 4,
      TILE_SIZE,
      TILE_SIZE,
    );

    if (phantom.state === "CHASE" || phantom.state === "HUNT") {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
      ctx.fillRect(phantom.x - 4, phantom.y - 4, TILE_SIZE, TILE_SIZE);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Demonic red eyes ON the phantom's face
  const eyeGlow = 0.7 + Math.sin(phantom.pulseTimer * 4) * 0.3;
  const eyeSize = phantom.state === "CHASE" ? 2.5 : 2;
  ctx.save();
  ctx.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(pcenterX - 5, pcenterY - 4, eyeSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pcenterX + 5, pcenterY - 4, eyeSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Second Phantom
  if (secondPhantom) {
    const sp = secondPhantom;
    const spCX = sp.x + sp.width / 2;
    const spCY = sp.y + sp.height / 2;

    ctx.save();
    for (let i = 0; i < 4; i++) {
      const angle = (sp.pulseTimer * 0.7 + i * 1.57) % (Math.PI * 2);
      const length = 12 + Math.sin(sp.pulseTimer * 2 + i) * 8;
      ctx.strokeStyle = "rgba(155, 0, 200, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(spCX, spCY);
      ctx.quadraticCurveTo(
        spCX + Math.cos(angle + 0.5) * length * 0.5,
        spCY + Math.sin(angle + 0.5) * length * 0.5,
        spCX + Math.cos(angle) * length,
        spCY + Math.sin(angle) * length,
      );
      ctx.stroke();
    }
    ctx.restore();

    if (sprites.sprites.phantom2) {
      const spAlpha = 0.6 + Math.sin(sp.pulseTimer * 2.5) * 0.15;
      ctx.save();
      ctx.globalAlpha = spAlpha;
      ctx.shadowColor = "#cc00ff";
      ctx.shadowBlur = 20;
      ctx.drawImage(
        sprites.sprites.phantom2,
        sp.x - 4,
        sp.y - 4,
        TILE_SIZE,
        TILE_SIZE,
      );
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Glowing eyes for the second phantom
    const spEyeGlow = 0.6 + Math.sin(sp.pulseTimer * 4) * 0.3;
    ctx.save();
    ctx.fillStyle = `rgba(200, 0, 255, ${spEyeGlow})`;
    ctx.shadowColor = "#cc00ff";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(spCX - 5, spCY - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(spCX + 5, spCY - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  ctx.restore();

  // ── SCREEN SPACE ──
  drawDarkness();

  if (soulFlashTimer > 0) {
    soulFlashTimer -= 0.016;
    ctx.fillStyle = `rgba(200, 216, 255, ${soulFlashTimer})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const distToPhantom = distanceBetween(player, phantom);

  sound.updatePhantomDrone(distToPhantom);
  if (!player._heartbeatTimer) player._heartbeatTimer = 0;
  if (distToPhantom < 200) {
    player._heartbeatTimer += 0.016;
    const heartInterval = 0.3 + (distToPhantom / 200) * 0.7;
    if (player._heartbeatTimer >= heartInterval) {
      player._heartbeatTimer = 0;
      sound.playHeartbeat();
    }
  } else {
    player._heartbeatTimer = 0;
  }

  if (distToPhantom < 200) {
    const heartRate = Math.max(0.5, distToPhantom / 200) * 2;
    const heartBeat = Math.abs(Math.sin(gameTime * (Math.PI / heartRate)));
    const heartAlpha = ((200 - distToPhantom) / 200) * 0.08 * heartBeat;
    ctx.fillStyle = `rgba(255, 0, 0, ${heartAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (distToPhantom < 250) {
    const intensity = (250 - distToPhantom) / 250;
    const vignetteCanvas = document.createElement("canvas");
    vignetteCanvas.width = canvas.width;
    vignetteCanvas.height = canvas.height;
    const vCtx = vignetteCanvas.getContext("2d");
    const gradient = vCtx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.3,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.7,
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, `rgba(80, 0, 0, ${intensity * 0.5})`);
    vCtx.fillStyle = gradient;
    vCtx.fillRect(0, 0, vignetteCanvas.width, vignetteCanvas.height);
    ctx.drawImage(vignetteCanvas, 0, 0);
  }

  if (player.corruption > 30) {
    const ci = (player.corruption - 30) / 70;
    ctx.fillStyle = `rgba(100, 0, 180, ${ci * 0.15})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (player.sanity < 30) {
    if (Math.random() < 0.05) {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + Math.random() * 0.4})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // HORROR EFFECTS
  if (phantom.state === "CHASE" || phantom.state === "HUNT") {
    if (Math.random() < 0.15) {
      const tearY = Math.floor(Math.random() * canvas.height);
      const tearHeight = 3 + Math.floor(Math.random() * 15);
      const tearShift = (Math.random() - 0.5) * 50;
      try {
        const imageData = ctx.getImageData(
          0,
          Math.max(0, tearY),
          canvas.width,
          Math.min(tearHeight, canvas.height - tearY),
        );
        ctx.putImageData(imageData, tearShift, tearY);
      } catch (e) {}
    }
    if (Math.random() < 0.04) {
      ctx.globalCompositeOperation = "difference";
      ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
    }
    if (Math.random() < 0.06) {
      try {
        const shift = 3 + Math.random() * 5;
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imgData, shift, 0);
        ctx.fillStyle = "rgba(255, 0, 0, 0.03)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } catch (e) {}
    }
  }

  if (distToPhantom < 300 && Math.random() < 0.025) {
    sound.playWhisper();
    const whispers = [
      "I SEE YOU",
      "RUN",
      "BEHIND YOU",
      "CLOSER",
      "YOU CANT HIDE",
      "IM LEARNING",
      "DONT BREATHE",
      "LOOK AWAY",
      "ITS TOO LATE",
      "I REMEMBER YOU",
      "YOURE MINE",
      "COME CLOSER",
      "DONT TURN AROUND",
      "I CAN SMELL YOUR FEAR",
    ];
    const whisper = whispers[Math.floor(Math.random() * whispers.length)];
    const wx = 50 + Math.random() * (canvas.width - 200);
    const wy = 50 + Math.random() * (canvas.height - 100);
    ctx.save();
    ctx.globalAlpha = 0.08 + Math.random() * 0.12;
    ctx.fillStyle = "#ff0033";
    ctx.font = `${16 + Math.random() * 28}px monospace`;
    ctx.fillText(whisper, wx, wy);
    ctx.restore();
  }

  if (player.sanity < 50) {
    const intensity = (50 - player.sanity) / 50;
    if (Math.random() < intensity * 0.5) {
      const stripY = Math.floor(Math.random() * canvas.height);
      const stripH = 1 + Math.floor(Math.random() * 4);
      ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.05})`;
      ctx.fillRect(0, stripY, canvas.width, stripH);
    }
    if (Math.random() < intensity * 0.02) {
      for (let i = 0; i < 50; i++) {
        const sx = Math.random() * canvas.width;
        const sy = Math.random() * canvas.height;
        const ss = 1 + Math.random() * 3;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
        ctx.fillRect(sx, sy, ss, ss);
      }
    }
  }

  if (Math.random() < 0.008 && distToPhantom > 150) {
    const screenX = Math.random() * canvas.width;
    const screenY = Math.random() * canvas.height;
    const distFromPlayer = Math.sqrt(
      Math.pow(screenX - (player.x - camera.x + player.width / 2), 2) +
        Math.pow(screenY - (player.y - camera.y + player.height / 2), 2),
    );
    if (distFromPlayer > 180) {
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.random() * 0.15;
      ctx.fillStyle = "#ff0000";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.ellipse(screenX - 7, screenY, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(screenX + 7, screenY, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  if (Math.random() < 0.004) {
    const side = Math.floor(Math.random() * 4);
    let sx, sy;
    switch (side) {
      case 0:
        sx = 10;
        sy = Math.random() * canvas.height;
        break;
      case 1:
        sx = canvas.width - 30;
        sy = Math.random() * canvas.height;
        break;
      case 2:
        sx = Math.random() * canvas.width;
        sy = 10;
        break;
      case 3:
        sx = Math.random() * canvas.width;
        sy = canvas.height - 30;
        break;
    }
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#1a0030";
    ctx.fillRect(sx, sy - 20, 8, 40);
    ctx.beginPath();
    ctx.arc(sx + 4, sy - 24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (player.corruption > 20) {
    const breathe = Math.sin(gameTime * 2) * (player.corruption / 100) * 0.08;
    ctx.fillStyle = `rgba(80, 0, 120, ${breathe > 0 ? breathe : 0})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ── Darkness System ──
function drawDarkness() {
  const darkCanvas = document.createElement("canvas");
  darkCanvas.width = canvas.width;
  darkCanvas.height = canvas.height;
  const dCtx = darkCanvas.getContext("2d");

  dCtx.fillStyle = "rgba(0, 0, 0, 0.94)";
  dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
  dCtx.globalCompositeOperation = "destination-out";

  const pcx = player.x - camera.x + player.width / 2;
  const pcy = player.y - camera.y + player.height / 2;
  const visionRadius = player.isRunning ? 85 : 105;

  const playerGlow = dCtx.createRadialGradient(
    pcx,
    pcy,
    10,
    pcx,
    pcy,
    visionRadius,
  );
  playerGlow.addColorStop(0, "rgba(0,0,0,1)");
  playerGlow.addColorStop(1, "rgba(0,0,0,0)");
  dCtx.fillStyle = playerGlow;
  dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);

  for (const candle of candles) {
    const cx = candle.x - camera.x;
    const cy = candle.y - camera.y;
    const candleGlow = dCtx.createRadialGradient(
      cx,
      cy,
      5,
      cx,
      cy,
      candle.radius,
    );
    candleGlow.addColorStop(0, "rgba(0,0,0,1)");
    candleGlow.addColorStop(1, "rgba(0,0,0,0)");
    dCtx.fillStyle = candleGlow;
    dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
  }

  if (exitRift && exitRift.active) {
    const rx = exitRift.x + 24 - camera.x;
    const ry = exitRift.y + 24 - camera.y;
    const riftGlow = dCtx.createRadialGradient(rx, ry, 5, rx, ry, 80);
    riftGlow.addColorStop(0, "rgba(0,0,0,0.8)");
    riftGlow.addColorStop(1, "rgba(0,0,0,0)");
    dCtx.fillStyle = riftGlow;
    dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
  }

  for (const soul of souls) {
    if (!soul.collected) {
      const sx = soul.x + 12 - camera.x;
      const sy = soul.y + 12 - camera.y;
      const soulGlow = dCtx.createRadialGradient(sx, sy, 3, sx, sy, 50);
      soulGlow.addColorStop(0, "rgba(0,0,0,0.6)");
      soulGlow.addColorStop(1, "rgba(0,0,0,0)");
      dCtx.fillStyle = soulGlow;
      dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
    }
  }

  ctx.drawImage(darkCanvas, 0, 0);
}

// ── Scene Management ──
function showStory(text, callback) {
  waitingForStory = true;
  currentState = GameState.TRANSITION;
  const overlay = document.getElementById("story-overlay");
  const storyText = document.getElementById("story-text");
  storyText.innerHTML = text;
  storyText.style.animation = "none";
  storyText.offsetHeight;
  storyText.style.animation = "storyFadeIn 3s ease forwards";
  const prompt = document.getElementById("story-prompt");
  prompt.style.animation = "none";
  prompt.offsetHeight;
  prompt.style.animation = "storyPromptIn 1s ease 3.5s forwards";
  overlay.classList.remove("hidden");
  document.getElementById("ui-layer").style.display = "none";
  storyCallback = callback;
}

function showTransition(levelIdx) {
  sound.playMutationReveal();
  currentState = GameState.TRANSITION;
  const level = LEVELS[levelIdx];
  const overlay = document.getElementById("transition-overlay");
  overlay.classList.remove("hidden");
  document.getElementById("transition-level").textContent =
    currentMode === "endless"
      ? "Floor " + endlessFloor
      : "Level " + (levelIdx + 1);
  document.getElementById("transition-ability").textContent = level.ability;
  document
    .getElementById("transition-ability")
    .setAttribute("data-text", level.ability);
  document.getElementById("transition-description").textContent =
    level.description;
  document.getElementById("ui-layer").style.display = "none";
}

function startLevel() {
  document.getElementById("transition-overlay").classList.add("hidden");
  document.getElementById("ui-layer").style.display = "block";
  loadLevel(currentLevel);
  currentState = GameState.PLAYING;
}

function nextLevel() {
  sound.playLevelComplete();
  if (currentMode === "endless") {
    endlessScore += endlessFloor * 100;
    endlessFloor++;
    startEndlessFloor();
  } else {
    currentLevel++;
    if (currentLevel >= LEVELS.length) {
      showStory(STORY.ending, () => winGame());
    } else {
      const chapter = Math.floor(currentLevel / 2);
      const levelInChapter = currentLevel % 2;
      if (
        STORY.chapters[chapter] &&
        STORY.chapters[chapter].before[levelInChapter]
      ) {
        showStory(STORY.chapters[chapter].before[levelInChapter], () => {
          showTransition(currentLevel);
        });
      } else {
        showTransition(currentLevel);
      }
    }
  }
}

function gameOver(reason) {
  sound.playDeath();
  const wrapper = document.getElementById("game-wrapper");
  wrapper.style.animation = "screenShake 0.4s ease";
  setTimeout(() => {
    wrapper.style.animation = "";
  }, 400);

  const bloodOverlay = document.createElement("div");
  bloodOverlay.style.cssText = `
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(circle at center, rgba(150, 0, 0, 0.8) 0%, rgba(80, 0, 0, 0.4) 40%, rgba(0, 0, 0, 0) 100%);
    z-index: 140; pointer-events: none; animation: bloodFade 1.5s forwards;
  `;
  wrapper.appendChild(bloodOverlay);
  setTimeout(() => bloodOverlay.remove(), 1500);

  if (currentMode === "endless") {
    endlessGameOver();
    return;
  }
  currentState = GameState.GAMEOVER;
  document.getElementById("ui-layer").style.display = "none";
  document.getElementById("gameover-overlay").classList.remove("hidden");
  document.getElementById("gameover-reason").textContent = reason;
  document.getElementById("gameover-level").textContent =
    "Reached Level " + (currentLevel + 1);
}

function winGame() {
  currentState = GameState.WIN;
  document.getElementById("ui-layer").style.display = "none";
  document.getElementById("win-overlay").classList.remove("hidden");
  document.getElementById("win-stats").innerHTML =
    `Levels Survived: ${LEVELS.length}<br>Time: ${Math.floor(gameTime)}s`;
}

function returnToMenu() {
  currentState = GameState.MENU;
  currentLevel = 0;
  currentMode = "story";
  endlessFloor = 1;
  endlessScore = 0;
  gameTime = 0;
  phantom.reset();
  waitingForStory = false;
  storyCallback = null;
  document.getElementById("gameover-overlay").classList.add("hidden");
  document.getElementById("win-overlay").classList.add("hidden");
  document.getElementById("endless-over-overlay").classList.add("hidden");
  document.getElementById("chapter-overlay").classList.add("hidden");
  document.getElementById("story-overlay").classList.add("hidden");
  document.getElementById("ui-layer").style.display = "none";
  document.getElementById("menu-overlay").style.display = "flex";
}

// ── ENDLESS MODE ──
const ENDLESS_MUTATIONS = [
  "canSense",
  "canManifest",
  "canTrace",
  "canPhase",
  "canSplit",
];

function generateEndlessMap(floor) {
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

  const wallRows = 3 + Math.floor(floor / 3);
  for (let i = 0; i < wallRows; i++) {
    const wy = 3 + Math.floor(Math.random() * (rows - 6));
    const startX = 2 + Math.floor(Math.random() * 6);
    const len = 3 + Math.floor(Math.random() * 5);
    const gapPos = startX + Math.floor(Math.random() * len);
    for (let j = 0; j < len && startX + j < cols - 2; j++) {
      const cx = startX + j;
      if (cx !== gapPos && cx !== gapPos + 1)
        map[wy] = map[wy].substring(0, cx) + "#" + map[wy].substring(cx + 1);
    }
  }

  const vWalls = 2 + Math.floor(floor / 4);
  for (let i = 0; i < vWalls; i++) {
    const wx = 3 + Math.floor(Math.random() * (cols - 6));
    const startY = 2 + Math.floor(Math.random() * 6);
    const len = 3 + Math.floor(Math.random() * 4);
    const gapPos = startY + Math.floor(Math.random() * len);
    for (let j = 0; j < len && startY + j < rows - 2; j++) {
      const cy = startY + j;
      if (cy !== gapPos && cy !== gapPos + 1)
        map[cy] = map[cy].substring(0, wx) + "#" + map[cy].substring(wx + 1);
    }
  }

  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 3; c++)
      map[r] = map[r].substring(0, c) + "." + map[r].substring(c + 1);
  }
  for (let r = rows - 4; r <= rows - 2; r++) {
    for (let c = cols - 4; c <= cols - 2; c++)
      map[r] = map[r].substring(0, c) + "." + map[r].substring(c + 1);
  }

  map[2] = map[2].substring(0, 2) + "@" + map[2].substring(3);
  map[rows - 3] =
    map[rows - 3].substring(0, cols - 3) +
    "P" +
    map[rows - 3].substring(cols - 2);

  const soulCount = 3 + Math.floor(floor / 2);
  let placed = 0;
  let attempts = 0;
  while (placed < soulCount && attempts < 300) {
    const sx = 2 + Math.floor(Math.random() * (cols - 4));
    const sy = 2 + Math.floor(Math.random() * (rows - 4));
    if (map[sy][sx] === ".") {
      map[sy] = map[sy].substring(0, sx) + "S" + map[sy].substring(sx + 1);
      placed++;
    }
    attempts++;
  }

  map[rows - 2] =
    map[rows - 2].substring(0, cols - 2) +
    "E" +
    map[rows - 2].substring(cols - 1);
  return map;
}

function startEndlessFloor() {
  const map = generateEndlessMap(endlessFloor);
  const mutationsForFloor = {};
  ENDLESS_MUTATIONS.forEach((m, i) => {
    if (endlessFloor >= (i + 1) * 5) mutationsForFloor[m] = true;
  });

  const endlessLevel = {
    name: "FLOOR " + endlessFloor,
    ability:
      endlessFloor % 5 === 0
        ? ENDLESS_MUTATIONS[
            Math.min(
              Math.floor(endlessFloor / 5) - 1,
              ENDLESS_MUTATIONS.length - 1,
            )
          ]
            .replace("can", "")
            .toUpperCase()
        : "DRIFT",
    description: `"Floor ${endlessFloor}. It grows stronger."`,
    mutations: mutationsForFloor,
    soulsNeeded: 3 + Math.floor(endlessFloor / 2),
    phantomSpeed: 50 + endlessFloor * 2,
    map: map,
  };

  LEVELS[currentLevel] = endlessLevel;
  if (endlessFloor === 1 || endlessFloor % 5 === 0)
    showTransition(currentLevel);
  else startLevel();
}

function endlessGameOver() {
  currentState = GameState.GAMEOVER;
  document.getElementById("ui-layer").style.display = "none";
  document.getElementById("endless-over-overlay").classList.remove("hidden");
  document.getElementById("endless-floor").textContent =
    "Floor Reached: " + endlessFloor;
  document.getElementById("endless-score").textContent =
    "Score: " + endlessScore;
}

// ── Game Loop ──
function gameLoop(timestamp) {
  if (lastTime === 0) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (currentState === GameState.PLAYING) {
    gameTime += dt;
    if (Math.random() < 0.003) sound.playAmbientScare();
    updatePlayer(dt);
    updatePhantom(dt);
    updateSecondPhantom(dt);
    updateParticles(dt);
    camera.update(dt);
    render();
  }

  requestAnimationFrame(gameLoop);
}

// ── Button Events ──
document.getElementById("story-button").addEventListener("click", () => {
  sound.init();
  sound.startAmbient();
  sound.startPhantomDrone();
  document.getElementById("menu-overlay").style.display = "none";
  document.getElementById("chapter-overlay").classList.remove("hidden");
});

document.querySelectorAll(".chapter-card").forEach((card) => {
  card.addEventListener("click", () => {
    const chapter = parseInt(card.getAttribute("data-chapter"));
    const chapterStartLevels = [0, 2, 4];
    currentLevel = chapterStartLevels[chapter];
    currentMode = "story";
    document.getElementById("chapter-overlay").classList.add("hidden");
    phantom.reset();
    gameTime = 0;

    if (chapter === 0) {
      showStory(STORY.intro, () => {
        showStory(STORY.chapters[0].before[0], () =>
          showTransition(currentLevel),
        );
      });
    } else {
      showStory(STORY.chapters[chapter].before[0], () =>
        showTransition(currentLevel),
      );
    }
  });
});

document.getElementById("chapter-back-button").addEventListener("click", () => {
  document.getElementById("chapter-overlay").classList.add("hidden");
  document.getElementById("menu-overlay").style.display = "flex";
});

document.getElementById("endless-button").addEventListener("click", () => {
  sound.init();
  sound.startAmbient();
  sound.startPhantomDrone();
  document.getElementById("menu-overlay").style.display = "none";
  currentMode = "endless";
  currentLevel = 0;
  endlessFloor = 1;
  endlessScore = 0;
  phantom.reset();
  gameTime = 0;
  startEndlessFloor();
});

document.getElementById("retry-button").addEventListener("click", () => {
  document.getElementById("gameover-overlay").classList.add("hidden");
  document.getElementById("ui-layer").style.display = "block";
  phantom.reset();
  for (let i = 0; i <= currentLevel; i++) {
    if (LEVELS[i] && LEVELS[i].mutations) {
      Object.keys(LEVELS[i].mutations).forEach((key) => {
        phantom[key] = LEVELS[i].mutations[key];
      });
    }
  }
  loadLevel(currentLevel);
  currentState = GameState.PLAYING;
});

document.getElementById("menu-button").addEventListener("click", returnToMenu);
document
  .getElementById("play-again-button")
  .addEventListener("click", returnToMenu);

document
  .getElementById("endless-retry-button")
  .addEventListener("click", () => {
    document.getElementById("endless-over-overlay").classList.add("hidden");
    currentMode = "endless";
    currentLevel = 0;
    endlessFloor = 1;
    endlessScore = 0;
    phantom.reset();
    gameTime = 0;
    startEndlessFloor();
  });

document
  .getElementById("endless-menu-button")
  .addEventListener("click", returnToMenu);

// ── MOBILE ──
const isMobile =
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  window.innerWidth < 768;

if (isMobile) {
  document.getElementById("mobile-controls").classList.remove("hidden");
  const scale = Math.min(
    window.innerWidth / canvas.width,
    window.innerHeight / canvas.height,
  );
  document.getElementById("game-wrapper").style.transform = `scale(${scale})`;
  document.getElementById("game-wrapper").style.transformOrigin = "top left";
}

const joystickThumb = document.getElementById("joystick-thumb");
const joystickBase = document.getElementById("joystick-base");
let joystickActive = false;
let joystickOrigin = { x: 0, y: 0 };

joystickBase.addEventListener("touchstart", (e) => {
  joystickActive = true;
  joystickOrigin = { x: e.touches[0].clientX, y: e.touches[0].clientY };
});

joystickBase.addEventListener(
  "touchmove",
  (e) => {
    if (!joystickActive) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - joystickOrigin.x;
    const dy = touch.clientY - joystickOrigin.y;
    const dist = Math.min(40, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);
    joystickThumb.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
    keys["w"] = dy < -10;
    keys["s"] = dy > 10;
    keys["a"] = dx < -10;
    keys["d"] = dx > 10;
  },
  { passive: false },
);

joystickBase.addEventListener("touchend", () => {
  joystickActive = false;
  joystickThumb.style.transform = "translate(0px, 0px)";
  keys["w"] = false;
  keys["s"] = false;
  keys["a"] = false;
  keys["d"] = false;
});

document.getElementById("mobile-run").addEventListener("touchstart", () => {
  keys["shift"] = true;
});
document.getElementById("mobile-run").addEventListener("touchend", () => {
  keys["shift"] = false;
});
document.getElementById("mobile-candle").addEventListener("touchstart", () => {
  keys["e"] = true;
});
document.getElementById("mobile-candle").addEventListener("touchend", () => {
  keys["e"] = false;
});
document.getElementById("mobile-rock").addEventListener("touchstart", () => {
  keys["f"] = true;
});
document.getElementById("mobile-rock").addEventListener("touchend", () => {
  keys["f"] = false;
});

// ── START ──
sprites.load().then(() => {
  console.log("Sprites ready — starting game");
  requestAnimationFrame(gameLoop);
});
