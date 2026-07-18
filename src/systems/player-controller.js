// ============================================
// Player Controller — Carry One Item System
// ============================================

import { player } from "../entities/player.js";
import { phantom, getSecondPhantom } from "../entities/phantom.js";
import { keys } from "./input.js";
import { sound } from "./sound-system.js";
import { levelState, moveRiftRandomly } from "../levels/level-manager.js";
import {
  rectsCollide,
  distanceBetween,
  collidesWithWalls,
} from "../utils/helpers.js";

export const playerEffects = {
  soulFlashTimer: 0,
  rockFlashTimer: 0,
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

  // Footsteps
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
    if (player.soulTrail.length > 40) player.soulTrail.shift();
    player.trailTimer = 0;
  }

  // Light check — carrying candle = always in light
  player.inLight = false;
  if (player.carrying === "candle") {
    player.inLight = true;
  } else {
    for (const candle of levelState.candles) {
      if (distanceBetween(player, candle) < candle.radius) {
        player.inLight = true;
        break;
      }
    }
  }

  // Sanity
  if (player.carrying === "candle") {
    player.sanity = Math.min(100, player.sanity + 3 * dt);
  } else if (!player.inLight) {
    player.sanity -= 1.8 * dt;
  } else {
    player.sanity = Math.min(100, player.sanity + 5 * dt);
  }

  // Corruption
  const distToPhantom = distanceBetween(player, phantom);
  if (distToPhantom < 150) {
    player.corruption += ((150 - distToPhantom) / 150) * 15 * dt;
  } else {
    player.corruption = Math.max(0, player.corruption - 2 * dt);
  }

  // ── PICK UP ITEMS (only if not carrying anything) ──
  if (!player.carrying) {
    // Pick up soul
    for (const soul of levelState.souls) {
      if (!soul.collected && rectsCollide(player, soul)) {
        soul.collected = true;
        player.carrying = "soul";
        playerEffects.soulFlashTimer = 0.3;
        sound.playSoulCollect();

        if (levelState.exitRift) {
          levelState.exitRift.active = true;
        }
        break;
      }
    }

    // Pick up rock
    if (!player.carrying) {
      for (const pickup of levelState.rockPickups) {
        if (
          !pickup.collected &&
          rectsCollide(player, {
            x: pickup.x - 8,
            y: pickup.y - 8,
            width: 16,
            height: 16,
          })
        ) {
          pickup.collected = true;
          player.carrying = "rock";
          playerEffects.rockFlashTimer = 0.2;
          sound.playRockPickup();
          break;
        }
      }
    }

    // Pick up candle
    if (!player.carrying) {
      for (const pickup of levelState.candlePickups) {
        if (
          !pickup.collected &&
          rectsCollide(player, {
            x: pickup.x - 8,
            y: pickup.y - 8,
            width: 16,
            height: 16,
          })
        ) {
          pickup.collected = true;
          player.carrying = "candle";
          playerEffects.rockFlashTimer = 0.2;
          sound.playCandlePlace();
          break;
        }
      }
    }
  }

  // ── DELIVER SOUL TO RIFT ──
  if (
    player.carrying === "soul" &&
    levelState.exitRift &&
    rectsCollide(player, levelState.exitRift)
  ) {
    player.carrying = null;
    player.soulsDelivered++;
    playerEffects.soulFlashTimer = 0.5;
    sound.playRiftOpen();

    if (player.soulsDelivered >= levelState.soulsNeeded) {
      // Final challenge: rift moves ONE more time
      if (!levelState.exitRift.readyToEscape) {
        levelState.exitRift.readyToEscape = true;
        moveRiftRandomly();
        levelState.exitRift.active = true;
      }
    } else {
      moveRiftRandomly();
    }
  }

  // ── FINAL ESCAPE (walk into green rift while empty-handed) ──
  if (
    levelState.exitRift &&
    levelState.exitRift.readyToEscape &&
    !player.carrying &&
    !levelState.exitRift.triggered &&
    rectsCollide(player, levelState.exitRift)
  ) {
    levelState.exitRift.triggered = true;
    if (nextLevel) nextLevel();
  }

  // ── E: Drop / Place ──
  if (keys["e"]) {
    keys["e"] = false;

    if (player.carrying === "candle") {
      sound.playCandlePlace();
      levelState.candles.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        radius: 100,
        life: 30,
        permanent: false,
      });
      player.carrying = null;
    } else if (player.carrying === "rock") {
      levelState.rockPickups.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        collected: false,
      });
      player.carrying = null;
    } else if (player.carrying === "soul") {
      levelState.souls.push({
        x: player.x + 12,
        y: player.y + 12,
        width: 24,
        height: 24,
        collected: false,
      });
      player.carrying = null;
    }
  }

  // ── F: Throw rock ──
  if (keys["f"] && player.carrying === "rock") {
    keys["f"] = false;
    player.carrying = null;
    sound.playRockThrow();
    const throwDist = 200;
    setTimeout(() => sound.playRockImpact(), 300);
    levelState.rocks.push({
      x: player.x + player.direction.x * throwDist,
      y: player.y + player.direction.y * throwDist,
      timer: 2,
      noiseRadius: 220,
    });
  }

  // Death
  if (player.sanity <= 0 && gameOver) gameOver("Your mind faded into nothing.");
  if (player.corruption >= 100 && gameOver) gameOver("You became one of them.");
  if (rectsCollide(player, phantom) && gameOver) {
    sound.playJumpscare();
    gameOver("The shadow consumed you.");
  }

  const secondPhantom = getSecondPhantom();
  if (secondPhantom && rectsCollide(player, secondPhantom) && gameOver) {
    sound.playJumpscare();
    gameOver("A second shadow consumed you.");
  }

  // Update objects
  for (let i = levelState.candles.length - 1; i >= 0; i--) {
    if (!levelState.candles[i].permanent) levelState.candles[i].life -= dt;
    if (levelState.candles[i].life <= 0) levelState.candles.splice(i, 1);
  }
  for (let i = levelState.rocks.length - 1; i >= 0; i--) {
    levelState.rocks[i].timer -= dt;
    if (levelState.rocks[i].timer <= 0) levelState.rocks.splice(i, 1);
  }

  // UI
  document.getElementById("sanity-bar").style.width =
    Math.max(0, player.sanity) + "%";
  document.getElementById("corruption-bar").style.width =
    Math.min(100, player.corruption) + "%";

  let carryText = "";
  if (player.carrying === "soul") carryText = " [SOUL]";
  else if (player.carrying === "candle") carryText = " [CANDLE]";
  else if (player.carrying === "rock") carryText = " [ROCK]";

  document.getElementById("souls-text").textContent =
    player.soulsDelivered + " / " + levelState.soulsNeeded + carryText;
  document.getElementById("candles-text").textContent =
    player.carrying || "nothing";
}
