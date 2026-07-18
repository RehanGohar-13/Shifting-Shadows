// ============================================
// SHIFTING SHADOWS — Main (Orchestrator)
// ============================================

import { sprites } from "./systems/sprites.js";
import { sound } from "./systems/sound-system.js";
import { camera } from "./systems/camera.js";
import {
  keys,
  initInput,
  setSpaceCallback,
  initMobileControls,
} from "./systems/input.js";
import { render } from "./systems/renderer.js";
import { updatePlayer } from "./systems/player-controller.js";
import { updatePhantom, updateSecondPhantom } from "./systems/phantom-ai.js";
import { player } from "./entities/player.js";
import { phantom } from "./entities/phantom.js";
import { LEVELS } from "./levels/level-data.js";
import { loadLevel, levelState } from "./levels/level-manager.js";
import {
  STORY,
  showStory,
  advanceStory,
  isWaitingForStory,
  resetStory,
} from "./systems/story.js";
import { createEndlessLevel, getHellPhase } from "./systems/endless-mode.js";
import {
  loadProgress,
  completeChapter,
  updateEndlessRecord,
} from "./systems/progress.js";
import {
  startNightmare,
  updateNightmare,
  nightmareState,
  getRandomNightmareMap,
  endNightmare,
} from "./systems/nightmare-mode.js";

// ── Canvas Setup ──
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1200;
canvas.height = 800;
ctx.imageSmoothingEnabled = false;

camera.init(canvas);

// ── Game State ──
const GameState = {
  MENU: "menu",
  PLAYING: "playing",
  TRANSITION: "transition",
  GAMEOVER: "gameover",
  WIN: "win",
};

const state = {
  current: GameState.MENU,
  currentLevel: 0,
  currentMode: "story",
  endlessFloor: 1,
  endlessScore: 0,
  gameTime: 0,
  lastTime: 0,
};

// ── Input Setup ──
initInput();
initMobileControls(canvas);

setSpaceCallback(() => {
  if (isWaitingForStory()) {
    advanceStory();
    return;
  }
  if (state.current === GameState.TRANSITION) {
    startLevel();
  }
});

// ── Tutorial Hints ──
const tutorialHints = {
  shown: {
    movement: false,
    run: false,
    candle: false,
    rock: false,
    soulPickup: false,
    delivery: false,
  },
};

