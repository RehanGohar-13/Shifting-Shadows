// ============================================
// Player Controller — Movement, Inventory, Meters
// ============================================

import { player } from "../entities/player.js";
import { phantom, getSecondPhantom } from "../entities/phantom.js";
import { keys } from "./input.js";
import { sound } from "./sound-system.js";
import { levelState } from "../levels/level-manager.js";
import {
  rectsCollide,
  distanceBetween,
  collidesWithWalls,
} from "../utils/helpers.js";

export const playerEffects = {
  soulFlashTimer: 0,
};

export function updatePlayer(dt, callbacks = {}) {
  const { nextLevel, gameOver } = callbacks;

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

  // Movement X
  const newX = player.x + dx * speed * dt;
  if (
    !collidesWithWalls(
      newX,
      player.y,
      player.width,
      player.height,
      levelState.walls,
    )
  ) {
    player.x = newX;
  }

  // Movement Y
  const newY = player.y + dy * speed * dt;
  if (
    !collidesWithWalls(
      player.x,
      newY,
      player.width,
      player.height,
      levelState.walls,
    )
  ) {
    player.y = newY;
  }

  // Footstep sounds
  if (player.moving) {
    player._stepTimer += dt;
    const stepInterval = player.isRunning ? 0.2 : 0.35;

    if (player._stepTimer >= stepInterval) {
      player._stepTimer = 0;
      if (player.isRunning) sound.playRunStep();
      else sound.playFootstep();
    }
  }

  // Soul trail
  player.trailTimer += dt;
  if (player.trailTimer > 0.3) {
    player.soulTrail.push({ x: player.x, y: player.y });

    if (player.soulTrail.length > 40) {
      player.soulTrail.shift();
    }

    player.trailTimer = 0;
  }

  // Check if player is in candle light
  player.inLight = false;

  for (const candle of levelState.candles) {
    if (distanceBetween(player, candle) < candle.radius) {
      player.inLight = true;
      break;
    }
  }

  // Sanity
  if (!player.inLight) {
    player.sanity -= 1.8 * dt;
  } else {
    player.sanity = Math.min(100, player.sanity + 5 * dt);
  }

  // Corruption near phantom
  const distToPhantom = distanceBetween(player, phantom);

  if (distToPhantom < 150) {
    player.corruption += ((150 - distToPhantom) / 150) * 15 * dt;
  } else {
    player.corruption = Math.max(0, player.corruption - 2 * dt);
  }

  // Soul collection
  for (const soul of levelState.souls) {
    if (!soul.collected && rectsCollide(player, soul)) {
      soul.collected = true;
      player.souls++;
      playerEffects.soulFlashTimer = 0.3;

      sound.playSoulCollect();

      if (player.souls >= levelState.soulsNeeded && levelState.exitRift) {
        levelState.exitRift.active = true;
        sound.playRiftOpen();
      }
    }
  }

  // Exit rift
  if (
    levelState.exitRift &&
    levelState.exitRift.active &&
    !levelState.exitRift.triggered &&
    rectsCollide(player, levelState.exitRift)
  ) {
    levelState.exitRift.triggered = true;
    if (nextLevel) nextLevel();
  }

  // Place candle
  if (keys["e"] && player.candles > 0) {
    keys["e"] = false;
    player.candles--;

    sound.playCandlePlace();

    levelState.candles.push({
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
      radius: 100,
      life: 30,
      permanent: false,
    });
  }

  // Throw rock
  if (keys["f"] && player.rocks > 0) {
    keys["f"] = false;
    player.rocks--;

    sound.playRockThrow();

    const throwDist = 200;

    levelState.rocks.push({
      x: player.x + player.direction.x * throwDist,
      y: player.y + player.direction.y * throwDist,
      timer: 3,
      noiseRadius: 220,
    });
  }

  // Death checks
  if (player.sanity <= 0 && gameOver) {
    gameOver("Your mind faded into nothing.");
  }

  if (player.corruption >= 100 && gameOver) {
    gameOver("You became one of them.");
  }

  if (rectsCollide(player, phantom) && gameOver) {
    sound.playJumpscare();
    gameOver("The shadow consumed you.");
  }

  const secondPhantom = getSecondPhantom();

  if (secondPhantom && rectsCollide(player, secondPhantom) && gameOver) {
    sound.playJumpscare();
    gameOver("A second shadow consumed you.");
  }

  updateLevelObjects(dt);
  updateUI();
}

function updateLevelObjects(dt) {
  // Candles
  for (let i = levelState.candles.length - 1; i >= 0; i--) {
    const candle = levelState.candles[i];

    if (!candle.permanent) {
      candle.life -= dt;
    }

    if (candle.life <= 0) {
      levelState.candles.splice(i, 1);
    }
  }

  // Rocks
  for (let i = levelState.rocks.length - 1; i >= 0; i--) {
    const rock = levelState.rocks[i];
    rock.timer -= dt;

    if (rock.timer <= 0) {
      levelState.rocks.splice(i, 1);
    }
  }
}

function updateUI() {
  const sanityBar = document.getElementById("sanity-bar");
  const corruptionBar = document.getElementById("corruption-bar");
  const soulsText = document.getElementById("souls-text");
  const candlesText = document.getElementById("candles-text");

  if (sanityBar) sanityBar.style.width = Math.max(0, player.sanity) + "%";
  if (corruptionBar)
    corruptionBar.style.width = Math.min(100, player.corruption) + "%";
  if (soulsText)
    soulsText.textContent = player.souls + " / " + levelState.soulsNeeded;
  if (candlesText) candlesText.textContent = player.candles;
}
