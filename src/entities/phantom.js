// ============================================
// Phantom Entity
// ============================================

const TILE_SIZE = 48;

export const phantom = {
  x: 0,
  y: 0,
  width: TILE_SIZE - 12,
  height: TILE_SIZE - 12,
  speed: 55,
  state: "IDLE",
  target: null,
  searchTimer: 0,
  wanderTarget: null,
  wanderTimer: 0,
  canDrift: true,
  canSense: false,
  canManifest: false,
  canTrace: false,
  canPhase: false,
  canSplit: false,
  opacity: 0.6,
  pulseTimer: 0,

  reset() {
    this.state = "IDLE";
    this.target = null;
    this.searchTimer = 0;
    this.wanderTarget = null;
    this.wanderTimer = 0;
    this.canDrift = true;
    this.canSense = false;
    this.canManifest = false;
    this.canTrace = false;
    this.canPhase = false;
    this.canSplit = false;
  },
};

export const phantomAI = {
  lastKnownPlayer: null,
  alertLevel: 0,
  patrolPoints: [],
  patrolIndex: 0,
  lostTimer: 0,
  huntGrid: [],
  huntIndex: 0,
  chaseSpeed: 1.5,
  accelerationTimer: 0,
  lastPatrol: null,
  campPreventionTimer: 0,
  giveUpTimer: 0,
  ambushMode: false,
  lastPlayerHeard: 0,
};

export const secondPhantomRef = { current: null };

export function setSecondPhantom(sp) {
  secondPhantomRef.current = sp;
}

export function clearSecondPhantom() {
  secondPhantomRef.current = null;
}

export function getSecondPhantom() {
  return secondPhantomRef.current;
}