function showHint(text, duration = 2.5) {
  const existing = document.querySelectorAll(".tutorial-hint");
  existing.forEach((el) => el.remove());

  const hint = document.createElement("div");
  hint.className = "tutorial-hint";
  hint.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: rgba(200, 216, 255, 0.9);
    font-family: 'Share Tech Mono', monospace;
    font-size: 14px;
    letter-spacing: 3px;
    text-align: center;
    z-index: 15;
    pointer-events: none;
    background: rgba(5, 5, 8, 0.85);
    padding: 16px 32px;
    border: 1px solid rgba(107, 0, 255, 0.4);
    text-shadow: 0 0 8px rgba(200, 216, 255, 0.5);
    animation: hintFade ${duration}s forwards;
  `;
  hint.innerHTML = text;
  document.getElementById("game-wrapper").appendChild(hint);
  setTimeout(() => hint.remove(), duration * 1000);
}

function resetTutorial() {
  tutorialHints.shown.movement = false;
  tutorialHints.shown.run = false;
  tutorialHints.shown.candle = false;
  tutorialHints.shown.rock = false;
  tutorialHints.shown.soulPickup = false;
  tutorialHints.shown.delivery = false;
}

function updateTutorial() {
  if (state.currentMode !== "story") return;

  if (state.currentLevel === 0) {
    if (
      !tutorialHints.shown.movement &&
      state.gameTime > 1 &&
      state.gameTime < 2
    ) {
      tutorialHints.shown.movement = true;
      showHint("WASD to move", 2.5);
    }

    if (!tutorialHints.shown.run && state.gameTime > 8 && state.gameTime < 9) {
      tutorialHints.shown.run = true;
      showHint(
        'SHIFT to run<br><span style="color:#ff5566;font-size:11px">but running makes noise</span>',
        2.5,
      );
    }

    if (!tutorialHints.shown.soulPickup && !player.carrying) {
      for (const soul of levelState.souls) {
        if (!soul.collected) {
          const dx = soul.x - player.x;
          const dy = soul.y - player.y;
          if (Math.sqrt(dx * dx + dy * dy) < 100) {
            tutorialHints.shown.soulPickup = true;
            showHint(
              'Pick up the soul<br><span style="color:#aaccff;font-size:11px">carry it to the rift</span>',
              2.5,
            );
            break;
          }
        }
      }
    }

    if (!tutorialHints.shown.delivery && player.carrying === "soul") {
      tutorialHints.shown.delivery = true;
      showHint(
        'Find the RIFT<br><span style="color:#00ffaa;font-size:11px">deliver the soul</span>',
        2.5,
      );
    }
  }

  if (
    state.currentLevel === 1 &&
    !tutorialHints.shown.candle &&
    state.gameTime > 2 &&
    state.gameTime < 3
  ) {
    tutorialHints.shown.candle = true;
    showHint(
      'Pick up torches for light<br><span style="color:#ff8800;font-size:11px">E to drop or place</span>',
      2.5,
    );
  }

  if (
    state.currentLevel === 2 &&
    !tutorialHints.shown.rock &&
    state.gameTime > 2 &&
    state.gameTime < 3
  ) {
    tutorialHints.shown.rock = true;
    showHint(
      'Pick up rocks<br><span style="color:#ffaa00;font-size:11px">F to throw, E to drop</span>',
      2.5,
    );
  }
}

// ── Scene Management ──
function showTransition(levelIdx) {
  sound.playMutationReveal();
  state.current = GameState.TRANSITION;

  const level =
    state.currentMode === "endless"
      ? createEndlessLevel(state.endlessFloor)
      : LEVELS[levelIdx];

  const overlay = document.getElementById("transition-overlay");
  overlay.classList.remove("hidden");

  document.getElementById("transition-level").textContent =
    state.currentMode === "endless"
      ? "Floor " + state.endlessFloor
      : "Level " + (levelIdx + 1);

  document.getElementById("transition-ability").textContent =
    level.ability || level.name;
  document
    .getElementById("transition-ability")
    .setAttribute("data-text", level.ability || level.name);
  document.getElementById("transition-description").textContent =
    level.description;

  document.getElementById("ui-layer").style.display = "none";
  document.getElementById("level-text").textContent =
    state.currentMode === "endless"
      ? "FLOOR " + state.endlessFloor
      : "LEVEL " + (levelIdx + 1);
}

function startLevel() {
  document.getElementById("transition-overlay").classList.add("hidden");
  document.getElementById("ui-layer").style.display = "block";

  if (state.currentMode === "endless") {
    const endlessLevel = createEndlessLevel(state.endlessFloor);
    loadLevel(endlessLevel);
  } else {
    loadLevel(LEVELS[state.currentLevel]);
  }

  state.current = GameState.PLAYING;
}

function nextLevel() {
  if (state.current !== GameState.PLAYING) return;
  state.current = GameState.TRANSITION;

  sound.playLevelComplete();

  if (state.currentMode === "nightmare") {
    winNightmare();
    return;
  }

  if (state.currentMode === "endless") {
    state.endlessScore += state.endlessFloor * 100;
    state.endlessFloor++;
    updateEndlessRecord(state.endlessFloor);
    startEndlessFloor();
    return;
  }

  state.currentLevel++;

  if (state.currentLevel === 2) completeChapter(1);
  if (state.currentLevel === 4) completeChapter(2);
  if (state.currentLevel >= LEVELS.length) {
    completeChapter(3);
    showStory(STORY.ending, () => winGame());
    return;
  }

  const chapter = Math.floor(state.currentLevel / 2);
  const levelInChapter = state.currentLevel % 2;

  if (
    STORY.chapters[chapter] &&
    STORY.chapters[chapter].before[levelInChapter]
  ) {
    showStory(STORY.chapters[chapter].before[levelInChapter], () => {
      showTransition(state.currentLevel);
    });
  } else {
    showTransition(state.currentLevel);
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
    background: radial-gradient(circle at center,
      rgba(150, 0, 0, 0.8) 0%,
      rgba(80, 0, 0, 0.4) 40%,
      rgba(0, 0, 0, 0) 100%);
    z-index: 140; pointer-events: none;
    animation: bloodFade 1.5s forwards;
  `;
  wrapper.appendChild(bloodOverlay);
  setTimeout(() => bloodOverlay.remove(), 1500);

  if (state.currentMode === "endless") {
    endlessGameOver();
    return;
  }

  state.current = GameState.GAMEOVER;
  document.getElementById("ui-layer").style.display = "none";
  document.getElementById("gameover-overlay").classList.remove("hidden");
  document.getElementById("gameover-reason").textContent = reason;
  document.getElementById("gameover-level").textContent =
    "Reached Level " + (state.currentLevel + 1);
}

