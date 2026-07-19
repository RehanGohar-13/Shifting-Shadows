// ============================================
// Phantom AI — Smart + LOS Aware
// ============================================

import { player } from "../entities/player.js";
import { phantom, phantomAI, getSecondPhantom } from "../entities/phantom.js";
import { levelState } from "../levels/level-manager.js";
import {
  distanceBetween,
  collidesWithWalls,
  hasLineOfSight,
  rectsCollide,
} from "../utils/helpers.js";
import { sound } from "./sound-system.js";

const playerHistory = [];
const HISTORY_SIZE = 30;
let historyTimer = 0;

export function updatePhantom(dt) {
  phantom.pulseTimer += dt;
  phantomAI.accelerationTimer += dt;

  historyTimer += dt;
  if (historyTimer > 0.1) {
    playerHistory.push({ x: player.x, y: player.y, time: Date.now() });
    if (playerHistory.length > HISTORY_SIZE) playerHistory.shift();
    historyTimer = 0;
  }

  preventRiftCamping(dt);

  switch (phantom.state) {
    case "IDLE":
      patrolWander(dt);
      checkPhantomSenses();
      phantomAI.alertLevel = Math.max(0, phantomAI.alertLevel - 8 * dt);
      break;

    case "ALERTED":
      if (phantomAI.lastKnownPlayer) {
        moveToward(phantomAI.lastKnownPlayer, dt, 1.15);
      }
      checkPhantomSenses();
      phantomAI.alertLevel += 30 * dt;

      if (phantomAI.alertLevel >= 100) {
        phantom.state = "HUNT";
        buildHuntGrid();
      }
      break;

    case "HUNT":
      huntPlayer(dt);
      checkPhantomSenses();
      break;

    case "CHASE": {
      const chaseSpeed = Math.min(
        2.2,
        1.4 + phantomAI.accelerationTimer * 0.08,
      );
      moveToward(player, dt, chaseSpeed);

      phantomAI.lastKnownPlayer = { x: player.x, y: player.y };

      // Give up chase MUCH faster if line of sight lost
      if (!canDetectPlayer()) {
        phantomAI.giveUpTimer += dt;
        if (phantomAI.giveUpTimer > 1.2) {
          phantom.state = "LOST";
          phantomAI.lostTimer = 3;
          phantomAI.accelerationTimer = 0;
          phantomAI.giveUpTimer = 0;
        }
      } else {
        phantomAI.giveUpTimer = 0;
      }

      // Also give up if player is very far away
      const dist = distanceBetween(phantom, player);
      if (dist > 450) {
        phantom.state = "LOST";
        phantomAI.lostTimer = 3;
        phantomAI.accelerationTimer = 0;
      }
      break;
    }

    case "LOST":
      // Slowly investigates last known position
      if (phantomAI.lastKnownPlayer) {
        moveToward(phantomAI.lastKnownPlayer, dt, 0.7);
      }
      checkPhantomSenses();

      phantomAI.lostTimer -= dt;
      if (phantomAI.lostTimer <= 0) {
        // Fully forget — reset alert
        phantomAI.alertLevel = 0;
        phantomAI.lastKnownPlayer = null;
        phantom.state = "IDLE";
      }
      break;
  }
}

function predictPlayerPosition(secondsAhead) {
  if (playerHistory.length < 5) return { x: player.x, y: player.y };

  const recent = playerHistory[playerHistory.length - 1];
  const older = playerHistory[playerHistory.length - 5];

  const timeDiff = (recent.time - older.time) / 1000;
  if (timeDiff <= 0) return { x: player.x, y: player.y };

  const vx = (recent.x - older.x) / timeDiff;
  const vy = (recent.y - older.y) / timeDiff;

  return {
    x: player.x + vx * secondsAhead,
    y: player.y + vy * secondsAhead,
  };
}

function preventRiftCamping(dt) {
  const rift = levelState.exitRift;
  if (!rift || !rift.active) return;

  const distToRift = distanceBetween(phantom, rift);

  if (distToRift < 200) {
    phantomAI.campPreventionTimer += dt;
    const threshold = distToRift < 100 ? 1.5 : 3;

    if (phantomAI.campPreventionTimer > threshold) {
      const awayX = phantom.x + (phantom.x - rift.x) * 1.0;
      const awayY = phantom.y + (phantom.y - rift.y) * 1.0;

      phantomAI.lastPatrol = { x: awayX, y: awayY };
      phantom.state = "IDLE";
      phantom.wanderTimer = 3;
      phantomAI.campPreventionTimer = 0;
    }
  } else {
    phantomAI.campPreventionTimer = Math.max(
      0,
      phantomAI.campPreventionTimer - dt,
    );
  }
}

