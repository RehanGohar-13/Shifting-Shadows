// ============================================
// SHIFTING SHADOWS — Main
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
import { updatePlayer, updateHeartsUI } from "./systems/player-controller.js";
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
  addDeath,
  saveBestTime,
} from "./systems/progress.js";
import {
  startNightmare,
  updateNightmare,
  nightmareState,
  getRandomNightmareMap,
  endNightmare,
} from "./systems/nightmare-mode.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 1200;
canvas.height = 800;
ctx.imageSmoothingEnabled = false;
camera.init(canvas);

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
  difficulty: "normal",
  endlessFloor: 1,
  endlessScore: 0,
  gameTime: 0,
  levelStartTime: 0,
  lastTime: 0,
};

let isPaused = false;

initInput();
initMobileControls(canvas);

setSpaceCallback(() => {
  if (isWaitingForStory()) {
    advanceStory();
    return;
  }
  if (state.current === GameState.TRANSITION) startLevel();
});

// ── Timer ──
function updateTimerUI() {
  const el = document.getElementById("timer-display");
  if (!el || state.current !== GameState.PLAYING) return;
  const t = (Date.now() - state.levelStartTime) / 1000;
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(2);
  el.textContent = `${m.toString().padStart(2, "0")}:${s.padStart(5, "0")}`;
}

// ── Scenes ──
function showTransition(levelIdx) {
  sound.playMutationReveal();
  state.current = GameState.TRANSITION;
  const level =
    state.currentMode === "endless"
      ? createEndlessLevel(state.endlessFloor)
      : LEVELS[levelIdx];
  document.getElementById("transition-overlay").classList.remove("hidden");
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
  document.getElementById("ui-layer").classList.add("hidden");
  document.getElementById("level-text").textContent =
    state.currentMode === "endless"
      ? "FLOOR " + state.endlessFloor
      : "LEVEL " + (levelIdx + 1);
}

function startLevel() {
  document.getElementById("transition-overlay").classList.add("hidden");
  document.getElementById("ui-layer").classList.remove("hidden");

  player.reset(state.difficulty);
  updateHeartsUI();
  state.levelStartTime = Date.now();

  if (state.currentMode === "endless")
    loadLevel(createEndlessLevel(state.endlessFloor));
  else loadLevel(LEVELS[state.currentLevel]);

  state.current = GameState.PLAYING;
}