function winGame() {
  state.current = GameState.WIN;
  document.getElementById("ui-layer").style.display = "none";
  document.getElementById("win-overlay").classList.remove("hidden");
  document.getElementById("win-stats").innerHTML =
    `Levels Survived: ${LEVELS.length}<br>Time: ${Math.floor(state.gameTime)}s`;
}

function endlessGameOver() {
  state.current = GameState.GAMEOVER;
  document.getElementById("ui-layer").style.display = "none";
  document.getElementById("endless-over-overlay").classList.remove("hidden");

  const phase = getHellPhase(state.endlessFloor);
  document.getElementById("endless-floor").textContent =
    "Descended to Floor " + state.endlessFloor;
  document.getElementById("endless-score").textContent =
    "Score: " + state.endlessScore;
  document.getElementById("endless-phase-name").textContent = phase.name;
}

function returnToMenu() {
  state.current = GameState.MENU;
  state.currentLevel = 0;
  state.currentMode = "story";
  state.endlessFloor = 1;
  state.endlessScore = 0;
  state.gameTime = 0;
  state.lastTime = 0;
  phantom.reset();
  resetStory();
  endNightmare();
  resetTutorial();
  player.reset();

  document.getElementById("nightmare-hud").classList.add("hidden");
  document.getElementById("gameover-overlay").classList.add("hidden");
  document.getElementById("win-overlay").classList.add("hidden");
  document.getElementById("endless-over-overlay").classList.add("hidden");
  document.getElementById("chapter-overlay").classList.add("hidden");
  document.getElementById("story-overlay").classList.add("hidden");
  document.getElementById("transition-overlay").classList.add("hidden");
  document.getElementById("ui-layer").style.display = "none";
  document.getElementById("menu-overlay").style.display = "flex";

  document.getElementById("win-title").textContent = "YOU ESCAPED";
  document.getElementById("win-subtitle").textContent =
    "The shadow still learns.";
}

// ── Endless Mode ──
function startEndlessFloor() {
  const phase = getHellPhase(state.endlessFloor);
  const isPhaseChange =
    state.endlessFloor > 1 &&
    HELL_PHASE_START_FLOORS.includes(state.endlessFloor);

  // Show story text on floor 1 or when entering a new phase
  if (state.endlessFloor === 1 || isPhaseChange) {
    showTransition(0);
  } else {
    startLevel();
  }
}

const HELL_PHASE_START_FLOORS = [1, 4, 8, 13, 19, 26];

// ── Nightmare Mode ──
function startNightmareMode() {
  document.getElementById("chapter-overlay").classList.add("hidden");
  state.currentMode = "nightmare";
  state.currentLevel = 0;
  phantom.reset();
  state.gameTime = 0;

  showStory(
    `<span class="story-danger">THE NIGHTMARE.</span><br><br>
    Every 30 seconds, the world changes.<br>
    Every soul you take makes it stronger.<br>
    Every 35 seconds — it learns anyway.<br><br>
    You have 5 minutes.<br><br>
    <span class="story-highlight">Escape. Or become it.</span>`,
    () => {
      startNightmareLevel();
    },
  );
}

