// ============================================
// Helper Functions
// ============================================

export function rectsCollide(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function distanceBetween(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function collidesWithWalls(x, y, width, height, walls) {
  const rect = { x, y, width, height };
  for (const wall of walls) {
    if (rectsCollide(rect, wall)) return true;
  }
  return false;
}

export function hasLineOfSight(a, b, walls) {
  const steps = 20;
  const dx = (b.x - a.x) / steps;
  const dy = (b.y - a.y) / steps;
  for (let i = 0; i < steps; i++) {
    const checkX = a.x + dx * i;
    const checkY = a.y + dy * i;
    for (const wall of walls) {
      if (
        checkX >= wall.x &&
        checkX <= wall.x + wall.width &&
        checkY >= wall.y &&
        checkY <= wall.y + wall.height
      ) {
        return false;
      }
    }
  }
  return true;
}
