// ============================================
// Horror Effects — Whispers, Tears, Static
// ============================================

import { player } from "../entities/player.js";
import { phantom } from "../entities/phantom.js";
import { camera } from "./camera.js";
import { sound } from "./sound-system.js";
import { distanceBetween } from "../utils/helpers.js";

export function drawHorrorEffects(ctx, canvas, gameTime) {
  const distToPhantom = distanceBetween(player, phantom);

  // Phantom proximity heartbeat tint
  if (distToPhantom < 200) {
    const heartRate = Math.max(0.5, distToPhantom / 200) * 2;
    const heartBeat = Math.abs(Math.sin(gameTime * (Math.PI / heartRate)));
    const heartAlpha = ((200 - distToPhantom) / 200) * 0.08 * heartBeat;

    ctx.fillStyle = `rgba(255, 0, 0, ${heartAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Red vignette
  if (distToPhantom < 250) {
    const intensity = (250 - distToPhantom) / 250;

    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.25,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.75,
    );

    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(80,0,0,${intensity * 0.45})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Corruption tint
  if (player.corruption > 30) {
    const ci = (player.corruption - 30) / 70;
    ctx.fillStyle = `rgba(100, 0, 180, ${ci * 0.15})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Low sanity flicker
  if (player.sanity < 30 && Math.random() < 0.05) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + Math.random() * 0.4})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Chase glitches
  if (phantom.state === "CHASE" || phantom.state === "HUNT") {
    if (Math.random() < 0.15) {
      const tearY = Math.floor(Math.random() * canvas.height);
      const tearHeight = 3 + Math.floor(Math.random() * 15);
      const tearShift = (Math.random() - 0.5) * 50;

      try {
        const imageData = ctx.getImageData(
          0,
          Math.max(0, tearY),
          canvas.width,
          Math.min(tearHeight, canvas.height - tearY),
        );

        ctx.putImageData(imageData, tearShift, tearY);
      } catch (e) {}
    }

    if (Math.random() < 0.04) {
      ctx.globalCompositeOperation = "difference";
      ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
    }
  }

  // Whisper text
  if (distToPhantom < 300 && Math.random() < 0.025) {
    sound.playWhisper();

    const whispers = [
      "I SEE YOU",
      "RUN",
      "BEHIND YOU",
      "CLOSER",
      "YOU CANT HIDE",
      "IM LEARNING",
      "DONT BREATHE",
      "LOOK AWAY",
      "ITS TOO LATE",
      "I REMEMBER YOU",
      "YOURE MINE",
      "COME CLOSER",
      "DONT TURN AROUND",
      "I CAN SMELL YOUR FEAR",
    ];

    const whisper = whispers[Math.floor(Math.random() * whispers.length)];

    ctx.save();
    ctx.globalAlpha = 0.08 + Math.random() * 0.12;
    ctx.fillStyle = "#ff0033";
    ctx.font = `${16 + Math.random() * 28}px monospace`;
    ctx.fillText(
      whisper,
      50 + Math.random() * (canvas.width - 200),
      50 + Math.random() * (canvas.height - 100),
    );
    ctx.restore();
  }

  // Static noise strips
  if (player.sanity < 50) {
    const intensity = (50 - player.sanity) / 50;

    if (Math.random() < intensity * 0.5) {
      const stripY = Math.floor(Math.random() * canvas.height);
      const stripH = 1 + Math.floor(Math.random() * 4);

      ctx.fillStyle = `rgba(255,255,255,${intensity * 0.05})`;
      ctx.fillRect(0, stripY, canvas.width, stripH);
    }
  }

  // Random eyes in darkness
  if (Math.random() < 0.008 && distToPhantom > 150) {
    const screenX = Math.random() * canvas.width;
    const screenY = Math.random() * canvas.height;

    const distFromPlayer = Math.sqrt(
      Math.pow(screenX - (player.x - camera.x + player.width / 2), 2) +
        Math.pow(screenY - (player.y - camera.y + player.height / 2), 2),
    );

    if (distFromPlayer > 180) {
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.random() * 0.15;
      ctx.fillStyle = "#ff0000";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 5;

      ctx.beginPath();
      ctx.ellipse(screenX - 7, screenY, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(screenX + 7, screenY, 3.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // Breathing corruption overlay
  if (player.corruption > 20) {
    const breathe = Math.sin(gameTime * 2) * (player.corruption / 100) * 0.08;
    ctx.fillStyle = `rgba(80, 0, 120, ${breathe > 0 ? breathe : 0})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