function startNightmareLevel() {
  document.getElementById("ui-layer").style.display = "block";
  document.getElementById("nightmare-hud").classList.remove("hidden");

  const map = getRandomNightmareMap();
  if (!map) {
    returnToMenu();
    return;
  }

  const nightmareLevel = {
    name: "THE NIGHTMARE",
    ability: "CHAOS",
    description: '"It changes. It learns. You die."',
    mutations: {},
    soulsNeeded: 12,
    phantomSpeed: 60,
    map: map,
  };

  loadLevel(nightmareLevel);

  phantom.canSense = false;
  phantom.canManifest = false;
  phantom.canTrace = false;
  phantom.canPhase = false;
  phantom.canSplit = false;
  phantom.speed = 60;

  state.current = GameState.PLAYING;

  startNightmare({
    onMapMorph: () => morphNightmareMap(),
    onGameOver: (reason) => gameOver(reason),
    onWin: () => winNightmare(),
  });
}

function morphNightmareMap() {
  const flash = document.createElement("div");
  flash.id = "morph-flash";
  document.getElementById("game-wrapper").appendChild(flash);
  setTimeout(() => flash.remove(), 600);

  const savedDelivered = player.soulsDelivered;
  const savedSanity = player.sanity;
  const savedCorruption = player.corruption;
  const savedCarrying = player.carrying;

  const powers = {
    canSense: phantom.canSense,
    canManifest: phantom.canManifest,
    canTrace: phantom.canTrace,
    canPhase: phantom.canPhase,
    canSplit: phantom.canSplit,
    speed: phantom.speed,
  };

  const newMap = getRandomNightmareMap();
  const nightmareLevel = {
    name: "THE NIGHTMARE",
    ability: "CHAOS",
    description: "",
    mutations: {},
    soulsNeeded: 12,
    phantomSpeed: powers.speed,
    map: newMap,
  };

  loadLevel(nightmareLevel);

  player.soulsDelivered = savedDelivered;
  player.sanity = savedSanity;
  player.corruption = savedCorruption;
  player.carrying = savedCarrying;

  phantom.canSense = powers.canSense;
  phantom.canManifest = powers.canManifest;
  phantom.canTrace = powers.canTrace;
  phantom.canPhase = powers.canPhase;
  phantom.canSplit = powers.canSplit;
  phantom.speed = powers.speed;
}

function winNightmare() {
  endNightmare();
  state.current = GameState.WIN;
  document.getElementById("nightmare-hud").classList.add("hidden");
  document.getElementById("ui-layer").style.display = "none";
  document.getElementById("win-overlay").classList.remove("hidden");
  document.getElementById("win-title").textContent = "YOU SURVIVED";
  document.getElementById("win-subtitle").textContent =
    "The nightmare could not hold you.";
  document.getElementById("win-stats").innerHTML =
    `Time Remaining: ${Math.floor(nightmareState.timeLeft)}s<br>Powers Unlocked: ${nightmareState.powersUnlocked.length}`;
}

