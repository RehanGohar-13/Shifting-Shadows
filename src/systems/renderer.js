// ============================================
// Renderer
// ============================================

import { sprites } from "./sprites.js";
import { camera } from "./camera.js";
import { drawDarkness } from "./darkness.js";
import { drawHorrorEffects } from "./horror-effects.js";
import { player } from "../entities/player.js";
import { phantom, getSecondPhantom } from "../entities/phantom.js";
import { levelState } from "../levels/level-manager.js";
import { playerEffects } from "./player-controller.js";
import { distanceBetween } from "../utils/helpers.js";

const TILE_SIZE = 48;

export function render(ctx, canvas, gameTime) {
  if (!sprites.loaded) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a0812";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawFloor(ctx);
  drawBones(ctx); // NEW
  drawFootprints(ctx); // NEW
  drawWalls(ctx);
  drawSouls(ctx, gameTime);
  drawRockPickups(ctx);
  drawCandlePickups(ctx);
  drawRift(ctx, gameTime);
  drawCandles(ctx);
  drawRocks(ctx);
  drawPlayer(ctx);
  drawPhantom(ctx);
  drawSecondPhantom(ctx);

  ctx.restore();

  drawDarkness(
    ctx,
    canvas,
    levelState.candles,
    levelState.exitRift,
    levelState.souls,
    levelState.rocks,
    levelState.rockPickups,
  );

  drawHurtFlash(ctx, canvas); // NEW
  drawBreathingEffect(ctx, canvas, gameTime); // NEW
  drawSoulFlash(ctx, canvas);
  drawHorrorEffects(ctx, canvas, gameTime);
}

function drawBones(ctx) {
  if (!sprites.sprites.bone) return;
  for (const bone of levelState.bones) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.translate(bone.x, bone.y);
    ctx.rotate(bone.rotation);
    ctx.drawImage(sprites.sprites.bone, -12, -12, 24, 24);
    ctx.restore();
  }
}