function nextLevel() {
  if (state.current !== GameState.PLAYING) return;
  state.current = GameState.TRANSITION;
  sound.playLevelComplete();

  // Save best time
  const time = (Date.now() - state.levelStartTime) / 1000;
  saveBestTime("level_" + state.currentLevel, time);

  if (state.currentMode === "nightmare") {
    winNightmare();
    return;
  }
  if (state.currentMode === "endless") {
    state.endlessScore += state.endlessFloor * 100;
    state.endlessFloor++;
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
  const ch = Math.floor(state.currentLevel / 2);
  const lc = state.currentLevel % 2;
  if (STORY.chapters[ch] && STORY.chapters[ch].before[lc]) {
    showStory(STORY.chapters[ch].before[lc], () =>
      showTransition(state.currentLevel),
    );
  } else showTransition(state.currentLevel);
}

function gameOver(reason) {
  addDeath();
  updateTotalDeathsUI();
  sound.playDeath();
  const w = document.getElementById("game-wrapper");
  w.style.animation = "screenShake 0.4s ease";
  setTimeout(() => {
    w.style.animation = "";
  }, 400);

  if (state.currentMode === "endless") {
    endlessGameOver();
    return;
  }
  state.current = GameState.GAMEOVER;
  document.getElementById("ui-layer").classList.add("hidden");
  document.getElementById("gameover-overlay").classList.remove("hidden");
  document.getElementById("gameover-reason").textContent = reason;
  document.getElementById("gameover-level").textContent =
    "Reached Level " + (state.currentLevel + 1);
}

function winGame() {
  state.current = GameState.WIN;
  document.getElementById("ui-layer").classList.add("hidden");
  document.getElementById("win-overlay").classList.remove("hidden");
  document.getElementById("win-stats").innerHTML =
    `Levels Survived: ${LEVELS.length}<br>Time: ${Math.floor(state.gameTime)}s`;
}

function endlessGameOver() {
  state.current = GameState.GAMEOVER;
  document.getElementById("ui-layer").classList.add("hidden");
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
  player.reset();
  isPaused = false;

  document
    .querySelectorAll(
      "#pause-overlay, #nightmare-hud, #gameover-overlay, #win-overlay, #endless-over-overlay, #chapter-overlay, #story-overlay, #transition-overlay, #credits-overlay",
    )
    .forEach((el) => el.classList.add("hidden"));
  document.getElementById("ui-layer").classList.add("hidden");
  document.getElementById("menu-overlay").classList.remove("hidden");
  updateTotalDeathsUI();
}

function startEndlessFloor() {
  if (
    state.endlessFloor === 1 ||
    [4, 8, 13, 19, 26].includes(state.endlessFloor)
  ) {
    showTransition(0);
  } else startLevel();
}

// Nightmare
function startNightmareMode() {
  document.getElementById("chapter-overlay").classList.add("hidden");
  state.currentMode = "nightmare";
  phantom.reset();
  state.gameTime = 0;
  showStory(
    `<span class="story-danger">THE NIGHTMARE.</span><br><br>Every 30 seconds, the world changes.<br>Every soul you take makes it stronger.<br><br>You have 5 minutes.`,
    () => startNightmareLevel(),
  );
}
function startNightmareLevel() {
  document.getElementById("ui-layer").classList.remove("hidden");
  document.getElementById("nightmare-hud").classList.remove("hidden");
  const map = getRandomNightmareMap();
  if (!map) {
    returnToMenu();
    return;
  }
  loadLevel({
    name: "THE NIGHTMARE",
    ability: "CHAOS",
    description: "",
    mutations: {},
    soulsNeeded: 12,
    phantomSpeed: 60,
    map,
  });
  player.reset(state.difficulty);
  updateHeartsUI();
  state.levelStartTime = Date.now();
  state.current = GameState.PLAYING;
  startNightmare({
    onMapMorph: morphNightmareMap,
    onGameOver: gameOver,
    onWin: winNightmare,
  });
}
function morphNightmareMap() {
  const flash = document.createElement("div");
  flash.id = "morph-flash";
  document.getElementById("game-wrapper").appendChild(flash);
  setTimeout(() => flash.remove(), 600);
  const saved = {
    d: player.soulsDelivered,
    s: player.sanity,
    c: player.corruption,
    ca: player.carrying,
    l: player.lives,
  };
  const powers = { ...phantom };
  loadLevel({
    name: "THE NIGHTMARE",
    ability: "CHAOS",
    description: "",
    mutations: {},
    soulsNeeded: 12,
    phantomSpeed: powers.speed,
    map: getRandomNightmareMap(),
  });
  Object.assign(player, {
    soulsDelivered: saved.d,
    sanity: saved.s,
    corruption: saved.c,
    carrying: saved.ca,
    lives: saved.l,
  });
  Object.assign(phantom, powers);
}
function winNightmare() {
  endNightmare();
  completeChapter("nightmare");
  state.current = GameState.WIN;
  document.getElementById("nightmare-hud").classList.add("hidden");
  document.getElementById("ui-layer").classList.add("hidden");
  document.getElementById("win-overlay").classList.remove("hidden");
  document.getElementById("win-title").textContent = "YOU SURVIVED";
  document.getElementById("win-subtitle").textContent =
    "The nightmare could not hold you.";
}
function updateNightmareHUD() {
  if (!nightmareState.active) return;
  const m = Math.floor(nightmareState.timeLeft / 60),
    s = Math.floor(nightmareState.timeLeft % 60);
  document.getElementById("nightmare-timer").textContent =
    `${m}:${s.toString().padStart(2, "0")}`;
  document.getElementById("nightmare-morph").textContent =
    `MAP MORPHS IN ${Math.ceil(nightmareState.mapMorphTimer)}s`;
}

function refreshChapterCards() {
  const p = loadProgress();
  document.querySelectorAll(".chapter-card").forEach((card) => {
    const ca = card.getAttribute("data-chapter");
    card.classList.remove("locked", "completed");
    if (ca === "nightmare") {
      card.style.display = p.chapter3Complete ? "flex" : "none";
      return;
    }
    const c = parseInt(ca);
    if (c + 1 > p.chaptersUnlocked) {
      card.classList.add("locked");
      // ??? Name Mystery
      const nameEl = card.querySelector(".chapter-name");
      if (nameEl && !card.dataset.originalName)
        card.dataset.originalName = nameEl.textContent;
      if (nameEl) nameEl.textContent = "??????";
    } else {
      const nameEl = card.querySelector(".chapter-name");
      if (nameEl && card.dataset.originalName)
        nameEl.textContent = card.dataset.originalName;
    }
    if (c === 0 && p.chapter1Complete) card.classList.add("completed");
    if (c === 1 && p.chapter2Complete) card.classList.add("completed");
    if (c === 2 && p.chapter3Complete) card.classList.add("completed");
  });
}

function updateTotalDeathsUI() {
  const el = document.getElementById("total-deaths-display");
  if (el) el.textContent = `Total Deaths: ${loadProgress().totalDeaths}`;
}

// Game Loop
function gameLoop(timestamp) {
  if (state.lastTime === 0) state.lastTime = timestamp;
  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.05);
  state.lastTime = timestamp;
  if (state.current === GameState.PLAYING && !isPaused) {
    state.gameTime += dt;
    if (Math.random() < 0.003) sound.playAmbientScare?.();
    updatePlayer(dt, { nextLevel, gameOver });
    updatePhantom(dt);
    updateSecondPhantom(dt, { gameOver });
    camera.update(dt);
    if (state.currentMode === "nightmare") {
      updateNightmare(dt, player.soulsDelivered);
      updateNightmareHUD();
    }
    updateTimerUI();
    render(ctx, canvas, state.gameTime);
  }
  requestAnimationFrame(gameLoop);
}

