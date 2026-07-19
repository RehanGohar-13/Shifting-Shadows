// ============================================
// Player Controller
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
  hurtFlashTimer: 0,
};

let ePressed = false;
let fPressed = false;

export function updatePlayer(dt, callbacks = {}) {
  const { nextLevel, gameOver } = callbacks;

  // Invulnerability countdown
  if (player.invulnerableTimer > 0) {
    player.invulnerableTimer -= dt;
  }

  let dx = 0,
    dy = 0;
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

  if (dx !== 0 || dy !== 0) player.direction = { x: dx, y: dy };

  const newX = player.x + dx * speed * dt;
  if (
    !collidesWithWalls(
      newX,
      player.y,
      player.width,
      player.height,
      levelState.walls,
    )
  )
    player.x = newX;
  const newY = player.y + dy * speed * dt;
  if (
    !collidesWithWalls(
      player.x,
      newY,
      player.width,
      player.height,
      levelState.walls,
    )
  )
    player.y = newY;

  // Footsteps + Bloody Footprints
  if (player._stepTimer >= stepInterval) {
    player._stepTimer = 0;
    if (player.isRunning) sound.playRunStep();
    else sound.playFootstep();

    // Drop bloody footprint (alternate left/right offset)
    if (!player._footprintSide) player._footprintSide = 0;
    player._footprintSide = 1 - player._footprintSide;

    const offset = player._footprintSide === 0 ? -6 : 6;
    const perpX = -player.direction.y * offset;
    const perpY = player.direction.x * offset;

    player.footprints.push({
      x: player.x + player.width / 2 + perpX,
      y: player.y + player.height / 2 + perpY,
      alpha: 0.5,
    });
    if (player.footprints.length > 30) player.footprints.shift();
  }

  // Fade footprints
  for (const fp of player.footprints) fp.alpha -= 0.02 * dt;

  // Soul trail
  player.trailTimer += dt;
  if (player.trailTimer > 0.3) {
    player.soulTrail.push({ x: player.x, y: player.y });
    if (player.soulTrail.length > 40) player.soulTrail.shift();
    player.trailTimer = 0;
  }

  // Light + Sanity
  player.inLight = false;
  if (player.carrying === "candle") player.inLight = true;
  else {
    for (const candle of levelState.candles) {
      if (distanceBetween(player, candle) < candle.radius) {
        player.inLight = true;
        break;
      }
    }
  }
  if (player.carrying === "candle")
    player.sanity = Math.min(100, player.sanity + 3 * dt);
  else if (!player.inLight) player.sanity -= 1.8 * dt;
  else player.sanity = Math.min(100, player.sanity + 5 * dt);

  const distToPhantom = distanceBetween(player, phantom);
  if (distToPhantom < 150)
    player.corruption += ((150 - distToPhantom) / 150) * 15 * dt;
  else player.corruption = Math.max(0, player.corruption - 2 * dt);

  // Whispers from bones (random events)
  for (const bone of levelState.bones) {
    if (!bone.whispered && distanceBetween(player, bone) < 40) {
      bone.whispered = true;
      if (Math.random() < 0.3) sound.playWhisper();
    }
  }

  // Pickups
  if (!player.carrying) {
    for (const soul of levelState.souls) {
      if (!soul.collected && rectsCollide(player, soul)) {
        soul.collected = true;
        player.carrying = "soul";
        playerEffects.soulFlashTimer = 0.3;
        sound.playSoulCollect();
        if (levelState.exitRift) levelState.exitRift.active = true;
        break;
      }
    }
    if (!player.carrying) {
      for (const p of levelState.rockPickups) {
        if (
          !p.collected &&
          rectsCollide(player, {
            x: p.x - 8,
            y: p.y - 8,
            width: 16,
            height: 16,
          })
        ) {
          p.collected = true;
          player.carrying = "rock";
          sound.playRockPickup();
          break;
        }
      }
    }
    if (!player.carrying) {
      for (const p of levelState.candlePickups) {
        if (
          !p.collected &&
          rectsCollide(player, {
            x: p.x - 8,
            y: p.y - 8,
            width: 16,
            height: 16,
          })
        ) {
          p.collected = true;
          player.carrying = "candle";
          sound.playCandlePlace();
          if (p.wasPlaced) {
            for (let i = levelState.candles.length - 1; i >= 0; i--) {
              const c = levelState.candles[i];
              if (Math.hypot(c.x - p.x, c.y - p.y) < 5) {
                levelState.candles.splice(i, 1);
                break;
              }
            }
          }
          break;
        }
      }
    }
  }

  // Deliver soul
  if (
    player.carrying === "soul" &&
    levelState.exitRift &&
    rectsCollide(player, levelState.exitRift) &&
    !levelState.exitRift.readyToEscape
  ) {
    player.carrying = null;
    player.soulsDelivered++;
    playerEffects.soulFlashTimer = 0.5;
    sound.playRiftOpen();
    if (player.soulsDelivered >= levelState.soulsNeeded) {
      levelState.exitRift.readyToEscape = true;
      levelState.exitRift.justBecameReady = true;
      moveRiftRandomly();
      levelState.exitRift.active = true;
    } else moveRiftRandomly();
    return;
  }

  // Escape
  if (
    levelState.exitRift &&
    levelState.exitRift.readyToEscape &&
    !levelState.exitRift.justBecameReady &&
    !player.carrying &&
    !levelState.exitRift.triggered &&
    rectsCollide(player, levelState.exitRift)
  ) {
    levelState.exitRift.triggered = true;
    if (nextLevel) nextLevel();
  }
  if (
    levelState.exitRift &&
    levelState.exitRift.justBecameReady &&
    !rectsCollide(player, levelState.exitRift)
  ) {
    levelState.exitRift.justBecameReady = false;
  }

  // E - Drop/Place
  if (keys["e"] && !ePressed) {
    ePressed = true;
    if (player.carrying === "candle") {
      sound.playCandlePlace();
      levelState.candles.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        radius: 100,
        life: 999999,
        permanent: false,
      });
      levelState.candlePickups.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        collected: false,
        wasPlaced: true,
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
  if (!keys["e"]) ePressed = false;

  // F - Throw
  if (keys["f"] && !fPressed && player.carrying === "rock") {
    fPressed = true;
    player.carrying = null;
    sound.playRockThrow();
    setTimeout(() => sound.playRockImpact(), 300);
    levelState.rocks.push({
      x: player.x + player.direction.x * 200,
      y: player.y + player.direction.y * 200,
      timer: 2,
      noiseRadius: 220,
    });
  }
  if (!keys["f"]) fPressed = false;

  // ── DAMAGE SYSTEM ──
  function takeDamage(reason) {
    if (player.invulnerableTimer > 0) return;
    player.lives--;
    player.invulnerableTimer = 2.0; // 2s of I-frames
    playerEffects.hurtFlashTimer = 0.5;
    sound.playJumpscare();

    if (player.lives <= 0) {
      if (gameOver) gameOver(reason);
    } else {
      // Update hearts UI
      updateHeartsUI();
      // Push phantom away
      const dx = phantom.x - player.x;
      const dy = phantom.y - player.y;
      const dist = Math.hypot(dx, dy) || 1;
      phantom.x += (dx / dist) * 100;
      phantom.y += (dy / dist) * 100;
    }
  }

  if (player.sanity <= 0 && gameOver) gameOver("Your mind faded into nothing.");
  if (player.corruption >= 100 && gameOver) gameOver("You became one of them.");
  if (rectsCollide(player, phantom)) takeDamage("The shadow consumed you.");
  const sp = getSecondPhantom();
  if (sp && rectsCollide(player, sp))
    takeDamage("A second shadow consumed you.");

  // Cleanup
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
  document.getElementById("souls-text").textContent =
    player.soulsDelivered + " / " + levelState.soulsNeeded;
  const carryEl = document.getElementById("carry-text");
  if (carryEl) carryEl.textContent = player.carrying || "empty";
}

export function updateHeartsUI() {
  const container = document.getElementById("hearts-container");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < player.maxLives; i++) {
    const h = document.createElement("span");
    h.className = "heart" + (i >= player.lives ? " empty" : "");
    h.textContent = i < player.lives ? "❤️" : "🖤";
    container.appendChild(h);
  }
}