function moveToward(target, dt, speedMult) {
  const dx = target.x - phantom.x;
  const dy = target.y - phantom.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= 4) return;

  let moveX = (dx / dist) * phantom.speed * speedMult * dt;
  let moveY = (dy / dist) * phantom.speed * speedMult * dt;

  if (phantom.canPhase) {
    phantom.x += moveX;
    phantom.y += moveY;
    return;
  }

  const canMoveX = !collidesWithWalls(
    phantom.x + moveX,
    phantom.y,
    phantom.width,
    phantom.height,
    levelState.walls,
  );
  const canMoveY = !collidesWithWalls(
    phantom.x,
    phantom.y + moveY,
    phantom.width,
    phantom.height,
    levelState.walls,
  );

  if (canMoveX && canMoveY) {
    phantom.x += moveX;
    phantom.y += moveY;
    return;
  }
  if (canMoveX) {
    phantom.x += moveX;
    return;
  }
  if (canMoveY) {
    phantom.y += moveY;
    return;
  }

  const baseAngle = Math.atan2(dy, dx);
  const testAngles = [
    baseAngle + Math.PI / 4,
    baseAngle - Math.PI / 4,
    baseAngle + Math.PI / 2,
    baseAngle - Math.PI / 2,
    baseAngle + (Math.PI * 3) / 4,
    baseAngle - (Math.PI * 3) / 4,
  ];

  for (const angle of testAngles) {
    const tryX = Math.cos(angle) * phantom.speed * speedMult * dt;
    const tryY = Math.sin(angle) * phantom.speed * speedMult * dt;

    if (
      !collidesWithWalls(
        phantom.x + tryX,
        phantom.y + tryY,
        phantom.width,
        phantom.height,
        levelState.walls,
      )
    ) {
      phantom.x += tryX;
      phantom.y += tryY;
      return;
    }
  }
}

function patrolWander(dt) {
  phantom.wanderTimer -= dt;

  if (!phantomAI.lastPatrol || phantom.wanderTimer <= 0) {
    let found = false;
    for (let attempt = 0; attempt < 25; attempt++) {
      const testX = phantom.x + (Math.random() - 0.5) * 500;
      const testY = phantom.y + (Math.random() - 0.5) * 500;

      if (
        !collidesWithWalls(
          testX,
          testY,
          phantom.width,
          phantom.height,
          levelState.walls,
        )
      ) {
        phantomAI.lastPatrol = { x: testX, y: testY };
        found = true;
        break;
      }
    }
    if (!found) {
      phantomAI.lastPatrol = {
        x: phantom.x + (Math.random() - 0.5) * 120,
        y: phantom.y + (Math.random() - 0.5) * 120,
      };
    }
    phantom.wanderTimer = 2 + Math.random() * 3;
  }

  moveToward(phantomAI.lastPatrol, dt, 0.6);
}

function buildHuntGrid() {
  if (!phantomAI.lastKnownPlayer) return;

  const cx = phantomAI.lastKnownPlayer.x;
  const cy = phantomAI.lastKnownPlayer.y;
  const spread = 140;

  phantomAI.huntGrid = [
    { x: cx, y: cy },
    { x: cx + spread, y: cy },
    { x: cx - spread, y: cy },
    { x: cx, y: cy + spread },
    { x: cx, y: cy - spread },
    { x: cx + spread, y: cy + spread },
    { x: cx - spread, y: cy - spread },
    { x: cx + spread, y: cy - spread },
    { x: cx - spread, y: cy + spread },
  ];
  phantomAI.huntIndex = 0;
}

function huntPlayer(dt) {
  if (phantomAI.huntGrid.length === 0) {
    phantom.state = "IDLE";
    return;
  }

  const target = phantomAI.huntGrid[phantomAI.huntIndex];
  moveToward(target, dt, 1.2);

  if (distanceBetween(phantom, target) < 40) {
    phantomAI.huntIndex++;
    if (phantomAI.huntIndex >= phantomAI.huntGrid.length) {
      phantom.state = "LOST";
      phantomAI.lostTimer = 4;
    }
  }
}

// ═══════════════════════════════════════
// DETECTION — REQUIRES LINE OF SIGHT
// ═══════════════════════════════════════
function canDetectPlayer() {
  const dist = distanceBetween(phantom, player);
  const los = hasLineOfSight(phantom, player, levelState.walls);

  // Physical proximity — always
  if (dist < 60) return true;

  // Hearing running (needs LOS OR very close)
  if (phantom.canSense && player.isRunning) {
    if (dist < 100) return true; // very close = always hears
    if (los && dist < 280) return true; // needs LOS
  }

  // Sight (requires LOS + light)
  if (phantom.canManifest && player.inLight && los && dist < 320) {
    return true;
  }

  // Trace (follows trail, doesn't need LOS)
  if (phantom.canTrace && player.soulTrail.length > 3) {
    if (distanceBetween(phantom, player.soulTrail[0]) < 160) return true;
  }

  return false;
}