// ── UI Bindings ──
document
  .getElementById("accept-warning-button")
  .addEventListener("click", () => {
    document.getElementById("warning-overlay").style.display = "none";
    document.getElementById("menu-overlay").classList.remove("hidden");
    updateTotalDeathsUI();
  });

document.getElementById("story-button").addEventListener("click", () => {
  sound.init();
  sound.startAmbient();
  sound.startPhantomDrone();
  document.getElementById("menu-overlay").classList.add("hidden");
  document.getElementById("chapter-overlay").classList.remove("hidden");
  refreshChapterCards();
});
document.querySelectorAll(".chapter-card").forEach((card) => {
  card.addEventListener("click", () => {
    const ca = card.getAttribute("data-chapter");
    const p = loadProgress();
    if (ca === "nightmare") {
      if (!p.chapter3Complete) return;
      startNightmareMode();
      return;
    }
    const c = parseInt(ca);
    if (c + 1 > p.chaptersUnlocked) {
      card.style.animation = "lockedShake 0.4s";
      setTimeout(() => (card.style.animation = ""), 400);
      return;
    }
    state.currentLevel = [0, 2, 4][c];
    state.currentMode = "story";
    document.getElementById("chapter-overlay").classList.add("hidden");
    phantom.reset();
    state.gameTime = 0;
    if (c === 0)
      showStory(STORY.intro, () =>
        showStory(STORY.chapters[0].before[0], () =>
          showTransition(state.currentLevel),
        ),
      );
    else
      showStory(STORY.chapters[c].before[0], () =>
        showTransition(state.currentLevel),
      );
  });
});
document.getElementById("chapter-back-button").addEventListener("click", () => {
  document.getElementById("chapter-overlay").classList.add("hidden");
  document.getElementById("menu-overlay").classList.remove("hidden");
});
document.getElementById("endless-button").addEventListener("click", () => {
  sound.init();
  sound.startAmbient();
  document.getElementById("menu-overlay").classList.add("hidden");
  state.currentMode = "endless";
  state.endlessFloor = 1;
  state.endlessScore = 0;
  phantom.reset();
  state.gameTime = 0;
  showStory(
    `You did not escape.<br>You only <span class="story-danger">descended.</span><br><br>There is no bottom.<br><span class="story-highlight">Only lower.</span>`,
    () => startEndlessFloor(),
  );
});
document.getElementById("retry-button").addEventListener("click", () => {
  document.getElementById("gameover-overlay").classList.add("hidden");
  phantom.reset();
  for (let i = 0; i <= state.currentLevel; i++) {
    if (LEVELS[i]?.mutations)
      Object.keys(LEVELS[i].mutations).forEach(
        (k) => (phantom[k] = LEVELS[i].mutations[k]),
      );
  }
  loadLevel(LEVELS[state.currentLevel]);
  player.reset(state.difficulty);
  updateHeartsUI();
  state.levelStartTime = Date.now();
  document.getElementById("ui-layer").classList.remove("hidden");
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
    state.endlessFloor = 1;
    state.endlessScore = 0;
    phantom.reset();
    state.gameTime = 0;
    startEndlessFloor();
  });
