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

const TILE_SIZE = 48;

export function render(ctx, canvas, gameTime) {
  if (!sprites.loaded) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a0812";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawFloor(ctx);
  drawWalls(ctx);
  drawSouls(ctx, gameTime);
  drawRockPickups(ctx, gameTime);
  drawCandlePickups(ctx, gameTime);
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

  drawSoulFlash(ctx, canvas);
  drawRockFlash(ctx, canvas);
  drawHorrorEffects(ctx, canvas, gameTime);
}

function drawFloor(ctx) {
  if (!sprites.sprites.floor) return;

  for (let row = 0; row < levelState.currentMapRows; row++) {
    for (let col = 0; col < levelState.currentMapCols; col++) {
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
  ctx.fillRect(
    0,
    0,
    levelState.currentMapCols * TILE_SIZE,
    levelState.currentMapRows * TILE_SIZE,
  );
}

function drawWalls(ctx) {
  for (const wall of levelState.walls) {
    if (sprites.sprites.wall) {
      ctx.drawImage(sprites.sprites.wall, wall.x, wall.y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "rgba(20, 0, 30, 0.3)";
      ctx.fillRect(wall.x, wall.y, TILE_SIZE, TILE_SIZE);
    } else {
      ctx.fillStyle = "#241332";
      ctx.fillRect(wall.x, wall.y, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawSouls(ctx, gameTime) {
  for (const soul of levelState.souls) {
    if (soul.collected) continue;
    const bob = Math.sin(gameTime * 3 + soul.x) * 3;

    if (sprites.sprites.soul) {
      ctx.save();
      ctx.shadowColor = "#c8d8ff";
      ctx.shadowBlur = 12;
      ctx.drawImage(sprites.sprites.soul, soul.x, soul.y + bob, 24, 24);
      ctx.restore();
    } else {
      ctx.fillStyle = "#aaccff";
      ctx.beginPath();
      ctx.arc(soul.x + 12, soul.y + 12 + bob, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRockPickups(ctx, gameTime) {
  for (const pickup of levelState.rockPickups) {
    if (pickup.collected) continue;

    if (sprites.sprites.rock) {
      ctx.drawImage(sprites.sprites.rock, pickup.x - 8, pickup.y - 4, 16, 16);
      ctx.drawImage(sprites.sprites.rock, pickup.x - 12, pickup.y + 4, 10, 10);
      ctx.drawImage(sprites.sprites.rock, pickup.x + 4, pickup.y + 2, 12, 12);
    } else {
      ctx.fillStyle = "#775533";
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCandlePickups(ctx, gameTime) {
  for (const pickup of levelState.candlePickups) {
    if (pickup.collected) continue;

    if (sprites.sprites.candle) {
      ctx.save();
      ctx.shadowColor = "#ff8800";
      ctx.shadowBlur = 6;
      ctx.drawImage(sprites.sprites.candle, pickup.x - 8, pickup.y - 8, 16, 16);
      ctx.restore();
    }
  }
}

function drawRift(ctx, gameTime) {
  const rift = levelState.exitRift;
  if (!rift || !sprites.sprites.rift) return;

  const readyToEscape = rift.readyToEscape === true;

  if (readyToEscape) {
    const riftPulse = 1.4 + Math.sin(gameTime * 5) * 0.2;
    const riftSize = TILE_SIZE * riftPulse;
    const riftOffset = (riftSize - TILE_SIZE) / 2;

    ctx.save();
    ctx.shadowColor = "#00ffaa";
    ctx.shadowBlur = 40;
    ctx.drawImage(
      sprites.sprites.rift,
      rift.x - riftOffset,
      rift.y - riftOffset,
      riftSize,
      riftSize,
    );
    ctx.restore();
  } else if (rift.active) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(sprites.sprites.rift, rift.x, rift.y, TILE_SIZE, TILE_SIZE);
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.drawImage(sprites.sprites.rift, rift.x, rift.y, TILE_SIZE, TILE_SIZE);
    ctx.restore();
  }
}

function drawCandles(ctx) {
  for (const candle of levelState.candles) {
    if (sprites.sprites.candle) {
      ctx.drawImage(sprites.sprites.candle, candle.x - 8, candle.y - 4, 16, 16);
    }
  }
}

function drawRocks(ctx) {
  for (const rock of levelState.rocks) {
    const rockAlpha = Math.min(1, rock.timer / 1);

    if (sprites.sprites.rock && rockAlpha > 0.1) {
      ctx.save();
      ctx.globalAlpha = rockAlpha;
      ctx.drawImage(sprites.sprites.rock, rock.x - 10, rock.y - 10, 20, 20);
      ctx.restore();
    }

    if (rock.timer > 0) {
      const wave = (2 - rock.timer) / 2;
      const waveAlpha = 0.7 - wave * 0.7;

      ctx.strokeStyle = `rgba(255, 200, 50, ${waveAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rock.x, rock.y, wave * rock.noiseRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 100, 50, ${waveAlpha * 0.6})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rock.x, rock.y, wave * rock.noiseRadius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawPlayer(ctx) {
  if (!sprites.sprites.player) {
    ctx.fillStyle = "#c8d8ff";
    ctx.fillRect(player.x, player.y, player.width, player.height);
    return;
  }

  ctx.save();

  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;

  let bobY = 0;
  let tilt = 0;

  if (player.moving) {
    const bobSpeed = player.isRunning ? 15 : 10;
    bobY = Math.abs(Math.sin(Date.now() / (1000 / bobSpeed))) * -2;

    if (player.direction.x !== 0) {
      tilt = player.direction.x * 0.08 * Math.sin(Date.now() / 100);
    }
  }

  ctx.translate(centerX, centerY + bobY);
  ctx.rotate(tilt);
  ctx.translate(-centerX, -centerY - bobY);

  ctx.drawImage(
    sprites.sprites.player,
    player.x,
    player.y + bobY,
    player.width,
    player.height,
  );

  ctx.restore();

  // Draw carried item above player
  if (player.carrying) {
    const itemBob = Math.sin(Date.now() / 200) * 3;
    let itemSprite = null;
    let glowColor = "#c8d8ff";

    if (player.carrying === "soul") {
      itemSprite = sprites.sprites.soul;
      glowColor = "#c8d8ff";
    } else if (player.carrying === "candle") {
      itemSprite = sprites.sprites.candle;
      glowColor = "#ff8800";
    } else if (player.carrying === "rock") {
      itemSprite = sprites.sprites.rock;
      glowColor = "#775533";
    }

    if (itemSprite) {
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.drawImage(itemSprite, player.x + 5, player.y - 20 + itemBob, 20, 20);
      ctx.restore();
    }
  }

  if (player.isRunning) {
    ctx.strokeStyle = "rgba(255, 100, 100, 0.3)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawPhantom(ctx) {
  const pcenterX = phantom.x + phantom.width / 2;
  const pcenterY = phantom.y + phantom.height / 2;
  const phantomSprite = sprites.sprites.phantom;
  const phantomAlpha = 0.7 + Math.sin(phantom.pulseTimer * 2) * 0.2;
  const hoverY = Math.sin(phantom.pulseTimer * 2) * 3;

  if (phantomSprite) {
    ctx.save();
    ctx.globalAlpha = phantomAlpha;
    ctx.shadowColor = phantom.state === "CHASE" ? "#ff0000" : "#8800ff";
    ctx.shadowBlur = phantom.state === "CHASE" ? 25 : 15;
    ctx.drawImage(
      phantomSprite,
      phantom.x - 4,
      phantom.y - 4 + hoverY,
      TILE_SIZE,
      TILE_SIZE,
    );
    ctx.restore();
  }

  const eyeGlow = 0.7 + Math.sin(phantom.pulseTimer * 4) * 0.3;
  const eyeSize = phantom.state === "CHASE" ? 2.5 : 2;

  // Eyes positioned relative to sprite top
  const eyeY = phantom.y + 12 + hoverY;

  ctx.save();
  ctx.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(pcenterX - 8, eyeY, eyeSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pcenterX + 8, eyeY, eyeSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSecondPhantom(ctx) {
  const sp = getSecondPhantom();
  if (!sp) return;

  const spCX = sp.x + sp.width / 2;
  const spCY = sp.y + sp.height / 2;
  const hoverY = Math.sin(sp.pulseTimer * 2.2) * 3;

  if (sprites.sprites.phantom2) {
    const spAlpha = 0.6 + Math.sin(sp.pulseTimer * 2.5) * 0.15;
    ctx.save();
    ctx.globalAlpha = spAlpha;
    ctx.shadowColor = "#cc00ff";
    ctx.shadowBlur = 20;
    ctx.drawImage(
      sprites.sprites.phantom2,
      sp.x - 4,
      sp.y - 4 + hoverY,
      TILE_SIZE,
      TILE_SIZE,
    );
    ctx.restore();
  }

  const spEyeGlow = 0.6 + Math.sin(sp.pulseTimer * 4) * 0.3;
  const spEyeY = sp.y + 12 + hoverY;

  ctx.save();
  ctx.fillStyle = `rgba(200, 0, 255, ${spEyeGlow})`;
  ctx.shadowColor = "#cc00ff";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(spCX - 8, spEyeY, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(spCX + 8, spEyeY, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSoulFlash(ctx, canvas) {
  if (playerEffects.soulFlashTimer <= 0) return;
  playerEffects.soulFlashTimer -= 0.016;
  ctx.fillStyle = `rgba(200, 216, 255, ${playerEffects.soulFlashTimer})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawRockFlash(ctx, canvas) {
  if (playerEffects.rockFlashTimer <= 0) return;
  playerEffects.rockFlashTimer -= 0.016;
  ctx.fillStyle = `rgba(255, 170, 100, ${playerEffects.rockFlashTimer * 0.5})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
