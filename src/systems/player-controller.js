// ============================================
// Player Controller — Physics Pickup System
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

  if (player.invulnerableTimer > 0) player.invulnerableTimer -= dt;

  // Movement
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

  // Footsteps
  if (player.moving) {
    player._stepTimer += dt;
    const stepInterval = player.isRunning ? 0.2 : 0.35;
    if (player._stepTimer >= stepInterval) {
      player._stepTimer = 0;
      if (player.isRunning) sound.playRunStep();
      else sound.playFootstep();

      player._footprintSide = 1 - player._footprintSide;
      const offset = player._footprintSide === 0 ? -6 : 6;
      const perpX = -player.direction.y * offset;
      const perpY = player.direction.x * offset;

      player.footprints.push({
        x: player.x + player.width / 2 + perpX,
        y: player.y + player.height / 2 + perpY,
        alpha: 0.5,
        angle: Math.atan2(player.direction.y, player.direction.x) + Math.PI / 2,
      });
      if (player.footprints.length > 30) player.footprints.shift();
    }
  }

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

  // ══════════════════════════════════════
  // PHYSICS PICKUP SYSTEM
  // ══════════════════════════════════════

  // Find nearest pickup in range
  const pickupRange = 45;
  const pcx = player.x + player.width / 2;
  const pcy = player.y + player.height / 2;

  let nearestPickup = null;
  let nearestType = null;
  let nearestDist = pickupRange;

  if (!player.carrying) {
    // Check souls
    for (const soul of levelState.souls) {
      if (soul.collected) continue;
      const d = Math.hypot(soul.x + 12 - pcx, soul.y + 12 - pcy);
      if (d < nearestDist) {
        nearestDist = d;
        nearestPickup = soul;
        nearestType = "soul";
      }
    }
    // Check rocks
    for (const p of levelState.rockPickups) {
      if (p.collected) continue;
      const d = Math.hypot(p.x - pcx, p.y - pcy);
      if (d < nearestDist) {
        nearestDist = d;
        nearestPickup = p;
        nearestType = "rock";
      }
    }
    // Check candles
    for (const p of levelState.candlePickups) {
      if (p.collected) continue;
      const d = Math.hypot(p.x - pcx, p.y - pcy);
      if (d < nearestDist) {
        nearestDist = d;
        nearestPickup = p;
        nearestType = "candle";
      }
    }
  }

  // E KEY - Pickup or drop
  if (keys["e"] && !ePressed) {
    ePressed = true;

    if (player.carrying) {
      // DROP current item at hold point
      dropHeldItem();
    } else if (nearestPickup) {
      // PICK UP nearest item
      nearestPickup.collected = true;
      player.carrying = nearestType;
      playerEffects.soulFlashTimer = 0.2;

      // Initialize hold point at pickup position
      player.heldObject.x =
        nearestType === "soul" ? nearestPickup.x + 12 : nearestPickup.x;
      player.heldObject.y =
        nearestType === "soul" ? nearestPickup.y + 12 : nearestPickup.y;
      player.heldObject.vx = 0;
      player.heldObject.vy = 0;

      if (nearestType === "soul") {
        sound.playSoulCollect();
        if (levelState.exitRift) levelState.exitRift.active = true;
      } else if (nearestType === "rock") {
        sound.playRockPickup();
      } else if (nearestType === "candle") {
        sound.playCandlePlace();
        if (nearestPickup.wasPlaced) {
          for (let i = levelState.candles.length - 1; i >= 0; i--) {
            const c = levelState.candles[i];
            if (Math.hypot(c.x - nearestPickup.x, c.y - nearestPickup.y) < 5) {
              levelState.candles.splice(i, 1);
              break;
            }
          }
        }
      }
    }
  }
  if (!keys["e"]) ePressed = false;

  // UPDATE HELD OBJECT PHYSICS
  if (player.carrying) {
    // Hold point = in front of player based on direction
    const holdX = pcx + player.direction.x * player.holdDistance;
    const holdY = pcy + player.direction.y * player.holdDistance;

    // Spring-like force toward hold point
    const dx = holdX - player.heldObject.x;
    const dy = holdY - player.heldObject.y;

    player.heldObject.vx += dx * player.followStrength * dt;
    player.heldObject.vy += dy * player.followStrength * dt;

    // Damping
    player.heldObject.vx *= 0.85;
    player.heldObject.vy *= 0.85;

    // Try to apply velocity (respect walls)
    const nextX = player.heldObject.x + player.heldObject.vx * dt;
    const nextY = player.heldObject.y + player.heldObject.vy * dt;

    if (
      !collidesWithWalls(
        nextX - 6,
        player.heldObject.y - 6,
        12,
        12,
        levelState.walls,
      )
    ) {
      player.heldObject.x = nextX;
    } else {
      player.heldObject.vx = 0;
    }
    if (
      !collidesWithWalls(
        player.heldObject.x - 6,
        nextY - 6,
        12,
        12,
        levelState.walls,
      )
    ) {
      player.heldObject.y = nextY;
    } else {
      player.heldObject.vy = 0;
    }
  }

  // DELIVER SOUL TO RIFT (using held object position)
  if (
    player.carrying === "soul" &&
    levelState.exitRift &&
    !levelState.exitRift.readyToEscape
  ) {
    const dist = Math.hypot(
      player.heldObject.x - (levelState.exitRift.x + 24),
      player.heldObject.y - (levelState.exitRift.y + 24),
    );
    if (dist < 40) {
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
  }

  // ESCAPE
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

  // F - Throw rock
  if (keys["f"] && !fPressed && player.carrying === "rock") {
    fPressed = true;
    const throwX = player.heldObject.x + player.direction.x * 250;
    const throwY = player.heldObject.y + player.direction.y * 250;
    player.carrying = null;
    sound.playRockThrow();
    setTimeout(() => sound.playRockImpact(), 300);
    levelState.rocks.push({
      x: throwX,
      y: throwY,
      timer: 2,
      noiseRadius: 220,
    });
  }
  if (!keys["f"]) fPressed = false;

  // Damage
  function takeDamage(reason) {
    if (player.invulnerableTimer > 0) return;
    player.lives--;
    player.invulnerableTimer = 2.0;
    playerEffects.hurtFlashTimer = 0.5;
    sound.playJumpscare();

    if (player.lives <= 0) {
      if (gameOver) gameOver(reason);
    } else {
      updateHeartsUI();
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
  if (carryEl) {
    if (player.carrying) carryEl.textContent = player.carrying;
    else if (nearestPickup) carryEl.textContent = "[E] pick up " + nearestType;
    else carryEl.textContent = "empty";
  }
}

function dropHeldItem() {
  const cx = player.heldObject.x;
  const cy = player.heldObject.y;

  if (player.carrying === "candle") {
    sound.playCandlePlace();
    levelState.candles.push({
      x: cx,
      y: cy,
      radius: 100,
      life: 999999,
      permanent: false,
    });
    levelState.candlePickups.push({
      x: cx,
      y: cy,
      collected: false,
      wasPlaced: true,
    });
  } else if (player.carrying === "rock") {
    levelState.rockPickups.push({
      x: cx,
      y: cy,
      collected: false,
    });
  } else if (player.carrying === "soul") {
    levelState.souls.push({
      x: cx - 12,
      y: cy - 12,
      width: 24,
      height: 24,
      collected: false,
    });
  }

  player.carrying = null;
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