document
  .getElementById("endless-menu-button")
  .addEventListener("click", returnToMenu);

// Difficulty
document.querySelectorAll(".diff-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document
      .querySelectorAll(".diff-btn")
      .forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    state.difficulty = b.id.replace("diff-", "");
  });
});

// Credits
document.getElementById("credits-button").addEventListener("click", () => {
  document.getElementById("menu-overlay").classList.add("hidden");
  document.getElementById("credits-overlay").classList.remove("hidden");
});
document
  .getElementById("close-credits-button")
  .addEventListener("click", () => {
    document.getElementById("credits-overlay").classList.add("hidden");
    document.getElementById("menu-overlay").classList.remove("hidden");
  });

// Pause
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.current === GameState.PLAYING) togglePause();
});
function togglePause() {
  isPaused = !isPaused;
  document
    .getElementById("pause-overlay")
    .classList.toggle("hidden", !isPaused);
}
document.getElementById("resume-button").addEventListener("click", togglePause);
document
  .getElementById("pause-menu-button")
  .addEventListener("click", returnToMenu);

// Sound Toggles
function setupSoundToggles() {
  const musicOn = localStorage.getItem("ss_music") !== "false";
  const sfxOn = localStorage.getItem("ss_sfx") !== "false";
  sound.musicEnabled = musicOn;
  sound.sfxEnabled = sfxOn;
  updateTV("menu-music-toggle", musicOn, "🎵 MUSIC");
  updateTV("menu-sfx-toggle", sfxOn, "🔊 SFX");
  updateTV("pause-music-toggle", musicOn, "🎵 MUSIC");
  updateTV("pause-sfx-toggle", sfxOn, "🔊 SFX");
}
function updateTV(id, on, l) {
  const b = document.getElementById(id);
  if (!b) return;
  b.setAttribute("data-on", on);
  b.textContent = l + (on ? " ON" : " OFF");
}
function toggleMusic() {
  const n = !sound.musicEnabled;
  sound.setMusicEnabled?.(n) || (sound.musicEnabled = n);
  localStorage.setItem("ss_music", n);
  updateTV("menu-music-toggle", n, "🎵 MUSIC");
  updateTV("pause-music-toggle", n, "🎵 MUSIC");
}
function toggleSfx() {
  const n = !sound.sfxEnabled;
  sound.setSfxEnabled?.(n) || (sound.sfxEnabled = n);
  localStorage.setItem("ss_sfx", n);
  updateTV("menu-sfx-toggle", n, "🔊 SFX");
  updateTV("pause-sfx-toggle", n, "🔊 SFX");
}
document
  .getElementById("menu-music-toggle")
  .addEventListener("click", toggleMusic);
document.getElementById("menu-sfx-toggle").addEventListener("click", toggleSfx);
document
  .getElementById("pause-music-toggle")
  .addEventListener("click", toggleMusic);
document
  .getElementById("pause-sfx-toggle")
  .addEventListener("click", toggleSfx);

setupSoundToggles();

// START
sprites.load().then(() => {
  console.log("✅ Sprites ready");
  requestAnimationFrame(gameLoop);
});
