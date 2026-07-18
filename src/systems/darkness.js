// ============================================
// Darkness / Vision System
// ============================================

import { player } from "../entities/player.js";
import { camera } from "./camera.js";

export function drawDarkness(ctx, canvas, candles, exitRift, souls, rocks) {
  const darkCanvas = document.createElement("canvas");
  darkCanvas.width = canvas.width;
  darkCanvas.height = canvas.height;
  const dCtx = darkCanvas.getContext("2d");

  dCtx.fillStyle = "rgba(0, 0, 0, 0.94)";
  dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
  dCtx.globalCompositeOperation = "destination-out";

  // Player vision
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

  // Candle lights
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

  // Rift glow
  if (exitRift && exitRift.active) {
    const rx = exitRift.x + 24 - camera.x;
    const ry = exitRift.y + 24 - camera.y;
    const riftGlow = dCtx.createRadialGradient(rx, ry, 5, rx, ry, 80);
    riftGlow.addColorStop(0, "rgba(0,0,0,0.8)");
    riftGlow.addColorStop(1, "rgba(0,0,0,0)");
    dCtx.fillStyle = riftGlow;
    dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
  }

  // Soul glow — bigger and brighter
  for (const soul of souls) {
    if (!soul.collected) {
      const sx = soul.x + 12 - camera.x;
      const sy = soul.y + 12 - camera.y;
      const soulGlow = dCtx.createRadialGradient(sx, sy, 5, sx, sy, 90);
      soulGlow.addColorStop(0, "rgba(0,0,0,0.85)");
      soulGlow.addColorStop(1, "rgba(0,0,0,0)");
      dCtx.fillStyle = soulGlow;
      dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
    }
  }

  // Rock glow — makes thrown rocks visible
  if (rocks) {
    for (const rock of rocks) {
      const rx = rock.x - camera.x;
      const ry = rock.y - camera.y;
      const rockGlow = dCtx.createRadialGradient(rx, ry, 3, rx, ry, 50);
      rockGlow.addColorStop(0, "rgba(0,0,0,0.5)");
      rockGlow.addColorStop(1, "rgba(0,0,0,0)");
      dCtx.fillStyle = rockGlow;
      dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
    }
  }

  ctx.drawImage(darkCanvas, 0, 0);
}
