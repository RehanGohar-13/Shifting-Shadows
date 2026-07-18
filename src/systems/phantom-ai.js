// ============================================
// Phantom AI — SMART + DEADLY
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

// Player movement history for prediction
const playerHistory = [];
const HISTORY_SIZE = 30;
let historyTimer = 0;

export function updatePhantom(dt) {
  phantom.pulseTimer += dt;
  phantomAI.accelerationTimer += dt;

  // Track player movement history
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
      // Aggressive predictive chase
      const chaseSpeed = Math.min(
        2.6,
        1.7 + phantomAI.accelerationTimer * 0.15,
      );

      // Predict where player will be
      const predictedTarget = predictPlayerPosition(0.8);
      moveToward(predictedTarget, dt, chaseSpeed);

      phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
      phantomAI.giveUpTimer = 0;

      if (!canDetectPlayer()) {
        phantomAI.giveUpTimer += dt;
        // Give up chase slowly, don't be dumb
        if (phantomAI.giveUpTimer > 2) {
          phantom.state = "LOST";
          phantomAI.lostTimer = 6;
          phantomAI.accelerationTimer = 0;
          phantomAI.giveUpTimer = 0;
        }
      }
      break;
    }

    case "LOST":
      // Actively search last known area
      if (phantomAI.lastKnownPlayer) {
        moveToward(phantomAI.lastKnownPlayer, dt, 1.0);
      }
      checkPhantomSenses();

      // Ambush behavior — sometimes wait silently
      if (Math.random() < 0.02 && !phantomAI.ambushMode) {
        phantomAI.ambushMode = true;
        phantom.speed *= 0.3;
      }

      phantomAI.lostTimer -= dt;
      if (phantomAI.lostTimer <= 0) {
        phantomAI.alertLevel = 45;
        phantom.state = "IDLE";
        phantomAI.ambushMode = false;
      }
      break;
  }
}

function predictPlayerPosition(secondsAhead) {
  if (playerHistory.length < 5) {
    return { x: player.x, y: player.y };
  }

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

    // Faster prevention when close to rift
    const threshold = distToRift < 100 ? 1.5 : 3;

    if (phantomAI.campPreventionTimer > threshold) {
      // Move away AND alert to player position
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

  // BOTH BLOCKED — try to find alternate path
  // Try 8 different angles to find one that works
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

  // Completely stuck — pick truly random direction
  const randomAngle = Math.random() * Math.PI * 2;
  const escapeX = Math.cos(randomAngle) * phantom.speed * speedMult * dt;
  const escapeY = Math.sin(randomAngle) * phantom.speed * speedMult * dt;

  if (
    !collidesWithWalls(
      phantom.x + escapeX,
      phantom.y + escapeY,
      phantom.width,
      phantom.height,
      levelState.walls,
    )
  ) {
    phantom.x += escapeX;
    phantom.y += escapeY;
  }
}

function patrolWander(dt) {
  phantom.wanderTimer -= dt;

  if (!phantomAI.lastPatrol || phantom.wanderTimer <= 0) {
    // Sometimes patrol toward player's general area (stalking)
    const stalkChance = Math.random();

    if (stalkChance < 0.35) {
      // Head toward player's general area but not directly
      const offsetX = (Math.random() - 0.5) * 300;
      const offsetY = (Math.random() - 0.5) * 300;
      phantomAI.lastPatrol = {
        x: player.x + offsetX,
        y: player.y + offsetY,
      };
    } else {
      // Random wander
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
    }

    phantom.wanderTimer = 2 + Math.random() * 3;
  }

  moveToward(phantomAI.lastPatrol, dt, 0.65);
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
  moveToward(target, dt, 1.25);

  if (distanceBetween(phantom, target) < 40) {
    phantomAI.huntIndex++;

    if (phantomAI.huntIndex >= phantomAI.huntGrid.length) {
      phantom.state = "LOST";
      phantomAI.lostTimer = 4;
    }
  }
}

function canDetectPlayer() {
  const dist = distanceBetween(phantom, player);

  // Very close = always detected
  if (dist < 90) return true;

  // Hearing running
  if (phantom.canSense && player.isRunning && dist < 260) return true;

  // Even walking makes some noise
  if (phantom.canSense && player.moving && dist < 100) return true;

  // Sight in light
  if (
    phantom.canManifest &&
    player.inLight &&
    dist < 320 &&
    hasLineOfSight(phantom, player, levelState.walls)
  ) {
    return true;
  }

  // Trail following
  if (
    phantom.canTrace &&
    player.soulTrail.length > 3 &&
    distanceBetween(phantom, player.soulTrail[0]) < 160
  ) {
    return true;
  }

  return false;
}

function checkPhantomSenses() {
  // Rocks distract phantom
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

  // Very close = INSTANT chase
  if (dist < 130) {
    phantom.state = "CHASE";
    phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
    phantomAI.accelerationTimer = 0;
    return;
  }

  // Hearing (running)
  if (phantom.canSense && player.isRunning && dist < 260) {
    phantom.state = "CHASE";
    phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
    phantomAI.alertLevel = 100;
    phantomAI.accelerationTimer = 0;
    return;
  }

  // Hearing (walking, close)
  if (phantom.canSense && player.moving && dist < 130) {
    phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
    phantom.state = "ALERTED";
    phantomAI.alertLevel += 40;
  }

  // Sight
  if (
    phantom.canManifest &&
    player.inLight &&
    dist < 320 &&
    hasLineOfSight(phantom, player, levelState.walls)
  ) {
    phantom.state = "CHASE";
    phantomAI.lastKnownPlayer = { x: player.x, y: player.y };
    phantomAI.accelerationTimer = 0;
    return;
  }

  // Trace with better range
  if (phantom.canTrace && player.soulTrail.length > 3) {
    const trailPoint = player.soulTrail[0];
    if (distanceBetween(phantom, trailPoint) < 230) {
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

// ── Second Phantom ──
export function updateSecondPhantom(dt, callbacks = {}) {
  const secondPhantom = getSecondPhantom();
  const { gameOver } = callbacks;

  if (!secondPhantom) return;

  secondPhantom.pulseTimer += dt;
  secondPhantom.wanderTimer -= dt;

  const dist = distanceBetween(secondPhantom, player);

  if (dist < 280) {
    // Aggressive chase with prediction
    const target = predictPlayerPosition(0.5);
    moveSecondPhantomToward(secondPhantom, target, dt, 1.35);
    secondPhantom.state = "CHASE";
  } else {
    // Actively hunt — go toward player's general area
    if (!secondPhantom.wanderTarget || secondPhantom.wanderTimer <= 0) {
      const hunt = Math.random() > 0.4;

      if (hunt) {
        secondPhantom.wanderTarget = {
          x: player.x + (Math.random() - 0.5) * 400,
          y: player.y + (Math.random() - 0.5) * 400,
        };
      } else {
        secondPhantom.wanderTarget = {
          x: secondPhantom.x + (Math.random() - 0.5) * 400,
          y: secondPhantom.y + (Math.random() - 0.5) * 400,
        };
      }

      secondPhantom.wanderTimer = 2 + Math.random() * 2;
    }

    moveSecondPhantomToward(
      secondPhantom,
      secondPhantom.wanderTarget,
      dt,
      0.75,
    );
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
