// ============================================
// SHIFTING SHADOWS — Advanced Phantom AI
// ============================================

export class PhantomAI {
  constructor(phantom, walls, player) {
    this.phantom = phantom;
    this.walls = walls;
    this.player = player;

    // Memory system
    this.memoryDuration = 8;
    this.lastKnownPos = null;
    this.searchTargets = [];

    // Personality traits (make each level feel different)
    this.aggression = 1.0;
    this.persistence = 1.0;
    this.intelligence = 1.0;

    // Emotion state
    this.frustration = 0;
    this.confidence = 0.5;
  }

  // Smarter pathfinding using flood fill
  findPath(fromX, fromY, toX, toY) {
    // Simple direct check with obstacle avoidance
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return { x: 0, y: 0 };

    // Try direct path
    const ndx = dx / dist;
    const ndy = dy / dist;

    // Check if direct path has walls
    const steps = 10;
    let clearPath = true;
    for (let i = 1; i <= steps; i++) {
      const checkX = fromX + ndx * dist * (i / steps);
      const checkY = fromY + ndy * dist * (i / steps);
      if (this.checkWallAt(checkX, checkY)) {
        clearPath = false;
        break;
      }
    }

    if (clearPath) return { x: ndx, y: ndy };

    // Try alternate angles
    const angleOffsets = [
      Math.PI / 6,
      -Math.PI / 6,
      Math.PI / 3,
      -Math.PI / 3,
      Math.PI / 2,
      -Math.PI / 2,
    ];
    const baseAngle = Math.atan2(dy, dx);

    for (const offset of angleOffsets) {
      const testAngle = baseAngle + offset;
      const testX = Math.cos(testAngle);
      const testY = Math.sin(testAngle);

      let works = true;
      for (let i = 1; i <= 5; i++) {
        const cx = fromX + testX * 30 * i;
        const cy = fromY + testY * 30 * i;
        if (this.checkWallAt(cx, cy)) {
          works = false;
          break;
        }
      }

      if (works) return { x: testX, y: testY };
    }

    // Truly stuck — pick random
    const randomAngle = Math.random() * Math.PI * 2;
    return { x: Math.cos(randomAngle), y: Math.sin(randomAngle) };
  }

  checkWallAt(x, y) {
    for (const wall of this.walls) {
      if (
        x >= wall.x &&
        x <= wall.x + wall.width &&
        y >= wall.y &&
        y <= wall.y + wall.height
      ) {
        return true;
      }
    }
    return false;
  }

  // Predict where player is heading
  predictPlayerPosition(playerHistory, timeAhead) {
    if (playerHistory.length < 2) return { x: this.player.x, y: this.player.y };

    const recent = playerHistory[playerHistory.length - 1];
    const older = playerHistory[playerHistory.length - 5] || playerHistory[0];

    const vx = recent.x - older.x;
    const vy = recent.y - older.y;

    return {
      x: this.player.x + vx * timeAhead,
      y: this.player.y + vy * timeAhead,
    };
  }

  // Detection with confidence levels
  detectPlayer(
    distanceToPlayer,
    hasLineOfSight,
    playerInLight,
    playerIsRunning,
  ) {
    let detectionScore = 0;

    if (distanceToPlayer < 60) detectionScore += 100;

    if (this.phantom.canSense && playerIsRunning) {
      if (distanceToPlayer < 180) {
        detectionScore += 50 * (1 - distanceToPlayer / 180);
      }
    }

    if (this.phantom.canManifest && playerInLight && hasLineOfSight) {
      if (distanceToPlayer < 220) {
        detectionScore += 80;
      }
    }

    return {
      detected: detectionScore >= 30,
      confidence: Math.min(1, detectionScore / 100),
      priority: detectionScore,
    };
  }
}