function checkPhantomSenses() {
  // Rocks (sound) - always detected
  for (const rock of levelState.rocks) {
    if (rock.timer > 0 && distanceBetween(phantom, rock) < rock.noiseRadius) {
      phantomAI.lastKnownPlayer = { x: rock.x, y: rock.y };
      phantom.target = { x: rock.x, y: rock.y };
      phantom.state = "ALERTED";
      phantomAI.alertLevel += 50;
      return;
    }
  }

  const dist = distanceBetween(phantom, player);
  const los = hasLineOfSight(phantom, player, levelState.walls);

  // Physical proximity — instant chase
  if (dist < 70) {
    phantom.state = "CHASE";
    phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
    phantomAI.accelerationTimer = 0;
    return;
  }

  // Hearing (running) — needs LOS OR close
  if (phantom.canSense && player.isRunning) {
    if (dist < 100) {
      phantom.state = "CHASE";
      phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
      phantomAI.alertLevel = 100;
      phantomAI.accelerationTimer = 0;
      return;
    }
    if (los && dist < 280) {
      phantom.state = "CHASE";
      phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
      phantomAI.alertLevel = 100;
      phantomAI.accelerationTimer = 0;
      return;
    }
  }

  // Hearing walking (close, needs LOS)
  if (
    phantom.canSense &&
    player.moving &&
    !player.isRunning &&
    los &&
    dist < 140
  ) {
    phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
    phantom.state = "ALERTED";
    phantomAI.alertLevel += 40;
  }

  // Sight — REQUIRES LOS
  if (phantom.canManifest && player.inLight && los && dist < 320) {
    phantom.state = "CHASE";
    phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
    phantomAI.accelerationTimer = 0;
    return;
  }

  // Trace — follows trail
  if (phantom.canTrace && player.soulTrail.length > 3) {
    const trailPoint = player.soulTrail[0];
    if (distanceBetween(phantom, trailPoint) < 220) {
      phantomAI.lastKnownPlayer = { x: trailPoint.x, y: trailPoint.y };
      phantom.target = trailPoint;
      phantom.state = "ALERTED";
      phantomAI.alertLevel += 35;
      if (distanceBetween(phantom, trailPoint) < 20) {
        player.soulTrail.shift();
      }
    }
  }
}

export function updateSecondPhantom(dt, callbacks = {}) {
  const secondPhantom = getSecondPhantom();
  const { gameOver } = callbacks;

  if (!secondPhantom) return;

  secondPhantom.pulseTimer += dt;
  secondPhantom.wanderTimer -= dt;

  const dist = distanceBetween(secondPhantom, player);
  const los = hasLineOfSight(secondPhantom, player, levelState.walls);

  // Only chase when close OR has LOS
  if (dist < 100 || (los && dist < 280)) {
    const target = predictPlayerPosition(0.4);
    moveSecondPhantomToward(secondPhantom, target, dt, 1.3);
    secondPhantom.state = "CHASE";
  } else {
    if (!secondPhantom.wanderTarget || secondPhantom.wanderTimer <= 0) {
      secondPhantom.wanderTarget = {
        x: secondPhantom.x + (Math.random() - 0.5) * 400,
        y: secondPhantom.y + (Math.random() - 0.5) * 400,
      };
      secondPhantom.wanderTimer = 2 + Math.random() * 2;
    }
    moveSecondPhantomToward(secondPhantom, secondPhantom.wanderTarget, dt, 0.7);
    secondPhantom.state = "IDLE";
  }

  if (rectsCollide(player, secondPhantom)) {
    sound.playJumpscare();
    if (gameOver) gameOver("A second shadow consumed you.");
  }
}

function moveSecondPhantomToward(sp, target, dt, speedMult) {
  const dx = target.x - sp.x;
  const dy = target.y - sp.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= 4) return;

  const moveX = (dx / dist) * sp.speed * speedMult * dt;
  const moveY = (dy / dist) * sp.speed * speedMult * dt;

  if (
    !collidesWithWalls(
      sp.x + moveX,
      sp.y,
      sp.width,
      sp.height,
      levelState.walls,
    )
  ) {
    sp.x += moveX;
  }
  if (
    !collidesWithWalls(
      sp.x,
      sp.y + moveY,
      sp.width,
      sp.height,
      levelState.walls,
    )
  ) {
    sp.y += moveY;
  }
}
