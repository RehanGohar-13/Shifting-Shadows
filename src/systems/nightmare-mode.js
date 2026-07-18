// ============================================
// NIGHTMARE MODE — Secret Level 7
// ============================================

import { phantom } from "../entities/phantom.js";
import { getRandomMap } from "../levels/story-map-pool.js";

const AVAILABLE_POWERS = ["canSense", "canManifest", "canTrace", "canPhase"];

export const nightmareState = {
  active: false,
  timeLeft: 300, // 5 minutes
  mapMorphTimer: 30,
  passiveEvolveTimer: 35,
  currentMapIndex: 0,
  soulsCollected: 0,
  powersUnlocked: [],
  onMapMorph: null,
  onGameOver: null,
  onWin: null,
};

export function startNightmare(callbacks) {
  nightmareState.active = true;
  nightmareState.timeLeft = 300;
  nightmareState.mapMorphTimer = 30;
  nightmareState.passiveEvolveTimer = 35;
  nightmareState.currentMapIndex = 0;
  nightmareState.soulsCollected = 0;
  nightmareState.powersUnlocked = [];
  nightmareState.onMapMorph = callbacks.onMapMorph;
  nightmareState.onGameOver = callbacks.onGameOver;
  nightmareState.onWin = callbacks.onWin;

  // Reset phantom to no powers
  phantom.canSense = false;
  phantom.canManifest = false;
  phantom.canTrace = false;
  phantom.canPhase = false;
  phantom.canSplit = false;
}

export function updateNightmare(dt, currentSouls) {
  if (!nightmareState.active) return;

  // Timer countdown
  nightmareState.timeLeft -= dt;
  if (nightmareState.timeLeft <= 0) {
    nightmareState.active = false;
    if (nightmareState.onGameOver)
      nightmareState.onGameOver("Time ran out. The shadow won.");
    return;
  }

  // Map morph every 30s
  nightmareState.mapMorphTimer -= dt;
  if (nightmareState.mapMorphTimer <= 0) {
    nightmareState.mapMorphTimer = 30;
    if (nightmareState.onMapMorph) nightmareState.onMapMorph();
  }

  // Passive evolution every 35s
  nightmareState.passiveEvolveTimer -= dt;
  if (nightmareState.passiveEvolveTimer <= 0) {
    nightmareState.passiveEvolveTimer = 35;
    grantRandomPower();
  }

  // Check if player collected new souls to grant powers
  if (currentSouls > nightmareState.soulsCollected) {
    const diff = currentSouls - nightmareState.soulsCollected;
    nightmareState.soulsCollected = currentSouls;
    for (let i = 0; i < diff; i++) {
      grantRandomPower();
    }
  }
}

function grantRandomPower() {
  const available = AVAILABLE_POWERS.filter((p) => !phantom[p]);
  if (available.length === 0) {
    // All powers unlocked — activate split
    if (!phantom.canSplit) {
      phantom.canSplit = true;
      nightmareState.powersUnlocked.push("canSplit");
    }
    // Speed up phantom
    phantom.speed = Math.min(150, phantom.speed + 10);
    return;
  }

  const power = available[Math.floor(Math.random() * available.length)];
  phantom[power] = true;
  nightmareState.powersUnlocked.push(power);
  phantom.speed += 5;
}

export function getRandomNightmareMap() {
  // Pick from level 4, 5, 6 maps for variety and difficulty
  const pools = [3, 4, 5]; // level indices
  const levelIdx = pools[Math.floor(Math.random() * pools.length)];
  return getRandomMap(levelIdx);
}

export function endNightmare() {
  nightmareState.active = false;
}