function drawFootprints(ctx) {
  for (const fp of player.footprints) {
    if (fp.alpha <= 0) continue;
    ctx.fillStyle = `rgba(120, 0, 0, ${fp.alpha})`;
    ctx.beginPath();
    ctx.arc(fp.x - 4, fp.y, 2, 0, Math.PI * 2);
    ctx.arc(fp.x + 4, fp.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHurtFlash(ctx, canvas) {
  if (playerEffects.hurtFlashTimer <= 0) return;
  playerEffects.hurtFlashTimer -= 0.016;
  ctx.fillStyle = `rgba(255, 0, 0, ${playerEffects.hurtFlashTimer})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBreathingEffect(ctx, canvas, gameTime) {
  const dist = distanceBetween(player, phantom);
  if (dist > 400) return;
  const intensity = 1 - dist / 400;
  const breath = Math.sin(gameTime * 3) * intensity * 0.15;
  if (breath > 0) {
    ctx.fillStyle = `rgba(50, 0, 0, ${breath})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawFloor(ctx) {
  if (!sprites.sprites.floor) return;
  for (let r = 0; r < levelState.currentMapRows; r++)
    for (let c = 0; c < levelState.currentMapCols; c++)
      ctx.drawImage(
        sprites.sprites.floor,
        c * TILE_SIZE,
        r * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
  ctx.fillStyle = "rgba(10, 0, 20, 0.75)";
  ctx.fillRect(
    0,
    0,
    levelState.currentMapCols * TILE_SIZE,
    levelState.currentMapRows * TILE_SIZE,
  );
}
function drawWalls(ctx) {
  for (const w of levelState.walls) {
    if (sprites.sprites.wall) {
      ctx.drawImage(sprites.sprites.wall, w.x, w.y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "rgba(20, 0, 30, 0.3)";
      ctx.fillRect(w.x, w.y, TILE_SIZE, TILE_SIZE);
    }
  }
}
function drawSouls(ctx, gt) {
  for (const s of levelState.souls) {
    if (s.collected) continue;
    const bob = Math.sin(gt * 3 + s.x) * 3;
    ctx.save();
    ctx.shadowColor = "#c8d8ff";
    ctx.shadowBlur = 12;
    if (sprites.sprites.soul)
      ctx.drawImage(sprites.sprites.soul, s.x, s.y + bob, 24, 24);
    ctx.restore();
  }
}
function drawRockPickups(ctx) {
  for (const p of levelState.rockPickups) {
    if (p.collected) continue;
    if (sprites.sprites.rock) {
      ctx.drawImage(sprites.sprites.rock, p.x - 8, p.y - 4, 16, 16);
      ctx.drawImage(sprites.sprites.rock, p.x - 12, p.y + 4, 10, 10);
      ctx.drawImage(sprites.sprites.rock, p.x + 4, p.y + 2, 12, 12);
    }
  }
}
function drawCandlePickups(ctx) {
  for (const p of levelState.candlePickups) {
    if (p.collected) continue;
    if (sprites.sprites.candle) {
      ctx.save();
      ctx.shadowColor = "#ff8800";
      ctx.shadowBlur = 6;
      ctx.drawImage(sprites.sprites.candle, p.x - 8, p.y - 8, 16, 16);
      ctx.restore();
    }
  }
}
function drawRift(ctx, gt) {
  const r = levelState.exitRift;
  if (!r || !sprites.sprites.rift) return;
  if (r.readyToEscape) {
    const pulse = 1.4 + Math.sin(gt * 5) * 0.2;
    const sz = TILE_SIZE * pulse;
    const off = (sz - TILE_SIZE) / 2;
    ctx.save();
    ctx.shadowColor = "#00ffaa";
    ctx.shadowBlur = 40;
    ctx.drawImage(sprites.sprites.rift, r.x - off, r.y - off, sz, sz);
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = r.active ? 0.5 : 0.25;
    ctx.drawImage(sprites.sprites.rift, r.x, r.y, TILE_SIZE, TILE_SIZE);
    ctx.restore();
  }
}
function drawCandles(ctx) {
  for (const c of levelState.candles) {
    if (sprites.sprites.candle)
      ctx.drawImage(sprites.sprites.candle, c.x - 8, c.y - 4, 16, 16);
  }
}
function drawRocks(ctx) {
  for (const r of levelState.rocks) {
    const a = Math.min(1, r.timer / 1);
    if (sprites.sprites.rock && a > 0.1) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.drawImage(sprites.sprites.rock, r.x - 10, r.y - 10, 20, 20);
      ctx.restore();
    }
    if (r.timer > 0) {
      const w = (2 - r.timer) / 2;
      ctx.strokeStyle = `rgba(255, 200, 50, ${0.7 - w * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, w * r.noiseRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
function drawPlayer(ctx) {
  if (!sprites.sprites.player) return;
  ctx.save();

  // Blink when invulnerable
  if (player.invulnerableTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
    ctx.globalAlpha = 0.3;
  }

  const cx = player.x + player.width / 2,
    cy = player.y + player.height / 2;
  let bobY = 0,
    tilt = 0;
  if (player.moving) {
    bobY = Math.abs(Math.sin(Date.now() / (player.isRunning ? 66 : 100))) * -2;
    if (player.direction.x !== 0)
      tilt = player.direction.x * 0.08 * Math.sin(Date.now() / 100);
  }
  ctx.translate(cx, cy + bobY);
  ctx.rotate(tilt);
  ctx.translate(-cx, -cy - bobY);
  ctx.drawImage(
    sprites.sprites.player,
    player.x,
    player.y + bobY,
    player.width,
    player.height,
  );
  ctx.restore();

  if (player.carrying) {
    const bob = Math.sin(Date.now() / 200) * 3;
    let sp = null,
      glow = "#c8d8ff";
    if (player.carrying === "soul") {
      sp = sprites.sprites.soul;
      glow = "#c8d8ff";
    } else if (player.carrying === "candle") {
      sp = sprites.sprites.candle;
      glow = "#ff8800";
    } else if (player.carrying === "rock") {
      sp = sprites.sprites.rock;
      glow = "#775533";
    }
    if (sp) {
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 15;
      ctx.drawImage(sp, player.x + 5, player.y - 20 + bob, 20, 20);
      ctx.restore();
    }
  }
}
function drawPhantom(ctx) {
  const sp = sprites.sprites.phantom;
  const a = 0.7 + Math.sin(phantom.pulseTimer * 2) * 0.2;
  const hover = Math.sin(phantom.pulseTimer * 2) * 3;
  if (sp) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.shadowColor = phantom.state === "CHASE" ? "#ff0000" : "#8800ff";
    ctx.shadowBlur = phantom.state === "CHASE" ? 25 : 15;
    ctx.drawImage(
      sp,
      phantom.x - 4,
      phantom.y - 4 + hover,
      TILE_SIZE,
      TILE_SIZE,
    );
    ctx.restore();
  }
}
function drawSecondPhantom(ctx) {
  const sp = getSecondPhantom();
  if (!sp) return;
  const hover = Math.sin(sp.pulseTimer * 2.2) * 3;
  if (sprites.sprites.phantom2) {
    const a = 0.6 + Math.sin(sp.pulseTimer * 2.5) * 0.15;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.shadowColor = "#cc00ff";
    ctx.shadowBlur = 20;
    ctx.drawImage(
      sprites.sprites.phantom2,
      sp.x - 4,
      sp.y - 4 + hover,
      TILE_SIZE,
      TILE_SIZE,
    );
    ctx.restore();
  }
}
function drawSoulFlash(ctx, cv) {
  if (playerEffects.soulFlashTimer <= 0) return;
  playerEffects.soulFlashTimer -= 0.016;
  ctx.fillStyle = `rgba(200, 216, 255, ${playerEffects.soulFlashTimer})`;
  ctx.fillRect(0, 0, cv.width, cv.height);
}