function updateNightmareHUD() {
  if (!nightmareState.active) return;

  const minutes = Math.floor(nightmareState.timeLeft / 60);
  const seconds = Math.floor(nightmareState.timeLeft % 60);
  document.getElementById("nightmare-timer").textContent =
    `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const morphTime = Math.ceil(nightmareState.mapMorphTimer);
  document.getElementById("nightmare-morph").textContent =
    `MAP MORPHS IN ${morphTime}s`;

  const timerEl = document.getElementById("nightmare-timer");
  if (nightmareState.timeLeft < 30) {
    timerEl.style.color = "#ff0000";
    timerEl.style.textShadow = "0 0 20px #ff0000";
  }
}

function refreshChapterCards() {
  const progress = loadProgress();
  document.querySelectorAll(".chapter-card").forEach((card) => {
    const chapterAttr = card.getAttribute("data-chapter");
    card.classList.remove("locked", "completed");

    if (chapterAttr === "nightmare") {
      if (!progress.chapter3Complete) {
        card.style.display = "none";
      } else {
        card.style.display = "flex";
      }
      return;
    }

    const chapter = parseInt(chapterAttr);
    if (chapter + 1 > progress.chaptersUnlocked) {
      card.classList.add("locked");
    }

    if (chapter === 0 && progress.chapter1Complete)
      card.classList.add("completed");
    if (chapter === 1 && progress.chapter2Complete)
      card.classList.add("completed");
    if (chapter === 2 && progress.chapter3Complete)
      card.classList.add("completed");
  });
}

// ── Game Loop ──
function gameLoop(timestamp) {
  if (state.lastTime === 0) state.lastTime = timestamp;
  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.05);
  state.lastTime = timestamp;

  if (state.current === GameState.PLAYING) {
    state.gameTime += dt;
    if (Math.random() < 0.003 && sound.playAmbientScare) {
      sound.playAmbientScare();
    }
    updateTutorial();
    updatePlayer(dt, { nextLevel, gameOver });
    updatePhantom(dt);
    updateSecondPhantom(dt, { gameOver });
    camera.update(dt);

    if (state.currentMode === "nightmare") {
      updateNightmare(dt, player.soulsDelivered);
      updateNightmareHUD();
    }

    render(ctx, canvas, state.gameTime);
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
  refreshChapterCards();
});

document.querySelectorAll(".chapter-card").forEach((card) => {
  card.addEventListener("click", () => {
    const chapterAttr = card.getAttribute("data-chapter");

    if (chapterAttr === "nightmare") {
      const progress = loadProgress();
      if (!progress.chapter3Complete) {
        card.style.animation = "lockedShake 0.4s ease";
        setTimeout(() => {
          card.style.animation = "";
        }, 400);
        return;
      }
      startNightmareMode();
      return;
    }

    const chapter = parseInt(chapterAttr);
    const progress = loadProgress();
    if (chapter + 1 > progress.chaptersUnlocked) {
      card.style.animation = "lockedShake 0.4s ease";
      setTimeout(() => {
        card.style.animation = "";
      }, 400);
      return;
    }

    const chapterStartLevels = [0, 2, 4];
    state.currentLevel = chapterStartLevels[chapter];
    state.currentMode = "story";
    document.getElementById("chapter-overlay").classList.add("hidden");
    phantom.reset();
    state.gameTime = 0;

    if (chapter === 0) {
      showStory(STORY.intro, () => {
        showStory(STORY.chapters[0].before[0], () => {
          showTransition(state.currentLevel);
        });
      });
    } else {
      showStory(STORY.chapters[chapter].before[0], () => {
        showTransition(state.currentLevel);
      });
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
  state.currentMode = "endless";
  state.currentLevel = 0;
  state.endlessFloor = 1;
  state.endlessScore = 0;
  phantom.reset();
  state.gameTime = 0;

  // Show hell intro
  showStory(
    `You did not escape.<br><br>
    You only <span class="story-danger">descended.</span><br><br>
    Every floor is a memory<br>
    of every life you took.<br><br>
    You will not reach the bottom.<br>
    There is no bottom.<br><br>
    <span class="story-highlight">Only lower.</span>`,
    () => {
      startEndlessFloor();
    },
  );
});

document.getElementById("retry-button").addEventListener("click", () => {
  document.getElementById("gameover-overlay").classList.add("hidden");
  document.getElementById("ui-layer").style.display = "block";
  phantom.reset();
  for (let i = 0; i <= state.currentLevel; i++) {
    if (LEVELS[i] && LEVELS[i].mutations) {
      Object.keys(LEVELS[i].mutations).forEach((key) => {
        phantom[key] = LEVELS[i].mutations[key];
      });
    }
  }
  loadLevel(LEVELS[state.currentLevel]);
  state.current = GameState.PLAYING;
});

document.getElementById("menu-button").addEventListener("click", returnToMenu);
document
  .getElementById("play-again-button")
  .addEventListener("click", returnToMenu);

document
  .getElementById("endless-retry-button")
  .addEventListener("click", () => {
    document.getElementById("endless-over-overlay").classList.add("hidden");
    state.currentMode = "endless";
    state.currentLevel = 0;
    state.endlessFloor = 1;
    state.endlessScore = 0;
    phantom.reset();
    state.gameTime = 0;
    startEndlessFloor();
  });

document
  .getElementById("endless-menu-button")
  .addEventListener("click", returnToMenu);

// ── START ──
sprites.load().then(() => {
  console.log("✅ Sprites ready — starting game");
  requestAnimationFrame(gameLoop);
});
