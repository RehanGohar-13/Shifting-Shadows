// ============================================
// Darkness System — OPTIMIZED
// ============================================

import { player } from "../entities/player.js";
import { camera } from "./camera.js";

// Reuse canvas — don't create new one every frame
let darkCanvas = null;
let dCtx = null;

function ensureCanvas(w, h) {
  if (!darkCanvas || darkCanvas.width !== w || darkCanvas.height !== h) {
    darkCanvas = document.createElement("canvas");
    darkCanvas.width = w;
    darkCanvas.height = h;
    dCtx = darkCanvas.getContext("2d", { willReadFrequently: false });
  }
}

export function drawDarkness(
  ctx,
  canvas,
  candles,
  exitRift,
  souls,
  rocks,
  rockPickups,
) {
  ensureCanvas(canvas.width, canvas.height);

  // Clear reused canvas
  dCtx.clearRect(0, 0, darkCanvas.width, darkCanvas.height);
  dCtx.fillStyle = "rgba(0, 0, 0, 0.94)";
  dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
  dCtx.globalCompositeOperation = "destination-out";

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

  // Only draw candles on screen
  for (const candle of candles) {
    const cx = candle.x - camera.x;
    const cy = candle.y - camera.y;
    if (cx < -150 || cx > canvas.width + 150) continue;
    if (cy < -150 || cy > canvas.height + 150) continue;

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

  if (exitRift && exitRift.active) {
    const rx = exitRift.x + 24 - camera.x;
    const ry = exitRift.y + 24 - camera.y;
    if (
      rx > -100 &&
      rx < canvas.width + 100 &&
      ry > -100 &&
      ry < canvas.height + 100
    ) {
      const riftGlow = dCtx.createRadialGradient(rx, ry, 5, rx, ry, 80);
      riftGlow.addColorStop(0, "rgba(0,0,0,0.8)");
      riftGlow.addColorStop(1, "rgba(0,0,0,0)");
      dCtx.fillStyle = riftGlow;
      dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
    }
  }

  for (const soul of souls) {
    if (soul.collected) continue;
    const sx = soul.x + 12 - camera.x;
    const sy = soul.y + 12 - camera.y;
    if (sx < -100 || sx > canvas.width + 100) continue;
    if (sy < -100 || sy > canvas.height + 100) continue;

    const soulGlow = dCtx.createRadialGradient(sx, sy, 5, sx, sy, 90);
    soulGlow.addColorStop(0, "rgba(0,0,0,0.85)");
    soulGlow.addColorStop(1, "rgba(0,0,0,0)");
    dCtx.fillStyle = soulGlow;
    dCtx.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
  }

  dCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(darkCanvas, 0, 0);
}
